import { notFound } from "next/navigation";
import AppV2 from "../../components/app-v2";
const admin = [
  "",
  "clientes",
  "empresas",
  "notas",
  "pendencias",
  "certificados",
  "usuarios",
  "relatorios",
  "atividades",
  "suporte",
  "notificacoes",
  "fiscal",
  "integracoes",
  "configuracoes",
  "avaliacao",
];
const portal = [
  "",
  "emitir",
  "emitir/rapida",
  "emitir/completa",
  "notas",
  "rascunhos",
  "tomadores",
  "servicos",
  "relatorios",
  "ajuda",
  "perfil",
  "feedback",
];
const legacy = [
  "dashboard",
  "empresas",
  "emissao",
  "emissao/simplificada",
  "emissao/completa",
  "notas/emitidas",
  "notas/recebidas",
  "notas/local",
  "rascunhos",
  "tomadores",
  "servicos",
  "fiscal",
  "certificados",
  "eventos",
  "relatorios",
  "notificacoes",
  "auditoria",
  "usuarios",
  "configuracoes",
  "integracoes",
  "avaliacao",
];
const routes = [
  "",
  "demonstracao",
  "login",
  "convite",
  ...admin.map((p) => "admin" + (p ? "/" + p : "")),
  ...portal.map((p) => "portal" + (p ? "/" + p : "")),
  ...Array.from({ length: 8 }, (_, i) => `admin/clientes/CONTA-${i + 1}`),
  "admin/clientes/local",
  ...Array.from({ length: 12 }, (_, i) => `admin/empresas/DEMO-${i + 1}`),
  "admin/empresas/local",
  ...["admin", "portal"].flatMap((area) => [
    ...Array.from(
      { length: 108 },
      (_, i) => `${area}/notas/DEMO-NFSE-${String(i + 1).padStart(6, "0")}`,
    ),
    `${area}/notas/local`,
  ]),
  ...legacy,
  ...Array.from({ length: 12 }, (_, i) => `empresas/DEMO-${i + 1}`),
  ...Array.from({ length: 48 }, (_, i) => `notas/DEMO-N${i + 1}`),
];
export function generateStaticParams() {
  return routes.map((route) => ({ slug: route ? route.split("/") : [] }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  if (
    !routes.includes(slug.join("/")) &&
    !(
      process.env.NEXT_PUBLIC_APP_MODE === "operational" &&
      ["admin", "portal"].includes(slug[0])
    )
  )
    notFound();
  return <AppV2 />;
}
