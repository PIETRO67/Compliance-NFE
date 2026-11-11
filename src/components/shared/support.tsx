"use client";
import { useState } from "react";
import { useDemo } from "../../demo/DemoProvider";
import { DemoRepository, uid } from "../../demo/DemoRepository";
import { companyRecords } from "../../demo/selectors";
import { useWorkspace } from "./workspace";
import { Field, Badge, Empty } from "./ui";
import { displayDate } from "../../lib/formatters";
import type { Ticket } from "../../domain/models";
export function Support() {
  const { state, mutate } = useDemo();
  const { portal, companyId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const tickets = companyRecords(state.tickets, companyId).filter(
    (t) =>
      (!filter || t.status === filter) &&
      `${t.subject} ${t.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      {portal && (
        <>
          <section className="panel">
            <h2>Como podemos ajudar?</h2>
            <div className="faq-list">
              {[
                [
                  "Como emitir uma nota DEMO?",
                  "Escolha Emissão rápida, selecione tomador e serviço fictícios, informe o valor, revise e simule. Nenhum envio será feito.",
                ],
                [
                  "Como corrigir ou duplicar uma nota?",
                  "Abra o detalhe. Duplicar cria um rascunho; cancelamento e substituição exigem confirmação e são apenas simulações.",
                ],
                [
                  "Onde encontro meu rascunho?",
                  "Abra Meus rascunhos. Dados são salvos apenas neste navegador, sem sincronização em outros dispositivos.",
                ],
                [
                  "Preciso enviar certificado ou senha?",
                  "Não. Nesta fase não existe upload A1, senha, chave privada ou operação fiscal real.",
                ],
              ].map(([title, text]) => (
                <details key={title}>
                  <summary>{title}</summary>
                  <p>{text}</p>
                </details>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Solicitar ajuda ao Grupo IA Compliance</h2>
            <p className="notice">
              Simulação local. Nenhum e-mail ou mensagem será enviado. O ticket
              fica visível no painel do escritório apenas neste mesmo navegador.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const subject = String(f.get("subject")).trim(),
                  description = String(f.get("description")).trim();
                if (subject.length < 4 || description.length < 10) {
                  setError(
                    "Informe assunto com 4 caracteres e descrição fictícia com ao menos 10.",
                  );
                  return;
                }
                const ticket: Ticket = {
                  id: uid("AJUDA-DEMO"),
                  companyId,
                  subject,
                  description,
                  category: String(f.get("category")),
                  invoiceId: String(f.get("invoiceId") || ""),
                  urgency: String(f.get("urgency")),
                  status: "Aberto",
                  messages: [
                    {
                      author: "Cliente DEMO",
                      body: description,
                      at: new Date().toISOString(),
                    },
                  ],
                  at: new Date().toISOString(),
                };
                mutate(
                  (s) => ({ ...s, tickets: [ticket, ...s.tickets] }),
                  "Pedido de ajuda criado localmente. Não foi enviado ao escritório.",
                  companyId,
                );
                setError("");
                e.currentTarget.reset();
              }}
            >
              <div className="form-grid">
                <Field label="Assunto fictício *">
                  <input name="subject" required minLength={4} />
                </Field>
                <Field label="Categoria">
                  <select name="category">
                    <option>Dúvida de uso</option>
                    <option>Emissão demonstrativa</option>
                    <option>Cadastro fictício</option>
                    <option>Sugestão de melhoria</option>
                  </select>
                </Field>
                <Field label="Nota DEMO relacionada (opcional)">
                  <select name="invoiceId">
                    <option value="">Sem nota relacionada</option>
                    {state.invoices
                      .filter((n) => n.companyId === companyId)
                      .map((n) => (
                        <option key={n.id}>{n.id}</option>
                      ))}
                  </select>
                </Field>
                <Field label="Urgência">
                  <select name="urgency">
                    <option>Normal</option>
                    <option>Alta</option>
                    <option>Baixa</option>
                  </select>
                </Field>
              </div>
              <Field label="Descrição fictícia *">
                <textarea name="description" required minLength={10} />
              </Field>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button>Criar pedido de ajuda local</button>
            </form>
          </section>
        </>
      )}
      <div className="filters">
        <input
          aria-label="Pesquisar solicitações"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar assunto ou referência..."
        />
        <select
          aria-label="Status do atendimento"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          {["Aberto", "Em atendimento", "Encerrado"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <section className="panel">
        <h2>
          {portal
            ? "Meus pedidos neste navegador"
            : "Fila de atendimento demonstrativo"}
        </h2>
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} portal={portal} />
        ))}
        {!tickets.length && <Empty title="Nenhum atendimento neste contexto" />}
      </section>
    </>
  );
}
function TicketCard({
  ticket: t,
  portal,
}: {
  ticket: Ticket;
  portal: boolean;
}) {
  const { state, mutate } = useDemo();
  const [reply, setReply] = useState("");
  return (
    <details className="ticket-card">
      <summary>
        <span>
          <strong>{t.subject}</strong>
          <small>
            {t.id} · {displayDate(t.at)}
            {!portal &&
              " · " + state.companies.find((c) => c.id === t.companyId)?.name}
          </small>
        </span>
        <Badge>{t.status}</Badge>
      </summary>
      <p>
        {t.category} · Prioridade: {t.urgency} · Referência:{" "}
        {t.invoiceId || "Sem nota relacionada"}
      </p>
      <p>{t.description}</p>
      <div className="messages">
        {t.messages.map((m, i) => (
          <div key={i} className="message">
            <strong>{m.author}</strong>
            <p>{m.body}</p>
            <small>{displayDate(m.at)} · Mensagem local demonstrativa</small>
          </div>
        ))}
      </div>
      {!portal && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reply.trim().length < 3) return;
              mutate(
                (s) => ({
                  ...s,
                  tickets: s.tickets.map((x) =>
                    x.id === t.id
                      ? {
                          ...x,
                          status: "Em atendimento",
                          messages: [
                            ...x.messages,
                            {
                              author: "Escritório DEMO",
                              body: reply,
                              at: new Date().toISOString(),
                            },
                          ],
                        }
                      : x,
                  ),
                }),
                "Resposta local adicionada ao ticket. Nenhuma mensagem externa enviada.",
                t.companyId,
              );
              setReply("");
            }}
          >
            <Field label={"Resposta demonstrativa para " + t.id}>
              <textarea
                required
                minLength={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            </Field>
            <div className="actions">
              <button>Adicionar resposta local</button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  mutate(
                    (s) => ({
                      ...s,
                      tickets: s.tickets.map((x) =>
                        x.id === t.id
                          ? {
                              ...x,
                              status:
                                x.status === "Encerrado"
                                  ? "Aberto"
                                  : "Encerrado",
                            }
                          : x,
                      ),
                    }),
                    t.status === "Encerrado"
                      ? "Ticket reaberto localmente."
                      : "Ticket encerrado localmente.",
                    t.companyId,
                  )
                }
              >
                {t.status === "Encerrado"
                  ? "Reabrir ticket"
                  : "Encerrar ticket"}
              </button>
            </div>
          </form>
        </>
      )}
    </details>
  );
}
export const feedbackDimensions = [
  "Rapidez",
  "Facilidade de emissão",
  "Clareza",
  "Mobile",
  "Utilidade",
];
export function ClientFeedback() {
  const { state, mutate } = useDemo();
  const { companyId } = useWorkspace();
  const [sent, setSent] = useState(false);
  return (
    <>
      <section className="panel">
        <span className="eyebrow">SUA OPINIÃO AJUDA A EVOLUIR</span>
        <h2>Como foi usar o portal?</h2>
        <p>Registre sua percepção para a avaliação da Fase 1.</p>
        <p className="notice">
          Este feedback não foi enviado ao escritório; é uma simulação local.
          Ele aparece no Centro de Validação somente neste mesmo navegador, sem
          sincronização entre dispositivos.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const ratings = Object.fromEntries(
              feedbackDimensions.map((x) => [x, Number(f.get(x))]),
            );
            mutate(
              (s) =>
                DemoRepository.saveFeedback(s, {
                  id: uid("FEEDBACK-DEMO"),
                  companyId,
                  ratings,
                  text: String(f.get("text")),
                  screen: String(f.get("screen")),
                  at: new Date().toISOString(),
                }),
              "Feedback registrado somente neste navegador.",
              companyId,
            );
            setSent(true);
            e.currentTarget.reset();
          }}
        >
          <div className="form-grid">
            {feedbackDimensions.map((r) => (
              <Field key={r} label={r + " *"}>
                <select required name={r} defaultValue="">
                  <option value="" disabled>
                    Selecione uma nota
                  </option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}{" "}
                      {n === 1
                        ? "— Precisa melhorar"
                        : n === 5
                          ? "— Excelente"
                          : ""}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <Field label="Tela relacionada">
            <select name="screen">
              <option>Portal do cliente</option>
              <option>Emissão rápida</option>
              <option>Emissão completa</option>
              <option>Minhas notas</option>
              <option>Mobile</option>
            </select>
          </Field>
          <Field label="O que melhorar? *">
            <textarea required minLength={5} name="text" />
          </Field>
          <button>Enviar avaliação (local)</button>
        </form>
        {sent && (
          <p className="notice" role="status">
            Feedback salvo localmente. Consulte-o no Centro de Validação do
            escritório neste mesmo navegador.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Minhas opiniões registradas</h2>
        {state.feedback
          .filter((f) => f.companyId === companyId)
          .map((f) => (
            <article className="feedback-card" key={f.id}>
              <Badge>Feedback local</Badge>
              <p>{f.text}</p>
              <small>
                {f.screen} · {displayDate(f.at)}
              </small>
            </article>
          ))}
      </section>
    </>
  );
}
