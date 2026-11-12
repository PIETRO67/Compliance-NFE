# Diagnóstico inicial M2 — 11/11/2026

HEAD confirmado: `19d6746`, branch `main`, árvore limpa antes da execução. Não havia AGENTS.md no repositório. Fontes lidas: CLAUDE, README, execução/validação/inventário M1 e plano operacional original.

M1: `Organization` possui escritório proprietário; `Company` vincula organização; `Membership` limita papel e opcionalmente CNPJ; `CompanyAuthorization` contém delegação explícita do cliente ao escritório. `InvoiceDraft`, `Customer`, `Service` possuem contexto de empresa e FKs compostas. `Invoice` permanece fiscal, nunca será reutilizada para cobrança comercial. `AuditLog` recebe metadados sem corpo sensível.

Autenticação em `security.py`: cookie opaco HttpOnly, sessões revogáveis, origem/CSRF, MFA obrigatório para gestores. `policy.py` intersecta papel com delegação. Cliente HTTP `src/operational/api.ts` usa proxy `/api`, cookie e CSRF em memória. `PaymentProvider` M1 é protocolo síncrono ainda não implementado; será preservado e ampliado com contrato assíncrono para I/O financeiro.

Backend único `backend/app`, SQLAlchemy/Alembic. Testes em PostgreSQL real `compliance_test`, schemas UUID isolados. Frontend operacional separado por flag de build; DEMO independente. Compose contém PostgreSQL, Redis, migração, API, worker RQ e web; worker M1 não possuía jobs de negócio. Docker/Redis não estão instalados nativamente. M2 usará fila durável PostgreSQL e consumidor independente, sem depender de Redis para ACK de webhook.

## Implementação prevista

| API/área | Tela |
|---|---|
| Catálogo e versões de planos, publicação | Admin Financeiro/Planos |
| Conta por CNPJ, contrato, cancelamento/mudança futura/concessão | Admin Assinaturas; Portal Minha assinatura |
| Cobranças e conciliação | Admin Cobranças; Portal Minhas mensalidades |
| Ledger compensável, períodos e prévias | Admin Consumo; Portal Meu consumo |
| Indicadores autorizados | Admin Financeiro/Visão geral |
| Inbox autenticada, retries e estado do adaptador | Admin Integrações |
| Carência e elegibilidade futura | Admin Políticas |
| Planos publicados e pedido de mudança | Portal Planos disponíveis |

## Decisões e riscos

- Preços de exemplo só entram como rascunhos por ação administrativa. Planos pertencem ao escritório; clientes só veem catálogo publicado do escritório vinculado, e contratos apenas de CNPJs autorizados.
- Operações financeiras exigem permissões específicas e MFA já verificado do M1. Delegações existentes não ganham poderes financeiros silenciosamente: o cliente deve concedê-los explicitamente.
- `Decimal`, BRL, HALF_UP, ciclos mensais por calendário em America/Sao_Paulo e persistência UTC. Sem pró-rata. Revisões futuras não alteram snapshots fechados.
- POST externo inconclusivo não é repetido cegamente: referência interna consultável e bloqueio para revisão se não houver evidência suficiente. PUT idempotente e consultas limitadas.
- Webhook guarda apenas identificadores/status mínimos, confirma commit antes do ACK e concilia no provedor antes de conceder acesso. Valores e identidade do pagador/contrato precisam corresponder.
- Nenhuma chave Sandbox foi solicitada/impressa. Ausência de configuração não interrompe a implementação; chamadas reais ficam desativadas e homologação remota é pendência explícita.
- Migração aditiva; downgrade remove apenas entidades M2 e deve ocorrer somente após exportação/preservação de seus registros. Dados M1 preservados.
- Infraestrutura Compose, HTTPS externo/webhook, aprovação comercial, observabilidade/backups e revisão independente ainda exigem validação; M3 segue bloqueado.
