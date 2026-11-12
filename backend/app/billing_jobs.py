"""Fila durável PostgreSQL. Nenhum faturamento de excedente ou produção."""

import argparse
import asyncio
import logging
import json
from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from . import billing_models as b, models as m
from .asaas import AsaasSandboxPaymentProvider, external_id, safe_payment_url, correlation_id
from .providers import ProviderUnavailable
from .database import engine
from .billing_domain import current_period, evaluate, ZONE, money, REVIEW_STATUSES
from .billing_service import audit, snapshot
from .security import aware

PAYMENT_EVENTS = {
    "PAYMENT_CREATED",
    "PAYMENT_UPDATED",
    "PAYMENT_CONFIRMED",
    "PAYMENT_RECEIVED",
    "PAYMENT_OVERDUE",
    "PAYMENT_DELETED",
    "PAYMENT_REFUNDED",
    "PAYMENT_PARTIALLY_REFUNDED",
    "PAYMENT_CHARGEBACK_REQUESTED",
}
SUBSCRIPTION_EVENTS = {
    "SUBSCRIPTION_CREATED",
    "SUBSCRIPTION_UPDATED",
    "SUBSCRIPTION_DELETED",
    "SUBSCRIPTION_INACTIVATED",
}


def safe_error(exc):
    code = str(exc)
    allowed = {
        "PROVIDER_IDENTITY_MISMATCH",
        "PROVIDER_AMOUNT_MISMATCH",
        "UNCERTAIN_CREATE_REVIEW_REQUIRED",
        "SANDBOX_NOT_CONFIGURED_OR_DISABLED",
        "PROVIDER_PAGINATION_REVIEW_REQUIRED",
        "INVALID_PROVIDER_ID",
        "DUPLICATE_PROVIDER_REFERENCE_REVIEW",
        "UNMAPPED_PROVIDER_RESOURCE",
        "PROVIDER_UNCERTAIN_RECONCILE_REQUIRED",
        "PROVIDER_STATUS_REVIEW",
        "CNPJ_SANDBOX_REQUIRED",
    }
    return (
        code
        if code in allowed or code.startswith("PROVIDER_HTTP_") and code[14:].isdigit()
        else "PROCESSING_FAILED_REVIEW"
    )


def retry_later(item, exc):
    item.attempts += 1
    item.status = "DEAD" if item.attempts >= 5 else "PENDING"
    item.next_attempt_at = m.now() + timedelta(seconds=min(3600, 30 * 2**item.attempts))
    if isinstance(item, b.WebhookInbox):
        item.safe_error = safe_error(exc)
    else:
        item.result = {"error": safe_error(exc)}


async def provision(db, sub, provider):
    account = db.get(b.Account, sub.account_id)
    company = db.get(m.Company, sub.company_id)
    if not account.external_id:
        found = await provider.find_customer(account.id)
        if not found:
            if account.provisioning != "NEW":
                raise ProviderUnavailable("UNCERTAIN_CREATE_REVIEW_REQUIRED")
            if not company.cnpj.isdigit() or len(company.cnpj) != 14:
                raise ProviderUnavailable("CNPJ_SANDBOX_REQUIRED")
            account.provisioning = "CREATING"
            db.commit()
            found = await provider.create_customer(
                {"name": account.holder, "email": account.email, "cpfCnpj": company.cnpj, "address": account.address},
                account.id,
            )
        if found.get("externalReference") != account.id:
            raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
        account.external_id = external_id(found["id"])
        account.provisioning = "READY"
        db.commit()
    if not sub.external_id:
        found = await provider.find_subscription(sub.id)
        if not found:
            if sub.provisioning not in {"QUEUED", "CUSTOMER_READY"}:
                raise ProviderUnavailable("UNCERTAIN_CREATE_REVIEW_REQUIRED")
            sub.provisioning = "CREATING_SUBSCRIPTION"
            db.commit()
            found = await provider.create_subscription(
                account.external_id,
                {
                    "value": sub.price,
                    "billingType": sub.billing_type,
                    "nextDueDate": aware(sub.start_at).astimezone(ZONE).date().isoformat(),
                    "description": "Assinatura IA Compliance — Sandbox",
                },
                sub.id,
            )
        if found.get("externalReference") != sub.id or found.get("customer") != account.external_id:
            raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
        sub.external_id = external_id(found["id"])
        sub.provisioning, sub.last_error = "READY", None
        audit(db, None, "subscription.provisioned_unpaid", sub.id, sub.company_id)
        db.commit()


