import { z } from "zod";
import type { DemoState, Draft } from "./models";
export const documentSchema = z
  .string()
  .regex(
    /^DOC-DEMO-[A-Z0-9-]{3,}$/i,
    "Use DOC-DEMO-001 ou outra referência demonstrativa nesse formato.",
  );
export const recipientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe um nome fictício com pelo menos 3 caracteres."),
  document: documentSchema,
  email: z.email("Informe um e-mail fictício em formato válido."),
  city: z.string().min(3, "Informe o município fictício."),
});
export function draftErrors(d: Draft, state: DemoState, step?: number) {
  const errors: Record<string, string> = {};
  const test = (n: number) => step === undefined || step === n;
  if (test(0) && !state.companies.some((c) => c.id === d.companyId && c.active))
    errors.companyId = "Selecione um prestador DEMO ativo.";
  if (
    test(1) &&
    !state.recipients.some(
      (t) => t.id === d.recipientId && t.companyId === d.companyId && t.active,
    )
  )
    errors.recipientId = "Selecione um tomador desta empresa.";
  if (test(2)) {
    if (
      !state.services.some(
        (s) => s.id === d.serviceId && s.companyId === d.companyId && s.active,
      )
    )
      errors.serviceId = "Selecione um serviço desta empresa.";
    if (d.description.trim().length < 5)
      errors.description = "Descreva o serviço com pelo menos 5 caracteres.";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      !Number.isFinite(Date.parse(d.date)) ||
      new Date(d.date + "T12:00:00Z").toISOString().slice(0, 10) !== d.date
    )
      errors.date = "Informe uma competência válida.";
  }
  if (test(3)) {
    if (!z.coerce.number().positive().safeParse(d.value).success)
      errors.value = "Informe um valor bruto maior que zero.";
    if (!z.coerce.number().nonnegative().safeParse(d.discount).success)
      errors.discount = "O desconto deve ser zero ou positivo.";
    if (!z.coerce.number().nonnegative().safeParse(d.deduction).success)
      errors.deduction = "A dedução deve ser zero ou positiva.";
    if (Number(d.discount) + Number(d.deduction) > Number(d.value))
      errors.discount = "Descontos e deduções não podem superar o bruto.";
  }
  return errors;
}
