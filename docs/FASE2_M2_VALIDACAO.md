# Relatório final M2 — 12/11/2026

**M2 implementado e validado localmente; homologação remota Asaas Sandbox pendente.** Nenhuma emissão NFS-e real, cobrança de produção ou publicação pública de aplicativo foi realizada.

## Base, retomada e arquivos

Base auditada: branch `main`, commit `19d6746`, inicialmente sem alterações locais. Após desligamento do computador, os arquivos foram preservados e os serviços reiniciados. O commit/push da entrega é informado ao operador; `git log -1` identifica o hash final, sem incluir segredos neste documento.

- `backend/app/billing_models.py`: 11 tabelas comerciais (catálogo, versões, decisões, contas, contratos, períodos, cobranças, consumo, inbox, conciliações e ajustes), separadas de NFS-e.
- `billing_service.py`, `billing_domain.py`, `billing_schemas.py`, `billing_api.py`: snapshots, ciclos/calendário, dinheiro Decimal, franquia, estados, concessões, idempotência, APIs e escopos M1.
- `asaas.py`: cliente HTTP assíncrono, destino Sandbox fixo, timeout/retries limitados, URLs hospedadas validadas, proibição de excedente faturável e produção. `billing_jobs.py`: inbox/fila PostgreSQL, conciliação, correlação e logs JSON saneados; sem dependência de Redis nativo.
- `models.py`, `policy.py`, `config.py`, `grants.py`, `providers.py`, `main.py`, `cli.py`: extensão incremental de auditoria, permissões financeiras, flags e contrato assíncrono; autenticação e restrições fiscais preservadas. Fixtures reservadas têm reset de autenticação explicitamente restrito ao desenvolvimento.
- `src/operational/BillingApp.tsx`, `src/app/billing.css`: telas administrativas e portal ligados à API; ajustes de navegação, mensagens e preferência de empresa em sessionStorage (sem credenciais/dados comerciais).
- `backend/tests/test_billing.py`, `test_migrations.py`, `tests/operational/m1.spec.ts`: novos casos financeiros, regressão, preservação M1 e navegador.
- `.env.example`, Compose, requisitos/lock, README, CLAUDE e documentação M2 atualizados; especificação original M2 copiada para o repositório.

## Migrações e riscos

| Revisão | Alteração | Risco / reversão |
|---|---|---|
| `caf2d13522bd` | Dez tabelas comerciais, FKs, constraints, índices e unicidade de contrato/evento externo | Aditiva; downgrade remove somente dados M2, exigindo exportação prévia se houver registros úteis |
| `44a34ee23aa1` | Flag de pausa/revisão comercial | Default falso para dados existentes; remoção perde a flag, portanto revisar contratos antes de reverter |
| `303626a51d1f` | Histórico de publicação/arquivamento de planos | Aditiva; exportar decisões antes de downgrade |
| `3325440ed3d7` | `audit_logs.details` com JSON vazio para registros antigos | Não apaga linha M1; downgrade perde somente os metadados novos, que precisam ser exportados |

Upgrade aplicado no PostgreSQL local. Upgrade/downgrade completo e retorno ao M1 foram testados em schemas isolados de `compliance_test`; organização e registro de auditoria M1 sobreviveram ao ciclo. Nenhum downgrade foi executado contra os dados úteis locais. Privilégios do runtime impedem UPDATE/DELETE em auditoria, versões, decisões, ajustes e ledger; não substituem repositório imutável contra administradores do banco.

## Verificações efetivamente executadas

| Comando / verificação | Resultado |
|---|---|
| `.venv/Scripts/python.exe -m pytest -p no:cacheprovider` em `backend` | **57 aprovados**, PostgreSQL real; inclui 26 casos anteriores M1 e 31 casos/parametrizações novos |
| `backend/.venv/Scripts/python.exe -m ruff check backend` | Aprovado |
| `npx.cmd tsc --noEmit` | Aprovado |
| `npm.cmd run lint` | Aprovado |
| `npm.cmd test` | **10 aprovados**, domínio DEMO |
| `npm.cmd run build` | Aprovado, export DEMO, 355 páginas geradas |
| `npm.cmd run build:operational` | Aprovado, standalone operacional, 355 páginas pré-geradas e rotas dinâmicas operacionais |
| `npm.cmd run test:operational` | **3 jornadas aprovadas**: duas M1 e uma jornada M2 extensa |
| `DEMO_BASE_URL=http://127.0.0.1:3003 npm.cmd run test:e2e` (equivalente PowerShell no guia) | **8 jornadas aprovadas**, build estático DEMO |
| `python -m app.billing_jobs --once` | Consumidor nativo executado com sucesso; concessão mantida e conciliação desabilitada permaneceu pendente com erro de configuração, sem pagamento fabricado |
| `scripts/verify_m1_artifacts.py` | YAML estrutural inspecionado, snapshot Python gerado e checagem contra segredos locais em código/bundles públicos |