def apply_payment(db, sub, payment):
    account = db.get(b.Account, sub.account_id)
    if payment.get("subscription") != sub.external_id or payment.get("customer") != account.external_id:
        raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
    due = date.fromisoformat(payment["dueDate"])
    period = current_period(db, sub, datetime.combine(due, time.min, ZONE).astimezone(timezone.utc))
    amount = money(payment["value"])
    if amount != period.price:
        raise ProviderUnavailable("PROVIDER_AMOUNT_MISMATCH")
    status = payment.get("status")
    known = {
        "PENDING",
        "OVERDUE",
        "DELETED",
        "CONFIRMED",
        "RECEIVED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "CHARGEBACK_REQUESTED",
        "CHARGEBACK_DISPUTE",
        "REFUND_IN_PROGRESS",
        "AWAITING_RISK_ANALYSIS",
        "REFUND_REQUESTED",
        "AWAITING_CHARGEBACK_REVERSAL",
    }
    if payment.get("deleted"):
        status = "DELETED"
    if status not in known:
        raise ProviderUnavailable("PROVIDER_STATUS_REVIEW")
    if payment.get("refunds") or payment.get("chargeback") or status in REVIEW_STATUSES:
        if not sub.commercial_hold:
            audit(db, None, "payment.risk_review", sub.id, sub.company_id)
        sub.commercial_hold = True
    eid = external_id(payment["id"])
    charge = db.scalar(select(b.Charge).where(b.Charge.external_id == eid, b.Charge.environment == "sandbox"))
    if charge and charge.subscription_id != sub.id:
        raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
    if charge and (
        charge.status == "RECEIVED"
        and status in {"CONFIRMED", "PENDING", "OVERDUE", "DELETED"}
        or charge.status == "CONFIRMED"
        and status in {"PENDING", "OVERDUE", "DELETED"}
        or charge.status in REVIEW_STATUSES
        and status not in REVIEW_STATUSES
    ):
        return charge
    before = charge.status if charge else None
    if not charge:
        charge = b.Charge(
            subscription_id=sub.id,
            company_id=sub.company_id,
            period_id=period.id,
            external_id=eid,
            value=amount,
            due_date=due,
            status=status,
            billing_type=payment.get("billingType", sub.billing_type),
        )
        db.add(charge)
    charge.status = status
    charge.payment_url = safe_payment_url(payment.get("invoiceUrl"))
    charge.verified_at = m.now()
    if before != status:
        audit(db, None, "payment.verified." + status.lower(), sub.id, sub.company_id)
    db.flush()
    return charge


def transition_period(db, sub):
    if (
        sub.pending_version_id
        and sub.change_at
        and aware(sub.change_at) <= m.now()
        and (sub.modality != "PAID" or sub.change_synced)
    ):
        ver = db.get(b.PlanVersion, sub.pending_version_id)
        plan = db.get(b.Plan, ver.plan_id)
        sub.snapshot, sub.plan_version_id = snapshot(plan, ver), ver.id
        sub.price, sub.quota, sub.overage_price = ver.price, ver.quota, ver.overage_price
        sub.pending_version_id, sub.change_at, sub.change_synced = None, None, False
        audit(db, None, "plan.change_effective", sub.id, sub.company_id)
    for p in db.scalars(select(b.Period).where(b.Period.subscription_id == sub.id, b.Period.end_at <= m.now())):
        p.closed = True
    current_period(db, sub)


