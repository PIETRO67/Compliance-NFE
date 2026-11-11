export type OfficeRole =
  "Administrador IA Compliance" | "Analista do Escritório";
export type ClientRole =
  "Gestor do Cliente" | "Emissor do Cliente" | "Consulta do Cliente";
export type InvoiceStatus =
  | "Emitida (simulação)"
  | "Cancelada (simulação)"
  | "Substituída (simulação)"
  | "Erro simulado";
export interface ClientAccount {
  id: string;
  name: string;
  email: string;
  owner: string;
  active: boolean;
}
export interface Company {
  id: string;
  clientId: string;
  name: string;
  document: string;
  city: string;
  regime: string;
  owner: string;
  address: string;
  active: boolean;
}
export interface Recipient {
  id: string;
  companyId: string;
  name: string;
  document: string;
  email: string;
  city: string;
  active: boolean;
}
export interface Service {
  id: string;
  companyId: string;
  name: string;
  description: string;
  code: string;
  category: string;
  favorite: boolean;
  order: number;
  active: boolean;
}
export interface Invoice {
  id: string;
  companyId: string;
  recipientId: string;
  serviceId: string;
  date: string;
  value: number;
  gross: number;
  discount: number;
  deduction: number;
  description: string;
  status: InvoiceStatus;
  received: boolean;
  previousId?: string;
  observations: string;
  events: string[];
  annotations: string[];
}
export interface Draft {
  id: string;
  companyId: string;
  recipientId: string;
  serviceId: string;
  date: string;
  value: string;
  discount: string;
  deduction: string;
  description: string;
  municipality: string;
  intermediary: string;
  classification: string;
  observations: string;
  withheld: boolean;
  retentions: string;
  ibsOperation: string;
  ibsClassification: string;
  ibsSummary: string;
  step: number;
  updated: string;
}
export interface PendingTask {
  id: string;
  companyId: string;
  title: string;
  priority: string;
  owner: string;
  due: string;
  resolved: boolean;
  comment: string;
}
export interface Certificate {
  id: string;
  companyId: string;
  holder: string;
  expires: string;
  status: "Simulado válido" | "Vence em breve — simulado" | "Simulado expirado";
  owner: string;
}
export interface DemoUser {
  id: string;
  name: string;
  clientId: string;
  companyIds: string[];
  role: string;
  active: boolean;
}
export interface TicketMessage {
  author: string;
  body: string;
  at: string;
}
export interface Ticket {
  id: string;
  companyId: string;
  subject: string;
  category: string;
  invoiceId: string;
  description: string;
  urgency: string;
  status: "Aberto" | "Em atendimento" | "Encerrado";
  messages: TicketMessage[];
  at: string;
}
export interface Feedback {
  id: string;
  companyId: string;
  ratings: Record<string, number>;
  text: string;
  screen: string;
  at: string;
}
export interface Activity {
  id: string;
  companyId: string;
  message: string;
  at: string;
}
export interface Notification {
  id: string;
  companyId: string;
  title: string;
  href: string;
  read: boolean;
  muted: boolean;
}
export interface Decision {
  choice: string;
  comment: string;
  priority: string;
}
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  portal: string;
  priority: string;
}
export interface Evaluation {
  decisions: Record<string, Decision>;
  ratings: Record<string, number>;
  suggestions: Suggestion[];
  checklist: string[];
}
export interface Preferences {
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  alerts: boolean;
  hints: boolean;
  adminRole: OfficeRole;
  clientRole: ClientRole;
  adminCompany: string;
  portalCompany: string;
  portalClientId: string;
  adminPeriod: string;
  portalPeriod: string;
  fromAdmin: boolean;
}
export interface DemoState {
  version: 2;
  accounts: ClientAccount[];
  companies: Company[];
  recipients: Recipient[];
  services: Service[];
  invoices: Invoice[];
  drafts: Draft[];
  pending: PendingTask[];
  certificates: Certificate[];
  users: DemoUser[];
  tickets: Ticket[];
  feedback: Feedback[];
  activities: Activity[];
  notifications: Notification[];
  evaluation: Evaluation;
  preferences: Preferences;
  working: Record<string, Draft>;
}
export interface InvoiceFilters {
  companyId?: string;
  clientId?: string;
  period?: string;
  status?: string;
  query?: string;
  received?: boolean;
  recipientId?: string;
  serviceId?: string;
  min?: number;
  max?: number;
}
