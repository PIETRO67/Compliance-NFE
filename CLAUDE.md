# IA Compliance — Fase 1 V2 + Fase 2 M1

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
