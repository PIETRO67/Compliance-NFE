# PROMPT MASTER V2 — IA COMPLIANCE NFS-e
## Fase 1 — Protótipo navegável com DOIS PORTAIS: Administração do Escritório + Autoatendimento do Cliente

**Versão da especificação:** 2.0  
**Data de referência:** 11/11/2026  
**Marca:** Grupo IA Compliance — Consultoria, Contabilidade, Gestão e Soluções Financeiras e Tecnológicas  
**Slogan:** Nossa missão é o seu sucesso.  
**Natureza desta fase:** exclusivamente front-end demonstrativo. **Não emite NFS-e real.**

> **INSTRUÇÃO PRINCIPAL PARA O CLAUDE CODE**  
> Atue como Product Manager, Product Designer B2B sênior, arquiteto front-end e desenvolvedor React/Next.js. **Construa e execute**, no repositório atual, um aplicativo web navegável e testável. Não entregue somente um plano, wireframes ou imagens. O resultado deve ser visualizado por URL local/preview e permitir que eu desempenhe dois papéis: **(A) Administrador do Grupo IA Compliance** e **(B) Cliente que emite suas próprias NFS-e**. As ações serão simuladas com dados fictícios, sem backend, banco de dados ou conexão com sistemas externos. A interface deve ser plausível como produto comercial, mas sempre identificar o ambiente como DEMO.

---

# 0. CONTRATO DE EXECUÇÃO — O QUE PRECISA EXISTIR AO FINAL

Implementar um aplicativo com:

1. Uma **tela de entrada da demonstração**, com dois caminhos óbvios: **“Acessar painel do escritório”** e **“Acessar portal do cliente”**.
2. **Painel do Escritório** em rotas `/admin/*`: visão central de diversos CNPJs/clientes e funcionalidades de gestão, supervisão e suporte.
3. **Portal do Cliente** em rotas `/portal/*`: interface mais simples e focada em emitir, consultar, duplicar e acompanhar NFS-e de **uma empresa autorizada por vez**.
4. Alternância de **perfis fictícios**, troca de CNPJ quando o perfil permitir e opção demonstrativa **“Visualizar experiência do cliente”** a partir do painel administrativo, sem fingir que isso é impersonação segura.
5. **Emissão simplificada e completa simuladas**, com formulários funcionais, validações de interface, rascunhos, prévia ilustrativa e geração de registro DEMO no histórico.
6. Listagem de notas, filtros, visualização, cancelamento/substituição **simulados**, cadastros de tomadores e serviços favoritos.
7. Métricas, notificações, certificados A1 fictícios, pendências e relatórios **coerentes com os dados locais**.
8. Um **Centro de Validação da Fase 1** onde o escritório possa escolher **Manter / Melhorar / Remover / Adiar / Adicionar** e exportar decisões para a Fase 2.
9. Uma forma de registrar **feedback como cliente**, visível também no painel de avaliação do escritório **no mesmo navegador**, explicitando que não há sincronização entre dispositivos.
10. Projeto iniciável por `npm install` e `npm run dev`, compilável com `npm run build` e acesso local geralmente em `http://localhost:3000`.

**Não encerre o trabalho após criar a estrutura ou uma homepage bonita.** Implemente as principais jornadas, teste a navegação, corrija erros e mostre exatamente como abrir a aplicação. Se não for possível rodar preview no ambiente atual, forneça comandos locais honestos, sem inventar URL pública.

---

# 1. CONTEXTO DE NEGÓCIO E VISÃO DO PRODUTO

O **IA Compliance NFS-e** será uma plataforma proprietária do Grupo IA Compliance, gerenciada pelo escritório e disponibilizada a seus clientes para que emitam e controlem suas NFS-e sem precisar acessar diariamente o emissor público.

**O escritório é o dono/operador da plataforma. Os clientes são usuários finais do portal.** Não confundir com um software usado apenas por funcionários contábeis.

## 1.1. Problemas que o produto resolve

**Para o cliente:**
- Emissão de NFS-e simples, rápida e guiada.
- Menos digitação repetitiva; reuso de tomadores e serviços.
- Fácil localização de notas anteriores e rascunhos.
- Visualização organizada de faturamento e documentos.
- Solicitação de ajuda ao escritório sem recorrer a mensagens dispersas.

**Para o escritório:**
- Visibilidade consolidada e segmentada de clientes/CNPJs.
- Antecipação de pendências operacionais e erros frequentes.
- Acompanhamento de emissões e suporte com contexto.
- Governança de acessos e certificados (somente desenho visual na Fase 1).
- Dados operacionais que ajudem a prestar atendimento consultivo.

## 1.2. Duas experiências claramente diferentes

**Portal A — Escritório:** denso e gerencial; tabelas, filtros, carteira de clientes, notificações, relatórios, visão fiscal ilustrativa, administração e acompanhamento.

**Portal B — Cliente:** leve, claro, orientado à tarefa; botão principal **“Emitir nova NFS-e”**, últimas notas, pendências compreensíveis, tomadores, serviços, suporte e status.

Não usar a mesma sidebar complexa para os dois portais. Compartilhar componentes internos, mas **ter identidade de navegação e conteúdo próprios**.

## 1.3. Perfis demonstrativos

1. **Administrador IA Compliance:** todas as empresas fictícias, administração e revisão.
2. **Analista do Escritório:** acompanha empresas e notas, abre pendências; alguns ajustes administrativos aparecem desabilitados.
3. **Gestor do Cliente:** acessa uma empresa fictícia, emite notas e gerencia usuários visuais próprios.
4. **Emissor do Cliente:** emite, consulta, usa rascunhos e gerencia tomadores/serviços; não gerencia usuários.
5. **Consulta do Cliente:** só consulta e exporta demonstrações, sem emissão.

Essas permissões são **puramente visuais** para demonstração. **Não existe autenticação, autorização ou segurança de dados implementada nesta fase.** O teste de troca de perfil verifica a experiência; não comprova isolamento seguro.

---

# 2. RESTRIÇÕES ABSOLUTAS DA FASE 1

## 2.1. É proibido implementar agora

