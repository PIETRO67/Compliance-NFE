import logging
import secrets
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from datetime import timedelta
from decimal import Decimal
import pyotp
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import or_, select, text, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from . import models as m, schemas as s, responses as out
from .config import get_settings
from .database import get_db, engine
from .policy import (
    CLIENT_ROLES,
    OFFICE_ROLES,
    PERMISSIONS,
    allowed_companies,
    manage_organization,
    memberships,
    office_membership,
    permissions_for,
    require_company,
)
from .providers import DisabledFiscalProvider
from .billing_api import router as billing_router
from .asaas import provider_status
from .security import (
    COOKIE,
    aware,
    csrf,
    current_user,
    decrypt,
    digest,
    encrypt,
    hasher,
    new_session,
    origin_guard,
    pending_session,
    throttle,
    verify_password,
)


@asynccontextmanager
async def lifespan(_app):
    if get_settings().secure_cookies:
        with engine().connect() as connection:
            row = connection.execute(
                text("SELECT rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname=current_user")
            ).one()
            owner = connection.scalar(
                text("SELECT pg_get_userbyid(datdba)=current_user FROM pg_database WHERE datname=current_database()")
            )
            if any(row) or owner:
                raise RuntimeError(
                    "Produção exige usuário de runtime sem privilégios administrativos ou propriedade do banco."
                )
    yield


app = FastAPI(
    lifespan=lifespan,
    title="IA Compliance — API M2 Sandbox",
    version="2.1.0",
    docs_url="/api/docs" if get_settings().app_env != "production" else None,
    openapi_url="/api/openapi.json" if get_settings().app_env != "production" else None,
)


app.include_router(billing_router)


@app.middleware("http")
async def boundaries(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        length = request.headers.get("content-length")
        if length is None or not length.isdigit():
            return JSONResponse({"detail": "Content-Length necessário."}, status_code=411)
        if int(length) > 65536:
            return JSONResponse({"detail": "Corpo da solicitação excede o limite."}, status_code=413)
    try:
        response = await call_next(request)
    except SQLAlchemyError as exc:
        logging.error("database_request_failed:%s", type(exc).__name__)
        response = JSONResponse(
            {"detail": "Falha ao persistir a operação. Nenhum detalhe sensível foi registrado."}, status_code=503
        )
    except Exception as exc:
        logging.error("request_failed:%s", type(exc).__name__)
        response = JSONResponse({"detail": "Não foi possível concluir a solicitação."}, status_code=500)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_request, exc):
    return JSONResponse(
        {"detail": [{"loc": e["loc"], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]}, status_code=422
    )


def audit(db, user, action, resource=None, company=None, organization=None):
    db.add(
        m.AuditLog(
            actor_id=user.id if user else None,
            action=action,
            resource_id=resource,
            company_id=company,
            organization_id=organization,
        )
    )


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Registro em conflito ou vínculo inválido.") from None


def company_dict(db, user, c):
    return {
        "id": c.id,
        "organization_id": c.organization_id,
        "name": c.name,
        "cnpj": c.cnpj,
        "municipality": c.municipality,
        "tax_regime": c.tax_regime,
        "active": c.active,
        "fiscal_status": c.fiscal_status,
        "permissions": sorted(permissions_for(db, user, c)),
    }


def identity(db, user, session, raw):
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "phase": session.phase,
        "csrf_token": csrf(raw),
        "memberships": [
            {"id": r.id, "organization_id": r.organization_id, "company_id": r.company_id, "role": r.role}
            for r in memberships(db, user)
        ],
        "companies": [company_dict(db, user, c) for c in allowed_companies(db, user)]
        if session.phase == "AUTHENTICATED"
        else [],
        "environment": get_settings().app_env,
        "fiscal_enabled": False,
        "billing_enabled": False,
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "milestone": "M2", "fiscal": "disabled", "billing": "sandbox_only"}


