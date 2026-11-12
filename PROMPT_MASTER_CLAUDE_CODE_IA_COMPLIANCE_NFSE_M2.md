# PROMPT MASTER — IA COMPLIANCE NFS-e | FASE 2 — M2
## Implantação incremental: planos, assinaturas, cobrança Asaas Sandbox, consumo e conciliação

**Destinatário:** Claude Code operando DENTRO do repositório existente `https://github.com/PIETRO67/Compliance-NFE`.
**Base de referência:** Fase 2 M1, commit `19d6746` (confirme o HEAD antes de alterar arquivos).
**Natureza da tarefa:** IMPLEMENTAR código, migrações, telas, testes e documentação, e não apenas planejar.
**Idioma da interface:** português brasileiro. **Moeda:** BRL. **Fuso de negócio:** `America/Sao_Paulo` (persistir instantes em UTC).
**Ambiente de pagamento autorizado neste marco:** APENAS Asaas Sandbox, mediante credenciais que o operador configure localmente. Não efetuar cobranças financeiras reais.

---

## 0. Missão, contexto e regras inegociáveis

Você é o arquiteto e engenheiro sênior responsável por evoluir a aplicação EXISTENTE do Grupo IA Compliance. O projeto disponibiliza um portal administrativo para o escritório e um portal de autoatendimento para clientes, cada cliente acessando unicamente os CNPJs autorizados.

O M1 já implementou FastAPI, SQLAlchemy, PostgreSQL, Alembic, autenticação com sessões revogáveis, MFA, sete perfis, convites, isolamento por organização/empresa, auditoria e rascunhos persistentes. A demonstração antiga continua isolada do modo operacional. O M2 adicionará a gestão comercial e financeira, SEM autorizar emissão fiscal, certificado A1, comunicação com SEFIN Nacional ou outras integrações fiscais (reservadas ao M3).

### Restrições absolutas

1. **NÃO recriar o projeto; NÃO substituir a arquitetura do M1.** Antes de escrever código, leia `CLAUDE.md`, `README.md`, `docs/FASE2_M1_EXECUCAO.md`, `docs/FASE2_M1_VALIDACAO.md`, `docs/FASE2_M1_INVENTARIO.md` (se existir), `PLANO_FASE2_IA_COMPLIANCE_NFSE_OPERACIONAL.md` e os contratos de providers existentes.
2. Preserve as rotas `/admin` e `/portal`, os componentes, a identidade visual preto/dourado/branco com vermelho reservado a alertas e o modo DEMO em `localhost:3000`. O modo operacional continua em `localhost:3001` no desenvolvimento nativo descrito pelo M1.
3. O backend de negócio continua **apenas em `backend/app` (FastAPI)**. Não criar backend paralelo, API Routes de negócio ou Server Actions no Next.js. Reutilizar o proxy `/api` já existente.
4. Reutilizar o PostgreSQL, Alembic, autorização por empresa e organização, cookies HttpOnly, CSRF, sessões revogáveis, MFA, autenticação e infraestrutura de auditoria do M1. Não inventar um segundo sistema de acesso.
5. Não utilizar localStorage como fonte de verdade no modo operacional. Dados e regras comerciais são persistidos no banco; o navegador exibe resultados de APIs autenticadas.
6. **Proibir chamadas de produção do Asaas no M2.** Implementar trava explícita de ambiente: somente `https://api-sandbox.asaas.com/v3` quando `ASAAS_MODE=sandbox`; se qualquer configuração apontar para produção, impedir inicialização do adaptador ou operação, com erro seguro.
7. Não inventar pagamentos recebidos. Uma assinatura `ACTIVE` deve depender de regra contratual explícita e comprovação do evento de pagamento, reconciliação verificada ou concessão administrativa auditada. Criar assinatura no Asaas não prova pagamento.
8. Não integrar SEFIN, não assinar XML fiscal, não abrir emissão real, não contabilizar notas fictícias como autorizadas, não enviar notificações reais a terceiros em testes.
9. Não executar migrações destrutivas nos dados de M1. Criar migrações Alembic reversíveis ou justificar reversão manual com preservação de dados; testar em PostgreSQL real de teste e apresentar risco de cada migração.
10. Nunca publicar `.env`, `.local`, chave do Asaas, token de webhook, credenciais, dumps, dados pessoais de terceiros, cartões ou arquivos de certificado; não exibir segredos em logs, prints ou relatórios.
11. Não ativar produção, não publicar aplicativo aberto na internet, não executar cobranças reais e não realizar mudanças comerciais irreversíveis sem aprovação explícita do responsável pelo projeto.
12. Use valores monetários em `Decimal`/`NUMERIC(18,2)` e cálculo determinístico; **nunca float** para cobrança. Definir política de arredondamento, moeda e impostos sem improvisar obrigação tributária.
13. Caso não existam credenciais de sandbox, NÃO interrompa a construção inteira: implemente provider real e testes contratuais com respostas sintéticas claramente identificadas, mantenha chamadas externas desativadas e descreva que a homologação remota está pendente. Jamais alegue que integração real foi testada sem comunicação confirmada.

