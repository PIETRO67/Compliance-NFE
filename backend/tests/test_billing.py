import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4
import httpx
import pytest
from sqlalchemy import select, func, text
from sqlalchemy.exc import ProgrammingError
from fastapi import HTTPException
from app import billing_models as b, models as m
from app.asaas import AsaasSandboxPaymentProvider, safe_payment_url, BASE
from app.billing_domain import boundary, window, preview, evaluate, ZONE
from app.billing_jobs import apply_payment, process_event, provision, run_once
from app.providers import ProviderUnavailable
from app.config import get_settings
from app.database import make_engine
from app.security import aware

REASON = {"reason": "Revisão comercial explícita para testes sintéticos", "confirmed": True}


def plan(c, price="79.00", quota=50):
    result = c.post(
        "/api/billing/plans",
        json={"name": "Plano teste", "price": price, "quota": quota, "overage_price": "2.35", **REASON},
    )
    assert result.status_code == 201, result.text
    row = result.json()
    assert row["status"] == "DRAFT"
    assert c.post(f"/api/billing/plans/{row['id']}/publish", json=REASON).status_code == 200
    return row


def setup_contract(world, modality="PAID", c=None, p=None):
    c = c or world["login"]("office")[0]
    p = p or plan(c)
    cid = world["companies"]["a"].id
    account = c.put(
        f"/api/billing/companies/{cid}/account",
        json={"holder": "Titular fictício", "email": "billing@tests.example.com", "address": "Endereço de teste, 123"},
    )
    assert account.status_code == 200, account.text
    day = m.now().astimezone(ZONE).date()
    payload = {
        "plan_id": p["id"],
        "idempotency_key": str(uuid4()),
        "modality": modality,
        "start_date": day.isoformat(),
        "review_date": (day + timedelta(days=40)).isoformat(),
        **REASON,
    }
    result = c.post(f"/api/billing/companies/{cid}/subscriptions", json=payload)
    assert result.status_code == 201, result.text
    return c, p, result.json(), payload


def remote_contract(db, sid):
    sub = db.get(b.Subscription, sid)
    account = db.get(b.Account, sub.account_id)
    sub.external_id, sub.provisioning = "sub_synthetic", "READY"
    account.external_id, account.provisioning = "cus_synthetic", "READY"
    db.commit()
    return sub


def payment(sub, status="PENDING"):
    return {
        "id": "pay_synthetic",
        "customer": "cus_synthetic",
        "subscription": sub.external_id,
        "value": str(sub.price),
        "status": status,
        "billingType": "PIX",
        "dueDate": aware(sub.start_at).astimezone(ZONE).date().isoformat(),
        "invoiceUrl": "https://sandbox.asaas.com/i/synthetic",
    }


class SyntheticProvider:
    def __init__(self, sub=None, pay=None):
        self.sub = sub
        self.pay = pay

    async def reconcile(self, rid):
        return self.pay.copy()

    async def get_subscription(self, rid):
        return {"id": rid, "customer": "cus_synthetic", "status": "ACTIVE"}

    async def list_charges(self, sid):
        return [self.pay.copy()] if self.pay else []

    async def update_subscription(self, sid, payload):
        return {"id": sid, **payload}


def test_plan_version_publication_snapshot_and_archive(world):
    c, p, sub, _ = setup_contract(world)
    pid, sid = p["id"], sub["id"]
    changed = c.patch(
        f"/api/billing/plans/{pid}", json={"name": "Plano revisado", "price": "99.00", "quota": 90, **REASON}
    )
    assert changed.status_code == 200
    assert changed.json()["status"] == "DRAFT"
    assert len(changed.json()["versions"]) == 2
    assert (
        c.get(f"/api/billing/my/subscription?company_id={sub['company_id']}").json()["subscription"]["price"] == "79.00"
    )
    assert c.post(f"/api/billing/subscriptions/{sid}/change-plan", json={"plan_id": pid, **REASON}).status_code == 404
    c.post(f"/api/billing/plans/{pid}/publish", json=REASON)
    scheduled = c.post(f"/api/billing/subscriptions/{sid}/change-plan", json={"plan_id": pid, **REASON})
    assert scheduled.status_code == 200 and scheduled.json()["price"] == "79.00"
    assert scheduled.json()["change_at"]
    c.post(f"/api/billing/plans/{pid}/archive", json=REASON)
    assert c.get(f"/api/billing/my/plans?company_id={sub['company_id']}").json() == []


