"use client";
import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { DemoRepository, uid } from "../../demo/DemoRepository";
import {
  evaluationCatalog,
  acceptanceJourneys,
} from "../../data/evaluation-catalog";
import { companyRecords } from "../../demo/selectors";
import { displayDate, download, watermark } from "../../lib/formatters";
import { useWorkspace } from "../shared/workspace";
import { Field, Badge, Modal, Empty } from "../shared/ui";
export function Evaluation() {
  const { state, mutate, notify } = useDemo();
  const { companyId } = useWorkspace();
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [reset, setReset] = useState(false);
  const [format, setFormat] = useState("json");
  const e = state.evaluation;
  const feedback = companyRecords(state.feedback, companyId);
  const choices = ["Manter", "Melhorar", "Adiar", "Remover"];
  const reviewed = evaluationCatalog.filter((m) =>
    choices.includes(e.decisions[m.id]?.choice),
  ).length;
  const ratings = [
    "Identidade visual",
    "Facilidade de uso",
    "Clareza do portal cliente",
    "Utilidade do painel admin",
    "Experiência de emissão",
    "Mobile",
  ];
  function exportEvaluation() {
    const matrix = evaluationCatalog.map((m) => ({
      ...m,
      decision: e.decisions[m.id] || {
        choice: "Não avaliado",
        comment: "",
        priority: "Importante",
      },
    }));
    const summary = Object.fromEntries(
      choices.map((c) => [
        c,
        matrix.filter((m) => m.decision.choice === c).map((m) => m.module),
      ]),
    );
    const payload = {
      aviso: watermark,
      version: 2,
      escopo: "Relatório completo da demonstração local, sem envio à rede",
      matrix,
      ratings: e.ratings,
      suggestions: e.suggestions,
      clientFeedback: state.feedback,
      acceptanceChecklist: e.checklist,
      summary,
    };
    if (format === "json")
      download(
        "decisoes-fase-1-v2.json",
        JSON.stringify(payload, null, 2),
        "application/json",
      );
    else
      download(
        "decisoes-fase-1-v2.md",
        "# Decisões da Fase 1 — IA Compliance NFS-e\n\n" +
          watermark +
          "\n\n" +
          matrix
            .map(
              (m) =>
                `## ${m.portal} / ${m.module}\n- Decisão: ${m.decision.choice}\n- Prioridade: ${m.decision.priority}\n- Comentário: ${m.decision.comment}\n`,
            )
            .join("\n") +
          "\n## Notas, sugestões, feedback e checklist\n\n```json\n" +
          JSON.stringify(payload, null, 2) +
          "\n```\n",
        "text/markdown",
      );
    notify(
      "Decisões exportadas localmente com matriz, comentários e feedback.",
    );
  }
  return (
    <>
      <section className="review-hero">
        <div>
          <span className="eyebrow">
            CENTRO DE VALIDAÇÃO DO PRODUTO · FASE 1
          </span>
          <h2>
            O próximo passo começa
            <br />
            com decisões claras.
          </h2>
          <p>
            Avalie os dois portais e transforme feedback em escopo para a Fase
            2.
          </p>
        </div>
        <div>
          <Field label="Formato da exportação">
            <select
              value={format}
              onChange={(ev) => setFormat(ev.target.value)}
            >
              <option value="json">JSON</option>
              <option value="md">Markdown</option>
            </select>
          </Field>
          <button onClick={exportEvaluation}>
            <Download size={16} /> Exportar decisões da Fase 1
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Inventário dos dois portais</h2>
            <p className="muted">
              Utilidade, complexidade e dependências são estimativas
              qualitativas.
            </p>
          </div>
          <Badge>
            {reviewed} de {evaluationCatalog.length} funcionalidades avaliadas
          </Badge>
        </div>
        <progress max={evaluationCatalog.length} value={reviewed} />
        <div className="filters">
          <select
            aria-label="Portal do inventário"
            value={filter}
            onChange={(ev) => setFilter(ev.target.value)}
          >
            <option value="">Ambos os portais</option>
            <option value="admin">Escritório</option>
            <option value="cliente">Cliente</option>
          </select>
          <input
            aria-label="Pesquisar funcionalidades"
            placeholder="Buscar módulo..."
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
          />
        </div>
        <div className="evaluation-list">
          {evaluationCatalog
            .filter(
              (m) =>
                (!filter || m.portal === filter) &&
                `${m.module} ${m.description}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((m) => {
              const d = e.decisions[m.id] || {
                choice: "",
                comment: "",
                priority: "Importante",
              };
              return (
                <div key={m.id} className="evaluation-row">
                  <div>
                    <Badge>
                      {m.portal === "admin" ? "Escritório" : "Cliente"}
                    </Badge>
                    <h3>{m.module}</h3>
                    <p>{m.description}</p>
                    <small>
                      Utilidade: {m.utility} · Complexidade futura:{" "}
                      {m.complexity}
                    </small>
                    <small>Dependências: {m.dependencies}</small>
                    <small>{m.status}</small>
                  </div>
                  <div>
                    <Field label={"Decisão: " + m.module}>
                      <select
                        value={d.choice}
                        onChange={(ev) =>
                          mutate((s) =>
                            DemoRepository.saveEvaluation(s, {
                              ...s.evaluation,
                              decisions: {
                                ...s.evaluation.decisions,
                                [m.id]: { ...d, choice: ev.target.value },
                              },
                            }),
                          )
                        }
                      >
                        <option value="">Avaliar</option>
                        {choices.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label={"Prioridade: " + m.module}>
                      <select
                        value={d.priority}
                        onChange={(ev) =>
                          mutate((s) => ({
                            ...s,
                            evaluation: {
                              ...s.evaluation,
                              decisions: {
                                ...s.evaluation.decisions,
                                [m.id]: { ...d, priority: ev.target.value },
                              },
                            },
                          }))
                        }
                      >
                        {["Crítico", "Importante", "Opcional"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label={"Observação: " + m.module}>
                    <textarea
                      value={d.comment}
                      onChange={(ev) =>
                        mutate((s) => ({
                          ...s,
                          evaluation: {
                            ...s.evaluation,
                            decisions: {
                              ...s.evaluation.decisions,
                              [m.id]: { ...d, comment: ev.target.value },
                            },
                          },
                        }))
                      }
                      placeholder="O que manter, melhorar ou repensar?"
                    />
                  </Field>
                </div>
              );
            })}
        </div>
      </section>
      <div className="two-columns">
        <section className="panel">
          <h2>Qualidade da experiência</h2>
          {ratings.map((r) => (
            <Field key={r} label={r}>
              <select
                value={e.ratings[r] || ""}
                onChange={(ev) =>
                  mutate((s) => ({
                    ...s,
                    evaluation: {
                      ...s.evaluation,
                      ratings: {
                        ...s.evaluation.ratings,
                        [r]: Number(ev.target.value),
                      },
                    },
                  }))
                }
              >
                <option value="" disabled>
                  Selecione uma nota
                </option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option value={n} key={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </section>
        <section className="panel">
          <h2>Adicionar funcionalidade ou objeção</h2>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              const f = new FormData(ev.currentTarget);
              mutate(
                (s) => ({
                  ...s,
                  evaluation: {
                    ...s.evaluation,
                    suggestions: [
                      ...s.evaluation.suggestions,
                      {
                        id: uid("SUGESTAO-DEMO"),
                        title: String(f.get("title")),
                        description: String(f.get("description")),
                        portal: String(f.get("portal")),
                        priority: String(f.get("priority")),
                      },
                    ],
                  },
                }),
                "Sugestão de escopo registrada neste navegador.",
              );
              ev.currentTarget.reset();
            }}
          >
            <Field label="Título da sugestão *">
              <input name="title" required minLength={3} />
            </Field>
            <Field label="Descrição / objeção *">
              <textarea name="description" required minLength={5} />
            </Field>
            <div className="form-grid">
              <Field label="Portal de destino">
                <select name="portal">
                  <option>Cliente</option>
                  <option>Escritório</option>
                  <option>Ambos</option>
                </select>
              </Field>
              <Field label="Prioridade da sugestão">
                <select name="priority">
                  <option>Crítico</option>
                  <option>Importante</option>
                  <option>Opcional</option>
                </select>
              </Field>
            </div>
            <button>
              <Plus size={15} /> Adicionar funcionalidade
            </button>
          </form>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Feedback dos clientes neste navegador</h2>
          <Badge>{feedback.length} opiniões no contexto</Badge>
        </div>
        <p className="notice">
          Nenhum feedback foi enviado pela rede. Registros abaixo foram criados
          no portal do cliente deste mesmo navegador.
        </p>
        {feedback.map((f) => (
          <article className="feedback-card" key={f.id}>
            <h3>{state.companies.find((c) => c.id === f.companyId)?.name}</h3>
            <small>
              {f.screen} · {displayDate(f.at)}
            </small>
            <p>{f.text}</p>
            <div className="actions">
              {Object.entries(f.ratings).map(([r, n]) => (
                <Badge key={r}>
                  {r}: {n}/5
                </Badge>
              ))}
            </div>
          </article>
        ))}
        {!feedback.length && (
          <Empty title="Nenhum feedback local neste contexto">
            <p>
              Use Minha opinião no Portal do Cliente e retorne a este centro no
              mesmo navegador.
            </p>
          </Empty>
        )}
      </section>
      <section className="panel">
        <h2>Quadro de decisões e resumo para a Fase 2</h2>
        <div className="kanban">
          {choices.map((c) => (
            <div key={c}>
              <h3>
                {c} ·{" "}
                {
                  evaluationCatalog.filter(
                    (m) => e.decisions[m.id]?.choice === c,
                  ).length
                }
              </h3>
              {evaluationCatalog
                .filter((m) => e.decisions[m.id]?.choice === c)
                .map((m) => (
                  <article key={m.id}>
                    <strong>{m.module}</strong>
                    <small>
                      {m.portal} · {e.decisions[m.id]?.priority}
                    </small>
                    <p>{e.decisions[m.id]?.comment}</p>
                  </article>
                ))}
            </div>
          ))}
        </div>
        <p className="notice">
          Escopo aprovado para revisão: Manter + Melhorar. Adiar indica escopo
          futuro; Remover indica rejeição. Nenhuma decisão autoriza integração
          ou operação fiscal real.
        </p>
      </section>
      <section className="panel">
        <h2>Novas sugestões priorizadas</h2>
        {["Crítico", "Importante", "Opcional"].map((p) => (
          <div key={p}>
            <h3 className="suggestion-priority">{p}</h3>
            {e.suggestions
              .filter((s) => s.priority === p)
              .map((s) => (
                <article className="feedback-card" key={s.id}>
                  <strong>{s.title}</strong>
                  <small>{s.portal}</small>
                  <p>{s.description}</p>
                </article>
              ))}
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Checklist de aceitação · {e.checklist.length}/25</h2>
        <div className="form-grid">
          {acceptanceJourneys.map((j) => (
            <label className="check" key={j}>
              <input
                type="checkbox"
                checked={e.checklist.includes(j)}
                onChange={(ev) =>
                  mutate((s) => ({
                    ...s,
                    evaluation: {
                      ...s.evaluation,
                      checklist: ev.target.checked
                        ? [...s.evaluation.checklist, j]
                        : s.evaluation.checklist.filter((x) => x !== j),
                    },
                  }))
                }
              />
              {j}
            </label>
          ))}
        </div>
      </section>
      <button className="secondary" onClick={() => setReset(true)}>
        Restaurar avaliação
      </button>
      {reset && (
        <Modal
          title="Restaurar somente a avaliação?"
          close={() => setReset(false)}
        >
          <p>
            Decisões, notas e sugestões do escritório serão limpas. Notas DEMO,
            cadastros, tickets e feedback do cliente serão preservados.
          </p>
          <button
            onClick={() => {
              mutate(
                (s) => ({
                  ...s,
                  evaluation: {
                    decisions: {},
                    ratings: {},
                    suggestions: [],
                    checklist: [],
                  },
                }),
                "Avaliação do escritório restaurada. Demais dados preservados.",
              );
              setReset(false);
            }}
          >
            Confirmar restauração da avaliação
          </button>
        </Modal>
      )}
    </>
  );
}
