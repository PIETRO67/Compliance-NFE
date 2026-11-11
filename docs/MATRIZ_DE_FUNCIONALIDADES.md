# Matriz de funcionalidades — V2

Todo recurso abaixo é UI com dados fictícios. Nenhum estado “implementado” representa operação fiscal, autenticação ou integração real.

| Portal / módulo | Situação da UI | Fase 2 | Prioridade |
|---|---|---|---|
| Entrada / personas | Dois cartões, cinco papéis, três empresas iniciais | Identidade e onboarding real | Essencial |
| Admin / carteira | Oito KPIs derivados, período, CNPJ, situação e gráfico | Agregações conciliadas e multi-tenancy | Essencial |
| Admin / contas cliente | Cadastro, edição, inativação e vínculos de empresas | Modelo comercial e contratos | Alta |
| Admin / CNPJs | Cadastro, abas, arquivo e ver portal | Validação e autorização por CNPJ | Essencial |
| Admin / notas | Filtros, busca, ordenação, paginação, anotações e CSV | Fontes oficiais e retenção documental | Essencial |
| Admin / pendências | Atribuição, prioridade, comentário, resolver/reabrir | Workflow e notificações persistentes | Alta |
| Admin / A1 | Metadados, vencimento e ciclo futuro | Cofre KMS/HSM, autorização e rotação | Alta |
| Admin / usuários | Concessão/revogação visual e papéis | MFA, RBAC/ABAC e auditoria de acessos | Essencial |
| Admin / relatórios | Carteira, categorias, período e CSV | Conciliação e indicadores operacionais | Alta |
| Admin / atividades | Timeline local das simulações | Trilha imutável e retenção | Alta |
| Admin / suporte | Fila, resposta, encerramento e reabertura | SLA, backend e canais autorizados | Alta |
| Admin / notificações | Ler, silenciar e navegar | Entrega real e preferências | Média |
| Admin / fiscal | Cinco abas e parâmetros inventados | Motor normativo versionado e revisão humana | Alta |
| Admin / integrações | Cards não conectados e requisitos futuros | SEFIN/ADN/municípios/ERP conforme escopo | Posterior |
| Admin / configurações | Tema, densidade, alertas, dicas, tour e reset | Preferências por usuário | Média |
| Admin / validação | 28 funcionalidades, decisões, prioridades, sugestões, notas e exportação | Governança de produto | Essencial |
| Cliente / início | CNPJ, quatro indicadores, atalhos e últimas notas | Painel conciliado por empresa | Essencial |
| Cliente / emissão rápida | Favorito, tomador, descrição, valores, competência e simulação | Pipeline validado e idempotente | Essencial |
| Cliente / emissão completa | Cinco etapas, erros por campo, IBS/CBS ilustrativo e revisão | Modelo fiscal, XSD e integrações | Essencial |
| Cliente / notas | Somente CNPJ atual; detalhe e exportação | Isolamento real e consulta autorizada | Essencial |
| Cliente / eventos | Justificativa, cancelamento e substituição simulados | Protocolos e regras oficiais | Alta |
| Cliente / duplicação | Nova edição/rascunho, original preservado | Persistência e rastreabilidade | Alta |
| Cliente / rascunhos | Autosave de edição e salvamento manual, retomada, duplicação e exclusão | Concorrência, versionamento e recuperação | Essencial |
| Cliente / tomadores | Dados DOC-DEMO, contato .invalid, CRUD/arquivo por CNPJ | Privacidade e validação cadastral | Alta |
| Cliente / favoritos | Descrição pré-configurada, ordem, favorito e reuso | Classificação oficial revisada | Alta |
| Cliente / resultados | Sem ranking de outros clientes, evolução e CSV | Conciliação e relatórios reais | Média |
| Cliente / ajuda | FAQ e ticket visível no admin do mesmo navegador | Atendimento real | Alta |
| Cliente / perfil | Persona, tema e equipe visual de Gestor | Identidade e vínculos reais | Alta |
| Cliente / opinião | Cinco notas e comentário visível na validação local | Coleta consentida e análise | Essencial |

## Limites deliberados

- Perfis filtram e desabilitam ações visualmente. LocalStorage e detalhes filtrados não constituem autorização, confidencialidade ou segurança multi-tenant.
- O documento é uma prévia empresarial demonstrativa. Não reproduz integralmente DANFSe oficial e não tem QR, chave ou protocolo.
- Desconto/valor são apenas aritmética de demonstração; não há alíquota ou motor normativo. Deduções e tributação servem para revisar layout.
- Datas e SLAs são fictícios. Comparação de períodos ocorre pela seleção de mês/ano; não há apuração real.
- Suporte, feedback e alterações existem somente no navegador. Não foram enviados ao escritório ou a outros dispositivos.
- Integrações, autenticação, banco, envio de mensagens e A1 real estão expressamente adiados.
