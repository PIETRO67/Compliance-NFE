"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, FileText, Plus, RefreshCw } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { DemoRepository } from "../../demo/DemoRepository";
import { emptyDraft } from "../../data/seed";
import { draftErrors } from "../../domain/rules-demo";
import type { Draft } from "../../domain/models";
import { permittedCompanies } from "../../demo/selectors";
import { currency, fiscalDisclaimer } from "../../lib/formatters";
import { useWorkspace } from "../shared/workspace";
import { Field, Modal, Badge } from "../shared/ui";
import { EntityEditor } from "../shared/entity-editor";
import { DemoInvoicePreview } from "../shared/invoice-preview";
import { invoiceHref } from "../shared/invoice-table";
export function EmissionChoice() {
  const { editable } = useWorkspace();
  return (
    <>
      <p className="notice">
        Escolha um fluxo demonstrativo. Nenhum documento será enviado ao
        governo. Tempo de preenchimento é apenas orientação de UX.
      </p>
      {!editable && (
        <p className="error">
          Perfil Consulta do Cliente: emissão indisponível nesta demonstração
          visual. Altere a persona em Meu perfil para experimentar.
        </p>
      )}
      <div className="two-columns">
        {[
          [
            "rapida",
            "Emissão rápida",
            "Para serviços recorrentes",
            "Tomador, serviço favorito e valor. Revise o resumo e simule.",
          ],
          [
            "completa",
            "Emissão completa",
            "Para revisar todos os detalhes",
            "Cinco etapas guiadas com dados do prestador, pessoas, serviço e valores.",
          ],
        ].map(([route, title, subtitle, text]) => (
          <section className="panel emission-option" key={route}>
            <div className="option-icon">
              <FileText />
            </div>
            <span className="eyebrow">{subtitle}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            {editable ? (
              <Link
                className="button gold-button"
                href={"/portal/emitir/" + route}
              >
                Começar {title.toLowerCase()} <ArrowRight size={16} />
              </Link>
            ) : (
              <button disabled title="Perfil Consulta — somente visualização">
                Emissão indisponível · Consulta
              </button>
            )}
          </section>
        ))}
      </div>
      <section className="panel">
        <h2>Antes de começar</h2>
        <ol>
          <li>Use apenas cadastros fictícios do CNPJ selecionado.</li>
          <li>Confirme serviço, competência e valor demonstrativo.</li>
          <li>Revise o resumo. A ação final é uma simulação local.</li>
        </ol>
      </section>
    </>
  );
}
export function Emission({ quick = false }: { quick?: boolean }) {
  const { state, mutate, preferences, notify } = useDemo();
  const { companyId, company, editable } = useWorkspace();
  const router = useRouter();
  const draft = state.working[companyId] || {
    ...emptyDraft(companyId),
    municipality: company?.city || "",
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [failure, setFailure] = useState(false);
  const [ibs, setIbs] = useState("Dados da operação");
  const [entity, setEntity] = useState(false);
  const [preview, setPreview] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [nextCompany, setNextCompany] = useState(companyId);
  const [saving, setSaving] = useState(false);
  const allowed = permittedCompanies(state);
  const recipients = state.recipients.filter(
    (t) => t.companyId === companyId && t.active,
  );
  const services = state.services
    .filter(
      (s) => s.companyId === companyId && s.active && (!quick || s.favorite),
    )
    .sort((a, b) => a.order - b.order);
  const steps = [
    "Prestador",
    "Tomador",
    "Serviço",
    "Valores e tributação",
    "Revisão",
  ];
  const patch = (value: Partial<Draft>) => {
    setErrors({});
    mutate((s) => ({
      ...s,
      working: {
        ...s.working,
        [companyId]: { ...draft, ...value, updated: new Date().toISOString() },
      },
    }));
  };
  const save = () => {
    mutate(
      (s) => DemoRepository.saveDraft(s, draft),
      "Rascunho salvo neste navegador.",
      companyId,
    );
    setSaving(true);
  };
  function simulate() {
    const errs = draftErrors(draft, state);
    if (Object.keys(errs).length) {
      setErrors(errs);
      if (!quick)
        patch({
          step: errs.companyId
            ? 0
            : errs.recipientId
              ? 1
              : errs.serviceId || errs.description || errs.date
                ? 2
                : 3,
        });
      setErrors(errs);
      return;
    }
    if (!consent) {
      setErrors({
        consent: "Confirme que esta operação é exclusivamente demonstrativa.",
      });
      return;
    }
    if (failure) {
      setErrors({
        operation:
          "Rejeição simulada. Nenhuma nota foi criada. Edite ou selecione “Tentar novamente”.",
      });
      return;
    }
    const result = DemoRepository.simulateIssue(state, draft);
    mutate(
      () => result.state,
      "Emissão simulada realizada. Nenhum envio fiscal.",
      companyId,
    );
    router.push(invoiceHref(result.invoice, true));
  }
  if (!editable)
    return (
      <section className="panel">
        <h2>Emissão indisponível para o perfil Consulta</h2>
        <p>
          Permissão exclusivamente visual. Não existe segurança implementada
          nesta fase.
        </p>
        <Link className="button secondary" href="/portal/perfil">
          Ver perfis demonstrativos
        </Link>
      </section>
    );
  return (
    <>
      <div className="warning">
        AMBIENTE DE DEMONSTRAÇÃO — NÃO EMITE NOTAS FISCAIS
      </div>
      {!quick && (
        <div className="steps" aria-label="Progresso da emissão">
          {steps.map((s, i) => (
            <div
              key={s}
              aria-current={draft.step === i ? "step" : undefined}
              className={
                draft.step === i ? "current" : draft.step > i ? "complete" : ""
              }
            >
              <span>{draft.step > i ? <Check size={15} /> : i + 1}</span>
              {s}
            </div>
          ))}
        </div>
      )}
      <div className="wizard-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <h2>
              {quick
                ? "Preencha, revise e simule"
                : `${draft.step + 1}. ${steps[draft.step]}`}
            </h2>
            <Badge>{saving ? "Rascunho salvo" : "Autosave local"}</Badge>
          </div>
          <p className="muted">
            Informações fictícias salvas somente neste navegador, sem nuvem.
          </p>
          {(quick || draft.step === 0) && (
            <>
              <div className="prestador-card">
                <BuildingSummary
                  name={company?.name || ""}
                  document={company?.document || ""}
                  regime={company?.regime || ""}
                  city={company?.city || ""}
                />
                <button
                  className="secondary"
                  disabled={allowed.length < 2}
                  title={
                    allowed.length < 2
                      ? "Sua persona visual está vinculada somente a este CNPJ."
                      : "Troca explícita entre empresas da mesma conta fictícia"
                  }
                  onClick={() => {
                    setNextCompany(companyId);
                    setSwitching(true);
                  }}
                >
                  Trocar empresa
                </button>
              </div>
              <p>{company?.address}</p>
              <p className="notice">
                O prestador fica fixado ao CNPJ selecionado. A troca de empresa
                exige uma ação explícita e preservação do rascunho.
              </p>
            </>
          )}
          {(quick || draft.step === 1) && (
            <>
              <Field label="Tomador fictício *" error={errors.recipientId}>
                <select
                  required
                  value={draft.recipientId}
                  onChange={(e) => patch({ recipientId: e.target.value })}
                >
                  <option value="">Selecione um tomador desta empresa</option>
                  {recipients.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              {draft.recipientId && (
                <div className="notice">
                  {recipients.find((t) => t.id === draft.recipientId)?.document}
                  <br />
                  {
                    recipients.find((t) => t.id === draft.recipientId)?.email
                  } · {recipients.find((t) => t.id === draft.recipientId)?.city}
                </div>
              )}
              <button className="secondary" onClick={() => setEntity(true)}>
                <Plus size={15} /> Cadastrar tomador DEMO
              </button>
              {!quick && (
                <Field label="Intermediário ilustrativo (opcional)">
                  <input
                    value={draft.intermediary}
                    onChange={(e) => patch({ intermediary: e.target.value })}
                    placeholder="Nome exclusivamente fictício"
                  />
                </Field>
              )}
            </>
          )}
          {(quick || draft.step === 2) && (
            <>
              <Field
                label={quick ? "Serviço favorito *" : "Serviço demonstrativo *"}
                error={errors.serviceId}
              >
                <select
                  required
                  value={draft.serviceId}
                  onChange={(e) => {
                    const s = services.find((s) => s.id === e.target.value);
                    patch({
                      serviceId: e.target.value,
                      description: s?.description || "",
                      classification: s?.code || "",
                    });
                  }}
                >
                  <option value="">Selecione um serviço desta empresa</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.code}
                    </option>
                  ))}
                </select>
              </Field>
              {!services.length && (
                <p className="notice">
                  Cadastre ou favorite um serviço em{" "}
                  <Link href="/portal/servicos">Serviços favoritos</Link>.
                </p>
              )}
              <Field label="Descrição do serviço *" error={errors.description}>
                <textarea
                  required
                  minLength={5}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
              <div className="form-grid">
                <Field label="Competência *" error={errors.date}>
                  <input
                    required
                    type="date"
                    value={draft.date}
                    onChange={(e) => patch({ date: e.target.value })}
                  />
                </Field>
                {!quick && (
                  <Field label="Município de prestação / incidência">
                    <select
                      value={draft.municipality}
                      onChange={(e) => patch({ municipality: e.target.value })}
                    >
                      {[
                        "Itumbiara/GO",
                        "Goiânia/GO",
                        "Uberlândia/MG",
                        "Brasília/DF",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              {!quick && (
                <>
                  <Field
                    label="Lista de serviços / NBS (ilustrativo)"
                    hint={fiscalDisclaimer}
                  >
                    <input
                      value={draft.classification}
                      onChange={(e) =>
                        patch({ classification: e.target.value })
                      }
                      placeholder="EX-NBS — a confirmar na Fase 2"
                    />
                  </Field>
                  <Field label="Obra / evento / observações ilustrativas">
                    <textarea
                      value={draft.observations}
                      onChange={(e) => patch({ observations: e.target.value })}
                    />
                  </Field>
                </>
              )}
              <p className="notice">
                {fiscalDisclaimer}. Nenhum código ou enquadramento foi validado.
              </p>
            </>
          )}
          {(quick || draft.step === 3) && (
            <>
              <div className="form-grid">
                <Field label="Valor bruto (R$) *" error={errors.value}>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={draft.value}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>
                {!quick && (
                  <>
                    <Field
                      label="Descontos demonstrativos (R$)"
                      error={errors.discount}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.discount}
                        onChange={(e) => patch({ discount: e.target.value })}
                      />
                    </Field>
                    <Field
                      label="Deduções ilustrativas (R$)"
                      error={errors.deduction}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.deduction}
                        onChange={(e) => patch({ deduction: e.target.value })}
                      />
                    </Field>
                  </>
                )}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.withheld}
                  onChange={(e) => patch({ withheld: e.target.checked })}
                />{" "}
                Indicação ilustrativa de ISS retido — sem cálculo fiscal
              </label>
              {quick ? (
                <Field label="Observações (opcional)">
                  <textarea
                    value={draft.observations}
                    onChange={(e) => patch({ observations: e.target.value })}
                  />
                </Field>
              ) : (
                <>
                  <Field label="Retenções federais — anotação de layout">
                    <input
                      value={draft.retentions}
                      onChange={(e) => patch({ retentions: e.target.value })}
                      placeholder="A confirmar na Fase 2 — dados inventados"
                    />
                  </Field>
                  <details>
                    <summary>
                      Reforma Tributária — IBS/CBS (layout ilustrativo)
                    </summary>
                    <div className="tabs">
                      {[
                        "Dados da operação",
                        "Classificação ilustrativa",
                        "Resumo demonstrativo",
                      ].map((t) => (
                        <button
                          key={t}
                          className={ibs === t ? "selected" : ""}
                          onClick={() => setIbs(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p>
                      {fiscalDisclaimer}. CST, cClassTrib, NBS e créditos não
                      são consultados.
                    </p>
                    <Field label={ibs}>
                      <input
                        value={
                          ibs === "Dados da operação"
                            ? draft.ibsOperation
                            : ibs === "Classificação ilustrativa"
                              ? draft.ibsClassification
                              : draft.ibsSummary
                        }
                        onChange={(e) =>
                          patch({
                            [ibs === "Dados da operação"
                              ? "ibsOperation"
                              : ibs === "Classificação ilustrativa"
                                ? "ibsClassification"
                                : "ibsSummary"]: e.target.value,
                          })
                        }
                        placeholder={
                          ibs === "Classificação ilustrativa"
                            ? "EX-CST / EX-cClassTrib — não verificados"
                            : "Anotação exclusivamente ilustrativa"
                        }
                      />
                    </Field>
                  </details>
                  <p className="notice">
                    Exemplo matemático, não fiscal: valor demonstrativo = bruto
                    − desconto. Nenhum ISS, retenção, IBS ou CBS normativo é
                    calculado. Dedução é apenas campo de layout.
                  </p>
                </>
              )}
            </>
          )}
          {(quick || draft.step === 4) && (
            <>
              <div className="review-summary">
                <h3>Revise sua simulação</h3>
                <p>
                  {company?.name} →{" "}
                  {recipients.find((t) => t.id === draft.recipientId)?.name ||
                    "Tomador a selecionar"}
                </p>
                <p>
                  {draft.description || "Descrição a preencher"} · {draft.date}
                </p>
                <p>Município ilustrativo: {draft.municipality}</p>
                <strong>
                  {currency(
                    Number(draft.value || 0) - Number(draft.discount || 0),
                  )}
                </strong>
                <p>
                  {draft.withheld
                    ? "Indicação de retenção ilustrativa"
                    : "Sem indicação ilustrativa de retenção"}
                </p>
                <button className="secondary" onClick={() => setPreview(true)}>
                  Abrir prévia DEMO
                </button>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                Compreendo que esta simulação não emite nota fiscal.
              </label>
              {errors.consent && (
                <p role="alert" className="field-error">
                  {errors.consent}
                </p>
              )}
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setFailure(true);
                    setErrors({
                      operation:
                        "Rejeição simulada ativada. Seu rascunho foi preservado.",
                    });
                  }}
                >
                  Testar rejeição simulada
                </button>
                {failure && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setFailure(false);
                      setErrors({});
                      notify(
                        "Falha ilustrativa desativada. Revise e tente novamente.",
                      );
                    }}
                  >
                    <RefreshCw size={14} /> Editar e tentar novamente
                  </button>
                )}
              </div>
            </>
          )}
          {errors.operation && (
            <p role="alert" className="error">
              {errors.operation}
            </p>
          )}
          <div className="wizard-actions">
            <button className="secondary" onClick={save}>
              Salvar rascunho
            </button>
            <div className="actions">
              {!quick && draft.step > 0 && (
                <button
                  className="secondary"
                  onClick={() => patch({ step: draft.step - 1 })}
                >
                  Voltar
                </button>
              )}
              {quick || draft.step === 4 ? (
                <button className="gold-button" onClick={simulate}>
                  Simular emissão <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="gold-button"
                  onClick={() => {
                    const errs = draftErrors(draft, state, draft.step);
                    setErrors(errs);
                    if (!Object.keys(errs).length)
                      patch({ step: draft.step + 1 });
                  }}
                >
                  Próximo <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </section>
        <aside className="panel preview-card">
          <details open className="preview-details">
            <summary>Resumo e prévia ilustrativa</summary>
            <DemoInvoicePreview draft={draft} />
          </details>
        </aside>
      </div>
      {entity && (
        <EntityEditor
          kind="recipient"
          companyId={companyId}
          close={() => setEntity(false)}
        />
      )}
      {preview && (
        <Modal
          title="Prévia ilustrativa — sem validade fiscal"
          close={() => setPreview(false)}
        >
          <DemoInvoicePreview draft={draft} />
          <button onClick={() => window.print()}>Imprimir prévia DEMO</button>
        </Modal>
      )}
      {switching && (
        <Modal
          title="Trocar empresa e preservar o rascunho?"
          close={() => setSwitching(false)}
        >
          <p>
            O rascunho atual pertence a {company?.name}. Dados nunca serão
            transferidos para outro CNPJ.
          </p>
          <Field label="Próxima empresa autorizada na simulação">
            <select
              value={nextCompany}
              onChange={(e) => setNextCompany(e.target.value)}
            >
              {allowed.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name} · {c.document}
                </option>
              ))}
            </select>
          </Field>
          <div className="actions">
            <button className="secondary" onClick={() => setSwitching(false)}>
              Continuar editando
            </button>
            <button
              disabled={nextCompany === companyId}
              onClick={() => {
                save();
                preferences({ portalCompany: nextCompany });
                setSwitching(false);
                setConsent(false);
                setErrors({});
              }}
            >
              Salvar anterior e trocar
            </button>
            <button
              className="secondary"
              disabled={nextCompany === companyId}
              onClick={() => {
                mutate((s) => {
                  const working = { ...s.working };
                  delete working[companyId];
                  return { ...s, working };
                });
                preferences({ portalCompany: nextCompany });
                setSwitching(false);
                setConsent(false);
                setErrors({});
                notify(
                  "Edição não salva descartada. Rascunhos salvos foram preservados.",
                );
              }}
            >
              Descartar edição e trocar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function BuildingSummary({
  name,
  document,
  regime,
  city,
}: {
  name: string;
  document: string;
  regime: string;
  city: string;
}) {
  return (
    <div>
      <h3>{name}</h3>
      <p>
        {document} · {regime}
      </p>
      <p>{city}</p>
    </div>
  );
}
