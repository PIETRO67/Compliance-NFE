# Fase 2 — inventário e decisão do M1

O plano operacional fornecido em 11/11/2026 substitui as restrições de somente frontend **apenas no modo operacional**. A demonstração V2 permanece independente, com fixtures e localStorage.

## Situação encontrada

- Next.js 15, React 19, TypeScript, dois portais, componentes compartilhados, catálogo e wizard demonstrativos, testes de domínio/Playwright.
- Ausência de FastAPI, banco, migrações, autenticação, controle de acesso no servidor ou contratos de integração.
- Layout e navegação foram preservados. Nenhum backend anterior foi encontrado; foi criado um único FastAPI.
- Python 3.12 disponível. Docker/Compose, Redis e PostgreSQL não estavam instalados. PostgreSQL 17 portátil oficial foi preparado somente em `.local`, sem instalação global.

## Implementação incremental

| Área | M1 |
|---|---|
| Demonstração | `npm run dev`, dados V2 locais, sem chamadas de produto |
| Operacional | `npm run dev:operational`, porta 3001, backend obrigatório e sem fallback para fixtures |
| Backend | FastAPI e contratos OpenAPI; único responsável por persistência e autorização |
| Banco | PostgreSQL, Alembic, índices e FKs compostas de contexto |
| Usuários | Senhas Argon2, sessões opacas revogáveis, MFA TOTP e recuperação de uso único |
| Vínculos | Organizações, empresas, memberships e autorizações explícitas ao escritório |
| RBAC | Sete papéis; política no servidor em cada recurso/ação, sem confiar no seletor UI |
| Convites | Validade de 24h, hash no banco, uso único, proteção contra redefinição de conta existente |
| Cadastros | Tomadores, serviços e rascunhos persistidos por empresa |
| Auditoria | Alterações transacionais, sem corpos sensíveis; runtime sem UPDATE/DELETE na tabela |
| Infraestrutura | Compose com PostgreSQL, Redis, migração, API, worker e frontend |
| Próximos provedores | Protocolos Fiscal/Payment/Certificate/Notification, sem conexões ou sucesso fiscal simulado |

## Limites explícitos

M1 é fundação operacional local, não liberação de produção. M2 (Asaas), M3 (fiscal/certificados) e M4 (documentos, suporte completo, observabilidade/retencão) não foram implementados como serviços reais. O worker está preparado na configuração Docker, sem agendar emissão automática. O frontend operacional mantém ações fiscais desabilitadas e informa o marco necessário.

O cadastro de CNPJ não comprova validade, credenciamento ou procuração. A autorização ao escritório é de **aplicação**, não representação fiscal. Fixtures de desenvolvimento usam nomes e identificadores DEMO, senhas aleatórias e são proibidas em produção.

## Referências de implementação

- [FastAPI: segurança e Argon2](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).
- [OWASP: sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) e [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- [SQLAlchemy: consultas ORM](https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html), [Alembic: migrações](https://alembic.sqlalchemy.org/en/latest/tutorial.html).
- [Docker Compose: dependências e healthchecks](https://docs.docker.com/compose/how-tos/startup-order/).
- [PostgreSQL Windows](https://www.postgresql.org/download/windows/) e [binários EDB](https://www.enterprisedb.com/download-postgresql-binaries).

Os links fiscais e de pagamento do plano permanecem referências para M2/M3. Nenhum endpoint externo foi inventado ou chamado pelo produto.