@app.post("/api/auth/login", response_model=out.IdentityOutput, response_model_exclude_none=True)
def login(payload: s.LoginInput, request: Request, response: Response, db: Session = Depends(get_db)):
    origin_guard(request)
    email = str(payload.email).lower()
    throttle(db, "login-account", email)
    throttle(db, "login-ip", request.client.host if request.client else "unknown", maximum=100)
    user = db.scalar(select(m.User).where(m.User.email == email))
    if not verify_password(payload.password, user):
        audit(db, None, "auth.login_failed")
        commit(db)
        raise HTTPException(401, "Credenciais inválidas.")
    old = db.get(m.AuthSession, digest(request.cookies.get(COOKIE, "")))
    session, raw = new_session(db, user, response, old=old)
    audit(db, user, "auth.password_verified")
    commit(db)
    return identity(db, user, session, raw)


@app.get("/api/me", response_model=out.IdentityOutput, response_model_exclude_none=True)
def me(context=Depends(pending_session), db: Session = Depends(get_db)):
    return identity(db, *context)


@app.post("/api/auth/logout", status_code=204)
def logout(response: Response, context=Depends(pending_session), db: Session = Depends(get_db)):
    user, session, _ = context
    session.revoked = True
    audit(db, user, "auth.logout")
    commit(db)
    response.delete_cookie(COOKIE, path="/", secure=get_settings().secure_cookies, httponly=True, samesite="strict")


@app.post("/api/auth/mfa/enroll")
def enroll(context=Depends(pending_session), db: Session = Depends(get_db)):
    user, session, _ = context
    if session.phase != "MFA_ENROLLMENT_REQUIRED" or user.totp_encrypted:
        raise HTTPException(409, "Cadastro de MFA não disponível nesta sessão.")
    if not session.enrollment_encrypted:
        session.enrollment_encrypted = encrypt(pyotp.random_base32())
        commit(db)
    secret = decrypt(session.enrollment_encrypted)
    return {
        "secret": secret,
        "uri": pyotp.TOTP(secret).provisioning_uri(user.email, issuer_name="IA Compliance"),
        "notice": "Use seu autenticador. Não compartilhe esta chave.",
    }


def check_totp(db, user, secret, code):
    totp = pyotp.TOTP(secret)
    current = int(time.time()) // 30
    step = next(
        (
            n
            for n in [current, current - 1, current + 1]
            if n > user.last_totp_step and secrets.compare_digest(totp.at(n * 30), code)
        ),
        None,
    )
    if step is None:
        return False
    user.last_totp_step = step
    return True


@app.post("/api/auth/mfa/confirm", response_model=out.IdentityOutput, response_model_exclude_none=True)
def confirm_mfa(
    payload: s.CodeInput, response: Response, context=Depends(pending_session), db: Session = Depends(get_db)
):
    user, session, _ = context
    throttle(db, "mfa", user.id)
    user = db.scalar(select(m.User).where(m.User.id == user.id).with_for_update())
    if session.phase != "MFA_ENROLLMENT_REQUIRED" or not session.enrollment_encrypted or user.totp_encrypted:
        raise HTTPException(409, "MFA não está aguardando confirmação.")
    if not check_totp(db, user, decrypt(session.enrollment_encrypted), payload.code):
        raise HTTPException(401, "Código MFA inválido ou já utilizado.")
    codes = [secrets.token_hex(16) for _ in range(10)]
    user.totp_encrypted = session.enrollment_encrypted
    user.recovery_hashes = [digest(code) for code in codes]
    session.enrollment_encrypted = None
    new, raw = new_session(db, user, response, verified=True, old=session)
    audit(db, user, "auth.mfa_enrolled")
    commit(db)
    return {**identity(db, user, new, raw), "recovery_codes": codes}


