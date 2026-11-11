"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Field } from "../components/shared/ui";
import { api, type Identity } from "./api";
import { useAuth } from "./AuthProvider";
export function Authentication() {
  const { identity, setIdentity, error: connectionError, refresh } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{
    secret: string;
    uri: string;
  } | null>(null);
  const [invite, setInvite] = useState("");
  useEffect(() => {
    if (path === "/convite") {
      const token = new URLSearchParams(window.location.hash.slice(1)).get(
        "token",
      );
      if (token) {
        setInvite(token);
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [path]);
  async function perform(action: () => Promise<Identity>) {
    setError("");
    setBusy(true);
    try {
      const value = await action();
      setIdentity(value);
      if (value.phase === "AUTHENTICATED")
        router.replace(
          value.memberships.some((m) =>
            [
              "SUPERADMIN_ESCRITORIO",
              "GESTOR_ESCRITORIO",
              "ANALISTA_FISCAL",
              "SUPORTE",
            ].includes(m.role),
          )
            ? "/admin"
            : "/portal",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de autenticação.");
    } finally {
      setBusy(false);
    }
  }
  const pending = identity && identity.phase !== "AUTHENTICATED";
  return (
    <main className="app v2 operational-login">
      <section className="entry-option">
        <span className="eyebrow">IA COMPLIANCE · FUNDAÇÃO OPERACIONAL M1</span>
        <h1>
          {pending
            ? "Verificação de segurança"
            : invite
              ? "Aceitar convite"
              : "Acesse sua plataforma"}
        </h1>
        <p>
          Autenticação real e dados no servidor. Emissão fiscal e cobrança
          continuam indisponíveis.
        </p>
        {connectionError && (
          <p className="error" role="alert">
            {connectionError}{" "}
            <button className="secondary" onClick={() => void refresh()}>
              Tentar conexão
            </button>
          </p>
        )}
        {pending ? (
          <>
            <p className="notice">
              {identity.user.name} · {identity.user.email}
              <br />
              Gestores devem concluir o MFA antes de acessar os dados.
            </p>
            {identity.phase === "MFA_ENROLLMENT_REQUIRED" && !enrollment ? (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setEnrollment(
                      await api("/auth/mfa/enroll", {
                        method: "POST",
                        body: {},
                      }),
                    );
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Configurar autenticador MFA
              </button>
            ) : (
              <>
                {enrollment && (
                  <div className="notice">
                    <strong>
                      Adicione esta chave ao seu autenticador TOTP.
                    </strong>
                    <code className="mfa-secret">{enrollment.secret}</code>
                    <small>
                      Esta chave aparece somente nesta configuração. Não a
                      compartilhe.
                    </small>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void perform(() =>
                      api<Identity>(
                        identity.phase === "MFA_ENROLLMENT_REQUIRED"
                          ? "/auth/mfa/confirm"
                          : "/auth/mfa/verify",
                        {
                          method: "POST",
                          body: { code: String(f.get("code")) },
                        },
                      ),
                    );
                  }}
                >
                  <Field label="Código do autenticador ou recuperação">
                    <input
                      name="code"
                      autoComplete="one-time-code"
                      required
                      minLength={6}
                      maxLength={32}
                    />
                  </Field>
                  <button disabled={busy}>Confirmar segundo fator</button>
                </form>
              </>
            )}
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void perform(() =>
                api<Identity>(
                  invite ? "/auth/invitations/accept" : "/auth/login",
                  {
                    method: "POST",
                    body: invite
                      ? { token: invite, password: String(f.get("password")) }
                      : {
                          email: String(f.get("email")),
                          password: String(f.get("password")),
                        },
                  },
                ),
              );
            }}
          >
            {!invite && (
              <Field label="E-mail de acesso">
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                />
              </Field>
            )}
            <Field
              label={invite ? "Crie uma senha (mínimo 12 caracteres)" : "Senha"}
            >
              <input
                type="password"
                name="password"
                required
                minLength={invite ? 12 : 1}
                maxLength={128}
                autoComplete={invite ? "new-password" : "current-password"}
              />
            </Field>
            <button disabled={busy}>
              {busy
                ? "Verificando..."
                : invite
                  ? "Aceitar convite e criar acesso"
                  : "Entrar com segurança"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {invite && (
          <button
            className="secondary"
            onClick={() => {
              setInvite("");
              router.replace("/");
            }}
          >
            Já tenho conta — entrar e depois reabrir o link do convite
          </button>
        )}
        <p className="notice">
          Sessão em cookie HttpOnly; nenhum token de acesso é armazenado no
          localStorage. Não há troca fictícia de perfil neste modo.
        </p>
      </section>
    </main>
  );
}
