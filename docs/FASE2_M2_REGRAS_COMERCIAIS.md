# Regras comerciais M2

Esta implementação não aprova preços ou condições comerciais, não emite documento fiscal e não executa cobranças de produção.

## Catálogo e contrato

- Planos pertencem ao escritório. Essencial (R$ 79/50 unidades), Profissional (R$ 149/200) e Empresarial (R$ 299/600) são modelos opcionais criados por clique em **rascunho**, com excedente inicialmente não definido. Nada é semeado/publicado automaticamente.
- Publicação exige gestor do escritório autenticado com MFA, justificativa e confirmação. Alterar valores gera versão imutável e volta o plano a rascunho. Arquivamento impede novas contratações e preserva contratos.
- Cada CNPJ tem uma conta de faturamento e no máximo um contrato não terminal para o serviço. Unicidade transacional e chave idempotente por empresa; a mesma chave com outro acordo é recusada.
- Snapshot guarda plano/versão, preço contratado, franquia, excedente e recursos. Mensalidade negociada exige `billing:override`, motivo e registro antes/depois. Preço zero usa cortesia/teste com revisão, não assinatura paga fictícia.
- Cortesia/inclusa na contabilidade e teste exigem concessão explícita do escritório autorizado e data de revisão; não chamam Asaas. A revisão expirada encerra a elegibilidade, sem fabricar dívida.
- A assinatura paga nasce PENDING. Provisionar cliente/assinatura não é evidência de pagamento. Ativação depende de cobrança identificada e consultada no Sandbox, vinculada ao cliente/contrato e com valor correspondente ao período, ou de concessão administrativa explicitamente distinta de pagamento.

## Ciclo e dinheiro

- BRL, Decimal/NUMERIC(18,2), HALF_UP. O frontend formata dinheiro sem usar ponto flutuante para cálculo comercial.
- Ciclo mensal pelo calendário, ancorado no início às 00:00 de America/Sao_Paulo; instantes persistidos UTC. Dia 31 termina no último dia do mês curto e volta ao dia 31 quando cabível. Não se usa duração fixa de 30 dias.
- Mudança aprovada aplica no próximo ciclo sem pró-rata. O adaptador atualiza próximas cobranças com `updatePendingPayments=false`; cobranças já geradas não são reescritas. Divergência de valor exige conciliação/revisão, sem pagamento presumido.
- MRR considera contratos pagos ativos; recebimentos Sandbox são apresentados separadamente e não representam receita bancária de produção.

## Situações e regularização

| Estado | Regra |
|---|---|
| PENDING | Contratação sem evidência suficiente no ciclo |
| ACTIVE | Recebido verificado; confirmado se contrato explicitamente permitir; ou concessão administrativa válida |
| GRACE | Cobrança vencida dentro da carência contratada (0–90 dias) |
| PAST_DUE | Vencimento ultrapassou a carência; novas capacidades comerciais futuras ficam inelegíveis |
| SUSPENDED | Pausa explícita, estorno/chargeback ou revisão comercial |
| CANCELLED | Cancelamento confirmado ou contrato local ainda não provisionado encerrado |
| EXPIRED | Concessão revisada/expirada ou encerramento verificado |

Confirmado não significa saldo recebido. Um evento antigo de atraso não regride evidência recebida; estorno/chargeback exige revisão. Overrides têm prazo, motivo, autoria e não criam lançamento de pagamento. Revisão de estorno permanece conservadoramente restrita; não há botão para inventar quitação.

Cancelamento/pausa externa usa inativação da recorrência: preserva cobranças anteriores. Não usa DELETE remoto, que pode remover pendências. Retomada é auditada e não ativa contrato pago sem evidência. Nem dívida nem cancelamento removem login, consulta histórica, faturas ou regularização. Emissão real permanece desabilitada para todos.

## Consumo

- Ledger compensável, append-only para runtime. SIMULATED e REVERSAL nunca são faturáveis. Mesma origem não incrementa consumo duas vezes; compensação cria evento inverso sem apagar o original.
- Rascunhos, rejeições e cliques não alimentam o ledger automaticamente. O endpoint sintético exige override e ferramentas de desenvolvimento explícitas. Banco e schemas rejeitam FISCAL_AUTHORIZED/billable=true no M2.
- Excedente ilustrativo = max(0, unidades simuladas − franquia) × preço unitário contratado, com valor pagável sempre **R$ 0,00**. Sem preço, a prévia fica “a definir”. Não existe geração de cobrança de excedente neste marco.
- No M3, autorização fiscal confiável precisará de contrato interno autenticado próprio. Política de consumo após cancelamento fiscal ainda exige aprovação; o histórico jamais será subtraído silenciosamente.

## Matriz de acesso

| Papel | Poderes financeiros M2 |
|---|---|
| Superadmin/Gestor do escritório | Catálogo/publicação do próprio escritório; leitura/gestão/override/retry somente nos CNPJs com delegação explícita |
| Analista fiscal | Leitura financeira somente delegada; sem publicação/gestão |
| Suporte | Sem permissão financeira |
| Admin cliente | Leitura/gestão dos próprios CNPJs; conceder/revogar poderes ao escritório; sem publicar plano ou conceder cortesia |
| Emissor/Consulta cliente | Leitura dos CNPJs vinculados e solicitação de mudança sujeita à aprovação |

## Aprovações ainda necessárias

Preços, excedentes e recursos comerciais finais; carência e critério CONFIRMED/RECEIVED; limites e expiração de concessões; termos de suspensão/cancelamento/reembolso; tratamento tributário da mensalidade de software e retenção LGPD; política de estorno de consumo M3. Não há regra legal/tributária universal embutida.
