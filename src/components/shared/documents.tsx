"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, Download, FileText, Plus, Star } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { DemoRepository, uid } from "../../demo/DemoRepository";
import { listInvoices, companyRecords } from "../../demo/selectors";
import { emptyDraft } from "../../data/seed";
import { currency, displayDate } from "../../lib/formatters";
import type { Draft, Invoice, Recipient, Service } from "../../domain/models";
import { useWorkspace, ViewAsClient } from "./workspace";
import { Badge, Field, Modal, Empty } from "./ui";
import { InvoiceTable, invoiceHref, exportInvoices } from "./invoice-table";
import { DemoInvoicePreview } from "./invoice-preview";
import { EntityEditor, type EntityKind } from "./entity-editor";
import { PeriodFilter } from "./dashboard";
export const queryParam = (key: string) =>
  typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get(key) || "";
export function useDuplicate() {
  const { mutate, preferences } = useDemo();
  const router = useRouter();
  return (n: Invoice) => {
    const draft = {
      ...emptyDraft(n.companyId),
      recipientId: n.recipientId,
      serviceId: n.serviceId,
      date: n.date,
      value: String(n.gross),
      discount: String(n.discount),
      deduction: String(n.deduction),
      description: n.description,
      observations: n.observations,
    };
    mutate(
      (s) => DemoRepository.saveDraft(s, draft),
      "Documento duplicado para um novo rascunho. Original preservado.",
      n.companyId,
    );
    preferences({ portalCompany: n.companyId });
    router.push("/portal/emitir/completa");
  };
}
export function Notes() {
  const { state, notify } = useDemo();
  const { portal, companyId, period, editable } = useWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(queryParam("status"));
  const [type, setType] = useState(queryParam("type") || "out");
  const [recipient, setRecipient] = useState("");
  const [service, setService] = useState("");
  const [client, setClient] = useState(queryParam("client"));
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const duplicate = useDuplicate();
  const notes = listInvoices(state, {
    companyId,
    period,
    status,
    query,
    received: type === "all" ? undefined : type === "in",
    recipientId: recipient,
    serviceId: service,
    clientId: client,
    min: min === "" ? undefined : Number(min),
    max: max === "" ? undefined : Number(max),
  });
  return (
    <>
      <div className="filters">
        <input
          aria-label="Pesquisar notas"
          placeholder="Buscar referência, tomador ou descrição..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <PeriodFilter />
        <select
          aria-label="Situação da nota"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
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
        <select
          aria-label="Tipo de nota"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="out">Notas emitidas DEMO</option>
          <option value="in">Recebidas — apenas layout</option>
          <option value="all">Ambos os tipos</option>
        </select>
      </div>
      <details className="advanced-filters">
        <summary>Filtros adicionais: tomador, serviço e valor</summary>
        <div className="filters">
          <select
            aria-label="Filtrar tomador"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="">Todos os tomadores do contexto</option>
            {companyRecords(state.recipients, companyId).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar serviço"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Todos os serviços do contexto</option>
            {companyRecords(state.services, companyId).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!portal && (
            <select
              aria-label="Filtrar conta cliente"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            >
              <option value="">Todas as contas</option>
              {state.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            min="0"
            aria-label="Valor mínimo"
            placeholder="Valor mínimo"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
          <input
            type="number"
            min="0"
            aria-label="Valor máximo"
            placeholder="Valor máximo"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
          <button
            className="secondary"
            onClick={() => {
              setQuery("");
              setStatus("");
              setRecipient("");
              setService("");
              setClient("");
              setMin("");
              setMax("");
              setType("out");
            }}
          >
            Limpar filtros
          </button>
        </div>
      </details>
      {type !== "out" && (
        <p className="notice">
          Notas recebidas inteiramente fictícias, somente para layout. Consulta
          real depende de fonte oficial autorizada na Fase 2.
        </p>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>{notes.length} documentos demonstrativos</h2>
          <button
            className="secondary"
            onClick={() => {
              exportInvoices(
                notes,
                (id) => state.companies.find((c) => c.id === id)?.name || id,
              );
              notify("CSV DEMO baixado neste navegador.");
            }}
          >
            <Download size={15} /> Exportar CSV DEMO
          </button>
        </div>
        <InvoiceTable
          notes={notes}
          portal={portal}
          duplicate={portal && editable ? duplicate : undefined}
        />
      </section>
    </>
  );
}
export function NoteDetail({ id }: { id: string }) {
  const { state, mutate, notify } = useDemo();
  const { portal, companyId, editable } = useWorkspace();
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [view, setView] = useState(false);
  const duplicate = useDuplicate();
  const note = state.invoices.find(
    (n) => n.id === id && (!portal || n.companyId === companyId),
  );
  if (!note)
    return (
      <section className="panel">
        <Empty title="Documento indisponível neste contexto">
          <p>
            Selecione a empresa autorizada correta ou volte à sua lista. Não há
            consulta a dados de outro CNPJ.
          </p>
          <Link
            className="button secondary"
            href={portal ? "/portal/notas" : "/admin/notas"}
          >
            Voltar às notas
          </Link>
        </Empty>
      </section>
    );
  const company = state.companies.find((c) => c.id === note.companyId);
  const recipient = state.recipients.find((t) => t.id === note.recipientId);
  const canEvent =
    editable && note.status === "Emitida (simulação)" && !note.received;
  function commitAction() {
    if (!note || reason.trim().length < 5) return;
    if (action === "manifestação") {
      mutate(
        (s) => ({
          ...s,
          invoices: s.invoices.map((n) =>
            n.id === note.id
              ? {
                  ...n,
                  events: [...n.events, "Manifestação simulada: " + reason],
                }
              : n,
          ),
        }),
        "Manifestação registrada apenas neste navegador.",
        note.companyId,
      );
    } else {
      const next = DemoRepository.updateInvoiceStatus(
        state,
        note.id,
        note.companyId,
        action === "cancelamento"
          ? "Cancelada (simulação)"
          : "Substituída (simulação)",
        reason,
      );
      mutate(
        () => next,
        `${action === "cancelamento" ? "Cancelamento" : "Substituição"} simulado: ${note.id}`,
        note.companyId,
      );
      if (action === "substituição")
        router.push(invoiceHref(next.invoices[0], portal));
    }
    setAction("");
    setReason("");
  }
  return (
    <>
      <div className="actions detail-actions">
        <Badge>{note.status}</Badge>
        <button
          className="secondary"
          onClick={() => {
            if (navigator.clipboard)
              navigator.clipboard
                .writeText(note.id)
                .then(() => notify("Referência DEMO copiada."))
                .catch(() => notify("Referência interna: " + note.id));
            else notify("Referência interna: " + note.id);
          }}
        >
          <Copy size={14} /> Copiar referência DEMO
        </button>
        <button className="gold-button" onClick={() => setPreview(true)}>
          <FileText size={15} /> Ver prévia DEMO
        </button>
        {portal && editable && (
          <button className="secondary" onClick={() => duplicate(note)}>
            Duplicar como rascunho
          </button>
        )}
        {!portal && (
          <button className="secondary" onClick={() => setView(true)}>
            Ver portal como cliente
          </button>
        )}
      </div>
      <div className="two-columns">
        <section className="panel note-detail">
          <span className="eyebrow">REFERÊNCIA INTERNA DEMONSTRATIVA</span>
          <h2>{note.id}</h2>
          <div className="notice">
            DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL
          </div>
          <dl>
            <dt>Prestador fictício</dt>
            <dd>
              {company?.name} · {company?.document}
            </dd>
            <dt>Tomador</dt>
            <dd>
              {recipient?.name} · {recipient?.document}
            </dd>
            <dt>Serviço</dt>
            <dd>{note.description}</dd>
            <dt>Competência</dt>
            <dd>{displayDate(note.date)}</dd>
            <dt>Valor demonstrativo</dt>
            <dd className="detail-value">{currency(note.value)}</dd>
            <dt>Observações de exemplo</dt>
            <dd>{note.observations || "Nenhuma anotação adicional."}</dd>
          </dl>
          {note.previousId && (
            <p>
              Substitui registro DEMO:{" "}
              <Link
                className="text-link"
                href={invoiceHref({ ...note, id: note.previousId }, portal)}
              >
                {note.previousId}
              </Link>
            </p>
          )}
          {portal && recipient && (
            <Link
              className="text-link"
              href={"/portal/tomadores?recipient=" + recipient.id}
            >
              Ver tomador desta nota
            </Link>
          )}
          <div className="actions">
            {note.received ? (
              <button
                className="secondary"
                disabled={!editable}
                onClick={() => setAction("manifestação")}
              >
                Registrar manifestação simulada
              </button>
            ) : (
              <>
                <button
                  className="secondary"
                  disabled={!canEvent}
                  title={
                    !editable
                      ? "Perfil Consulta — somente visualização"
                      : "Disponível somente para notas emitidas em simulação"
                  }
                  onClick={() => setAction("cancelamento")}
                >
                  Simular cancelamento
                </button>
                <button
                  className="secondary"
                  disabled={!canEvent}
                  onClick={() => setAction("substituição")}
                >
                  Simular substituição
                </button>
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <h2>Histórico deste documento DEMO</h2>
          {note.events.map((e, i) => (
            <div className="activity" key={i}>
              <span className="activity-dot" />
              <p>{e}</p>
            </div>
          ))}
          {!portal && (
            <>
              <h3>Anotações internas fictícias</h3>
              {note.annotations.map((a, i) => (
                <p key={i} className="notice">
                  {a}
                </p>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (annotation.trim().length < 3) return;
                  mutate(
                    (s) => ({
                      ...s,
                      invoices: s.invoices.map((n) =>
                        n.id === note.id
                          ? {
                              ...n,
                              annotations: [...n.annotations, annotation],
                            }
                          : n,
                      ),
                    }),
                    "Anotação demonstrativa adicionada.",
                    note.companyId,
                  );
                  setAnnotation("");
                }}
              >
                <Field label="Nova anotação interna DEMO">
                  <textarea
                    required
                    minLength={3}
                    value={annotation}
                    onChange={(e) => setAnnotation(e.target.value)}
                  />
                </Field>
                <button>Registrar anotação</button>
              </form>
            </>
          )}
          <p className="notice">
            Histórico local editável. Não é trilha de auditoria legal ou
            imutável.
          </p>
        </section>
      </div>
      <Link
        className="button secondary"
        href={portal ? "/portal/notas" : "/admin/notas"}
      >
        Voltar à lista
      </Link>
      {preview && (
        <Modal
          title="Prévia ilustrativa — sem validade fiscal"
          close={() => setPreview(false)}
        >
          <DemoInvoicePreview invoice={note} />
          <button onClick={() => window.print()}>Imprimir prévia DEMO</button>
        </Modal>
      )}
      {action && (
        <Modal
          title={`Simular ${action}?`}
          close={() => {
            setAction("");
            setReason("");
          }}
        >
          <p>
            Esta ação modifica apenas registros fictícios deste navegador.
            Nenhuma solicitação fiscal será transmitida.
          </p>
          <Field
            label="Justificativa demonstrativa *"
            hint="Pelo menos 5 caracteres; não informe dados reais."
          >
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button className="secondary" onClick={() => setAction("")}>
              Voltar sem alterar
            </button>
            <button disabled={reason.trim().length < 5} onClick={commitAction}>
              Confirmar simulação
            </button>
          </div>
        </Modal>
      )}
      {view && (
        <ViewAsClient companyId={note.companyId} close={() => setView(false)} />
      )}
    </>
  );
}
export function Drafts() {
  const { state, mutate, notify } = useDemo();
  const { companyId, editable } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [remove, setRemove] = useState<Draft | null>(null);
  const drafts = companyRecords(state.drafts, companyId).filter((d) =>
    `${d.id} ${d.description} ${state.recipients.find((t) => t.id === d.recipientId)?.name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="filters">
        <input
          aria-label="Pesquisar rascunhos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar descrição ou tomador..."
        />
        {editable && (
          <button
            onClick={() => {
              mutate((s) => ({
                ...s,
                working: { ...s.working, [companyId]: emptyDraft(companyId) },
              }));
              router.push("/portal/emitir/completa");
            }}
          >
            <Plus size={15} /> Novo rascunho
          </button>
        )}
      </div>
      <div className="card-grid">
        {drafts.map((d) => (
          <section className="panel" key={d.id}>
            <div className="panel-heading">
              <Badge>Rascunho DEMO</Badge>
              <small>{d.step + 1}/5 etapas</small>
            </div>
            <h3>
              {state.recipients.find((t) => t.id === d.recipientId)?.name ||
                "Tomador a preencher"}
            </h3>
            <p>{d.description || "Faltam informações do serviço."}</p>
            <strong className="draft-value">
              {currency(Number(d.value || 0))}
            </strong>
            <progress max={5} value={d.step + 1} />
            <small>
              Última edição: {displayDate(d.updated)} · Faltam informações
            </small>
            <div className="actions">
              <button
                disabled={!editable}
                onClick={() => {
                  mutate((s) => ({
                    ...s,
                    working: { ...s.working, [companyId]: d },
                  }));
                  router.push("/portal/emitir/completa");
                }}
              >
                Retomar rascunho
              </button>
              <button
                disabled={!editable}
                className="secondary"
                onClick={() =>
                  mutate(
                    (s) =>
                      DemoRepository.saveDraft(s, {
                        ...d,
                        id: uid("RASC-DEMO"),
                      }),
                    "Rascunho duplicado neste navegador.",
                    companyId,
                  )
                }
              >
                Duplicar
              </button>
              <button
                disabled={!editable}
                className="secondary"
                onClick={() => setRemove(d)}
              >
                Excluir
              </button>
            </div>
          </section>
        ))}
      </div>
      {!drafts.length && (
        <section className="panel">
          <Empty title="Nenhum rascunho desta empresa">
            <p>
              Você pode iniciar uma emissão e salvar para continuar mais tarde.
            </p>
            <Link className="button secondary" href="/portal/emitir">
              Conhecer os fluxos
            </Link>
          </Empty>
        </section>
      )}
      {remove && (
        <Modal
          title="Excluir rascunho demonstrativo?"
          close={() => setRemove(null)}
        >
          <p>Apenas este rascunho local será removido.</p>
          <button
            onClick={() => {
              mutate((s) => {
                const working = { ...s.working };
                if (working[companyId]?.id === remove.id)
                  delete working[companyId];
                return {
                  ...s,
                  drafts: s.drafts.filter((d) => d.id !== remove.id),
                  working,
                };
              });
              notify("Rascunho removido deste navegador.");
              setRemove(null);
            }}
          >
            Confirmar exclusão
          </button>
        </Modal>
      )}
    </>
  );
}
export function Catalog({ services = false }: { services?: boolean }) {
  const { state, mutate } = useDemo();
  const { companyId, editable } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("active");
  const [edit, setEdit] = useState<{ kind: EntityKind; id?: string } | null>(
    null,
  );
  const [archive, setArchive] = useState<{
    id: string;
    active: boolean;
  } | null>(null);
  const router = useRouter();
  const raw: Array<Recipient | Service> = services
    ? state.services
    : state.recipients;
  const records = companyRecords(raw, companyId)
    .sort((a, b) =>
      "order" in a && "order" in b
        ? a.order - b.order
        : a.name.localeCompare(b.name),
    )
    .filter(
      (r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "all" ||
          (filter === "active" && r.active) ||
          (filter === "archived" && !r.active) ||
          (filter === "favorites" && "favorite" in r && r.favorite)),
    );
  const selectedRecipient = queryParam("recipient");
  return (
    <>
      <div className="filters">
        <input
          aria-label={services ? "Pesquisar serviços" : "Pesquisar tomadores"}
          placeholder="Buscar por nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Situação do cadastro"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Cadastros ativos</option>
          <option value="archived">Arquivados</option>
          <option value="all">Todos os cadastros</option>
          {services && <option value="favorites">Somente favoritos</option>}
        </select>
        <button
          disabled={!editable}
          onClick={() => setEdit({ kind: services ? "service" : "recipient" })}
        >
          <Plus size={15} />{" "}
          {services ? "Novo serviço favorito" : "Novo tomador DEMO"}
        </button>
      </div>
      <p className="notice">
        {services
          ? "Classificações ilustrativas. Exemplo para validação do layout — regra fiscal não verificada."
          : "Identificação exclusivamente DOC-DEMO. Não cadastre CPF/CNPJ, e-mail ou dados pessoais reais."}
      </p>
      <div className="card-grid">
        {records.map((r) => (
          <section
            className={`panel ${r.id === selectedRecipient ? "highlight-card" : ""}`}
            key={r.id}
          >
            <div className="panel-heading">
              <Badge>{r.active ? "Ativo DEMO" : "Arquivado DEMO"}</Badge>
              {"favorite" in r && (
                <button
                  className="secondary icon"
                  disabled={!editable}
                  aria-label={`Favoritar ${r.name}`}
                  onClick={() =>
                    mutate(
                      (s) => ({
                        ...s,
                        services: s.services.map((x) =>
                          x.id === r.id ? { ...x, favorite: !x.favorite } : x,
                        ),
                      }),
                      "Favorito demonstrativo atualizado.",
                      companyId,
                    )
                  }
                >
                  <Star size={18} fill={r.favorite ? "#c5a46d" : "none"} />
                </button>
              )}
            </div>
            <h3>{r.name}</h3>
            {"code" in r ? (
              <>
                <p>{r.description}</p>
                <p className="muted">
                  {r.code} · {r.category} · ilustrativos
                </p>
              </>
            ) : (
              <>
                <p>{r.document}</p>
                <p>
                  {r.email} · {r.city}
                </p>
              </>
            )}
            <div className="actions">
              <button
                className="secondary"
                disabled={!editable}
                onClick={() =>
                  setEdit({
                    kind: services ? "service" : "recipient",
                    id: r.id,
                  })
                }
              >
                Editar
              </button>
              <button
                className="secondary"
                disabled={!editable}
                onClick={() => setArchive({ id: r.id, active: r.active })}
              >
                {r.active ? "Arquivar" : "Restaurar"}
              </button>
              {r.active && (
                <button
                  className="secondary"
                  disabled={!editable}
                  onClick={() => {
                    const d = state.working[companyId] || emptyDraft(companyId);
                    mutate((s) => ({
                      ...s,
                      working: {
                        ...s.working,
                        [companyId]: services
                          ? {
                              ...d,
                              serviceId: r.id,
                              description:
                                "description" in r ? r.description : "",
                              classification: "code" in r ? r.code : "",
                            }
                          : { ...d, recipientId: r.id },
                      },
                    }));
                    router.push(
                      services
                        ? "/portal/emitir/rapida"
                        : "/portal/emitir/completa",
                    );
                  }}
                >
                  Usar na emissão
                </button>
              )}
              {services && (
                <button
                  className="secondary"
                  disabled={!editable}
                  onClick={() =>
                    mutate(
                      (s) => ({
                        ...s,
                        services: s.services.map((x) =>
                          x.id === r.id
                            ? {
                                ...x,
                                order:
                                  Math.min(
                                    0,
                                    ...s.services
                                      .filter((t) => t.companyId === companyId)
                                      .map((t) => t.order),
                                  ) - 1,
                              }
                            : x,
                        ),
                      }),
                      "Serviço movido para o início.",
                      companyId,
                    )
                  }
                >
                  Mover ao início
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
      {!records.length && (
        <section className="panel">
          <Empty title="Nenhum cadastro encontrado neste CNPJ" />
        </section>
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
              ? "Arquivar cadastro DEMO?"
              : "Restaurar cadastro DEMO?"
          }
          close={() => setArchive(null)}
        >
          <p>Os documentos anteriores serão preservados.</p>
          <button
            onClick={() => {
              mutate(
                (s) =>
                  services
                    ? {
                        ...s,
                        services: s.services.map((x) =>
                          x.id === archive.id ? { ...x, active: !x.active } : x,
                        ),
                      }
                    : {
                        ...s,
                        recipients: s.recipients.map((x) =>
                          x.id === archive.id ? { ...x, active: !x.active } : x,
                        ),
                      },
                "Situação do cadastro demonstrativo atualizada.",
                companyId,
              );
              setArchive(null);
            }}
          >
            Confirmar alteração
          </button>
        </Modal>
      )}
    </>
  );
}
