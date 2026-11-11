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
