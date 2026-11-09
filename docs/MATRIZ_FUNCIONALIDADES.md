# Matriz de funcionalidades

| Funcionalidade | Situação na Fase 1 | Proposta Fase 2 | Prioridade / observações |
|---|---|---|---|
| Entrada e personas | Seleção visual, sem senha | Identidade, sessão e RBAC real | Alta |
| Multiempresa | Seletor e dados locais por CNPJ demo | Isolamento multi-tenant auditável | Essencial |
| Dashboard | Métricas derivadas, período, regime, município | Indicadores conciliados com fontes autorizadas | Alta; sem comparação normativa |
| Empresas | CRUD local, arquivo/restauração, abas | Validação e onboarding autorizados | Alta |
| Simplificada | Favorito, tomador, valor, simulação | Pipeline fiscal validado | Essencial |
| Completa | Cinco etapas, validação, revisão e simulação | Motor de domínio, contratos e integrações | Essencial |
| Rascunhos | Autosave principal, CRUD e retomada | Persistência por usuário/tenant e concorrência | Essencial |
| Campos complementares | Controles persistidos de intermediário, observações, retenções e IBS/CBS | Modelo completo e validação por operação | Alta; endereços são exemplos de leitura |
| Notas | Busca, filtros, paginação, ordenação e detalhe | Consulta oficial e conciliação | Essencial |
| Eventos fiscais | Cancelamento, substituição e manifestação locais | Protocolos oficiais e regras validadas | Alta; sempre demo |
| Prévia / exportação | Impressão com tarja, CSV, JSON de avaliação | DANFSe oficial e política de acesso | Alta |
| Tomadores / serviços | CRUD e favoritos locais | Cadastros persistentes, validação de classificações | Alta |
| Centro fiscal | Abas, parâmetros e sugestão fictícia | Conteúdo versionado e revisão profissional | Alta |
| A1 | Somente metadados, modal do ciclo futuro | Cofre KMS/HSM, autorização e rotação | Alta; sem upload nesta fase |
| Relatórios | Gráfico e ranking derivados | Conciliação, relatórios completos | Média |
| Notificações | Leitura e silenciamento local | Preferências, tarefas e canais autorizados | Média |
| Auditoria | Eventos em memória/localStorage | Logs imutáveis, retenção e integridade | Alta; não é trilha legal |
| Usuários | Perfis e menus visuais | RBAC/ABAC, vínculos e revisão de acesso | Alta |
| Configurações | Tema, reset, tour, dicas e alertas persistidos localmente | Preferências por usuário autenticado | Média |
| Integrações | Cards desativados com explicação | SEFIN, ADN, municípios, ERP, e-mail | Após definição de escopo |
| Avaliação | 18 módulos, cinco decisões, notas, sugestões, checklist e JSON | Importar decisões no planejamento | Essencial |
| Tour | Modal com roteiro, reiniciável | Tour contextual por componente | Média |
| Estados | Carregamento inicial, vazio, erros validados, erro de operação opt-in e toasts | Estados reais derivados dos contratos | Alta |
| Filtros | Empresa, período e pesquisa; filtros especializados por módulo | Filtros avançados com URL e compartilhamento | Média; alguns filtros do escopo ainda simplificados |

Todo botão ativo altera estado, navega, exporta ou abre conteúdo útil. Integrações não implementadas estão desativadas. A fase não consulta governo, CEP, IA, CNPJ ou certificados.
