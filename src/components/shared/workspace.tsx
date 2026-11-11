"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Plus,
  Users,
  Star,
  LifeBuoy,
  MessageSquare,
  Settings,
  ShieldCheck,
  ClipboardCheck,
  Layers,
  Bell,
  Menu,
  X,
  Moon,
  Sun,
  ArrowLeft,
  ChevronRight,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { permittedCompanies } from "../../demo/selectors";
import {
  clientRoles,
  officeRoles,
  canIssue,
} from "../../domain/permissions-demo";
import type { ClientRole } from "../../domain/models";
import { DemoBanner, Field, Modal } from "./ui";
export const adminNav = [
  ["/admin", "Visão geral da carteira", LayoutDashboard],
  ["/admin/clientes", "Contas de clientes", Users],
  ["/admin/empresas", "Empresas / CNPJs", Building2],
  ["/admin/notas", "Documentos DEMO", FileText],
  ["/admin/pendencias", "Pendências", Layers],
  ["/admin/certificados", "Certificados A1", ShieldCheck],
  ["/admin/usuarios", "Usuários e acessos", Users],
  ["/admin/relatorios", "Relatórios", LayoutDashboard],
  ["/admin/atividades", "Atividades", ClipboardCheck],
  ["/admin/suporte", "Central de suporte", LifeBuoy],
  ["/admin/notificacoes", "Notificações", Bell],
  ["/admin/fiscal", "Centro fiscal ilustrativo", ShieldCheck],
  ["/admin/integracoes", "Integrações futuras", Layers],
  ["/admin/configuracoes", "Configurações", Settings],
  ["/admin/avaliacao", "Centro de Validação", ClipboardCheck],
] as const;
export const portalNav = [
  ["/portal", "Meu início", LayoutDashboard],
  ["/portal/emitir", "Emitir NFS-e", Plus],
  ["/portal/notas", "Minhas notas", FileText],
  ["/portal/rascunhos", "Meus rascunhos", Layers],
  ["/portal/tomadores", "Meus tomadores", Users],
  ["/portal/servicos", "Serviços favoritos", Star],
  ["/portal/relatorios", "Meus resultados", LayoutDashboard],
  ["/portal/ajuda", "Pedir ajuda", LifeBuoy],
  ["/portal/feedback", "Minha opinião", MessageSquare],
  ["/portal/perfil", "Meu perfil", Settings],
] as const;
export function useWorkspace() {
  const path = usePathname();
  const { state } = useDemo();
  const portal = path.startsWith("/portal");
  const companyId = portal
    ? state.preferences.portalCompany
    : state.preferences.adminCompany;
  return {
    portal,
    companyId,
    company: state.companies.find((c) => c.id === companyId),
    period: portal
      ? state.preferences.portalPeriod
      : state.preferences.adminPeriod,
    editable: !portal || canIssue(state.preferences.clientRole),
  };
}
export function ViewAsClient({
  companyId,
  close,
}: {
  companyId?: string;
  close: () => void;
}) {
  const { state, preferences, notify } = useDemo();
  const router = useRouter();
  const [company, setCompany] = useState(
    companyId || state.companies.find((c) => c.active)?.id || "DEMO-1",
  );
  const [role, setRole] = useState<ClientRole>("Gestor do Cliente");
  return (
    <Modal title="Visualizar como cliente (DEMO)" close={close}>
      <p>
        Prévia de experiência visual. Não é impersonação segura, autenticação ou
        autorização real.
      </p>
      <Field label="Empresa fictícia">
        <select value={company} onChange={(e) => setCompany(e.target.value)}>
          {state.companies
            .filter((c) => c.active)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.document}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Perfil do cliente">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as ClientRole)}
        >
          {clientRoles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <button
        onClick={() => {
          const c = state.companies.find((c) => c.id === company)!;
          preferences({
            portalCompany: company,
            portalClientId: c.clientId,
            clientRole: role,
            fromAdmin: true,
          });
          close();
          notify("Experiência do cliente aberta em simulação local.");
          router.push("/portal");
        }}
      >
        Abrir portal desta empresa
      </button>
    </Modal>
  );
}
export function Workspace({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const { state, preferences, notice, notify } = useDemo();
  const { portal, companyId, company } = useWorkspace();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const nav = portal ? portalNav : adminNav;
  const isEmitting = path.startsWith("/portal/emitir/");
  function changeCompany(id: string) {
    if (isEmitting) {
      notify(
        "Para trocar de empresa durante a edição, use “Trocar empresa” no assistente e preserve seu rascunho.",
      );
      return;
    }
    preferences(portal ? { portalCompany: id } : { adminCompany: id });
  }
  return (
    <div
      className={`app v2 ${state.preferences.theme === "dark" ? "dark" : ""} ${portal ? "portal-app" : "admin-app"} ${collapsed ? "collapsed" : ""} ${state.preferences.density === "compact" ? "compact" : ""}`}
    >
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href={portal ? "/portal" : "/admin"} className="brand">
          <div>
            <strong>IA COMPLIANCE</strong>
            <small>
              {portal ? "PORTAL DO CLIENTE" : "GESTÃO DO ESCRITÓRIO"}
            </small>
          </div>
        </Link>
        <button
          className="workspace"
          aria-label={
            collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
          }
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <>
              <div className="workspace-icon">
                {portal ? <Building2 size={17} /> : <ShieldCheck size={17} />}
              </div>
              <span>
                {portal ? company?.name : "Grupo IA Compliance"}
                <small>
                  {portal
                    ? "Sua empresa, em um só lugar"
                    : "Carteira de clientes • DEMO"}
                </small>
              </span>
              <PanelLeftClose size={14} />
            </>
          )}
        </button>
        <nav
          aria-label={
            portal ? "Navegação do cliente" : "Navegação do escritório"
          }
        >
          {nav.map(([href, label, Icon], i) => (
            <div className="nav-item-wrap" key={href}>
              {!portal && [0, 3, 9, 13, 14].includes(i) && (
                <p className="nav-section">
                  {
                    [
                      "CARTEIRA",
                      "OPERAÇÃO",
                      "RELACIONAMENTO",
                      "ADMINISTRAÇÃO",
                      "VALIDAÇÃO",
                    ][[0, 3, 9, 13, 14].indexOf(i)]
                  }
                </p>
              )}
              <Link
                title={label}
                onClick={() => setOpen(false)}
                className={
                  (
                    href === (portal ? "/portal" : "/admin")
                      ? path === href
                      : path.startsWith(href)
                  )
                    ? "active"
                    : ""
                }
                href={href}
              >
                <Icon size={18} />
                <span>{label}</span>
                {href === "/admin/avaliacao" && (
                  <small className="new">V2</small>
                )}
              </Link>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/demonstracao">
            Guia da demonstração <ChevronRight size={12} />
          </Link>
          <p>Nossa missão é o seu sucesso.</p>
          <small>Fase 1 · Simulação local</small>
        </div>
      </aside>
      {open && (
        <button
          className="drawer-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon secondary mobile-menu"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            {portal ? "Portal do cliente" : "Painel do escritório"}
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <button
              className="icon global-search"
              aria-label="Busca global simulada"
              onClick={() => setSearch(true)}
            >
              <Search size={18} />
            </button>
            <div className="company-selector">
              <Building2 size={15} />
              <select
                aria-label={
                  portal ? "Empresa do portal" : "Empresa do escritório"
                }
                value={companyId}
                disabled={isEmitting}
                onChange={(e) => changeCompany(e.target.value)}
              >
                {!portal && <option value="all">Todas as empresas</option>}
                {(portal
                  ? permittedCompanies(state)
                  : state.companies.filter(
                      (c) => c.active || c.id === companyId,
                    )
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="icon"
              aria-label="Alternar tema"
              onClick={() =>
                preferences({
                  theme: state.preferences.theme === "light" ? "dark" : "light",
                })
              }
            >
              {state.preferences.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <Link
              className="icon notification-icon"
              href={portal ? "/portal/ajuda" : "/admin/notificacoes"}
              aria-label={portal ? "Ajuda e avisos" : "Central de alertas"}
            >
              <Bell size={18} />
              {state.preferences.alerts &&
                state.notifications.some(
                  (n) =>
                    !n.read &&
                    !n.muted &&
                    (companyId === "all" || n.companyId === companyId),
                ) && <i />}
            </Link>
            <select
              className="role-select"
              aria-label="Perfil DEMO"
              value={
                portal
                  ? state.preferences.clientRole
                  : state.preferences.adminRole
              }
              onChange={(e) =>
                preferences(
                  portal
                    ? { clientRole: e.target.value as ClientRole }
                    : {
                        adminRole: e.target
                          .value as typeof state.preferences.adminRole,
                      },
                )
              }
            >
              {(portal ? clientRoles : officeRoles).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </header>
        <DemoBanner />
        <div className="context-line">
          <span>
            {portal
              ? `${company?.document} · ${company?.name}`
              : "Visão do escritório · " +
                (company?.name || "Carteira consolidada")}
          </span>
          <div className="actions">
            {portal ? (
              <>
                <Link href="/">Voltar à demonstração</Link>
                {state.preferences.fromAdmin && (
                  <Link href="/admin">
                    <ArrowLeft size={12} /> Voltar ao escritório
                  </Link>
                )}
              </>
            ) : (
              <button className="text-button" onClick={() => setView(true)}>
                Visualizar como cliente (DEMO) <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
        <main id="conteudo" className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {portal
                  ? "SUA ROTINA, MAIS SIMPLES"
                  : "GRUPO IA COMPLIANCE / ESCRITÓRIO"}
              </span>
              <h1>{title}</h1>
              <p>
                {portal
                  ? "Seu CNPJ, seus documentos e a ajuda do escritório."
                  : "Gestão, supervisão e atendimento em uma visão unificada."}
              </p>
            </div>
            {portal &&
              !path.startsWith("/portal/emitir") &&
              (canIssue(state.preferences.clientRole) ? (
                <Link className="button gold-button" href="/portal/emitir">
                  <Plus size={17} /> Emitir nova NFS-e
                </Link>
              ) : (
                <button
                  disabled
                  title="Perfil Consulta: emissão indisponível apenas nesta simulação visual"
                >
                  Emissão indisponível · Consulta
                </button>
              ))}
          </div>
          {children}
          <footer>
            <span>Grupo IA Compliance · Nossa missão é o seu sucesso.</span>
            <span>
              Informações salvas somente neste navegador, sem nuvem · DEMO V2
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Fechar aviso" onClick={() => notify("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {view && (
        <ViewAsClient
          close={() => setView(false)}
          companyId={companyId === "all" ? undefined : companyId}
        />
      )}
      {search && (
        <Modal title="Busca global simulada" close={() => setSearch(false)}>
          <Field label="Pesquisar no contexto atual">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                portal ? "Tomadores e módulos" : "Empresas e módulos"
              }
            />
          </Field>
          <div className="search-results">
            {q && (
              <>
                {nav
                  .filter(([, n]) => n.toLowerCase().includes(q.toLowerCase()))
                  .map(([href, n]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSearch(false)}
                    >
                      {n}
                    </Link>
                  ))}
                {!portal &&
                  state.companies
                    .filter((c) =>
                      c.name.toLowerCase().includes(q.toLowerCase()),
                    )
                    .map((c) => (
                      <Link
                        href={`/admin/empresas/${c.id.startsWith("DEMO-") ? c.id : "local?id=" + c.id}`}
                        key={c.id}
                        onClick={() => setSearch(false)}
                      >
                        {c.name} · {c.document}
                      </Link>
                    ))}
                {portal &&
                  state.recipients
                    .filter(
                      (t) =>
                        t.companyId === companyId &&
                        t.name.toLowerCase().includes(q.toLowerCase()),
                    )
                    .map((t) => (
                      <Link
                        href="/portal/tomadores"
                        key={t.id}
                        onClick={() => setSearch(false)}
                      >
                        {t.name}
                      </Link>
                    ))}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
