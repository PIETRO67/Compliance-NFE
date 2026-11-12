from dataclasses import dataclass
from typing import Protocol


class ProviderUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class FiscalCapabilities:
    provider: str
    environment: str
    issue: bool = False
    cancel: bool = False
    replace: bool = False
    reason: str = "M3 pendente: credenciamento, representação, schemas e homologação não configurados."


class FiscalProvider(Protocol):
    def get_capabilities(
        self, issuer: dict, municipality: str, tax_profile: dict, competence_date: str
    ) -> FiscalCapabilities: ...
    def validate_draft(self, draft: dict) -> list[str]: ...
    def issue(self, draft: dict, idempotency_key: str) -> dict: ...
    def get_status(self, request_id: str) -> dict: ...
    def download_xml(self, invoice_id: str) -> bytes: ...
    def download_danfse(self, invoice_id: str) -> bytes: ...
    def cancel(self, invoice_id: str, reason: str) -> dict: ...
    def replace(self, invoice_id: str, draft: dict) -> dict: ...


class PaymentProvider(Protocol):
    def create_customer(self, customer: dict, idempotency_key: str) -> dict: ...
    def create_subscription(self, customer_id: str, plan: dict, idempotency_key: str) -> dict: ...
    def create_charge(self, customer_id: str, amount: str, idempotency_key: str) -> dict: ...
    def verify_webhook(self, headers: dict, body: bytes) -> dict: ...
    def reconcile(self, external_id: str) -> dict: ...


class CertificateProvider(Protocol):
    def status(self, company_id: str) -> dict: ...
    def sign(self, company_id: str, xml: bytes, authorization_id: str) -> bytes: ...


class AsyncPaymentProvider(Protocol):
    """Extensão M2 para I/O assíncrono; contrato síncrono M1 preservado."""
    async def find_customer(self, reference: str) -> dict | None: ...
    async def find_subscription(self, reference: str) -> dict | None: ...
    async def create_customer(self, customer: dict, idempotency_key: str) -> dict: ...
    async def create_subscription(self, customer_id: str, plan: dict, idempotency_key: str) -> dict: ...
    async def reconcile(self, external_id: str) -> dict: ...
    async def list_charges(self, subscription_id: str) -> list[dict]: ...
    async def get_subscription(self, external_id: str) -> dict: ...
    async def update_subscription(self, external_id: str, payload: dict) -> dict: ...
    async def cancel_subscription(self, external_id: str) -> dict: ...


class NotificationProvider(Protocol):
    def send_invitation(self, email: str, link: str) -> None: ...


class DisabledFiscalProvider:
    def get_capabilities(self, issuer, municipality, tax_profile, competence_date):
        return FiscalCapabilities(provider="NOT_CONFIGURED", environment="none")

    def validate_draft(self, draft):
        return ["Validação de UI não comprova validade fiscal. Integração fiscal indisponível no M1."]

    def issue(self, *args, **kwargs):
        raise ProviderUnavailable("Emissão fiscal indisponível no M1. Nenhum envio realizado.")

    get_status = download_xml = download_danfse = cancel = replace = issue


class MockFiscalProvider(DisabledFiscalProvider):
    def __init__(self, environment: str):
        if environment not in {"development", "test"}:
            raise ProviderUnavailable("Mock proibido em produção.")

    def get_capabilities(self, *args, **kwargs):
        return FiscalCapabilities(
            provider="MOCK_TEST_ONLY",
            environment="simulation",
            reason="Apenas testes: nunca representa autorização fiscal.",
        )


class DisabledPaymentProvider:
    def create_customer(self, *args, **kwargs):
        raise ProviderUnavailable("Cobrança indisponível no M1. Nenhuma transação realizada.")

    create_subscription = create_charge = verify_webhook = reconcile = create_customer
