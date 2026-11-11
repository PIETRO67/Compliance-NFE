from fastapi import HTTPException
from sqlalchemy import select, or_, false
from sqlalchemy.orm import Session
from .models import Company, CompanyAuthorization, Membership, Organization, User

READ = {"company:read", "customer:read", "service:read", "draft:read", "invoice:read", "support:read"}
EDIT = READ | {"customer:write", "service:write", "draft:write", "support:write"}
PERMISSIONS = {
    "SUPERADMIN_ESCRITORIO": EDIT | {"company:write", "member:manage", "organization:create", "audit:read"},
    "GESTOR_ESCRITORIO": EDIT | {"company:write", "member:manage", "audit:read"},
    "ANALISTA_FISCAL": EDIT,
    "SUPORTE": {"company:read", "support:read", "support:write"},
    "ADMIN_CLIENTE": EDIT | {"company:write", "member:manage", "grant:manage", "audit:read"},
    "EMISSOR_CLIENTE": EDIT,
    "CONSULTA_CLIENTE": READ,
}
OFFICE_ROLES = {"SUPERADMIN_ESCRITORIO", "GESTOR_ESCRITORIO", "ANALISTA_FISCAL", "SUPORTE"}
CLIENT_ROLES = {"ADMIN_CLIENTE", "EMISSOR_CLIENTE", "CONSULTA_CLIENTE"}


def memberships(db: Session, user: User):
    return db.scalars(
        select(Membership)
        .join(Organization, Organization.id == Membership.organization_id)
        .where(Membership.user_id == user.id, Membership.active.is_(True), Organization.active.is_(True))
    ).all()


def permissions_for(db: Session, user: User, company: Company) -> set[str]:
    permissions = set()
    for member in memberships(db, user):
        role_permissions = PERMISSIONS.get(member.role, set())
        if (
            member.role in CLIENT_ROLES
            and member.organization_id == company.organization_id
            and (member.company_id == company.id or member.company_id is None and member.role == "ADMIN_CLIENTE")
        ):
            permissions.update(role_permissions)
        elif member.role in OFFICE_ROLES:
            grant = db.scalar(
                select(CompanyAuthorization).where(
                    CompanyAuthorization.office_organization_id == member.organization_id,
                    CompanyAuthorization.company_id == company.id,
                    CompanyAuthorization.active.is_(True),
                )
            )
            if grant:
                permissions.update(role_permissions.intersection(grant.permissions))
    return permissions


def allowed_companies(db: Session, user: User, permission="company:read"):
    return [
        c
        for c in db.scalars(select(Company).where(company_scope(db, user)).order_by(Company.name)).all()
        if permission in permissions_for(db, user, c)
    ]


def company_scope(db: Session, user: User):
    members = memberships(db, user)
    wide = [m.organization_id for m in members if m.role == "ADMIN_CLIENTE" and m.company_id is None]
    direct = [m.company_id for m in members if m.role in CLIENT_ROLES and m.company_id]
    offices = [m.organization_id for m in members if m.role in OFFICE_ROLES]
    grants = select(CompanyAuthorization.company_id).where(
        CompanyAuthorization.office_organization_id.in_(offices), CompanyAuthorization.active.is_(True)
    )
    return (
        or_(Company.organization_id.in_(wide), Company.id.in_(direct), Company.id.in_(grants)) if members else false()
    )


def require_company(db: Session, user: User, company_id: str, permission: str) -> Company:
    company = db.scalar(select(Company).where(Company.id == company_id, company_scope(db, user)))
    if not company or "company:read" not in permissions_for(db, user, company):
        raise HTTPException(404, "Recurso não encontrado.")
    if permission not in permissions_for(db, user, company):
        raise HTTPException(403, "Seu vínculo não permite esta operação.")
    if not company.active and permission.endswith(":write"):
        raise HTTPException(409, "Empresa inativa: alterações bloqueadas, leitura preservada.")
    return company


def office_membership(db: Session, user: User, permission: str):
    member = next(
        (m for m in memberships(db, user) if m.role in OFFICE_ROLES and permission in PERMISSIONS[m.role]), None
    )
    if not member:
        raise HTTPException(403, "Operação administrativa não permitida.")
    return member


def manage_organization(db: Session, user: User, organization_id: str):
    org = db.get(Organization, organization_id)
    if not org:
        raise HTTPException(404, "Organização não encontrada.")
    for m in memberships(db, user):
        if m.organization_id == org.id and "member:manage" in PERMISSIONS.get(m.role, set()):
            return org, m
        if (
            org.kind == "CLIENT"
            and org.office_id == m.organization_id
            and m.role in {"SUPERADMIN_ESCRITORIO", "GESTOR_ESCRITORIO"}
        ):
            companies = db.scalars(select(Company).where(Company.organization_id == org.id)).all()
            if not companies or any("member:manage" in permissions_for(db, user, c) for c in companies):
                return org, m
    raise HTTPException(404, "Organização não encontrada.")
