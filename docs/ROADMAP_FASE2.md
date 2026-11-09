# Roadmap Fase 2 — somente planejamento

Nada desta lista está conectado no protótipo.

1. **Descoberta e escopo:** revisar exportação do painel de avaliação, aprovar jornadas, regimes e municípios prioritários, fontes oficiais, limites operacionais e critérios de aceite. Confirmar responsáveis pela revisão fiscal.
2. **Domínio e dados:** backend, banco transacional, modelo multi-tenant, isolamento por escritório/CNPJ, migrações, versionamento, reconciliação e política de retenção. Trocar o contrato DemoState por repositories reais sem misturar fixtures e produção.
3. **Identidade:** autenticação, sessões, MFA, RBAC/ABAC, vínculos por empresa, segregação de funções e testes de autorização em cada operação.
4. **Certificados A1:** consentimento e autorização, ingestão segura, validação, cofre com KMS/HSM, acesso mínimo, criptografia, rotação, renovação, segregação de chaves e logs. Nunca armazenar segredo em localStorage.
5. **Integrações oficiais:** SEFIN Nacional, ADN, parametrizações municipais, documentos e DANFSe. Definir contratos, credenciais, versões, limites, resiliência, idempotência, filas, retries e observabilidade. Validar fluxos em ambientes autorizados da Fase 2.
6. **Documentos:** DPS/XML conforme documentação vigente, validação XSD, assinatura XMLDSIG, mTLS quando requerido, revisão fiscal, protocolos e tratamento de rejeições. Não derivar regras da prévia demo.
7. **Tributação:** regras de ISS e retenções por regime/operação, municípios de incidência, classificações oficiais, NBS, CST, cClassTrib, IBS/CBS e transições. Conteúdo versionado, fontes rastreáveis e revisão profissional. Separar motor normativo de UI.
8. **Eventos:** cancelamento, substituição, manifestação e notas recebidas somente pelas fontes e permissões oficiais. Regras e permissões devem ser testadas e auditáveis.
9. **Auditoria e privacidade:** trilha imutável com integridade e retenção, minimização de dados, acesso rastreado, exportações seguras, revisão de LGPD e recuperação de desastres.
10. **Qualidade:** testes unitários de domínio, contratos, integração, autorização entre tenants, fluxos E2E, acessibilidade, carga, segurança e falhas. Reconciliar totais e documentos com fontes oficiais.
11. **Implantação:** ambientes segregados, gestão de segredos, CI/CD, análise de dependências, backups, observabilidade, rollback, suporte e capacitação. Executar homologação fiscal apenas nesta fase com autorização e critérios definidos.

## Decisões necessárias

- Quais módulos ficam em Manter/Melhorar/Adicionar/Remover/Postergar?
- Quais empresas, municípios e regimes entram primeiro?
- Quem autoriza emissão, eventos, acesso a A1 e integração de recebidas?
- Qual fonte oficial atende cada operação e qual o SLA esperado?
- Quais dados precisam de retenção e quais relatórios são essenciais?
- Quais classificações e parâmetros exigem revisão humana obrigatória?

As URLs oficiais fornecidas no briefing são referências para descoberta futura, não foram utilizadas como fontes de regras no protótipo.
