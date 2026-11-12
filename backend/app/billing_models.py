"""M2: dados comerciais, separados de invoices fiscais. Valores em BRL."""

from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    Date,
    Numeric,
    JSON,
    ForeignKey,
    ForeignKeyConstraint,
    UniqueConstraint,
    CheckConstraint,
    Index,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import uid, now


class Plan(Base):
    __tablename__ = "billing_plans"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    office_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("status IN ('DRAFT','PUBLISHED','ARCHIVED')"),)


class PlanDecision(Base):
    __tablename__ = "billing_plan_decisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("billing_plans.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(500))
    before: Mapped[dict] = mapped_column(JSON)
    after: Mapped[dict] = mapped_column(JSON)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PlanVersion(Base):
    __tablename__ = "billing_plan_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    plan_id: Mapped[str] = mapped_column(ForeignKey("billing_plans.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    quota: Mapped[int] = mapped_column(Integer)
    overage_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    user_limit: Mapped[int | None] = mapped_column(Integer)
    features: Mapped[list] = mapped_column(JSON, default=list)
    accounting_clients: Mapped[bool] = mapped_column(Boolean, default=False)
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    reason: Mapped[str] = mapped_column(String(500))
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    __table_args__ = (
        UniqueConstraint("plan_id", "version"),
        CheckConstraint("price >= 0 AND quota >= 0 AND (overage_price IS NULL OR overage_price >= 0)"),
    )


class Account(Base):
    __tablename__ = "billing_accounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    company_id: Mapped[str] = mapped_column(String(36), unique=True)
    organization_id: Mapped[str] = mapped_column(String(36), index=True)
    holder: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254))
    address: Mapped[str] = mapped_column(String(500))
    environment: Mapped[str] = mapped_column(String(16), default="sandbox")
    external_id: Mapped[str | None] = mapped_column(String(100))
    provisioning: Mapped[str] = mapped_column(String(32), default="NEW")
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        UniqueConstraint("id", "company_id"),
        UniqueConstraint("environment", "external_id"),
        CheckConstraint("environment = 'sandbox'"),
    )


class Subscription(Base):
    __tablename__ = "billing_subscriptions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    company_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(36), index=True)
    account_id: Mapped[str] = mapped_column(String(36))
    plan_version_id: Mapped[str] = mapped_column(ForeignKey("billing_plan_versions.id"))
    snapshot: Mapped[dict] = mapped_column(JSON)
    price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    quota: Mapped[int] = mapped_column(Integer)
    overage_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    modality: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    environment: Mapped[str] = mapped_column(String(16), default="sandbox")
    provider: Mapped[str] = mapped_column(String(16), default="asaas")
    external_id: Mapped[str | None] = mapped_column(String(100))
    idempotency_key: Mapped[str] = mapped_column(String(100))
    billing_type: Mapped[str] = mapped_column(String(16), default="PIX")
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    review_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    grace_days: Mapped[int] = mapped_column(Integer, default=5)
    activation_rule: Mapped[str] = mapped_column(String(16), default="RECEIVED")
    provisioning: Mapped[str] = mapped_column(String(32), default="QUEUED")
    pending_version_id: Mapped[str | None] = mapped_column(ForeignKey("billing_plan_versions.id"))
    change_synced: Mapped[bool] = mapped_column(Boolean, default=False)
    change_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    override_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    commercial_hold: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    last_error: Mapped[str | None] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        ForeignKeyConstraint(["company_id", "organization_id"], ["companies.id", "companies.organization_id"]),
        ForeignKeyConstraint(["account_id", "company_id"], ["billing_accounts.id", "billing_accounts.company_id"]),
        UniqueConstraint("id", "company_id"),
        UniqueConstraint("company_id", "idempotency_key"),
        UniqueConstraint("environment", "external_id"),
        CheckConstraint("environment = 'sandbox'"),
        CheckConstraint("price >= 0 AND quota >= 0 AND grace_days BETWEEN 0 AND 90"),
        CheckConstraint("modality IN ('PAID','COURTESY','TRIAL')"),
        CheckConstraint("activation_rule IN ('CONFIRMED','RECEIVED')"),
        CheckConstraint("status IN ('PENDING','ACTIVE','GRACE','PAST_DUE','SUSPENDED','CANCELLED','EXPIRED')"),
        Index(
            "uq_billing_live_contract",
            "company_id",
            unique=True,
            postgresql_where=text("status NOT IN ('CANCELLED','EXPIRED')"),
        ),
    )


