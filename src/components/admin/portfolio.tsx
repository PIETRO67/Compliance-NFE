"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { activeRevenue } from "../../demo/selectors";
import { canAdminister } from "../../domain/permissions-demo";
import { currency, displayDate } from "../../lib/formatters";
import { Badge, Empty, Modal } from "../shared/ui";
import { EntityEditor, type EntityKind } from "../shared/entity-editor";
import { useWorkspace, ViewAsClient } from "../shared/workspace";
import { InvoiceTable } from "../shared/invoice-table";
export function recordHref(kind: "clientes" | "empresas", id: string) {
  const fixed = kind === "clientes" ? /^CONTA-\d+$/ : /^DEMO-\d+$/;
  return `/admin/${kind}/${fixed.test(id) ? id : "local?id=" + id}`;
}
export function Portfolio({
  companies = false,
  id,
}: {
  companies?: boolean;
  id?: string;
}) {
  const { state, mutate, preferences } = useDemo();
  const { companyId } = useWorkspace();
  const admin = canAdminister(state.preferences.adminRole);
  const [query, setQuery] = useState("");
  const [regime, setRegime] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState("");
  const [edit, setEdit] = useState<{ kind: EntityKind; id?: string } | null>(
    null,
  );
  const [archive, setArchive] = useState<{
    id: string;
    active: boolean;
  } | null>(null);
  const [view, setView] = useState("");
  const company = state.companies.find((c) => c.id === id);
  const account = state.accounts.find((a) => a.id === id);
  const record = companies ? company : account;
  const tabs = companies
    ? [
        "Dados",
        "Notas",
        "Serviços",
        "Certificado DEMO",
        "Acessos simulados",
        "Pendências",
        "Histórico",
      ]
    : ["Visão geral", "CNPJs", "Usuários", "Notas", "Suporte", "Histórico"];
  const currentTab = tab || tabs[0];
  if (id && !record)
    return (
      <section className="panel">
        <Empty title="Registro DEMO não encontrado" />
        <Link href={companies ? "/admin/empresas" : "/admin/clientes"}>
          Voltar à carteira
        </Link>
      </section>
    );
  const list = companies
    ? state.companies.filter(
        (c) =>
          (companyId === "all" || c.id === companyId) &&
          (!regime || c.regime === regime) &&
          (!city || c.city === city),
      )
    : state.accounts.filter(
        (a) =>
          companyId === "all" ||
          state.companies.find((c) => c.id === companyId)?.clientId === a.id,
      );
  const filtered = list.filter(
    (r) =>
      `${r.name} ${r.owner}`.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" ||
        (status === "active" && r.active) ||
        (status === "archived" && !r.active)),
  );
  const scopedCompanies = id
    ? state.companies.filter((c) =>
        companies ? c.id === id : c.clientId === id,
      )
    : [];
  const ids = new Set(scopedCompanies.map((c) => c.id));
  const notes = state.invoices.filter((n) => ids.has(n.companyId));
  return (
    <>
      {id && record ? (
        <>
          <div className="company-header">
            <div className="company-avatar">
              {record.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2>{record.name}</h2>
              <p>
                {company?.document || "Conta de cliente fictícia"} ·{" "}
                <Badge>{record.active ? "Ativo DEMO" : "Arquivado DEMO"}</Badge>
              </p>
            </div>
            <div className="actions">
              <button
                disabled={!admin}
                title={
                  !admin
                    ? "Perfil Analista — ajuste administrativo apenas visualmente indisponível"
                    : ""
                }
                className="secondary"
                onClick={() =>
                  setEdit({ kind: companies ? "company" : "client", id })
                }
              >
                Editar cadastro
              </button>
              {companies && (
                <button className="gold-button" onClick={() => setView(id)}>
                  Ver portal desta empresa
                </button>
              )}
            </div>
          </div>
          <div className="tabs">
            {tabs.map((t) => (
              <button
                key={t}
                className={currentTab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <section className="panel">
            {currentTab === "Notas" ? (
              <InvoiceTable notes={notes} />
            ) : currentTab === "CNPJs" ? (
              scopedCompanies.map((c) => (
                <div className="rank" key={c.id}>
                  <Link
                    className="table-link"
                    href={recordHref("empresas", c.id)}
                  >
                    {c.name}
                    <small>
                      {c.document} · {c.city}
                    </small>
                  </Link>
                  <button className="secondary" onClick={() => setView(c.id)}>
                    Ver portal como cliente
                  </button>
                </div>
              ))
            ) : currentTab === "Usuários" ||
              currentTab === "Acessos simulados" ? (
              <>
                <p className="notice">
                  Design de vínculos — nenhuma autorização ou autenticação real.
                </p>
                {state.users
                  .filter((u) => u.companyIds.some((c) => ids.has(c)))
                  .map((u) => (
                    <div className="rank" key={u.id}>
                      <span>
                        {u.name}
                        <small>{u.role}</small>
                      </span>
                      <Badge>
                        {u.active ? "Acesso simulado ativo" : "Revogado demo"}
                      </Badge>
                    </div>
                  ))}
                <Link className="text-link" href="/admin/usuarios">
                  Revisar acessos simulados
                </Link>
              </>
            ) : currentTab === "Suporte" ? (
              state.tickets
                .filter((t) => ids.has(t.companyId))
                .map((t) => (
                  <div className="rank" key={t.id}>
                    <Link href="/admin/suporte">{t.subject}</Link>
                    <Badge>{t.status}</Badge>
                  </div>
                ))
            ) : currentTab === "Serviços" ? (
              state.services
                .filter((s) => ids.has(s.companyId))
                .map((s) => (
                  <div className="rank" key={s.id}>
                    <span>{s.name}</span>
                    <Badge>{s.code} · ilustrativo</Badge>
                  </div>
                ))
            ) : currentTab === "Certificado DEMO" ? (
              <>
                <h2>A1 — somente metadados fictícios</h2>
                {state.certificates
                  .filter((c) => ids.has(c.companyId))
                  .map((c) => (
                    <p className="notice" key={c.id}>
                      {c.holder} · {displayDate(c.expires)} · {c.status}
                    </p>
                  ))}
                {!state.certificates.some((c) => ids.has(c.companyId)) && (
                  <p>Não configurado — representação visual.</p>
                )}
                <Link className="button secondary" href="/admin/certificados">
                  Ver ciclo futuro do certificado
                </Link>
              </>
            ) : currentTab === "Pendências" ? (
              state.pending
                .filter((p) => ids.has(p.companyId))
                .map((p) => (
                  <div className="rank" key={p.id}>
                    <Link href="/admin/pendencias">{p.title}</Link>
                    <Badge>{p.resolved ? "Resolvida DEMO" : p.priority}</Badge>
                  </div>
                ))
            ) : currentTab === "Histórico" ? (
              state.activities
                .filter((a) => ids.has(a.companyId))
                .map((a) => (
                  <p className="notice" key={a.id}>
                    {a.message}
                  </p>
                ))
            ) : (
              <>
                <h2>
                  {companies
                    ? "Dados do CNPJ fictício"
                    : "Visão da conta cliente"}
                </h2>
                <dl>
                  <dt>Responsável fictício</dt>
                  <dd>{record.owner}</dd>
                  <dt>
                    {companies ? "Município / regime" : "Contato fictício"}
                  </dt>
                  <dd>
                    {company
                      ? `${company.city} · ${company.regime}`
                      : account?.email}
                  </dd>
                  {company && (
                    <>
                      <dt>Conta vinculada</dt>
                      <dd>
                        <Link
                          className="text-link"
                          href={recordHref("clientes", company.clientId)}
                        >
                          {
                            state.accounts.find(
                              (a) => a.id === company.clientId,
                            )?.name
                          }
                        </Link>
                      </dd>
                      <dt>Endereço fictício</dt>
                      <dd>{company.address}</dd>
                    </>
                  )}
                </dl>
                <div className="metric-strip">
                  <Link
                    href={
                      companies
                        ? "/admin/notas?type=all"
                        : "/admin/notas?type=all&client=" + id
                    }
                    onClick={() =>
                      preferences({ adminCompany: companies ? id! : "all" })
                    }
                  >
                    <strong>{notes.length}</strong>
                    <span>Documentos DEMO</span>
                  </Link>
                  <Link
                    href={
                      companies
                        ? "/admin/notas?type=all"
                        : "/admin/notas?type=all&client=" + id
                    }
                    onClick={() =>
                      preferences({ adminCompany: companies ? id! : "all" })
                    }
                  >
                    <strong>{currency(activeRevenue(notes))}</strong>
                    <span>Valor demonstrativo</span>
                  </Link>
                  <Link
                    href={
                      companies
                        ? "/admin/empresas"
                        : recordHref("clientes", id!)
                    }
                    onClick={(e) => {
                      if (companies) preferences({ adminCompany: id! });
                      else {
                        e.preventDefault();
                        setTab("CNPJs");
                      }
                    }}
                  >
                    <strong>{scopedCompanies.length}</strong>
                    <span>CNPJs vinculados</span>
                  </Link>
                </div>
              </>
            )}
          </section>
          <Link
            className="button secondary"
            href={companies ? "/admin/empresas" : "/admin/clientes"}
          >
            Voltar à carteira
          </Link>
        </>
      ) : (
        <>
          <div className="filters">
            <input
              aria-label={
                companies ? "Pesquisar empresas" : "Pesquisar contas cliente"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome ou responsável..."
            />
            <select
              aria-label="Situação na carteira"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todas as situações</option>
              <option value="active">Ativos</option>
              <option value="archived">Arquivados / inativos</option>
            </select>
            {companies && (
              <>
                <select
                  aria-label="Regime da empresa"
                  value={regime}
                  onChange={(e) => setRegime(e.target.value)}
                >
                  <option value="">Todos os regimes</option>
                  {[
                    "MEI",
                    "Simples Nacional",
                    "Lucro Presumido",
                    "Lucro Real",
                  ].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <select
                  aria-label="Município da empresa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">Todos os municípios</option>
                  {[
                    "Itumbiara/GO",
                    "Goiânia/GO",
                    "Uberlândia/MG",
                    "Brasília/DF",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </>
            )}
            <button
              disabled={!admin}
              title={
                !admin
                  ? "Perfil Analista — alteração administrativa indisponível nesta persona"
                  : ""
              }
              onClick={() =>
                setEdit({ kind: companies ? "company" : "client" })
              }
            >
              <Plus size={16} />{" "}
              {companies
                ? "Adicionar empresa DEMO"
                : "Adicionar conta cliente DEMO"}
            </button>
          </div>
          <p className="notice">
            {companies
              ? "Cada CNPJ fictício pertence a uma conta cliente."
              : "Contas cliente representam o relacionamento comercial. Uma conta pode possuir dois CNPJs fictícios."}{" "}
            Dados inventados, sem integração cadastral.
          </p>
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>
                      {companies ? "EMPRESA / CNPJ DEMO" : "CONTA CLIENTE"}
                    </th>
                    <th>
                      {companies ? "MUNICÍPIO / REGIME" : "CONTATO FICTÍCIO"}
                    </th>
                    <th>
                      {companies ? "CLIENTE VINCULADO" : "CNPJs VINCULADOS"}
                    </th>
                    <th>RESPONSÁVEL</th>
                    <th>SITUAÇÃO</th>
                    <th>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          className="table-link"
                          href={recordHref(
                            companies ? "empresas" : "clientes",
                            r.id,
                          )}
                        >
                          {r.name}
                        </Link>
                        <small>{"document" in r ? r.document : r.id}</small>
                      </td>
                      <td>
                        {"city" in r ? (
                          <>
                            {r.city}
                            <small>{r.regime}</small>
                          </>
                        ) : (
                          r.email
                        )}
                      </td>
                      <td>
                        {"clientId" in r
                          ? state.accounts.find((a) => a.id === r.clientId)
                              ?.name
                          : state.companies.filter((c) => c.clientId === r.id)
                              .length}
                      </td>
                      <td>{r.owner}</td>
                      <td>
                        <Badge>
                          {r.active ? "Ativo DEMO" : "Arquivado DEMO"}
                        </Badge>
                      </td>
                      <td>
                        <div className="actions">
                          <Link
                            className="button secondary icon"
                            href={recordHref(
                              companies ? "empresas" : "clientes",
                              r.id,
                            )}
                            aria-label={`Abrir ${r.name}`}
                          >
                            <ArrowUpRight size={15} />
                          </Link>
                          <button
                            className="secondary"
                            disabled={!admin}
                            onClick={() =>
                              setEdit({
                                kind: companies ? "company" : "client",
                                id: r.id,
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            className="secondary"
                            disabled={!admin}
                            onClick={() =>
                              setArchive({ id: r.id, active: r.active })
                            }
                          >
                            {r.active ? "Arquivar" : "Restaurar"}
                          </button>
                          {companies && r.active && (
                            <button
                              className="secondary"
                              onClick={() => setView(r.id)}
                            >
                              Ver portal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <Empty title="Nenhum registro encontrado" />}
            </div>
          </section>
        </>
      )}
      {edit && (
        <EntityEditor
          {...edit}
          companyId={companyId}
          close={() => setEdit(null)}
        />
      )}
      {archive && (
        <Modal
          title={
            archive.active
              ? "Arquivar registro DEMO?"
              : "Restaurar registro DEMO?"
          }
          close={() => setArchive(null)}
        >
          <p>Históricos e documentos fictícios serão preservados.</p>
          <button
            onClick={() => {
              mutate(
                (s) =>
                  companies
                    ? {
                        ...s,
                        companies: s.companies.map((c) =>
                          c.id === archive.id ? { ...c, active: !c.active } : c,
                        ),
                      }
                    : {
                        ...s,
                        accounts: s.accounts.map((a) =>
                          a.id === archive.id ? { ...a, active: !a.active } : a,
                        ),
                      },
                "Cadastro da carteira atualizado em modo demonstrativo.",
              );
              setArchive(null);
            }}
          >
            Confirmar alteração
          </button>
        </Modal>
      )}
      {view && <ViewAsClient companyId={view} close={() => setView("")} />}
    </>
  );
}
