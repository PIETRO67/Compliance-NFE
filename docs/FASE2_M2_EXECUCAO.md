# Executar M2 — Windows nativo e configuração Compose

Pré-requisito: fundação M1, PostgreSQL e credenciais locais já configurados. Não sobrescrever `.env` nem reinicializar banco existente. Node 24 e Python 3.12 usados nesta entrega. Confira também `FASE2_M1_EXECUCAO.md`.

## Retomar após desligar o computador

Na raiz do repositório, PowerShell:

```powershell
backend/.venv/Scripts/python.exe scripts/local_postgres.py
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
backend/.venv/Scripts/python.exe -m alembic -c backend/alembic.ini upgrade head
$env:PYTHONPATH='backend'
backend/.venv/Scripts/python.exe -m app.grants
backend/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --no-access-log
```

Em outro terminal:

```powershell
npm.cmd install
npm.cmd run dev:operational
```

Abra **http://localhost:3001**; API de desenvolvimento em **http://127.0.0.1:8000/api/docs**. O helper PostgreSQL usa o cluster existente em `.local/pgdata`, porta 55432; não apaga dados. Em instalação nova, obtenha os binários oficiais conforme M1. Se o ambiente virtual não existir, crie-o com `python -m venv backend/.venv` antes do pip.

As contas fictícias reservadas e senhas aleatórias estão somente em `.local/m1-access.json`; abra localmente e não publique. Gestores configuram MFA. Os testes Playwright resetam MFA/sessões das fixtures `@m1.example.com`; use contas próprias criadas por convite para trabalho que precise preservar o autenticador.

## Worker PostgreSQL

```powershell
$env:PYTHONPATH='backend'
backend/.venv/Scripts/python.exe -m app.billing_jobs --once
# Ou permanecer consumindo a fila a cada 15 segundos:
backend/.venv/Scripts/python.exe -m app.billing_jobs
```

A inbox e as solicitações são duráveis no PostgreSQL. Lock consultivo por conexão impede consumidores simultâneos, inclusive durante commits de intenção externa. Não depende de Redis no Windows. Webhooks e conciliações têm cinco tentativas com backoff e estado DEAD; reprocessamento exige gestor autorizado, motivo e auditoria. Provisionamentos inconclusivos só consultam referência; nunca repetem POST sem prova. Após cinco falhas de provisionamento, a conciliação administrativa pode revisar/retomar. Erro de configuração mantém fila pendente sem supor sucesso.

Não altere marcadores CREATING manualmente para forçar novo POST: confira referências no Sandbox, resolva a ambiguidade e documente a intervenção. Eventos não associados a contrato autorizado ficam em quarentena, sem exposição global pela API; a revisão de infraestrutura deve usar acesso controlado ao banco e nunca conceder elegibilidade com base só no payload.

## Configurar Asaas Sandbox — opcional e explicitamente habilitado

Crie conta separada em https://sandbox.asaas.com e gere uma chave exclusiva Sandbox conforme a [documentação oficial](https://docs.asaas.com/docs/sandbox). Configure **localmente no `.env`**, nunca em argumentos, logs, frontend ou Git:

```dotenv
PAYMENT_PROVIDER=asaas
ASAAS_MODE=sandbox
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY=<chave privada da conta Sandbox>
ASAAS_WEBHOOK_AUTH_TOKEN=<segredo aleatório próprio com pelo menos 32 caracteres>
ASAAS_HTTP_USER_AGENT=IAComplianceNFSe-M2/0.2
ENABLE_BILLING_SANDBOX=true
ENABLE_BILLING_PRODUCTION=false
```

Não use a API key como token de webhook. Reinicie API/worker após configurar. Qualquer base de produção, modo diferente de sandbox ou flag de produção é recusada. Sem configuração, não existe fallback fictício e a UI informa envio desativado. Não habilitar com dados de terceiros; notificações de novos clientes são desabilitadas pelo adaptador. Use exclusivamente pagadores/contatos de teste próprios autorizados. As fixtures M1 usam identificadores DEMO que **não são CNPJs aptos ao provider**; o worker recusa esses identificadores, sem trocar por números reais automaticamente.