---

## 1. Inspeção inicial obrigatória

Antes da implementação, gere uma análise curta em `docs/FASE2_M2_DIAGNOSTICO.md` contendo:

- HEAD, branch, estado de alterações locais (`git status`); não sobrescrever mudanças não relacionadas e não presumir que o commit `19d6746` ainda é o HEAD;
- mapeamento das entidades de M1 (`organizations`, `companies`, `users`, memberships/roles, auditoria, drafts), nomes reais e relações;
- versão e organização do provider `PaymentProvider`, serviço de autenticação, cliente HTTP do frontend e padrões de testes;
- arquitetura efetiva de `backend/app`, migrations, componentes de `src/operational`, worker e Compose;
- matriz de APIs/telas do M2 a construir, preservando os padrões de implementação do repositório;
- riscos identificados e decisões adotadas. Se algum arquivo esperado não existir, localizar o equivalente e registrar.

Implemente logo após esse diagnóstico; não pare apenas na fase de planejamento.

## 2. Funcionalidades de produto do M2

### 2.1 Planos

Criar catálogo administrável de planos com nome, descrição, status (rascunho, publicado, arquivado), preço mensal BRL, franquia mensal de emissões futuras, preço unitário de excedente, limite opcional de usuários, recursos habilitados e marcação de plano oferecido a clientes contábeis. O plano pode ter preço zero ou desconto contratual, mas isso exige autorização administrativa, justificativa e auditoria.

**Três modelos de rascunho ilustrativos, NÃO publicados nem automaticamente oferecidos:**

| Plano | Mensalidade de exemplo | Franquia de exemplo | Excedente |
|---|---:|---:|---|
| Essencial | R$ 79,00 | 50 emissões/mês | configurável, inicialmente vazio |
| Profissional | R$ 149,00 | 200 emissões/mês | configurável, inicialmente vazio |
| Empresarial | R$ 299,00 | 600 emissões/mês | configurável, inicialmente vazio |

Nunca pressupor que os preços estão comercialmente aprovados. O administrador deve poder publicar planos depois de confirmar valores. Usar versionamento/snapshot: alterações futuras em preço ou franquia não devem reescrever o acordo comercial de períodos fechados. Implementar histórico de mudanças, vigência e política explícita de migração de plano (por padrão, mudança no próximo ciclo, sem pró-rata automático).

### 2.2 Contas de faturamento e assinatura por CNPJ

Cada CNPJ contratante terá uma conta de faturamento, com titular, e-mail e endereço de cobrança. A estrutura deve suportar mais de um usuário associado à mesma empresa, mas a cobrança pertence ao CNPJ/contrato e **não à sessão do usuário**. Não duplicar assinaturas ativas para o mesmo contrato/serviço. Preparar futuramente contratos multi-CNPJ sem compartilhar dados privados nem criar faturamento conjunto automaticamente.

A assinatura deve registrar: empresa, plano e versão, valor e franquia contratados, modalidade (paga, cortesia/inclusa no serviço contábil, teste), início, renovação, vencimento, período de consumo, provedor, identificadores externos, estado (`PENDING`, `ACTIVE`, `GRACE`, `PAST_DUE`, `SUSPENDED`, `CANCELLED`, `EXPIRED`), política de carência configurável, motivo e auditoria.

Na modalidade cortesia/inclusa, um administrador autorizado precisa conceder explicitamente a condição e data de revisão; não gerar cobrança Asaas, não fingir pagamento. Preservar trilha para futuras condições comerciais.

### 2.3 Cobranças