- Backend de negócio, APIs próprias, route handlers de negócio, Server Actions de persistência, banco SQL/NoSQL, ORM, Supabase, Firebase ou serviços serverless.
- Login real, senhas, OAuth, autenticação Gov.br, perfis de usuário reais ou tokens de sessão.
- Integração com SEFIN Nacional, ADN, CNC, prefeituras, Receita Federal, ERP, e-mail, WhatsApp, pagamentos, consulta CPF/CNPJ/CEP ou serviços de inteligência artificial.
- Upload real de A1, `.pfx`, `.p12`, solicitação de senha ou chave privada.
- DPS/XML fiscal real, assinatura XMLDSIG, mTLS, transmissão, autorização, consulta real, cancelamento real ou geração de DANFSe com aparência de documento válido.
- Cálculo tributário que afirme conformidade real com ISS, retenções, NBS, cClassTrib, CST, IBS ou CBS.
- Persistência em nuvem ou compartilhamento entre computadores.

## 2.2. É permitido e desejado

- **Fixtures locais tipadas em TypeScript**, com empresas, usuários, notas e cadastros fictícios.
- Estado React (Context, Zustand ou solução simples equivalente).
- `localStorage` exclusivamente para alterações demonstrativas: rascunhos, notas DEMO, preferências, simulação de perfis, feedback e avaliação. Não tratar isso como banco de dados ou segurança.
- Gerar CSV/JSON/Markdown no próprio navegador e prévia imprimível com marca d'água de demonstração.
- Bibliotecas NPM para UI instaladas durante desenvolvimento. **O aplicativo em uso não deve chamar APIs externas**; fontes e imagens devem ser locais ou ter fallback seguro.
- “Dados ilustrativos” e “Simular falha” para testar mensagens, vazios, rejeições e recuperação.

## 2.3. Avisos obrigatórios

Mostrar **“AMBIENTE DE DEMONSTRAÇÃO — NÃO EMITE NOTAS FISCAIS”** em ambos os portais, em local persistente e legível.

Todo comprovante, impressão ou prévia deve exibir **“DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL”** em destaque.

Nunca criar chave oficial, QR code oficial, número de autorização ou protocolo governamental fictício com aparência autêntica. Usar identificadores como `DEMO-NFSE-000123` e estado **“Emitida (simulação)”**, não “Autorizada pela SEFIN”.

Exibir “Simulação local / Não conectado” para funcionalidades de integração. Não permitir cadastro de clientes reais e não instruir o usuário a enviar certificado ou senha nesta fase.

---

# 3. STACK, PADRÕES E ORGANIZAÇÃO DE CÓDIGO

- Next.js com App Router, React, TypeScript estrito e Tailwind CSS.
- shadcn/ui e Radix UI para componentes acessíveis; Lucide React; Recharts para gráficos, se útil.
- React Hook Form + Zod para validação de **interface**, date-fns `pt-BR` para datas.
- Componentes client para estado e `localStorage`; não criar API para gerir dados.
- HTML semântico, tabelas acessíveis, navegação por teclado, diálogo com foco gerenciado, labels, estados de erro e feedback.
- ESLint e `npm run build` funcionando. Se possível, Vitest/Testing Library e Playwright para jornadas essenciais.
- Código organizado, tipagem clara, dependências enxutas e boa experiência em desktop e celular.

## 3.1. Estrutura de pastas sugerida

```text
src/
  app/
    page.tsx                         # Seletor inicial de experiência DEMO
    (admin)/admin/
      layout.tsx
      page.tsx                       # Dashboard do escritório
      clientes/page.tsx
      clientes/[id]/page.tsx
      empresas/page.tsx
      empresas/[id]/page.tsx
      notas/page.tsx
      notas/[id]/page.tsx
      pendencias/page.tsx
      certificados/page.tsx
      usuarios/page.tsx
      relatorios/page.tsx
      atividades/page.tsx
      suporte/page.tsx
      fiscal/page.tsx
      integracoes/page.tsx
      configuracoes/page.tsx
      avaliacao/page.tsx
    (portal)/portal/
      layout.tsx
      page.tsx                       # Dashboard do cliente
      emitir/page.tsx                # Escolher emissão rápida/completa
      emitir/rapida/page.tsx
      emitir/completa/page.tsx
      notas/page.tsx
      notas/[id]/page.tsx
      rascunhos/page.tsx
      tomadores/page.tsx
      servicos/page.tsx
      relatorios/page.tsx
      ajuda/page.tsx
      perfil/page.tsx
      feedback/page.tsx
    demonstracao/page.tsx            # Ajuda e roteiro para testar
    not-found.tsx
  components/
    admin/                            # Sidebar e telas de gestão
    portal/                           # Shell e telas simplificadas do cliente
    shared/                           # Campos, tabelas, modais, avisos, previews
    fiscal-demo/                      # Componentes fiscais SEM valores oficiais
    ui/
  data/
    fixtures/
      empresas.ts clientes.ts usuarios.ts tomadores.ts servicos.ts
      notas.ts rascunhos.ts certificados.ts notificacoes.ts
  domain/
    models.ts                         # interfaces/tipos
    permissions-demo.ts               # permissões visuais, NÃO segurança
    rules-demo.ts                     # validação UI, NÃO motor tributário
  demo/
    DemoProvider.tsx
    DemoRepository.ts                 # interface para futura substituição
    local-storage.ts
    seed.ts
    selectors.ts                      # filtros, somas e agregações consistentes
    actions.ts                        # ações DEMO com efeitos de interface
  lib/
    currency.ts dates.ts formatters.ts masks.ts download.ts
  styles/
  tests/
docs/
  MAPA_DE_TELAS.md
  MATRIZ_DE_FUNCIONALIDADES.md
  JORNADAS_DE_VALIDACAO.md
  DECISOES_DE_DESIGN.md
  ROADMAP_FASE_2.md
  MODELO_DE_PERMISSOES_FUTURAS.md
README.md
CLAUDE.md
```

Adapte nomes quando necessário, mas mantenha as áreas `/admin` e `/portal` independentes. Não criar páginas com botões decorativos ou `href="#"`.

## 3.2. Preparação para Fase 2 sem implementá-la

Criar uma camada `DemoRepository` com métodos tipados, por exemplo `listCompanies`, `listInvoices`, `saveDraft`, `simulateIssue`, `updateInvoiceStatus`, `listFeedback`, `saveEvaluation`. Hoje implementados com fixtures e armazenamento local. Na Fase 2 a interface poderá usar outro adaptador sem reescrever formulários.

