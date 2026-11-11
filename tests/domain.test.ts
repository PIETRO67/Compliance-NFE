import test from "node:test";
import assert from "node:assert/strict";
import { seed, emptyDraft } from "../src/data/seed";
import { DemoRepository, STORAGE_KEY } from "../src/demo/DemoRepository";
import {
  activeRevenue,
  listInvoices,
  permittedCompanies,
} from "../src/demo/selectors";
import { draftErrors, documentSchema } from "../src/domain/rules-demo";
import {
  canIssue,
  canManageTeam,
  canAdminister,
} from "../src/domain/permissions-demo";
import { currency, csvCell, watermark } from "../src/lib/formatters";
function memory(initial?: string) {
  let raw = initial || null;
  return {
    getItem: (key: string) => (key === STORAGE_KEY ? raw : null),
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
}
function validDraft() {
  const s = seed();
  return {
    ...emptyDraft("DEMO-1"),
    recipientId: s.recipients.find((t) => t.companyId === "DEMO-1")!.id,
    serviceId: s.services.find((t) => t.companyId === "DEMO-1")!.id,
    value: "2000",
    description: "Serviço inteiramente fictício.",
  };
}
test("seed V2 possui volumes e relacionamentos consistentes", () => {
  const s = seed();
  assert.equal(s.accounts.length, 8);
  assert.equal(s.companies.length, 12);
  assert.equal(s.invoices.length, 108);
  assert.equal(s.recipients.length, 36);
  assert.equal(s.services.length, 18);
  assert.equal(s.drafts.length, 12);
  assert.equal(s.pending.length, 10);
  assert.equal(s.notifications.length, 12);
  assert.equal(s.certificates.length, 8);
  assert.equal(s.tickets.length, 6);
  for (const c of s.companies) {
    assert.ok(s.accounts.some((a) => a.id === c.clientId));
    assert.ok(s.recipients.some((t) => t.companyId === c.id));
    assert.ok(s.services.some((t) => t.companyId === c.id));
  }
  for (const n of s.invoices) {
    assert.equal(
      s.recipients.find((t) => t.id === n.recipientId)?.companyId,
      n.companyId,
    );
    assert.equal(
      s.services.find((t) => t.id === n.serviceId)?.companyId,
      n.companyId,
    );
  }
});
test("seletores por CNPJ não misturam documentos e os totais reconciliam", () => {
  const s = seed();
  const sums = s.companies.reduce((sum, c) => {
    const ns = listInvoices(s, { companyId: c.id });
    assert.ok(ns.every((n) => n.companyId === c.id));
    return sum + activeRevenue(ns);
  }, 0);
  assert.equal(sums, activeRevenue(s.invoices));
  assert.equal(
    listInvoices(s, { companyId: "DEMO-1", period: "2026-11" }).every((n) =>
      n.date.startsWith("2026-11"),
    ),
    true,
  );
});
test("emissão rejeita tomador e serviço de outro CNPJ", () => {
  const s = seed();
  const d = validDraft();
  assert.deepEqual(draftErrors(d, s), {});
  assert.throws(() =>
    DemoRepository.simulateIssue(s, { ...d, recipientId: "T-2" }),
  );
  assert.throws(() =>
    DemoRepository.simulateIssue(s, { ...d, serviceId: "S-2" }),
  );
});
test("campos inválidos: zero, data impossível e documento real", () => {
  const s = seed();
  assert.ok(draftErrors({ ...validDraft(), value: "0" }, s).value);
  assert.ok(draftErrors({ ...validDraft(), date: "2026-02-31" }, s).date);
  assert.ok(draftErrors({ ...validDraft(), discount: "3000" }, s).discount);
  assert.equal(documentSchema.safeParse("12.345.678/0001-90").success, false);
  assert.equal(documentSchema.safeParse("DOC-DEMO-LOCAL").success, true);
});
test("rascunho persiste e retoma por CNPJ sem transferir dados", () => {
  const store = memory();
  const saved = DemoRepository.saveDraft(seed(), { ...validDraft(), step: 3 });
  DemoRepository.save(store, saved);
  const loaded = DemoRepository.load(store);
  assert.equal(loaded.restored, false);
  assert.equal(loaded.state.working["DEMO-1"].step, 3);
  assert.equal(loaded.state.working["DEMO-2"], undefined);
});
test("payload antigo, inválido ou com registros desconhecidos restaura seed", () => {
  for (const value of [
    "{oops",
    "{}",
    JSON.stringify({ ...seed(), version: 1 }),
    JSON.stringify({ ...seed(), invoices: [{ companyId: "FORA" }] }),
  ]) {
    const loaded = DemoRepository.load(memory(value));
    assert.equal(loaded.restored, true);
    assert.equal(loaded.state.invoices.length, 108);
  }
});
test("emissão cria uma nota, substituição preserva total e cancelamento retira valor", () => {
  const s = seed();
  const before = activeRevenue(s.invoices);
  const result = DemoRepository.simulateIssue(s, validDraft());
  assert.equal(result.state.invoices.length, 109);
  assert.equal(activeRevenue(result.state.invoices), before + 2000);
  const replaced = DemoRepository.updateInvoiceStatus(
    result.state,
    result.invoice.id,
    "DEMO-1",
    "Substituída (simulação)",
    "Revisão fictícia",
  );
  assert.equal(replaced.invoices[0].previousId, result.invoice.id);
  assert.equal(activeRevenue(replaced.invoices), before + 2000);
  const canceled = DemoRepository.updateInvoiceStatus(
    replaced,
    replaced.invoices[0].id,
    "DEMO-1",
    "Cancelada (simulação)",
    "Justificativa fictícia",
  );
  assert.equal(activeRevenue(canceled.invoices), before);
  assert.throws(() =>
    DemoRepository.updateInvoiceStatus(
      result.state,
      result.invoice.id,
      "DEMO-2",
      "Cancelada (simulação)",
      "Teste fictício",
    ),
  );
});
test("feedback e decisões compartilham armazenamento apenas local", () => {
  const s = seed();
  const changed = DemoRepository.saveFeedback(s, {
    id: "FB-DEMO",
    companyId: "DEMO-1",
    ratings: { Clareza: 5 },
    text: "Revisão fictícia.",
    screen: "Portal",
    at: "2026-11-11",
  });
  const evaluated = DemoRepository.saveEvaluation(changed, {
    ...s.evaluation,
    decisions: {
      "MOD-1": {
        choice: "Manter",
        comment: "Aprovado para revisão",
        priority: "Crítico",
      },
    },
  });
  const store = memory();
  DemoRepository.save(store, evaluated);
  assert.equal(
    DemoRepository.load(store).state.feedback[0].text,
    "Revisão fictícia.",
  );
  assert.equal(
    DemoRepository.load(store).state.evaluation.decisions["MOD-1"].choice,
    "Manter",
  );
});
test("personas visuais e empresas autorizadas do mock", () => {
  const s = seed();
  assert.deepEqual(
    permittedCompanies(s).map((c) => c.id),
    ["DEMO-1", "DEMO-9"],
  );
  s.preferences.clientRole = "Emissor do Cliente";
  assert.deepEqual(
    permittedCompanies(s).map((c) => c.id),
    ["DEMO-1"],
  );
  assert.equal(canIssue("Consulta do Cliente"), false);
  assert.equal(canManageTeam("Emissor do Cliente"), false);
  assert.equal(canAdminister("Analista do Escritório"), false);
});
test("reset independente, formatação e exportação com aviso", () => {
  const s = seed();
  s.invoices.pop();
  assert.equal(seed().invoices.length, 108);
  assert.match(currency(1234.5), /1\.234,50/);
  assert.equal(csvCell('A;"B"'), '"A;""B"""');
  assert.match(watermark, /SEM VALIDADE FISCAL/);
});
