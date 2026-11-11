# Decisões de design — V2

## Duas experiências

O escritório é o operador e dono do produto. O cliente é usuário final do emissor. A entrada apresenta duas escolhas equivalentes, sem simular login. Admin utiliza sidebar grafite, densidade gerencial, carteira, indicadores e tabelas. Portal utiliza sidebar clara, ação dourada de emissão, linguagem de tarefa e apenas atalhos relevantes para o CNPJ atual.

Ambos compartilham campos, tabelas, diálogos e documento demonstrativo. A navegação e o conteúdo são próprios. No portal não há Todas as empresas, ranking da carteira ou centro fiscal administrativo. O retorno ao escritório aparece quando a experiência foi aberta pelo admin, acompanhado do aviso de simulação.

## Tokens e conteúdo

Grafite `#101319`, superfície escura próxima de `#1B2028`, branco/off-white, dourado `#C5A46D` em identidade e `#9D7B44` em ações/hover, neutros para leitura, verde moderado para confirmação demo e vermelho para erro. Tipografia local sem downloads externos; hierarquia e números tabulares. Dourado claro não é cor de texto de corpo sobre branco.

Não havia logo oficial em `public/`: V2 usa assinatura tipográfica IA COMPLIANCE, sem inventar símbolo oficial. O slogan e a marca completa aparecem na entrada/documentação.

## Contexto e dados

`DemoProvider` reside no layout raiz para compartilhar estado entre rotas e portais. `DemoRepository` possui métodos tipados para leitura, rascunhos, emissão, eventos, feedback e avaliação. A chave `ia-nfse-demo:v2` valida estrutura e contexto conhecido; payload inválido restaura seed. Dados V1 não são reutilizados para evitar referências sem CNPJ.

`companyId` vincula documentos, tomadores, serviços e rascunhos. Portal filtra todas as consultas normais e rejeita detalhes de outro contexto. O assistente apresenta prestador fixado; troca explícita permitida à persona Gestor oferece salvar ou descartar a edição anterior. Perfis são desenho de experiência, não segurança.

## Componentes e acessibilidade

Campos têm labels explícitos, IDs estáveis, `aria-invalid` e descrição de erro. Os cadastros utilizam React Hook Form + Zod; o wizard usa estado controlado e regras de interface tipadas. Dates utilizam date-fns com pt-BR; moeda usa Intl. Modais gerenciam foco, Escape, ciclo de Tab e retorno ao gatilho. Recharts utiliza dados derivados, sem animação transitória que prejudique a leitura determinística. Tailwind e tokens CSS mantêm os estilos compartilhados. Controles nativos acessíveis foram preferidos a introduzir outro conjunto de componentes; shadcn/Radix podem ser adotados na decomposição futura sem alterar contratos.

Sidebar vira drawer abaixo de 900px. Formulário de emissão tem largura limitada e resumo lateral; mobile empilha os campos e permite recolher a prévia. Rodapé do wizard permanece sensível à rolagem. Tabelas têm rolagem interna, sem forçar rolagem horizontal da página. Modais e impressão preservam o aviso demonstrativo.

## Revisões futuras

Auditar WCAG 2.2 AA integralmente, múltiplos navegadores e leitores de tela. Substituir permissões visuais por autorização no backend; definir modelos fiscais e de endereço completos. Tours são passos em modal, não dicas sobrepostas por elemento. Comparações e classificações atuais são deliberadamente ilustrativas.
