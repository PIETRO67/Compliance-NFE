# Permissões futuras — planejamento, não segurança implementada

## Relações

Escritório → contas cliente → empresas/CNPJs → usuários vinculados e operações autorizadas. Uma conta pode ter vários CNPJs, mas autorização deve ser explícita por ação e empresa. Não inferir que pertencer à mesma conta autoriza acesso a todos os documentos.

| Persona | Comportamento visual na Fase 1 | Implementação segura futura |
|---|---|---|
| Administrador IA Compliance | Carteira e ajustes administrativos | Políticas por tenant, revisão de privilégios, MFA |
| Analista do Escritório | Acompanhamento; ajustes administrativos desabilitados | Escopo de carteira, segregação e aprovações |
| Gestor do Cliente | Empresa e troca explícita entre CNPJs da mesma conta fictícia; equipe visual | Vínculos por CNPJ e autorização de equipe |
| Emissor do Cliente | Emissão, cadastros e notas do CNPJ atual | Permissão para preparar/emitir e eventos separados |
| Consulta do Cliente | Consulta/exportação; emissão e edição indisponíveis na UI | Leitura limitada, exportações autorizadas e registradas |

## Requisitos da Fase 2

- Autenticação, sessões seguras, MFA, expiração e revogação.
- RBAC/ABAC e autorização obrigatória no backend em toda consulta/mutação/exportação.
- Isolamento multi-tenant testado, vínculos cliente/CNPJ versionados e política de menor privilégio.
- Separar emissão, aprovação, cancelamento, substituição, suporte, acesso a documentos e uso de A1.
- Representação/procuração e consentimento quando aplicável, sem inferir autorização por um seletor.
- Auditoria íntegra, proteção de dados, retenção, privacidade e tratamento de incidentes.
- Se existir visualização da experiência por operador, implementar consentimento/política, limites e trilha. O botão DEMO atual não é impersonação segura.

A Fase 1 não protege dados por URL ou localStorage. O filtro de contexto é testado somente como comportamento normal de interface. Todos os dados devem permanecer inventados.
