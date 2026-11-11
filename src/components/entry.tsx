"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  FileText,
  ShieldCheck,
  Check,
  PlayCircle,
} from "lucide-react";
import { useDemo } from "../demo/DemoProvider";
import { officeRoles, clientRoles } from "../domain/permissions-demo";
import type { ClientRole, OfficeRole } from "../domain/models";
import { Badge, DemoBanner, Field, Modal } from "./shared/ui";
export function Entry() {
  const { state, preferences } = useDemo();
  const router = useRouter();
  const entryCompanies = [...state.companies]
    .filter((c) => c.active)
    .sort((a, b) => {
      const favorites = ["DEMO-1", "DEMO-2", "DEMO-3"];
      const rank = (id: string) =>
        favorites.includes(id) ? favorites.indexOf(id) : 3;
      return rank(a.id) - rank(b.id);
    })
    .slice(0, 3);
  const [company, setCompany] = useState(entryCompanies[0]?.id || "");
  const [office, setOffice] = useState<OfficeRole>(state.preferences.adminRole);
  const [client, setClient] = useState<ClientRole>(
    state.preferences.clientRole,
  );
  return (
    <div
      className={`app v2 entry ${state.preferences.theme === "dark" ? "dark" : ""}`}
    >
      <header className="entry-header">
        <Link href="/" className="brand">
          <strong>
            IA COMPLIANCE
            <small>
              PLATAFORMA INTELIGENTE DE EMISSÃO E GESTÃO DE SERVIÇOS
            </small>
          </strong>
        </Link>
        <Badge>DEMO / PROTÓTIPO — FASE 1 · V2</Badge>
      </header>
      <DemoBanner />
      <main className="entry-main">
        <span className="eyebrow">
          DOIS CAMINHOS. UMA EXPERIÊNCIA CONECTADA.
        </span>
        <h1>
          Escolha como você
          <br />
          quer explorar.
        </h1>
        <p>
          Uma visão completa para o escritório.
          <br />
          Uma rotina mais simples para quem emite.
        </p>
        <div className="entry-options">
          <section className="entry-option office-entry">
            <div className="option-icon">
              <Building2 size={26} />
            </div>
            <span className="eyebrow">PARA O GRUPO IA COMPLIANCE</span>
            <h2>Painel do escritório</h2>
            <p>Gerencie clientes, acompanhe emissões e avalie operações.</p>
            <ul>
              <li>
                <Check size={15} /> Visão consolidada da carteira
              </li>
              <li>
                <Check size={15} /> Supervisão, suporte e pendências
              </li>
              <li>
                <Check size={15} /> Decisões para a próxima fase
              </li>
            </ul>
            <Field label="Persona do escritório">
              <select
                value={office}
                onChange={(e) => setOffice(e.target.value as OfficeRole)}
              >
                {officeRoles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <button
              onClick={() => {
                preferences({ adminRole: office });
                router.push("/admin");
              }}
            >
              Acessar painel administrativo <ArrowRight size={17} />
            </button>
          </section>
          <section className="entry-option client-entry">
            <div className="option-icon">
              <FileText size={26} />
            </div>
            <span className="eyebrow">PARA OS CLIENTES DO ESCRITÓRIO</span>
            <h2>Portal do cliente</h2>
            <p>
              Emita suas NFS-e com mais facilidade e consulte seus documentos.
            </p>
            <div className="form-grid">
              <Field label="Empresa fictícia">
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  {entryCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.document}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Persona do cliente">
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value as ClientRole)}
                >
                  {clientRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="entry-company-note">
              Cada empresa tem seus próprios documentos, tomadores, serviços e
              rascunhos.
            </p>
            <button
              className="gold-button"
              disabled={!company}
              onClick={() => {
                const c = state.companies.find((c) => c.id === company)!;
                preferences({
                  portalCompany: c.id,
                  portalClientId: c.clientId,
                  clientRole: client,
                  fromAdmin: false,
                });
                router.push("/portal");
              }}
            >
              Acessar portal do cliente <ArrowRight size={17} />
            </button>
          </section>
        </div>
        <div className="entry-disclaimer">
          <ShieldCheck size={20} />
          <p>
            <strong>Acesso simulado — nenhuma autenticação real.</strong>
            <br />
            Dados inventados, sem senha, sem integração e sem emissão fiscal.
            Salvos somente neste navegador.
          </p>
          <Link href="/demonstracao">
            <PlayCircle size={16} /> Conhecer o roteiro
          </Link>
        </div>
      </main>
      <footer>
        Nossa missão é o seu sucesso.{" "}
        <span>
          Grupo IA Compliance — Consultoria, Contabilidade, Gestão e Soluções
          Financeiras e Tecnológicas
        </span>
      </footer>
    </div>
  );
}
export function Tour({
  portal,
  close,
}: {
  portal: boolean;
  close: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = portal
    ? [
        "Você está no contexto de uma empresa fictícia. Nenhum outro CNPJ é exibido sem uma troca permitida pela persona.",
        "Emita: escolha tomador, serviço e valor. Revise tudo antes de simular.",
        "Retome rascunhos e duplique notas sem alterar o documento original.",
        "Peça ajuda e envie sua opinião. Tudo fica apenas neste navegador.",
      ]
    : [
        "Veja toda a carteira ou filtre por empresa, período e situação.",
        "Contas de clientes são diferentes de empresas: uma conta pode ter vários CNPJs.",
        "Acompanhe pendências e metadados fictícios dos certificados, sem arquivos reais.",
        "Visualize a experiência do cliente escolhendo empresa e persona DEMO.",
        "Responda aos tickets locais enviados pelo portal e acompanhe seu status.",
        "No Centro de Validação, registre prioridades, leia feedback e exporte decisões.",
      ];
  return (
    <Modal
      title={`Tour ${portal ? "do cliente" : "do escritório"} · ${step + 1} de ${steps.length}`}
      close={close}
    >
      <progress max={steps.length} value={step + 1} />
      <p>{steps[step]}</p>
      <div className="actions">
        <button className="secondary" onClick={close}>
          Pular tour
        </button>
        {step > 0 && (
          <button className="secondary" onClick={() => setStep(step - 1)}>
            Voltar
          </button>
        )}
        <button
          onClick={() =>
            step === steps.length - 1 ? close() : setStep(step + 1)
          }
        >
          {step === steps.length - 1 ? "Concluir" : "Próximo passo"}
        </button>
      </div>
    </Modal>
  );
}
