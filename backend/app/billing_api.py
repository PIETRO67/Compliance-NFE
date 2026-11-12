import hmac
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from . import billing_models as b, billing_schemas as s, models as m
from .database import get_db
from .security import current_user, throttle
from .config import get_settings
from .policy import allowed_companies
from .billing_service import (
    audit,
    persist,
    record,
    office,
    company,
    subscription,
    get_plan,
    version,
    published_for_company,
    adjustment,
    create_subscription,
    local_midnight,
)
from .billing_domain import current_period, consumption, eligibility, evaluate, TERMINAL
from .asaas import provider_status, safe_payment_url

router = APIRouter(prefix="/api", tags=["Financeiro M2 — Sandbox"])


def plan_output(db, row, history=False):
    result = {**record(row), "current": record(version(db, row))}
    if history:
        result["decisions"] = [
            record(d)
            for d in db.scalars(
                select(b.PlanDecision)
                .where(b.PlanDecision.plan_id == row.id)
                .order_by(b.PlanDecision.at.desc())
                .limit(100)
            )
        ]
        result["versions"] = [
            record(v)
            for v in db.scalars(
                select(b.PlanVersion).where(b.PlanVersion.plan_id == row.id).order_by(b.PlanVersion.version.desc())
            ).all()
        ]
    return result


