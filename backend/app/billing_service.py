from datetime import datetime, time, timezone
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from . import billing_models as b, models as m
from .billing_domain import ZONE, current_period, money, evaluate
from .policy import require_company, office_membership


def persist(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Conflito comercial: contrato, referência ou evento já registrado.") from None


def audit(db, user, action, resource, company=None, details=None):
    db.add(
        m.AuditLog(
            actor_id=user.id if user else None,
            action="billing." + action,
            resource_id=resource,
            company_id=company,
            details=details or {},
        )
    )


def record(value):
    if value is None:
        return None
    return {
        column.name: str(v) if isinstance(v, Decimal) else v
        for column in value.__table__.columns
        if (v := getattr(value, column.name)) is not None
    }


def local_midnight(day):
    return datetime.combine(day, time.min, ZONE).astimezone(timezone.utc)


def office(db, user, permission="plan:publish"):
    member = office_membership(db, user, permission)
    return member.organization_id


def company(db, user, company_id, permission="billing:read", lock=False):
    item = require_company(db, user, company_id, permission)
    if lock:
        item = db.scalar(select(m.Company).where(m.Company.id == item.id).with_for_update())
    return item


def subscription(db, user, sid, permission="billing:read", lock=False):
    # Lookup existence is never revealed before company authorization succeeds.
    row = db.get(b.Subscription, sid)
    if row is None:
        raise HTTPException(404, "Contrato não encontrado.")
    company(db, user, row.company_id, permission)
    if lock:
        row = db.scalar(select(b.Subscription).where(b.Subscription.id == sid).with_for_update())
    return row


def get_plan(db, user, pid):
    oid = office(db, user)
    item = db.scalar(select(b.Plan).where(b.Plan.id == pid, b.Plan.office_id == oid).with_for_update())
    if not item:
        raise HTTPException(404, "Plano não encontrado.")
    return item


def version(db, plan):
    return db.scalar(
        select(b.PlanVersion).where(b.PlanVersion.plan_id == plan.id, b.PlanVersion.version == plan.current_version)
    )


def snapshot(plan, ver):
    return {
        "plan_id": plan.id,
        "name": plan.name,
        "version": ver.version,
        "price": str(ver.price),
        "quota": ver.quota,
        "overage_price": str(ver.overage_price) if ver.overage_price is not None else None,
        "features": ver.features,
        "user_limit": ver.user_limit,
        "currency": "BRL",
        "rounding": "HALF_UP",
    }


def published_for_company(db, user, pid, cid):
    c = company(db, user, cid, "billing:manage")
    org = db.get(m.Organization, c.organization_id)
    plan = db.scalar(
        select(b.Plan).where(b.Plan.id == pid, b.Plan.office_id == org.office_id, b.Plan.status == "PUBLISHED")
    )
    if not plan:
        raise HTTPException(404, "Plano publicado não disponível para esta empresa.")
    return plan, version(db, plan)


def adjustment(db, user, sub, kind, reason, before, after):
    db.add(
        b.Adjustment(
            company_id=sub.company_id,
            subscription_id=sub.id,
            actor_id=user.id,
            kind=kind,
            reason=reason,
            before=before,
            after=after,
        )
    )
    audit(db, user, kind.lower(), sub.id, sub.company_id)


def create_subscription(db, user, cid, payload):
    c = company(db, user, cid, "billing:manage", lock=True)
    if not c.active:
        raise HTTPException(
            409, "Reative a empresa antes de criar nova contratação; histórico e regularização permanecem acessíveis."
        )
    prior = db.scalar(
        select(b.Subscription).where(
            b.Subscription.company_id == cid, b.Subscription.idempotency_key == payload.idempotency_key
        )
    )
    if prior:
        if (
            prior.snapshot["plan_id"] != payload.plan_id
            or prior.modality != payload.modality
            or prior.start_at != local_midnight(payload.start_date)
            or (payload.contract_price is not None and prior.price != payload.contract_price)
        ):
            raise HTTPException(409, "Chave idempotente já usada com outro contrato.")
        return prior
    if db.scalar(
        select(b.Subscription.id).where(
            b.Subscription.company_id == cid, b.Subscription.status.not_in(["CANCELLED", "EXPIRED"])
        )
    ):
        raise HTTPException(409, "Já existe contrato vigente ou pendente para este CNPJ.")
    plan, ver = published_for_company(db, user, payload.plan_id, cid)
    account = db.scalar(select(b.Account).where(b.Account.company_id == cid))
    if not account:
        raise HTTPException(422, "Cadastre o titular, e-mail e endereço de cobrança antes de contratar.")
    price = payload.contract_price if payload.contract_price is not None else ver.price
    if payload.modality != "PAID" or price != ver.price or price == 0:
        company(db, user, cid, "billing:override")
    if payload.modality != "PAID" and (not payload.review_date or payload.review_date <= payload.start_date):
        raise HTTPException(422, "Cortesia/teste exige data de revisão posterior ao início.")
    if payload.modality == "PAID" and price == 0:
        raise HTTPException(422, "Preço zero requer modalidade cortesia com revisão; não simula pagamento.")
    sub = b.Subscription(
        company_id=cid,
        organization_id=c.organization_id,
        account_id=account.id,
        plan_version_id=ver.id,
        snapshot=snapshot(plan, ver),
        price=money(price),
        quota=ver.quota,
        overage_price=ver.overage_price,
        modality=payload.modality,
        billing_type=payload.billing_type,
        start_at=local_midnight(payload.start_date),
        review_at=local_midnight(payload.review_date) if payload.review_date else None,
        grace_days=payload.grace_days,
        activation_rule=payload.activation_rule,
        idempotency_key=payload.idempotency_key,
        reason=payload.reason,
        provider="asaas" if payload.modality == "PAID" else "administrative",
        provisioning="QUEUED" if payload.modality == "PAID" else "NOT_APPLICABLE",
    )
    db.add(sub)
    db.flush()
    current_period(db, sub)
    sub.status = evaluate(db, sub)
    adjustment(
        db,
        user,
        sub,
        "CONTRACT_CREATED" if payload.modality == "PAID" else "ADMIN_GRANT",
        payload.reason,
        {},
        {
            "modality": sub.modality,
            "price": str(sub.price),
            "status": sub.status,
            "review_at": sub.review_at.isoformat() if sub.review_at else None,
        },
    )
    persist(db)
    return sub
