import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { join } from "node:path";
interface Access {
  key: string;
  email: string;
  password: string;
  company_id: string | null;
  user_id: string;
}
const root = process.cwd();
const access = (
  JSON.parse(readFileSync(join(root, ".local", "m1-access.json"), "utf8")) as {
    users: Access[];
  }
).users;
const user = (key: string) => access.find((u) => u.key === key)!;
function resetDevAuth() {
  execFileSync(
    join(root, "backend", ".venv", "Scripts", "python.exe"),
    ["-m", "app.cli", "reset-development-auth"],
    {
      cwd: root,
      env: { ...process.env, PYTHONPATH: join(root, "backend") },
      stdio: "pipe",
    },
  );
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let buffer = 0,
    bits = 0;
  const bytes: number[] = [];
  for (const c of secret) {
    buffer = (buffer << 5) | alphabet.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 255);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
async function login(page: Page, key: string) {
  const u = user(key);
  await page.goto("/");
  await page.getByLabel("E-mail de acesso", { exact: true }).fill(u.email);
  await page.getByLabel("Senha", { exact: true }).fill(u.password);
  await page.getByRole("button", { name: "Entrar com segurança" }).click();
}
test.beforeAll(() => resetDevAuth());
test.afterAll(() => resetDevAuth());

async function financialLogin(page: Page, key: string) {
  await login(page, key);
  await page
    .getByRole("button", { name: "Configurar autenticador MFA" })
    .click();
  const secret = (await page.locator(".mfa-secret").textContent())!.trim();
  await page
    .getByLabel("Código do autenticador ou recuperação")
    .fill(totp(secret));
  await page.getByRole("button", { name: "Confirmar segundo fator" }).click();
  await page.getByRole("button", { name: "Guardei meus códigos" }).click();
}

async function writeApi(page: Page, path: string, data: unknown) {
  const identity = await (await page.request.get("/api/me")).json();
  return page.request.post("/api" + path, {
    data,
    headers: {
      Origin: "http://localhost:3001",
      "X-Requested-With": "IA-Compliance",
      "X-CSRF-Token": identity.csrf_token,
    },
  });
}
test("login real, catálogo e rascunho no PostgreSQL; IDOR bloqueado e logout revoga sessão", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, "emitter_a");
  await expect(
    page.getByRole("heading", { name: "Meu início", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Empresa autorizada")).not.toContainText(
    "Empresa local B",
  );
  await page.goto("/portal/tomadores");
  await page.getByRole("button", { name: "Novo tomador", exact: true }).click();
  const recipientName = "Tomador M1 " + Date.now();
  await page.getByLabel("Nome", { exact: true }).fill(recipientName);
  await page.getByRole("button", { name: "Salvar no servidor" }).click();
  await expect(
    page.getByRole("heading", { name: recipientName, exact: true }),
  ).toBeVisible();
  await page.goto("/portal/servicos");
  await page.getByRole("button", { name: "Novo serviço", exact: true }).click();
  const serviceName = "Serviço M1 " + Date.now();
  await page.getByLabel("Nome", { exact: true }).fill(serviceName);
  await page
    .getByLabel("Descrição do serviço", { exact: true })
    .fill("Preparação persistente sem operação fiscal.");
  await page.getByRole("button", { name: "Salvar no servidor" }).click();
  await expect(
    page.getByRole("heading", { name: serviceName, exact: true }),
  ).toBeVisible();
  await page.goto("/portal/emitir/completa");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page
    .getByLabel("Tomador autorizado neste CNPJ")
    .selectOption({ label: recipientName });
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page
    .getByLabel("Serviço cadastrado")
    .selectOption({ label: serviceName });
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByLabel("Valor de serviços (rascunho)").fill("4321.50");
  await page
    .getByRole("button", { name: "Salvar rascunho no servidor" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Rascunho salvo no PostgreSQL",
  );
  await page.goto("/portal/rascunhos");
  await page.reload();
  const card = page
    .locator(".card-grid .panel")
    .filter({ hasText: "4.321,50" })
    .first();
  await card.getByRole("link", { name: "Retomar rascunho" }).click();
  await expect(page.getByLabel("Valor de serviços (rascunho)")).toHaveValue(
    "4321.50",
  );
  const other = await page.request.get(
    "/api/client/companies/" + user("emitter_b").company_id + "/customers",
  );
  expect(other.status()).toBe(404);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) =>
        /token|session|password|ia-nfse-demo/i.test(k),
      ),
    ),
  ).toEqual([]);
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "ia_session")?.httpOnly).toBe(true);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar com segurança" }),
  ).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  expect(errors).toEqual([]);
});
test("MFA obrigatório do escritório, convite real e aceite de novo usuário; consulta sem escrita", async ({
  page,
  browser,
}) => {
  await login(page, "office");
  await expect(
    page.getByRole("heading", { name: "Verificação de segurança" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Configurar autenticador MFA" })
    .click();
  const secret = (await page.locator(".mfa-secret").textContent())!.trim();
  await page
    .getByLabel("Código do autenticador ou recuperação")
    .fill(totp(secret));
  await page.getByRole("button", { name: "Confirmar segundo fator" }).click();
  await expect(
    page.getByRole("dialog", {
      name: "Guarde seus códigos de recuperação MFA",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardei meus códigos" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await page.goto("/admin/usuarios");
  await page
    .getByRole("button", { name: "Criar convite com validade" })
    .click();
  await page
    .getByLabel("Organização do vínculo")
    .selectOption({ label: "Cliente local A — sem dados reais" });
  const email = "invited-" + Date.now() + "@e2e.example.com";
  await page
    .getByLabel("Nome do convidado")
    .fill("Convidado E2E de desenvolvimento");
  await page.getByLabel("E-mail do convidado").fill(email);
  await page.getByLabel("Papel solicitado").selectOption("CONSULTA_CLIENTE");
  await page
    .getByLabel("Empresa autorizada", { exact: true })
    .last()
    .selectOption({ label: "Empresa local A" });
  await page
    .getByRole("button", { name: "Criar convite", exact: true })
    .click();
  const invite = await page
    .getByLabel("Link confidencial do convite")
    .inputValue();
  await page.getByRole("button", { name: "Fechar diálogo" }).click();
  const invitedContext = await browser.newContext();
  const invited = await invitedContext.newPage();
  await invited.goto(invite);
  await invited
    .getByLabel("Crie uma senha (mínimo 12 caracteres)")
    .fill(randomBytes(24).toString("hex"));
  await invited
    .getByRole("button", { name: "Aceitar convite e criar acesso" })
    .click();
  await expect(
    invited.getByRole("heading", { name: "Meu início", exact: true }),
  ).toBeVisible();
  await invited.goto("http://localhost:3001/portal/tomadores");
  await expect(
    invited.getByRole("button", { name: "Novo tomador", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await invited.request.get(
        "/api/client/companies/" + user("emitter_b").company_id + "/customers",
      )
    ).status(),
  ).toBe(404);
  await invitedContext.close();
});

test("M2: plano publicado, cortesia auditada, consumo não faturável e portal isolado em três tamanhos", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  resetDevAuth();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await financialLogin(page, "office");
  const companies = await (await page.request.get("/api/companies")).json();
  const suffix = randomBytes(5).toString("hex");
  const name = "Empresa M2 " + suffix;
  const created = await writeApi(page, "/admin/companies", {
    organization_id: companies[0].organization_id,
    name,
    cnpj: "DEMO-M2-" + suffix,
    municipality: "Itumbiara/GO",
    tax_regime: "A parametrizar",
  });
  expect(created.status()).toBe(201);
  const company = await created.json();
  await page.reload();
  await page
    .getByLabel("Empresa autorizada", { exact: true })
    .first()
    .selectOption(company.id);
  await page.goto("/admin/financeiro/planos");
  await page.getByRole("button", { name: "Novo plano", exact: true }).click();
  await page
    .getByLabel("Nome do plano *", { exact: true })
    .fill("Plano M2 " + suffix);
  await page.getByLabel("Mensalidade BRL *", { exact: true }).fill("79,00");
  await page.getByLabel("Franquia mensal *", { exact: true }).fill("50");
  await page
    .getByLabel("Excedente unitário BRL — opcional", { exact: true })
    .fill("2,35");
  await page
    .getByLabel("Justificativa da versão *", { exact: true })
    .fill("Modelo sintético para validação do M2.");
  await page
    .getByRole("checkbox", {
      name: "Confirmo a revisão dos valores; preço zero exige concessão administrativa.",
    })
    .check();
  await page
    .getByRole("button", { name: "Salvar rascunho do plano", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Plano M2 " + suffix });
  await expect(row).toContainText("Rascunho");
  await row.getByRole("button", { name: "Publicar", exact: true }).click();
  await page
    .getByLabel("Justificativa administrativa *", { exact: true })
    .fill("Aprovação sintética de preço em teste de navegador.");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirmar ação", exact: true })
    .click();
  await expect(row).toContainText("Publicado");
  await page.goto("/admin/financeiro/assinaturas");
  await page
    .getByLabel("E-mail de cobrança *", { exact: true })
    .fill("billing@tests.example.com");
  await page
    .getByLabel("Endereço de cobrança *", { exact: true })
    .fill("Endereço fictício M2, 123");
  await page
    .getByRole("button", { name: "Salvar titular de cobrança", exact: true })
    .click();
  await expect(
    page.getByText("Titular salvo no servidor.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nova contratação", exact: true })
    .click();
  await page
    .getByLabel("Plano publicado *", { exact: true })
    .selectOption({ label: "Plano M2 " + suffix + " — R$ 79,00 / mês · v1" });
  await page.getByLabel("Modalidade", { exact: true }).selectOption("COURTESY");
  const review = new Date();
  review.setDate(review.getDate() + 40);
  await page
    .getByLabel("Revisão da concessão *", { exact: true })
    .fill(review.toISOString().slice(0, 10));
  await page
    .getByLabel("Justificativa / condições aprovadas *", { exact: true })
    .fill("Cortesia sintética auditada para validação, sem pagamento.");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Criar contrato no servidor", exact: true })
    .click();
  await expect(
    page.getByText("Concessão administrativa — sem pagamento", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/financeiro/consumo");
  await page
    .getByRole("button", {
      name: "Registrar consumo simulado de desenvolvimento",
      exact: true,
    })
    .click();
  await page.getByLabel("Unidades simuladas *", { exact: true }).fill("60");
  await page
    .getByLabel("Justificativa administrativa *", { exact: true })
    .fill("Evento sintético não faturável para validação visual.");
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirmar ação", exact: true })
    .click();
  await expect(page.getByText(/Prévia: R\$ 23,50/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/SIMULATED · 60 unidade/)).toBeVisible();
  await page.goto("/admin/financeiro/integracoes");
  await expect(
    page.getByText("Envio externo desativado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Solicitar conciliação do CNPJ", exact: true })
    .click();
  await page
    .getByLabel("Justificativa administrativa *", { exact: true })
    .fill(
      "Conciliação solicitada com adaptador desativado, sem dinheiro presumido.",
    );
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Confirmar ação", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Solicitação persistida" }),
  ).toBeVisible();
  for (const path of [
    "/admin/financeiro",
    "/admin/financeiro/politicas",
    "/admin/financeiro/cobrancas",
  ]) {
    await page.goto(path);
    await expect(page.locator(".billing-workspace")).toBeVisible();
    await expect(page.getByText("Carregando dados do servidor…")).toHaveCount(
      0,
    );
    await expect(page.locator(".billing-workspace [role=alert]")).toHaveCount(
      0,
    );
  }
  const clientContext = await browser.newContext();
  const client = await clientContext.newPage();
  await financialLogin(client, "manager_a");
  await client
    .getByLabel("Empresa autorizada", { exact: true })
    .first()
    .selectOption(company.id);
  for (const path of [
    "/portal/assinatura",
    "/portal/mensalidades",
    "/portal/consumo",
    "/portal/planos",
  ]) {
    await client.goto(path);
    await expect(client.locator(".billing-workspace")).toBeVisible();
    await expect(client.getByText("Carregando dados do servidor…")).toHaveCount(
      0,
    );
  }
  expect(
    (
      await client.request.get(
        "/api/billing/my/charges?company_id=" + user("emitter_b").company_id,
      )
    ).status(),
  ).toBe(404);
  await client.goto("/portal/consumo");
  await expect(
    client.getByRole("button", {
      name: "Registrar consumo simulado de desenvolvimento",
    }),
  ).toHaveCount(0);
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
  ]) {
    await client.setViewportSize({ width, height });
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await client.screenshot({
      path: `test-results/m2-portal-${width}.png`,
      fullPage: true,
    });
  }
  const usage = await (
    await client.request.get("/api/billing/my/usage?company_id=" + company.id)
  ).json();
  expect(usage.summary.payable_amount).toBe("0.00");
  expect(usage.summary.simulated_units).toBe(60);
  expect(errors).toEqual([]);
  await clientContext.close();
});
