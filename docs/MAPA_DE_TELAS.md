# Mapa de telas — Fase 1 V2

## Entrada

| Rota | Experiência |
|---|---|
| `/` | Dois cartões: escritório e cliente; personas e três empresas iniciais; sem senha |
| `/demonstracao` | Roteiros, tours separados e limites do protótipo |

## Escritório

| Rota | Ações demonstrativas |
|---|---|
| `/admin` | Carteira consolidada, CNPJ/período/situação, KPIs e gráficos |
| `/admin/clientes` | Contas de clientes: criar, editar, inativar/restaurar |
| `/admin/clientes/CONTA-1` … `CONTA-8` | Conta, CNPJs, usuários, notas, suporte e histórico |
| `/admin/empresas` | CNPJs, conta vinculada, regime, município e situação |
| `/admin/empresas/DEMO-1` … `DEMO-12` | Dados, notas, serviços, A1, acessos, pendências e portal da empresa |
| `/admin/notas` | Documentos agregados, filtros, ordenação, paginação e CSV |
| `/admin/notas/DEMO-NFSE-000001` … `000108` | Documento, anotações internas, eventos e prévia |
| `/admin/pendencias` | Atribuir, comentar, resolver e reabrir |
| `/admin/certificados` | Oito metadados A1 e estados não configurados; ciclo futuro |
| `/admin/usuarios` | Vínculos e concessão/revogação visual, comparação de papéis |
| `/admin/relatorios` | Valor de serviços, ranking de empresas/categorias e CSV |
| `/admin/atividades` | Histórico local editável, sem natureza de auditoria segura |
| `/admin/suporte` | Tickets locais, mensagens, resposta, encerramento e reabertura |
| `/admin/notificacoes` | Leitura, silenciamento e item relacionado |
| `/admin/fiscal` | ISS, retenções, IBS/CBS, classificações e municípios ilustrativos |
| `/admin/integracoes` | Não conectado — Fase 2; requisitos futuros por integração |
| `/admin/configuracoes` | Tema, densidade, dicas, alertas, tour e reset completo |
| `/admin/avaliacao` | 28 funcionalidades, prioridades, notas, feedback, 25 jornadas e exportação |

## Cliente

| Rota | Ações demonstrativas |
|---|---|
| `/portal` | Saudação, CNPJ, indicadores exclusivos e atalhos de tarefa |
| `/portal/emitir` | Escolha rápida/completa e orientação |
| `/portal/emitir/rapida` | Favorito, tomador, descrição, valor, competência, revisão e simulação |
| `/portal/emitir/completa` | Prestador, tomador, serviço, valores, revisão; cinco etapas |
| `/portal/notas` | Notas do CNPJ, filtros e CSV; recebidas somente para layout |
| `/portal/notas/DEMO-NFSE-000001` … `000108` | Detalhe somente quando pertence ao CNPJ atual; prévia e eventos |
| `/portal/rascunhos` | Retomar, duplicar, excluir e novo rascunho |
| `/portal/tomadores` | Criar, editar, arquivar e usar na emissão |
| `/portal/servicos` | Criar, editar, arquivar, favoritar, reordenar e usar |
| `/portal/relatorios` | Resultados e serviços exclusivamente da empresa |
| `/portal/ajuda` | FAQ, pedido de ajuda e situação dos tickets locais |
| `/portal/perfil` | Persona, preferências e equipe visual para Gestor |
| `/portal/feedback` | Notas de experiência e comentários locais |

## Registros criados e compatibilidade

Novas notas abrem `/admin/notas/local?id=...` ou `/portal/notas/local?id=...`; contas e empresas criadas abrem `/admin/clientes/local?id=...` e `/admin/empresas/local?id=...`. São páginas estáticas com consulta exclusiva ao estado local. Detalhes de outro CNPJ no portal mostram estado indisponível, sem seus dados.

Rotas V1 conhecidas, como `/dashboard`, `/emissao/completa` e `/avaliacao`, encaminham à experiência V2 equivalente. Caminhos desconhecidos mostram 404 amigável.
