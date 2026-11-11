import { test, expect } from "@playwright/test";
test("diálogos mantêm foco durante digitação, ciclo Tab e Escape", async ({
  page,
}) => {
  await page.goto("/portal/notas/DEMO-NFSE-000013");
  await page.getByRole("button", { name: "Simular cancelamento" }).click();
  const field = page.getByLabel("Justificativa demonstrativa *", {
    exact: true,
  });
  await field.click();
  await field.pressSequentially("Motivo exclusivamente ficticio", {
    delay: 10,
  });
  await expect(field).toHaveValue("Motivo exclusivamente ficticio");
  await expect(field).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Simular cancelamento" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Busca global simulada" }).click();
  const search = page.getByLabel("Pesquisar no contexto atual");
  await search.click();
  await search.pressSequentially("Horizonte", { delay: 10 });
  await expect(search).toHaveValue("Horizonte");
  await expect(search).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Fechar diálogo" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("dialog").locator("a").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("cliente em celular: entrar, preencher, revisar e simular emissão rápida", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Acessar portal do cliente", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .getByRole("navigation", { name: "Navegação do cliente" })
    .getByRole("link", { name: "Emitir NFS-e", exact: true })
    .click();
  await page.getByRole("link", { name: "Começar emissão rápida" }).click();
  await page
    .getByLabel("Tomador fictício *", { exact: true })
    .selectOption("T-1");
  await page
    .getByLabel("Serviço favorito *", { exact: true })
    .selectOption("S-1");
  await page.getByLabel("Valor bruto (R$) *", { exact: true }).fill("1900");
  await page.getByLabel("Compreendo que esta simulação").check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/v2-emissao-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Simular emissão", exact: true })
    .click();
  await expect(page.locator(".detail-value")).toContainText("1.900,00");
  await page.getByRole("button", { name: "Ver prévia DEMO" }).click();
  await expect(page.getByRole("dialog")).toContainText("SEM VALIDADE FISCAL");
  await page.keyboard.press("Escape");
});
