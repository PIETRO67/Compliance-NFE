import type { ClientRole, OfficeRole } from "./models";
export const officeRoles: OfficeRole[] = [
  "Administrador IA Compliance",
  "Analista do Escritório",
];
export const clientRoles: ClientRole[] = [
  "Gestor do Cliente",
  "Emissor do Cliente",
  "Consulta do Cliente",
];
// Exclusivamente apresentação de interface. Nunca representa autorização real.
export const canIssue = (role: ClientRole) => role !== "Consulta do Cliente";
export const canManageTeam = (role: ClientRole) => role === "Gestor do Cliente";
export const canAdminister = (role: OfficeRole) =>
  role === "Administrador IA Compliance";
