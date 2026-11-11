# IA COMPLIANCE NFS-e — demonstração V2 e fundação operacional M1

**Plataforma Inteligente de Emissão e Gestão de Serviços** do Grupo IA Compliance.

## Fase 2 / M1 — modo operacional

O projeto agora tem **dois modos separados**. `npm run dev` preserva a demonstração V2 abaixo. `npm run dev:operational` abre a interface com backend obrigatório, autenticação real, MFA, PostgreSQL, RBAC e cadastros/rascunhos persistidos; não usa fixtures/localStorage como fallback.

**Neste ambiente:** operacional em http://localhost:3001, API em http://127.0.0.1:8000 e PostgreSQL local em 127.0.0.1:55432. Credenciais aleatórias de desenvolvimento estão em `.local/m1-access.json`, ignorado pelo Git; não há senha padrão no código. O administrador exige configurar MFA no primeiro acesso.

**Execução Docker em outro ambiente:**

```sh
python scripts/configure_m1.py
docker compose up --build -d
docker compose exec api python -m app.cli bootstrap --email seu-email@seu-dominio.com
```

O bootstrap pede a senha sem exibi-la. O Compose publica o modo operacional em http://localhost:3000. Docker não está instalado no ambiente desta entrega: os testes locais usam PostgreSQL real nativo, não uma alegação de execução de containers.

Instruções completas de bootstrap, instalação nativa, testes, convites e privilégios em [FASE2_M1_EXECUCAO.md](docs/FASE2_M1_EXECUCAO.md); inventário em [FASE2_M1_INVENTARIO.md](docs/FASE2_M1_INVENTARIO.md) e resultados/limitações em [FASE2_M1_VALIDACAO.md](docs/FASE2_M1_VALIDACAO.md).

**M2/M3 permanecem desligados.** Não há cobrança, XML fiscal, assinatura, consulta oficial, autorização, certificado real ou emissão de NFS-e no M1. Não há produção aprovada. O modo operacional deixa isso explícito; o modo demonstração mantém os avisos e fluxos fictícios anteriores.

## Fase 1 V2 — modo de demonstração preservado

**AMBIENTE DE DEMONSTRAÇÃO — NÃO EMITE NOTAS FISCAIS.** Dois portais de experiência: `/admin` para o escritório e `/portal` para os clientes. Todo conteúdo é fictício; não existe backend, banco de dados, autenticação, autorização segura, integração ou operação fiscal real.

## Instalar e executar

Node.js 22.18 ou superior (recomendado 24) e npm.

```sh
npm install
npm run dev
```

Abra **http://localhost:3000**. No PowerShell com scripts restritos, use `npm.cmd install` e `npm.cmd run dev`. Escolha um dos dois cartões da entrada. Não há e-mail/senha. Não existe URL pública publicada por esta entrega.

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

Os testes E2E exigem o servidor local na porta 3000 e o Chromium do Playwright (`npx playwright install chromium`). A configuração detecta o Chromium local do Windows ou aceita `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. O build exporta páginas estáticas em `out/`, sem backend de negócio. Diretórios de build e desenvolvimento são separados.

## Como explorar

- **Escritório:** Administrador IA Compliance ou Analista do Escritório. O administrador gerencia a carteira; a persona Analista tem ações administrativas desabilitadas visualmente.
- **Cliente:** Gestor, Emissor ou Consulta. Gestor pode escolher os CNPJs da mesma conta fictícia; Emissor e Consulta permanecem no CNPJ atual. Consulta não emite nem edita cadastros na interface. Esses comportamentos não representam segurança real.
- **Ver como cliente:** no painel do escritório, escolha empresa e persona. O portal mostra retorno ao escritório. Não é impersonação segura.
- **Emitir:** `/portal/emitir/rapida` para favorito + tomador + valores; `/portal/emitir/completa` para cinco etapas. Use apenas exemplos fictícios. A nota DEMO aparece na lista e nos indicadores.
- **Rascunhos:** formulário em edição é salvo automaticamente no navegador. “Salvar rascunho” inclui o registro em Meus rascunhos. Ao trocar CNPJ no assistente, preserve o rascunho anterior ou confirme o descarte da edição.
- **Suporte:** pedido em `/portal/ajuda` aparece em `/admin/suporte` neste mesmo navegador; respostas e encerramento ficam visíveis nos dois lados.
- **Feedback:** envie em `/portal/feedback` e revise em `/admin/avaliacao`. Nada foi enviado ao escritório nem sincronizado com outro dispositivo.
- **Decisões:** avalie 28 funcionalidades, prioridades, notas e 25 jornadas. Exporte JSON ou Markdown com matriz, comentários, sugestões e feedback. “Restaurar avaliação” preserva os demais dados.
- **Reset completo:** `/admin/configuracoes` → Restaurar demonstração → confirmar. Restaura dados e preferências V2.

## Dados e arquitetura

Seed determinística: 8 contas cliente, 12 empresas, 108 notas, 36 tomadores, 18 serviços, 12 rascunhos, 10 pendências, 12 notificações, 8 certificados fictícios e 6 tickets. Datas baseadas na referência do briefing: novembro de 2026. Algumas empresas mostram A1 não configurado para validar o estado vazio.

- `src/domain/`: tipos, permissões visuais e validações de interface.
- `src/data/`: seed e inventário de avaliação.
- `src/demo/`: provider compartilhado, seletores e `DemoRepository` tipado.
- `src/components/admin/`, `portal/`, `shared/`: experiências e componentes reutilizáveis.
- `src/app/`: App Router, rotas estáticas e estilos responsivos.
- `tests/`: domínio/persistência e jornadas Playwright.

Chave versionada: **`ia-nfse-demo:v2`**. Conteúdo antigo ou inválido nessa chave restaura a seed. Dados V1 são ignorados e não misturados. O navegador pode inspecionar ou alterar tudo; o armazenamento não é banco de dados nem segurança. Não armazene dados reais, documentos, senhas ou certificados.

Cada nota, rascunho, tomador e serviço possui `companyId`. Métricas derivam das mesmas notas filtradas. Valor de serviços considera emitidas em simulação, excluindo recebidas, canceladas, substituídas e erros. Substituição preserva o valor ativo com vínculo ao anterior. Desconto é somente aritmética ilustrativa; não há motor tributário, ISS, retenções ou IBS/CBS normativos.

## Limites e documentação

Não há upload A1/PFX/P12, XML fiscal, assinatura, mTLS, transmissão, protocolo, chave oficial, QR, consulta governamental ou API de produto. Classificações são ilustrativas. Documento e exportações levam aviso de ausência de validade fiscal. Tickets, histórico e perfis são apenas simulações locais; não são auditoria legal nem isolamento multi-tenant.

Referências completas: [mapa de telas](docs/MAPA_DE_TELAS.md), [matriz V2](docs/MATRIZ_DE_FUNCIONALIDADES.md), [jornadas](docs/JORNADAS_DE_VALIDACAO.md), [design](docs/DECISOES_DE_DESIGN.md), [roadmap](docs/ROADMAP_FASE_2.md) e [permissões futuras](docs/MODELO_DE_PERMISSOES_FUTURAS.md). Documentos com nomes anteriores são registros da V1, substituídos pela documentação V2 acima.
