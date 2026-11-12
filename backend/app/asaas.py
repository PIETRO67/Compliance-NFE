"""Adaptador exclusivamente Sandbox. Nunca faz retry cego de POST."""

import asyncio
import hmac
import re
from contextvars import ContextVar
from urllib.parse import urlsplit
from uuid import uuid4
import httpx
import simplejson
from .config import get_settings
from .providers import ProviderUnavailable

BASE = "https://api-sandbox.asaas.com/v3"
correlation_id = ContextVar("billing_correlation_id", default=None)


def safe_payment_url(value):
    if not isinstance(value, str) or len(value) > 600:
        return None
    try:
        url = urlsplit(value)
        valid = (
            url.scheme == "https"
            and url.hostname == "sandbox.asaas.com"
            and not url.username
            and not url.password
            and url.port in {None, 443}
        )
    except ValueError:
        valid = False
    return value if valid else None


def external_id(value):
    if not isinstance(value, str) or not re.fullmatch(r"[a-zA-Z0-9_\-]{1,100}", value):
        raise ProviderUnavailable("INVALID_PROVIDER_ID")
    return value


def provider_status():
    s = get_settings()
    configured = bool(s.payment_provider == "asaas" and s.asaas_api_key and len(s.asaas_webhook_auth_token) >= 32)
    return {
        "provider": s.payment_provider,
        "environment": "sandbox",
        "configured": configured,
        "outbound_enabled": configured and s.enable_billing_sandbox,
        "production_enabled": False,
        "fiscal_enabled": False,
        "notice": "Sandbox financeiro; nenhuma cobrança de produção. Sem fallback simulado.",
    }


class AsaasSandboxPaymentProvider:
    def __init__(self, settings=None, transport=None):
        self.settings = settings or get_settings()
        s = self.settings
        if (
            s.asaas_mode != "sandbox"
            or s.asaas_base_url != BASE
            or s.enable_billing_production
            or s.payment_provider != "asaas"
            or not s.enable_billing_sandbox
            or not s.asaas_api_key
            or len(s.asaas_webhook_auth_token) < 32
        ):
            raise ProviderUnavailable("SANDBOX_NOT_CONFIGURED_OR_DISABLED")
        self.transport = transport

    async def request(self, method, path, payload=None, params=None):
        # Paths are built internally with validated IDs, never accepted as URLs from users.
        if not path.startswith("/") or ":" in path or ".." in path or "?" in path:
            raise ProviderUnavailable("INVALID_PROVIDER_PATH")
        headers = {
            "access_token": self.settings.asaas_api_key,
            "User-Agent": self.settings.asaas_http_user_agent,
            "Content-Type": "application/json",
            "X-Correlation-ID": correlation_id.get() or str(uuid4()),
        }
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(12, connect=5), transport=self.transport, follow_redirects=False, trust_env=False
        ) as client:
            for attempt in range(3 if method == "GET" else 1):
                try:
                    response = await client.request(
                        method,
                        BASE + path,
                        headers=headers,
                        params=params,
                        content=simplejson.dumps(payload, use_decimal=True) if payload is not None else None,
                    )
                    if method == "GET" and response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                        await asyncio.sleep(0.2 * 2**attempt)
                        continue
                    if response.status_code >= 300:
                        raise ProviderUnavailable("PROVIDER_HTTP_" + str(response.status_code))
                    if len(response.content) > 2_000_000:
                        raise ProviderUnavailable("PROVIDER_RESPONSE_TOO_LARGE")
                    result = simplejson.loads(response.content, use_decimal=True)
                    if not isinstance(result, dict):
                        raise ValueError()
                    return result
                except (httpx.HTTPError, ValueError):
                    if method == "GET" and attempt < 2:
                        await asyncio.sleep(0.2 * 2**attempt)
                        continue
                    raise ProviderUnavailable("PROVIDER_UNCERTAIN_RECONCILE_REQUIRED") from None

    async def find(self, resource, reference):
        data = await self.request("GET", "/" + resource, params={"externalReference": reference, "limit": 100})
        rows = [r for r in data.get("data", []) if r.get("externalReference") == reference]
        if len(rows) > 1 or data.get("hasMore"):
            raise ProviderUnavailable("DUPLICATE_PROVIDER_REFERENCE_REVIEW")
        return rows[0] if rows else None

    async def find_customer(self, reference):
        return await self.find("customers", reference)

    async def find_subscription(self, reference):
        return await self.find("subscriptions", reference)

    async def create_customer(self, customer, idempotency_key):
        return await self.request(
            "POST", "/customers", {**customer, "externalReference": idempotency_key, "notificationDisabled": True}
        )

    async def create_subscription(self, customer_id, plan, idempotency_key):
        return await self.request(
            "POST",
            "/subscriptions",
            {**plan, "customer": external_id(customer_id), "externalReference": idempotency_key, "cycle": "MONTHLY"},
        )

    async def reconcile(self, external_id_value):
        return await self.request("GET", "/payments/" + external_id(external_id_value))

    async def get_subscription(self, value):
        return await self.request("GET", "/subscriptions/" + external_id(value))

    async def list_charges(self, value):
        rows = []
        for offset in range(0, 1000, 100):
            page = await self.request(
                "GET", "/subscriptions/" + external_id(value) + "/payments", params={"limit": 100, "offset": offset}
            )
            rows.extend(page.get("data", []))
            if not page.get("hasMore"):
                return rows
        raise ProviderUnavailable("PROVIDER_PAGINATION_REVIEW_REQUIRED")

    async def update_subscription(self, value, payload):
        return await self.request("PUT", "/subscriptions/" + external_id(value), payload)

    async def cancel_subscription(self, value):
        # INACTIVE preserves unpaid charges. DELETE would remove pending/overdue charges.
        return await self.update_subscription(value, {"status": "INACTIVE"})

    async def create_charge(self, *args, **kwargs):
        raise ProviderUnavailable("M2_OVERAGE_BILLING_FORBIDDEN")

    def verify_webhook(self, headers, body):
        expected = self.settings.asaas_webhook_auth_token
        if not expected or not hmac.compare_digest(headers.get("asaas-access-token", ""), expected):
            raise ProviderUnavailable("INVALID_WEBHOOK_TOKEN")
        return simplejson.loads(body, use_decimal=True)