@app.post("/api/auth/mfa/verify", response_model=out.IdentityOutput, response_model_exclude_none=True)
def verify_mfa(
    payload: s.CodeInput, response: Response, context=Depends(pending_session), db: Session = Depends(get_db)
):
    user, session, _ = context
    throttle(db, "mfa", user.id)
    user = db.scalar(select(m.User).where(m.User.id == user.id).with_for_update())
    if session.phase != "MFA_REQUIRED" or not user.totp_encrypted:
        raise HTTPException(409, "Sessão não aguarda verificação MFA.")
    hashed = digest(payload.code)
    if hashed in user.recovery_hashes:
        user.recovery_hashes = [x for x in user.recovery_hashes if x != hashed]
    elif not check_totp(db, user, decrypt(user.totp_encrypted), payload.code):
        raise HTTPException(401, "Código MFA inválido ou já utilizado.")
    new, raw = new_session(db, user, response, verified=True, old=session)
    audit(db, user, "auth.mfa_verified")
    commit(db)
    return identity(db, user, new, raw)


@app.get("/api/organizations", response_model=list[out.OrganizationOutput])
def organizations(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    result = []
    own = {r.organization_id for r in memberships(db, user)}
    offices = {
        r.organization_id for r in memberships(db, user) if r.role in {"SUPERADMIN_ESCRITORIO", "GESTOR_ESCRITORIO"}
    }
    for org in db.scalars(
        select(m.Organization)
        .where(or_(m.Organization.id.in_(own), m.Organization.office_id.in_(offices)))
        .order_by(m.Organization.name)
    ):
        try:
            manage_organization(db, user, org.id)
        except HTTPException:
            if org.id not in own:
                continue
        result.append({"id": org.id, "name": org.name, "kind": org.kind, "active": org.active})
    return result


@app.post("/api/admin/organizations", status_code=201)
def create_org(payload: s.OrganizationInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    office = office_membership(db, user, "organization:create")
    org = m.Organization(name=payload.name, kind="CLIENT", office_id=office.organization_id)
    db.add(org)
    db.flush()
    audit(db, user, "organization.created", org.id, organization=org.id)
    commit(db)
    return {"id": org.id, "name": org.name, "kind": org.kind, "active": org.active}


@app.get("/api/companies", response_model=list[out.CompanyOutput])
@app.get("/api/admin/companies", response_model=list[out.CompanyOutput])
def companies(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return [company_dict(db, user, c) for c in allowed_companies(db, user)]


@app.post("/api/admin/companies", status_code=201)
def create_company(payload: s.CompanyInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    org, member = manage_organization(db, user, payload.organization_id)
    if org.kind != "CLIENT" or "company:write" not in PERMISSIONS.get(member.role, set()):
        raise HTTPException(403, "Cadastro de empresa não permitido.")
    if member.company_id is not None:
        raise HTTPException(403, "Vínculo restrito a CNPJ não permite criar novas empresas.")
    existing = db.scalars(select(m.Company).where(m.Company.organization_id == org.id)).all()
    if member.role in OFFICE_ROLES and any(
        "company:write" not in permissions_for(db, user, c) or "member:manage" not in permissions_for(db, user, c)
        for c in existing
    ):
        raise HTTPException(403, "Delegação parcial não permite ampliar a carteira da organização.")
    if not (payload.cnpj.isdigit() and len(payload.cnpj) == 14) and not (
        get_settings().app_env != "production" and payload.cnpj.startswith("DEMO-")
    ):
        raise HTTPException(422, "Informe 14 dígitos; identificador DEMO- permitido apenas em desenvolvimento.")
    company = m.Company(**payload.model_dump())
    db.add(company)
    db.flush()
    if org.office_id:
        db.add(
            m.CompanyAuthorization(
                office_organization_id=org.office_id,
                company_id=company.id,
                permissions=sorted(PERMISSIONS["SUPERADMIN_ESCRITORIO"] - {"organization:create"}),
            )
        )
    audit(db, user, "company.created", company.id, company.id, org.id)
    commit(db)
    return company_dict(db, user, company)


@app.get("/api/client/companies/{company_id}")
def company_detail(company_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return company_dict(db, user, require_company(db, user, company_id, "company:read"))


@app.patch("/api/admin/companies/{company_id}")
def update_company(
    company_id: str, payload: s.CompanyUpdate, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    company = require_company(db, user, company_id, "company:read")
    if "company:write" not in permissions_for(db, user, company):
        raise HTTPException(403, "Alteração cadastral não permitida.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(company, field, value)
    audit(db, user, "company.updated", company.id, company.id, company.organization_id)
    commit(db)
    return company_dict(db, user, company)


@app.patch("/api/client/companies/{company_id}/office-authorization")
def update_grant(
    company_id: str, payload: s.GrantInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    c = require_company(db, user, company_id, "grant:manage")
    grant = db.scalar(select(m.CompanyAuthorization).where(m.CompanyAuthorization.company_id == c.id))
    if not grant:
        raise HTTPException(404, "Vínculo não encontrado.")
    grant.active = payload.active
    audit(db, user, "office_authorization.updated", grant.id, c.id, c.organization_id)
    commit(db)
    return {"active": grant.active, "notice": "Vínculo do aplicativo; não comprova procuração fiscal."}


def require_membership_scope(db, user, organization_id, company_id):
    org, actor = manage_organization(db, user, organization_id)
    if company_id:
        company = db.scalar(select(m.Company).where(m.Company.id == company_id, m.Company.organization_id == org.id))
        if not company or "member:manage" not in permissions_for(db, user, company):
            raise HTTPException(404, "Empresa não disponível para gestão de vínculos.")
    elif not (actor.organization_id == org.id and actor.company_id is None):
        companies = db.scalars(select(m.Company).where(m.Company.organization_id == org.id)).all()
        if actor.role not in OFFICE_ROLES or any(
            "member:manage" not in permissions_for(db, user, c) for c in companies
        ):
            raise HTTPException(403, "A autorização atual não permite conceder escopo de organização.")
    return org, actor


def validate_invite_scope(db, user, payload):
    org, actor = manage_organization(db, user, payload.organization_id)
    if org.kind == "OFFICE":
        if payload.role not in OFFICE_ROLES or actor.organization_id != org.id or payload.company_id:
            raise HTTPException(403, "Papel ou vínculo incompatível com a organização.")
        if payload.role == "SUPERADMIN_ESCRITORIO" and actor.role != "SUPERADMIN_ESCRITORIO":
            raise HTTPException(403, "Concessão de superadmin não permitida.")
    elif payload.role not in CLIENT_ROLES:
        raise HTTPException(403, "Papel do escritório não pode ser concedido ao cliente.")
    require_membership_scope(db, user, org.id, payload.company_id)
    if payload.company_id:
        company = db.scalar(
            select(m.Company).where(m.Company.id == payload.company_id, m.Company.organization_id == org.id)
        )
        if not company:
            raise HTTPException(404, "Empresa não encontrada nessa organização.")
    elif payload.role in {"EMISSOR_CLIENTE", "CONSULTA_CLIENTE"}:
        raise HTTPException(422, "Este papel exige vínculo a um CNPJ específico.")
    return org


@app.post("/api/admin/invitations", status_code=201)
def invite(payload: s.InviteInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    org = validate_invite_scope(db, user, payload)
    raw = secrets.token_urlsafe(48)
    invitation = m.Invitation(
        token_hash=digest(raw),
        email=str(payload.email).lower(),
        name=payload.name,
        organization_id=org.id,
        company_id=payload.company_id,
        role=payload.role,
        created_by=user.id,
        expires_at=m.now() + timedelta(hours=24),
    )
    db.add(invitation)
    db.flush()
    audit(db, user, "invitation.created", invitation.id, payload.company_id, org.id)
    commit(db)
    return {
        "id": invitation.id,
        "token": raw,
        "expires_at": invitation.expires_at,
        "notice": "Link confidencial exibido uma vez. Nenhum e-mail foi enviado no M1.",
    }


def get_invitation(db, token):
    inv = db.scalar(select(m.Invitation).where(m.Invitation.token_hash == digest(token)).with_for_update())
    if not inv or inv.revoked or inv.used_at or aware(inv.expires_at) <= m.now():
        raise HTTPException(400, "Convite inválido, utilizado ou expirado.")
    creator = db.get(m.User, inv.created_by)
    if not creator or not creator.active:
        raise HTTPException(400, "Convite indisponível.")
    validate_invite_scope(db, creator, inv)
    return inv


def attach_invitation(db, inv, user):
    existing = db.scalar(
        select(m.Membership).where(
            m.Membership.user_id == user.id,
            m.Membership.organization_id == inv.organization_id,
            m.Membership.company_id == inv.company_id,
            m.Membership.role == inv.role,
        )
    )
    if existing:
        existing.active = True
    else:
        db.add(
            m.Membership(user_id=user.id, organization_id=inv.organization_id, company_id=inv.company_id, role=inv.role)
        )
    inv.used_at = m.now()
    audit(db, user, "invitation.accepted", inv.id, inv.company_id, inv.organization_id)


@app.post("/api/auth/invitations/accept", response_model=out.IdentityOutput, response_model_exclude_none=True)
def accept_invitation(payload: s.AcceptInput, request: Request, response: Response, db: Session = Depends(get_db)):
    origin_guard(request)
    throttle(db, "invitation-ip", request.client.host if request.client else "unknown", maximum=30)
    inv = get_invitation(db, payload.token)
    if db.scalar(select(m.User.id).where(m.User.email == inv.email)):
        raise HTTPException(409, "Conta existente: entre e aceite o vínculo na sua sessão.")
    user = m.User(email=inv.email, name=inv.name, password_hash=hasher.hash(payload.password))
    db.add(user)
    db.flush()
    attach_invitation(db, inv, user)
    db.flush()
    session, raw = new_session(db, user, response)
    commit(db)
    return identity(db, user, session, raw)


@app.post("/api/invitations/accept-existing")
def accept_existing(
    payload: s.AcceptExistingInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    inv = get_invitation(db, payload.token)
    if inv.email != user.email:
        raise HTTPException(400, "Convite não corresponde à conta autenticada.")
    attach_invitation(db, inv, user)
    commit(db)
    return {"accepted": True, "notice": "Recarregue sua sessão para conferir os vínculos e exigências MFA."}


@app.get("/api/admin/users", response_model=list[out.UserAccessOutput])
def users(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    orgs = []
    for org in organizations(user, db):
        try:
            manage_organization(db, user, org["id"])
            orgs.append(org["id"])
        except HTTPException:
            pass
    if not orgs:
        raise HTTPException(403, "Gestão de usuários não permitida.")
    wide = []
    for organization_id in orgs:
        try:
            require_membership_scope(db, user, organization_id, None)
            wide.append(organization_id)
        except HTTPException:
            pass
    scoped = [c.id for c in allowed_companies(db, user, "member:manage")]
    rows = db.execute(
        select(m.Membership, m.User)
        .join(m.User, m.User.id == m.Membership.user_id)
        .where(
            m.Membership.organization_id.in_(orgs),
            or_(m.Membership.organization_id.in_(wide), m.Membership.company_id.in_(scoped)),
        )
    ).all()
    return [
        {
            "membership_id": r.id,
            "user_id": u.id,
            "name": u.name,
            "email": u.email,
            "organization_id": r.organization_id,
            "company_id": r.company_id,
            "role": r.role,
            "active": r.active,
            "mfa_enrolled": bool(u.totp_encrypted),
        }
        for r, u in rows
    ]


@app.patch("/api/admin/memberships/{membership_id}")
def update_membership(
    membership_id: str, payload: s.MembershipUpdate, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    member = db.get(m.Membership, membership_id)
    if not member:
        raise HTTPException(404, "Vínculo não encontrado.")
    manage_organization(db, user, member.organization_id)
    validate_invite_scope(db, user, member)
    db.scalar(select(m.Organization).where(m.Organization.id == member.organization_id).with_for_update())
    if not payload.active and member.role in {"SUPERADMIN_ESCRITORIO", "ADMIN_CLIENTE"}:
        others = db.scalars(
            select(m.Membership.id)
            .join(m.User, m.User.id == m.Membership.user_id)
            .where(
                m.Membership.organization_id == member.organization_id,
                m.Membership.role == member.role,
                m.Membership.active.is_(True),
                m.Membership.id != member.id,
                m.User.active.is_(True),
                m.Membership.company_id.is_(None)
                if member.company_id is None
                else or_(m.Membership.company_id.is_(None), m.Membership.company_id == member.company_id),
            )
        ).all()
        if not others:
            raise HTTPException(409, "Não é permitido revogar o último administrador deste escopo.")
    member.active = payload.active
    for session in db.scalars(select(m.AuthSession).where(m.AuthSession.user_id == member.user_id)):
        session.revoked = True
    audit(db, user, "membership.updated", member.id, member.company_id, member.organization_id)
    commit(db)
    return {"id": member.id, "active": member.active}


def record_dict(record):
    return {
        column.name: str(getattr(record, column.name))
        if isinstance(getattr(record, column.name), Decimal)
        else getattr(record, column.name)
        for column in record.__table__.columns
    }


def scoped_record(db, model, company_id, record_id):
    record = db.scalar(select(model).where(model.id == record_id, model.company_id == company_id))
    if not record:
        raise HTTPException(404, "Recurso não encontrado.")
    return record


def catalog_routes(model, input_type, response_type, resource):
    path = f"/api/client/companies/{{company_id}}/{resource}"
    permission = "customer" if resource == "customers" else "service"

    def listing(company_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
        require_company(db, user, company_id, permission + ":read")
        return [
            record_dict(r) for r in db.scalars(select(model).where(model.company_id == company_id).order_by(model.name))
        ]

    def create(
        company_id: str, payload: input_type, user: m.User = Depends(current_user), db: Session = Depends(get_db)
    ):
        c = require_company(db, user, company_id, permission + ":write")
        record = model(**payload.model_dump(), organization_id=c.organization_id, company_id=c.id)
        db.add(record)
        db.flush()
        audit(db, user, resource + ".created", record.id, c.id, c.organization_id)
        commit(db)
        return record_dict(record)

    def update(
        company_id: str,
        record_id: str,
        payload: input_type,
        user: m.User = Depends(current_user),
        db: Session = Depends(get_db),
    ):
        c = require_company(db, user, company_id, permission + ":write")
        record = scoped_record(db, model, c.id, record_id)
        for key, value in payload.model_dump().items():
            setattr(record, key, value)
        audit(db, user, resource + ".updated", record.id, c.id, c.organization_id)
        commit(db)
        return record_dict(record)

    app.add_api_route(path, listing, methods=["GET"], name=resource + "_list", response_model=list[response_type])
    app.add_api_route(
        path, create, methods=["POST"], status_code=201, name=resource + "_create", response_model=response_type
    )
    app.add_api_route(
        path + "/{record_id}", update, methods=["PUT"], name=resource + "_update", response_model=response_type
    )


catalog_routes(m.Customer, s.CustomerInput, out.CustomerOutput, "customers")
catalog_routes(m.Service, s.ServiceInput, out.ServiceOutput, "services")


@app.get("/api/client/companies/{company_id}/invoices/drafts", response_model=list[out.DraftOutput])
def drafts(company_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    require_company(db, user, company_id, "draft:read")
    return [
        record_dict(d)
        for d in db.scalars(
            select(m.InvoiceDraft)
            .where(m.InvoiceDraft.company_id == company_id)
            .order_by(m.InvoiceDraft.updated_at.desc())
        )
    ]


def write_draft(db, user, company_id, payload, draft=None):
    c = require_company(db, user, company_id, "draft:write")
    if payload.customer_id:
        scoped_record(db, m.Customer, c.id, payload.customer_id)
    if payload.service_id:
        scoped_record(db, m.Service, c.id, payload.service_id)
    values = payload.model_dump()
    values["competence_date"] = payload.competence_date.isoformat()
    if draft:
        for k, v in values.items():
            setattr(draft, k, v)
    else:
        draft = m.InvoiceDraft(**values, organization_id=c.organization_id, company_id=c.id)
        db.add(draft)
    db.flush()
    audit(db, user, "draft.saved", draft.id, c.id, c.organization_id)
    commit(db)
    return record_dict(draft)


@app.post("/api/client/companies/{company_id}/invoices/drafts", status_code=201)
def create_draft(
    company_id: str, payload: s.DraftInput, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    return write_draft(db, user, company_id, payload)


@app.put("/api/client/companies/{company_id}/invoices/drafts/{draft_id}")
def update_draft(
    company_id: str,
    draft_id: str,
    payload: s.DraftInput,
    user: m.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    require_company(db, user, company_id, "draft:write")
    return write_draft(db, user, company_id, payload, scoped_record(db, m.InvoiceDraft, company_id, draft_id))


@app.delete("/api/client/companies/{company_id}/invoices/drafts/{draft_id}", status_code=204)
def delete_draft(company_id: str, draft_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    c = require_company(db, user, company_id, "draft:write")
    d = scoped_record(db, m.InvoiceDraft, c.id, draft_id)
    db.delete(d)
    audit(db, user, "draft.deleted", draft_id, c.id, c.organization_id)
    commit(db)


@app.get("/api/client/companies/{company_id}/invoices", response_model=list[out.InvoiceOutput])
def invoices(company_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    require_company(db, user, company_id, "invoice:read")
    return [record_dict(n) for n in db.scalars(select(m.Invoice).where(m.Invoice.company_id == company_id))]


@app.post("/api/client/companies/{company_id}/invoices/{draft_id}/issue")
def issue(company_id: str, draft_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    require_company(db, user, company_id, "draft:write")
    scoped_record(db, m.InvoiceDraft, company_id, draft_id)
    raise HTTPException(501, "M3 não implementado: nenhuma emissão, assinatura ou autorização fiscal foi realizada.")


@app.get("/api/client/companies/{company_id}/providers")
def capabilities(company_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    c = require_company(db, user, company_id, "company:read")
    return {
        "fiscal": asdict(DisabledFiscalProvider().get_capabilities({}, c.municipality, {}, "")),
        "payment": {"milestone": "M2", **provider_status()},
        "certificate": {"configured": False, "milestone": "M3"},
    }


@app.get("/api/admin/metrics")
def metrics(company_id: str | None = None, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    companies = [require_company(db, user, company_id, "company:read")] if company_id else allowed_companies(db, user)
    ids = [c.id for c in companies]
    drafts_count = len(db.scalars(select(m.InvoiceDraft.id).where(m.InvoiceDraft.company_id.in_(ids))).all())
    authorized = db.scalar(
        select(func.count())
        .select_from(m.Invoice)
        .where(m.Invoice.company_id.in_(ids), m.Invoice.status == "AUTHORIZED")
    )
    return {
        "companies": len(companies),
        "drafts": drafts_count,
        "authorized_invoices": authorized,
        "fiscal_configured": False,
        "billing_configured": False,
        "notice": "M1: não há autorização fiscal ou cobrança habilitada.",
    }


@app.get("/api/admin/audit")
def audit_listing(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    ids = [c.id for c in allowed_companies(db, user, "audit:read")]
    privileged = any("audit:read" in PERMISSIONS.get(r.role, set()) for r in memberships(db, user))
    if not privileged:
        raise HTTPException(403, "Leitura de auditoria não permitida.")
    records = db.scalars(
        select(m.AuditLog)
        .where(or_(m.AuditLog.company_id.in_(ids), m.AuditLog.actor_id == user.id))
        .order_by(m.AuditLog.at.desc())
        .limit(200)
    ).all()
    return [record_dict(r) for r in records]
