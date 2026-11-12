"use client";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  RefreshCw,
  Plus,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  FileClock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api, type CompanyRecord } from "./api";
import { useAuth } from "./AuthProvider";
import { Modal, Field, Badge, Empty } from "../components/shared/ui";
import { displayDate } from "../lib/formatters";

function currency(value: string | number) {
  const [whole, fraction = ""] = String(value).split(".");
  if (!/^-?\d+$/.test(whole)) return "R$ —";
  return `R$ ${new Intl.NumberFormat("pt-BR").format(BigInt(whole))},${fraction.padEnd(2, "0").slice(0, 2)}`;
}

type Version = {
  id: string;
  version: number;
  price: string;
  quota: number;
  overage_price?: string;
  user_limit?: number;
  features: string[];
  accounting_clients: boolean;
  effective_at: string;
  reason: string;
};
type Plan = {
  id: string;
  name: string;
  description: string;
  status: string;
  current: Version;
  versions?: Version[];
};
type Sub = {
  id: string;
  company_id: string;
  status: string;
  modality: string;
  price: string;
  quota: number;
  snapshot: { name: string; version: number };
  start_at: string;
  review_at?: string;
  change_at?: string;
  provisioning: string;
  external_id?: string;
  last_error?: string;
  grace_days: number;
  activation_rule: string;
  override_until?: string;
};
type Period = {
  id: string;
  start_at: string;
  end_at: string;
  quota: number;
  closed: boolean;
};
type Adjustment = {
  id: string;
  kind: string;
  reason: string;
  at: string;
  after: Record<string, unknown>;
};
type SubscriptionInfo = {
  subscription: Sub | null;
  period?: Period;
  eligibility: {
    commercial_eligible_for_future_features: boolean;
    historical_access: boolean;
  };
  timeline?: Adjustment[];
};
type Charge = {
  id: string;
  external_id: string;
  company_id: string;
  value: string;
  due_date: string;
  status: string;
  billing_type: string;
  payment_url?: string;
  verified_at: string;
};
type Usage = {
  summary: null | {
    quota: number;
    simulated_units: number;
    billable_units: number;
    excess_units: number;
    preview_amount: string | null;
    payable_amount: string;
  };
  period?: Period;
  periods: Period[];
  events: {
    id: string;
    source_event_id: string;
    classification: string;
    units: number;
    at: string;
  }[];
};
type Provider = {
  configured: boolean;
  outbound_enabled: boolean;
  production_enabled: false;
  notice: string;
};
type Dashboard = {
  active_subscriptions: number;
  contracted_mrr: string;
  sandbox_received: string;
  past_due: number;
  subscriptions: Sub[];
  provider: Provider;
};
type QueueItem = {
  id: string;
  event_type?: string;
  event_id?: string;
  status: string;
  attempts: number;
  safe_error?: string;
  created_at?: string;
  received_at?: string;
  result?: { error?: string; contracts_checked?: number };
};
type Account = {
  holder: string;
  email: string;
  address: string;
  external_id?: string;
};
const labels: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativa",
  GRACE: "Carência",
  PAST_DUE: "Inadimplente",
  SUSPENDED: "Suspensa / revisão",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
  RECEIVED: "Recebido no Sandbox",
  CONFIRMED: "Confirmado — ainda não recebido",
  OVERDUE: "Vencida",
  REFUNDED: "Estornada",
  PARTIALLY_REFUNDED: "Estorno parcial",
  CHARGEBACK_REQUESTED: "Chargeback — revisar",
  QUEUED: "Na fila",
  READY: "Provisionada — não comprova pagamento",
  NOT_APPLICABLE: "Concessão administrativa",
  DEAD: "Revisão necessária",
  DONE: "Concluído",
  REVIEW: "Revisão necessária",
};
const status = (s: string) => labels[s] || s;
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const reasonDefaults = { confirmed: true as const };
function decimal(value: string) {
  const text = value.trim().replace(/\s|R\$/g, "");
  return text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
}
function errorText(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Não foi possível concluir a operação.";
}
function useData<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path: "" });
  useEffect(() => {
    let live = true;
    setResult({ path });
    if (path)
      void api<T>(path)
        .then((data) => {
          if (live) setResult({ path, data });
        })
        .catch((e) => {
          if (live) setResult({ path, error: errorText(e) });
        });
    return () => {
      live = false;
    };
  }, [path, revision]);
  return {
    data: result.path === path ? result.data : undefined,
    error: result.path === path ? result.error : undefined,
    reload: useCallback(() => setRevision((n) => n + 1), []),
  };
}
function LoadState({ error, loading }: { error?: string; loading: boolean }) {
  return error ? (
    <p role="alert" className="error">
      {error}
    </p>
  ) : loading ? (
    <p role="status" className="billing-loading">
      Carregando dados do servidor…
    </p>
  ) : null;
}
const adminSections = [
  ["", "Visão financeira"],
  ["/planos", "Planos"],
  ["/assinaturas", "Assinaturas"],
  ["/cobrancas", "Cobranças"],
  ["/consumo", "Consumo"],
  ["/integracoes", "Integrações"],
  ["/politicas", "Políticas"],
];
const portalSections = [
  ["/assinatura", "Minha assinatura"],
  ["/mensalidades", "Minhas mensalidades"],
  ["/consumo", "Meu consumo"],
  ["/planos", "Planos disponíveis"],
];