Cada nota, rascunho, serviço e tomador deve ter `companyId`. O seletor atual deve filtrar por esse campo. As métricas devem ser **calculadas das mesmas notas**, não digitadas em cards independentes. Manter esquema de persistência versionado: por exemplo `ia-nfse-demo:v2`.

---

# 4. DESIGN SYSTEM — IDENTIDADE GRUPO IA COMPLIANCE

## 4.1. Posicionamento visual

Criar um SaaS fiscal **elegante, corporativo, confiável e fácil**, não um site promocional. O painel do escritório pode ser mais analítico; o portal do cliente deve ter menos itens, menos jargão e mais orientação.

Cores de referência:

| Token | Valor inicial | Uso |
|---|---|---|
| Grafite | `#101319` | Fundo/shell escuro |
| Superfície escura | `#1B2028` | Sidebar/cards escuros |
| Dourado institucional | `#C5A46D` | Identidade e ação principal pontual |
| Dourado escuro | `#9D7B44` | Estados hover com contraste |
| Branco/off-white | `#F8F9FB` | Tema claro |
| Cinza/neutro | `#64748B` | Texto auxiliar |
| Verde contido | `#16836B` | Confirmação demonstrativa |
| Vermelho | `#C74949` | Erros e ações perigosas |
| Âmbar | `#A66B15` | Pendência/atenção |

Considerar contraste WCAG 2.2 AA, não usar dourado claro sobre branco para texto de corpo. Priorizar tipografia clara, espaços generosos e leitura tabular.

Se houver **logo oficial disponível na pasta `public/`**, utilize-a preservando proporções. Caso contrário, criar apenas uma assinatura tipográfica temporária **IA COMPLIANCE**; não inventar símbolos, selos do governo ou logos de parceiros.

## 4.2. Componentes

- Sidebars **distintas** para escritório e cliente.
- Topbar com identificação de contexto, perfil DEMO, empresa atual, notificações e tema.
- Banners de DEMO em ambos os portais.
- Cards KPI com clique e destino útil.
- Tabelas com busca, filtros, ordenação, paginação ou “ver mais”.
- Drawer lateral para ações rápidas, modais com confirmação e formulários em etapas.
- Tabs, badges neutros, tooltips, stepper, timeline e empty states.
- Toast com mensagens explícitas: “Rascunho salvo neste navegador”, “Emissão simulada realizada”.
- Skeletons de demonstração curtos/opcionais, sem adicionar espera desnecessária.
- Página 404 amigável e link de retorno.

## 4.3. Breakpoints

Validar em **1440×900 (desktop)**, **768×1024 (tablet)** e **390×844 (mobile)**. Portal do cliente deve ser especialmente simples no celular: botão “Emitir NFS-e” visível, navegação enxuta, formulários de uma coluna. Sidebar vira drawer sem perder o fluxo.

---

# 5. EXPERIÊNCIA DE ENTRADA, SELEÇÃO DE PERFIL E CONTEXTO

## 5.1. Tela inicial `/`

Layout de boas-vindas com marca, propósito, aviso DEMO e **dois cartões grandes**:

**Cartão A — Escritório IA Compliance**
- Texto: “Gerencie clientes, acompanhe emissões e avalie operações.”
- CTA: **Acessar painel administrativo**.
- Subopções de persona: Administrador / Analista.

**Cartão B — Cliente IA Compliance**
- Texto: “Emita suas NFS-e com mais facilidade e consulte seus documentos.”
- CTA: **Acessar portal do cliente**.
- Seleção de empresa fictícia (começar com 3 opções evidentes) e perfil: Gestor / Emissor / Consulta.

**Não pedir e-mail/senha**; exibir “Acesso simulado — nenhuma autenticação real”.

## 5.2. Troca de experiência

- Em `/admin`, menu **“Visualizar como cliente (DEMO)”** abre modal para escolher empresa/perfil e vai a `/portal`.
- Em `/portal`, botão **“Voltar à demonstração”** permite retornar à escolha inicial. Se veio do admin, mostrar retorno ao painel admin.
- Ao trocar contexto, limpar somente a seleção visual, **sem fundir dados de empresas**.
- Sempre exibir nome do papel selecionado e da empresa ativa.
- **Não permitir “Todas as empresas” no Portal do Cliente.** Essa opção existe apenas no painel administrativo agregado.
- Uma empresa fictícia pode ter mais de um usuário fictício; demonstrar permissões por papel.

## 5.3. Onboarding

Tour opcional de 4 a 6 passos para o painel admin e outro, mais curto, para o portal cliente. Botão para pular e reiniciar. Incluir página `/demonstracao` com roteiro de teste e explicação das limitações.

---

# 6. DADOS FICTÍCIOS E COERÊNCIA DO PROTÓTIPO

Gerar dados locais **100% inventados** e identificados como DEMO:

- **12 empresas fictícias**, com rótulos `CNPJ DEMO-001` etc. e municípios de referência, inclusive Itumbiara/GO, Goiânia/GO, Uberlândia/MG e Brasília/DF. Não afirmar que CNPJ fictício corresponde a contribuinte real. Diversificar MEI, Simples Nacional, Presumido e Real.
- **8 clientes-conta fictícios**; alguns com dois CNPJs sob mesma conta, para validar empresa vs. cliente.
- **5 a 10 usuários fictícios** com papéis distintos.
- **80 a 120 notas DEMO** distribuídas por CNPJ, situação, mês e tomador; um subconjunto de notas recebidas **apenas para layout**.
- **30 a 40 tomadores**, **15 a 20 serviços favoritos**, **10 a 15 rascunhos**, **10 pendências**, **12 notificações**, **8 certificados A1 demonstrativos** e **6 solicitações de suporte DEMO**.
- Simular serviços como consultoria, contabilidade, manutenção, TI, clínica, treinamento e serviços profissionais; **classificações fiscais ilustrativas**.
- Todo dado tributário terá tooltip/legenda: “Exemplo para validação do layout — regra fiscal não verificada”.

Exibir datas coerentes, valores em BRL e situações variadas. Derivar totais e gráficos das mesmas notas e filtros. Ao criar/cancelar nota DEMO, todos os KPIs e tabelas correspondentes devem ser atualizados.

## 6.1. Armazenamento apenas local

- Persistir ações demonstrativas em `localStorage` no navegador do avaliador: notas DEMO, rascunhos, tomadores, preferências, feedback e avaliação.
- Exibir aviso “Informações salvas somente neste navegador, sem nuvem”.
- Implementar **“Restaurar demonstração”**, com confirmação e restauração completa de fixtures.
- Ter proteção contra payload antigo/inválido: versionar armazenamento e usar fallback de seed.
- Não usar armazenamento para documentos, credenciais ou dados reais.