Configure no painel Sandbox um webhook para `https://<seu-endpoint-HTTPS-controlado>/api/webhooks/asaas`, com token próprio e eventos de pagamento/assinatura documentados. Para uma homologação local futura, um túnel HTTPS temporário precisa ser configurado pelo operador, com exposição limitada, TLS, proxy confiável e restrições de rede. **Nenhum túnel foi aberto por esta entrega.** Não exponha `/api/docs`, banco ou portal de desenvolvimento inadvertidamente. Em ambiente homologation/production a API exige HTTPS; um proxy confiável precisa preservar o esquema sem aceitar cabeçalhos forjados de origens arbitrárias.

## Jornada local sem chave

1. Gestor do escritório: Financeiro/Planos → criar rascunho, revisar versão e publicar explicitamente.
2. Para CNPJ M1, Admin cliente → Minha assinatura → conceder gestão financeira ao escritório. Revogação fica no mesmo painel; delegação é de aplicação, não procuração fiscal.
3. Selecione CNPJ; Financeiro/Assinaturas → salvar titular; contratar plano pago (PENDING, sem chamada externa) ou conceder cortesia com revisão e motivo, quando autorizado.
4. Consumo → registrar evento sintético (somente desenvolvimento); verificar franquia, prévia e pagável zero; compensar e observar histórico preservado.
5. Editar plano cria nova versão em rascunho. Publicar e agendar mudança no próximo ciclo; sem reescrever snapshot existente.
6. Portal → assinatura, mensalidades, consumo e planos disponíveis. Solicitar mudança registra pedido, não cobrança automática.
7. Integrações → solicitar conciliação e executar worker. Sem configuração, observar erro seguro/pêndencia; não “recebido”.

## Homologação remota pendente

Após configurar chave e webhook próprios: contratar no Sandbox, confirmar IDs e cobrança pendente; simular pagamento **no próprio painel Sandbox**, observar evento autenticado persistido, processar worker e conferir consulta de prova; repetir evento e enviar ordem invertida; testar estorno, pausa/retomada, cancelamento e conciliação. Registrar evidências saneadas. Código e respostas sintéticas locais não comprovam essa jornada remota.

## Compose

```powershell
python scripts/configure_m1.py
docker compose up --build -d
```

Os seis serviços M1 foram preservados; o worker agora consome `app.billing_jobs`. Flags financeiras default desativadas; segredos só em API/worker. O migrador roda Alembic e grants com papel separado. Web local do Compose em http://localhost:3000; pare o DEMO nativo nessa porta antes. Não executar `down -v` para preservar dados.

Docker/Compose e Redis não estão instalados neste computador: o YAML foi inspecionado, mas containers não foram executados/validados. O funcionamento comprovável desta entrega é nativo com PostgreSQL real.

## Testes reproduzíveis

```powershell
backend/.venv/Scripts/python.exe -m pytest backend/tests -p no:cacheprovider
backend/.venv/Scripts/python.exe -m ruff check backend
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:operational
npm.cmd run test:operational
```

Regressão DEMO estática após build, em outro terminal `node scripts/serve-demo.mjs` (porta 3003), então `$env:DEMO_BASE_URL='http://127.0.0.1:3003'; npm.cmd run test:e2e`. Para disponibilizar DEMO em 3000: `$env:PORT='3000'; node scripts/serve-demo.mjs`. Evite builds e várias suítes de navegador simultaneamente em computadores com pouca memória.

## Referências oficiais consultadas

[Clientes](https://docs.asaas.com/reference/criar-novo-cliente), [consulta por referência](https://docs.asaas.com/reference/listar-clientes), [assinaturas](https://docs.asaas.com/reference/criar-nova-assinatura), [listar assinaturas](https://docs.asaas.com/reference/listar-assinaturas), [cobranças da assinatura](https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura), [consulta da cobrança](https://docs.asaas.com/reference/recuperar-uma-unica-cobranca), [atualização/inativação](https://docs.asaas.com/reference/atualizar-assinatura-existente), [efeitos de remoção](https://docs.asaas.com/reference/remover-assinatura), [eventos financeiros](https://docs.asaas.com/docs/webhook-para-cobrancas), [eventos de assinatura](https://docs.asaas.com/docs/eventos-para-assinaturas), [webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).
