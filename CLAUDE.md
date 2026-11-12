# IA Compliance — Fase 1 V2 + Fase 2 M1/M2

- Preservar dois portais `/admin` e `/portal`, identidade visual e componentes compartilhados. O plano operacional do usuário autoriza backend **apenas no modo operacional**; não remover a demonstração V2.
- `npm run dev`: demonstração frontend com chave `ia-nfse-demo:v2`, sem API de produto. `npm run dev:operational`: frontend ligado exclusivamente ao FastAPI, sem seed/localStorage de dados e sem troca fictícia de papel.
- Backend único em `backend/app`: FastAPI, SQLAlchemy, PostgreSQL, Alembic. Não criar API Routes de negócio/Server Actions ou segundo backend no Next; usar proxy `/api`.
- Autenticação: Argon2, cookie HttpOnly/SameSite, CSRF + origem, sessões revogáveis, MFA de gestores, convites expirantes/uso único. Nunca armazenar tokens, senha, segredo MFA ou PFX no browser storage, logs ou código.
- Revalidar `organization_id`, `company_id`, permissões e delegações no servidor para toda ação. Administração parcial de CNPJ não pode criar escopo de organização ou ler usuários de outras empresas.
- Autorizações do escritório são de aplicação, não comprovam procuração fiscal. Acesso de cliente deve continuar restrito mesmo com IDs/URLs/payloads alterados.
- Segredos somente em `.env`/cofre. Apenas `NEXT_PUBLIC_APP_MODE` é público. Não publicar `.local`, `.env`, acessos locais ou artefatos com segredos. Bootstrap pede senha interativamente; fixtures com senhas aleatórias somente em desenvolvimento explícito.
- Migrador e runtime usam papéis separados; runtime não possui UPDATE/DELETE em auditoria. Validar migrações em PostgreSQL real; testes usam `compliance_test` e schemas temporários, nunca banco de produção.
- M1 não efetua emissão fiscal, cobrança, upload A1, XMLDSIG, mTLS ou chamadas externas de produto. `FiscalProvider`, `PaymentProvider`, `CertificateProvider`, `NotificationProvider` são contratos; mocks proibidos em produção. M2/M3 exigem implementação, segredos seguros e autorização futura.
- Demonstração continua marcada como DEMO. Operacional mostra “M1 — emissão e cobrança indisponíveis”. Nunca converter sucesso demonstrativo em autorização fiscal real.
- Validar Ruff/Pytest, lint/TypeScript, builds de ambos os modos e Playwright operacional. Documentar checks realmente executados e o que não foi possível executar (por exemplo Docker ausente).
- Implantação pública/produção, emissão ou cobrança real dependem dos marcos e aprovações expressas. Não declarar conformidade fiscal, isolamento auditado externamente ou produção pronta apenas com testes locais.

## Evolução autorizada M2

- O prompt M2 autoriza gestão comercial persistida e adaptador **Asaas Sandbox**, exclusivamente `https://api-sandbox.asaas.com/v3`. As restrições M1 acima permanecem históricas para a entrega M1 e válidas para emissão fiscal/produção. Não introduzir chamadas de produção ou fallback financeiro fictício.
- Flags e segredos backend separados; envio externo desativado por padrão. Sem chave, executar testes sintéticos e documentar homologação remota pendente. Nunca declarar pagamento a partir da criação de assinatura.
- Valores em Decimal/NUMERIC(18,2), BRL/HALF_UP; ciclos mensais de calendário em America/Sao_Paulo, instantes UTC. Preços de exemplo só em rascunhos criados explicitamente; aprovação humana antes da publicação.
- Versões/snapshots preservados. Mudança de plano no próximo ciclo, sem pró-rata automático. Cortesia/teste/desconto/override exigem permissão, motivo e auditoria; não são pagamento.
- Webhook autentica token próprio, valida e redige payload, persiste inbox antes de ACK e é deduplicado por ambiente/evento. Worker PostgreSQL verifica estado do provedor, identidade/valor e registra conciliação; bloqueia criação repetida inconclusiva.
- Runtime sem UPDATE/DELETE em ledger, versões, decisões e ajustes. Eventos M2 são SIMULATED/REVERSAL, sempre não faturáveis; classe fiscal autorizada e emissão permanecem bloqueadas até M3.
- Delegações M1 existentes não ganham poderes financeiros silenciosamente. Cliente gestor concede/revoga autorização financeira explicitamente. Login/histórico/faturas continuam acessíveis mesmo com restrição comercial.
- `sessionStorage` só guarda preferência de empresa por usuário, revalidada contra empresas devolvidas pela API. Nunca guarda senha, sessão, CSRF, MFA ou dados comerciais.
- Testes de navegador usam apenas fixtures reservadas de desenvolvimento e resetam MFA/sessões dessas fixtures, nunca usuários reais. Não imprimir acessos locais ou tokens.