Permitir visualizar todas as cobranças da assinatura, com ID do provedor, vencimento, valor, forma, link externo de pagamento fornecido pelo Asaas e status. Em `PENDING`/`OVERDUE` não liberar recursos automaticamente. O saldo comercial é distinto do saldo de conta Asaas.

Tipos: mensalidade base e excedente (quando tiver evento fiscal REAL e aprovação de faturamento). Não gerar cobrança de excedente com dados DEMO/M1. O M2 pode criar prévias não faturáveis para validar a UX.

Não coletar nem armazenar número de cartão, CVV ou credenciais bancárias. Preferir link/checkout hospedado pelo provedor e somente URLs oficialmente retornadas.

### 2.4 Uso, franquia e excedente

Criar um **ledger de consumo imutável no sentido de evento compensável**, com identificador único da origem, tipo, CNPJ, assinatura, período, timestamp, unidades, origem e classificações `SIMULATED`/`FISCAL_AUTHORIZED`/`REVERSAL`. A contagem cobrável será alimentada no M3 exclusivamente pelo evento confiável de emissão fiscal autorizada, não por rascunho, cliques, tentativas, rejeições ou demonstrações.

No M2: implementar engine, contadores, cálculo da franquia, prévia de excedente e testes com eventos sintéticos marcados `SIMULATED` e `billable=false`; bloquear sua promoção para faturamento. O LEDGER não pode aceitar eventos `FISCAL_AUTHORIZED` por uma API pública comum: reservar somente para integração interna autenticada e desabilitada até o M3. Duplicações ou retentativas com mesmo identificador não aumentam o consumo.

Exemplo de cálculo somente de prévia:

```
franquia = 200
quantidade_autorizada = 240
excedente = max(0, 240 - 200) = 40
valor_excedente = 40 × valor_unitário_contratado
```

O exemplo acima não autoriza emitir cobranças no M2. Determinar período de franquia com base no ciclo contratual (`start_at`, `end_at`) e timezone local, guardando datas em UTC; definir regras de transição de plano, estorno e correção. Cancelamento da NFS-e após emissão deve gerar política de faturamento explícita, sem subtrair histórico silenciosamente.

### 2.5 Inadimplência e permissões comerciais

Motor de regras no servidor: após vencimento, aplicar carência configurável e avisos; só então marcar eventual suspensão de **novas funcionalidades comerciais futuras**, com registro e possibilidade de override por administrador autorizado. **Não bloquear login, consulta, downloads de documentos fiscais históricos, acesso às faturas ou meios de regularizar a dívida.** Como a emissão real só chegará no M3, apresentar controle de elegibilidade preparado e testado, mas não liberar ou bloquear transmissões fiscais em produção.

Conferir as transições contra eventos de pagamento, estorno, chargeback e conciliação; `CANCELLED` não significa automaticamente dívida e assinatura com cobrança não significa quitada.

---

## 3. Integração Asaas Sandbox — implementação real, sob configuração

### 3.1 Provider e credenciais

Implementar adaptador `AsaasSandboxPaymentProvider` obedecendo ao contrato `PaymentProvider` existente, expandindo-o de forma compatível se necessário. Use cliente HTTP assíncrono com timeout, backoff controlado, tratamento de 4xx/5xx, sanitização de erros e rastreamento de correlação.

Referências oficiais de integração:
- Sandbox: `https://api-sandbox.asaas.com/v3` — **única origem permitida nesta fase**.
- Autenticação via header `access_token` e `User-Agent` identificando a aplicação.
- Cliente: `POST /v3/customers` (guardar o ID externo, usar `externalReference`, consultar antes de retentar criação inconclusiva).
- Assinatura: `POST /v3/subscriptions` com `customer`, `billingType`, `value`, `nextDueDate`, `cycle=MONTHLY`, `externalReference` quando suportado pelo contrato vigente.
- Outras operações de consulta/atualização/cancelamento, cobranças e webhook: **verificar a documentação oficial antes de codificar os endpoints**; não inventar paths/campos/eventos.

É importante distinguir: assinatura com `billingType=PIX` gera cobranças Pix periódicas, mas **não equivale a débito Pix Automático**. Deixe Pix Automático fora do escopo inicial, marcando como evolução futura. Cartão de crédito deve usar fluxo seguro oficialmente suportado e não receber dados sensíveis do cartão no nosso frontend.

