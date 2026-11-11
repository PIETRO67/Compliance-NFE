# Roadmap Fase 2 — planejamento V2

Nenhum item abaixo está conectado ou implementado como infraestrutura nesta fase.

1. **Aprovar escopo:** revisar decisões exportadas dos dois portais, feedback de clientes, papéis, fluxos, municípios, regimes e critérios de aceite. Definir responsabilidade fiscal e de suporte.
2. **Modelo comercial e domínio:** distinguir escritório, conta cliente e CNPJs. Especificar documentos, rascunhos, catálogo, usuários, suporte e preferências sem copiar mocks como regras reais.
3. **Backend e dados:** banco transacional, repositories/adaptadores reais, migrações, backups, políticas de retenção, versionamento, concorrência e reconciliação. Não usar localStorage como fonte de verdade de produção.
4. **Identidade e acesso:** autenticação, MFA, sessões, RBAC/ABAC, vínculos por CNPJ e autorização em cada endpoint. Isolamento multi-tenant, segregação de funções e testes de acesso entre clientes.
5. **A1 e representação:** autorização legítima, procuração/representação quando aplicável, cofre/KMS/HSM, ingestão segura, criptografia, rotação, renovação, uso restrito e logs. Nunca armazenar segredo em navegador.
6. **Integrações oficiais:** avaliar disponibilidade, emissor municipal, credenciamento, documentação vigente e permissões por operação/município. SEFIN, parametrizações, ADN e DANFSe quando aplicáveis. Não afirmar cobertura universal de prefeituras ou serviços.
7. **Pipeline fiscal:** contratos, DPS/XML, XSD, XMLDSIG, mTLS quando exigido, idempotência, filas, retries, rejeições, emissão/consulta e download real. Cancelamento/substituição conforme regras oficiais e responsabilidades aprovadas.
8. **Tributação:** ISS, retenções, NBS, IBS/CBS, CST/cClassTrib e transições por regras versionadas, fontes rastreáveis e revisão profissional. Não converter placeholders ou matemática demo em cálculo normativo.
9. **Suporte e comunicação:** tickets persistentes, SLA, contexto seguro de documento, e-mails/notificações somente com autorização, privacidade e treinamento de clientes.
10. **Auditoria e LGPD:** trilha íntegra, acesso rastreado, minimização, retenção documental, termos de serviço, exportação segura e resposta a incidentes.
11. **Qualidade e implantação:** testes de domínio, contratos, autorização, integração, E2E, acessibilidade, falhas, carga, observabilidade e rollback. Ambientes segregados, CI/CD e revisão de dependências.
12. **Piloto:** poucos CNPJs legitimamente autorizados, homologação oficial na Fase 2 e liberação progressiva com suporte e critérios de interrupção.

## Decisões antes da implementação

Quais funcionalidades ficam em Manter/Melhorar/Adiar/Remover? Quais CNPJs, municípios e regimes entram primeiro? Quem pode emitir, aprovar e cancelar? Quem autoriza o uso do A1? Quais relatórios e SLAs são essenciais? Que revisão humana é obrigatória? Qual modelo de cobrança, onboarding e atendimento sustentará o produto?

A Fase 1 é validação de experiência e escopo. Não é homologação fiscal.
