# Mapa de telas

Todas as rotas abaixo são páginas reais geradas por `generateStaticParams`. Os módulos usam o mesmo shell e estado demonstrativo.

| Rota | Objetivo e ações principais |
|---|---|
| `/` | Entrada, seleção de persona, apresentação do protótipo |
| `/dashboard` | Indicadores derivados, gráficos, alertas, notas recentes, empresa e período |
| `/empresas` | Busca, cadastro, edição, arquivamento e restauração demo |
| `/empresas/DEMO-1` até `/empresas/DEMO-12` | Abas de dados, notas, serviços, fiscal, A1, usuários e histórico |
| `/emissao` | Escolha do fluxo de emissão |
| `/emissao/simplificada` | Prestador, favorito, tomador, valor e simulação |
| `/emissao/completa` | Wizard de cinco etapas, validação, rascunho, prévia e simulação |
| `/notas/emitidas` | Busca, ordenação de valor, situação, período, paginação e CSV |
| `/notas/recebidas` | Documentos recebidos fictícios e manifestação simulada |
| `/notas/DEMO-N1` até `/notas/DEMO-N48` | Detalhe de fixture, prévia, cancelamento e substituição demo |
| `/notas/local?id=DEMO-...` | Detalhe dos documentos criados neste navegador |
| `/rascunhos` | Retomar, duplicar, remover e criar rascunho |
| `/tomadores` | Busca, criação, edição e remoção local |
| `/servicos` | Busca, cadastro, edição, remoção e favoritos |
| `/fiscal` | Abas e matriz de parâmetros ilustrativos, sugestão fictícia |
| `/certificados` | Metadados fictícios, alertas e ciclo futuro do A1 |
| `/eventos` | Histórico de ações simuladas |
| `/relatorios` | Faturamento, gráficos, ranking, serviços e exportação |
| `/notificacoes` | Alertas, leitura, silenciamento e navegação relacionada |
| `/auditoria` | Timeline local sem natureza legal |
| `/usuarios` | Personas, vinculações fictícias e troca visual |
| `/configuracoes` | Tema, idioma, preferências, tour e restauração |
| `/integracoes` | Inventário de conexões futuras, todas desligadas |
| `/avaliacao` | 18 módulos, decisões, notas, sugestões, checklist, resumo e JSON |

Novas empresas locais abrem a página de detalhe por query `?company=LOCAL-...`; não dependem de backend ou rota gerada dinamicamente no servidor.