---

# 7. PORTAL A — PAINEL ADMINISTRATIVO DO GRUPO IA COMPLIANCE

**Base de rotas:** `/admin/*`. **Princípio:** visão de carteira, supervisão e suporte; não replicar a interface simplificada do cliente.

## 7.1. `/admin` — Dashboard executivo

**Header:** “Visão geral da carteira”, seletor “Todas as empresas”/uma empresa, período, busca e ação **“Visualizar como cliente”**.

KPIs: clientes cadastrados, CNPJs ativos, volume de notas DEMO no período, valor total de serviços demonstrativos, rascunhos pendentes, notas com erro simulado, certificados fictícios próximos do vencimento, chamados abertos.

Gráficos: evolução de emissões em 12 meses, serviços por categoria e ranking de empresas; tudo fictício e derivado de dados locais. Tabelas de notas recentes, pendências prioritárias e atividade da carteira.

**Interações:** clicar no KPI leva à tela filtrada; alterar período/CNPJ muda os dados; clicar em empresa abre o detalhe; abrir atendimento/alerta leva à tela correta.

## 7.2. `/admin/clientes` e `/admin/clientes/[id]`

Cadastro e visão de **contas de clientes** (separadas das empresas/CNPJs). Lista com responsável, contatos fictícios, empresas vinculadas, atividade e última movimentação. Detalhe com abas: Visão geral, CNPJs, usuários, notas, suporte, histórico.

Ações de UI: adicionar conta cliente DEMO, editar, marcar ativo/inativo e abrir suas empresas. Essas alterações persistem somente localmente.

## 7.3. `/admin/empresas` e `/admin/empresas/[id]`

Tabela de CNPJs fictícios com município, regime, status demo, cliente vinculado, responsável, alertas. Detalhe com abas: Dados, Notas, Serviços, Certificado DEMO, Acessos simulados, Pendências e Histórico.

Ações: incluir empresa fictícia; editar; arquivar/restaurar; **“Ver portal desta empresa”** direciona ao contexto CLIENTE-DEMO correspondente. Nunca permitir mistura de dados.

## 7.4. `/admin/notas` e `/admin/notas/[id]`

Controle de notas de **todas as empresas autorizadas no mock**, com filtros por cliente, CNPJ, período, status, tipo, serviço e valor. Exibir detalhes e eventos fictícios.

Ações demo: pesquisar, ordenar, exportar CSV rotulado DEMO, abrir detalhe, acessar portal da empresa e registrar anotação interna fictícia. Se oferecer “Cancelar” ou “Substituir”, usar confirmação clara de **SIMULAÇÃO**, sem operação fiscal.

## 7.5. `/admin/pendencias`

Central de pendências por empresa: rascunho incompleto, dados de tomador inválidos para demonstração, certificado vencendo (fictício), falha simulada, ajuste pendente. Colunas: prioridade, CNPJ, responsável fictício, prazo demonstrativo, status. Ações locais: atribuir, comentar, resolver e reabrir; atualizar contadores.

## 7.6. `/admin/certificados`

Listar metadados A1 fictícios por CNPJ: nome DEMO, validade fictícia, alerta, responsável. Tela didática explicando fluxo futuro: autorização do cliente → validação → cofre → rotação → uso → logs. **Sem upload, senha ou arquivo**.

## 7.7. `/admin/usuarios`

Tabela de usuários fictícios, cliente/empresa associados, perfil demonstrativo e status. Modal visual de conceder/revogar **acesso simulado** e comparação de permissões. Incluir banner “Apenas design — autenticação/autorização não implementadas”.

## 7.8. `/admin/relatorios`

Faturamento demonstrativo por empresa, quantidade de notas, tipos de serviço, comparação de períodos, filtros e exportação CSV fictícia. Nenhum dado deve ser apresentado como apuração fiscal real.

## 7.9. `/admin/atividades`

Timeline de eventos locais: emissão simulada, edição, troca de contexto, avaliações, cancelamento fictício. Rotular “Histórico demonstrativo local — não é log de auditoria imutável”.

## 7.10. `/admin/suporte`

Painel de solicitações fictícias dos clientes; fila, status, prioridade, mensagens simuladas, nota/CNPJ relacionado. Poder responder e encerrar localmente. O formulário do portal do cliente deve gerar uma solicitação visível **neste mesmo navegador**.

## 7.11. `/admin/fiscal`

Centro apenas **ilustrativo** com abas ISS, Retenções, IBS/CBS, Classificações, Regras Municipais. Mostrar placeholders bem desenhados, fonte futura e rótulo “Não consultado”. Evitar simular conformidade normativa. Campos CST/cClassTrib/NBS podem existir apenas como campos de layout com valores didáticos e sem cálculo oficial.

## 7.12. `/admin/integracoes`

Cards para SEFIN, Parâmetros Municipais, ADN, DANFSe, Certificados A1, ERP/Contabilidade e Notificações. Todos: **“Não conectado — Fase 2”**. Em vez de botão falso de conectar, usar **“Ver requisitos futuros”** que abre painel explicativo.

## 7.13. `/admin/configuracoes`

Preferências DEMO (tema, densidade das tabelas, simulação de notificações), personalização visual provisória, ajuda, reset de dados e visão do roadmap. Não criar tela de credenciais reais.

## 7.14. `/admin/avaliacao` — CENTRO DE VALIDAÇÃO DO PRODUTO

Esta é **uma das entregas prioritárias**, não pode ser uma página vazia.

Construir um inventário de funcionalidades de ambos os portais, com colunas: portal, módulo, funcionalidade, utilidade, complexidade futura **qualitativa**, dependências e decisão.

Para cada funcionalidade, permitir selecionar **Manter / Melhorar / Remover / Adiar**; oferecer **“Adicionar funcionalidade”** em formulário separado. Campo de observação e prioridade (**Crítico / Importante / Opcional**).

Criar avaliações de 1 a 5 para: identidade visual, facilidade de uso, clareza do portal cliente, utilidade do painel admin, experiência de emissão e mobile.

