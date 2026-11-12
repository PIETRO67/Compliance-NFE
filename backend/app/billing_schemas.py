from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import EmailStr, Field, field_validator
from .schemas import Input


class Reason(Input):
    reason: str = Field(min_length=10, max_length=500)
    confirmed: Literal[True]


class PlanInput(Reason):
    name: str = Field(min_length=3, max_length=120)
    description: str = Field(default="", max_length=1000)
    price: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    quota: int = Field(ge=0, le=1000000)
    overage_price: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)
    user_limit: int | None = Field(default=None, ge=1, le=100000)
    features: list[str] = Field(default_factory=list, max_length=30)
    accounting_clients: bool = False

    @field_validator("features")
    @classmethod
    def bounded_features(cls, value):
        if any(len(s) > 100 for s in value):
            raise ValueError("Recurso deve ter até 100 caracteres.")
        return value


class AccountInput(Input):
    holder: str = Field(min_length=3, max_length=160)
    email: EmailStr
    address: str = Field(min_length=5, max_length=500)


class SubscribeInput(Reason):
    plan_id: str = Field(max_length=36)
    idempotency_key: str = Field(min_length=10, max_length=100)
    modality: Literal["PAID", "COURTESY", "TRIAL"] = "PAID"
    billing_type: Literal["PIX", "BOLETO"] = "PIX"
    start_date: date
    review_date: date | None = None
    grace_days: int = Field(default=5, ge=0, le=90)
    activation_rule: Literal["CONFIRMED", "RECEIVED"] = "RECEIVED"
    contract_price: Decimal | None = Field(default=None, ge=0, max_digits=18, decimal_places=2)


class ChangePlan(Reason):
    plan_id: str = Field(max_length=36)


class Override(Reason):
    until: date


class Policies(Reason):
    grace_days: int = Field(ge=0, le=90)
    activation_rule: Literal["CONFIRMED", "RECEIVED"]


class Simulate(Reason):
    source_event_id: str = Field(min_length=8, max_length=120)
    units: int = Field(ge=1, le=1000000)


class Reconcile(Reason):
    company_id: str = Field(max_length=36)


class WebhookResource(Input):
    id: str = Field(pattern=r"^[a-zA-Z0-9_\-]{1,100}$")
    # Asaas adds fields. They are discarded and never persisted.
    model_config = {"extra": "ignore"}


class WebhookInput(Input):
    id: str = Field(pattern=r"^[!-~]{1,150}$")
    event: str = Field(pattern=r"^[A-Z_]{1,80}$")
    payment: WebhookResource | None = None
    subscription: WebhookResource | None = None
    model_config = {"extra": "ignore"}