async def synchronize(db, sub, provider):
    if not sub.external_id and (
        sub.status in {"CANCELLED", "EXPIRED"} or sub.commercial_hold and sub.provisioning == "PAUSED"
    ):
        return
    if not sub.external_id:
        await provision(db, sub, provider)
    remote = await provider.get_subscription(sub.external_id)
    account = db.get(b.Account, sub.account_id)
    if remote.get("id") != sub.external_id or remote.get("customer") != account.external_id:
        raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
    if sub.provisioning == "RESUME_REQUESTED":
        if remote.get("status") != "ACTIVE":
            next_date = aware(current_period(db, sub).end_at).astimezone(ZONE).date().isoformat()
            await provider.update_subscription(sub.external_id, {"status": "ACTIVE", "nextDueDate": next_date})
            remote = await provider.get_subscription(sub.external_id)
        if remote.get("status") != "ACTIVE":
            raise ProviderUnavailable("PROVIDER_STATUS_REVIEW")
        sub.commercial_hold, sub.provisioning = False, "READY"
        audit(db, None, "subscription.resumed_verified", sub.id, sub.company_id)
    if sub.provisioning in {"CANCEL_REQUESTED", "PAUSE_REQUESTED"}:
        cancelling = sub.provisioning == "CANCEL_REQUESTED"
        if remote.get("status") != "INACTIVE":
            await provider.cancel_subscription(sub.external_id)
            remote = await provider.get_subscription(sub.external_id)
        if remote.get("status") != "INACTIVE":
            raise ProviderUnavailable("PROVIDER_STATUS_REVIEW")
        sub.status, sub.provisioning = ("CANCELLED", "CANCELLED") if cancelling else ("SUSPENDED", "PAUSED")
        sub.commercial_hold = not cancelling
        audit(
            db,
            None,
            "subscription.cancelled_verified" if cancelling else "subscription.paused_verified",
            sub.id,
            sub.company_id,
        )
    elif remote.get("deleted") or remote.get("status") == "EXPIRED":
        sub.status = "CANCELLED" if remote.get("deleted") else "EXPIRED"
    elif remote.get("status") == "INACTIVE":
        sub.status = "SUSPENDED"
        sub.commercial_hold = True
    if sub.pending_version_id and not sub.change_synced and sub.status not in {"CANCELLED", "EXPIRED"}:
        pending = db.get(b.PlanVersion, sub.pending_version_id)
        await provider.update_subscription(sub.external_id, {"value": pending.price, "updatePendingPayments": False})
        sub.change_synced = True
    for payment in await provider.list_charges(sub.external_id):
        apply_payment(db, sub, payment)
    transition_period(db, sub)
    previous = sub.status
    if remote.get("status") != "INACTIVE" and sub.status not in {"CANCELLED", "EXPIRED"}:
        sub.status = evaluate(db, sub)
    if previous != sub.status:
        audit(db, None, "subscription.state." + sub.status.lower(), sub.id, sub.company_id)


async def process_event(db, event, provider):
    if event.event_type not in PAYMENT_EVENTS | SUBSCRIPTION_EVENTS:
        event.status, event.safe_error = "REVIEW", "UNKNOWN_EVENT_NO_ENTITLEMENT"
        return
    rid = event.payload["resource_id"]
    payment_event = event.payload["resource_type"] == "payment"
    remote = await provider.reconcile(rid) if payment_event else await provider.get_subscription(rid)
    sid = remote.get("subscription") if payment_event else remote.get("id")
    sub = db.scalar(
        select(b.Subscription)
        .where(b.Subscription.external_id == sid, b.Subscription.environment == "sandbox")
        .with_for_update()
    )
    if not sub:
        raise ProviderUnavailable("UNMAPPED_PROVIDER_RESOURCE")
    event.company_id = sub.company_id
    if payment_event:
        if remote.get("id") != rid:
            raise ProviderUnavailable("PROVIDER_IDENTITY_MISMATCH")
        apply_payment(db, sub, remote)
        if event.event_type in {"PAYMENT_REFUNDED", "PAYMENT_PARTIALLY_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"}:
            sub.commercial_hold = True
            audit(db, None, "payment.risk_event_review", sub.id, sub.company_id)
    await synchronize(db, sub, provider)
    event.status, event.processed_at, event.safe_error = "DONE", m.now(), None


