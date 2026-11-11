import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("gestão local: nova conta/CNPJ, pendências, acesso visual, menu e CSV", async ({
  page,
}) => {
  await page.goto("/admin/clientes");
  await page
    .getByRole("button", { name: "Adicionar conta cliente DEMO" })
    .click();
  await page
    .getByLabel("Nome fictício *", { exact: true })
    .fill("Conta Revisão V2 DEMO");
  await page.getByLabel("Confirmo que estes dados").check();
  await page.getByRole("button", { name: "Salvar conta cliente demo" }).click();
  await page
    .getByRole("link", { name: "Conta Revisão V2 DEMO", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conta Revisão V2 DEMO", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/empresas");
  await page.getByRole("button", { name: "Adicionar empresa DEMO" }).click();
  await page
    .getByLabel("Nome fictício *", { exact: true })
    .fill("Empresa Revisão V2 DEMO");
  await page
    .getByLabel("Conta cliente vinculada")
    .selectOption({ label: "Conta Revisão V2 DEMO" });
  await page.getByLabel("Confirmo que estes dados").check();
  await page.getByRole("button", { name: "Salvar empresa demo" }).click();
  await page
    .getByRole("link", { name: "Empresa Revisão V2 DEMO", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Empresa Revisão V2 DEMO", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recolher menu lateral" }).click();
  await page.getByRole("button", { name: "Expandir menu lateral" }).click();
  await page.goto("/admin/pendencias");
  await page
    .getByRole("button", { name: "Atribuir / comentar" })
    .first()
    .click();
  await page.getByLabel("Responsável fictício").selectOption("Rafael Lima");
  await page
    .getByLabel("Comentário interno fictício")
    .fill("Revisão demonstrativa da pendência.");
  await page.getByRole("button", { name: "Salvar atribuição local" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Rafael Lima");
  await page
    .getByRole("button", { name: "Resolver", exact: true })
    .first()
    .click();
  await page.getByLabel("Situação da pendência").selectOption("resolved");
  await expect(
    page.getByRole("button", { name: "Reabrir", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Reabrir", exact: true }).click();
  await page.goto("/admin/usuarios");
  await page
    .getByRole("button", { name: "Revogar acesso simulado" })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirmar alteração visual" })
    .click();
  await expect(
    page.getByRole("button", { name: "Conceder acesso simulado" }),
  ).toHaveCount(1);
  await page.goto("/admin/notas");
  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV DEMO" }).click(),
  ]);
  expect(await readFile((await csv.path())!, "utf8")).toContain(
    "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL",
  );
});
async function enterClient(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Acessar portal do cliente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meu início", exact: true }),
  ).toBeVisible();
}
test("dois portais, isolamento visual, emissão rápida, eventos e impressão DEMO", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!["localhost", "127.0.0.1"].includes(new URL(r.url()).hostname))
      external.push(r.url());
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Acessar painel administrativo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Visão geral da carteira", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Empresa do escritório")).toHaveValue("all");
  await page.getByLabel("Perfil DEMO").selectOption("Analista do Escritório");
  await page.goto("/admin/empresas");
  await expect(
    page.getByRole("button", { name: "Adicionar empresa DEMO" }),
  ).toBeDisabled();
  await page
    .getByLabel("Perfil DEMO")
    .selectOption("Administrador IA Compliance");
  await page.goto("/admin/empresas/DEMO-1");
  await page
    .getByRole("button", { name: "Ver portal desta empresa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir portal desta empresa" })
    .click();
  await expect(page.locator(".app")).toHaveClass(/portal-app/);
  await expect(page.getByLabel("Empresa do portal")).not.toContainText(
    "Todas as empresas",
  );
  await expect(page.getByRole("navigation")).not.toContainText("Centro fiscal");
  await page.goto("/portal/notas");
  await expect(page.locator(".content")).not.toContainText(
    "Vértice Tecnologia",
  );
  await page.goto("/portal/notas/DEMO-NFSE-000002");
  await expect(
    page.getByRole("heading", {
      name: "Documento indisponível neste contexto",
    }),
  ).toBeVisible();
  await expect(page.locator(".content")).not.toContainText(
    "Vértice Tecnologia",
  );
  await page.goto("/portal/emitir/rapida");
  await page
    .getByLabel("Tomador fictício *", { exact: true })
    .selectOption("T-1");
  await page
    .getByLabel("Serviço favorito *", { exact: true })
    .selectOption("S-1");
  await page.getByLabel("Valor bruto (R$) *", { exact: true }).fill("2500");
  await page.getByLabel("Compreendo que esta simulação").check();
  await page
    .getByRole("button", { name: "Simular emissão", exact: true })
    .click();
  await expect(page.locator(".note-detail h2")).toContainText("DEMO-NFSE-");
  await expect(page.locator(".detail-value")).toHaveText(/2\.500,00/);
  await page.getByRole("button", { name: "Ver prévia DEMO" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".demo-document")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Simular substituição" }).click();
  await page
    .getByLabel("Justificativa demonstrativa *", { exact: true })
    .fill("Revisão de exemplo");
  await page.getByRole("button", { name: "Confirmar simulação" }).click();
  await expect(page.getByText("Substitui registro DEMO:")).toBeVisible();
  await page.getByRole("button", { name: "Simular cancelamento" }).click();
  await page
    .getByLabel("Justificativa demonstrativa *", { exact: true })
    .fill("Cancelamento de exemplo");
  await page.getByRole("button", { name: "Confirmar simulação" }).click();
  await page.reload();
  await expect(page.locator(".detail-actions .badge")).toHaveText(
    "Cancelada (simulação)",
  );
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("cinco etapas, cadastro por CNPJ, persistência, rejeição recuperável e duplicação", async ({
  page,
}) => {
  await enterClient(page);
  await page.goto("/portal/tomadores");
  await page.getByRole("button", { name: "Novo tomador DEMO" }).click();
  await page
    .getByLabel("Nome fictício *", { exact: true })
    .fill("Tomador V2 DEMO");
  await page.getByLabel("Confirmo que estes dados").check();
  await page.getByRole("button", { name: "Salvar tomador demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Tomador V2 DEMO" }),
  ).toBeVisible();
  await page.goto("/portal/servicos");
  await page.getByRole("button", { name: "Novo serviço favorito" }).click();
  await page
    .getByLabel("Nome fictício *", { exact: true })
    .fill("Serviço V2 DEMO");
  await page
    .getByLabel("Descrição de exemplo *", { exact: true })
    .fill("Consultoria fictícia para revisão V2.");
  await page.getByLabel("Confirmo que estes dados").check();
  await page
    .getByRole("button", { name: "Salvar serviço favorito demo" })
    .click();
  await page.goto("/portal/emitir/completa");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await expect(page.locator(".field-error")).toContainText(
    "Selecione um tomador",
  );
  await page
    .getByLabel("Tomador fictício *", { exact: true })
    .selectOption({ label: "Tomador V2 DEMO" });
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page
    .getByLabel("Serviço demonstrativo *", { exact: true })
    .selectOption({ label: "Serviço V2 DEMO · EX-SERV-LOCAL" });
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByLabel("Valor bruto (R$) *", { exact: true }).fill("3200");
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByLabel("Valor bruto (R$) *", { exact: true }),
  ).toHaveValue("3200");
  await page.goto("/portal/rascunhos");
  await page
    .locator(".card-grid .panel")
    .filter({ hasText: "Tomador V2 DEMO" })
    .getByRole("button", { name: "Retomar rascunho" })
    .click();
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByLabel("Compreendo que esta simulação").check();
  await page.getByRole("button", { name: "Testar rejeição simulada" }).click();
  await page
    .getByRole("button", { name: "Simular emissão", exact: true })
    .click();
  await expect(page.locator(".error")).toContainText("Rejeição simulada");
  await page.getByRole("button", { name: "Editar e tentar novamente" }).click();
  await page
    .getByRole("button", { name: "Simular emissão", exact: true })
    .click();
  await expect(page.locator(".note-detail h2")).toBeVisible();
  await page.getByRole("button", { name: "Duplicar como rascunho" }).click();
  await expect(
    page.getByRole("heading", { name: "1. Prestador" }),
  ).toBeVisible();
  await expect(page.locator(".preview-card")).toContainText("3.200,00");
});
test("suporte e feedback entre portais, decisão exportada e reset seletivo", async ({
  page,
}) => {
  await enterClient(page);
  await page.goto("/portal/ajuda");
  await page
    .getByLabel("Assunto fictício *", { exact: true })
    .fill("Ajuda V2 DEMO");
  await page
    .getByLabel("Descrição fictícia *", { exact: true })
    .fill("Preciso de orientação fictícia para testar o atendimento.");
  await page
    .getByRole("button", { name: "Criar pedido de ajuda local" })
    .click();
  await page.goto("/portal/feedback");
  for (const name of [
    "Rapidez",
    "Facilidade de emissão",
    "Clareza",
    "Mobile",
    "Utilidade",
  ])
    await page.getByLabel(name + " *", { exact: true }).selectOption("5");
  await page
    .getByLabel("O que melhorar? *", { exact: true })
    .fill("Feedback V2 para revisão da experiência.");
  await page.getByRole("button", { name: "Enviar avaliação (local)" }).click();
  await page.goto("/admin/suporte");
  const ticket = page
    .locator("details.ticket-card")
    .filter({ hasText: "Ajuda V2 DEMO" });
  await ticket.locator("summary").click();
  await ticket
    .locator("textarea")
    .fill("Resposta demonstrativa do escritório.");
  await ticket
    .getByRole("button", { name: "Adicionar resposta local" })
    .click();
  await ticket.getByRole("button", { name: "Encerrar ticket" }).click();
  await page.goto("/portal/ajuda");
  await expect(
    page.locator("details.ticket-card").filter({ hasText: "Ajuda V2 DEMO" }),
  ).toContainText("Encerrado");
  await page.goto("/admin/avaliacao");
  await expect(
    page
      .locator(".feedback-card")
      .filter({ hasText: "Feedback V2 para revisão" }),
  ).toBeVisible();
  await page
    .getByLabel("Decisão: Carteira executiva", { exact: true })
    .selectOption("Manter");
  await page
    .getByLabel("Observação: Carteira executiva", { exact: true })
    .fill("Aprovado para revisão da Fase 2");
  await page.getByLabel("Identidade visual", { exact: true }).selectOption("5");
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar decisões da Fase 1" }).click(),
  ]);
  const content = JSON.parse(
    (await readFile((await file.path())!, "utf8")).replace(/^\uFEFF/, ""),
  );
  expect(content.matrix[0].decision.choice).toBe("Manter");
  expect(content.clientFeedback[0].text).toContain("Feedback V2");
  await page
    .getByRole("button", { name: "Restaurar avaliação", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar restauração da avaliação" })
    .click();
  await expect(
    page.getByLabel("Decisão: Carteira executiva", { exact: true }),
  ).toHaveValue("");
  await expect(
    page
      .locator(".feedback-card")
      .filter({ hasText: "Feedback V2 para revisão" }),
  ).toBeVisible();
});
test("Consulta, temas, troca explícita de CNPJ e restauração completa", async ({
  page,
}) => {
  await enterClient(page);
  await page.getByLabel("Perfil DEMO").selectOption("Consulta do Cliente");
  await page.goto("/portal/emitir/rapida");
  await expect(
    page.getByRole("heading", {
      name: "Emissão indisponível para o perfil Consulta",
    }),
  ).toBeVisible();
  await page.goto("/portal/tomadores");
  await expect(
    page.getByRole("button", { name: "Novo tomador DEMO" }),
  ).toBeDisabled();
  await page.getByLabel("Perfil DEMO").selectOption("Gestor do Cliente");
  await page.goto("/portal/emitir/completa");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page
    .getByLabel("Tomador fictício *", { exact: true })
    .selectOption("T-1");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await page
    .getByRole("button", { name: "Trocar empresa", exact: true })
    .click();
  await page
    .getByLabel("Próxima empresa autorizada na simulação")
    .selectOption("DEMO-9");
  await page.getByRole("button", { name: "Salvar anterior e trocar" }).click();
  await expect(page.getByLabel("Empresa do portal")).toHaveValue("DEMO-9");
  await page.goto("/portal/tomadores");
  await expect(page.locator(".content")).not.toContainText(
    "Instituto Horizonte DEMO 1",
  );
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/dark/);
  await page.goto("/admin/configuracoes");
  await page
    .getByRole("button", { name: "Restaurar demonstração", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar restauração completa" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("ia-nfse-demo:v2") || "{}").invoices
            ?.length,
      ),
    )
    .toBe(108);
});
test("rotas, 404 e responsividade dos dois portais", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const paths = [
    "/",
    "/demonstracao",
    "/admin",
    "/admin/clientes",
    "/admin/clientes/CONTA-1",
    "/admin/empresas",
    "/admin/empresas/DEMO-1",
    "/admin/notas",
    "/admin/notas/DEMO-NFSE-000001",
    "/admin/pendencias",
    "/admin/certificados",
    "/admin/usuarios",
    "/admin/relatorios",
    "/admin/atividades",
    "/admin/suporte",
    "/admin/notificacoes",
    "/admin/fiscal",
    "/admin/integracoes",
    "/admin/configuracoes",
    "/admin/avaliacao",
    "/portal",
    "/portal/emitir",
    "/portal/emitir/rapida",
    "/portal/emitir/completa",
    "/portal/notas",
    "/portal/notas/DEMO-NFSE-000001",
    "/portal/rascunhos",
    "/portal/tomadores",
    "/portal/servicos",
    "/portal/relatorios",
    "/portal/ajuda",
    "/portal/perfil",
    "/portal/feedback",
  ];
  for (const path of paths) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect((await request.get("/caminho-inexistente-v2")).status()).toBe(404);
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const area of ["admin", "portal"]) {
      await page.goto("/" + area);
      await expect(page.locator(".kpi").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${area} ${width}`,
      ).toBeTruthy();
      await page.screenshot({
        path: `test-results/v2-${area}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation", { name: "Navegação do cliente" })
    .getByRole("link", { name: "Minha opinião" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Minha opinião sobre o portal" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
