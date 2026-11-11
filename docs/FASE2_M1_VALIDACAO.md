# Entrega e validação do M1

Data da execução: 11/11/2026. Escopo: fundação operacional; não autoriza emissão fiscal nem cobrança.

## Código entregue

- `backend/app/`: API FastAPI, modelos SQLAlchemy, autenticação por sessão revogável, MFA TOTP, recuperação, convites, sete papéis, autorizações explícitas por empresa, cadastros e rascunhos persistentes, auditoria e contratos de provedores desabilitados.
- `backend/migrations/`: migração Alembic inicial; credenciais e privilégios separados para migrador e runtime.
- `src/operational/`: login e portal/escritório ligados à API própria, sem credenciais em localStorage; funcionalidades de marcos posteriores identificadas na interface.
- `src/demo/`, `src/domain/`, `src/components/`: modo demonstrativo V2 preservado e separado da operação.
- `compose.yaml`, Dockerfiles e `scripts/`: configuração local, PostgreSQL/Redis, migração, API, worker e frontend; segredos gerados fora do versionamento.
- `backend/tests/`, `tests/operational/`, `tests/browser/`: isolamento, autorização, fluxos reais e regressão visual/funcional.

## Verificações executadas

- 26 testes de backend aprovados usando PostgreSQL real e schemas isolados: autenticação, cookies, CSRF, expiração/revogação, MFA/replay/recuperação, convites, escopos de organização/empresa, escalada de privilégios, relacionamentos entre empresas, métricas filtradas, migração/reversão, privilégios do runtime e bootstrap.
- 2 testes Playwright operacionais aprovados: login, cadastro, persistência/retomada de rascunho, IDOR, logout, MFA, convite/aceite e perfil de consulta.
- 10 testes de domínio do modo demonstrativo aprovados.
- 8 testes Playwright demonstrativos aprovados contra o build estático: dois portais, cadastros, emissão rápida/completa, rascunhos, eventos, feedback/exportação, reset, rotas/404, teclado e responsividade em 1440, 768 e 390 pixels. A rodada anterior contra o servidor de desenvolvimento teve dois timeouts durante builds concorrentes; não foi contabilizada como aprovação.
- TypeScript, ESLint e Ruff aprovados.
- Builds de produção dos dois modos aprovados; resultados da rodada final registrados na entrega.
- Configuração Compose inspecionada estruturalmente; bundles públicos verificados contra os valores secretos locais, sem ocorrência.
- API, frontend demonstrativo e frontend operacional responderam HTTP 200 nos endereços locais.

## Ambiente efetivamente executado

PostgreSQL 17.11 local, API em `127.0.0.1:8000`, frontend operacional em `localhost:3001` e demonstrativo em `localhost:3000`. Credenciais aleatórias das contas fictícias de desenvolvimento estão exclusivamente em `.local/m1-access.json`, ignorado pelo Git. Não publicar esse arquivo ou `.env`.

Docker/Compose não estão instalados neste computador: imagens, rede, volumes e worker Redis não foram executados. O YAML estruturalmente válido não equivale a uma execução validada do Compose. As instruções reproduzíveis estão em `FASE2_M1_EXECUCAO.md`.

## Limites e riscos pendentes

- Nenhuma integração fiscal, assinatura, certificado real, transmissão, cobrança, e-mail ou webhook externo foi habilitado. As rotas de emissão recusam a operação.
- O ambiente é de desenvolvimento local. HTTPS, gestão de segredos, monitoramento, backups com restauração, validação em infraestrutura de destino, revisão independente de segurança e aprovação de piloto continuam pendentes.
- A auditoria tem restrição de alteração para o papel de runtime, mas não é um repositório imutável contra administradores do banco.
- TestClient/Starlette emite aviso de depreciação relativo ao transporte HTTP de testes; não houve falha decorrente dele.
- As fixtures operacionais usam organizações, pessoas e identificadores demonstrativos. Não importar dados reais nesta instalação de desenvolvimento.

## Próximos marcos

M2: gateway sandbox, assinatura, consumo, idempotência e conciliação. M3: credenciamento, representação, cofre A1, schemas e integração fiscal em ambiente autorizado. M4: documentos, eventos, suporte, alertas, observabilidade, retenção e backups. M5: piloto restrito com autorização expressa e aprovação formal antes de produção.
