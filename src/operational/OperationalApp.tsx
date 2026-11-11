"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  FileText,
  Users,
  LayoutDashboard,
  Settings,
  Layers,
  ShieldCheck,
  Menu,
  Moon,
  Sun,
  LogOut,
  Plus,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import {
  api,
  ApiError,
  type CompanyRecord,
  type CustomerRecord,
  type DraftRecord,
  type OrganizationRecord,
  type ServiceRecord,
  type UserRecord,
} from "./api";
import { Authentication } from "./Authentication";
import { Field, Modal, Empty, Badge } from "../components/shared/ui";
import { currency, displayDate } from "../lib/formatters";

function useRemote<T>(key: string, loader: () => Promise<T>) {
  const ref = useRef(loader);
  useEffect(() => {
    ref.current = loader;
  }, [loader]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    let active = true;
    setResult({ key });
    ref
      .current()
      .then((data) => {
        if (active) setResult({ key, data });
      })
      .catch((e) => {
        if (active)
          setResult({
            key,
            error: e instanceof Error ? e.message : "Backend indisponível.",
          });
      });
    return () => {
      active = false;
    };
  }, [key, revision]);
  return {
    data: result.key === key ? result.data : undefined,
    error: result.key === key ? result.error : undefined,
    reload: () => setRevision((n) => n + 1),
  };
}
const officeRoles = [
  "SUPERADMIN_ESCRITORIO",
  "GESTOR_ESCRITORIO",
  "ANALISTA_FISCAL",
  "SUPORTE",
];
const managerRoles = [
  "SUPERADMIN_ESCRITORIO",
  "GESTOR_ESCRITORIO",
  "ADMIN_CLIENTE",
];
const navAdmin = [
  ["/admin", "Visão geral", LayoutDashboard],
  ["/admin/clientes", "Organizações / clientes", Users],
  ["/admin/empresas", "Empresas / CNPJs", Building2],
  ["/admin/usuarios", "Usuários e convites", Users],
  ["/admin/notas", "Documentos", FileText],
  ["/admin/atividades", "Auditoria", ShieldCheck],
  ["/admin/integracoes", "Provedores", Layers],
  ["/admin/configuracoes", "Configurações", Settings],
] as const;
const navPortal = [
  ["/portal", "Meu início", LayoutDashboard],
  ["/portal/emitir", "Preparar NFS-e", Plus],
  ["/portal/notas", "Minhas notas", FileText],
  ["/portal/rascunhos", "Rascunhos no servidor", FileText],
  ["/portal/tomadores", "Tomadores", Users],
  ["/portal/servicos", "Serviços favoritos", Layers],
  ["/portal/perfil", "Meu perfil", Settings],
] as const;
export default function OperationalApp() {
  const auth = useAuth();
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState("");
  const recovery = auth.identity?.recovery_codes || [];
  const clearRecovery = () => {
    if (auth.identity)
      auth.setIdentity({ ...auth.identity, recovery_codes: undefined });
  };
  if (!auth.ready)
    return (
      <div className="boot">
        <strong>IA COMPLIANCE</strong>
        <p>Verificando sessão no servidor...</p>
      </div>
    );
  if (!auth.identity || auth.identity.phase !== "AUTHENTICATED")
    return <Authentication />;
  const identity = auth.identity;
  const isOffice = identity.memberships.some((m) =>
    officeRoles.includes(m.role),
  );
  const portal = path.startsWith("/portal");
  const company = identity.companies.find((c) => c.id === auth.companyId);
  const nav = portal ? navPortal : navAdmin;
  const title =
    nav.find(([href]) => href === path)?.[1] ||
    (path.startsWith("/portal/emitir")
      ? "Preparar NFS-e — rascunho"
      : "Operação M1");
  async function run(action: () => Promise<void>) {
    setNotice("");
    try {
      await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Falha na operação.");
      if (e instanceof ApiError && e.status === 401) await auth.refresh();
    }
  }
  if (path === "/" || path === "/login") {
    return (
      <div className="app v2 operational-login">
        <section className="entry-option">
          <h1>Bem-vindo, {identity.user.name}</h1>
          <p>Sessão autenticada com permissões verificadas no servidor.</p>
          <div className="actions">
            {isOffice && (
              <Link className="button" href="/admin">
                Abrir painel do escritório
              </Link>
            )}
            <Link className="button gold-button" href="/portal">
              Abrir portal
            </Link>
          </div>
          {recovery.length > 0 && (
            <Recovery codes={recovery} close={clearRecovery} />
          )}
        </section>
      </div>
    );
  }
  if (path === "/convite") {
    return <ExistingInvitation />;
  }
  let content: ReactNode;
  if (!portal && !isOffice) {
    content = (
      <section className="panel">
        <h2>Área do escritório não disponível para seu vínculo.</h2>
        <Link href="/portal">Voltar ao portal da sua empresa</Link>
      </section>
    );
  } else if (path === "/admin/clientes") {
    content = <Organizations run={run} />;
  } else if (path === "/admin/empresas") {
    content = <Companies run={run} />;
  } else if (path === "/admin/usuarios") {
    content = <Members run={run} />;
  } else if (path === "/admin/atividades") {
    content = <Audit />;
  } else if (path === "/admin/integracoes") {
    content = <ProviderStatus company={company} />;
  } else if (path === "/portal/tomadores" || path === "/portal/servicos") {
    content = company ? (
      <Catalog
        company={company}
        services={path.endsWith("servicos")}
        run={run}
        key={company.id + path}
      />
    ) : (
      <NoCompany />
    );
  } else if (path.startsWith("/portal/emitir")) {
    content = company ? (
      <DraftWizard
        company={company}
        draftId={search.get("draft") || ""}
        run={run}
        key={company.id + (search.get("draft") || "new")}
      />
    ) : (
      <NoCompany />
    );
  } else if (path === "/portal/rascunhos") {
    content = company ? (
      <Drafts company={company} run={run} key={company.id} />
    ) : (
      <NoCompany />
    );
  } else if (path === "/portal/notas" || path === "/admin/notas") {
    content = company ? (
      <Invoices company={company} key={company.id} />
    ) : (
      <NoCompany />
    );
  } else if (path === "/portal/perfil" || path === "/admin/configuracoes") {
    content = (
      <section className="panel">
        <h2>Sua identidade e vínculos</h2>
        <p>
          {identity.user.name} · {identity.user.email}
        </p>
        {identity.memberships.map((m) => (
          <div className="rank" key={m.id}>
            <span>{m.role}</span>
            <small>
              {m.company_id ? "CNPJ específico" : "Escopo de organização"}
            </small>
          </div>
        ))}
        <p className="notice">
          MFA obrigatório para gestores. Sessões expiram por tempo absoluto e
          inatividade. Acesso fiscal, certificado e cobrança permanecem
          bloqueados no M1.
        </p>
        {identity.memberships.some((m) => managerRoles.includes(m.role)) && (
          <Members run={run} />
        )}
      </section>
    );
  } else if (path === "/admin" || path === "/portal") {
    content = <Dashboard company={company} portal={portal} />;
  } else {
    content = (
      <section className="panel">
        <h2>Recurso previsto para os próximos marcos</h2>
        <p>
          Esta tela da Fase 1 foi preservada no modo demonstração. No modo
          operacional, suporte/documentos completos ficam no M4, cobrança no M2
          e integrações fiscais no M3. Nenhum sucesso demonstrativo será
          apresentado como operação real.
        </p>
        <Link className="button secondary" href={portal ? "/portal" : "/admin"}>
          Voltar ao início
        </Link>
      </section>
    );
  }
  return (
    <div
      className={`app v2 operational-app ${portal ? "portal-app" : "admin-app"} ${dark ? "dark" : ""}`}
    >
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link className="brand" href={portal ? "/portal" : "/admin"}>
          <div>
            <strong>IA COMPLIANCE</strong>
            <small>
              {portal ? "PORTAL DO CLIENTE" : "GESTÃO DO ESCRITÓRIO"} · M1
            </small>
          </div>
        </Link>
        <nav aria-label="Navegação operacional">
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
              onClick={() => setMobile(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>Usuário autenticado</p>
          <small>{identity.user.name}</small>
          <p>Nossa missão é o seu sucesso.</p>
        </div>
      </aside>
      {mobile && (
        <button
          className="drawer-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon secondary mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setMobile(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            Modo operacional <span>›</span>
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <select
              aria-label="Empresa autorizada"
              value={auth.companyId}
              onChange={(e) => auth.selectCompany(e.target.value)}
            >
              {!identity.companies.length && (
                <option value="">Sem vínculos de empresa</option>
              )}
              {identity.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active ? "" : " — inativa"}
                </option>
              ))}
            </select>
            <button
              className="icon"
              aria-label="Alternar tema"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="secondary"
              onClick={() =>
                void run(async () => {
                  await auth.logout();
                  router.replace("/");
                })
              }
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </header>
        <div className="operational-banner">
          FASE 2 · M1 — AUTENTICAÇÃO E DADOS NO SERVIDOR · EMISSÃO FISCAL E
          COBRANÇA INDISPONÍVEIS
        </div>
        <div className="context-line">
          <span>
            {identity.environment} · {identity.user.name} ·{" "}
            {company?.name || "Sem empresa selecionada"}
          </span>
          <div className="actions">
            {isOffice && (
              <Link href={portal ? "/admin" : "/portal"}>
                {portal ? "Voltar ao escritório" : "Operar empresa no portal"}
              </Link>
            )}
          </div>
        </div>
        <main className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                FUNDAÇÃO OPERACIONAL · DADOS PERSISTIDOS
              </span>
              <h1>{title}</h1>
              <p>
                {portal
                  ? "Acesso limitado aos vínculos verificados no servidor."
                  : "Carteira limitada às autorizações de aplicação concedidas ao escritório."}
              </p>
            </div>
          </div>
          {auth.error && (
            <p className="error" role="alert">
              {auth.error}
            </p>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
          {content}
          <footer>
            IA Compliance · Nenhuma operação fiscal ou financeira habilitada no
            M1.
          </footer>
        </main>
      </div>
      {recovery.length > 0 && (
        <Recovery codes={recovery} close={clearRecovery} />
      )}
    </div>
  );
}
function Recovery({ codes, close }: { codes: string[]; close: () => void }) {
  return (
    <Modal title="Guarde seus códigos de recuperação MFA" close={close}>
      <p>
        Exibidos uma vez. Guarde fora do navegador, em local seguro. Cada código
        só pode ser usado uma vez.
      </p>
      <pre className="recovery-codes">{codes.join("\n")}</pre>
      <button onClick={close}>Guardei meus códigos</button>
    </Modal>
  );
}
function NoCompany() {
  return (
    <section className="panel">
      <Empty title="Nenhuma empresa autorizada">
        <p>
          Peça um convite ou vínculo ao administrador. Não há dados fictícios
          substituindo a resposta do servidor.
        </p>
      </Empty>
    </section>
  );
}
type Run = (action: () => Promise<void>) => Promise<void>;
function RemoteError({ error }: { error?: string }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}
function ExistingInvitation() {
  const auth = useAuth();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    if (value) {
      setToken(value);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return (
    <div className="app v2 operational-login">
      <section className="panel">
        <h1>Aceitar vínculo na conta existente</h1>
        <p>O convite precisa corresponder ao e-mail da sessão atual.</p>
        <Field label="Token do convite confidencial">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <button
          disabled={!token}
          onClick={async () => {
            try {
              await api("/invitations/accept-existing", {
                method: "POST",
                body: { token },
              });
              setToken("");
              await auth.refresh();
              window.location.assign("/");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Aceitar vínculo autenticado
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}
function Dashboard({
  company,
  portal,
}: {
  company?: CompanyRecord;
  portal: boolean;
}) {
  const [consolidated, setConsolidated] = useState(false);
  const remote = useRemote(
    "metrics-" + (consolidated ? "all" : company?.id || "all"),
    () =>
      portal && company
        ? Promise.all([
            api<DraftRecord[]>(
              `/client/companies/${company.id}/invoices/drafts`,
            ),
            api<unknown[]>(`/client/companies/${company.id}/invoices`),
          ]).then(([drafts, invoices]) => ({
            companies: 1,
            drafts: drafts.length,
            authorized_invoices: invoices.length,
          }))
        : api<{
            companies: number;
            drafts: number;
            authorized_invoices: number;
          }>(
            "/admin/metrics" +
              (!consolidated && company
                ? `?company_id=${encodeURIComponent(company.id)}`
                : ""),
          ),
  );
  return (
    <>
      <RemoteError error={remote.error} />
      {!portal && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={consolidated}
            onChange={(e) => setConsolidated(e.target.checked)}
          />
          Consolidar todas as empresas autorizadas
        </label>
      )}
      <div className="kpi-grid">
        {[
          ["Empresas acessíveis", remote.data?.companies],
          ["Rascunhos no servidor", remote.data?.drafts],
          ["Notas autorizadas registradas", remote.data?.authorized_invoices],
          ["Integração fiscal", "Não configurada"],
        ].map(([label, value]) => (
          <div className="panel kpi" key={label}>
            <div>{label}</div>
            <strong>{value ?? "—"}</strong>
            <small>Resposta do backend — sem fixtures</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>
          {company?.name ||
            "Seu escritório está pronto para organizar os vínculos"}
        </h2>
        <p>
          Organizações, empresas, usuários, convites, tomadores, serviços e
          rascunhos já persistem no servidor. Nenhuma nota é autorizada pelo M1.
        </p>
        <div className="actions">
          <Link
            className="button gold-button"
            href={portal ? "/portal/emitir/completa" : "/admin/empresas"}
          >
            {portal ? "Preparar rascunho" : "Gerenciar empresas"}{" "}
            <ArrowRight size={15} />
          </Link>
          <Link
            className="button secondary"
            href={portal ? "/portal/perfil" : "/admin/usuarios"}
          >
            Revisar acessos
          </Link>
        </div>
      </section>
    </>
  );
}
function Organizations({ run }: { run: Run }) {
  const remote = useRemote("organizations", () =>
    api<OrganizationRecord[]>("/organizations"),
  );
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const canCreate = auth.identity?.memberships.some(
    (m) => m.role === "SUPERADMIN_ESCRITORIO",
  );
  return (
    <>
      <div className="actions">
        <button disabled={!canCreate} onClick={() => setOpen(true)}>
          Nova organização cliente
        </button>
      </div>
      <RemoteError error={remote.error} />
      <section className="panel">
        {remote.data?.map((o) => (
          <div className="rank" key={o.id}>
            <div>
              <strong>{o.name}</strong>
              <small>
                {o.kind === "OFFICE" ? "Escritório" : "Organização cliente"}
              </small>
            </div>
            <Badge>{o.active ? "Ativa" : "Inativa"}</Badge>
          </div>
        ))}
      </section>
      {open && (
        <Modal
          title="Cadastrar organização cliente"
          close={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              void run(async () => {
                await api("/admin/organizations", {
                  method: "POST",
                  body: { name },
                });
                setOpen(false);
                remote.reload();
              });
            }}
          >
            <Field label="Nome da organização">
              <input name="name" required minLength={3} maxLength={160} />
            </Field>
            <button>Salvar organização no servidor</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Companies({ run }: { run: Run }) {
  const auth = useAuth();
  const remote = useRemote("company-orgs", () =>
    api<OrganizationRecord[]>("/organizations"),
  );
  const [open, setOpen] = useState(false);
  const manager = auth.identity?.memberships.some((m) =>
    managerRoles.includes(m.role),
  );
  return (
    <>
      <button disabled={!manager} onClick={() => setOpen(true)}>
        Cadastrar empresa
      </button>
      <RemoteError error={remote.error} />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EMPRESA / CNPJ</th>
                <th>REGIME / MUNICÍPIO</th>
                <th>VÍNCULO FISCAL</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {auth.identity?.companies.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name}
                    <small>{c.cnpj}</small>
                  </td>
                  <td>
                    {c.tax_regime}
                    <small>{c.municipality}</small>
                  </td>
                  <td>
                    <Badge>Não configurado</Badge>
                  </td>
                  <td>
                    <div className="actions">
                      <Link
                        href="/portal"
                        className="button secondary"
                        onClick={() => auth.selectCompany(c.id)}
                      >
                        Abrir portal
                      </Link>
                      <button
                        className="secondary"
                        disabled={!c.permissions.includes("company:write")}
                        onClick={() =>
                          void run(async () => {
                            await api("/admin/companies/" + c.id, {
                              method: "PATCH",
                              body: { active: !c.active },
                            });
                            await auth.refresh();
                          })
                        }
                      >
                        {c.active ? "Inativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <Modal title="Cadastrar CNPJ no servidor" close={() => setOpen(false)}>
          <p className="notice">
            Cadastro de aplicação não comprova credenciamento fiscal. Em
            desenvolvimento, use identificador DEMO- sem dados fiscais reais.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body = Object.fromEntries(f.entries());
              void run(async () => {
                await api("/admin/companies", { method: "POST", body });
                await auth.refresh();
                setOpen(false);
              });
            }}
          >
            <Field label="Organização cliente">
              <select name="organization_id" required>
                {remote.data
                  ?.filter((o) => o.kind === "CLIENT")
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Nome da empresa">
              <input name="name" required minLength={3} />
            </Field>
            <Field label="CNPJ / identificador de desenvolvimento">
              <input name="cnpj" required maxLength={32} />
            </Field>
            <Field label="Município">
              <input name="municipality" required defaultValue="Itumbiara/GO" />
            </Field>
            <Field label="Regime cadastral (sem validação normativa)">
              <input name="tax_regime" required defaultValue="A parametrizar" />
            </Field>
            <button>Salvar empresa</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Members({ run }: { run: Run }) {
  const auth = useAuth();
  const remote = useRemote("members", () =>
    Promise.all([
      api<UserRecord[]>("/admin/users"),
      api<OrganizationRecord[]>("/organizations"),
    ]),
  );
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [role, setRole] = useState("CONSULTA_CLIENTE");
  const [link, setLink] = useState("");
  const organization = remote.data?.[1].find((o) => o.id === orgId);
  const canManage = auth.identity?.memberships.some((m) =>
    managerRoles.includes(m.role),
  );
  return (
    <>
      <div className="actions">
        <button
          disabled={!canManage}
          onClick={() => {
            setOpen(true);
            const first = remote.data?.[1][0];
            setOrgId(first?.id || "");
            setRole(
              first?.kind === "OFFICE" ? "ANALISTA_FISCAL" : "CONSULTA_CLIENTE",
            );
          }}
        >
          Criar convite com validade
        </button>
      </div>
      <RemoteError error={remote.error} />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>USUÁRIO / E-MAIL</th>
                <th>PAPEL E ESCOPO</th>
                <th>MFA</th>
                <th>VÍNCULO</th>
              </tr>
            </thead>
            <tbody>
              {remote.data?.[0].map((u) => (
                <tr key={u.membership_id}>
                  <td>
                    {u.name}
                    <small>{u.email}</small>
                  </td>
                  <td>
                    {u.role}
                    <small>
                      {u.company_id ? "Empresa específica" : "Organização"}
                    </small>
                  </td>
                  <td>{u.mfa_enrolled ? "Configurado" : "Não configurado"}</td>
                  <td>
                    <button
                      className="secondary"
                      disabled={!canManage}
                      onClick={() =>
                        void run(async () => {
                          await api("/admin/memberships/" + u.membership_id, {
                            method: "PATCH",
                            body: { active: !u.active },
                          });
                          remote.reload();
                        })
                      }
                    >
                      {u.active ? "Revogar vínculo" : "Reativar vínculo"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <Modal
          title="Convidar usuário — vínculo real"
          close={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const company_id = String(f.get("company_id") || "") || null;
              void run(async () => {
                const result = await api<{ token: string }>(
                  "/admin/invitations",
                  {
                    method: "POST",
                    body: {
                      organization_id: orgId,
                      company_id,
                      name: String(f.get("name")),
                      email: String(f.get("email")),
                      role,
                    },
                  },
                );
                setLink(
                  window.location.origin + "/convite#token=" + result.token,
                );
                setOpen(false);
              });
            }}
          >
            <Field label="Organização do vínculo">
              <select
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value);
                  setRole(
                    remote.data?.[1].find((o) => o.id === e.target.value)
                      ?.kind === "OFFICE"
                      ? "ANALISTA_FISCAL"
                      : "CONSULTA_CLIENTE",
                  );
                }}
              >
                {remote.data?.[1].map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome do convidado">
              <input name="name" required minLength={3} />
            </Field>
            <Field label="E-mail do convidado">
              <input type="email" name="email" required />
            </Field>
            <Field label="Papel solicitado">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {(organization?.kind === "OFFICE"
                  ? officeRoles
                  : ["ADMIN_CLIENTE", "EMISSOR_CLIENTE", "CONSULTA_CLIENTE"]
                ).map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            {organization?.kind !== "OFFICE" && (
              <Field label="Empresa autorizada">
                <select name="company_id" required={role !== "ADMIN_CLIENTE"}>
                  {role === "ADMIN_CLIENTE" && (
                    <option value="">Todas da própria organização</option>
                  )}
                  {auth.identity?.companies
                    .filter((c) => c.organization_id === orgId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <p className="notice">
              O servidor verifica escopo, papel, expiração e uso único. Nenhum
              e-mail será enviado automaticamente no M1.
            </p>
            <button>Criar convite</button>
          </form>
        </Modal>
      )}
      {link && (
        <Modal
          title="Link confidencial de convite — exibido uma vez"
          close={() => setLink("")}
        >
          <p>
            Validade de 24 horas. Compartilhe por um canal autorizado. O token
            fica no fragmento, sem ser enviado na URL HTTP.
          </p>
          <textarea
            readOnly
            aria-label="Link confidencial do convite"
            value={link}
          />
          <button onClick={() => void navigator.clipboard.writeText(link)}>
            Copiar link confidencial
          </button>
        </Modal>
      )}
    </>
  );
}
function Catalog({
  company,
  services,
  run,
}: {
  company: CompanyRecord;
  services: boolean;
  run: Run;
}) {
  const { identity } = useAuth();
  const resource = services ? "services" : "customers";
  const path = `/client/companies/${company.id}/${resource}`;
  const remote = useRemote(path, () =>
    api<Array<CustomerRecord | ServiceRecord>>(path),
  );
  const [editing, setEditing] = useState<
    CustomerRecord | ServiceRecord | null | undefined
  >(undefined);
  const allowed =
    company.active &&
    company.permissions.includes(services ? "service:write" : "customer:write");
  return (
    <>
      <button disabled={!allowed} onClick={() => setEditing(null)}>
        {services ? "Novo serviço" : "Novo tomador"}
      </button>
      <RemoteError error={remote.error} />
      <div className="card-grid">
        {remote.data?.map((r) => (
          <section className="panel" key={r.id}>
            <Badge>{r.active ? "Ativo" : "Arquivado"}</Badge>
            <h3>{r.name}</h3>
            <p>{"description" in r ? r.description : r.document}</p>
            <small>{"code" in r ? r.code : r.email}</small>
            <div className="actions">
              <button
                className="secondary"
                disabled={!allowed}
                onClick={() => setEditing(r)}
              >
                Editar
              </button>
            </div>
          </section>
        ))}
      </div>
      {remote.data?.length === 0 && (
        <section className="panel">
          <Empty title="Nenhum cadastro desta empresa no servidor" />
        </section>
      )}
      {editing !== undefined && (
        <Modal
          title={
            services
              ? "Serviço cadastral — sem validação fiscal"
              : "Tomador da empresa selecionada"
          }
          close={() => setEditing(undefined)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const body = Object.fromEntries(f.entries());
              void run(async () => {
                await api(path + (editing ? "/" + editing.id : ""), {
                  method: editing ? "PUT" : "POST",
                  body: services
                    ? {
                        ...body,
                        favorite: true,
                        active: editing?.active ?? true,
                      }
                    : { ...body, active: editing?.active ?? true },
                });
                remote.reload();
                setEditing(undefined);
              });
            }}
          >
            <Field label="Nome">
              <input
                name="name"
                required
                minLength={3}
                defaultValue={editing?.name}
              />
            </Field>
            {services ? (
              <>
                <Field label="Descrição do serviço">
                  <textarea
                    name="description"
                    required
                    minLength={3}
                    defaultValue={
                      editing && "description" in editing
                        ? editing.description
                        : ""
                    }
                  />
                </Field>
                <Field label="Referência ilustrativa / a parametrizar">
                  <input
                    name="code"
                    defaultValue={
                      editing && "code" in editing ? editing.code : "A_VALIDAR"
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Documento cadastral">
                  <input
                    name="document"
                    required
                    defaultValue={
                      editing && "document" in editing
                        ? editing.document
                        : identity?.environment === "development"
                          ? "DEMO-TOMADOR"
                          : ""
                    }
                  />
                </Field>
                <Field label="Contato de e-mail">
                  <input
                    name="email"
                    type="email"
                    defaultValue={
                      editing && "email" in editing ? editing.email : ""
                    }
                  />
                </Field>
                <Field label="Município">
                  <input
                    name="municipality"
                    defaultValue={
                      editing && "municipality" in editing
                        ? editing.municipality
                        : ""
                    }
                  />
                </Field>
              </>
            )}
            <button>Salvar no servidor</button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Drafts({ company, run }: { company: CompanyRecord; run: Run }) {
  const path = `/client/companies/${company.id}/invoices/drafts`;
  const remote = useRemote(path, () => api<DraftRecord[]>(path));
  return (
    <>
      <Link className="button gold-button" href="/portal/emitir/completa">
        Preparar novo rascunho
      </Link>
      <RemoteError error={remote.error} />
      <div className="card-grid">
        {remote.data?.map((d) => (
          <section className="panel" key={d.id}>
            <Badge>Rascunho persistido</Badge>
            <h3>{d.description || "Descrição a preencher"}</h3>
            <p>
              {displayDate(d.competence_date)} · etapa {d.step + 1}/5
            </p>
            <strong>{currency(Number(d.amount))}</strong>
            <div className="actions">
              <Link
                className="button secondary"
                href={"/portal/emitir/completa?draft=" + d.id}
              >
                Retomar rascunho
              </Link>
              <button
                disabled={!company.permissions.includes("draft:write")}
                className="secondary"
                onClick={() =>
                  void run(async () => {
                    await api(path + "/" + d.id, {
                      method: "DELETE",
                      body: {},
                    });
                    remote.reload();
                  })
                }
              >
                Excluir rascunho
              </button>
            </div>
          </section>
        ))}
      </div>
      {remote.data?.length === 0 && (
        <section className="panel">
          <Empty title="Nenhum rascunho salvo nesta empresa" />
        </section>
      )}
    </>
  );
}
function DraftWizard({
  company,
  draftId,
  run,
}: {
  company: CompanyRecord;
  draftId: string;
  run: Run;
}) {
  const path = `/client/companies/${company.id}`;
  const remote = useRemote(path + "-draft-form", () =>
    Promise.all([
      api<CustomerRecord[]>(path + "/customers"),
      api<ServiceRecord[]>(path + "/services"),
      api<DraftRecord[]>(path + "/invoices/drafts"),
    ]),
  );
  if (remote.error) return <RemoteError error={remote.error} />;
  if (!remote.data) return <p>Carregando dados autorizados do servidor...</p>;
  const existing = remote.data[2].find((d) => d.id === draftId);
  if (draftId && !existing)
    return (
      <section className="panel">
        <Empty title="Rascunho indisponível neste contexto" />
      </section>
    );
  if (!company.permissions.includes("draft:write"))
    return (
      <section className="panel">
        <h2>Seu vínculo permite apenas consulta</h2>
        <p>
          O servidor também bloqueia alterações; não há troca visual de perfil
          neste modo.
        </p>
      </section>
    );
  return (
    <DraftForm
      company={company}
      initial={existing}
      customers={remote.data[0]}
      services={remote.data[1]}
      run={run}
    />
  );
}
function DraftForm({
  company,
  initial,
  customers,
  services,
  run,
}: {
  company: CompanyRecord;
  initial?: DraftRecord;
  customers: CustomerRecord[];
  services: ServiceRecord[];
  run: Run;
}) {
  const [draft, setDraft] = useState({
    id: initial?.id || "",
    customer_id: initial?.customer_id || "",
    service_id: initial?.service_id || "",
    description: initial?.description || "",
    competence_date:
      initial?.competence_date || new Date().toISOString().slice(0, 10),
    amount: initial?.amount || "0",
    step: initial?.step || 0,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const steps = ["Prestador", "Tomador", "Serviço", "Valores", "Revisão"];
  const change = (value: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...value }));
    setSaved(false);
    setError("");
  };
  function next() {
    if (draft.step === 1 && !draft.customer_id) {
      setError("Selecione um tomador desta empresa.");
      return;
    }
    if (
      draft.step === 2 &&
      (!draft.service_id || draft.description.length < 3)
    ) {
      setError("Selecione serviço e descrição.");
      return;
    }
    change({ step: Math.min(4, draft.step + 1) });
  }
  return (
    <>
      <div className="warning">
        M1 — PREPARAÇÃO E SALVAMENTO NO SERVIDOR. NÃO TRANSMITE NFS-e.
      </div>
      <div className="steps">
        {steps.map((s, i) => (
          <div key={s} className={i === draft.step ? "current" : ""}>
            <span>{i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <section className="panel form-panel">
        <h2>
          {draft.step + 1}. {steps[draft.step]}
        </h2>
        {draft.step === 0 && (
          <div className="notice">
            {company.name}
            <br />
            {company.cnpj} · {company.tax_regime}
            <br />
            {company.municipality}
            <br />
            Credenciamento fiscal: não configurado.
          </div>
        )}
        {draft.step === 1 && (
          <Field label="Tomador autorizado neste CNPJ">
            <select
              value={draft.customer_id}
              onChange={(e) => change({ customer_id: e.target.value })}
            >
              <option value="">Selecione</option>
              {customers
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {draft.step === 2 && (
          <>
            <Field label="Serviço cadastrado">
              <select
                value={draft.service_id}
                onChange={(e) => {
                  const s = services.find((s) => s.id === e.target.value);
                  change({
                    service_id: e.target.value,
                    description: s?.description || "",
                  });
                }}
              >
                <option value="">Selecione</option>
                {services
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Descrição">
              <textarea
                value={draft.description}
                onChange={(e) => change({ description: e.target.value })}
              />
            </Field>
            <Field label="Competência">
              <input
                type="date"
                required
                value={draft.competence_date}
                onChange={(e) => change({ competence_date: e.target.value })}
              />
            </Field>
          </>
        )}
        {draft.step === 3 && (
          <>
            <Field label="Valor de serviços (rascunho)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={(e) => change({ amount: e.target.value })}
              />
            </Field>
            <p className="notice">
              Parâmetros municipais, XSD, ISS, retenções e IBS/CBS dependem do
              M3. Nenhum enquadramento tributário foi validado.
            </p>
          </>
        )}
        {draft.step === 4 && (
          <>
            <p>
              {company.name} →{" "}
              {customers.find((c) => c.id === draft.customer_id)?.name}
            </p>
            <p>{draft.description}</p>
            <h2>{currency(Number(draft.amount))}</h2>
            <p className="notice">
              Revisão de rascunho. Nenhuma autorização, numeração ou documento
              fiscal foi gerado.
            </p>
            <button
              disabled
              title="M3: emissão depende de credenciamento, autorização, schemas e provedor"
            >
              Emitir NFS-e — indisponível no M1
            </button>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="notice" role="status">
            Rascunho salvo no PostgreSQL. Disponível ao retomar após nova
            sessão.
          </p>
        )}
        <div className="wizard-actions">
          <button
            className="secondary"
            onClick={() =>
              void run(async () => {
                const { id, ...body } = draft;
                const result = await api<DraftRecord>(
                  `/client/companies/${company.id}/invoices/drafts` +
                    (id ? "/" + id : ""),
                  {
                    method: id ? "PUT" : "POST",
                    body: {
                      ...body,
                      customer_id: body.customer_id || null,
                      service_id: body.service_id || null,
                      amount: Number(body.amount),
                    },
                  },
                );
                setDraft((d) => ({ ...d, id: result.id }));
                setSaved(true);
              })
            }
          >
            Salvar rascunho no servidor
          </button>
          <div className="actions">
            {draft.step > 0 && (
              <button
                className="secondary"
                onClick={() => change({ step: draft.step - 1 })}
              >
                Voltar
              </button>
            )}
            {draft.step < 4 && <button onClick={next}>Próximo</button>}
          </div>
        </div>
      </section>
    </>
  );
}
function Invoices({ company }: { company: CompanyRecord }) {
  const remote = useRemote(company.id + "-invoices", () =>
    api<
      Array<{ id: string; reference: string; status: string; amount: string }>
    >(`/client/companies/${company.id}/invoices`),
  );
  return (
    <section className="panel">
      <RemoteError error={remote.error} />
      {remote.data?.length === 0 ? (
        <Empty title="Nenhuma nota fiscal registrada">
          <p>
            M1 não emite notas. Nenhum número ou autorização fictícia é
            apresentado como produção.
          </p>
        </Empty>
      ) : (
        remote.data?.map((n) => (
          <div className="rank" key={n.id}>
            <span>{n.reference}</span>
            <Badge>{n.status}</Badge>
            <strong>{currency(Number(n.amount))}</strong>
          </div>
        ))
      )}
      <p className="notice">
        Consulta oficial, XML/DANFSe, cancelamento e substituição serão
        habilitados nos próximos marcos com provedor autorizado.
      </p>
    </section>
  );
}
function ProviderStatus({ company }: { company?: CompanyRecord }) {
  const remote = useRemote("provider-" + company?.id, () =>
    company
      ? api<{ fiscal: { reason: string } }>(
          "/client/companies/" + company.id + "/providers",
        )
      : Promise.resolve(null),
  );
  return (
    <section className="panel">
      <h2>Contratos de provedores preparados</h2>
      <RemoteError error={remote.error} />
      <p>FiscalProvider: não configurado · M3</p>
      <p>PaymentProvider: não configurado · M2</p>
      <p>
        CertificateProvider / NotificationProvider: contratos definidos, sem
        conexão.
      </p>
      <p className="notice">
        {remote.data?.fiscal.reason ||
          "Nenhuma cobrança, emissão ou assinatura será efetuada no M1."}
      </p>
    </section>
  );
}
function Audit() {
  const remote = useRemote("audit", () =>
    api<
      Array<{
        id: string;
        action: string;
        at: string;
        company_id: string | null;
      }>
    >("/admin/audit"),
  );
  return (
    <section className="panel">
      <h2>Alterações registradas no servidor</h2>
      <RemoteError error={remote.error} />
      {remote.data?.map((a) => (
        <div className="activity" key={a.id}>
          <span>{a.action}</span>
          <small>
            {displayDate(a.at)} · {a.company_id || "Sessão / organização"}
          </small>
        </div>
      ))}
      <p className="notice">
        Registros transacionais no banco, sem senhas, tokens ou PFX. Integridade
        imutável externa e retenção avançada são parte do M4.
      </p>
    </section>
  );
}
