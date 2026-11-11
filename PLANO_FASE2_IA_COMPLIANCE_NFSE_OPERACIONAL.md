# IA COMPLIANCE NFS-e — Plano técnico de implantação operacional (Fase 2)

**Versão de planejamento:** 11/11/2026  
**Finalidade:** transformar o protótipo demonstrativo da Fase 1 em plataforma privada, multiempresa, comercial e fiscalmente operacional, destinada aos clientes do Grupo IA Compliance.  
**Limite:** este documento é especificação de engenharia; não é software implementado nem comprova credenciamento em órgãos fiscais.

## 1. Objetivo do produto

Construir dois portais com identidades e permissões separadas: `/admin` para o escritório e `/portal` para seus clientes. O usuário-cliente poderá operar apenas em CNPJs aos quais foi expressamente vinculado. O escritório terá visão consolidada, suporte, autorização comercial, gestão de contratos e relatórios, dentro das permissões estabelecidas pelos clientes.

O sistema deverá permitir cadastro e convite de clientes, autenticação segura, configuração fiscal por CNPJ, contratação de planos, pagamento recorrente, emissão de NFS-e real pelas integrações autorizadas, consulta, download, cancelamento/substituição quando permitido, relatórios e registros de auditoria.

## 2. Decisões arquiteturais

- Reaproveitar o frontend Next.js/React + TypeScript da Fase 1. Não substituir o layout aprovado sem necessidade.
- Backend: reutilizar o FastAPI/Python existente se o protótipo backend estiver disponível e a qualidade for suficiente; caso contrário, criar backend FastAPI com contratos OpenAPI bem definidos. Não criar dois backends redundantes.
- PostgreSQL com migrações Alembic, índices por tenant e unicidade de CNPJ/contexto.
- Redis e worker de filas para emissão, sincronizações, notificações e conciliação.
- Storage privado compatível com S3 para documentos fiscais, com criptografia, controle de acesso, versionamento e backups.
- Cofre de segredos/certificados com KMS; PFX nunca disponível para o frontend. Não persistir senha de A1 em logs, código ou variáveis públicas.
- Separar adaptadores de provedores: `FiscalProvider`, `PaymentProvider`, `CertificateProvider` e `NotificationProvider`.
- Infraestrutura segregada em desenvolvimento, homologação e produção. TLS, WAF/rate limiting, gestão de segredos e monitoramento.

## 3. Organizações, CNPJs e acessos

Entidades essenciais:

`organizations`, `companies`, `users`, `memberships`, `roles`, `permissions`, `client_contacts`, `customers`, `service_catalog`, `municipal_parameters`, `tax_profiles`, `fiscal_rules`, `invoice_drafts`, `invoice_requests`, `invoices`, `invoice_events`, `fiscal_files`, `certificate_references`, `legal_authorizations`, `payment_customers`, `plans`, `subscriptions`, `billing_invoices`, `payments`, `usage_ledger`, `support_tickets`, `notifications`, `webhook_events`, `audit_logs`.

Perfis: `SUPERADMIN_ESCRITORIO`, `GESTOR_ESCRITORIO`, `ANALISTA_FISCAL`, `SUPORTE`, `ADMIN_CLIENTE`, `EMISSOR_CLIENTE`, `CONSULTA_CLIENTE`.

Regras mínimas: todas as queries e APIs precisam verificar vínculos por organização/empresa; qualquer recurso deve validar servidor-side autorização por CNPJ; o cliente não pode descobrir dados de outro tenant alterando IDs ou parâmetros. MFA para gestores; sessões e convites com validade; trilha de alterações.

## 4. Gestão de assinaturas e cobrança

Provedor inicial recomendado: Asaas em sandbox; manter abstração que permita substituir por outro gateway. Registros de identificação do cliente no gateway precisam ser armazenados localmente. Usar API oficial para assinaturas de valor fixo e cobranças avulsas para excedentes.

Planos comercialmente configuráveis: Essencial (exemplo R$79/mês, 50 notas autorizadas), Profissional (R$149/mês, 200 notas), Empresarial (R$299/mês, 600 notas). **Valores apenas indicativos para validação interna**, sem tarifas adicionais incluídas. Cobrança por CNPJ e planos personalizados/bundles com serviços contábeis; permitir isenção, período de teste e cupom mediante aprovação administrativa.

Fluxo:
1. Escritório cria contrato/assinatura para empresa ou grupo econômico conforme política.
2. Backend cria/atualiza cliente no gateway, cria assinatura/cobrança e grava IDs externos.
3. A cobrança fica `PENDING`; não significa recebimento.
4. Gateway envia webhook; validar token/origem conforme documentação, armazenar evento com unicidade, confirmar processamento de forma idempotente, atualizar estado de cobrança e direito de uso.
5. Prever conciliação diária com reprocessamento de eventos perdidos.
6. Registro `usage_ledger` contabiliza **nota autorizada** uma vez, associada ao CNPJ, período de competência de cobrança e requisição fiscal. Erros/rejeições não devem consumir franquia.
7. Excedentes: emitir cobrança avulsa no fechamento mensal mediante política contratual; não presumir que a API de assinatura calcule metered billing nativamente.
8. Inadimplência: estados `TRIAL`, `ACTIVE`, `GRACE_PERIOD`, `PAST_DUE`, `SUSPENDED`, `CANCELED`. Definir carência. Mesmo suspenso, permitir acesso aos documentos e dados já emitidos, exportação e regularização financeira.
9. Para a própria mensalidade cobrada pelo Grupo IA Compliance, prever emissão da NFS-e da prestação do serviço de software pela empresa contratante responsável, após parametrização fiscal e definição do fato gerador.