Configuração sugerida (nomes podem ser adaptados ao padrão do M1):

```
PAYMENT_PROVIDER=asaas
ASAAS_MODE=sandbox
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=<carregar do ambiente seguro, nunca versionar>
ASAAS_WEBHOOK_AUTH_TOKEN=<segredo próprio, NÃO a API key>
ASAAS_HTTP_USER_AGENT=IAComplianceNFSe-M2/0.2
ENABLE_BILLING_SANDBOX=false
ENABLE_BILLING_PRODUCTION=false
```

Separar flag de provider configurado e de envio real; deixar desativado por padrão. Se não houver chave, retornar erro de configuração útil à área administrativa, sem abrir fallback silencioso para provedor fictício. Atualizar `.env.example` com placeholders, nunca credenciais.

### 3.2 Jornada de contratação

1. Gestor autorizado escolhe empresa e plano publicado.
2. Backend valida vínculo organizacional, permissões, titular da cobrança, termos comerciais e unicidade de contratação.
3. Cria a assinatura `PENDING` local com snapshot contratual, referência interna idempotente e estado de provisionamento.
4. Worker assegura cliente Asaas (reutiliza ID; verifica se houve criação antes de retry) e cria assinatura no Sandbox.
5. Persiste os IDs externos e registra cobranças observadas; não ativa recursos pagos só pela criação.
6. Exibe aos usuários autorizados o status e o link seguro de cobrança/segunda via, se informado pelo provedor.
7. Webhook autenticado e/ou conciliação confirmada atualiza cobrança e elegibilidade.
8. Processa renovação, atraso, cancelamento, estorno e falhas sem duplicidade.

### 3.3 Webhooks seguros e idempotentes

Criar endpoint público dedicado, por exemplo `POST /api/webhooks/asaas`, ajustado à estrutura existente. Para validar origem, exigir header `asaas-access-token` igual ao token de webhook configurado, com comparação segura; rejeitar ausente/incorreto; aplicar HTTPS, limite de tamanho de payload, validação estrita de schema, proteção operacional de abuso e controles de rede quando viáveis. **NÃO confundir esse token com o header `access_token` enviado em requisições de saída.**

Fluxo transacional:

```
RECEBER -> AUTENTICAR -> VALIDAR PAYLOAD -> INSERIR EVENTO ÚNICO EM INBOX POSTGRESQL
        -> RESPONDER HTTP 200 APÓS COMMIT DURÁVEL -> WORKER PROCESSA
        -> RECONCILIA COBRANÇA/ASSINATURA -> AUDITA
```

Usar `id` externo do evento como chave de unicidade; armazenar status de processamento, tentativas, erro saneado, datas e payload seguro/redigido quando necessário. Se for duplicado, devolver 200 sem repetir efeitos. Se a persistência falhar, responder erro para provocar retentativa, nunca 200 com evento perdido. Eventos podem chegar fora de ordem; usar máquina de estados com verificações adicionais ou consulta ao provedor. Eventos não reconhecidos devem ser guardados e classificados para revisão, sem conceder acesso nem atualizar recursos incorretos.

Tratar ao menos eventos de cobrança documentados: `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED` e eventos de assinatura documentados. Não igualar `PAYMENT_CONFIRMED` a dinheiro já disponível: distinguir pagamento confirmado versus recebido. Estornos e chargebacks exigem revisão de elegibilidade. O provisionamento pode usar confirmação de pagamento como regra contratual, sem confundir com disponibilidade bancária.

### 3.4 Conciliação e jobs

Implementar job acionável manualmente por gestor e agendável para:
- consultar cobranças/assinaturas relevantes no Sandbox;
- localizar eventos perdidos e estados inconsistentes;
- reconciliar IDs externos com referências internas;
- evitar duplicação de cobrança por timeouts/repetição;
- detectar filas paradas, webhooks pendentes ou assinaturas sem cobrança;
- registrar alterações, diferenças e resultado de cada tentativa.

A reconciliação nunca altera empresas fora do escopo ou remove eventos já registrados. Criar ferramentas administrativas para reprocessar eventos específicos com permissão e auditoria; jamais "marcar como pago" sem evidência ou concessão administrativa explicitamente diferente de pagamento.

---

