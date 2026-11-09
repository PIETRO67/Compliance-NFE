# IA COMPLIANCE NFS-e — Fase 1

- Somente front-end Next.js / React / TypeScript estrito. Sem backend, APIs de produto, banco, autenticação real, certificados ou emissão fiscal.
- Dados fictícios tipados em `src/lib/demo.ts`. Fixtures e alterações locais são a única fonte das telas. Nunca incluir documentos, dados pessoais ou credenciais reais.
- `localStorage`: `ia-demo-v1`, `ia-prefs`, `ia-working`. Reset deve restaurar fixtures e rascunho em edição.
- Preservar os avisos de DEMO no shell, emissão e documentos. Toda exportação deve informar ausência de validade fiscal. Não criar QR, chave ou XML oficial.
- Rotas estáticas reais geradas no App Router; detalhes de registros locais usam `/notas/local?id=...`.
- Ações destrutivas pedem confirmação. Recursos futuros devem estar desativados e indicar Fase 2.
- Manter pt-BR, responsividade e foco de teclado. Validar com `npm run build` e `npm test`.
- Documentar decisões e limitações em `docs/`. Não publicar ou conectar integrações nesta fase.
