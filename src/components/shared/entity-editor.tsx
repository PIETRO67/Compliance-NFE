"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDemo } from "../../demo/DemoProvider";
import { uid } from "../../demo/DemoRepository";
import { documentSchema } from "../../domain/rules-demo";
import { Field, Modal } from "./ui";
export type EntityKind = "client" | "company" | "recipient" | "service";
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe um nome fictício com pelo menos 3 caracteres."),
  email: z.string(),
  city: z.string(),
  document: z.string(),
  clientId: z.string(),
  owner: z.string(),
  regime: z.string(),
  description: z.string(),
  category: z.string(),
  code: z.string(),
  confirmed: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function EntityEditor({
  kind,
  id,
  companyId,
  close,
}: {
  kind: EntityKind;
  id?: string;
  companyId: string;
  close: () => void;
}) {
  const { state, mutate } = useDemo();
  const item =
    kind === "client"
      ? state.accounts.find((x) => x.id === id)
      : kind === "company"
        ? state.companies.find((x) => x.id === id)
        : kind === "recipient"
          ? state.recipients.find(
              (x) => x.id === id && x.companyId === companyId,
            )
          : state.services.find(
              (x) => x.id === id && x.companyId === companyId,
            );
  const title = {
    client: "conta cliente",
    company: "empresa",
    recipient: "tomador",
    service: "serviço favorito",
  }[kind];
  const initial = item as unknown as Partial<Values> | undefined;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name || "",
      email: initial?.email || "contato@exemplo.invalid",
      city: initial?.city || "Itumbiara/GO",
      document: initial?.document || "DOC-DEMO-LOCAL",
      clientId: initial?.clientId || state.accounts[0]?.id || "",
      owner: initial?.owner || "Operador DEMO",
      regime: initial?.regime || "Simples Nacional",
      description: initial?.description || "",
      category: initial?.category || "Serviços profissionais",
      code: initial?.code || "EX-SERV-LOCAL",
      confirmed: false,
    },
  });
  return (
    <Modal title={`${id ? "Editar" : "Adicionar"} ${title} DEMO`} close={close}>
      <p className="notice">
        Use somente dados inventados. Identificadores e contatos reais não são
        aceitos neste protótipo.
      </p>
      <form
        onSubmit={handleSubmit((v) => {
          if (!v.confirmed) {
            setError("confirmed", {
              message: "Confirme que os dados são exclusivamente fictícios.",
            });
            return;
          }
          if (
            (kind === "client" || kind === "recipient") &&
            (!z.email().safeParse(v.email).success ||
              !v.email.endsWith(".invalid"))
          ) {
            setError("email", {
              message: "Use um e-mail fictício terminado em .invalid.",
            });
            return;
          }
          if (kind === "recipient") {
            const check = documentSchema.safeParse(v.document);
            if (!check.success) {
              setError("document", { message: check.error.issues[0].message });
              return;
            }
          }
          if (
            kind === "service" &&
            (!v.code.startsWith("EX-") || v.description.trim().length < 5)
          ) {
            setError("description", {
              message:
                "Informe uma descrição com 5 caracteres e código ilustrativo iniciado por EX-.",
            });
            return;
          }
          const newId =
            id ||
            uid(
              kind === "company"
                ? "EMPRESA-DEMO"
                : kind === "client"
                  ? "CONTA-DEMO"
                  : kind === "recipient"
                    ? "TOM-DEMO"
                    : "SERV-DEMO",
            );
          mutate(
            (s) => {
              if (kind === "client") {
                const record = {
                  id: newId,
                  name: v.name,
                  email: v.email,
                  owner: v.owner,
                  active: item?.active ?? true,
                };
                return {
                  ...s,
                  accounts: [
                    record,
                    ...s.accounts.filter((x) => x.id !== newId),
                  ],
                };
              }
              if (kind === "company") {
                const record = {
                  id: newId,
                  clientId: v.clientId,
                  name: v.name,
                  document:
                    item && "document" in item
                      ? item.document
                      : "CNPJ " + newId,
                  city: v.city,
                  regime: v.regime,
                  owner: v.owner,
                  address: "Rua de Exemplo, 100 — endereço fictício",
                  active: item?.active ?? true,
                };
                return {
                  ...s,
                  companies: [
                    record,
                    ...s.companies.filter((x) => x.id !== newId),
                  ],
                };
              }
              if (kind === "recipient") {
                const record = {
                  id: newId,
                  companyId,
                  name: v.name,
                  document: v.document,
                  email: v.email,
                  city: v.city,
                  active: item?.active ?? true,
                };
                return {
                  ...s,
                  recipients: [
                    record,
                    ...s.recipients.filter((x) => x.id !== newId),
                  ],
                };
              }
              const record = {
                id: newId,
                companyId,
                name: v.name,
                description: v.description,
                category: v.category,
                code: v.code,
                favorite: item && "favorite" in item ? item.favorite : true,
                order: item && "order" in item ? item.order : s.services.length,
                active: item?.active ?? true,
              };
              return {
                ...s,
                services: [record, ...s.services.filter((x) => x.id !== newId)],
              };
            },
            `${title} DEMO salvo neste navegador.`,
            companyId,
          );
          close();
        })}
      >
        <Field label="Nome fictício *" error={errors.name?.message}>
          <input required {...register("name")} />
        </Field>
        {(kind === "client" || kind === "recipient") && (
          <Field
            label="E-mail fictício (.invalid) *"
            error={errors.email?.message}
          >
            <input required type="email" {...register("email")} />
          </Field>
        )}
        {kind === "recipient" && (
          <Field
            label="Documento demonstrativo *"
            hint="Formato exclusivo: DOC-DEMO-001. Não informe CPF/CNPJ real."
            error={errors.document?.message}
          >
            <input required {...register("document")} />
          </Field>
        )}
        {(kind === "recipient" || kind === "company") && (
          <Field label="Município fictício *">
            <select {...register("city")}>
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
        {kind === "company" && (
          <>
            <Field label="Conta cliente vinculada">
              <select {...register("clientId")}>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Regime ilustrativo">
              <select {...register("regime")}>
                {[
                  "MEI",
                  "Simples Nacional",
                  "Lucro Presumido",
                  "Lucro Real",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {(kind === "client" || kind === "company") && (
          <Field label="Responsável fictício">
            <input {...register("owner")} />
          </Field>
        )}
        {kind === "service" && (
          <>
            <Field
              label="Descrição de exemplo *"
              error={errors.description?.message}
            >
              <textarea required {...register("description")} />
            </Field>
            <div className="form-grid">
              <Field label="Código ilustrativo (EX-)">
                <input {...register("code")} />
              </Field>
              <Field label="Categoria de serviço">
                <select {...register("category")}>
                  {[
                    "Consultoria",
                    "Tecnologia",
                    "Saúde",
                    "Serviços profissionais",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="notice">
              Exemplo para validação do layout — regra fiscal não verificada.
            </p>
          </>
        )}
        <label className="check">
          <input type="checkbox" {...register("confirmed")} /> Confirmo que
          estes dados são exclusivamente fictícios.
        </label>
        {errors.confirmed && (
          <p className="field-error" role="alert">
            {errors.confirmed.message}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" onClick={close}>
            Voltar
          </button>
          <button>Salvar {title} demo</button>
        </div>
      </form>
    </Modal>
  );
}