Exibir:
- Progresso: funcionalidades avaliadas / total.
- Quadro de decisões (Manter, Melhorar, Adiar, Remover).
- Sugestões novas com título, descrição, portal de destino e prioridade.
- Feedback recebido pelo formulário de clientes no mesmo navegador.
- Checklist de aceitação das jornadas principais.
- Botão **“Exportar decisões da Fase 1”** (Markdown e/ou JSON) contendo a matriz, notas, comentários, prioridades e resumo de escopo aprovado para Fase 2.

Também incluir botão “Restaurar avaliação” com confirmação, sem resetar os demais dados automaticamente.

---

# 8. PORTAL B — AUTOATENDIMENTO DOS CLIENTES

**Base de rotas:** `/portal/*`. **Princípio:** tarefas simples, linguagem clara, mínimo de fricção; cliente não vê dados de outros CNPJs.

## 8.1. `/portal` — Dashboard do cliente

- Saudação e identificação clara da empresa fictícia.
- Botão principal destacado **“Emitir nova NFS-e”**.
- KPIs simples: notas DEMO do mês, valor total demonstrativo, rascunhos, notas recentes e alertas.
- Acesso rápido: Emissão rápida, Notas, Tomadores, Serviços favoritos, Pedir ajuda.
- Lista de últimas notas com ação “Ver” e “Duplicar como rascunho”.
- Widget “Como emitir em 3 passos” e aviso de que não há emissão real.

O cliente **não** verá ranking de outros clientes, carteira consolidada ou estrutura administrativa do escritório.

## 8.2. `/portal/emitir` — Escolha do fluxo

Dois cartões:
- **Emissão rápida**: indicado para serviços repetidos; selecionar tomador, serviço favorito, valor, revisar e simular.
- **Emissão completa**: indicado para operações que exigem mais detalhes; assistente em 5 etapas.

Exibir tempo apenas como orientação de UX, **sem prometer tempo real**; mostrar mini checklist e exemplos didáticos.

## 8.3. `/portal/emitir/rapida` — Emissão rápida funcional

Implementar campos: prestador fixado à empresa demo, tomador, serviço favorito, descrição editável, valor, competência, indicação ilustrativa de retenção e observações. Validar campos essenciais e mostrar resumo antes da simulação. A ação **“Simular emissão”** cria nota DEMO, atualiza o dashboard e direciona ao detalhe.

O serviço favorito deve preencher descrição e seleção ilustrativa, e nunca aplicar tributação normativa real.

## 8.4. `/portal/emitir/completa` — Wizard de 5 etapas

**Etapa 1 — Prestador:** empresa demo selecionada, regime, município; nenhum outro CNPJ visível sem troca explícita autorizada pela persona.

**Etapa 2 — Tomador:** selecionar cadastrado ou adicionar demo, identificação fictícia, nome, município, contato; opção intermediário ilustrativo.

**Etapa 3 — Serviço:** descrição, competência, local da prestação, município de incidência, serviço, referência ilustrativa à lista nacional/NBS, observações, obra/evento se apropriado para design.

**Etapa 4 — Valores e tributação (DEMO):** valor bruto, descontos, deduções, indicação visual de ISS retido e retenções; aba expandível **“Reforma Tributária — IBS/CBS (layout ilustrativo)”** para validar posicionamento de campos e explicações. **Não calcular alíquotas oficiais, não dizer que foram consultadas nem inserir automaticamente códigos fiscais válidos.** Se simular cálculo matemático, rotular “Exemplo matemático, não fiscal”.

**Etapa 5 — Revisão:** apresentar resumo detalhado, avisos, visualização da prévia com marca DEMO; ações “Voltar”, “Salvar rascunho” e **“Simular emissão”**.

**Comportamentos:**
- Stepper com progresso visível; avançar/voltar sem perda de dados.
- Validação de campos e erros perto do campo.
- Salvamento manual e opcional automático do rascunho no navegador.
- Ao trocar empresa no meio do formulário, oferecer salvar rascunho anterior ou confirmar descarte.
- Simulação de emissão gera `DEMO-NFSE-XXXX` e estado **“Emitida (simulação)”**. Redirecionar ao detalhe e exibir toast claro.
- Um botão “Testar rejeição simulada” deve mostrar feedback recuperável, sem perder rascunho.
- Não exibir elementos oficiais de emissão autenticada.

## 8.5. `/portal/notas` e `/portal/notas/[id]`

- Listagem **somente da empresa selecionada**, filtros por período, tomador, valor e situação demo.
- Detalhe com prestação, tomador, valores de exemplo, eventos e **prévia ilustrativa**.
- Ações: duplicar para nova emissão; imprimir prévia DEMO com marca d'água; exportar CSV DEMO; simular cancelamento/substituição quando perfil demo permitir.
- Cancelamento exige justificativa demonstrativa e confirmação; atualizar listagens/KPIs. Substituição cria registro DEMO vinculado ao anterior.
- Mostrar área de “Notas recebidas” apenas como demonstração opcional com origem fictícia e aviso de que a consulta real dependerá da Fase 2.

## 8.6. `/portal/rascunhos`

Salvar, abrir, editar, duplicar e excluir rascunhos. Mostrar data da última edição, etapa concluída e indicador “Faltam informações”. Abrir rascunho retorna à etapa correta.

## 8.7. `/portal/tomadores`

Lista simples e CRUD de tomadores fictícios. Buscar por nome, filtro, validações de formulário, editar, arquivar, selecionar tomador direto de uma nota. Nenhum botão ocioso.

## 8.8. `/portal/servicos`

Serviços frequentes/favoritos, criar e editar exemplo, reordenar/favoritar e usar em emissão rápida. Informar que classificações fiscais precisarão ser validadas na integração futura.

## 8.9. `/portal/relatorios`

Visão leve: quantas notas demo no mês, valor de serviços, ranking pessoal de serviços, evolução mensal e exportação CSV demonstrativa. Sem comparativos com outros clientes.

## 8.10. `/portal/ajuda`

- FAQ claro: como emitir, revisar, duplicar, encontrar notas, corrigir campos e pedir suporte.
- Formulário **“Solicitar ajuda ao Grupo IA Compliance”**: assunto, categoria, nota DEMO relacionada, descrição e urgência; gera ticket local visível no `/admin/suporte` do mesmo navegador.
- Tela de status dos tickets gerados localmente.
- Nenhum envio de e-mail ou mensagem real.

## 8.11. `/portal/perfil`

Informações da empresa DEMO, perfil visual, preferências do usuário, tema e troca de perfil simulado. Gestor visualiza aba ilustrativa “Equipe e permissões”, sem segurança real.

