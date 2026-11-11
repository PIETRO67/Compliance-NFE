import { z } from "zod";
import { seed } from "../data/seed";
import { draftErrors } from "../domain/rules-demo";
import type {
  DemoState,
  Draft,
  Feedback,
  Invoice,
  InvoiceFilters,
  InvoiceStatus,
} from "../domain/models";
import { listInvoices } from "./selectors";
export const STORAGE_KEY = "ia-nfse-demo:v2";
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const strings = z.array(z.string());
const draftSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  recipientId: z.string(),
  serviceId: z.string(),
  date: z.string(),
  value: z.string(),
  discount: z.string(),
  deduction: z.string(),
  description: z.string(),
  municipality: z.string(),
  intermediary: z.string(),
  classification: z.string(),
  observations: z.string(),
  withheld: z.boolean(),
  retentions: z.string(),
  ibsOperation: z.string(),
  ibsClassification: z.string(),
  ibsSummary: z.string(),
  step: z.number().int().min(0).max(4),
  updated: z.string(),
});
const messageSchema = z.object({
  author: z.string(),
  body: z.string(),
  at: z.string(),
});
const stateSchema = z.object({
  version: z.literal(2),
  companies: z
    .array(
      z.object({
        id: z.string(),
        clientId: z.string(),
        name: z.string(),
        document: z.string(),
        city: z.string(),
        regime: z.string(),
        owner: z.string(),
        address: z.string(),
        active: z.boolean(),
      }),
    )
    .min(1),
  accounts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      owner: z.string(),
      active: z.boolean(),
    }),
  ),
  recipients: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      name: z.string(),
      document: z.string(),
      email: z.string(),
      city: z.string(),
      active: z.boolean(),
    }),
  ),
  services: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      name: z.string(),
      description: z.string(),
      code: z.string(),
      category: z.string(),
      favorite: z.boolean(),
      order: z.number(),
      active: z.boolean(),
    }),
  ),
  invoices: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      recipientId: z.string(),
      serviceId: z.string(),
      date: z.string(),
      value: z.number().finite(),
      gross: z.number().finite(),
      discount: z.number(),
      deduction: z.number(),
      description: z.string(),
      status: z.enum([
        "Emitida (simulação)",
        "Cancelada (simulação)",
        "Substituída (simulação)",
        "Erro simulado",
      ]),
      received: z.boolean(),
      previousId: z.string().optional(),
      observations: z.string(),
      events: strings,
      annotations: strings,
    }),
  ),
  drafts: z.array(draftSchema),
  working: z.record(z.string(), draftSchema),
  pending: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      title: z.string(),
      priority: z.string(),
      owner: z.string(),
      due: z.string(),
      resolved: z.boolean(),
      comment: z.string(),
    }),
  ),
  certificates: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      holder: z.string(),
      expires: z.string(),
      status: z.enum([
        "Simulado válido",
        "Vence em breve — simulado",
        "Simulado expirado",
      ]),
      owner: z.string(),
    }),
  ),
  users: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      clientId: z.string(),
      companyIds: strings,
      role: z.string(),
      active: z.boolean(),
    }),
  ),
  tickets: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      subject: z.string(),
      category: z.string(),
      invoiceId: z.string(),
      description: z.string(),
      urgency: z.string(),
      status: z.enum(["Aberto", "Em atendimento", "Encerrado"]),
      messages: z.array(messageSchema),
      at: z.string(),
    }),
  ),
  feedback: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      ratings: z.record(z.string(), z.number().min(1).max(5)),
      text: z.string(),
      screen: z.string(),
      at: z.string(),
    }),
  ),
  activities: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      message: z.string(),
      at: z.string(),
    }),
  ),
  notifications: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      title: z.string(),
      href: z.string(),
      read: z.boolean(),
      muted: z.boolean(),
    }),
  ),
  evaluation: z.object({
    decisions: z.record(
      z.string(),
      z.object({
        choice: z.string(),
        comment: z.string(),
        priority: z.string(),
      }),
    ),
    ratings: z.record(z.string(), z.number().min(1).max(5)),
    suggestions: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        portal: z.string(),
        priority: z.string(),
      }),
    ),
    checklist: strings,
  }),
  preferences: z.object({
    theme: z.enum(["light", "dark"]),
    density: z.enum(["comfortable", "compact"]),
    alerts: z.boolean(),
    hints: z.boolean(),
    adminRole: z.enum([
      "Administrador IA Compliance",
      "Analista do Escritório",
    ]),
    clientRole: z.enum([
      "Gestor do Cliente",
      "Emissor do Cliente",
      "Consulta do Cliente",
    ]),
    adminCompany: z.string(),
    portalCompany: z.string(),
    portalClientId: z.string(),
    adminPeriod: z.string(),
    portalPeriod: z.string(),
    fromAdmin: z.boolean(),
  }),
});
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const DemoRepository = {
  load(storage: StorageAdapter): { state: DemoState; restored: boolean } {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { state: seed(), restored: false };
      const parsed = stateSchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        const d = parsed.data;
        const known = new Set(d.companies.map((c) => c.id));
        if (
          [
            ...d.invoices,
            ...d.recipients,
            ...d.services,
            ...d.drafts,
            ...d.tickets,
          ].every((r) => known.has(r.companyId)) &&
          known.has(d.preferences.portalCompany)
        )
          return { state: d, restored: false };
      }
    } catch {}
    return { state: seed(), restored: true };
  },
  save(storage: StorageAdapter, state: DemoState) {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  reset: seed,
  listCompanies(state: DemoState) {
    return state.companies;
  },
  listInvoices(state: DemoState, filters: InvoiceFilters = {}) {
    return listInvoices(state, filters);
  },
  saveDraft(state: DemoState, draft: Draft): DemoState {
    if (!state.companies.some((c) => c.id === draft.companyId))
      throw new Error("Prestador demonstrativo não encontrado.");
    const d = {
      ...draft,
      id: draft.id || uid("RASC-DEMO"),
      updated: new Date().toISOString(),
    };
    return {
      ...state,
      drafts: [d, ...state.drafts.filter((x) => x.id !== d.id)],
      working: { ...state.working, [d.companyId]: d },
    };
  },
  simulateIssue(
    state: DemoState,
    draft: Draft,
  ): { state: DemoState; invoice: Invoice } {
    if (Object.keys(draftErrors(draft, state)).length)
      throw new Error("Revise os campos obrigatórios antes de simular.");
    const invoice: Invoice = {
      id: uid("DEMO-NFSE"),
      companyId: draft.companyId,
      recipientId: draft.recipientId,
      serviceId: draft.serviceId,
      date: draft.date,
      gross: Number(draft.value),
      discount: Number(draft.discount),
      deduction: Number(draft.deduction),
      value: Number(draft.value) - Number(draft.discount),
      description: draft.description,
      status: "Emitida (simulação)",
      received: false,
      observations: draft.observations,
      events: ["Emissão simulada criada neste navegador. Nenhum envio fiscal."],
      annotations: [],
    };
    const working = { ...state.working };
    delete working[draft.companyId];
    return {
      invoice,
      state: {
        ...state,
        invoices: [invoice, ...state.invoices],
        drafts: state.drafts.filter((d) => d.id !== draft.id),
        working,
      },
    };
  },
  updateInvoiceStatus(
    state: DemoState,
    id: string,
    companyId: string,
    status: InvoiceStatus,
    reason: string,
  ): DemoState {
    const note = state.invoices.find(
      (n) => n.id === id && n.companyId === companyId,
    );
    if (!note)
      throw new Error("Documento não pertence ao contexto selecionado.");
    if (reason.trim().length < 5)
      throw new Error(
        "Informe uma justificativa demonstrativa com pelo menos 5 caracteres.",
      );
    if (note.status !== "Emitida (simulação)" || note.received)
      throw new Error("Ação indisponível para a situação demonstrativa atual.");
    const invoice = {
      ...note,
      status,
      events: [...note.events, `${status} — ${reason}`],
    };
    let invoices = state.invoices.map((n) => (n.id === id ? invoice : n));
    if (status === "Substituída (simulação)")
      invoices = [
        {
          ...note,
          id: uid("DEMO-NFSE"),
          previousId: note.id,
          status: "Emitida (simulação)",
          events: [`Substitui ${note.id} em simulação local.`],
        },
        ...invoices,
      ];
    return { ...state, invoices };
  },
  listFeedback(state: DemoState, companyId = "all") {
    return state.feedback.filter(
      (f) => companyId === "all" || f.companyId === companyId,
    );
  },
  saveFeedback(state: DemoState, feedback: Feedback) {
    return { ...state, feedback: [feedback, ...state.feedback] };
  },
  saveEvaluation(state: DemoState, evaluation: DemoState["evaluation"]) {
    return { ...state, evaluation };
  },
};
