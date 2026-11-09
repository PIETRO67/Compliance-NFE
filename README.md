# IA COMPLIANCE NFS-e

Plataforma Inteligente de Emissão e Gestão de Serviços — **DEMO / PROTÓTIPO — FASE 1**.

**AMBIENTE DE DEMONSTRAÇÃO — NÃO EMITE NOTAS FISCAIS.** Todos os registros são fictícios. Não há backend, banco de dados, autenticação real, APIs de produto, conexão fiscal, upload de certificado, assinatura ou transmissão.

## Executar

Requisitos: Node.js 22.18 ou superior (recomendado 24) e npm. Os testes unitários utilizam o suporte nativo a TypeScript do Node.

```sh
npm install
npm run dev
```

Abra **http://localhost:3000**. No PowerShell com scripts restritos, use `npm.cmd install` e `npm.cmd run dev`. Escolha Gestor do Escritório, Analista Fiscal ou Cliente e clique em **Entrar na demonstração**. Não há senha. Os perfis só filtram menus visualmente.

```sh
npm run build
npm test
npm run test:e2e
```

O build gera uma exportação estática em `out/`. `npm run dev` inicia o servidor de desenvolvimento. Os testes de navegador exigem o servidor na porta 3000 e Chromium do Playwright instalado (`npx playwright install chromium`).

## Organização

- `src/app/[[...slug]]/page.tsx`: inventário de rotas estáticas App Router.
- `src/components/demo-app.tsx`: shell responsivo e módulos interativos compartilhados.
- `src/lib/demo.ts`: tipos, fixtures determinísticas e funções de domínio demonstrativas.
- `src/lib/demo-repository.ts`: contrato de leitura e persistência local substituível na Fase 2.
- `src/app/globals.css`: tokens, temas, tabelas, formulários e impressão.
- `tests/`: verificações das fixtures e jornadas de navegador.
- `docs/`: mapa de telas, matriz de funcionalidades, decisões, roadmap e roteiro manual.

## Dados e persistência

12 empresas, 48 documentos (emitidos e recebidos), 20 tomadores, 15 serviços e 9 rascunhos iniciais. Documentos, cadastros, eventos, avaliação e preferências persistem apenas neste navegador via `localStorage`. As datas iniciais são fixas em 2026 para exploração reproduzível. Selecione **Ano de 2026** para o conjunto completo.

O seletor de empresa e período afeta as métricas e documentos. Faturamento considera somente documentos emitidos demo ativos; cancelados, substituídos e recebidos ficam fora da soma. O ISS de 2% é mera aritmética ilustrativa e não uma regra tributária. Em emissão, cada rascunho pertence a um prestador. A mudança de prestador com conteúdo pede confirmação e preserva o rascunho anterior.

Para restaurar: **Configurações → Resetar dados demo → Confirmar simulação**. Não use dados reais. Exportações CSV/JSON e impressão são locais e levam aviso demonstrativo.

## Validação visual

Siga [o roteiro de 15 minutos](docs/ROTEIRO_VALIDACAO.md). Experimente 1440×900, 768×1024 e 390×844. Avalie cada módulo em `/avaliacao` e exporte as decisões para discutir a Fase 2.

## Limites conscientes

Nenhuma classificação, retenção, NBS, CST, cClassTrib ou alíquota foi validada oficialmente. Campos complementares de intermediário, observações e IBS/CBS são persistidos no rascunho e servem para avaliação de layout, sem processamento normativo. Endereços são representações fictícias de leitura. Não há seleção de arquivo A1. Tour é uma apresentação acessível por modal; não há autenticação ou restrição real de acesso por URL. Auditoria local é editável e não serve como trilha legal. Veja a matriz para diferenças entre o protótipo e a Fase 2.
