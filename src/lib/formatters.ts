import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
export const currency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n,
  );
export const displayDate = (d: string) => {
  try {
    return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "Data não informada";
  }
};
export const watermark = "DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL";
export const fiscalDisclaimer =
  "Exemplo para validação do layout — regra fiscal não verificada";
export function download(name: string, text: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function csvCell(value: unknown) {
  return '"' + String(value ?? "").replaceAll('"', '""') + '"';
}