Testes necessários: criação, pagamento, webhook duplicado, pagamento estornado, chargeback, cobrança vencida, troca de plano, consumo excedente, conciliação e suspensão controlada.

## 5. Motor fiscal e escolha da integração

Implementar `FiscalProvider` com operações abstratas: `get_capabilities(issuer, municipality, tax_profile, competence_date)`, `validate_draft`, `issue`, `get_status`, `download_xml`, `download_danfse`, `cancel`, `replace` (se suportado). Não inventar endpoints externos.

Provedores:
- `SefinNacionalProvider`: comunicação com SEFIN Nacional por APIs oficiais, parametrização e DANFSe, assinatura XMLDSIG e mTLS, conforme documentação/credenciamento vigente.
- `PrivateFiscalProvider`: conector opcional a provedor habilitado (ex.: Nuvem Fiscal ou Focus NFe) quando a cobertura municipal, a complexidade ou o suporte justificarem.
- `MockFiscalProvider`: somente testes e demonstração, nunca liberar como emissão real.

As regras para ME/EPP do Simples Nacional a partir de 01/11/2026 e mudanças de IBS/CBS precisam obedecer às orientações oficiais atualizadas; conferir comportamento por competência e regime. Não inferir que todos os contribuintes não optantes usem automaticamente o emissor nacional: verificar capacidade por município e operação.

Credenciamento: antes de habilitar um CNPJ, verificar emissão via API no Painel do Contribuinte, procuração eletrônica ou certificado autorizado, enquadramento e suporte à operação. A possibilidade de representação por terceiros nas APIs desde 01/11/2026 deve ser validada com testes de homologação de mTLS, identidade e assinatura; não presumir que o mesmo certificado sirva para qualquer empresa sem autorização.

Caminho de emissão:
1. Checar empresa ativa, vínculo do usuário, assinatura e cotas.
2. Validar competência, município, tomador, serviço e campos obrigatórios.
3. Montar DPS e validar XSD conforme versão ativa na data de competência.
4. Assinar o XML e transmitir pelo provedor autorizado de forma segura.
5. Persistir `invoice_request_id`, idempotency key e identificadores fiscais.
6. Confirmar autorização da nota; se houver timeout, consultar status antes de reenviar.
7. Armazenar XML retornado, chave, DANFSe, protocolo, eventos e trilha de auditoria.
8. Apenas após autorização, marcar como emitida e registrar consumo de franquia.
9. Em caso de rejeição, expor erro inteligível e permitir correção sem consumo.

Versionar schemas XSD, regras fiscais, tabelas e releases. Não calcular IBS/CBS com valores fixos/hardcoded; distinguir visualização e apuração exigível.

## 6. Portal cliente

Funcionalidades mínimas: dashboard individual, Nova NFS-e completa/simplificada, notas emitidas/recebidas quando autorizadas, rascunhos, tomadores, serviços favoritos, certificados/procurações (status), documentos, faturas e assinatura, plano/consumo, relatórios, suporte, preferências e usuários da empresa. Acesso do cliente limitado à sua empresa.

Durante emissão, exibir progresso, sinal claro de `Simulação`, `Em processamento`, `Autorizada`, `Rejeitada`, `Cancelada` e `Pendente de confirmação`; nunca mostrar número ou autorização fictícia em produção.

## 7. Painel do escritório

Dashboard consolidado e por cliente, gestão de CNPJs, aprovação de onboarding, permissões, situação das procurações/certificados, saúde das integrações, rejeições fiscais, notas por empresa, planos, assinaturas, cobrança, consumo, inadimplência, relatórios, suporte, auditoria, configurações e troca supervisionada de empresa. Atos em nome do cliente devem ficar registrados e depender de permissão.

## 8. Segurança, conformidade e continuidade

LGPD: documentação das finalidades, bases legais e papéis de controlador/operador, políticas de acesso, gestão de incidentes e cláusulas contratuais com fornecedores. Segregação lógica por tenant, armazenamento criptografado, backups testados e política de retenção fiscal. Guardar documentos para os prazos exigidos e permitir extração de dados após encerramento do contrato.

Certificados A1: upload somente por canal seguro autenticado, senha tratada em memória e nunca exposta em logs, criptografia por empresa, rotação/renovação, notificações de vencimento, trilha de utilização, revogação de poderes e bloqueio de assinatura sem autorização.

Gateways: segredo apenas no backend, validação de webhooks, idempotência, reconciliação financeira e proteção contra criação duplicada de cobranças.

