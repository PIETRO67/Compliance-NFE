from calendar import monthrange
from datetime import timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from sqlalchemy import select, func
from . import billing_models as b
from .models import now
from .security import aware

ZONE = ZoneInfo("America/Sao_Paulo")
CENT = Decimal("0.01")
TERMINAL = {"CANCELLED", "EXPIRED"}
PAID_STATUSES = {"CONFIRMED", "RECEIVED"}
REVIEW_STATUSES = {
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "CHARGEBACK_REQUESTED",
    "CHARGEBACK_DISPUTE",
    "REFUND_IN_PROGRESS",
    "REFUND_REQUESTED",
    "AWAITING_CHARGEBACK_REVERSAL",
}


def money(value):
    return Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)


def boundary(anchor, months):
    local = aware(anchor).astimezone(ZONE)
    month_index = local.year * 12 + local.month - 1 + months
    year, month = divmod(month_index, 12)
    return local.replace(year=year, month=month + 1, day=min(local.day, monthrange(year, month + 1)[1])).astimezone(
        timezone.utc
    )


def window(anchor, at):
    a, current = aware(anchor).astimezone(ZONE), aware(at).astimezone(ZONE)
    count = max(0, (current.year - a.year) * 12 + current.month - a.month)
    if boundary(anchor, count) > aware(at) and count:
        count -= 1
    return boundary(anchor, count), boundary(anchor, count + 1)


def current_period(db, subscription, at=None):
    start, end = window(subscription.start_at, at or now())
    record = db.scalar(select(b.Period).where(b.Period.subscription_id == subscription.id, b.Period.start_at == start))
    if not record:
        pending = db.get(b.PlanVersion, subscription.pending_version_id) if subscription.pending_version_id else None
        use_pending = pending and subscription.change_at and aware(subscription.change_at) <= start
        snap = subscription.snapshot.copy()
        if use_pending:
            plan = db.get(b.Plan, pending.plan_id)
            snap = {
                **snap,
                "plan_id": plan.id,
                "name": plan.name,
                "version": pending.version,
                "price": str(pending.price),
                "quota": pending.quota,
                "overage_price": str(pending.overage_price) if pending.overage_price is not None else None,
                "features": pending.features,
                "user_limit": pending.user_limit,
            }
        record = b.Period(
            subscription_id=subscription.id,
            company_id=subscription.company_id,
            start_at=start,
            end_at=end,
            quota=pending.quota if use_pending else subscription.quota,
            price=pending.price if use_pending else subscription.price,
            overage_price=pending.overage_price if use_pending else subscription.overage_price,
            snapshot=snap,
        )
        db.add(record)
        db.flush()
    return record


def preview(quota, units, unit_price):
    excess = max(0, units - quota)
    return {
        "quota": quota,
        "simulated_units": units,
        "billable_units": 0,
        "excess_units": excess,
        "preview_amount": str(money(excess * unit_price)) if unit_price is not None else None,
        "payable_amount": "0.00",
        "billable": False,
        "notice": "SIMULAÇÃO — NÃO FATURÁVEL. M3 fiscal não habilitado.",
    }


def consumption(db, subscription, period):
    units = db.scalar(select(func.coalesce(func.sum(b.UsageEvent.units), 0)).where(b.UsageEvent.period_id == period.id))
    return preview(period.quota, units, period.overage_price)


def evaluate(db, subscription, at=None):
    instant = aware(at or now())
    if subscription.status in TERMINAL:
        return subscription.status
    if subscription.commercial_hold:
        return "SUSPENDED"
    if aware(subscription.start_at) > instant:
        return "PENDING"
    if subscription.provisioning in {"CANCEL_REQUESTED", "CANCELLED"}:
        return "SUSPENDED"
    if subscription.modality in {"COURTESY", "TRIAL"}:
        return "ACTIVE" if subscription.review_at and aware(subscription.review_at) > instant else "EXPIRED"
    charges = db.scalars(select(b.Charge).where(b.Charge.subscription_id == subscription.id)).all()
    # Refunds/chargebacks always require human review, never hide them behind an older receipt.
    if any(c.status in REVIEW_STATUSES for c in charges):
        return "SUSPENDED"
    if subscription.override_until and aware(subscription.override_until) > instant:
        return "ACTIVE"
    local_date = instant.astimezone(ZONE).date()
    unpaid = [c for c in charges if c.status not in PAID_STATUSES | {"DELETED"} and c.due_date < local_date]
    if unpaid:
        oldest = min(c.due_date for c in unpaid)
        return "GRACE" if local_date <= oldest + timedelta(days=subscription.grace_days) else "PAST_DUE"
    current = current_period(db, subscription, instant)
    eligible = {"RECEIVED"} if subscription.activation_rule == "RECEIVED" else PAID_STATUSES
    if any(c.period_id == current.id and c.status in eligible for c in charges):
        return "ACTIVE"
    return "PENDING"


def eligibility(status):
    return {
        "commercial_eligible_for_future_features": status in {"ACTIVE", "GRACE"},
        "fiscal_transmission_enabled": False,
        "historical_access": True,
        "login_allowed": True,
        "billing_access": True,
        "notice": "Elegibilidade comercial futura; não habilita emissão fiscal.",
    }
