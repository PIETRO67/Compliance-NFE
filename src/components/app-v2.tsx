"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import OperationalApp from "../operational/OperationalApp";
import { usePathname, useRouter } from "next/navigation";
import { useDemo } from "../demo/DemoProvider";
import { Entry, Tour } from "./entry";
import { Workspace } from "./shared/workspace";
import { DemoBanner } from "./shared/ui";
import { Dashboard } from "./shared/dashboard";
import {
  Notes,
  NoteDetail,
  Drafts,
  Catalog,
  queryParam,
} from "./shared/documents";
import { Emission, EmissionChoice } from "./portal/emission";
import { Portfolio } from "./admin/portfolio";
import { Support, ClientFeedback } from "./shared/support";
import { Evaluation } from "./admin/evaluation";
import {
  Pending,
  Certificates,
  Users,
  Fiscal,
  Integrations,
  Activities,
  Settings,
} from "./shared/operations";
import { acceptanceJourneys } from "../data/evaluation-catalog";
export default function AppV2() {
  return process.env.NEXT_PUBLIC_APP_MODE === "operational" ? (
    <Suspense fallback={<p>Carregando sessão...</p>}>
      <OperationalApp />
    </Suspense>
  ) : (
    <DemoApplication />
  );
}
function DemoApplication() {
  const { ready } = useDemo();
  const path = usePathname();
  if (!ready)
    return (
      <div className="boot">
        <strong>IA COMPLIANCE</strong>
        <p>Preparando os dois portais demonstrativos...</p>
        <div className="skeleton" />
      </div>
    );
  if (path === "/") return <Entry />;
  if (path === "/demonstracao") return <DemoGuide />;
  if (!path.startsWith("/admin") && !path.startsWith("/portal"))
    return <LegacyRedirect path={path} />;
  const portal = path.startsWith("/portal");
  let content: React.ReactNode;
  let title = "";
  const pages: Record<string, [string, React.ReactNode]> = {
    "/admin": ["Visão geral da carteira", <Dashboard key="admin-dashboard" />],
    "/admin/clientes": ["Contas de clientes", <Portfolio key="clients" />],
    "/admin/empresas": [
      "Empresas / CNPJs",
      <Portfolio companies key="companies" />,
    ],
    "/admin/notas": ["Documentos da carteira", <Notes key="admin-notes" />],
    "/admin/pendencias": ["Pendências operacionais", <Pending key="Pending" />],
    "/admin/certificados": [
      "Certificados A1 fictícios",
      <Certificates key="Certificates" />,
    ],
    "/admin/usuarios": ["Usuários e acessos visuais", <Users key="Users" />],
    "/admin/relatorios": [
      "Resultados da carteira",
      <Dashboard reports key="admin-reports" />,
    ],
    "/admin/atividades": [
      "Atividades demonstrativas",
      <Activities key="activities" />,
    ],
    "/admin/suporte": ["Central de suporte", <Support key="admin-support" />],
    "/admin/notificacoes": [
      "Notificações",
      <Activities notifications key="notifications" />,
    ],
    "/admin/fiscal": ["Centro fiscal ilustrativo", <Fiscal key="Fiscal" />],
    "/admin/integracoes": [
      "Integrações futuras",
      <Integrations key="Integrations" />,
    ],
    "/admin/configuracoes": [
      "Configurações da demonstração",
      <Settings key="admin-settings" />,
    ],
    "/admin/avaliacao": [
      "Centro de Validação da Fase 1",
      <Evaluation key="Evaluation" />,
    ],
    "/portal": ["Meu início", <Dashboard key="portal-dashboard" />],
    "/portal/emitir": [
      "Emitir NFS-e DEMO",
      <EmissionChoice key="EmissionChoice" />,
    ],
    "/portal/emitir/rapida": ["Emissão rápida", <Emission quick key="quick" />],
    "/portal/emitir/completa": ["Emissão completa", <Emission key="full" />],
    "/portal/notas": ["Minhas notas", <Notes key="portal-notes" />],
    "/portal/rascunhos": ["Meus rascunhos", <Drafts key="Drafts" />],
    "/portal/tomadores": ["Meus tomadores", <Catalog key="recipients" />],
    "/portal/servicos": [
      "Serviços favoritos",
      <Catalog services key="services" />,
    ],
    "/portal/relatorios": [
      "Meus resultados",
      <Dashboard reports key="portal-reports" />,
    ],
    "/portal/ajuda": ["Ajuda do escritório", <Support key="portal-help" />],
    "/portal/perfil": [
      "Meu perfil e preferências",
      <Settings profile key="profile" />,
    ],
    "/portal/feedback": [
      "Minha opinião sobre o portal",
      <ClientFeedback key="ClientFeedback" />,
    ],
  };
  if (pages[path]) {
    [title, content] = pages[path];
  } else if (path.startsWith("/admin/clientes/")) {
    title = "Detalhe da conta cliente";
    content = (
      <Portfolio
        id={path.endsWith("/local") ? queryParam("id") : path.split("/").pop()}
        key={path + queryParam("id")}
      />
    );
  } else if (path.startsWith("/admin/empresas/")) {
    title = "Detalhe do CNPJ fictício";
    content = (
      <Portfolio
        companies
        id={path.endsWith("/local") ? queryParam("id") : path.split("/").pop()}
        key={path + queryParam("id")}
      />
    );
  } else if (
    path.startsWith("/admin/notas/") ||
    path.startsWith("/portal/notas/")
  ) {
    title = "Documento demonstrativo";
    content = (
      <NoteDetail
        id={
          path.endsWith("/local")
            ? queryParam("id")
            : path.split("/").pop() || ""
        }
        key={path + queryParam("id")}
      />
    );
  } else {
    title = "Página não encontrada";
    content = (
      <section className="panel">
        <h2>Este caminho não faz parte da demonstração.</h2>
        <Link href={portal ? "/portal" : "/admin"}>Voltar ao início</Link>
      </section>
    );
  }
  return (
    <Workspace
      title={title}
      key={portal ? "portal-workspace" : "admin-workspace"}
    >
      {content}
    </Workspace>
  );
}
function LegacyRedirect({ path }: { path: string }) {
  const router = useRouter();
  const map: Record<string, string> = {
    "/dashboard": "/admin",
    "/empresas": "/admin/empresas",
    "/emissao": "/portal/emitir",
    "/emissao/simplificada": "/portal/emitir/rapida",
    "/emissao/completa": "/portal/emitir/completa",
    "/notas/emitidas": "/admin/notas",
    "/notas/recebidas": "/admin/notas",
    "/rascunhos": "/portal/rascunhos",
    "/tomadores": "/portal/tomadores",
    "/servicos": "/portal/servicos",
    "/fiscal": "/admin/fiscal",
    "/certificados": "/admin/certificados",
    "/eventos": "/admin/atividades",
    "/relatorios": "/admin/relatorios",
    "/notificacoes": "/admin/notificacoes",
    "/auditoria": "/admin/atividades",
    "/usuarios": "/admin/usuarios",
    "/configuracoes": "/admin/configuracoes",
    "/integracoes": "/admin/integracoes",
    "/avaliacao": "/admin/avaliacao",
  };
  const target =
    map[path] ||
    (path.startsWith("/empresas/") ? "/admin" + path : "/admin/notas");
  useEffect(() => router.replace(target), [router, target]);
  return (
    <div className="boot">
      <p>A demonstração agora possui dois portais.</p>
      <Link href={target}>Abrir experiência V2</Link>
    </div>
  );
}
function DemoGuide() {
  const { state } = useDemo();
  const [tour, setTour] = useState<"admin" | "portal" | null>(null);
  return (
    <div
      className={`app v2 guide-page ${state.preferences.theme === "dark" ? "dark" : ""}`}
    >
      <DemoBanner />
      <main className="guide-main">
        <Link className="text-link" href="/">
          ← Voltar à escolha de experiência
        </Link>
        <span className="eyebrow">GUIA DE EXPLORAÇÃO · FASE 1</span>
        <h1>
          Conheça os dois lados
          <br />
          da mesma experiência.
        </h1>
        <p>
          O escritório acompanha. O cliente opera. Você avalia o que vale
          construir na próxima fase.
        </p>
        <div className="two-columns">
          <section className="panel">
            <h2>Roteiro do escritório · 5–10 minutos</h2>
            <ol>
              <li>Entre como Administrador e filtre empresa e período.</li>
              <li>Explore uma conta e seus CNPJs.</li>
              <li>Revise pendências, A1 fictício e solicitações locais.</li>
              <li>Use “Visualizar como cliente” para conhecer o portal.</li>
              <li>Retorne, avalie módulos e exporte decisões.</li>
            </ol>
            <div className="actions">
              <Link className="button" href="/admin">
                Abrir escritório
              </Link>
              <button className="secondary" onClick={() => setTour("admin")}>
                Tour do escritório
              </button>
            </div>
          </section>
          <section className="panel">
            <h2>Roteiro do cliente · 5–10 minutos</h2>
            <ol>
              <li>Emita uma nota demonstrativa pelo fluxo rápido.</li>
              <li>Confira histórico e indicadores.</li>
              <li>Crie um tomador e um serviço favorito fictícios.</li>
              <li>Salve e retome o assistente completo.</li>
              <li>
                Peça ajuda, envie feedback e veja o resultado no admin local.
              </li>
            </ol>
            <div className="actions">
              <Link className="button gold-button" href="/portal">
                Abrir portal
              </Link>
              <button className="secondary" onClick={() => setTour("portal")}>
                Tour do cliente
              </button>
            </div>
          </section>
        </div>
        <section className="panel">
          <h2>Limites da demonstração</h2>
          <p className="notice">
            Nenhuma autenticação, isolamento seguro, backend, banco, integração,
            certificado, cálculo normativo ou emissão real. Dados e vínculos são
            somente visuais. O armazenamento do navegador não é seguro para
            dados reais.
          </p>
          <p>
            Suporte e feedback são compartilhados entre os dois portais apenas
            neste navegador. Não há sincronização em nuvem ou envio ao
            escritório.
          </p>
        </section>
        <section className="panel">
          <h2>25 jornadas de aceitação</h2>
          <ol>
            {acceptanceJourneys.map((j) => (
              <li key={j}>{j}</li>
            ))}
          </ol>
          <Link className="button secondary" href="/admin/avaliacao">
            Registrar decisões no Centro de Validação
          </Link>
        </section>
      </main>
      {tour && <Tour portal={tour === "portal"} close={() => setTour(null)} />}
    </div>
  );
}