def test_repeated_contract_and_conflicting_idempotency(world):
    c, p, sub, payload = setup_contract(world)
    route = f"/api/billing/companies/{sub['company_id']}/subscriptions"
    assert c.post(route, json=payload).json()["id"] == sub["id"]
    assert c.post(route, json={**payload, "idempotency_key": str(uuid4())}).status_code == 409
    assert c.post(route, json={**payload, "modality": "TRIAL"}).status_code == 409
    assert c.post(route, json={**payload, "company_id": world["companies"]["b"].id}).status_code == 422


def test_courtesy_is_audited_grant_not_paid(world):
    c, _, sub, _ = setup_contract(world, "COURTESY")
    assert sub["status"] == "ACTIVE" and sub["provider"] == "administrative"
    with world["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(b.Charge)) == 0
        assert db.scalar(select(b.Adjustment.kind)) == "ADMIN_GRANT"
    assert c.get(f"/api/billing/my/charges?company_id={sub['company_id']}").json() == []


def test_paid_creation_is_pending_no_external_provider(world):
    c, _, sub, _ = setup_contract(world)
    assert sub["status"] == "PENDING" and "external_id" not in sub
    info = c.get(f"/api/billing/my/subscription?company_id={sub['company_id']}").json()
    assert not info["eligibility"]["commercial_eligible_for_future_features"]
    assert info["eligibility"]["historical_access"]


def test_finance_multi_tenant_and_partial_office_reports(world):
    office, _, sub, _ = setup_contract(world)
    a, _ = world["login"]("a")
    b_client, _ = world["login"]("b")
    for suffix in ["my/subscription", "my/charges", "my/usage", "my/plans", "dashboard", "webhook-events"]:
        assert a.get(f"/api/billing/{suffix}?company_id={world['companies']['b'].id}").status_code == 404
    assert b_client.post(f"/api/billing/subscriptions/{sub['id']}/cancel", json=REASON).status_code == 404
    assert (
        a.post("/api/billing/plans", json={"name": "Ataque", "price": "0.00", "quota": 1, **REASON}).status_code == 403
    )
    assert len(office.get("/api/billing/dashboard").json()["subscriptions"]) == 1
    assert b_client.get("/api/billing/dashboard").json()["subscriptions"] == []


def test_existing_office_grant_does_not_gain_finance_silently(world):
    with world["factory"]() as db:
        grant = db.scalar(select(m.CompanyAuthorization))
        grant.permissions = [p for p in grant.permissions if not p.startswith("billing:")]
        db.commit()
    c, _ = world["login"]("office")
    cid = world["companies"]["a"].id
    assert c.get(f"/api/billing/my/subscription?company_id={cid}").status_code == 403
    manager, _ = world["login"]("manager")
    assert manager.post(f"/api/billing/companies/{cid}/office-grant", json=REASON).status_code == 200
    assert c.get(f"/api/billing/my/subscription?company_id={cid}").status_code == 200
    assert manager.request("DELETE", f"/api/billing/companies/{cid}/office-grant", json=REASON).status_code == 200
    assert c.get(f"/api/billing/my/subscription?company_id={cid}").status_code == 403
    with world["factory"]() as db:
        entry = db.scalar(select(m.AuditLog).where(m.AuditLog.action == "billing.office_grant.revoked"))
        assert entry.details["reason"] == REASON["reason"]
        assert "billing:manage" in entry.details["before"] and "billing:manage" not in entry.details["after"]


def test_usage_synthetic_dedup_compensation_and_fiscal_forbidden(world, monkeypatch):
    monkeypatch.setattr(get_settings(), "enable_dev_tools", True)
    c, _, sub, _ = setup_contract(world)
    route = f"/api/billing/subscriptions/{sub['id']}/simulate-usage"
    payload = {"units": 240, "source_event_id": "synthetic-event-240", **REASON}
    first = c.post(route, json=payload)
    assert first.status_code == 200
    assert c.post(route, json=payload).json()["id"] == first.json()["id"]
    assert c.post(route, json={**payload, "classification": "FISCAL_AUTHORIZED", "billable": True}).status_code == 422
    usage = c.get(f"/api/billing/my/usage?company_id={sub['company_id']}").json()
    assert usage["summary"]["simulated_units"] == 240
    assert usage["summary"]["billable_units"] == 0
    assert usage["summary"]["preview_amount"] == "446.50"
    assert usage["summary"]["payable_amount"] == "0.00"
    eid = first.json()["id"]
    assert c.post(f"/api/billing/usage/{eid}/reverse", json=REASON).status_code == 200
    assert c.post(f"/api/billing/usage/{eid}/reverse", json=REASON).status_code == 200
    assert c.get(f"/api/billing/my/usage?company_id={sub['company_id']}").json()["summary"]["simulated_units"] == 0


def test_exact_decimal_calendar_timezone_and_capped_days():
    assert preview(200, 240, Decimal("2.35"))["preview_amount"] == "94.00"
    assert preview(200, 240, Decimal("0.333"))["preview_amount"] == "13.32"
    anchor = datetime(2024, 1, 31, 3, tzinfo=timezone.utc)
    assert boundary(anchor, 1).astimezone(ZONE).date().isoformat() == "2024-02-29"
    assert boundary(anchor, 2).astimezone(ZONE).date().isoformat() == "2024-03-31"
    assert window(anchor, datetime(2024, 2, 29, 2, 59, tzinfo=timezone.utc))[0] == anchor


@pytest.mark.parametrize(
    "financial_status,expected",
    [
        ("PENDING", "PENDING"),
        ("CONFIRMED", "PENDING"),
        ("RECEIVED", "ACTIVE"),
        ("REFUNDED", "SUSPENDED"),
        ("PARTIALLY_REFUNDED", "SUSPENDED"),
        ("CHARGEBACK_REQUESTED", "SUSPENDED"),
    ],
)
def test_provider_payment_evidence_transitions(world, financial_status, expected):
    _, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        apply_payment(db, sub, payment(sub, financial_status))
        assert evaluate(db, sub) == expected
        if financial_status == "CONFIRMED":
            sub.activation_rule = "CONFIRMED"
            assert evaluate(db, sub) == "ACTIVE"


def test_stale_webhook_and_charge_status_do_not_regress_receipt(world):
    _, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        apply_payment(db, sub, payment(sub, "RECEIVED"))
        apply_payment(db, sub, payment(sub, "OVERDUE"))
        assert evaluate(db, sub) == "ACTIVE"
        event = b.WebhookInbox(
            event_id="evt_old_overdue",
            event_type="PAYMENT_OVERDUE",
            payload={"resource_id": "pay_synthetic", "resource_type": "payment"},
        )
        db.add(event)
        asyncio.run(process_event(db, event, SyntheticProvider(sub, payment(sub, "RECEIVED"))))
        assert event.status == "DONE" and sub.status == "ACTIVE"
        apply_payment(db, sub, payment(sub, "REFUNDED"))
        apply_payment(db, sub, payment(sub, "RECEIVED"))
        assert evaluate(db, sub) == "SUSPENDED"


def test_grace_suspension_preserves_login_and_historical_access(world):
    c, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        apply_payment(db, sub, payment(sub))
        assert evaluate(db, sub, aware(sub.start_at) + timedelta(days=2)) == "GRACE"
        assert evaluate(db, sub, aware(sub.start_at) + timedelta(days=7)) == "PAST_DUE"
    assert c.get("/api/me").status_code == 200
    assert c.get(f"/api/client/companies/{row['company_id']}/invoices").status_code == 200
    assert c.post(f"/api/billing/subscriptions/{row['id']}/pause", json=REASON).status_code == 200
    info = c.get(f"/api/billing/my/subscription?company_id={row['company_id']}").json()
    assert info["subscription"]["status"] == "SUSPENDED"
    assert info["eligibility"]["historical_access"]


def test_override_and_cancel_are_audited_and_do_not_invent_payment(world):
    c, _, row, _ = setup_contract(world)
    until = (m.now().date() + timedelta(days=15)).isoformat()
    response = c.post(f"/api/billing/subscriptions/{row['id']}/override", json={"until": until, **REASON})
    assert response.status_code == 200 and response.json()["status"] == "ACTIVE"
    with world["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(b.Charge)) == 0
        assert db.scalar(select(b.Adjustment).where(b.Adjustment.kind == "ADMIN_OVERRIDE"))
    result = c.post(f"/api/billing/subscriptions/{row['id']}/cancel", json=REASON)
    assert result.json()["status"] == "CANCELLED"


def test_webhook_auth_durable_dedup_redaction_and_commit_failure(world, monkeypatch):
    settings = get_settings()
    for key, value in {
        "payment_provider": "asaas",
        "enable_billing_sandbox": True,
        "asaas_api_key": "synthetic-api-key",
        "asaas_webhook_auth_token": "synthetic-webhook-token-long-enough-1234",
    }.items():
        monkeypatch.setattr(settings, key, value)
    c, _ = world["login"]("a")
    payload = {
        "id": "evt_synthetic&1",
        "event": "PAYMENT_RECEIVED",
        "payment": {
            "id": "pay_synthetic",
            "creditCard": {"number": "DO_NOT_PERSIST"},
            "email": "private@tests.example.com",
        },
    }
    assert c.post("/api/webhooks/asaas", json=payload).status_code == 401
    headers = {"asaas-access-token": settings.asaas_webhook_auth_token}
    assert c.post("/api/webhooks/asaas", json=payload, headers=headers).status_code == 200
    assert c.post("/api/webhooks/asaas", json=payload, headers=headers).status_code == 200
    with world["factory"]() as db:
        rows = db.scalars(select(b.WebhookInbox)).all()
        assert len(rows) == 1 and rows[0].status == "PENDING"
        assert rows[0].payload == {"resource_id": "pay_synthetic", "resource_type": "payment"}
        assert db.scalar(select(func.count()).select_from(b.Charge)) == 0
    from app import billing_api

    def failure(db):
        db.rollback()
        raise HTTPException(503, "Synthetic persistence failure")

    monkeypatch.setattr(billing_api, "persist", failure)
    assert (
        c.post("/api/webhooks/asaas", json={**payload, "id": "evt_not_committed"}, headers=headers).status_code == 503
    )
    with world["factory"]() as db:
        assert db.scalar(select(func.count()).select_from(b.WebhookInbox)) == 1


def test_unknown_webhook_no_entitlement_and_dead_letter_retry(world):
    _, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        event = b.WebhookInbox(
            event_id="evt_unknown",
            event_type="NEW_UNKNOWN_TYPE",
            payload={"resource_id": "pay_synthetic", "resource_type": "payment"},
        )
        db.add(event)
        db.flush()
        asyncio.run(process_event(db, event, SyntheticProvider(sub)))
        assert event.status == "REVIEW" and sub.status == "PENDING"


def test_provider_identity_and_amount_mismatch_block_access(world):
    _, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        with pytest.raises(ProviderUnavailable):
            apply_payment(db, sub, {**payment(sub, "RECEIVED"), "customer": "cus_another"})
        with pytest.raises(ProviderUnavailable):
            apply_payment(db, sub, {**payment(sub, "RECEIVED"), "value": "0.01"})
        assert evaluate(db, sub) == "PENDING"


def test_partial_refund_metadata_requires_review_even_when_status_is_received(world):
    _, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        apply_payment(db, sub, {**payment(sub, "RECEIVED"), "refunds": [{"status": "DONE", "value": "10.00"}]})
        assert sub.commercial_hold and evaluate(db, sub) == "SUSPENDED"


def test_ambiguous_creation_never_posts_twice(world):
    _, _, row, _ = setup_contract(world)

    class Uncertain(SyntheticProvider):
        posts = 0

        async def find_customer(self, ref):
            return None

        async def create_customer(self, payload, ref):
            self.posts += 1
            raise ProviderUnavailable("PROVIDER_UNCERTAIN_RECONCILE_REQUIRED")

    provider = Uncertain()
    with world["factory"]() as db:
        sub = db.get(b.Subscription, row["id"])
        db.get(m.Company, sub.company_id).cnpj = "00000000000000"  # synthetic transport only
        db.commit()
        with pytest.raises(ProviderUnavailable):
            asyncio.run(provision(db, sub, provider))
        with pytest.raises(ProviderUnavailable, match="UNCERTAIN_CREATE_REVIEW_REQUIRED"):
            asyncio.run(provision(db, sub, provider))
        assert provider.posts == 1


def test_sandbox_adapter_contract_and_production_guard():
    settings = SimpleNamespace(
        asaas_mode="sandbox",
        asaas_base_url=BASE,
        enable_billing_production=False,
        payment_provider="asaas",
        enable_billing_sandbox=True,
        asaas_api_key="synthetic-only",
        asaas_webhook_auth_token="synthetic-webhook-secret-long-enough",
        asaas_http_user_agent="IAComplianceNFSe-M2/test",
    )
    captured = []

    def handler(request):
        captured.append(request)
        assert request.url.host == "api-sandbox.asaas.com" and request.headers["access_token"] == "synthetic-only"
        assert b"79.23" in request.content and b'"79.23"' not in request.content
        assert b"notificationDisabled" in request.content
        return httpx.Response(200, json={"id": "cus_synthetic", "externalReference": "ref"})

    provider = AsaasSandboxPaymentProvider(settings, httpx.MockTransport(handler))
    asyncio.run(provider.create_customer({"name": "Synthetic", "value": Decimal("79.23")}, "ref"))
    assert len(captured) == 1
    settings.asaas_base_url = "https://api.asaas.com/v3"
    with pytest.raises(ProviderUnavailable):
        AsaasSandboxPaymentProvider(settings)
    assert safe_payment_url("https://sandbox.asaas.com/i/synthetic")
    for value in [
        "https://evil.example.com/i/x",
        "https://sandbox.asaas.com.evil.com/x",
        "javascript:alert(1)",
        "https://user:pw@sandbox.asaas.com/x",
        "https://asaas.com/i/x",
    ]:
        assert safe_payment_url(value) is None


def test_reconciliation_scoped_and_worker_disabled_no_fake_payment(world):
    c, _, row, _ = setup_contract(world)
    result = c.post("/api/billing/reconciliation-runs", json={"company_id": row["company_id"], **REASON})
    assert result.status_code == 202
    other, _ = world["login"]("b")
    assert other.get("/api/billing/reconciliation-runs").json() == []
    with world["factory"]() as db:
        asyncio.run(run_once(db))
        sub = db.get(b.Subscription, row["id"])
        assert sub.status == "PENDING" and sub.last_error == "SANDBOX_NOT_CONFIGURED_OR_DISABLED"
        assert db.scalar(select(func.count()).select_from(b.Charge)) == 0


def test_runtime_ledger_and_versions_cannot_be_mutated(world):
    runtime = make_engine(get_settings().database_url)
    try:
        for table in ["billing_usage_events", "billing_plan_versions", "billing_adjustments", "billing_plan_decisions"]:
            with runtime.connect() as connection:
                with pytest.raises(ProgrammingError):
                    connection.execute(text(f"DELETE FROM {table} WHERE false"))
    finally:
        runtime.dispose()


def test_plan_publication_records_reason_actor_and_before_after(world):
    c, _ = world["login"]("office")
    p = plan(c)
    result = c.get(f"/api/billing/plans/{p['id']}").json()
    assert result["decisions"][0]["reason"] == REASON["reason"]
    assert result["decisions"][0]["before"]["status"] == "DRAFT"
    assert result["decisions"][0]["after"]["status"] == "PUBLISHED"
    assert result["decisions"][0]["actor_id"] == world["users"]["office"].id


def test_period_transition_preserves_closed_snapshot(world, monkeypatch):
    from app import billing_domain, billing_jobs

    c, p, row, _ = setup_contract(world, "COURTESY")
    c.patch(f"/api/billing/plans/{p['id']}", json={"name": "Revisado", "price": "99.00", "quota": 90, **REASON})
    c.post(f"/api/billing/plans/{p['id']}/publish", json=REASON)
    c.post(f"/api/billing/subscriptions/{row['id']}/change-plan", json={"plan_id": p["id"], **REASON})
    with world["factory"]() as db:
        sub = db.get(b.Subscription, row["id"])
        first = billing_domain.current_period(db, sub)
        instant = aware(first.end_at) + timedelta(seconds=1)
        monkeypatch.setattr(billing_domain, "now", lambda: instant)
        monkeypatch.setattr(billing_jobs.m, "now", lambda: instant)
        billing_jobs.transition_period(db, sub)
        db.flush()
        current = billing_domain.current_period(db, sub)
        assert first.closed and first.price == Decimal("79.00") and first.quota == 50
        assert current.id != first.id and current.price == Decimal("99.00") and current.quota == 90
        assert sub.pending_version_id is None


def test_fiscal_ledger_classification_rejected_at_database(world):
    _, _, row, _ = setup_contract(world)
    from sqlalchemy.exc import IntegrityError

    with world["factory"]() as db:
        period = db.scalar(select(b.Period).where(b.Period.subscription_id == row["id"]))
        db.add(
            b.UsageEvent(
                company_id=row["company_id"],
                subscription_id=row["id"],
                period_id=period.id,
                source_event_id="fiscal-forbidden",
                classification="FISCAL_AUTHORIZED",
                units=1,
                billable=True,
            )
        )
        with pytest.raises(IntegrityError):
            db.flush()


def test_pause_resume_keeps_unpaid_subscription_pending(world):
    c, _, row, _ = setup_contract(world)
    route = f"/api/billing/subscriptions/{row['id']}"
    assert c.post(route + "/pause", json=REASON).json()["status"] == "SUSPENDED"
    assert c.post(route + "/resume", json=REASON).json()["status"] == "PENDING"
    assert c.get(f"/api/billing/my/charges?company_id={row['company_id']}").json() == []


def test_worker_dead_letter_is_scoped_and_retry_is_audited(world):
    c, _, row, _ = setup_contract(world)
    with world["factory"]() as db:
        sub = remote_contract(db, row["id"])
        item = b.WebhookInbox(
            event_id="evt_fail",
            event_type="PAYMENT_RECEIVED",
            company_id=sub.company_id,
            payload={"resource_type": "payment", "resource_id": "pay_synthetic"},
            attempts=4,
        )
        db.add(item)
        db.commit()

        class Failed(SyntheticProvider):
            async def reconcile(self, rid):
                raise ProviderUnavailable("PROVIDER_HTTP_503")

        asyncio.run(run_once(db, Failed(sub)))
        assert item.status == "DEAD" and item.attempts == 5
        eid = item.id
    other, _ = world["login"]("b")
    assert other.post(f"/api/billing/webhook-events/{eid}/retry", json=REASON).status_code == 404
    assert c.post(f"/api/billing/webhook-events/{eid}/retry", json=REASON).json()["status"] == "PENDING"
    with world["factory"]() as db:
        assert db.scalar(select(m.AuditLog).where(m.AuditLog.action == "billing.webhook.retry"))