export default function BillingApp({
  path,
  company,
  portal,
}: {
  path: string;
  company?: CompanyRecord;
  portal: boolean;
}) {
  const [revision, setRevision] = useState(0);
  const base = portal ? "/portal" : "/admin/financeiro";
  const sections = portal ? portalSections : adminSections;
  return (
    <div className="billing-workspace">
      <div className="billing-intro">
        <div>
          <span className="eyebrow">GESTÃO COMERCIAL · M2</span>
          <h2>
            {portal ? "Sua conta, com clareza" : "Financeiro do escritório"}
          </h2>
          <p>
            Contratos e dados persistidos. Asaas exclusivamente Sandbox; emissão
            fiscal segue indisponível.
          </p>
        </div>
        <CreditCard size={28} />
      </div>
      <nav className="billing-tabs" aria-label="Navegação financeira">
        {sections.map(([suffix, label]) => (
          <Link
            key={suffix}
            className={path === base + suffix ? "active" : ""}
            href={base + suffix}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="billing-callout">
        <ShieldCheck size={18} />
        <span>
          SANDBOX — SEM COBRANÇAS DE PRODUÇÃO. Criação de assinatura não
          comprova pagamento. Histórico e acesso à regularização permanecem
          disponíveis.
        </span>
      </div>
      {!portal && path.endsWith("/planos") ? (
        <Plans key={revision} changed={() => setRevision((n) => n + 1)} />
      ) : !portal && path.endsWith("/integracoes") ? (
        <Integration company={company} />
      ) : !portal && path === "/admin/financeiro" ? (
        <Overview company={company} />
      ) : !company ? (
        <Empty title="Selecione uma empresa autorizada para continuar" />
      ) : portal && path.endsWith("/planos") ? (
        <AvailablePlans company={company} />
      ) : path.endsWith("/cobrancas") || path.endsWith("/mensalidades") ? (
        <Charges company={company} portal={portal} />
      ) : path.endsWith("/consumo") ? (
        <Consumption company={company} portal={portal} />
      ) : (
        <Contract
          company={company}
          portal={portal}
          policies={path.endsWith("/politicas")}
          key={company.id + path}
        />
      )}
    </div>
  );
}

function Confirm({
  title,
  children,
  close,
  submit,
}: {
  title: string;
  children?: ReactNode;
  close: () => void;
  submit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await submit(reason);
      close();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} close={close}>
      <form onSubmit={(e) => void save(e)} className="form-grid">
        {children}
        <Field label="Justificativa administrativa *">
          <textarea
            value={reason}
            minLength={10}
            maxLength={500}
            required
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            required
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Confirmo o escopo, os valores e os efeitos desta ação no Sandbox.
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" onClick={close}>
            Voltar
          </button>
          <button disabled={busy || !confirmed}>
            {busy ? "Salvando…" : "Confirmar ação"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Overview({ company }: { company?: CompanyRecord }) {
  const [all, setAll] = useState(false);
  const [plan, setPlan] = useState("");
  const query = new URLSearchParams();
  if (!all && company) query.set("company_id", company.id);
  if (plan) query.set("plan_id", plan);
  const remote = useData<Dashboard>("/billing/dashboard?" + query);
  const catalogue = useData<Plan[]>("/billing/plans");
  const counts = ["PENDING", "ACTIVE", "GRACE", "PAST_DUE", "SUSPENDED"].map(
    (key) => ({
      name: status(key),
      contracts:
        remote.data?.subscriptions.filter((s) => s.status === key).length || 0,
    }),
  );
  return (
    <>
      <div className="filter-bar">
        <label className="check">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />
          Consolidar empresas autorizadas
        </label>
        <Field label="Filtrar por plano">
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">Todos os planos</option>
            {catalogue.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="secondary" onClick={remote.reload}>
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>
      <LoadState error={remote.error} loading={!remote.data && !remote.error} />
      <div className="kpi-grid">
        {[
          ["Assinaturas ativas", remote.data?.active_subscriptions ?? "—"],
          ["MRR contratado", currency(remote.data?.contracted_mrr || 0)],
          [
            "Recebimentos Sandbox",
            currency(remote.data?.sandbox_received || 0),
          ],
          ["Inadimplência", remote.data?.past_due ?? "—"],
        ].map(([label, value]) => (
          <section className="panel kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>
              {label === "MRR contratado"
                ? "Contratos pagos ativos; separado de recebimentos"
                : "Somente empresas autorizadas"}
            </small>
          </section>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <h3>Distribuição de contratos</h3>
          <div style={{ height: 230, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="contracts"
                  name="Contratos"
                  fill="#C5A46D"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <h3>Próximas renovações</h3>
          {remote.data?.subscriptions.length ? (
            remote.data.subscriptions.slice(0, 8).map((s) => (
              <div className="billing-list-item" key={s.id}>
                <div>
                  <strong>{s.snapshot.name}</strong>
                  <small>
                    {company?.id === s.company_id
                      ? company.name
                      : s.company_id.slice(0, 8)}{" "}
                    · {s.modality}
                  </small>
                </div>
                <Badge>{status(s.status)}</Badge>
              </div>
            ))
          ) : (
            <Empty title="Nenhum contrato cadastrado" />
          )}
          <p>
            O ciclo segue o calendário contratual. Não há pró-rata automático.
          </p>
        </section>
      </div>
    </>
  );
}

function PlanEditor({
  plan,
  close,
  done,
}: {
  plan?: Plan;
  close: () => void;
  done: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/billing/plans" + (plan ? "/" + plan.id : ""), {
        method: plan ? "PATCH" : "POST",
        body: {
          name: f.get("name"),
          description: f.get("description"),
          price: decimal(String(f.get("price"))),
          quota: Number(f.get("quota")),
          overage_price: f.get("overage")
            ? decimal(String(f.get("overage")))
            : null,
          user_limit: f.get("limit") ? Number(f.get("limit")) : null,
          features: String(f.get("features") || "")
            .split("\n")
            .filter(Boolean),
          accounting_clients: f.get("accounting") === "on",
          reason: f.get("reason"),
          confirmed: true,
        },
      });
      done();
      close();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={plan ? "Nova versão do plano" : "Criar plano em rascunho"}
      close={close}
    >
      <form className="form-grid" onSubmit={(e) => void save(e)}>
        <p>
          Preço de exemplo não é proposta aprovada. Salvar cria rascunho; a
          publicação exige confirmação separada. Contratos anteriores mantêm seu
          snapshot.
        </p>
        <Field label="Nome do plano *">
          <input
            name="name"
            required
            minLength={3}
            maxLength={120}
            defaultValue={plan?.name}
          />
        </Field>
        <Field label="Descrição">
          <textarea name="description" defaultValue={plan?.description} />
        </Field>
        <div className="form-grid two">
          <Field label="Mensalidade BRL *">
            <input
              name="price"
              inputMode="decimal"
              required
              defaultValue={plan?.current.price || "79,00"}
            />
          </Field>
          <Field label="Franquia mensal *">
            <input
              name="quota"
              type="number"
              min="0"
              max="1000000"
              required
              defaultValue={plan?.current.quota ?? 50}
            />
          </Field>
          <Field label="Excedente unitário BRL — opcional">
            <input
              name="overage"
              inputMode="decimal"
              defaultValue={plan?.current.overage_price}
            />
          </Field>
          <Field label="Limite de usuários — opcional">
            <input
              name="limit"
              type="number"
              min="1"
              defaultValue={plan?.current.user_limit}
            />
          </Field>
        </div>
        <Field label="Recursos — um por linha">
          <textarea
            name="features"
            defaultValue={plan?.current.features.join("\n")}
          />
        </Field>
        <label className="check">
          <input
            name="accounting"
            type="checkbox"
            defaultChecked={plan?.current.accounting_clients}
          />
          Oferecido a clientes contábeis
        </label>
        <Field label="Justificativa da versão *">
          <textarea name="reason" required minLength={10} maxLength={500} />
        </Field>
        <label className="check">
          <input type="checkbox" required />
          Confirmo a revisão dos valores; preço zero exige concessão
          administrativa.
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy}>
          {busy ? "Salvando…" : "Salvar rascunho do plano"}
        </button>
      </form>
    </Modal>
  );
}

function Plans({ changed }: { changed: () => void }) {
  const auth = useAuth();
  const can = auth.identity?.memberships.some((m) =>
    ["SUPERADMIN_ESCRITORIO", "GESTOR_ESCRITORIO"].includes(m.role),
  );
  const remote = useData<Plan[]>("/billing/plans");
  const [edit, setEdit] = useState<Plan | null | undefined>();
  const [action, setAction] = useState<{ p: Plan; verb: string }>();
  const [history, setHistory] = useState<Plan>();
  const [error, setError] = useState("");
  async function detail(p: Plan) {
    try {
      setHistory(await api<Plan>("/billing/plans/" + p.id));
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function template(name: string, price: string, quota: number) {
    try {
      await api("/billing/plans", {
        method: "POST",
        body: {
          name,
          description: "Modelo ilustrativo — exige aprovação comercial",
          price,
          quota,
          reason: "Criação explícita de modelo ilustrativo não publicado",
          confirmed: true,
        },
      });
      remote.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Catálogo e versões comerciais</h3>
          <p>Novas versões não reescrevem contratos ou períodos anteriores.</p>
        </div>
        <button disabled={!can} onClick={() => setEdit(null)}>
          <Plus size={15} />
          Novo plano
        </button>
      </div>
      <LoadState
        error={remote.error || error}
        loading={!remote.data && !remote.error}
      />
      {remote.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PLANO</th>
                <th>VERSÃO / VALOR</th>
                <th>FRANQUIA</th>
                <th>STATUS</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {remote.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.description}</small>
                  </td>
                  <td>
                    v{p.current.version} · {currency(p.current.price)}
                    <small>
                      Excedente:{" "}
                      {p.current.overage_price
                        ? currency(p.current.overage_price)
                        : "não definido"}
                    </small>
                  </td>
                  <td>{p.current.quota} / mês</td>
                  <td>
                    <Badge>{status(p.status)}</Badge>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => void detail(p)}
                      >
                        Versões
                      </button>
                      <button
                        className="secondary"
                        disabled={!can}
                        onClick={() => setEdit(p)}
                      >
                        Editar
                      </button>
                      <button
                        disabled={!can}
                        onClick={() =>
                          setAction({
                            p,
                            verb:
                              p.status === "PUBLISHED" ? "archive" : "publish",
                          })
                        }
                      >
                        {p.status === "PUBLISHED" ? "Arquivar" : "Publicar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        remote.data && <Empty title="Nenhum plano cadastrado" />
      )}
      <div className="billing-templates">
        <strong>Modelos ilustrativos — criados somente em rascunho</strong>
        <div className="actions">
          {[
            ["Essencial", "79.00", 50],
            ["Profissional", "149.00", 200],
            ["Empresarial", "299.00", 600],
          ].map(([name, price, quota]) => (
            <button
              key={name}
              className="secondary"
              disabled={!can}
              onClick={() =>
                void template(String(name), String(price), Number(quota))
              }
            >
              Criar {name} · {currency(price)}
            </button>
          ))}
        </div>
      </div>
      {edit !== undefined && (
        <PlanEditor
          plan={edit || undefined}
          close={() => setEdit(undefined)}
          done={() => {
            remote.reload();
            changed();
          }}
        />
      )}
      {action && (
        <Confirm
          title={
            action.verb === "publish"
              ? "Aprovar e publicar plano"
              : "Arquivar plano para novas contratações"
          }
          close={() => setAction(undefined)}
          submit={async (reason) => {
            await api(`/billing/plans/${action.p.id}/${action.verb}`, {
              method: "POST",
              body: { reason, ...reasonDefaults },
            });
            remote.reload();
          }}
        >
          <p>
            {action.p.name} · {currency(action.p.current.price)} · franquia{" "}
            {action.p.current.quota}. Contratos existentes serão preservados.
          </p>
        </Confirm>
      )}
      {history && (
        <Modal
          title={"Histórico — " + history.name}
          close={() => setHistory(undefined)}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>VERSÃO</th>
                  <th>MENSALIDADE</th>
                  <th>FRANQUIA</th>
                  <th>EXCEDENTE</th>
                  <th>MOTIVO / VIGÊNCIA</th>
                </tr>
              </thead>
              <tbody>
                {history.versions?.map((v) => (
                  <tr key={v.id}>
                    <td>v{v.version}</td>
                    <td>{currency(v.price)}</td>
                    <td>{v.quota}</td>
                    <td>
                      {v.overage_price
                        ? currency(v.overage_price)
                        : "Não definido"}
                    </td>
                    <td>
                      {v.reason}
                      <small>{displayDate(v.effective_at)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </section>
  );
}

function AccountForm({
  company,
  done,
}: {
  company: CompanyRecord;
  done: () => void;
}) {
  const remote = useData<Account | null>(
    `/billing/companies/${company.id}/account`,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/billing/companies/${company.id}/account`, {
        method: "PUT",
        body: {
          holder: f.get("holder"),
          email: f.get("email"),
          address: f.get("address"),
        },
      });
      remote.reload();
      done();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>Titular do faturamento</h3>
      <p>
        A cobrança pertence ao CNPJ e ao contrato, independentemente do usuário
        conectado.
      </p>
      <LoadState
        error={remote.error || error}
        loading={remote.data === undefined && !remote.error}
      />
      {remote.data !== undefined && (
        <form
          className="form-grid"
          onSubmit={(e) => void save(e)}
          key={remote.data?.holder || "new"}
        >
          <Field label="Titular da cobrança *">
            <input
              name="holder"
              minLength={3}
              maxLength={160}
              required
              defaultValue={remote.data?.holder || company.name}
              disabled={!!remote.data?.external_id}
            />
          </Field>
          <Field label="E-mail de cobrança *">
            <input
              name="email"
              type="email"
              required
              defaultValue={remote.data?.email}
              disabled={!!remote.data?.external_id}
            />
          </Field>
          <Field label="Endereço de cobrança *">
            <textarea
              name="address"
              minLength={5}
              maxLength={500}
              required
              defaultValue={remote.data?.address}
              disabled={!!remote.data?.external_id}
            />
          </Field>
          <button
            disabled={
              busy ||
              !!remote.data?.external_id ||
              !company.permissions.includes("billing:manage")
            }
          >
            Salvar titular de cobrança
          </button>
          {remote.data?.external_id && (
            <small>
              Titular provisionado: alterações exigem revisão contratual. Nenhum
              cartão é armazenado.
            </small>
          )}
        </form>
      )}
    </section>
  );
}

function ContractForm({
  company,
  close,
  done,
}: {
  company: CompanyRecord;
  close: () => void;
  done: () => void;
}) {
  const plans = useData<Plan[]>(`/billing/my/plans?company_id=${company.id}`);
  const [modality, setModality] = useState("PAID");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => crypto.randomUUID());
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/billing/companies/${company.id}/subscriptions`, {
        method: "POST",
        body: {
          plan_id: f.get("plan"),
          idempotency_key: key,
          modality,
          billing_type: f.get("type"),
          start_date: f.get("start"),
          review_date: f.get("review") || null,
          contract_price: f.get("discount")
            ? decimal(String(f.get("discount")))
            : null,
          grace_days: Number(f.get("grace")),
          activation_rule: f.get("rule"),
          reason: f.get("reason"),
          confirmed: true,
        },
      });
      done();
      close();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Contratar para o CNPJ selecionado" close={close}>
      <form className="form-grid" onSubmit={(e) => void save(e)}>
        <p>
          {company.name} · {company.cnpj}. Contratação paga inicia PENDENTE. Pix
          recorrente não é Pix Automático.
        </p>
        <LoadState error={plans.error} loading={!plans.data && !plans.error} />
        <Field label="Plano publicado *">
          <select name="plan" required>
            <option value="">Selecione um plano aprovado</option>
            {plans.data?.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} — {currency(p.current.price)} / mês · v
                {p.current.version}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid two">
          <Field label="Modalidade">
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
            >
              <option value="PAID">Paga — Sandbox</option>
              {company.permissions.includes("billing:override") && (
                <>
                  <option value="COURTESY">
                    Cortesia / inclusa na contabilidade
                  </option>
                  <option value="TRIAL">Teste com revisão</option>
                </>
              )}
            </select>
          </Field>
          <Field label="Forma hospedada">
            <select name="type">
              <option value="PIX">Pix periódico</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </Field>
          <Field label="Início / vencimento inicial *">
            <input name="start" type="date" required defaultValue={today()} />
          </Field>
          {modality !== "PAID" && (
            <Field label="Revisão da concessão *">
              <input name="review" type="date" required min={today()} />
            </Field>
          )}
          <Field label="Carência contratual — dias">
            <input
              name="grace"
              type="number"
              min="0"
              max="90"
              defaultValue="5"
              required
            />
          </Field>
          <Field label="Regra de ativação paga">
            <select name="rule">
              <option value="RECEIVED">Somente recebido</option>
              <option value="CONFIRMED">Confirmado — sujeito à revisão</option>
            </select>
          </Field>
          {company.permissions.includes("billing:override") && (
            <Field label="Preço negociado BRL — opcional">
              <input
                name="discount"
                inputMode="decimal"
                placeholder="Preservar preço publicado"
              />
            </Field>
          )}
        </div>
        <Field label="Justificativa / condições aprovadas *">
          <textarea name="reason" minLength={10} maxLength={500} required />
        </Field>
        <label className="check">
          <input type="checkbox" required />
          Confirmo titular, CNPJ, preço e condições. Não autoriza produção nem
          emissão fiscal.
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={busy || !plans.data?.length}>
          {busy ? "Salvando…" : "Criar contrato no servidor"}
        </button>
      </form>
    </Modal>
  );
}

function Contract({
  company,
  portal,
  policies,
}: {
  company: CompanyRecord;
  portal: boolean;
  policies: boolean;
}) {
  const remote = useData<SubscriptionInfo>(
    `/billing/my/subscription?company_id=${company.id}`,
  );
  const plans = useData<Plan[]>(`/billing/my/plans?company_id=${company.id}`);
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");
  const [until, setUntil] = useState("");
  const [grace, setGrace] = useState(5);
  const [rule, setRule] = useState("RECEIVED");
  const [notice, setNotice] = useState("");
  const sub = remote.data?.subscription;
  const manage = company.permissions.includes("billing:manage");
  const override = company.permissions.includes("billing:override");
  async function submit(reason: string) {
    if (action === "grant" || action === "revoke-grant") {
      await api(`/billing/companies/${company.id}/office-grant`, {
        method: action === "grant" ? "POST" : "DELETE",
        body: { reason, confirmed: true },
      });
    } else if (sub) {
      const suffix = action === "change" ? "change-plan" : action;
      await api(`/billing/subscriptions/${sub.id}/${suffix}`, {
        method: action === "policies" ? "PATCH" : "POST",
        body: {
          reason,
          confirmed: true,
          ...(action === "change" ? { plan_id: target } : {}),
          ...(action === "override" ? { until } : {}),
          ...(action === "policies"
            ? { grace_days: grace, activation_rule: rule }
            : {}),
        },
      });
    }
    setNotice("Alteração registrada e auditada no servidor.");
    remote.reload();
  }
  return (
    <>
      <LoadState error={remote.error} loading={!remote.data && !remote.error} />
      {notice && (
        <p role="status" className="billing-success">
          {notice}
        </p>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{company.name}</span>
            <h3>
              {policies ? "Políticas comerciais" : "Contrato e assinatura"}
            </h3>
          </div>
          {!portal && (
            <button
              disabled={
                !manage ||
                (!!sub && !["CANCELLED", "EXPIRED"].includes(sub.status))
              }
              onClick={() => setCreating(true)}
            >
              <Plus size={15} />
              Nova contratação
            </button>
          )}
        </div>
        {sub ? (
          <>
            <div className="billing-contract-summary">
              <div>
                <h2>{sub.snapshot.name}</h2>
                <p>
                  Versão {sub.snapshot.version} · {currency(sub.price)}/mês ·
                  franquia {sub.quota}
                </p>
                <Badge>{status(sub.status)}</Badge>{" "}
                <Badge>
                  {sub.modality === "PAID"
                    ? "Paga — Sandbox"
                    : sub.modality === "COURTESY"
                      ? "Concessão administrativa — sem pagamento"
                      : "Teste — sem pagamento"}
                </Badge>
              </div>
              <div>
                <small>Ciclo atual</small>
                <strong>
                  {remote.data?.period
                    ? `${displayDate(remote.data.period.start_at)} a ${displayDate(remote.data.period.end_at)}`
                    : "—"}
                </strong>
                <small>
                  Carência: {sub.grace_days} dias · ativação por{" "}
                  {status(sub.activation_rule)}
                </small>
              </div>
            </div>
            <div className="billing-callout">
              <FileClock size={18} />
              <span>
                {status(sub.provisioning)}
                {sub.last_error ? ` · ${sub.last_error}` : ""}
                {sub.external_id
                  ? ` · referência ${sub.external_id}`
                  : " · sem identificação externa confirmada"}
                . Emissão fiscal indisponível no M2.
              </span>
            </div>
            {sub.change_at && (
              <p>
                Mudança agendada para {displayDate(sub.change_at)}, sem
                pró-rata.
              </p>
            )}
            {sub.review_at && (
              <p>
                Revisão da concessão: {displayDate(sub.review_at)}. Não equivale
                a pagamento.
              </p>
            )}
            {sub.override_until && (
              <p>
                Override administrativo até {displayDate(sub.override_until)}.
              </p>
            )}
            <p>
              Acesso a histórico e mensalidades: <strong>preservado</strong>.
              Elegibilidade comercial futura:{" "}
              <strong>
                {remote.data?.eligibility
                  .commercial_eligible_for_future_features
                  ? "apta"
                  : "restrita / pendente"}
              </strong>
              .
            </p>
            {!portal && (
              <div className="actions">
                <button
                  className="secondary"
                  disabled={!manage}
                  onClick={() => setAction("change")}
                >
                  Mudar no próximo ciclo
                </button>
                <button
                  className="secondary"
                  disabled={!override}
                  onClick={() => {
                    setGrace(sub.grace_days);
                    setRule(sub.activation_rule);
                    setAction("policies");
                  }}
                >
                  Revisar carência e ativação
                </button>
                <button
                  className="secondary"
                  disabled={!override}
                  onClick={() => setAction("override")}
                >
                  Conceder override com prazo
                </button>
                <button
                  className="danger-button"
                  disabled={
                    !manage || ["CANCELLED", "EXPIRED"].includes(sub.status)
                  }
                  onClick={() => setAction("cancel")}
                >
                  Cancelar recorrência
                </button>
                <button
                  className="secondary"
                  disabled={
                    !manage || ["CANCELLED", "EXPIRED"].includes(sub.status)
                  }
                  onClick={() => setAction("pause")}
                >
                  Pausar novas cobranças
                </button>
                <button
                  className="secondary"
                  disabled={!manage || sub.status !== "SUSPENDED"}
                  onClick={() => setAction("resume")}
                >
                  Retomar recorrência — sem presumir pagamento
                </button>
              </div>
            )}
            <h3>Linha do tempo comercial</h3>
            <div className="billing-timeline">
              {remote.data?.timeline?.map((item) => (
                <div key={item.id}>
                  <span>{displayDate(item.at)}</span>
                  <strong>{item.kind.replaceAll("_", " ")}</strong>
                  <p>{item.reason}</p>
                  {item.kind === "PLAN_CHANGE_REQUESTED" && (
                    <small>
                      Plano solicitado: {String(item.after.plan_id || "")} ·
                      aprovação pendente
                    </small>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          remote.data && <Empty title="Nenhuma assinatura cadastrada" />
        )}
      </section>
      {!portal && (
        <AccountForm
          company={company}
          done={() => setNotice("Titular salvo no servidor.")}
        />
      )}{" "}
      {portal && company.permissions.includes("grant:manage") && (
        <section className="panel">
          <h3>Delegação financeira ao escritório</h3>
          <p>
            As permissões anteriores do M1 não incluem poderes financeiros
            automaticamente. Uma concessão explícita permite gestão comercial do
            seu CNPJ.
          </p>
          <button className="secondary" onClick={() => setAction("grant")}>
            Autorizar gestão financeira do escritório
          </button>
          <button
            className="secondary"
            onClick={() => setAction("revoke-grant")}
          >
            Revogar poderes financeiros do escritório
          </button>
        </section>
      )}
      {creating && (
        <ContractForm
          company={company}
          close={() => setCreating(false)}
          done={remote.reload}
        />
      )}{" "}
      {action && (
        <Confirm
          title={
            {
              change: "Agendar mudança de plano",
              override: "Concessão administrativa — não é pagamento",
              policies: "Revisar política contratual",
              pause: "Pausar geração de novas cobranças",
              resume: "Retomar recorrência sem presumir pagamento",
              cancel: "Confirmar cancelamento da recorrência",
              grant: "Conceder poderes financeiros de aplicação",
              "revoke-grant": "Revogar poderes financeiros de aplicação",
            }[action] || "Revisar ação"
          }
          close={() => setAction("")}
          submit={submit}
        >
          {action === "change" && (
            <Field label="Plano de destino *">
              <select
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Selecione</option>
                {plans.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {currency(p.current.price)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {action === "override" && (
            <Field label="Concessão válida até *">
              <input
                required
                type="date"
                min={today()}
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </Field>
          )}
          {action === "policies" && (
            <>
              <Field label="Dias de carência *">
                <input
                  required
                  type="number"
                  min="0"
                  max="90"
                  value={grace}
                  onChange={(e) => setGrace(Number(e.target.value))}
                />
              </Field>
              <Field label="Evidência para ativação">
                <select value={rule} onChange={(e) => setRule(e.target.value)}>
                  <option value="RECEIVED">Recebido</option>
                  <option value="CONFIRMED">
                    Confirmado — saldo não disponível
                  </option>
                </select>
              </Field>
            </>
          )}
          {action === "cancel" && (
            <p>
              Interrompe a recorrência no Sandbox. Cobranças existentes e
              histórico serão preservados. O estado só será confirmado após
              conciliação se houver identificação externa.
            </p>
          )}
        </Confirm>
      )}
    </>
  );
}

function AvailablePlans({ company }: { company: CompanyRecord }) {
  const remote = useData<Plan[]>(`/billing/my/plans?company_id=${company.id}`);
  const [choice, setChoice] = useState<Plan>();
  const [notice, setNotice] = useState("");
  return (
    <>
      <LoadState error={remote.error} loading={!remote.data && !remote.error} />
      {notice && (
        <p role="status" className="billing-success">
          {notice}
        </p>
      )}
      <div className="billing-plan-grid">
        {remote.data?.map((p) => (
          <section className="panel" key={p.id}>
            <span className="eyebrow">
              PLANO PUBLICADO · V{p.current.version}
            </span>
            <h3>{p.name}</h3>
            <strong className="billing-price">
              {currency(p.current.price)}
              <small>/ mês</small>
            </strong>
            <p>{p.description}</p>
            <ul>
              <li>{p.current.quota} emissões futuras / ciclo</li>
              <li>
                Excedente:{" "}
                {p.current.overage_price
                  ? currency(p.current.overage_price) + " / unidade"
                  : "a definir em contrato"}
              </li>
              {p.current.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p>
              Sem pró-rata automático. Emissão fiscal depende do M3 e das
              autorizações próprias.
            </p>
            <button onClick={() => setChoice(p)}>Solicitar mudança</button>
          </section>
        ))}
      </div>
      {remote.data?.length === 0 && (
        <Empty title="Nenhum plano publicado para sua empresa" />
      )}
      {choice && (
        <Confirm
          title={"Solicitar plano " + choice.name}
          close={() => setChoice(undefined)}
          submit={async (reason) => {
            await api(`/billing/my/change-request?company_id=${company.id}`, {
              method: "POST",
              body: { reason, confirmed: true, plan_id: choice.id },
            });
            setNotice(
              "Solicitação registrada. A alteração depende de aprovação do gestor e não cria cobrança agora.",
            );
          }}
        >
          <p>
            Contrato existente necessário. Para primeira contratação, solicite
            atendimento ao escritório.
          </p>
        </Confirm>
      )}
    </>
  );
}

function Charges({
  company,
  portal,
}: {
  company: CompanyRecord;
  portal: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Charge>();
  const remote = useData<Charge[]>(
    `/billing/${portal ? "my/" : ""}charges?company_id=${company.id}&limit=20&offset=${offset}` +
      (filter ? `&status=${filter}` : ""),
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>{portal ? "Minhas mensalidades" : "Cobranças observadas"}</h3>
          <p>
            Somente cobranças retornadas pelo Asaas. Pendente ou vencida não
            libera plano pago.
          </p>
        </div>
        <Field label="Situação da cobrança">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">Todas</option>
            {[
              "PENDING",
              "CONFIRMED",
              "RECEIVED",
              "OVERDUE",
              "REFUNDED",
              "CHARGEBACK_REQUESTED",
            ].map((s) => (
              <option key={s} value={s}>
                {status(s)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <LoadState error={remote.error} loading={!remote.data && !remote.error} />
      {remote.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>REFERÊNCIA SANDBOX</th>
                <th>VENCIMENTO</th>
                <th>VALOR</th>
                <th>SITUAÇÃO</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {remote.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.external_id}
                    <small>{c.billing_type}</small>
                  </td>
                  <td>{displayDate(c.due_date)}</td>
                  <td>{currency(c.value)}</td>
                  <td>
                    <Badge>{status(c.status)}</Badge>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => setSelected(c)}
                      >
                        Detalhes
                      </button>
                      {c.payment_url && (
                        <a
                          className="button secondary"
                          href={c.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Segunda via Sandbox <ArrowUpRight size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        remote.data && <Empty title="Nenhuma cobrança observada neste filtro" />
      )}
      <div className="pagination">
        <button
          className="secondary"
          disabled={!offset}
          onClick={() => setOffset((n) => Math.max(0, n - 20))}
        >
          Anterior
        </button>
        <span>Página {offset / 20 + 1}</span>
        <button
          className="secondary"
          disabled={(remote.data?.length || 0) < 20}
          onClick={() => setOffset((n) => n + 20)}
        >
          Próxima
        </button>
      </div>
      {selected && (
        <Modal
          title="Evidência da cobrança Sandbox"
          close={() => setSelected(undefined)}
        >
          <dl className="billing-details">
            <dt>Referência externa</dt>
            <dd>{selected.external_id}</dd>
            <dt>Valor observado</dt>
            <dd>{currency(selected.value)}</dd>
            <dt>Vencimento</dt>
            <dd>{displayDate(selected.due_date)}</dd>
            <dt>Situação verificada</dt>
            <dd>{status(selected.status)}</dd>
            <dt>Última consulta</dt>
            <dd>{displayDate(selected.verified_at)}</dd>
          </dl>
          <p>
            Confirmado difere de recebido. Este saldo é comercial no Sandbox,
            não é o saldo bancário nem dinheiro em produção.
          </p>
        </Modal>
      )}
    </section>
  );
}

function Consumption({
  company,
  portal,
}: {
  company: CompanyRecord;
  portal: boolean;
}) {
  const [period, setPeriod] = useState("");
  const remote = useData<Usage>(
    `/billing/${portal ? "my/" : ""}usage?company_id=${company.id}` +
      (period ? `&period_id=${period}` : ""),
  );
  const sub = useData<SubscriptionInfo>(
    `/billing/my/subscription?company_id=${company.id}`,
  );
  const [sim, setSim] = useState(false);
  const [units, setUnits] = useState(1);
  const [reverse, setReverse] = useState<string>();
  const summary = remote.data?.summary;
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Franquia e consumo por ciclo</h3>
          <p>
            SIMULAÇÃO — NÃO FATURÁVEL. Rascunhos, rejeições e cliques não geram
            consumo comercial.
          </p>
        </div>
        <Field label="Período de consumo">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">Ciclo atual</option>
            {remote.data?.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {displayDate(p.start_at)} a {displayDate(p.end_at)}
                {p.closed ? " · fechado" : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <LoadState error={remote.error} loading={!remote.data && !remote.error} />
      {summary ? (
        <>
          <div className="kpi-grid">
            {[
              ["Franquia", summary.quota],
              ["Unidades simuladas", summary.simulated_units],
              ["Excedente simulado", summary.excess_units],
              ["Excedente pagável", currency(summary.payable_amount)],
            ].map(([label, value]) => (
              <div className="panel kpi" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <label className="billing-progress">
            Uso ilustrativo da franquia
            <progress
              max={Math.max(1, summary.quota)}
              value={summary.simulated_units}
            />
          </label>
          <p>
            Prévia:{" "}
            {summary.preview_amount === null
              ? "preço unitário ainda não definido"
              : currency(summary.preview_amount)}{" "}
            · Unidades faturáveis: <strong>0</strong>. Eventos M3 são recusados
            por este marco.
          </p>
          <div className="billing-timeline">
            {remote.data?.events.map((e) => (
              <div key={e.id}>
                <strong>
                  {e.classification} · {e.units} unidade(s)
                </strong>
                <small>
                  {e.source_event_id} · {displayDate(e.at)}
                </small>
                {!portal &&
                  e.classification === "SIMULATED" &&
                  company.permissions.includes("billing:override") && (
                    <button
                      className="secondary"
                      onClick={() => setReverse(e.id)}
                    >
                      Compensar evento
                    </button>
                  )}
              </div>
            ))}
          </div>
        </>
      ) : (
        remote.data && (
          <Empty title="Cadastre uma assinatura para acompanhar os ciclos" />
        )
      )}
      {!portal && (
        <button
          className="secondary"
          disabled={
            !company.permissions.includes("billing:override") ||
            !sub.data?.subscription
          }
          onClick={() => setSim(true)}
        >
          Registrar consumo simulado de desenvolvimento
        </button>
      )}
      {sim && (
        <Confirm
          title="Evento sintético — não faturável"
          close={() => setSim(false)}
          submit={async (reason) => {
            await api(
              `/billing/subscriptions/${sub.data?.subscription?.id}/simulate-usage`,
              {
                method: "POST",
                body: {
                  reason,
                  confirmed: true,
                  units,
                  source_event_id: crypto.randomUUID(),
                },
              },
            );
            remote.reload();
          }}
        >
          <Field label="Unidades simuladas *">
            <input
              type="number"
              required
              min="1"
              max="1000000"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
            />
          </Field>
        </Confirm>
      )}
      {reverse && (
        <Confirm
          title="Compensar sem apagar histórico"
          close={() => setReverse(undefined)}
          submit={async (reason) => {
            await api(`/billing/usage/${reverse}/reverse`, {
              method: "POST",
              body: { reason, confirmed: true },
            });
            remote.reload();
          }}
        >
          <p>
            Cria evento inverso, preservando o original. Não altera faturamento
            real.
          </p>
        </Confirm>
      )}
    </section>
  );
}

function Integration({ company }: { company?: CompanyRecord }) {
  const provider = useData<Provider>("/billing/provider");
  const suffix = company ? `?company_id=${company.id}` : "";
  const events = useData<QueueItem[]>("/billing/webhook-events" + suffix);
  const runs = useData<QueueItem[]>("/billing/reconciliation-runs" + suffix);
  const [action, setAction] = useState<string>();
  const [notice, setNotice] = useState("");
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h3>Asaas Sandbox</h3>
            <p>
              Credenciais ficam exclusivamente no backend. Pix Automático e
              dados de cartão fora do escopo.
            </p>
          </div>
          <Badge>
            {provider.data?.outbound_enabled
              ? "Sandbox habilitado"
              : "Envio externo desativado"}
          </Badge>
        </div>
        <LoadState
          error={provider.error}
          loading={!provider.data && !provider.error}
        />
        <div className="billing-list-item">
          <span>Configuração presente</span>
          <strong>
            {provider.data?.configured
              ? "Sim — exige teste remoto"
              : "Não configurada"}
          </strong>
        </div>
        <div className="billing-list-item">
          <span>Produção / emissão fiscal</span>
          <strong>Proibidas / desativadas</strong>
        </div>
        <p>
          Fila durável PostgreSQL. Consumidor dedicado com retries limitados;
          eventos desconhecidos não liberam recursos. Consulte o guia M2 para
          credenciais e webhook HTTPS.
        </p>
        <div className="actions">
          <button
            disabled={!company?.permissions.includes("billing:manage")}
            onClick={() => setAction("reconcile")}
          >
            Solicitar conciliação do CNPJ
          </button>
          <button
            className="secondary"
            onClick={() => {
              provider.reload();
              events.reload();
              runs.reload();
            }}
          >
            Atualizar estado
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="panel">
        <h3>Conciliações solicitadas</h3>
        <LoadState error={runs.error} loading={!runs.data && !runs.error} />
        {runs.data?.length
          ? runs.data.map((r) => (
              <div key={r.id} className="billing-list-item">
                <span>
                  {displayDate(r.created_at || "")}
                  <small>
                    {r.result?.error ||
                      `${r.result?.contracts_checked ?? 0} contratos verificados`}
                  </small>
                </span>
                <Badge>
                  {status(r.status)} · tentativa {r.attempts}
                </Badge>
              </div>
            ))
          : runs.data && <Empty title="Nenhuma conciliação solicitada" />}
      </section>
      <section className="panel">
        <h3>Webhooks do escopo autorizado</h3>
        <LoadState
          error={events.error}
          loading={!events.data && !events.error}
        />
        {events.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EVENTO</th>
                  <th>SITUAÇÃO</th>
                  <th>TENTATIVAS</th>
                  <th>REVISÃO</th>
                </tr>
              </thead>
              <tbody>
                {events.data.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.event_type}
                      <small>{e.event_id}</small>
                    </td>
                    <td>
                      {status(e.status)}
                      <small>{e.safe_error}</small>
                    </td>
                    <td>{e.attempts}</td>
                    <td>
                      <button
                        className="secondary"
                        disabled={e.status === "DONE"}
                        onClick={() => setAction(e.id)}
                      >
                        Reprocessar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          events.data && (
            <Empty title="Nenhum webhook associado ao seu escopo" />
          )
        )}
        <p>
          Eventos sem associação verificada ficam em quarentena operacional e
          não revelam outros clientes.
        </p>
      </section>
      {action && (
        <Confirm
          title={
            action === "reconcile"
              ? "Solicitar conciliação auditada"
              : "Reprocessar evento com segurança"
          }
          close={() => setAction(undefined)}
          submit={async (reason) => {
            await api(
              action === "reconcile"
                ? "/billing/reconciliation-runs"
                : `/billing/webhook-events/${action}/retry`,
              {
                method: "POST",
                body: {
                  reason,
                  confirmed: true,
                  ...(action === "reconcile"
                    ? { company_id: company?.id }
                    : {}),
                },
              },
            );
            setNotice(
              "Solicitação persistida. O resultado depende do consumidor e da configuração Sandbox; não há pagamento presumido.",
            );
            events.reload();
            runs.reload();
          }}
        />
      )}
    </>
  );
}