## 8.12. `/portal/feedback`

Mini formulário para avaliar o portal com notas de 1 a 5 para rapidez, facilidade de emissão, clareza, mobile e utilidade; campo “O que melhorar?”, escolha de tela, botão “Enviar avaliação (local)”. Feedback persistido localmente e listado em `/admin/avaliacao` **no mesmo browser**. Exibir “Este feedback não foi enviado ao escritório; é uma simulação local”.

---

# 9. EXPERIÊNCIA FISCAL E DOCUMENTAL — SOMENTE SIMULAÇÃO

O módulo de emissão é um **protótipo de interface**, não uma implementação do padrão fiscal. O design deve refletir conceitos do Sistema Nacional NFS-e sem declarar aderência técnica ou jurídica.

## 9.1. Prévia de nota

Criar um componente `DemoInvoicePreview` com visual inspirado em documento empresarial, mas **não copiar integralmente um DANFSe oficial**. Exibir em diagonal/rodapé grande:

**DOCUMENTO DEMONSTRATIVO — SEM VALIDADE FISCAL**

Utilizar `DEMO-NFSE-...`, dados fictícios, sem selo oficial, QR code de autenticidade, chave de acesso, protocolo ou logotipo gov.br.

## 9.2. Tributos no protótipo

A UI pode mostrar: código de serviço ilustrativo, município, ISS, retenções, IBS/CBS, CST, cClassTrib e NBS **como campos de layout**. Seus valores devem ser placeholders, opções explicitamente inventadas ou “A confirmar na Fase 2”. Não afirmar enquadramento correto, bases, alíquotas ou créditos.

## 9.3. Estado das operações

Distinguir visualmente: `Rascunho DEMO`, `Emitida (simulação)`, `Cancelada (simulação)`, `Substituída (simulação)`, `Erro simulado`. Não usar nomenclatura de autorização real.

---

# 10. COMPORTAMENTOS QUE DEVEM FUNCIONAR DE VERDADE NA INTERFACE

**Não aceitar botões cenográficos.** Todo botão visível e habilitado deve alterar estado, navegar, filtrar, baixar um arquivo DEMO, abrir diálogo útil ou exibir feedback de ação. Se não implementado, desabilitar com tooltip **“Previsto para Fase 2”**.

Implementar e demonstrar estas jornadas:

1. Entrar no painel admin e visualizar todas as empresas DEMO.
2. Alternar para perfil Analista e verificar a simplificação de menus/ações visuais.
3. Filtrar notas de uma empresa e abrir detalhes.
4. Abrir cliente e empresa vinculados; acessar “Ver portal como cliente (DEMO)”.
5. Entrar no Portal do Cliente em modo Gestor.
6. Confirmar que ele vê **somente seu CNPJ**, nunca dados de outra empresa.
7. Selecionar um serviço favorito e emitir NFS-e **simulada** pelo fluxo rápido.
8. Conferir nota DEMO gerada no histórico e no dashboard do cliente.
9. Executar emissão completa com campos obrigatórios e erros de validação.
10. Salvar como rascunho, recarregar a página e retomar o mesmo rascunho.
11. Duplicar uma nota DEMO para nova emissão sem afetar a anterior.
12. Simular cancelamento de nota após confirmação; indicadores devem refletir o estado.
13. Simular substituição e visualizar referência DEMO à nota substituída.
14. Cadastrar tomador fictício e selecioná-lo numa nova emissão.
15. Cadastrar e favoritar serviço fictício; utilizá-lo na emissão rápida.
16. Abrir a prévia da nota e imprimir visualização **sem validade fiscal**.
17. Criar pedido de ajuda no portal; depois encontrá-lo no painel admin do **mesmo navegador**.
18. Responder/encerrar ticket demonstrativo no painel admin e ver novo status no portal.
19. Preencher feedback no portal; encontrar feedback no Centro de Validação admin no mesmo navegador.
20. Avaliar módulos como Manter / Melhorar / Remover / Adiar e acrescentar sugestões.
21. Exportar avaliação Markdown/JSON; arquivo deve conter decisões registradas.
22. Trocar tema claro/escuro e preservar escolha ao recarregar.
23. Filtrar dashboard por período, CNPJ e status; números devem mudar de modo coerente.
24. Executar fluxo no celular (layout adaptado, botão emitir acessível).
25. Restaurar toda a demonstração e verificar retorno dos dados iniciais.

---

# 11. ESTADOS EXCEPCIONAIS, CONFIANÇA E ACESSIBILIDADE

Criar visualizações e testes para:
- Nenhuma nota encontrada após filtro.
- Nenhum rascunho de determinado cliente.
- Tomador ausente e cadastro rápido durante emissão.
- Campo obrigatório vazio, valor zero, data inválida, documento demonstrativo com formato inválido.
- Erro de emissão **simulado**, com opção de editar/retentar sem duplicar.
- Notificação fictícia de vencimento de A1, sem pedir upload.
- Alteração de empresa durante edição com alerta sobre dados não salvos.
- Perfil somente consulta tentando clicar em “Emitir” — ação indisponível explicada.
- Atalho de acessibilidade: teclado, Enter, Escape, foco visível, labels, mensagens de erro e contraste.
- Estado mobile com menus recolhíveis e tabelas que não cortam conteúdo crítico.

Não prometer controle real de acesso, confidencialidade multi-tenant, integridade fiscal ou auditoria. Deixar claro em `README.md` que são **comportamentos de interface**, cuja implementação segura fica para a Fase 2.

---

# 12. TELAS PRIORITÁRIAS — DEFINIÇÃO VISUAL MÍNIMA

## 12.1. Tela inicial

Duas colunas desktop, uma coluna mobile. Logo tipográfico, descrição de cada portal, lista curta de capacidades, perfis fictícios e CTAs bem visíveis. Aviso DEMO. Não se parecer com login Gov.br.

## 12.2. Admin dashboard

Sidebar escura, topbar, cartões KPI, gráfico, “Notas recentes”, “Pendências prioritárias”, “Clientes que precisam de atenção”. Seletor Todas as empresas / CNPJ individual. Design com densidade profissional e ações úteis.

## 12.3. Portal dashboard

Navegação bem mais enxuta, saudação, contexto da empresa, botão principal dourado “Emitir nova NFS-e”, cartões fáceis de entender, 5 notas recentes e acesso a suporte. Não sobrecarregar com linguagem fiscal.

