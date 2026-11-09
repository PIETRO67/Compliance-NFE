# Decisões de design e arquitetura

## Identidade

Marca tipográfica temporária IA COMPLIANCE. Não havia logo no repositório. Sidebar grafite `#15181D`, dourado `#C5A46D`, fundo claro `#F5F6F8`, superfícies brancas e bordas discretas. Tema escuro usa fundo `#111317` e superfície `#1C2026`. Verde moderado significa sucesso demonstrativo; vermelho é reservado a erro e ação de remoção/reset.

Fonte local comparável a Inter (Arial/Helvetica como fallback), sem download externo. Números tabulares nas tabelas e valores. Pequenos rótulos de seção, espaçamento consistente, painéis com borda e sombra discreta. Tabelas priorizam leitura e densidade de operação.

## Navegação e interação

Sidebar agrupada, empresa visível no topo, breadcrumbs e aviso persistente. Drawer abaixo de 900px. KPIs levam aos módulos relacionados. Modais dão contexto antes de alterações destrutivas. Os perfis filtram menus sem alegar segurança. Formulários usam labels, mensagens de validação, foco visível, campos nativos e pt-BR.

## Dados

`fixtures()` é determinística e devolve um conjunto novo; os tipos são estritos. `DemoState` e `DemoRepository` formam o contrato local que pode ser substituído por um repository remoto na Fase 2. A aplicação usa um estado React único para cadastros, notas, rascunhos, eventos e avaliação. Persistência é feita no browser após hidratação, evitando diferenças entre SSR e cliente. Não há fetch/axios de produto.

Faturamento soma notas emitidas demo ativas, exclui recebidas/canceladas/substituídas e respeita o escopo. O valor ISS de 2% é explicitamente fictício. A substituição marca o original e cria novo registro com vínculo, preservando o valor ativo.

## Escolhas de implementação

Next App Router com exportação estática e lista explícita de rotas; detalhes de novas notas usam rota estática e query. Tailwind 4 e CSS com tokens; Lucide e Recharts. Componentes nativos foram preferidos a Radix/shadcn por simplicidade neste primeiro protótipo. Zod valida os campos principais; React Hook Form e date-fns ficam disponíveis na stack, mas controles simples usam estado React e Intl nativo.

O primeiro corte concentra os módulos em um componente de experiência compartilhado, com tipos/fixtures separados. Antes de backend, extrair providers, repository e componentes por domínio sem alterar o contrato visual. Não antecipar infraestrutura fiscal nesta fase.

## Limitações a revisar

Tabelas e filtros foram simplificados em alguns módulos; filtros não são todos serializados na URL. Empresa, período, regime e município persistem como preferências locais para manter o contexto entre dashboard e documentos. Tour é um modal de apresentação. Campos complementares de tributação/intermediário persistem no rascunho e são representações de layout. Ampliar o modelo de endereço e classificações, a granularidade de filtros e a revisão de acessibilidade antes de produção. Modais já possuem Escape, ciclo de Tab e retorno de foco; campos usam etiquetas explicitamente associadas. O protótipo não atesta conformidade fiscal ou acessibilidade integral.