## 4. Modelo relacional mínimo (adapte nomes aos padrões existentes)

Criar entidades/migrações normalizadas, com `organization_id` e/ou `company_id` coerentes com os escopos do M1, índices, constraints, FKs e unicidade:

| Entidade | Responsabilidade |
|---|---|
| `billing_accounts` | Titular do faturamento por CNPJ e ID do cliente Asaas no Sandbox |
| `billing_plans` | Catálogo de planos, estado, características |
| `billing_plan_versions` | Preço, franquia, preço excedente, vigência e versionamento |
| `billing_subscriptions` | Contrato de um CNPJ e máquina de estados; snapshot comercial |
| `billing_periods` | Janelas mensais, franquia aplicada e fechamento |
| `billing_charges` | Cobrança base/excedente, vencimento, valores e IDs Asaas |
| `billing_usage_events` | Ledger de consumo com origem única, classe e faturabilidade |
| `billing_webhook_inbox` | Eventos autenticados persistidos e reprocessáveis |
| `billing_reconciliation_runs` | Histórico de reconciliações e anomalias |
| `billing_adjustments` | Crédito, desconto, carência e concessão com autoria e motivo |

NÃO usar `invoices` para cobranças comerciais, pois o M3 terá entidades de NFS-e e documentos fiscais. Não armazenar cartão. Criar índices por empresa, período, status, ID externo e `source_event_id`. Aplicar restrição de unicidade do evento do Asaas e da cobrança externa por ambiente. Em migrações, não quebrar o banco atual.

O `ASAAS_MODE` deve estar associado à relação externa para impedir colisões entre sandbox e futuro ambiente de produção. Adicionar índices/unique constraints para evitar assinatura ativa duplicada, IDs externos inconsistentes e duplo lançamento de excedentes.

---

## 5. API interna FastAPI — contratos e autorização

Adequar ao padrão `/api` existente; endpoints a seguir são PROPOSTAS INTERNAS, não rotas oficiais Asaas:

### Administração

- `GET/POST /api/billing/plans` — listar/criar (publicação restrita).
- `GET/PATCH /api/billing/plans/{id}` — edição e versionamento.
- `POST /api/billing/plans/{id}/publish` — revisão/aprovação explícita.
- `GET /api/billing/companies/{company_id}/account` — conta de cobrança.
- `POST /api/billing/companies/{company_id}/subscriptions` — criar contratação idempotente.
- `GET /api/billing/companies/{company_id}/subscriptions` — listar assinaturas.
- `POST /api/billing/subscriptions/{id}/change-plan` — mudança com vigência controlada.
- `POST /api/billing/subscriptions/{id}/cancel` — cancelar conforme regra contratual.
- `GET /api/billing/charges` — cobranças com filtros de escopo.
- `GET /api/billing/usage` — consumo por empresa/período.
- `GET /api/billing/dashboard` — indicadores consolidados autorizados.
- `POST /api/billing/reconciliation-runs` — solicitar reconciliação auditada.
- `GET /api/billing/webhook-events` — fila e status para gestão autorizada.
- `POST /api/billing/webhook-events/{id}/retry` — reprocessamento auditado.

### Portal do cliente

- `GET /api/billing/my/subscription?company_id=...`
- `GET /api/billing/my/charges?company_id=...`
- `GET /api/billing/my/usage?company_id=...`
- `GET /api/billing/my/plans?company_id=...`

Todos os endpoints exigem autenticação/permissão do M1, exceto webhook que usa autenticação própria. O `company_id` do URL/query/body **NÃO define autorização**. Cada operação revalida o acesso no servidor; tentativa IDOR/cross-tenant não vaza existência de dados. Nunca aceitar `organization_id` arbitrário do frontend para ampliar acesso.

Qualquer alteração financeira de alto impacto exige autorização de perfil apropriado, MFA quando pertinente, motivo, registro de usuário e antes/depois. Aplicar paginação, filtros seguros, status HTTP corretos e schemas tipados.

---

## 6. Experiência visual — duas áreas operacionais

### Portal administrativo `/admin`

Integrar ao menu do M1, preservando o design:

