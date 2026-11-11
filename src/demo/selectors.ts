import type { DemoState, Invoice, InvoiceFilters } from "../domain/models";
export function listInvoices(
  state: DemoState,
  filters: InvoiceFilters = {},
): Invoice[] {
  return state.invoices.filter(
    (n) =>
      (!filters.companyId ||
        filters.companyId === "all" ||
        n.companyId === filters.companyId) &&
      (!filters.clientId ||
        state.companies.find((c) => c.id === n.companyId)?.clientId ===
          filters.clientId) &&
      (!filters.period || n.date.startsWith(filters.period)) &&
      (!filters.status || n.status === filters.status) &&
      (filters.received === undefined || n.received === filters.received) &&
      (!filters.recipientId || n.recipientId === filters.recipientId) &&
      (!filters.serviceId || n.serviceId === filters.serviceId) &&
      (filters.min === undefined || n.value >= filters.min) &&
      (filters.max === undefined || n.value <= filters.max) &&
      (!filters.query ||
        `${n.id} ${state.companies.find((c) => c.id === n.companyId)?.name} ${state.recipients.find((t) => t.id === n.recipientId)?.name} ${n.description}`
          .toLowerCase()
          .includes(filters.query.toLowerCase())),
  );
}
export const activeRevenue = (invoices: Invoice[]) =>
  invoices
    .filter((n) => !n.received && n.status === "Emitida (simulação)")
    .reduce((sum, n) => sum + n.value, 0);
export function companyRecords<T extends { companyId: string }>(
  records: T[],
  companyId: string,
) {
  return records.filter(
    (r) => companyId === "all" || r.companyId === companyId,
  );
}
export function permittedCompanies(state: DemoState) {
  const p = state.preferences;
  return state.companies.filter(
    (c) =>
      c.active &&
      (p.clientRole === "Gestor do Cliente"
        ? c.clientId === p.portalClientId
        : c.id === p.portalCompany),
  );
}
