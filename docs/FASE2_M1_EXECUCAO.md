# Executar a fundação operacional M1

## Docker Compose — caminho recomendado para outro ambiente

Requisitos: Docker Engine/Desktop com Compose, Python para gerar configuração, Node/npm se executar o frontend fora dos containers.

```sh
python scripts/configure_m1.py
docker compose up --build -d
docker compose exec api python -m app.cli bootstrap --email seu-email@seu-dominio.com --name "Administrador"
```

O bootstrap solicita a senha no terminal, sem exibi-la. Só funciona quando não há usuários; em seguida o cadastro é por convite autenticado. O primeiro acesso de gestor exige configurar MFA e guardar códigos de recuperação. Abra **http://localhost:3000** no Compose.

Para um banco **vazio de desenvolvimento**, em lugar do bootstrap real:

```sh
docker compose exec api python -m app.cli development-fixtures
```

As fixtures exigem `APP_ENV=development` e `ENABLE_DEV_TOOLS=true`, nunca sobrescrevem um banco com usuários e geram senhas aleatórias. No container, o arquivo é `/app/.local/m1-access.json`; ele pode ser copiado localmente com `docker compose cp api:/app/.local/m1-access.json .local/m1-access.json`, sem imprimir segredos. Prefira o bootstrap interativo para um administrador próprio. Não há senha padrão publicada no código.

Serviços: `db` PostgreSQL 17; `redis`; `migrate` one-shot; `api`; `worker` RQ, sem emissão automática; `web` Next.js. A API usa um papel de banco restrito. O migrador tem credenciais separadas e configura os privilégios; o runtime não pode alterar/excluir auditoria. Portas ficam presas ao loopback. API: http://localhost:8000/api/docs em desenvolvimento; readiness: `/api/health`.

Volumes persistem os dados. Não execute `docker compose down -v` se precisar preservá-los. A imagem/configuração é de desenvolvimento local; produção exige TLS, origens HTTPS, segredos gerenciados e validação da infraestrutura. O código rejeita mocks/ferramentas de desenvolvimento em produção e o início da API com papel administrativo/proprietário do banco.

## Ambiente Windows desta entrega — execução nativa comprovável

Docker não está instalado. Para validar sem fingir execução de containers, foram usados os binários oficiais do PostgreSQL em `.local/postgres` e um cluster em `.local/pgdata`, porta **55432**, autenticação SCRAM.

```powershell
python scripts/configure_m1.py
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
# Requer o ZIP oficial salvo em .local/postgresql.zip:
backend/.venv/Scripts/python.exe scripts/local_postgres.py
backend/.venv/Scripts/python.exe scripts/prepare_dev_runtime.py
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
$env:PYTHONPATH = 'backend'
backend/.venv/Scripts/python.exe -m app.grants
backend/.venv/Scripts/python.exe -m app.cli development-fixtures
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --no-access-log
```

Em outro terminal:

```powershell
npm.cmd install
npm.cmd run dev:operational
```

Abra **http://localhost:3001**. As credenciais aleatórias locais ficam em `.local/m1-access.json`, ignorado pelo Git. Abra o arquivo localmente; não publique seu conteúdo. O administrador local exige MFA; os emissores de teste permitem validar o portal. Não há dados fiscais reais nem operações externas.

A demonstração V2 continua com `npm.cmd run dev` em http://localhost:3000. Os modos usam diretórios de build diferentes. Dados da demonstração não são importados para o banco nem utilizados em caso de falha da API.

## Testes

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests
backend/.venv/Scripts/python.exe -m ruff check backend
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:operational
npm.cmd run test:operational
```

Os testes Python usam **PostgreSQL real** no banco `compliance_test`, schemas UUID temporários e limpeza restrita a esses schemas. Não usam SQLite como prova de isolamento. Os testes operacionais de navegador requerem API em 8000, UI em 3001 e fixtures locais. Eles usam exclusivamente contas `@m1.example.com` e ressetam a autenticação dessas fixtures antes/depois; nunca use essas contas para produção.

## Convites e acesso

No escritório, crie organização e empresa, então convide um usuário. A política valida papel, organização e CNPJ no servidor. O link confidencial é exibido uma vez, usa fragmento `#token=...`, expira em 24h e não dispara e-mail. Para conta existente, entre e reabra o link para aceitar o vínculo autenticado; ele nunca redefine a senha da conta existente.

Ao revogar um vínculo, as sessões do usuário são invalidadas. Não é permitido revogar o último administrador do escopo. Gestores usam MFA; dez códigos de recuperação são mostrados uma vez e consumidos individualmente. Suspensão comercial, cobrança e regras fiscais só serão introduzidas nos marcos seguintes.
