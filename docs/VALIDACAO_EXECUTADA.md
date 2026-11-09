# Validação executada nesta entrega

## Ambiente

Windows, Node.js 24.19.0, Next.js 15.5.29, React 19, TypeScript estrito. Servidor de desenvolvimento local em `http://localhost:3000`. Nenhuma URL pública foi publicada.

## Resultados

- `npm test`: **6 testes passaram** — volumes, referências entre fixtures, reset independente, associação de rascunho ao prestador, formatação brasileira, reconciliação por empresa e efeitos de substituição/cancelamento no faturamento.
- `npm run test:e2e`: **5 testes passaram** no Chromium headless.
- Após ajustes finais no seletor de prestador e menu recolhível, o teste direcionado `npm run test:e2e -- --grep "nova empresa"` passou novamente.
- `npm run build`: compilação e checagem TypeScript passaram; exportação estática gerada em `out/`.
- `npm audit --omit=dev`: **0 vulnerabilidades reportadas** na execução. O resultado depende do catálogo de avisos disponível no momento da análise.

## Cobertura de navegador

1. Entrada e apresentação; empresa e período mantidos entre dashboard e notas; troca entre empresas; criação de tomador e serviço; cinco etapas com erro de campo obrigatório; rascunho salvo e retomado; falha de operação opt-in; emissão demo; prévia inválida fiscalmente; substituição vinculada; cancelamento; recarga persistente; decisão, nota e exportação da avaliação. Sem exceções JavaScript nessa jornada.
2. 22 telas principais abertas com HTTP 200; aviso demonstrativo em todas; dashboard em **1440×900, 768×1024 e 390×844**, sem overflow horizontal da página; drawer móvel e navegação para Avaliação.
3. Perfis Gestor/Analista/Cliente e menus; tema persistente; emissão simplificada; manifestação recebida; modal A1 com Escape; leitura de alertas; reset para 48 documentos. Nenhuma requisição externa observada nessa jornada.
4. As **12 rotas de empresas e 48 rotas de notas de fixtures** responderam HTTP 200.
5. Empresa criada localmente abre seu próprio detalhe; seleção do novo CNPJ se reflete no prestador; troca via topbar e via campo de prestador preserva o rascunho anterior; CSV contém marca demonstrativa; menu lateral recolhe e expande.

## Limites da verificação

Os testes não comprovam acessibilidade integral, segurança, conformidade fiscal, comportamento em todos os navegadores ou funcionamento em produção. Não houve integração oficial, emissão real, autenticação, processamento de A1 ou cálculo normativo. A revisão humana visual deve seguir `ROTEIRO_VALIDACAO.md` e registrar decisões em `/avaliacao`.
