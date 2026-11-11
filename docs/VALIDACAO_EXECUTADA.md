# Validação executada — Fase 1 V2

## Ambiente e acesso

Windows, Node.js 24.19.0, Next.js 15.5.29, React 19 e TypeScript estrito. Chromium headless do Playwright. Servidor de desenvolvimento iniciado em **http://localhost:3000**; `/admin` e `/portal` responderam HTTP 200. Nenhuma URL pública foi publicada.

## Resultados reais

- `npm run lint`: **passou, sem erros ou avisos** na execução final.
- `npm test`: **10 testes passaram**.
- `npm run build`: **passou**, incluindo compilação, lint e verificação de tipos; exportação estática em `out/` com os caminhos V2 e aliases V1.
- `npm run test:e2e`: **6 jornadas passaram** em `portals.spec.ts`.
- Após correção final de estabilidade do foco, `npm run test:e2e -- mobile.spec.ts`: **2 jornadas adicionais passaram** — teclado/diálogo e emissão completa do fluxo rápido no celular.
- `npm audit --omit=dev`: **0 vulnerabilidades reportadas**. A instalação final também reportou zero no conjunto de dependências analisado. Avisos de segurança dependem do catálogo disponível no momento da execução.

## Domínio e persistência — 10 testes

1. Volumes V2 e integridade dos vínculos entre contas, empresas, tomadores, serviços e notas.
2. Seletores por CNPJ e reconciliação do faturamento agregado.
3. Rejeição de tomador/serviço de outro CNPJ na simulação.
4. Valor zero, competência impossível, descontos e formato de documento demonstrativo.
5. Rascunho salvo/carregado por empresa e retomada da etapa.
6. Fallback seguro de seed para payload antigo ou inválido.
7. Emissão cria uma nota; substituição preserva valor ativo; cancelamento o retira; contexto indevido é rejeitado pelo adaptador demo.
8. Feedback e avaliação persistem no mesmo armazenamento local.
9. Personas e seleção visual de empresas permitidas no mock.
10. Reset independente, moeda brasileira, escape de CSV e aviso de invalidez fiscal.

## Navegador — 6 + 2 jornadas

- **Gestão local:** nova conta e novo CNPJ, detalhe criado, menu recolhível, atribuição/comentário/resolução de pendência, revogação visual de acesso e CSV com marca demonstrativa.
- **Dois portais e emissão rápida:** entrada admin, Analista com ação desabilitada, visualização como cliente, ausência de Todas as empresas no portal, bloqueio visual de detalhe de outro CNPJ, emissão, prévia/print, substituição vinculada, cancelamento e recarga. Sem exceções JavaScript e sem requisições externas observadas nessa jornada.
- **Emissão completa:** tomador/serviço locais novos, cinco etapas, erro obrigatório, salvamento/recarga/retomada, rejeição simulada recuperável e duplicação preservando original.
- **Interação local:** ticket criado no cliente, respondido/encerrado no admin e status revisto no portal; feedback recebido na validação, decisão/observação/nota e JSON com conteúdo conferido; reset de avaliação preservando feedback.
- **Contexto e preferências:** Consulta não emite nem edita cadastro; troca explícita de CNPJ preserva rascunho, tomadores continuam separados, tema persiste e reset completo volta a 108 notas.
- **Rotas e responsividade:** 33 telas críticas responderam HTTP 200 e renderizaram heading; caminho inexistente respondeu 404; admin e cliente em **1440×900, 768×1024 e 390×844**, sem overflow horizontal da página; drawer móvel e navegação para feedback.
- **Teclado em diálogos:** digitação sequencial de justificativa e busca sem perder foco, Shift+Tab em ciclo, Escape e retorno de foco ao gatilho.
- **Emissão no celular:** entrada, drawer, escolha de fluxo, tomador/favorito/valor, revisão, simulação e prévia com marca de ausência de validade fiscal em 390×844.

## Limites da verificação

Não foram testadas integrações, emissão real, certificados reais, normas tributárias, segurança multi-tenant ou autenticação porque não existem nesta fase. Testes de contexto verificam comportamento visual normal, não confidencialidade de dados. Não houve auditoria integral WCAG, leitores de tela ou matriz de navegadores. Os tours são passos em modal; campos fiscais são layout, não conformidade. Histórico e localStorage são editáveis e não constituem log legal ou armazenamento seguro.

Execute também os roteiros humanos em `JORNADAS_DE_VALIDACAO.md` e registre as decisões em `/admin/avaliacao`.