Fiscal: rastrear status antes de reenviar emissão, filas com backoff, circuit breaker e alerta de indisponibilidade. Não executar emissão automática de rascunhos sem autorização explícita do usuário.

## 9. API interna (rotas ilustrativas)

Exemplos de rotas próprias, não endpoints da SEFIN:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`.
- `GET/POST /api/admin/companies`, `GET/POST /api/admin/users`.
- `GET/POST /api/client/companies/{companyId}/customers`.
- `GET/POST /api/client/companies/{companyId}/invoices/drafts`.
- `POST /api/client/companies/{companyId}/invoices/{draftId}/issue`.
- `GET /api/client/companies/{companyId}/invoices`, `GET /.../{invoiceId}/xml`.
- `GET /api/client/companies/{companyId}/billing`, `POST /.../checkout`.
- `POST /api/webhooks/asaas`.
- `GET /api/admin/metrics`, `GET /api/admin/health/providers`.

Retornar validações e status claros; aplicar autorização e limites em todas as rotas.

## 10. Implantação por marcos verificáveis

**M1 — Fundação:** integrar frontend existente com backend, autenticação, RBAC, banco, migrações, isolamento por tenant, testes de autorização.

**M2 — Cobrança:** Asaas sandbox, assinaturas, faturas, webhooks, créditos por plano, medição de consumo, testes de inadimplência e conciliação.

**M3 — Fiscal nacional:** credenciamento de emitentes, certificado/procuração, parâmetros, DPS, XMLDSIG, XSD, transmissão e consultas SEFIN em homologação; testes negativos e de duplicidade.

**M4 — Operação:** armazenamento de XML/DANFSe, eventos fiscais, relatórios, alertas, suporte, backups, observabilidade e controles LGPD.

**M5 — Piloto:** validação com poucos CNPJs reais expressamente autorizados, conferência contábil-fiscal, testes de indisponibilidade, cobrança real em sandbox anterior e aprovação formal de produção.

## 11. Critérios de aceite

- Usuário de empresa A não acessa B mesmo alterando IDs, URLs ou requisições.
- Webhook duplicado não libera créditos nem liquida a mesma fatura duas vezes.
- Nota rejeitada não consome franquia.
- Emissão com timeout não gera duplicidade por retransmissão cega.
- Nenhum XML é declarado válido sem validação de schema e resposta da autoridade/fornecedor.
- Arquivos XML/DANFSe ficam disponíveis ao cliente após autorização e conforme regras de retenção, mesmo após suspensão comercial.
- Falha em provedor fiscal ou gateway não compromete outros tenants.
- Metadados fiscais guardam versão de XSD, regras de cálculo e autoridade/provedor utilizados.
- Logs nunca contêm senhas, PFX, tokens ou dados pessoais completos desnecessários.
- O protótipo Fase 1 continua visualmente reconhecível; rotas passam a carregar dados reais progressivamente.
- Piloto só segue a produção com checklist assinado e credenciamento válido.

## 12. PROMPT DE EXECUÇÃO PARA CLAUDE CODE

> Leia este arquivo integralmente e inspecione o repositório atual do IA Compliance NFS-e. Preserve o front-end Fase 1 aprovado, suas rotas, componentes e identidade visual. Execute a migração incremental para a Fase 2 por marcos M1 a M5, sem reescrever todo o projeto. Comece auditando a estrutura existente, dependências, tipos e lacunas. Entregue um inventário curto e implemente o M1 completamente com código executável, migrações, autenticação real, usuários, organizações, empresas, RBAC, testes automatizados de isolamento multi-tenant e instruções de execução local com Docker. Use provedores mock somente em desenvolvimento/testes; toda tela deve indicar claramente quando simula. Prepare os contratos `FiscalProvider` e `PaymentProvider` para os marcos seguintes, mas não efetue cobranças ou emissões fiscais em produção sem credenciamento, segredos seguros e autorização expressa. Após concluir e testar o M1, apresente um relatório objetivo de arquivos alterados, testes executados, riscos pendentes e próximos marcos. Consulte exclusivamente documentação oficial atual para endpoints externos; nunca os invente. Não crie dados fiscais reais nem simule sucesso de integração como se fosse autenticação comprovada.

## 13. Referências para implementação

- NFS-e — documentação em produção: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- NFS-e — endpoints de produção restrita e produção: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- NFS-e — representação por terceiros (31/10/2026): https://www.gov.br/nfse/pt-br/noticias/nova-funcionalidade-possibilita-representacao-e-alternancia-de-perfis-na-nfs-e
- NFS-e — Simples Nacional a partir de 01/11/2026: https://www.gov.br/nfse/pt-br/noticias/nfs-e-informa-diretrizes-sobre-a-obrigatoriedade-da-emissao-da-nfs-e-nacional-para-optantes-do-simples-nacional
- Asaas — documentação: https://docs.asaas.com/docs/visao-geral
- Asaas — assinaturas: https://docs.asaas.com/docs/assinaturas
- Asaas — webhooks: https://docs.asaas.com/docs/webhooks-e-eventos
- Nuvem Fiscal — NFS-e: https://dev.nuvemfiscal.com.br/docs/nfse/
