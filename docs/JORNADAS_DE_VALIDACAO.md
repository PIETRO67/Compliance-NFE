# Jornadas de validação — V2

Abra http://localhost:3000. Use somente nomes inventados, documentos `DOC-DEMO-...` e contatos `.invalid`. Instalação, limites e comandos estão no README.

## Escritório — 5–10 minutos

1. Escolha Administrador na entrada e acesse o painel.
2. Confira carteira consolidada, período, CNPJ e situação. Compare indicadores e documentos.
3. Abra uma conta cliente, os CNPJs vinculados, notas e suporte.
4. Teste Analista: ajuste administrativo deve estar desabilitado visualmente.
5. Revise pendência, atribua responsável, comente, resolva e reabra.
6. Abra metadados A1 sem upload; consulte requisitos de uma integração desligada.
7. Use Ver portal desta empresa e escolha a persona.
8. Retorne e responda/encerre um pedido de ajuda local.
9. Leia feedback e registre decisões, comentários, prioridades e notas no Centro de Validação.
10. Exporte JSON/Markdown e confira o conteúdo. Restaurar avaliação deve preservar notas, tickets e feedback.

## Cliente — 5–10 minutos

1. Entre como Gestor com Aurora. A topbar não oferece Todas as empresas; a lista não mostra documentos de outro CNPJ.
2. Emita pelo fluxo rápido: tomador, favorito, descrição, valor, competência, aceite e simulação.
3. Confira detalhe, documento com tarja e indicador atualizado. Duplique como rascunho, preservando a original.
4. Crie tomador e serviço fictícios. Teste formato inválido de documento e contato.
5. Execute cinco etapas; avance sem campo obrigatório e com valor zero. Erros devem identificar o campo.
6. Salve rascunho, recarregue e retome na mesma etapa.
7. Teste rejeição simulada, edite/retente e confirme que não há duplicação indevida.
8. Cancele/substitua com justificativa e confirme a situação/vínculo.
9. Peça ajuda e envie opinião. Abra o admin no mesmo navegador e confira ambos.
10. Teste Consulta: não deve emitir/editar na interface. Troque tema e recarregue.

## Casos adicionais

- Escolha de CNPJ durante edição exige salvar ou confirmar descarte; o rascunho anterior não pode mudar de empresa.
- Cadastros, favoritos, rascunhos, serviços e resultados do portal possuem `companyId` e não podem se misturar nas telas normais.
- Acesso direto a detalhe de nota de outro CNPJ mostra “Documento indisponível neste contexto”. Isso não é prova de segurança real.
- Filtros sem resultado mostram estado vazio; 404 oferece retorno.
- Em 1440×900, 768×1024 e 390×844: menu/drawer, emissão visível, formulário adaptado, foco, labels e rolagem interna de tabelas.
- Teste Tab, Shift+Tab e Escape nos diálogos. Prévia/print e CSV devem conter DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL.
- Reset completo requer confirmação e restaura seed, feedback, tickets, avaliação e preferências.

## Verificações automatizadas

`npm test`: domínio, relacionamentos, seletores por CNPJ, métricas, validação de datas/documentos/valores, payload inválido, rascunhos, emissão/eventos e feedback/avaliação persistidos.

`npm run test:e2e`: entrada dos dois portais, contexto visual, emissão rápida e completa, cadastros, persistência, rejeição recuperável, eventos, prévia/print, suporte, feedback, exportação, permissões visuais, tema, reset, rotas e responsividade.

Resultados efetivamente executados estão registrados em `VALIDACAO_EXECUTADA.md`: lint, build, dez testes de domínio, seis jornadas principais de navegador e duas verificações adicionais de teclado/mobile passaram. Testes não atestam conformidade fiscal, segurança ou acessibilidade integral.