@router.get("/billing/plans")
def plans(
    company_id: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    if company_id:
        c = company(db, user, company_id)
        oid = db.get(m.Organization, c.organization_id).office_id
        statement = select(b.Plan).where(b.Plan.office_id == oid, b.Plan.status == "PUBLISHED")
    else:
        oid = office(db, user)
        statement = select(b.Plan).where(b.Plan.office_id == oid)
    return [
        plan_output(db, p) for p in db.scalars(statement.order_by(b.Plan.created_at.desc()).limit(limit).offset(offset))
    ]


def append_version(db, user, plan, payload):
    if payload.price == 0:
        # Zero-price approval is an explicit privileged catalogue action.
        office(db, user, "billing:override")
    ver = b.PlanVersion(
        plan_id=plan.id,
        version=plan.current_version,
        actor_id=user.id,
        **payload.model_dump(exclude={"name", "description", "confirmed"}),
    )
    db.add(ver)
    plan.name, plan.description = payload.name, payload.description
    audit(db, user, "plan.versioned", plan.id)


@router.post("/billing/plans", status_code=201)
def add_plan(payload: s.PlanInput, user=Depends(current_user), db=Depends(get_db)):
    plan = b.Plan(office_id=office(db, user), name=payload.name, current_version=1, status="DRAFT")
    db.add(plan)
    db.flush()
    append_version(db, user, plan, payload)
    persist(db)
    return plan_output(db, plan, True)


@router.get("/billing/plans/{pid}")
def plan_detail(pid: str, user=Depends(current_user), db=Depends(get_db)):
    return plan_output(db, get_plan(db, user, pid), True)


@router.patch("/billing/plans/{pid}")
def edit_plan(pid: str, payload: s.PlanInput, user=Depends(current_user), db=Depends(get_db)):
    plan = get_plan(db, user, pid)
    plan.current_version += 1
    plan.status = "DRAFT"
    append_version(db, user, plan, payload)
    persist(db)
    return plan_output(db, plan, True)


@router.post("/billing/plans/{pid}/publish")
def publish(pid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    plan = get_plan(db, user, pid)
    before = {"status": plan.status, "version": plan.current_version}
    plan.status = "PUBLISHED"
    db.add(
        b.PlanDecision(
            plan_id=pid,
            actor_id=user.id,
            action="PUBLISHED",
            reason=payload.reason,
            before=before,
            after={"status": plan.status, "version": plan.current_version},
        )
    )
    audit(db, user, "plan.published", pid)
    persist(db)
    return plan_output(db, plan)


@router.post("/billing/plans/{pid}/archive")
def archive(pid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    plan = get_plan(db, user, pid)
    before = {"status": plan.status, "version": plan.current_version}
    plan.status = "ARCHIVED"
    db.add(
        b.PlanDecision(
            plan_id=pid,
            actor_id=user.id,
            action="ARCHIVED",
            reason=payload.reason,
            before=before,
            after={"status": plan.status, "version": plan.current_version},
        )
    )
    audit(db, user, "plan.archived", pid)
    persist(db)
    return plan_output(db, plan)


@router.get("/billing/companies/{cid}/account")
def account(cid: str, user=Depends(current_user), db=Depends(get_db)):
    company(db, user, cid)
    return record(db.scalar(select(b.Account).where(b.Account.company_id == cid)))


@router.put("/billing/companies/{cid}/account")
def save_account(cid: str, payload: s.AccountInput, user=Depends(current_user), db=Depends(get_db)):
    c = company(db, user, cid, "billing:manage", True)
    item = db.scalar(select(b.Account).where(b.Account.company_id == cid))
    if item and item.external_id:
        raise HTTPException(409, "Titular já provisionado: alteração exige revisão contratual no Sandbox.")
    if not item:
        item = b.Account(company_id=cid, organization_id=c.organization_id, **payload.model_dump())
        db.add(item)
    else:
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
    audit(db, user, "account.updated", item.id, cid)
    persist(db)
    return record(item)


@router.post("/billing/companies/{cid}/subscriptions", status_code=201)
def subscribe(cid: str, payload: s.SubscribeInput, user=Depends(current_user), db=Depends(get_db)):
    return record(create_subscription(db, user, cid, payload))


@router.get("/billing/companies/{cid}/subscriptions")
def subscriptions(cid: str, user=Depends(current_user), db=Depends(get_db)):
    company(db, user, cid)
    return [
        record(row)
        for row in db.scalars(
            select(b.Subscription)
            .where(b.Subscription.company_id == cid)
            .order_by(b.Subscription.created_at.desc())
            .limit(100)
        )
    ]


@router.get("/billing/my/subscription")
def my_subscription(company_id: str, user=Depends(current_user), db=Depends(get_db)):
    company(db, user, company_id)
    sub = db.scalar(
        select(b.Subscription)
        .where(b.Subscription.company_id == company_id)
        .order_by(b.Subscription.created_at.desc())
        .with_for_update()
        .limit(1)
    )
    if not sub:
        return {"subscription": None, "eligibility": eligibility("PENDING")}
    sub.status = evaluate(db, sub)
    period = current_period(db, sub)
    result = {
        "subscription": record(sub),
        "period": record(period),
        "eligibility": eligibility(sub.status),
        "timeline": [
            record(a)
            for a in db.scalars(
                select(b.Adjustment)
                .where(b.Adjustment.subscription_id == sub.id)
                .order_by(b.Adjustment.at.desc())
                .limit(50)
            )
        ],
    }
    persist(db)
    return result


@router.post("/billing/subscriptions/{sid}/change-plan")
def change_plan(sid: str, payload: s.ChangePlan, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:manage", True)
    if sub.status in TERMINAL or sub.provisioning == "CANCEL_REQUESTED":
        raise HTTPException(409, "Contrato encerrado ou em cancelamento.")
    plan, ver = published_for_company(db, user, payload.plan_id, sub.company_id)
    if ver.price == 0 and sub.modality == "PAID":
        raise HTTPException(422, "Plano gratuito exige nova concessão com revisão; não converte pagamento.")
    before = {"plan_version_id": sub.plan_version_id, "price": str(sub.price)}
    sub.pending_version_id = ver.id
    sub.change_synced = False
    sub.change_at = current_period(db, sub).end_at
    adjustment(
        db,
        user,
        sub,
        "PLAN_CHANGE_SCHEDULED",
        payload.reason,
        before,
        {"version": ver.version, "plan": plan.name, "effective_at": sub.change_at.isoformat(), "prorata": False},
    )
    persist(db)
    return record(sub)


@router.post("/billing/subscriptions/{sid}/cancel")
def cancel(sid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:manage", True)
    before = {"status": sub.status, "provisioning": sub.provisioning}
    if sub.status not in TERMINAL:
        if sub.external_id or sub.provisioning not in {"QUEUED", "NOT_APPLICABLE"}:
            sub.provisioning = "CANCEL_REQUESTED"
        else:
            sub.status, sub.provisioning = "CANCELLED", "CANCELLED"
        sub.next_attempt_at = m.now()
        adjustment(
            db,
            user,
            sub,
            "CANCEL_REQUESTED",
            payload.reason,
            before,
            {"status": sub.status, "provisioning": sub.provisioning, "existing_debt_preserved": True},
        )
    persist(db)
    return record(sub)


@router.post("/billing/subscriptions/{sid}/override")
def override(sid: str, payload: s.Override, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:override", True)
    until = local_midnight(payload.until)
    if until <= m.now() or until > m.now() + timedelta(days=366) or sub.status in TERMINAL:
        raise HTTPException(422, "Concessão exige contrato vigente e prazo futuro de até 366 dias.")
    before = {"status": sub.status, "override_until": str(sub.override_until)}
    sub.override_until = until
    sub.status = evaluate(db, sub)
    adjustment(
        db,
        user,
        sub,
        "ADMIN_OVERRIDE",
        payload.reason,
        before,
        {"override_until": until.isoformat(), "status": sub.status, "payment_evidence": False},
    )
    persist(db)
    return record(sub)


@router.post("/billing/subscriptions/{sid}/pause")
def pause(sid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:manage", True)
    if sub.status in TERMINAL:
        raise HTTPException(409, "Contrato encerrado.")
    before = {"status": sub.status, "provisioning": sub.provisioning}
    sub.commercial_hold, sub.status = True, "SUSPENDED"
    sub.provisioning = "PAUSE_REQUESTED" if sub.external_id else "PAUSED"
    sub.next_attempt_at = m.now()
    adjustment(
        db,
        user,
        sub,
        "PAUSE_REQUESTED",
        payload.reason,
        before,
        {"status": sub.status, "provisioning": sub.provisioning},
    )
    persist(db)
    return record(sub)


@router.post("/billing/subscriptions/{sid}/resume")
def resume(sid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:manage", True)
    if sub.status in TERMINAL:
        raise HTTPException(409, "Contrato encerrado não pode ser reativado.")
    if not sub.commercial_hold:
        raise HTTPException(409, "Contrato não está pausado.")
    before = {"status": sub.status, "provisioning": sub.provisioning}
    if sub.external_id:
        sub.provisioning = "RESUME_REQUESTED"
    else:
        sub.commercial_hold = False
        sub.provisioning = "QUEUED" if sub.modality == "PAID" else "NOT_APPLICABLE"
        sub.status = evaluate(db, sub)
    sub.next_attempt_at = m.now()
    adjustment(
        db,
        user,
        sub,
        "RESUME_REQUESTED",
        payload.reason,
        before,
        {"status": sub.status, "provisioning": sub.provisioning, "payment_presumed": False},
    )
    persist(db)
    return record(sub)


@router.patch("/billing/subscriptions/{sid}/policies")
def policies(sid: str, payload: s.Policies, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:override", True)
    before = {"grace_days": sub.grace_days, "activation_rule": sub.activation_rule}
    sub.grace_days, sub.activation_rule = payload.grace_days, payload.activation_rule
    adjustment(
        db,
        user,
        sub,
        "POLICY_CHANGED",
        payload.reason,
        before,
        {"grace_days": sub.grace_days, "activation_rule": sub.activation_rule},
    )
    persist(db)
    return record(sub)


@router.post("/billing/my/change-request")
def request_change(company_id: str, payload: s.ChangePlan, user=Depends(current_user), db=Depends(get_db)):
    c = company(db, user, company_id)
    org = db.get(m.Organization, c.organization_id)
    plan = db.scalar(
        select(b.Plan).where(
            b.Plan.id == payload.plan_id, b.Plan.office_id == org.office_id, b.Plan.status == "PUBLISHED"
        )
    )
    sub = db.scalar(
        select(b.Subscription).where(
            b.Subscription.company_id == company_id, b.Subscription.status.not_in(list(TERMINAL))
        )
    )
    if not plan or not sub:
        raise HTTPException(404, "Plano ou contrato disponível não encontrado.")
    adjustment(db, user, sub, "PLAN_CHANGE_REQUESTED", payload.reason, {}, {"plan_id": plan.id, "approved": False})
    persist(db)
    return {"status": "REQUESTED", "notice": "Solicitação registrada; aprovação do gestor pendente."}


def scoped_ids(db, user, cid=None, permission="billing:read"):
    return [company(db, user, cid, permission).id] if cid else [c.id for c in allowed_companies(db, user, permission)]


@router.get("/billing/charges")
@router.get("/billing/my/charges")
def charges(
    company_id: str | None = None,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    ids = scoped_ids(db, user, company_id)
    query = select(b.Charge).where(b.Charge.company_id.in_(ids))
    if status:
        query = query.where(b.Charge.status == status)
    rows = db.scalars(query.order_by(b.Charge.due_date.desc()).limit(limit).offset(offset))
    return [{**record(r), "payment_url": safe_payment_url(r.payment_url)} for r in rows]


@router.get("/billing/usage")
@router.get("/billing/my/usage")
def usage(company_id: str, period_id: str | None = None, user=Depends(current_user), db=Depends(get_db)):
    company(db, user, company_id)
    sub = db.scalar(
        select(b.Subscription)
        .where(b.Subscription.company_id == company_id)
        .order_by(b.Subscription.created_at.desc())
        .with_for_update()
        .limit(1)
    )
    if not sub:
        return {"periods": [], "summary": None, "events": []}
    period = (
        current_period(db, sub)
        if not period_id
        else db.scalar(select(b.Period).where(b.Period.id == period_id, b.Period.company_id == company_id))
    )
    if not period:
        raise HTTPException(404, "Período não encontrado.")
    result = {
        "period": record(period),
        "summary": consumption(db, sub, period),
        "periods": [
            record(p)
            for p in db.scalars(
                select(b.Period).where(b.Period.company_id == company_id).order_by(b.Period.start_at.desc()).limit(100)
            )
        ],
        "events": [
            record(e)
            for e in db.scalars(
                select(b.UsageEvent)
                .where(b.UsageEvent.period_id == period.id)
                .order_by(b.UsageEvent.at.desc())
                .limit(100)
            )
        ],
    }
    persist(db)
    return result


@router.post("/billing/subscriptions/{sid}/simulate-usage")
def simulate(sid: str, payload: s.Simulate, user=Depends(current_user), db=Depends(get_db)):
    sub = subscription(db, user, sid, "billing:override", True)
    if get_settings().app_env not in {"development", "test"} or not get_settings().enable_dev_tools:
        raise HTTPException(403, "Simulação disponível somente em desenvolvimento explícito.")
    old = db.scalar(select(b.UsageEvent).where(b.UsageEvent.source_event_id == payload.source_event_id))
    if old:
        if old.company_id != sub.company_id or old.units != payload.units:
            raise HTTPException(409, "Referência de evento indisponível.")
        return record(old)
    period = current_period(db, sub)
    item = b.UsageEvent(
        company_id=sub.company_id,
        subscription_id=sub.id,
        period_id=period.id,
        source_event_id=payload.source_event_id,
        units=payload.units,
        classification="SIMULATED",
        billable=False,
    )
    db.add(item)
    audit(
        db,
        user,
        "usage.simulated",
        sub.id,
        sub.company_id,
        {"reason": payload.reason, "units": payload.units, "billable": False},
    )
    persist(db)
    return record(item)


@router.post("/billing/usage/{eid}/reverse")
def reverse(eid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    item = db.get(b.UsageEvent, eid)
    if not item:
        raise HTTPException(404, "Evento não encontrado.")
    subscription(db, user, item.subscription_id, "billing:override", True)
    if item.classification != "SIMULATED":
        raise HTTPException(409, "Somente evento simulado original pode ser compensado.")
    prior = db.scalar(select(b.UsageEvent).where(b.UsageEvent.reversal_of == eid))
    if not prior:
        prior = b.UsageEvent(
            company_id=item.company_id,
            subscription_id=item.subscription_id,
            period_id=item.period_id,
            source_event_id="reversal:" + eid,
            units=-item.units,
            classification="REVERSAL",
            reversal_of=eid,
            billable=False,
        )
        db.add(prior)
        audit(db, user, "usage.reversed", eid, item.company_id, {"reason": payload.reason, "compensates": eid})
    persist(db)
    return record(prior)


@router.get("/billing/dashboard")
def dashboard(
    company_id: str | None = None, plan_id: str | None = None, user=Depends(current_user), db=Depends(get_db)
):
    ids = scoped_ids(db, user, company_id)
    rows = db.scalars(select(b.Subscription).where(b.Subscription.company_id.in_(ids))).all()
    if plan_id:
        rows = [r for r in rows if r.snapshot.get("plan_id") == plan_id]
    sub_ids = [r.id for r in rows]
    for r in rows:
        r.status = evaluate(db, r)
    active = [r for r in rows if r.status == "ACTIVE"]
    received = db.scalar(
        select(func.coalesce(func.sum(b.Charge.value), 0)).where(
            b.Charge.subscription_id.in_(sub_ids), b.Charge.status == "RECEIVED"
        )
    )
    from decimal import Decimal

    result = {
        "active_subscriptions": len(active),
        "contracted_mrr": str(sum((r.price for r in active if r.modality == "PAID"), Decimal(0))),
        "sandbox_received": str(received),
        "past_due": sum(evaluate(db, r) == "PAST_DUE" for r in rows),
        "subscriptions": [record(r) for r in rows],
        "provider": provider_status(),
        "currency": "BRL",
        "notice": "Indicadores do Sandbox; recebimentos não representam dinheiro em produção.",
    }
    persist(db)
    return result


@router.get("/billing/my/plans")
def my_plans(company_id: str, user=Depends(current_user), db=Depends(get_db)):
    return plans(company_id, 100, 0, user, db)


@router.get("/billing/provider")
def provider(user=Depends(current_user), db=Depends(get_db)):
    office(db, user)
    return provider_status()


@router.get("/billing/webhook-events")
def events(
    company_id: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db=Depends(get_db),
):
    ids = scoped_ids(db, user, company_id, "billing:webhook:retry")
    return [
        record(e)
        for e in db.scalars(
            select(b.WebhookInbox)
            .where(b.WebhookInbox.company_id.in_(ids))
            .order_by(b.WebhookInbox.received_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ]


@router.post("/billing/webhook-events/{eid}/retry")
def retry(eid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    item = db.get(b.WebhookInbox, eid)
    if not item or not item.company_id:
        raise HTTPException(404, "Evento não encontrado no escopo autorizado.")
    company(db, user, item.company_id, "billing:webhook:retry")
    if item.status != "DONE":
        item.status, item.attempts, item.next_attempt_at = "PENDING", 0, m.now()
    audit(db, user, "webhook.retry", eid, item.company_id, {"reason": payload.reason})
    persist(db)
    return record(item)


@router.post("/billing/reconciliation-runs", status_code=202)
def reconcile(payload: s.Reconcile, user=Depends(current_user), db=Depends(get_db)):
    company(db, user, payload.company_id, "billing:manage")
    throttle(db, "billing-reconcile", user.id + payload.company_id, maximum=10)
    item = b.ReconciliationRun(company_id=payload.company_id, actor_id=user.id)
    db.add(item)
    audit(db, user, "reconciliation.requested", item.id, payload.company_id, {"reason": payload.reason})
    persist(db)
    return record(item)


@router.get("/billing/reconciliation-runs")
def runs(company_id: str | None = None, user=Depends(current_user), db=Depends(get_db)):
    ids = scoped_ids(db, user, company_id, "billing:manage")
    return [
        record(r)
        for r in db.scalars(
            select(b.ReconciliationRun)
            .where(b.ReconciliationRun.company_id.in_(ids))
            .order_by(b.ReconciliationRun.created_at.desc())
            .limit(100)
        )
    ]


@router.post("/billing/companies/{cid}/office-grant")
def billing_grant(cid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    c = require_grant_company(db, user, cid)
    grant = db.scalar(select(m.CompanyAuthorization).where(m.CompanyAuthorization.company_id == c.id).with_for_update())
    if not grant:
        raise HTTPException(404, "Delegação de escritório não encontrada.")
    before = list(grant.permissions)
    grant.permissions = sorted(
        set(grant.permissions) | {"billing:read", "billing:manage", "billing:override", "billing:webhook:retry"}
    )
    audit(
        db,
        user,
        "office_grant.approved",
        grant.id,
        cid,
        {"reason": payload.reason, "before": before, "after": grant.permissions},
    )
    persist(db)
    return {
        "notice": "Poderes financeiros de aplicação concedidos explicitamente ao escritório; não é procuração fiscal."
    }


@router.delete("/billing/companies/{cid}/office-grant")
def revoke_billing_grant(cid: str, payload: s.Reason, user=Depends(current_user), db=Depends(get_db)):
    require_grant_company(db, user, cid)
    grant = db.scalar(select(m.CompanyAuthorization).where(m.CompanyAuthorization.company_id == cid).with_for_update())
    if not grant:
        raise HTTPException(404, "Delegação de escritório não encontrada.")
    before = list(grant.permissions)
    grant.permissions = [p for p in grant.permissions if not p.startswith("billing:")]
    audit(
        db,
        user,
        "office_grant.revoked",
        grant.id,
        cid,
        {"reason": payload.reason, "before": before, "after": grant.permissions},
    )
    persist(db)
    return {"notice": "Poderes financeiros revogados; outros vínculos de aplicação preservados."}


def require_grant_company(db, user, cid):
    from .policy import require_company

    return require_company(db, user, cid, "grant:manage")


@router.post("/webhooks/asaas", include_in_schema=True)
async def webhook(request: Request, db=Depends(get_db)):
    settings = get_settings()
    expected = settings.asaas_webhook_auth_token
    if not provider_status()["outbound_enabled"] or len(expected) < 32:
        raise HTTPException(503, "Webhook Sandbox desabilitado ou não configurado.")
    if request.url.scheme != "https" and settings.app_env not in {"development", "test"}:
        raise HTTPException(403, "HTTPS obrigatório.")
    if not hmac.compare_digest(request.headers.get("asaas-access-token", ""), expected):
        raise HTTPException(401, "Autenticação do webhook inválida.")
    throttle(db, "asaas-webhook", "sandbox", maximum=600, minutes=1)
    from pydantic import ValidationError

    try:
        data = s.WebhookInput.model_validate_json(await request.body())
    except ValidationError:
        raise HTTPException(422, "Envelope de webhook inválido; conteúdo sensível omitido.") from None
    resource = data.payment or data.subscription
    if not resource:
        raise HTTPException(422, "Identificador de pagamento ou assinatura obrigatório.")
    payload = {"resource_id": resource.id, "resource_type": "payment" if data.payment else "subscription"}
    # Unknown events are durable but never grant resources. No raw PII/card payload is stored.
    row = {
        "id": m.uid(),
        "environment": "sandbox",
        "event_id": data.id,
        "event_type": data.event,
        "payload": payload,
        "status": "PENDING",
        "attempts": 0,
        "received_at": m.now(),
        "next_attempt_at": m.now(),
    }
    db.execute(insert(b.WebhookInbox).values(**row).on_conflict_do_nothing(index_elements=["environment", "event_id"]))
    persist(db)
    return {"received": True}
