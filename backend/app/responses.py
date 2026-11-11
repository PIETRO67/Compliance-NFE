from datetime import datetime
from pydantic import BaseModel, ConfigDict


class Output(BaseModel):
    model_config = ConfigDict(extra="ignore", from_attributes=True)


class MembershipOutput(Output):
    id: str
    organization_id: str
    company_id: str | None
    role: str


class CompanyOutput(Output):
    id: str
    organization_id: str
    name: str
    cnpj: str
    municipality: str
    tax_regime: str
    active: bool
    fiscal_status: str
    permissions: list[str]


class UserIdentity(Output):
    id: str
    name: str
    email: str


class IdentityOutput(Output):
    user: UserIdentity
    phase: str
    csrf_token: str
    memberships: list[MembershipOutput]
    companies: list[CompanyOutput]
    environment: str
    fiscal_enabled: bool
    billing_enabled: bool
    recovery_codes: list[str] | None = None


class OrganizationOutput(Output):
    id: str
    name: str
    kind: str
    active: bool


class UserAccessOutput(Output):
    membership_id: str
    user_id: str
    name: str
    email: str
    organization_id: str
    company_id: str | None
    role: str
    active: bool
    mfa_enrolled: bool


class CustomerOutput(Output):
    id: str
    organization_id: str
    company_id: str
    name: str
    document: str
    email: str
    municipality: str
    active: bool


class ServiceOutput(Output):
    id: str
    organization_id: str
    company_id: str
    name: str
    description: str
    code: str
    favorite: bool
    active: bool


class DraftOutput(Output):
    id: str
    organization_id: str
    company_id: str
    customer_id: str | None
    service_id: str | None
    description: str
    competence_date: str
    amount: str
    step: int
    updated_at: datetime


class InvoiceOutput(Output):
    id: str
    organization_id: str
    company_id: str
    reference: str
    amount: str
    status: str
    provider: str
