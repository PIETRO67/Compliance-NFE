"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Download,
  LifeBuoy,
  FileText,
  Star,
  Users,
} from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import {
  companyRecords,
  listInvoices,
  activeRevenue,
} from "../../demo/selectors";
import { DemoRepository } from "../../demo/DemoRepository";
import { emptyDraft } from "../../data/seed";
import { currency } from "../../lib/formatters";
import type { Invoice } from "../../domain/models";
import { useWorkspace } from "./workspace";
import { Badge, Empty, Field } from "./ui";
import { InvoiceTable, exportInvoices } from "./invoice-table";
export function PeriodFilter() {
  const { state, preferences } = useDemo();
  const { portal, period } = useWorkspace();
  return (
    <select
      aria-label="Período"
      value={period}
      onChange={(e) =>
        preferences(
          portal
            ? { portalPeriod: e.target.value }
            : { adminPeriod: e.target.value },
        )
      }
    >
      {["2026", "2026-11", "2026-10", "2026-09"].map((v) => (
        <option key={v} value={v}>
          {v === "2026"
            ? "Ano de 2026"
            : v === "2026-11"
              ? "Novembro de 2026"
              : v === "2026-10"
                ? "Outubro de 2026"
                : "Setembro de 2026"}
        </option>
      ))}
      {!["2026", "2026-11", "2026-10", "2026-09"].includes(period) && (
        <option value={period}>{state.preferences.portalPeriod}</option>
      )}
    </select>
  );
}
export function TrendChart({ notes }: { notes: Invoice[] }) {
  const router = useRouter();
  const { portal } = useWorkspace();
  const series = Array.from({ length: 12 }, (_, i) => ({
    month: [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ][i],
    value: activeRevenue(
      notes.filter((n) => Number(n.date.slice(5, 7)) === i + 1),
    ),
    count: notes.filter(
      (n) => !n.received && Number(n.date.slice(5, 7)) === i + 1,
    ).length,
  }));
  return (
    <div
      className="chart"
      role="img"
      aria-label="Evolução mensal demonstrativa, valores derivados das notas do contexto selecionado"
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={series}
          onClick={() =>
            router.push(portal ? "/portal/relatorios" : "/admin/relatorios")
          }
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c5a46d" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#c5a46d" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--line)"
            vertical={false}
            strokeDasharray="4 5"
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#828b99", fontSize: 11 }}
          />
          <YAxis
            width={62}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000} mil` : String(v))}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#828b99", fontSize: 10 }}
          />
          <Tooltip
            formatter={(value) => currency(Number(value))}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
            }}
          />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            name="Valor demonstrativo"
            stroke="#b29463"
            strokeWidth={2.5}
            fill="url(#trend-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Dashboard({ reports = false }: { reports?: boolean }) {
  const { state, mutate, preferences, notify } = useDemo();
  const { portal, companyId, company, period, editable } = useWorkspace();
  const router = useRouter();
  const [status, setStatus] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("status") || "",
  );
  const notes = listInvoices(state, {
    companyId,
    period,
    status,
    received: false,
  });
  const companies = state.companies.filter(
    (c) => (companyId === "all" || c.id === companyId) && c.active,
  );
  const drafts = companyRecords(state.drafts, companyId).filter((d) =>
    d.date.startsWith(period),
  );
  const pending = companyRecords(state.pending, companyId).filter(
    (p) => !p.resolved,
  );
  const certificates = companyRecords(state.certificates, companyId).filter(
    (c) => c.status === "Vence em breve — simulado",
  );
  const tickets = companyRecords(state.tickets, companyId).filter(
    (t) => t.status !== "Encerrado",
  );
  const revenue = activeRevenue(notes);
  const cn = (id: string) =>
    state.companies.find((c) => c.id === id)?.name || id;
  const duplicate = (n: Invoice) => {
    const d = {
      ...emptyDraft(n.companyId),
      recipientId: n.recipientId,
      serviceId: n.serviceId,
      description: n.description,
      date: n.date,
      value: String(n.gross),
      discount: String(n.discount),
      deduction: String(n.deduction),
      observations: n.observations,
      step: 0,
    };
    mutate(
      (s) => DemoRepository.saveDraft(s, d),
      "Nota duplicada como novo rascunho. Original preservado.",
      n.companyId,
    );
    preferences({ portalCompany: n.companyId });
    router.push("/portal/emitir/completa");
  };
  const metrics = portal
    ? [
        ["Notas DEMO no período", notes.length, "/portal/notas"],
        ["Valor de serviços demo", currency(revenue), "/portal/relatorios"],
        ["Rascunhos para continuar", drafts.length, "/portal/rascunhos"],
        ["Avisos para acompanhar", pending.length, "/portal/ajuda"],
      ]
    : [
        [
          "Contas de clientes",
          state.accounts.filter(
            (a) =>
              a.active && (companyId === "all" || a.id === company?.clientId),
          ).length,
          "/admin/clientes",
        ],
        ["CNPJs ativos", companies.length, "/admin/empresas"],
        ["Notas DEMO no período", notes.length, "/admin/notas"],
        ["Valor dos serviços demo", currency(revenue), "/admin/relatorios"],
        ["Rascunhos pendentes", drafts.length, "/admin/pendencias"],
        [
          "Notas com erro simulado",
          notes.filter((n) => n.status === "Erro simulado").length,
          "/admin/notas?status=Erro%20simulado",
        ],
        [
          "A1 próximos do vencimento",
          certificates.length,
          "/admin/certificados",
        ],
        ["Chamados em aberto", tickets.length, "/admin/suporte"],
      ];
  return (
    <>
      {portal && !reports && (
        <section className="portal-welcome">
          <div>
            <span className="eyebrow">BEM-VINDO AO SEU ESPAÇO</span>
            <h2>
              Olá! Vamos simplificar
              <br />a rotina da {company?.name}?
            </h2>
            <p>Seus serviços, documentos e atendimento em um só lugar.</p>
            <span className="portal-company-tag">
              {company?.document} · {company?.city}
            </span>
          </div>
          <div>
            {editable ? (
              <Link
                className="button gold-button large-button"
                href="/portal/emitir"
              >
                <Plus size={20} /> Emitir nova NFS-e
              </Link>
            ) : (
              <p>Perfil de consulta — visualização e exportação disponíveis.</p>
            )}
            <small>Simulação local · não emite nota fiscal</small>
          </div>
        </section>
      )}
      <div className="filters">
        <PeriodFilter />
        <Field label="Situação dos documentos">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas as situações</option>
            {[
              "Emitida (simulação)",
              "Cancelada (simulação)",
              "Substituída (simulação)",
              "Erro simulado",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <span className="muted">
          {portal
            ? company?.document
            : companyId === "all"
              ? "Visão consolidada da carteira"
              : company?.document}{" "}
          · Valores inteiramente fictícios
        </span>
        {reports && (
          <button
            className="secondary"
            onClick={() => {
              exportInvoices(notes, cn);
              notify("CSV demonstrativo exportado localmente.");
            }}
          >
            <Download size={15} /> Exportar CSV DEMO
          </button>
        )}
      </div>
      <div className="kpi-grid">
        {metrics.map(([label, value, href]) => (
          <Link
            className="panel kpi"
            key={label}
            href={
              status &&
              !String(href).includes("?") &&
              /\/(notas|relatorios)$/.test(String(href))
                ? String(href) + "?status=" + encodeURIComponent(status)
                : String(href)
            }
          >
            <div>
              <span>{label}</span>
              <ArrowUpRight size={17} />
            </div>
            <strong>{value}</strong>
            <small>
              {portal
                ? "Somente sua empresa fictícia"
                : "Dados do contexto e período selecionados"}
            </small>
          </Link>
        ))}
      </div>
      {portal && !reports && (
        <div className="quick-links">
          {[
            ["/portal/emitir/rapida", "Emissão rápida", FileText],
            ["/portal/tomadores", "Meus tomadores", Users],
            ["/portal/servicos", "Serviços favoritos", Star],
            ["/portal/ajuda", "Pedir ajuda", LifeBuoy],
          ].map(([href, label, Icon]) => {
            const I = Icon as typeof FileText;
            return (
              <Link key={String(href)} href={String(href)}>
                <I size={20} />
                <span>{String(label)}</span>
                <ArrowRight size={15} />
              </Link>
            );
          })}
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {reports
                  ? "Evolução dos resultados demonstrativos"
                  : "Evolução dos serviços"}
              </h2>
              <p className="muted">
                12 meses · soma de notas emitidas ativas no filtro
              </p>
            </div>
            <Badge>Dados DEMO</Badge>
          </div>
          <div className="chart-total">{currency(revenue)}</div>
          <TrendChart notes={notes} />
          <Link
            className="text-link"
            href={portal ? "/portal/relatorios" : "/admin/relatorios"}
          >
            Abrir relatório de resultados <ArrowRight size={14} />
          </Link>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {portal ? "Como emitir em 3 passos" : "Pendências prioritárias"}
            </h2>
            <Badge>
              {portal ? "Guia rápido" : `${pending.length} abertas`}
            </Badge>
          </div>
          {portal ? (
            <>
              {state.preferences.hints ? (
                <ol className="simple-steps">
                  <li>
                    <strong>Escolha quem recebe</strong>
                    <p>Selecione um tomador fictício da sua empresa.</p>
                  </li>
                  <li>
                    <strong>Informe o serviço e o valor</strong>
                    <p>Use um favorito para evitar digitação repetida.</p>
                  </li>
                  <li>
                    <strong>Revise e simule</strong>
                    <p>O documento gerado não terá validade fiscal.</p>
                  </li>
                </ol>
              ) : (
                <p className="notice">
                  Dicas de navegação ocultas. Você pode reativá-las em Meu
                  perfil.
                </p>
              )}
              <Link className="text-link" href="/portal/ajuda">
                Preciso de orientação <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              {pending.slice(0, 4).map((p) => (
                <Link
                  className="alert-item"
                  key={p.id}
                  href="/admin/pendencias"
                >
                  <div>
                    <Badge>{p.priority}</Badge>
                    <h3>{p.title}</h3>
                    <p>{cn(p.companyId)}</p>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
              {!pending.length && (
                <Empty title="Nenhuma pendência neste contexto" />
              )}
            </>
          )}
        </section>
      </div>
      {reports && (
        <section className="panel">
          <h2>
            {portal
              ? "Meus serviços mais usados"
              : "Ranking de empresas e categorias de serviço"}
          </h2>
          {!portal &&
            companies
              .map((c) => ({
                c,
                value: activeRevenue(notes.filter((n) => n.companyId === c.id)),
              }))
              .sort((a, b) => b.value - a.value)
              .map(({ c, value }) => (
                <div className="rank" key={c.id}>
                  <Link
                    href={
                      /^DEMO-\d+$/.test(c.id)
                        ? "/admin/empresas/" + c.id
                        : "/admin/empresas/local?id=" + c.id
                    }
                  >
                    {c.name}
                  </Link>
                  <strong>{currency(value)}</strong>
                </div>
              ))}
          {companyRecords(state.services, companyId)
            .map((s) => ({
              s,
              count: notes.filter((n) => n.serviceId === s.id).length,
            }))
            .sort((a, b) => b.count - a.count)
            .map(({ s, count }) => (
              <div className="rank" key={s.id}>
                <span>
                  {s.name}
                  <small>{s.category} · categoria ilustrativa</small>
                </span>
                <strong>{count} notas DEMO</strong>
              </div>
            ))}
          <p className="notice">
            Comparação de períodos: altere o filtro para confrontar mês/ano. Não
            há comparativo com outros clientes no portal nem apuração fiscal
            real.
          </p>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              {portal
                ? "Suas notas mais recentes"
                : "Últimos documentos da carteira"}
            </h2>
            <p className="muted">
              Registros demonstrativos, sem validade fiscal
            </p>
          </div>
          <Link
            className="text-link"
            href={portal ? "/portal/notas" : "/admin/notas"}
          >
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>
        <InvoiceTable
          notes={notes}
          portal={portal}
          compact
          duplicate={portal && editable ? duplicate : undefined}
        />
      </section>
      {!portal && (
        <div className="bottom-grid">
          <section className="panel">
            <h2>Atividade da carteira</h2>
            {state.activities
              .filter(
                (a) =>
                  !a.companyId ||
                  companyId === "all" ||
                  a.companyId === companyId,
              )
              .slice(0, 4)
              .map((a) => (
                <div className="activity" key={a.id}>
                  <span className="activity-dot" />
                  <p>{a.message}</p>
                </div>
              ))}
            <Link className="text-link" href="/admin/atividades">
              Ver histórico local <ArrowRight size={14} />
            </Link>
          </section>
          <section className="evaluation-teaser">
            <div>
              <span className="eyebrow">DA EXPERIÊNCIA AO PRÓXIMO PASSO</span>
              <h3>O que fica para a Fase 2?</h3>
              <p>Reúna as decisões do escritório e as opiniões dos clientes.</p>
              <Link href="/admin/avaliacao">
                Abrir Centro de Validação <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
