from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoginInput(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class CodeInput(Input):
    code: str = Field(min_length=6, max_length=32)


class OrganizationInput(Input):
    name: str = Field(min_length=3, max_length=160)


class CompanyInput(Input):
    organization_id: str = Field(max_length=36)
    name: str = Field(min_length=3, max_length=160)
    cnpj: str = Field(min_length=6, max_length=32)
    municipality: str = Field(min_length=3, max_length=100)
    tax_regime: str = Field(min_length=2, max_length=60)


class CompanyUpdate(Input):
    name: str | None = Field(default=None, min_length=3, max_length=160)
    municipality: str | None = Field(default=None, min_length=3, max_length=100)
    tax_regime: str | None = Field(default=None, min_length=2, max_length=60)
    active: bool | None = None


Role = Literal[
    "SUPERADMIN_ESCRITORIO",
    "GESTOR_ESCRITORIO",
    "ANALISTA_FISCAL",
    "SUPORTE",
    "ADMIN_CLIENTE",
    "EMISSOR_CLIENTE",
    "CONSULTA_CLIENTE",
]


class InviteInput(Input):
    organization_id: str = Field(max_length=36)
    company_id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=3, max_length=160)
    email: EmailStr
    role: Role


class AcceptInput(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    token: str = Field(min_length=32, max_length=128)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("password")
    @classmethod
    def password_quality(cls, value):
        if len(value.strip()) < 12 or len(set(value)) < 6:
            raise ValueError("Use pelo menos 12 caracteres e evite senhas repetitivas ou somente espaços.")
        return value


class AcceptExistingInput(Input):
    token: str = Field(min_length=32, max_length=128)


class MembershipUpdate(Input):
    active: bool


class CustomerInput(Input):
    name: str = Field(min_length=3, max_length=160)
    document: str = Field(min_length=3, max_length=32)
    email: str = Field(default="", max_length=254)
    municipality: str = Field(default="", max_length=100)
    active: bool = True


class ServiceInput(Input):
    name: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=3, max_length=4000)
    code: str = Field(default="A_VALIDAR", max_length=50)
    favorite: bool = True
    active: bool = True


class DraftInput(Input):
    customer_id: str | None = Field(default=None, max_length=36)
    service_id: str | None = Field(default=None, max_length=36)
    description: str = Field(default="", max_length=8000)
    competence_date: date
    amount: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=16, decimal_places=2)
    step: int = Field(default=0, ge=0, le=4)


class GrantInput(Input):
    active: bool
