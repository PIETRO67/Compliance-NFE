from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


def uid() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(16), default="CLIENT")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    office_id: Mapped[str | None] = mapped_column(ForeignKey("organizations.id"), index=True)


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (
        UniqueConstraint("id", "organization_id"),
        UniqueConstraint("cnpj"),
        Index("ix_companies_org_active", "organization_id", "active"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    cnpj: Mapped[str] = mapped_column(String(32))
    municipality: Mapped[str] = mapped_column(String(100))
    tax_regime: Mapped[str] = mapped_column(String(60))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    fiscal_status: Mapped[str] = mapped_column(String(40), default="NOT_CONFIGURED")


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    totp_encrypted: Mapped[str | None] = mapped_column(Text)
    last_totp_step: Mapped[int] = mapped_column(Integer, default=-1)
    recovery_hashes: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        UniqueConstraint("user_id", "organization_id", "company_id", "role"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    company_id: Mapped[str | None] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(40))
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class CompanyAuthorization(Base):
    __tablename__ = "company_authorizations"
    __table_args__ = (UniqueConstraint("office_organization_id", "company_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    office_organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Vínculo do aplicativo. Não comprova procuração/representação fiscal.


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    phase: Mapped[str] = mapped_column(String(32))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    enrollment_encrypted: Mapped[str | None] = mapped_column(Text)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False)


class LoginThrottle(Base):
    __tablename__ = "login_throttles"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    email: Mapped[str] = mapped_column(String(254))
    name: Mapped[str] = mapped_column(String(160))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    company_id: Mapped[str | None] = mapped_column(String(36))
    role: Mapped[str] = mapped_column(String(40))
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("id", "company_id"),
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        Index("ix_customer_tenant", "organization_id", "company_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36))
    company_id: Mapped[str] = mapped_column(String(36))
    name: Mapped[str] = mapped_column(String(160))
    document: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(254), default="")
    municipality: Mapped[str] = mapped_column(String(100), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Service(Base):
    __tablename__ = "service_catalog"
    __table_args__ = (
        UniqueConstraint("id", "company_id"),
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        Index("ix_service_tenant", "organization_id", "company_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36))
    company_id: Mapped[str] = mapped_column(String(36))
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    code: Mapped[str] = mapped_column(String(50), default="A_VALIDAR")
    favorite: Mapped[bool] = mapped_column(Boolean, default=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class InvoiceDraft(Base):
    __tablename__ = "invoice_drafts"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        ForeignKeyConstraint(["customer_id", "company_id"], ["customers.id", "customers.company_id"]),
        ForeignKeyConstraint(["service_id", "company_id"], ["service_catalog.id", "service_catalog.company_id"]),
        Index("ix_draft_tenant", "organization_id", "company_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36))
    company_id: Mapped[str] = mapped_column(String(36))
    customer_id: Mapped[str | None] = mapped_column(String(36))
    service_id: Mapped[str | None] = mapped_column(String(36))
    description: Mapped[str] = mapped_column(Text, default="")
    competence_date: Mapped[str] = mapped_column(String(10))
    amount: Mapped[object] = mapped_column(Numeric(16, 2), default=0)
    step: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        Index("ix_invoice_tenant", "organization_id", "company_id"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(String(36))
    company_id: Mapped[str] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(40))
    reference: Mapped[str] = mapped_column(String(100))
    amount: Mapped[object] = mapped_column(Numeric(16, 2))
    provider: Mapped[str] = mapped_column(String(40))
    # Nenhuma autorização fiscal é gerada pelo M1.


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str | None] = mapped_column(String(36), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(36), index=True)
    company_id: Mapped[str | None] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(36))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