Casos cobertos: plano/publicação/versões e motivo; snapshot e próximo ciclo sem pró-rata; contratação repetida/conflitante; cortesia sem cobrança; pagamento confirmado versus recebido; estorno/chargeback e metadados de estorno parcial mesmo com status RECEIVED; evento antigo de atraso; identidade/valor divergentes; webhook errado/duplicado, redação e falha de commit sem ACK; evento desconhecido; dead-letter/retry autorizado; criação inconclusiva sem novo POST; ledger sintético deduplicado/compensado, promoção fiscal rejeitada também pelo banco; Decimal, dia 31/ano bissexto/timezone; carência, pausa/retomada, override, login e histórico; concessão/revogação financeira explícita, auditoria e isolamento por CNPJ/organização.

## Telas e navegador

| Administração | Portal cliente |
|---|---|
| `/admin/financeiro` — indicadores e gráfico | `/portal/assinatura` — contrato/ciclo, avisos e delegação |
| `/admin/financeiro/planos` — formulário, rascunho/publicação e versões | `/portal/mensalidades` — cobranças/segunda via observada |
| `/admin/financeiro/assinaturas` — titular, contrato, concessões e histórico | `/portal/consumo` — franquia, eventos e prévia não faturável |
| `/admin/financeiro/cobrancas` — listagem, filtros, detalhe e links seguros | `/portal/planos` — catálogo publicado e solicitação sujeita à aprovação |
| `/admin/financeiro/consumo` — períodos, simulação e compensação | Acesso limitado às empresas da identidade autenticada |
| `/admin/financeiro/integracoes` — flags, conciliações e inbox | Sem escrita financeira por emissor/consulta |
| `/admin/financeiro/politicas` — carência/critério de ativação e concessões | Login/histórico/faturas acessíveis mesmo com restrição comercial |

A jornada M2 de navegador cria empresa fictícia autorizada, plano, publica com confirmação, salva titular, concede cortesia com revisão e registra consumo sintético; confere recarga/persistência, pagável zero, status de integração desativada, solicitação de conciliação e navegação dos dois portais. O portal foi verificado em **1440×900, 768×1024 e 390×844**, com screenshots locais e ausência de overflow horizontal; a captura móvel foi inspecionada. As duas jornadas M1 e oito DEMO preservaram emissão simulada, rascunhos, MFA/convites, isolamento, teclado, exportação, feedback e responsividade.

As telas de cobranças foram verificadas com estado vazio; pagamentos/cancelamento externo e segunda via foram exercitados por testes sintéticos de backend, **não por cobrança remota real**. Registros fictícios de testes de navegador permanecem no banco local para revisão. Credenciais e imagens de teste não foram publicadas.

## Estado de execução e integração

- Portal operacional nativo: **http://localhost:3001**. API local: **http://127.0.0.1:8000/api/docs**, health `/api/health`. DEMO preservada em **http://localhost:3000** (e porta 3003 usada na regressão estática).
- PostgreSQL 17 local em 127.0.0.1:55432; conta de runtime separada do migrador. `.local/m1-access.json` contém somente acessos fictícios locais, não versionados; senhas e chaves nunca foram impressas.
- **Asaas: adaptador implementado + contrato HTTP/respostas sintéticas testados. Chamadas remotas Sandbox NÃO executadas/validadas.** Flags externas desativadas. Nenhum fallback simula pagamento ou integração pronta.
- **Docker/Compose e Redis nativo não executados**, pois não estão instalados. YAML inspecionado não equivale a runtime de containers. Filas comerciais foram testadas/executadas nativamente no PostgreSQL.
- Aviso de depreciação TestClient/Starlette relativo a httpx permanece, sem falha de teste. Tentativas iniciais encontraram schema de ALTER TABLE e seletores ambíguos do teste de navegador; foram corrigidos e a rodada concluída passou.

## Pendências de homologação e bloqueios para M3

1. Configurar chave exclusiva Sandbox e token de webhook próprios no ambiente seguro; cadastrar pagador de teste autorizado, com notificações desabilitadas e dados mínimos. Não converter identificadores DEMO do M1 em CNPJs reais automaticamente.
2. Validar ida/volta remota, links hospedados, autenticação de webhook, HTTPS/proxy confiável, duplicação, atraso, estorno, timeout e conciliação. Nenhum túnel/publicação pública foi aberto nesta entrega.
3. Aprovar preços, excedente, condições de cortesia/desconto, carência, suspensão/cancelamento/reembolso, retenção e política de consumo após cancelamento fiscal. Recebimentos exibidos são valores brutos de cobranças observadas no Sandbox, não saldo bancário ou apuração líquida de taxas/estornos.
4. Ambiguidades de criação, eventos sem contrato e revisões de estorno exigem intervenção controlada; não há botão de “marcar pago”. Estados desconhecidos não concedem acesso. Operação em grande volume, múltiplas réplicas, banco gerenciado, backup/restauração e monitoramento precisam de validação de infraestrutura.
5. M3 exige credenciamento/representação, cofre A1/KMS, schemas/XSD, assinatura e provider fiscal autorizado, idempotência de transmissão e origem interna confiável do consumo. O ledger M2 recusa consumo fiscal faturável por desenho e não deve ser liberado apenas mudando a UI.
6. Revisão independente de segurança/LGPD, testes externos e aprovação humana continuam necessários; a aplicação não está aprovada para produção.
