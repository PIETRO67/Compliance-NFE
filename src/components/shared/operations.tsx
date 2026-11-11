"use client";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Layers, ArrowRight, Bell } from "lucide-react";
import { useDemo } from "../../demo/DemoProvider";
import { companyRecords } from "../../demo/selectors";
import {
  clientRoles,
  canAdminister,
  canManageTeam,
} from "../../domain/permissions-demo";
import type { ClientRole, PendingTask } from "../../domain/models";
import { displayDate, fiscalDisclaimer } from "../../lib/formatters";
import { useWorkspace } from "./workspace";
import { Field, Badge, Modal, Empty } from "./ui";
import { Tour } from "../entry";
export function Pending() {
  const { state, mutate } = useDemo();
  const { companyId } = useWorkspace();
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<PendingTask | null>(null);
  const records = companyRecords(state.pending, companyId).filter(
    (p) =>
      (filter === "all" ||
        (filter === "open" && !p.resolved) ||
        (filter === "resolved" && p.resolved)) &&
      `${p.title} ${p.owner}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="filters">
        <input
          aria-label="Pesquisar pendências"
          placeholder="Buscar pendência ou responsável..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Situação da pendência"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="open">Abertas</option>
          <option value="resolved">Resolvidas</option>
          <option value="all">Todas</option>
        </select>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PRIORIDADE / PENDÊNCIA</th>
                <th>EMPRESA</th>
                <th>RESPONSÁVEL</th>
                <th>PRAZO DEMO</th>
                <th>STATUS / AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {records.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Badge>{p.priority}</Badge>
                    <p>{p.title}</p>
                  </td>
                  <td>
                    {state.companies.find((c) => c.id === p.companyId)?.name}
                  </td>
                  <td>{p.owner}</td>
                  <td>{displayDate(p.due)}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => setEdit({ ...p })}
                      >
                        Atribuir / comentar
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          mutate(
                            (s) => ({
                              ...s,
                              pending: s.pending.map((x) =>
                                x.id === p.id
                                  ? { ...x, resolved: !x.resolved }
                                  : x,
                              ),
                            }),
                            p.resolved
                              ? "Pendência reaberta localmente."
                              : "Pendência resolvida em simulação.",
                            p.companyId,
                          )
                        }
                      >
                        {p.resolved ? "Reabrir" : "Resolver"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && (
            <Empty title="Nenhuma pendência neste contexto" />
          )}
        </div>
      </section>
      {edit && (
        <Modal
          title="Atribuir e comentar pendência DEMO"
          close={() => setEdit(null)}
        >
          <p>{edit.title}</p>
          <Field label="Responsável fictício">
            <select
              value={edit.owner}
              onChange={(e) => setEdit({ ...edit, owner: e.target.value })}
            >
              {["Mariana Costa", "Rafael Lima", "Ana Martins"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade da pendência">
            <select
              value={edit.priority}
              onChange={(e) => setEdit({ ...edit, priority: e.target.value })}
            >
              {["Alta", "Média", "Baixa"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Comentário interno fictício">
            <textarea
              value={edit.comment}
              onChange={(e) => setEdit({ ...edit, comment: e.target.value })}
            />
          </Field>
          <button
            onClick={() => {
              mutate(
                (s) => ({
                  ...s,
                  pending: s.pending.map((p) => (p.id === edit.id ? edit : p)),
                }),
                "Pendência demonstrativa atualizada.",
                edit.companyId,
              );
              setEdit(null);
            }}
          >
            Salvar atribuição local
          </button>
        </Modal>
      )}
    </>
  );
}
export function Certificates() {
  const { state } = useDemo();
  const { companyId } = useWorkspace();
  const [selected, setSelected] = useState("");
  const companies = state.companies.filter(
    (c) => companyId === "all" || c.id === companyId,
  );
  return (
    <>
      <p className="notice">
        Somente metadados fictícios. Não há upload PFX/P12, senha, chave
        privada, certificado real ou operação criptográfica.
      </p>
      <div className="card-grid">
        {companies.map((c) => {
          const cert = state.certificates.find((a) => a.companyId === c.id);
          return (
            <section className="panel" key={c.id}>
              <ShieldCheck className="gold-text" size={24} />
              <h3>{c.name}</h3>
              <Badge>{cert?.status || "Não configurado — DEMO"}</Badge>
              <p>{cert?.holder || "Sem titular — exemplo de estado vazio"}</p>
              <p>
                Tipo: A1 · Validade fictícia:{" "}
                {cert ? displayDate(cert.expires) : "Não configurada"}
              </p>
              <p>Responsável: {cert?.owner || c.owner}</p>
              <button className="secondary" onClick={() => setSelected(c.id)}>
                Ver metadados e ciclo futuro
              </button>
            </section>
          );
        })}
      </div>
      {selected && (
        <Modal
          title="Certificado A1 — representação fictícia"
          close={() => setSelected("")}
        >
          <h3>{state.companies.find((c) => c.id === selected)?.name}</h3>
          <p>
            {state.certificates.find((c) => c.companyId === selected)?.status ||
              "Não configurado"}
          </p>
          <ol>
            <li>Autorização do cliente e representação legítima</li>
            <li>Validação em fluxo seguro</li>
            <li>Cofre KMS/HSM com acesso mínimo</li>
            <li>Rotação e renovação</li>
            <li>Uso restrito e rastreado</li>
            <li>Logs com integridade</li>
          </ol>
          <p className="notice">
            Cofre digital — previsto para Fase 2. Não forneça arquivos ou
            segredos neste protótipo.
          </p>
        </Modal>
      )}
    </>
  );
}
export function Users() {
  const { state, mutate } = useDemo();
  const { companyId } = useWorkspace();
  const [selected, setSelected] = useState("");
  const users = state.users.filter(
    (u) => companyId === "all" || u.companyIds.includes(companyId),
  );
  const user = state.users.find((u) => u.id === selected);
  const allowed = canAdminister(state.preferences.adminRole);
  return (
    <>
      <p className="notice">
        Apenas design — autenticação/autorização não implementadas.
        Conceder/revogar altera somente a apresentação dos usuários fictícios.
      </p>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>USUÁRIO FICTÍCIO</th>
                <th>CLIENTE / EMPRESAS VINCULADAS</th>
                <th>PAPEL DEMO</th>
                <th>STATUS</th>
                <th>AÇÃO LOCAL</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>
                    {state.accounts.find((a) => a.id === u.clientId)?.name ||
                      "Equipe do escritório"}
                    <small>
                      {u.companyIds
                        .map(
                          (id) =>
                            state.companies.find((c) => c.id === id)?.document,
                        )
                        .join(", ")}
                    </small>
                  </td>
                  <td>{u.role}</td>
                  <td>
                    <Badge>
                      {u.active ? "Acesso simulado ativo" : "Revogado (visual)"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      disabled={!allowed}
                      title={
                        !allowed
                          ? "Perfil Analista — ajuste administrativo indisponível"
                          : ""
                      }
                      className="secondary"
                      onClick={() => setSelected(u.id)}
                    >
                      {u.active
                        ? "Revogar acesso simulado"
                        : "Conceder acesso simulado"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Comparação de permissões visuais</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PAPEL</th>
                <th>EMITIR / EDITAR</th>
                <th>CONSULTAR / EXPORTAR</th>
                <th>ADMINISTRAR</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Administrador IA Compliance",
                  "Pela experiência do cliente",
                  "Carteira completa",
                  "Escritório",
                ],
                [
                  "Analista do Escritório",
                  "Pela experiência do cliente",
                  "Carteira completa",
                  "Ajustes restritos visualmente",
                ],
                ["Gestor do Cliente", "Sim", "Sua empresa", "Equipe visual"],
                ["Emissor do Cliente", "Sim", "Sua empresa", "Não"],
                ["Consulta do Cliente", "Não", "Sua empresa", "Não"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {user && (
        <Modal
          title="Confirmar alteração de acesso simulado?"
          close={() => setSelected("")}
        >
          <p>
            {user.name} · {user.role}
          </p>
          <p>
            Este protótipo não implementa autenticação, RBAC ou proteção por
            URL.
          </p>
          <button
            onClick={() => {
              mutate(
                (s) => ({
                  ...s,
                  users: s.users.map((u) =>
                    u.id === user.id ? { ...u, active: !u.active } : u,
                  ),
                }),
                "Acesso visual do usuário DEMO atualizado.",
              );
              setSelected("");
            }}
          >
            Confirmar alteração visual
          </button>
        </Modal>
      )}
    </>
  );
}
export function Fiscal() {
  const { state } = useDemo();
  const { companyId } = useWorkspace();
  const [tab, setTab] = useState("ISS");
  const [suggest, setSuggest] = useState(false);
  return (
    <>
      <p className="notice">
        {fiscalDisclaimer}. Classificações e parâmetros não foram consultados.
        Integrações e regras oficiais ficam para a Fase 2.
      </p>
      <div className="tabs">
        {[
          "ISS",
          "Retenções",
          "IBS/CBS",
          "Classificações",
          "Regras Municipais",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>{tab} — matriz de layout</h2>
          <button className="secondary" onClick={() => setSuggest(true)}>
            Sugerir enquadramento fictício
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EMPRESA / MUNICÍPIO</th>
                <th>REGIME</th>
                <th>EXEMPLO DE CAMPO</th>
                <th>STATUS / FONTE FUTURA</th>
              </tr>
            </thead>
            <tbody>
              {state.companies
                .filter((c) => companyId === "all" || c.id === companyId)
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name}
                      <small>{c.city}</small>
                    </td>
                    <td>{c.regime}</td>
                    <td>
                      {tab === "IBS/CBS"
                        ? "EX-CST / EX-cClassTrib"
                        : tab === "Classificações"
                          ? "EX-NBS — ilustrativo"
                          : "A confirmar na Fase 2"}
                    </td>
                    <td>
                      <Badge>Não consultado</Badge>
                      <small>
                        Documentação oficial e revisão humana futuras
                      </small>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {suggest && (
        <Modal
          title="SUGESTÃO SIMULADA — REQUER REVISÃO HUMANA"
          close={() => setSuggest(false)}
        >
          <p>
            Exemplo didático: revisar descrição, município, regime e situação da
            prestação antes de definir qualquer enquadramento.
          </p>
          <p>
            Nenhuma IA, prefeitura ou órgão público foi consultado. Não há
            recomendação tributária válida.
          </p>
        </Modal>
      )}
    </>
  );
}
export function Integrations() {
  const [selected, setSelected] = useState("");
  return (
    <>
      <p className="notice">
        Simulação local / Não conectado. Nenhuma conexão com sistemas externos
        foi implementada.
      </p>
      <div className="card-grid">
        {[
          "SEFIN Nacional",
          "Parâmetros Municipais",
          "ADN",
          "DANFSe",
          "Certificados A1",
          "ERP / Contabilidade",
          "Notificações",
        ].map((name) => (
          <section className="panel" key={name}>
            <Layers size={25} className="gold-text" />
            <h3>{name}</h3>
            <Badge>Não conectado — Fase 2</Badge>
            <p>
              Disponibilidade e permissões dependem de escopo e documentação
              vigentes.
            </p>
            <button className="secondary" onClick={() => setSelected(name)}>
              Ver requisitos futuros
            </button>
          </section>
        ))}
      </div>
      {selected && (
        <Modal
          title={selected + " — requisitos futuros"}
          close={() => setSelected("")}
        >
          <p>Planejamento, sem implementação:</p>
          <ol>
            <li>
              Confirmar municípios, operações e credenciamento aplicáveis.
            </li>
            <li>Definir fontes oficiais, contratos e autorização por CNPJ.</li>
            <li>Autenticação, permissões e gestão de segredos no backend.</li>
            <li>Testar contratos, falhas, idempotência e auditoria.</li>
            <li>
              Validar com responsáveis e liberar progressivamente na Fase 2.
            </li>
          </ol>
          <p className="notice">
            Não há botão de conexão nem transmissão neste protótipo.
          </p>
        </Modal>
      )}
    </>
  );
}
export function Activities({
  notifications = false,
}: {
  notifications?: boolean;
}) {
  const { state, mutate } = useDemo();
  const { companyId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(false);
  return (
    <>
      <p className="notice">
        {notifications
          ? "Avisos fictícios deste navegador, sem entrega por e-mail ou mensagem."
          : "Histórico demonstrativo local — não é log de auditoria imutável."}
      </p>
      <div className="filters">
        <input
          aria-label="Pesquisar histórico ou alertas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar..."
        />
        {notifications && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={unread}
                onChange={(e) => setUnread(e.target.checked)}
              />{" "}
              Apenas não lidos
            </label>
            <button
              className="secondary"
              onClick={() =>
                mutate(
                  (s) => ({
                    ...s,
                    notifications: s.notifications.map((n) =>
                      companyId === "all" || n.companyId === companyId
                        ? { ...n, read: true }
                        : n,
                    ),
                  }),
                  "Alertas do contexto marcados como lidos.",
                )
              }
            >
              Marcar todos como lidos
            </button>
          </>
        )}
      </div>
      <section className="panel">
        {notifications
          ? companyRecords(state.notifications, companyId)
              .filter(
                (n) =>
                  (!unread || !n.read) &&
                  n.title.toLowerCase().includes(query.toLowerCase()),
              )
              .map((n) => (
                <div className="notification" key={n.id}>
                  <Bell size={19} />
                  <div>
                    <strong>{n.title}</strong>
                    <small>
                      {state.companies.find((c) => c.id === n.companyId)?.name}{" "}
                      ·{" "}
                      {n.muted
                        ? "Silenciado localmente"
                        : n.read
                          ? "Lido"
                          : "Não lido"}
                    </small>
                  </div>
                  <div className="actions">
                    <Link className="button secondary" href={n.href}>
                      Abrir item
                    </Link>
                    <button
                      className="secondary"
                      onClick={() =>
                        mutate(
                          (s) => ({
                            ...s,
                            notifications: s.notifications.map((x) =>
                              x.id === n.id
                                ? { ...x, read: true, muted: true }
                                : x,
                            ),
                          }),
                          "Alerta silenciado localmente.",
                          n.companyId,
                        )
                      }
                    >
                      Ler / silenciar
                    </button>
                  </div>
                </div>
              ))
          : state.activities
              .filter(
                (a) =>
                  (companyId === "all" ||
                    !a.companyId ||
                    a.companyId === companyId) &&
                  a.message.toLowerCase().includes(query.toLowerCase()),
              )
              .map((a) => (
                <div className="activity" key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <p>{a.message}</p>
                    <small>
                      {displayDate(a.at)} ·{" "}
                      {a.companyId || "Demonstração local"}
                    </small>
                  </div>
                </div>
              ))}
      </section>
    </>
  );
}
export function Settings({ profile = false }: { profile?: boolean }) {
  const { state, preferences, reset } = useDemo();
  const { portal, company, companyId } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  const [tour, setTour] = useState(false);
  const [team, setTeam] = useState(false);
  return (
    <>
      <div className="two-columns">
        <section className="panel">
          <h2>
            {profile
              ? "Empresa e perfil demonstrativos"
              : "Preferências da demonstração"}
          </h2>
          {profile && (
            <>
              <p className="notice">
                {company?.name}
                <br />
                {company?.document} · {company?.city}
                <br />
                {company?.regime}
                <br />
                Acesso exclusivamente visual, sem segurança real.
              </p>
              <Field label="Persona do cliente">
                <select
                  value={state.preferences.clientRole}
                  onChange={(e) =>
                    preferences({ clientRole: e.target.value as ClientRole })
                  }
                >
                  {clientRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              {canManageTeam(state.preferences.clientRole) && (
                <button className="secondary" onClick={() => setTeam(true)}>
                  Equipe e permissões (design)
                </button>
              )}
            </>
          )}
          <Field label="Tema">
            <select
              value={state.preferences.theme}
              onChange={(e) =>
                preferences({ theme: e.target.value as "light" | "dark" })
              }
            >
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </Field>
          <Field label="Densidade das tabelas">
            <select
              value={state.preferences.density}
              onChange={(e) =>
                preferences({
                  density: e.target.value as "compact" | "comfortable",
                })
              }
            >
              <option value="comfortable">Confortável</option>
              <option value="compact">Compacta</option>
            </select>
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={state.preferences.alerts}
              onChange={(e) => preferences({ alerts: e.target.checked })}
            />{" "}
            Alertas visuais demonstrativos
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={state.preferences.hints}
              onChange={(e) => preferences({ hints: e.target.checked })}
            />{" "}
            Dicas de navegação
          </label>
          <p className="muted">Idioma: Português brasileiro · pt-BR</p>
          <div className="actions">
            <button className="secondary" onClick={() => setTour(true)}>
              Reiniciar tour {portal ? "do cliente" : "do escritório"}
            </button>
            <Link className="text-link" href="/demonstracao">
              Ver roteiro de validação <ArrowRight size={13} />
            </Link>
          </div>
        </section>
        <section className="panel">
          <h2>
            {portal
              ? "Como funciona este acesso?"
              : "Restaurar os dados locais"}
          </h2>
          <p>
            Todos os dados são inventados e ficam somente neste navegador, sem
            nuvem. Trocar de dispositivo não compartilha notas, tickets ou
            opiniões.
          </p>
          <p className="notice">
            Nada é transmitido, assinado ou consultado. Não informe dados de
            clientes reais, documentos, senhas ou certificados.
          </p>
          {!portal && (
            <button
              className="danger-button"
              disabled={!canAdminister(state.preferences.adminRole)}
              title="Ação administrativa da persona Administrador"
              onClick={() => setConfirm(true)}
            >
              Restaurar demonstração
            </button>
          )}
          <details>
            <summary>O que fica para a Fase 2?</summary>
            <p>
              Backend, autenticação/MFA, RBAC/ABAC, multi-tenancy, banco, fontes
              oficiais, XML/XSD, assinatura, A1 em cofre, auditoria segura,
              revisão tributária e implantação.
            </p>
          </details>
        </section>
      </div>
      {confirm && (
        <Modal
          title="Restaurar toda a demonstração?"
          close={() => setConfirm(false)}
        >
          <p>
            Notas criadas, cadastros, rascunhos, tickets, feedback, avaliação e
            preferências V2 serão restaurados. Essa ação afeta somente este
            navegador.
          </p>
          <button
            onClick={() => {
              reset();
              setConfirm(false);
            }}
          >
            Confirmar restauração completa
          </button>
        </Modal>
      )}
      {tour && <Tour portal={portal} close={() => setTour(false)} />}
      {team && (
        <Modal
          title="Equipe e permissões — apenas design"
          close={() => setTeam(false)}
        >
          <p>
            Nenhuma autenticação ou autorização real. Vínculos fictícios para
            avaliar a interface.
          </p>
          {state.users
            .filter(
              (u) =>
                u.companyIds.includes(companyId) && u.role.includes("Cliente"),
            )
            .map((u) => (
              <div className="rank" key={u.id}>
                <div>
                  <strong>{u.name}</strong>
                  <small>{u.role}</small>
                </div>
                <Badge>{u.active ? "Ativo visual" : "Revogado visual"}</Badge>
              </div>
            ))}
          <p>
            Gestor: emite e acompanha equipe visual. Emissor: emite e consulta.
            Consulta: consulta e exporta.
          </p>
        </Modal>
      )}
    </>
  );
}