## 12.4. Wizard de emissão

Progressão em etapas, formulário central de no máximo 780 px de largura, resumo lateral desktop e resumo recolhível no mobile. Rodapé fixo/sensível com Voltar, Salvar rascunho e Próximo/Simular emissão.

## 12.5. Centro de avaliação

Inventário por portal, status por decisão, progresso visual e exportação, lado a lado com feedback cliente (desktop) ou abas (mobile). Deve ser possível terminar uma sessão de validação e ter um **relatório de decisões exportável**.

---

# 13. MATRIZ DE ROTAS — TODAS DEVEM ABRIR

| Área | Rotas essenciais | Objetivo |
|---|---|---|
| Entrada | `/`, `/demonstracao` | Escolha de experiência e roteiro |
| Admin | `/admin` | Visão consolidada |
| Admin | `/admin/clientes`, `/admin/clientes/[id]` | Contas e vínculos |
| Admin | `/admin/empresas`, `/admin/empresas/[id]` | CNPJs e permissões visuais |
| Admin | `/admin/notas`, `/admin/notas/[id]` | Gestão agregada |
| Admin | `/admin/pendencias`, `/admin/certificados` | Acompanhamento |
| Admin | `/admin/usuarios`, `/admin/relatorios` | Gestão e indicadores |
| Admin | `/admin/atividades`, `/admin/suporte` | Eventos e atendimento |
| Admin | `/admin/fiscal`, `/admin/integracoes` | Preparação Fase 2 |
| Admin | `/admin/configuracoes`, `/admin/avaliacao` | Preferências e decisões |
| Portal | `/portal` | Área do cliente |
| Portal | `/portal/emitir`, `/portal/emitir/rapida`, `/portal/emitir/completa` | Emissão simulada |
| Portal | `/portal/notas`, `/portal/notas/[id]`, `/portal/rascunhos` | Documentos e rascunhos |
| Portal | `/portal/tomadores`, `/portal/servicos` | Cadastros úteis |
| Portal | `/portal/relatorios`, `/portal/ajuda` | Relatórios e suporte |
| Portal | `/portal/perfil`, `/portal/feedback` | Perfil e opiniões |

Cada rota deve ter navegação coerente, breadcrumbs quando úteis, estado vazio e links de retorno. Não apresentar menu cuja rota não existe.

---

# 14. CRITÉRIOS DE ACEITE NÃO NEGOCIÁVEIS

O projeto **somente poderá ser declarado pronto para validação** se:

- [ ] As duas experiências estão visivelmente diferentes e navegáveis.
- [ ] O botão “Acessar painel administrativo” funciona.
- [ ] O botão “Acessar portal do cliente” funciona.
- [ ] Há troca de perfil DEMO e de empresa permitida por perfil.
- [ ] O cliente não visualiza dados de outros CNPJs nas telas normais do portal.
- [ ] Todos os dados são fictícios e há banner DEMO persistente.
- [ ] Nenhuma API externa de produto é chamada em runtime.
- [ ] Não há backend, banco de dados, login real ou operação fiscal real.
- [ ] O admin vê indicadores consolidados e consegue filtrá-los.
- [ ] A emissão rápida simulada funciona integralmente.
- [ ] A emissão completa em cinco etapas funciona integralmente.
- [ ] Rascunhos podem ser retomados após recarga no mesmo navegador.
- [ ] Notas demo geradas aparecem no histórico e atualizam o dashboard.
- [ ] Cancelamento/substituição simulados atualizam estados coerentemente.
- [ ] Tomadores/serviços demo podem ser cadastrados e reutilizados.
- [ ] Prévia de nota tem marca d'água de inexistência de validade fiscal.
- [ ] Pedido de ajuda do portal aparece no admin localmente.
- [ ] Feedback do cliente aparece no Centro de Validação admin localmente.
- [ ] Centro de Validação exporta relatório real em Markdown/JSON.
- [ ] Usuário pode restaurar todos os dados fictícios com confirmação.
- [ ] Layout foi revisado em desktop, tablet e smartphone.
- [ ] Não existem rotas 404 nas jornadas principais ou botões inertes habilitados.
- [ ] `npm run build` foi realmente executado e terminou sem erro (ou os erros remanescentes foram relatados sem fingir sucesso).
- [ ] README explica claramente instalar, iniciar, navegar e limitações.

---

# 15. TESTES, ROTEIRO DE AVALIAÇÃO E DOCUMENTAÇÃO

## 15.1. Testar os dois portais

**Roteiro A — Gestor do Escritório (5–10 minutos)**
1. Abrir `/` e escolher Administrador.
2. Ver carteira de empresas; filtrar dados por CNPJ/período.
3. Abrir detalhes de cliente e empresa.
4. Ver pendências, certificado DEMO, tickets e notas.
5. Usar “Visualizar como cliente” e verificar isolamento visual.
6. Voltar, abrir avaliação, classificar funcionalidades e exportar decisões.

**Roteiro B — Cliente (5–10 minutos)**
1. Abrir `/` e escolher Gestor do Cliente.
2. Emitir nota DEMO pela emissão rápida.
3. Conferir a nota no histórico e no dashboard.
4. Criar tomador e serviço favorito.
5. Abrir emissão completa, salvar rascunho e retomá-lo.
6. Simular cancelamento com confirmação.
7. Pedir ajuda, enviar feedback e conferir resultado no admin local.

## 15.2. Verificações automáticas recomendadas

- Build TypeScript e lint.
- Teste de renderização das rotas críticas.
- Testes de seletores por `companyId` e agregação de KPIs.
- Teste de persistência local (salvar e retomar rascunho).
- Teste de mudança de estado da nota ao simular emissão/cancelamento.
- Teste de exportação de avaliação.
- Teste de responsividade ou inspeção visual, se houver navegador disponível.

É desejável utilizar Playwright quando compatível com o ambiente, mas não deixar testes adicionais impedirem a entrega do app navegável.

## 15.3. Arquivos obrigatórios de documentação