- **Financeiro > Visão Geral:** assinaturas ativas, receita mensal contratada (MRR), recebimentos efetivos separadamente, inadimplência, próximas renovações, status do Sandbox, gráficos, filtros por plano e CNPJ.
- **Financeiro > Planos:** tabela, formulário/criação, editor de preço/franquia/excedente, pré-visualização, comparação de versões, publicar/despublicar.
- **Financeiro > Assinaturas:** contratar em nome de CNPJ, alterar plano, pausar/cancelar, conceder cortesia, ver linha do tempo de pagamento.
- **Financeiro > Cobranças:** status, vencimentos, detalhes, link externo, histórico, filtros por cliente, conciliação.
- **Financeiro > Consumo:** franquia, utilizado, excedente simulado, períodos e relatórios. Mostrar `SIMULAÇÃO — NÃO FATURÁVEL` onde aplicável.
- **Financeiro > Integrações:** estado configurado/desabilitado, log seguro, última conciliação, fila de webhook; nunca exibir chave/token em claro.
- **Financeiro > Políticas:** dias de carência, lembretes, regra de bloqueio de novas operações futuras (sem executar emissão fiscal).

### Portal de cliente `/portal`

- **Minha assinatura:** plano contratado, validade, franquia, renovação, situação e recursos.
- **Minhas mensalidades:** cobranças com vencimento, pagamento pendente/confirmado/recebido, segunda via/URL válida, histórico.
- **Meu consumo:** barra de franquia, quantidades, tendência, previsão de excedente demonstrativa, histórico por período.
- **Planos disponíveis:** comparação, solicitação de mudança e condições comerciais; contratação/alteração automática somente após política aprovada.
- **Avisos comerciais:** vencimento, carência, pendência e como regularizar, sem propaganda invasiva nem vazamento de dados.

Design responsivo, acessível com navegação por teclado, estados vazio/carregando/erro, máscaras BRL, data brasileira, contraste suficiente, feedback de confirmação para ações irreversíveis. Evitar UI enganosa: simulação não aparece como cobrança quitada ou emissão fiscal real.

---

## 7. Regras comerciais e jurídicas que exigem parametrização

- Unidades de assinatura: **um CNPJ/contrato de serviço**, com possibilidade futura de agrupamento mediante decisão.
- Ciclo inicial recomendado: mensal. Tornar duração e franquia configuráveis; nunca assumir dias fixos de 30 dias.
- Políticas de carência, descontos, suspensão, cancelamento, reembolso, tributação da mensalidade de software e retenção documental devem ser definidas em contrato ou por responsável autorizado. Não codificar automaticamente regra legal como se fosse universal.
- Suporte a clientes que recebem a ferramenta como cortesia ou inclusa no plano contábil, sem geração de cobrança, mas com rastreabilidade e validade.
- Documentos fiscais das mensalidades cobradas pelo Grupo IA Compliance são obrigação fiscal distinta das NFS-e de serviços emitidas pelos clientes. **Não misturar** faturamento do software com o emissor M3.
- Dados de cobrança e dados dos clientes sujeitos à LGPD: coletar o mínimo necessário, controlar acesso, registrar propósito, períodos de retenção e práticas de descarte conforme política aprovada.

---

## 8. Segurança, observabilidade e proteção contra falhas

Implementar no mínimo:

1. Matriz explícita de permissões por papel para `billing:read`, `billing:manage`, `plan:publish`, `billing:override`, `billing:webhook:retry` ou equivalente conforme RBAC M1.
2. Proteção contra IDOR e mass assignment, inclusive alteração de empresa, assinatura e link de cobrança de outro cliente.
3. Credenciais Asaas só no backend/cofre; endpoint seguro; host allowlist e validação de URL externa antes de redirecionar o cliente. Jamais exibir API Key ou dados de cartão.
4. Webhook com autenticação, fila durável, deduplicação e processamento assíncrono. Não confiar apenas no texto do evento para definir estado financeiro se houver inconsistência; conciliar.
5. Logs estruturados com correlation ID, sem dados pessoais sensíveis e segredos; métricas de webhooks, falhas de provider, assinaturas pendentes e conciliação.
6. Política de retries exponenciais e limite, dead-letter/reprocessamento; não duplicar criação de cliente, assinatura ou cobrança após timeout.
7. Flags de desenvolvimento explícitas; sem envio real de e-mail/SMS a terceiros no Sandbox.
8. Auditoria de alteração de plano, concessão de benefício, cancelamento, bloqueio, reativação, reprocessamento e mudança de status.
9. Não executar workers, Compose, serviços ou integrações e alegar sucesso sem confirmação do runtime; separar 'código implementado', 'teste automatizado', 'teste sandbox real' e 'pendente'.