async def run_once(db, provider=None):
    try:
        provider = provider or AsaasSandboxPaymentProvider()
    except ProviderUnavailable:
        provider = None
    for sub in db.scalars(
        select(b.Subscription)
        .where(
            b.Subscription.status.not_in(["CANCELLED", "EXPIRED"]),
            b.Subscription.next_attempt_at <= m.now(),
            b.Subscription.attempts < 5,
        )
        .order_by(b.Subscription.created_at)
        .limit(50)
    ).all():
        correlation_id.set(sub.id)
        try:
            if sub.modality == "PAID":
                if sub.commercial_hold and not sub.external_id and sub.provisioning == "PAUSED":
                    sub.next_attempt_at = m.now() + timedelta(minutes=5)
                    db.commit()
                    continue
                if not provider:
                    raise ProviderUnavailable("SANDBOX_NOT_CONFIGURED_OR_DISABLED")
                await synchronize(db, sub, provider)
            else:
                transition_period(db, sub)
                sub.status = evaluate(db, sub)
            sub.last_error, sub.attempts = None, 0
        except Exception as exc:
            db.rollback()
            sub = db.get(b.Subscription, sub.id)
            sub.last_error = safe_error(exc)
            sub.attempts = 0 if sub.last_error == "SANDBOX_NOT_CONFIGURED_OR_DISABLED" else sub.attempts + 1
        sub.next_attempt_at = m.now() + timedelta(seconds=min(3600, 60 * 2 ** min(sub.attempts, 5)))
        db.commit()
        logging.info(
            json.dumps(
                {
                    "event": "billing_job",
                    "kind": "subscription",
                    "correlation_id": sub.id,
                    "status": sub.status,
                    "attempts": sub.attempts,
                    "error": sub.last_error,
                }
            )
        )
    for item in db.scalars(
        select(b.WebhookInbox)
        .where(b.WebhookInbox.status == "PENDING", b.WebhookInbox.next_attempt_at <= m.now())
        .order_by(b.WebhookInbox.received_at)
        .limit(50)
    ).all():
        correlation_id.set(item.id)
        try:
            if not provider:
                raise ProviderUnavailable("SANDBOX_NOT_CONFIGURED_OR_DISABLED")
            await process_event(db, item, provider)
        except Exception as exc:
            mapped_company = item.company_id
            db.rollback()
            item = db.get(b.WebhookInbox, item.id)
            if mapped_company:
                item.company_id = mapped_company
            retry_later(item, exc)
        db.commit()
        logging.info(
            json.dumps(
                {
                    "event": "billing_job",
                    "kind": "webhook",
                    "correlation_id": item.id,
                    "status": item.status,
                    "attempts": item.attempts,
                    "error": item.safe_error,
                }
            )
        )
    for item in db.scalars(
        select(b.ReconciliationRun)
        .where(b.ReconciliationRun.status == "PENDING", b.ReconciliationRun.next_attempt_at <= m.now())
        .limit(20)
    ).all():
        correlation_id.set(item.id)
        try:
            if not provider:
                raise ProviderUnavailable("SANDBOX_NOT_CONFIGURED_OR_DISABLED")
            rows = db.scalars(
                select(b.Subscription).where(
                    b.Subscription.company_id == item.company_id, b.Subscription.modality == "PAID"
                )
            ).all()
            for sub in rows:
                await synchronize(db, sub, provider)
                sub.attempts, sub.last_error = 0, None
            item.status, item.result, item.finished_at = "DONE", {"contracts_checked": len(rows)}, m.now()
            audit(db, None, "reconciliation.completed", item.id, item.company_id)
        except Exception as exc:
            db.rollback()
            item = db.get(b.ReconciliationRun, item.id)
            retry_later(item, exc)
        db.commit()
        logging.info(
            json.dumps(
                {
                    "event": "billing_job",
                    "kind": "reconciliation",
                    "correlation_id": item.id,
                    "status": item.status,
                    "attempts": item.attempts,
                }
            )
        )


async def main(once=False):
    while True:
        with engine().connect() as connection:
            acquired = connection.scalar(text("SELECT pg_try_advisory_lock(20260219)"))
            connection.commit()
            if acquired:
                try:
                    with Session(connection, expire_on_commit=False) as db:
                        await run_once(db)
                    logging.info("billing_worker_tick_completed")
                finally:
                    connection.execute(text("SELECT pg_advisory_unlock(20260219)"))
                    connection.commit()
        if once:
            return
        await asyncio.sleep(15)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    asyncio.run(main(parser.parse_args().once))
