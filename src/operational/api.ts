export interface CompanyRecord {
  id: string;
  organization_id: string;
  name: string;
  cnpj: string;
  municipality: string;
  tax_regime: string;
  active: boolean;
  fiscal_status: string;
  permissions: string[];
}
export interface MembershipRecord {
  id: string;
  organization_id: string;
  company_id: string | null;
  role: string;
}
export interface Identity {
  user: { id: string; name: string; email: string };
  phase: string;
  csrf_token: string;
  memberships: MembershipRecord[];
  companies: CompanyRecord[];
  environment: string;
  fiscal_enabled: false;
  billing_enabled: false;
  recovery_codes?: string[];
}
export interface OrganizationRecord {
  id: string;
  name: string;
  kind: string;
  active: boolean;
}
export interface CustomerRecord {
  id: string;
  name: string;
  document: string;
  email: string;
  municipality: string;
  active: boolean;
  company_id: string;
}
export interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  code: string;
  favorite: boolean;
  active: boolean;
  company_id: string;
}
export interface DraftRecord {
  id: string;
  company_id: string;
  customer_id: string | null;
  service_id: string | null;
  description: string;
  competence_date: string;
  amount: string;
  step: number;
}
export interface UserRecord {
  membership_id: string;
  user_id: string;
  name: string;
  email: string;
  organization_id: string;
  company_id: string | null;
  role: string;
  active: boolean;
  mfa_enrolled: boolean;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let csrfToken = "";
export function setCsrf(value: string) {
  csrfToken = value;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    method: options.method || "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "IA-Compliance",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  if (!response.ok) {
    let message = "Não foi possível concluir a operação.";
    try {
      const payload = await response.json();
      message = Array.isArray(payload.detail)
        ? payload.detail.map((e: { msg: string }) => e.msg).join(" ")
        : payload.detail || message;
    } catch {}
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
