import type { DemoState, Draft, InvoiceStatus } from "../domain/models";
export const TODAY = "2026-11-11";
export const companyNames = [
  "Aurora Consultoria",
  "Vértice Tecnologia",
  "Essência Saúde",
  "Horizonte Engenharia",
  "Prisma Contabilidade",
  "Ateliê Criativo",
  "Nexo Soluções",
  "Alameda Clínica",
  "Origem Educação",
  "Ápice Manutenção",
  "Trama Comunicação",
  "Cerrado Gestão",
];
const cities = ["Itumbiara/GO", "Goiânia/GO", "Uberlândia/MG", "Brasília/DF"];
export function emptyDraft(companyId: string): Draft {
  return {
    id: "",
    companyId,
    recipientId: "",
    serviceId: "",
    date: TODAY,
    value: "",
    discount: "0",
    deduction: "0",
    description: "",
    municipality: "Itumbiara/GO",
    intermediary: "",
    classification: "",
    observations: "",
    withheld: false,
    retentions: "",
    ibsOperation: "",
    ibsClassification: "",
    ibsSummary: "",
    step: 0,
    updated: TODAY,
  };
}
export function seed(): DemoState {
  const companies = companyNames.map((name, i) => ({
    id: `DEMO-${i + 1}`,
    clientId: `CONTA-${i < 8 ? i + 1 : i - 7}`,
    name,
    document: `CNPJ DEMO-${String(i + 1).padStart(3, "0")}`,
    city: cities[i % 4],
    regime: ["Simples Nacional", "Lucro Presumido", "Lucro Real", "MEI"][i % 4],
    owner: ["Mariana Costa", "Rafael Lima", "Ana Martins"][i % 3],
    address: "Avenida Exemplo, 100 — endereço fictício",
    active: true,
  }));
  const recipients = Array.from({ length: 36 }, (_, i) => ({
    id: `T-${i + 1}`,
    companyId: companies[i % 12].id,
    name:
      [
        "Instituto Horizonte",
        "Comercial Alameda",
        "Grupo Origem",
        "Studio Norte",
        "Oficina Vento",
        "Instituto Brisa",
      ][i % 6] + ` DEMO ${i + 1}`,
    document: `DOC-DEMO-${String(i + 1).padStart(3, "0")}`,
    email: `contato${i + 1}@exemplo.invalid`,
    city: cities[i % 4],
    active: true,
  }));
  const labels = [
    "Consultoria empresarial",
    "Desenvolvimento de software",
    "Atendimento clínico",
    "Projetos de engenharia",
    "Serviços contábeis",
    "Design gráfico",
    "Suporte técnico",
    "Manutenção preventiva",
    "Treinamento profissional",
    "Assessoria administrativa",
    "Marketing digital",
    "Consultoria financeira",
    "Análise de processos",
    "Gestão de projetos",
    "Serviços de arquitetura",
    "Consultoria organizacional",
    "Treinamento técnico",
    "Produção criativa",
  ];
  const services = labels.map((name, i) => ({
    id: `S-${i + 1}`,
    companyId: companies[i % 12].id,
    name,
    description: `Prestação fictícia de ${name.toLowerCase()}.`,
    code: `EX-SERV-${String(i + 1).padStart(3, "0")}`,
    category: ["Consultoria", "Tecnologia", "Saúde", "Serviços profissionais"][
      i % 4
    ],
    favorite: true,
    order: i,
    active: true,
  }));
  const invoices = Array.from({ length: 108 }, (_, i) => {
    const c = companies[i % 12];
    const contacts = recipients.filter((t) => t.companyId === c.id);
    const ss = services.filter((s) => s.companyId === c.id);
    const s = ss[Math.floor(i / 12) % ss.length];
    const status: InvoiceStatus =
      i % 17 === 0
        ? "Erro simulado"
        : i % 13 === 0
          ? "Cancelada (simulação)"
          : i % 19 === 0
            ? "Substituída (simulação)"
            : "Emitida (simulação)";
    const value = 950 + ((i * 619) % 18000);
    return {
      id: `DEMO-NFSE-${String(i + 1).padStart(6, "0")}`,
      companyId: c.id,
      recipientId: contacts[Math.floor(i / 12) % contacts.length].id,
      serviceId: s.id,
      date: `2026-${String(1 + ((Math.floor(i / 12) * 2 + i) % 11)).padStart(2, "0")}-${String((i % 26) + 1).padStart(2, "0")}`,
      value,
      gross: value,
      discount: 0,
      deduction: 0,
      description: s.description,
      status,
      received: i % 9 === 0,
      observations: "Registro fictício para validação de experiência.",
      events: ["Documento criado no conjunto demonstrativo."],
      annotations: [],
    };
  });
  return {
    version: 2,
    companies,
    accounts: Array.from({ length: 8 }, (_, i) => ({
      id: `CONTA-${i + 1}`,
      name:
        [
          "Grupo Aurora",
          "Conta Vértice",
          "Rede Essência",
          "Horizonte Serviços",
          "Prisma Gestão",
          "Ateliê Negócios",
          "Nexo Empresarial",
          "Alameda Saúde",
        ][i] + " DEMO",
      email: `conta${i + 1}@exemplo.invalid`,
      owner: ["Mariana Costa", "Rafael Lima", "Ana Martins"][i % 3],
      active: true,
    })),
    recipients,
    services,
    invoices,
    drafts: companies.map((c, i) => ({
      ...emptyDraft(c.id),
      id: `RASC-DEMO-${i + 1}`,
      recipientId: recipients.find((t) => t.companyId === c.id)!.id,
      serviceId: services.find((s) => s.companyId === c.id)!.id,
      value: String(1200 + i * 400),
      description: i % 2 ? "Descrição fictícia para revisão." : "",
      step: i % 4,
      updated: TODAY,
    })),
    pending: Array.from({ length: 10 }, (_, i) => ({
      id: `PEND-${i + 1}`,
      companyId: companies[i].id,
      title: [
        "Revisar rascunho incompleto",
        "Confirmar cadastro demonstrativo do tomador",
        i % 3 === 2
          ? "A1 fictício expirado"
          : "A1 fictício próximo do vencimento",
        "Revisar erro de emissão simulado",
        "Revisar serviço ilustrativo",
      ][i % 5],
      priority: ["Alta", "Média", "Baixa"][i % 3],
      owner: ["Mariana Costa", "Rafael Lima", "Ana Martins"][i % 3],
      due: `2026-11-${15 + i}`,
      resolved: false,
      comment: "",
    })),
    certificates: companies.slice(0, 8).map((c, i) => ({
      id: `A1-DEMO-${i + 1}`,
      companyId: c.id,
      holder: `${c.name} — titular fictício`,
      expires: ["2027-10-10", "2026-11-20", "2025-01-01"][i % 3],
      status: (
        [
          "Simulado válido",
          "Vence em breve — simulado",
          "Simulado expirado",
        ] as const
      )[i % 3],
      owner: c.owner,
    })),
    users: Array.from({ length: 8 }, (_, i) => ({
      id: `USER-DEMO-${i + 1}`,
      name:
        [
          "Mariana Costa",
          "Rafael Lima",
          "Ana Martins",
          "Bruno Alves",
          "Carla Dias",
          "Diego Souza",
          "Elisa Rocha",
          "Felipe Neves",
        ][i] + " DEMO",
      clientId: i < 2 ? "" : companies[i < 5 ? 0 : i < 7 ? 1 : 2].clientId,
      companyIds:
        i < 2
          ? companies.map((c) => c.id)
          : companies
              .filter(
                (c) =>
                  c.clientId === companies[i < 5 ? 0 : i < 7 ? 1 : 2].clientId,
              )
              .map((c) => c.id),
      role:
        i === 0
          ? "Administrador IA Compliance"
          : i === 1
            ? "Analista do Escritório"
            : [
                "Gestor do Cliente",
                "Emissor do Cliente",
                "Consulta do Cliente",
              ][(i - 2) % 3],
      active: true,
    })),
    tickets: Array.from({ length: 6 }, (_, i) => ({
      id: `AJUDA-DEMO-${i + 1}`,
      companyId: companies[i].id,
      subject: [
        "Como revisar meu rascunho?",
        "Ajuda com serviço favorito",
        "Entender a prévia DEMO",
      ][i % 3],
      category: "Dúvida de uso",
      invoiceId: invoices[i].id,
      description:
        "Solicitação fictícia criada para explorar a experiência de atendimento.",
      urgency: i % 2 ? "Normal" : "Alta",
      status: (["Aberto", "Em atendimento", "Encerrado"] as const)[i % 3],
      messages: [
        {
          author: "Cliente DEMO",
          body: "Preciso de orientação sobre o protótipo.",
          at: TODAY,
        },
      ],
      at: TODAY,
    })),
    notifications: companies.map((c, i) => ({
      id: `AVISO-${i + 1}`,
      companyId: c.id,
      title:
        i < 8 && i % 3 === 1
          ? "A1 fictício próximo do vencimento"
          : i < 8 && i % 3 === 2
            ? "Certificado A1 fictício expirado"
            : i < 6 && i % 3 !== 2
              ? "Solicitação de ajuda para acompanhar"
              : "Rascunho demonstrativo aguardando revisão",
      href:
        i < 8 && i % 3 !== 0
          ? "/admin/certificados"
          : i < 6 && i % 3 !== 2
            ? "/admin/suporte"
            : "/admin/pendencias",
      read: false,
      muted: false,
    })),
    feedback: [],
    activities: [
      {
        id: "ATIV-INICIAL",
        companyId: "",
        message: "Conjunto V2 iniciado. Histórico local — não é log imutável.",
        at: TODAY,
      },
    ],
    evaluation: { decisions: {}, ratings: {}, suggestions: [], checklist: [] },
    preferences: {
      theme: "light",
      density: "comfortable",
      alerts: true,
      hints: true,
      adminRole: "Administrador IA Compliance",
      clientRole: "Gestor do Cliente",
      adminCompany: "all",
      portalCompany: "DEMO-1",
      portalClientId: "CONTA-1",
      adminPeriod: "2026",
      portalPeriod: "2026",
      fromAdmin: false,
    },
    working: {},
  };
}