1. `README.md`: instalação, comandos, acesso, perfis demonstrativos, reset, o que não é real.
2. `CLAUDE.md`: regras de engenharia, duas experiências e restrições da Fase 1.
3. `docs/MAPA_DE_TELAS.md`: todas as rotas e navegação.
4. `docs/MATRIZ_DE_FUNCIONALIDADES.md`: módulos por portal, status de UI, fase futura, prioridade.
5. `docs/JORNADAS_DE_VALIDACAO.md`: checklists dos dois perfis, casos de teste e resultados.
6. `docs/DECISOES_DE_DESIGN.md`: tokens, componentes, decisões de UX e acessibilidade.
7. `docs/ROADMAP_FASE_2.md`: plano futuro de infraestrutura, sem implementação.
8. `docs/MODELO_DE_PERMISSOES_FUTURAS.md`: papéis, vínculos cliente/CNPJ e responsabilidades.

---

# 16. ROADMAP FUTURO A DOCUMENTAR (NÃO IMPLEMENTAR)

Registrar para a Fase 2 os seguintes assuntos, sem criar integrações agora:

- Identidade/autenticação real, MFA, RBAC/ABAC e autorização obrigatória no backend.
- Multi-tenancy seguro com isolamento por cliente/empresa/CNPJ; trilhas de auditoria reais e LGPD.
- Banco de dados, versionamento de regras, backups e observabilidade.
- Integração oficial conforme municípios atendidos, credenciamento, documentação vigente e permissões: SEFIN, parâmetros municipais, ADN e DANFSe quando aplicável.
- Estratégia de certificado A1 por CNPJ, procuração/representação autorizada, assinatura XMLDSIG, mTLS e armazenamento em cofre/KMS.
- DPS/XML/XSD, emissão, consulta, tratamento de rejeições, idempotência, cancelamento/substituição e download fiscal real.
- ISS, retenções, NBS e IBS/CBS por regras versionadas e revisão profissional; não copiar valores mock como regras reais.
- Central de suporte real, e-mails/notificações, política de retenção documental, termos de serviço e treinamento de clientes.
- Piloto com poucos CNPJs autorizados; homologação oficial e liberação progressiva.

**A Fase 1 não é homologação fiscal; é validação de experiência do usuário e escopo.**

---

# 17. ORDEM DE IMPLEMENTAÇÃO PARA O CLAUDE CODE

**Execute, não apenas planeje.** Use a sequência abaixo e revise o resultado ao concluir cada bloco:

**Bloco 1 — Fundação:** inspecionar repositório; inicializar Next.js quando necessário; instalar dependências; design tokens; página de escolha; layouts `/admin` e `/portal`; fixtures; `DemoProvider`; camada `DemoRepository`.

**Bloco 2 — Gestão:** admin dashboard, clientes, empresas, notas, pendências; métricas e navegação funcional.

**Bloco 3 — Cliente:** portal dashboard, notas, tomadores, serviços; emissão rápida e completa; rascunhos e preview DEMO.

**Bloco 4 — Interação entre portais:** suporte, feedback, troca de perfis, emissão e cancelamento simulados, atualização de KPIs e dados locais.

**Bloco 5 — Completar módulos:** certificados, fiscal, integrações, usuários, atividades, relatórios e configurações, todos com estados honestos e úteis.

**Bloco 6 — Avaliação e acabamento:** Centro de Validação exportável, responsividade, acessibilidade, roteiros de teste, documentação e revisão do build.

**Bloco 7 — Execução e verificação:** rodar `npm run build`; iniciar `npm run dev` quando o ambiente permitir; usar preview/browser para clicar em rotas e executar pelo menos 1 emissão demo + 1 feedback demo + 1 avaliação exportada.

Se o contexto ou recursos forem limitados, priorize **ambos os portais**, troca de perfil, seletor de empresa, emissão DEMO, notas, rascunhos, suporte e Centro de Validação. Outros módulos podem ter UI mais simples, desde que tenham navegação e deixem claro o estado. **Nunca dizer que algo funciona sem testar.**

---

# 18. FORMATO DA RESPOSTA FINAL ESPERADA DO CLAUDE CODE

Ao terminar o desenvolvimento, responda:

1. **O que foi realmente implementado** em `/admin` e em `/portal`, separadamente.
2. **O que permanece só demonstrativo** e o que foi adiado.
3. **Rotas essenciais** dos dois portais.
4. Comandos exatos para iniciar o projeto (`npm install`, `npm run dev`), porta efetiva e URL local, se comprovada.
5. Como selecionar perfis e trocar CNPJs DEMO.
6. Como executar emissão rápida e completa simuladas e localizar o resultado.
7. Como abrir o Centro de Validação e exportar decisões.
8. Resultado efetivo de build/testes, com erros restantes se houver.
9. Próximas decisões de UX que o Grupo IA Compliance deve avaliar.

**ENTREGA FINAL EXIGIDA: aplicativo executável e navegável, com dois portais diferentes, dados locais e funcionalidades simuladas; não apenas explicações ou screenshots.**

---

# 19. REFERÊNCIAS OFICIAIS PARA CONCEITOS E EVOLUÇÃO FUTURA

Consultar **somente como referência de produto**, não criar integração nesta fase:

- Documentação atual do Sistema Nacional NFS-e: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- Serviço público de emissão, incluindo a referência a emissão simplificada/completa e credenciamento para API: https://www.gov.br/pt-br/servicos/emitir-nota-fiscal-de-servico-eletronica
- Documentação Next.js App Router: https://nextjs.org/docs/app
- Documentação de uso do Claude Code Desktop/Preview: https://code.claude.com/docs/pt/desktop

**NOTA:** a interface não deve afirmar que todas as prefeituras ou todos os serviços já são atendidos pelo Emissor Nacional. Disponibilidade, emissor municipal, credenciamento, autorização e regras fiscais serão examinados e implementados apenas na Fase 2.

---

## COMANDO CURTO PARA INICIAR A EXECUÇÃO

Depois de salvar este documento na pasta do projeto, envie no Claude Code:

> Leia integralmente `PROMPT_MASTER_CLAUDE_CODE_IA_COMPLIANCE_NFSE_FASE1_V2.md` e **construa agora a aplicação Fase 1 nele especificada**. Priorize dois portais separados: `/admin` para Grupo IA Compliance e `/portal` para autoatendimento dos clientes. Desenvolva telas reais, dados fictícios, navegação, emissão simulada, suporte entre portais e Centro de Validação exportável. Não implemente backend, banco de dados, API externa ou emissão fiscal real. Não encerre com planejamento: instale o necessário, implemente, teste o build, inicie a aplicação quando possível e informe o endereço acessível e os resultados reais dos testes.