---

## 9. Testes automáticos obrigatórios

Implementar novos testes de backend em PostgreSQL REAL com schemas/bases de teste isolados (padrão M1), testes unitários de domínio/contratos e jornadas Playwright operacionais. Manter todos os testes M1 e DEMO.

### Casos mínimos

**Plano e assinatura:** criação, publicação, versionamento, snapshot de preços, permissão indevida, contratação repetida/idempotência, cortesia administrada, mudança no próximo ciclo, cancelamento e migração.

**Multiempresa:** usuário da empresa A não lê B mesmo alterando IDs, URLs ou payload; gestor com acesso parcial não obtém relatórios globais; não inferir clientes por respostas.

**Pagamentos:** criar assinatura não equivale a pagamento; cobranças recorrentes só passam a pagas mediante prova; webhook com token errado falha; duplicação do mesmo `event.id` não duplica cobrança nem ativa mais de uma vez; eventos fora de ordem; `PAYMENT_OVERDUE` após `PAYMENT_RECEIVED` não regride indevidamente; estorno/chargeback exigem transição segura; falha de API após resposta ambígua não cria duplicata.

**Consumo:** rascunho, clique, NFS-e de demonstração e `SIMULATED` não são faturáveis; duas mensagens com mesmo `source_event_id` contam uma vez; cálculo de franquia/excedente exato com `Decimal`, mudanças de período e timezone; não gerar excedente cobrável no M2.

**Regras comerciais:** carência, status de restrição, acesso contínuo a histórico/documentos e capacidade de consultar/pagar mesmo suspenso; override auditado; não bloquear emissão fiscal real porque ela ainda não existe.

**Infraestrutura:** migração upgrade e downgrade seguros no ambiente teste, grants restritos no papel runtime, login/MFA e CSRF preservados, build operacional e DEMO, lint e responsividade. Testes de integração externa apenas com chave Sandbox própria e configuração explícita; caso contrário, marcar 'não executado'.

### Comandos de regressão baseados no M1

No Windows e conforme caminhos detectados do repositório, executar ou adaptar:

```
backend/.venv/Scripts/python.exe -m pytest backend/tests
backend/.venv/Scripts/python.exe -m ruff check backend
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:operational
npm.cmd run test:operational
```

Também executar testes de navegação (Playwright) e de compatibilidade do modo demonstração. Não alegar execução de Docker se não houver Docker instalado; distinguir inspeção estática do Compose de execução real. Se não for possível executar algum teste, registrar motivo e comandos reproduzíveis.

---

## 10. Critérios de aceite para declarar M2 implementado

**A. Dados e acesso**
- Planos, assinaturas, cobranças, eventos e consumo persistem no PostgreSQL.
- Admin pode gerir clientes autorizados; cliente vê apenas suas assinaturas/boletos/consumo.
- RBAC, MFA e rascunhos M1 continuam funcionando; DEMO continua isolada.

**B. Cobrança**
- Cadastro de cliente e assinatura Asaas Sandbox funciona com credenciais de teste quando configuradas.
- Criação de assinatura não ativa automaticamente o plano pago.
- Cobranças visíveis no portal têm IDs, status e referência externa rastreáveis.
- Webhooks validados, persistidos antes do ACK, idempotentes e reprocessáveis.
- Reconciliação verifica estados divergentes sem pagamento fictício.

**C. Consumo**
- Franquia e excedentes têm cálculo e UX completos.
- Sem integração fiscal M3, nenhum evento simulado gera cobrança real ou excedente pagável.
- M2 não permite transmissão fiscal nem upload de certificado A1.

**D. Qualidade**
- M1 e DEMO passam regressão; novas jornadas Playwright e tests de backend passam onde o ambiente permitir.
- `.env.example`, setup, documentação, riscos e evidências de testes atualizados.
- Não há secrets no git ou bundle, URL pública inesperada ou credenciais de produção.

**E. Aprovação**
- Uma revisão humana valida preços, condições, políticas, telas e relatório de homologação; nenhuma cobrança real é disparada pelo M2.

---

## 11. Entregáveis obrigatórios

Crie/atualize sem apagar a documentação do M1:

1. Código de domínio/serviço/repositório/provider financeiro na arquitetura do M1.
2. Migrations PostgreSQL e teste de migração com usuário de runtime restrito.
3. UI administrativa e portal cliente do M2, ligados à API real.
4. Integração com Asaas Sandbox segura, configuração explícita, webhooks e worker de reconciliação.
5. Testes automatizados e fixtures sanitizadas; scripts de instalação local.
6. `docs/FASE2_M2_DIAGNOSTICO.md`: auditoria inicial.
7. `docs/FASE2_M2_EXECUCAO.md`: instalação, variáveis, como obter/configurar credenciais Sandbox, execução em Windows nativo e Compose (se testado), configuração de webhook por túnel HTTPS seguro quando necessário, fluxo de teste.
8. `docs/FASE2_M2_VALIDACAO.md`: comandos executados, quantidade e resultados reais, casos cobertos, bugs, limitações e riscos.
9. `docs/FASE2_M2_REGRAS_COMERCIAIS.md`: catálogo, status, franquias, políticas e decisões que precisam de aprovação comercial.
10. Atualizar `CLAUDE.md`, `README.md` e `.env.example` de forma incremental, mantendo instruções M1.

### Relatório final obrigatório ao operador

Apresente:
- branch, commit gerado (se autorizado), arquivos/migrations alterados e diferenças relevantes;
- endereço efetivamente acessível do portal operacional e API local, se executados;
- contas de teste **sem imprimir segredos** (indique apenas onde estão armazenadas localmente);
- inventário de telas e o que foi validado via navegador;
- resultado dos testes (separar executados de não executados);
- status da integração Asaas (código pronto / teste local mockado / chamada remota Sandbox validada / não validada);
- pendências de homologação com chave de sandbox e webhook;
- riscos e blockers para M3;
- confirmação explícita: sem emissão NFS-e real, sem cobranças de produção e sem publicação pública.

---

## 12. Ordem de execução exigida

1. Auditar projeto e estado do Git, preservar alterações locais, mapear M1.
2. Documentar diagnóstico e desenhar dependências compatíveis.
3. Criar modelos, migrations, constraints, grants e testes de isolamento.
4. Implementar domínio, contratos, estados e regras comerciais.
5. Implementar provider Asaas Sandbox, webhook e conciliação com testes.
6. Implementar APIs autenticadas e validação de acesso.
7. Construir telas dos dois portais e jornadas demonstráveis sobre dados persistidos.
8. Validar migrações, regressões e navegação; corrigir falhas.
9. Documentar execução, validação, riscos e decisões pendentes.
10. Entregar relatório final completo. Se o operador tiver autorizado push, criar commit coeso sem segredos após testes; se não, preparar commit local e informar o estado.

**COMANDO FINAL:** Execute toda a implementação M2 no projeto existente, sem recomeçar do zero e sem confundir testes de sandbox com produção. Preserve integralmente a separação DEMO/OPERACIONAL e a segurança M1. Faça o melhor esforço para concluir todas as etapas no ambiente disponível; nunca invente testes, endpoints, dinheiro recebido ou integração bem-sucedida.

---

## Fontes de referência oficiais (consulte versões vigentes antes de implementar)

- Repositório do projeto: https://github.com/PIETRO67/Compliance-NFE
- M1 execução: https://github.com/PIETRO67/Compliance-NFE/blob/main/docs/FASE2_M1_EXECUCAO.md
- M1 validação: https://github.com/PIETRO67/Compliance-NFE/blob/main/docs/FASE2_M1_VALIDACAO.md
- Asaas Sandbox: https://docs.asaas.com/docs/sandbox
- Asaas autenticação: https://docs.asaas.com/docs/autentica%C3%A7%C3%A3o-1
- Criar cliente: https://docs.asaas.com/reference/criar-novo-cliente
- Criar assinatura: https://docs.asaas.com/reference/criar-nova-assinatura
- Assinaturas: https://docs.asaas.com/docs/assinaturas
- Eventos de cobrança: https://docs.asaas.com/docs/webhook-para-cobrancas
- Receber webhooks: https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
- Idempotência: https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks
- Pix Automático vs assinaturas: https://docs.asaas.com/docs/diferen%C3%A7a-entre-pix-autom%C3%A1tico-e-assinaturas-1