class Period(Base):
    __tablename__ = "billing_periods"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    subscription_id: Mapped[str] = mapped_column(String(36), index=True)
    company_id: Mapped[str] = mapped_column(String(36), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    quota: Mapped[int] = mapped_column(Integer)
    overage_price: Mapped[Decimal | None] = mapped_column(Numeric(18, 2))
    price: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    snapshot: Mapped[dict] = mapped_column(JSON)
    closed: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (
        ForeignKeyConstraint(
            ["subscription_id", "company_id"], ["billing_subscriptions.id", "billing_subscriptions.company_id"]
        ),
        UniqueConstraint("subscription_id", "start_at"),
        UniqueConstraint("id", "company_id"),
        CheckConstraint("end_at > start_at AND quota >= 0"),
    )


class Charge(Base):
    __tablename__ = "billing_charges"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    subscription_id: Mapped[str] = mapped_column(String(36), index=True)
    company_id: Mapped[str] = mapped_column(String(36), index=True)
    period_id: Mapped[str] = mapped_column(String(36))
    environment: Mapped[str] = mapped_column(String(16), default="sandbox")
    external_id: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(16), default="BASE")
    value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    due_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(40), index=True)
    billing_type: Mapped[str] = mapped_column(String(20))
    payment_url: Mapped[str | None] = mapped_column(String(600))
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        ForeignKeyConstraint(
            ["subscription_id", "company_id"], ["billing_subscriptions.id", "billing_subscriptions.company_id"]
        ),
        ForeignKeyConstraint(["period_id", "company_id"], ["billing_periods.id", "billing_periods.company_id"]),
        UniqueConstraint("environment", "external_id"),
        CheckConstraint("environment = 'sandbox' AND kind = 'BASE' AND value >= 0"),
    )


class UsageEvent(Base):
    __tablename__ = "billing_usage_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    company_id: Mapped[str] = mapped_column(String(36), index=True)
    subscription_id: Mapped[str] = mapped_column(String(36), index=True)
    period_id: Mapped[str] = mapped_column(String(36), index=True)
    source_event_id: Mapped[str] = mapped_column(String(120), unique=True)
    classification: Mapped[str] = mapped_column(String(24))
    units: Mapped[int] = mapped_column(Integer)
    billable: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(40), default="M2_SYNTHETIC")
    reversal_of: Mapped[str | None] = mapped_column(ForeignKey("billing_usage_events.id"), unique=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        ForeignKeyConstraint(
            ["subscription_id", "company_id"], ["billing_subscriptions.id", "billing_subscriptions.company_id"]
        ),
        ForeignKeyConstraint(["period_id", "company_id"], ["billing_periods.id", "billing_periods.company_id"]),
        CheckConstraint("billable = false AND classification IN ('SIMULATED','REVERSAL')"),
        CheckConstraint(
            "(classification='SIMULATED' AND units>0 AND reversal_of IS NULL) OR (classification='REVERSAL' AND units<0 AND reversal_of IS NOT NULL)"
        ),
    )


class WebhookInbox(Base):
    __tablename__ = "billing_webhook_inbox"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    environment: Mapped[str] = mapped_column(String(16), default="sandbox")
    event_id: Mapped[str] = mapped_column(String(150))
    event_type: Mapped[str] = mapped_column(String(80))
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id"), index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(24), default="PENDING", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    safe_error: Mapped[str | None] = mapped_column(String(100))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("environment", "event_id"), CheckConstraint("environment = 'sandbox'"))


class ReconciliationRun(Base):
    __tablename__ = "billing_reconciliation_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(24), default="PENDING", index=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Adjustment(Base):
    __tablename__ = "billing_adjustments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), index=True)
    subscription_id: Mapped[str] = mapped_column(String(36))
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(String(500))
    before: Mapped[dict] = mapped_column(JSON)
    after: Mapped[dict] = mapped_column(JSON)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (
        ForeignKeyConstraint(
            ["subscription_id", "company_id"], ["billing_subscriptions.id", "billing_subscriptions.company_id"]
        ),
    )
