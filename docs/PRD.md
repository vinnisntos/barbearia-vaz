# MV Barbearia — PRD

Agendamento self-service com pagamento antecipado (Pix/cartão via Asaas) e painel financeiro
simples para o barbeiro. Cliente final não cria conta.

Monetização: setup parcelado + split por transação (taxa fixa ou percentual para a carteira da
plataforma, descontada antes do repasse ao barbeiro).

## Decisões de produto (desvios da spec original)

| # | Decisão | Motivo |
|---|---------|--------|
| D1 | Checkout pede **Nome, WhatsApp e CPF**. CPF vai só para o Asaas, não é gravado no nosso banco. | A API do Asaas exige `cpfCnpj` para criar o cliente da cobrança. "Só nome e WhatsApp" é inviável com Asaas. |
| D2 | Teste de produção da Fase 5 com Pix de **R$ 5,00**, não R$ 1,00. | Valor mínimo de cobrança Pix no Asaas é R$ 5,00. |
| D3 | Stack: **um único app Next.js (TypeScript)** — telas + Route Handlers como backend — em um container Docker no EC2. | Uma linguagem, um deploy, um container; suficiente para uma barbearia. |
| D4 | **Banco é a fonte da verdade da agenda.** Google Calendar entra como (a) bloqueios pessoais do barbeiro via free/busy e (b) espelho dos agendamentos pagos. | Lock de 10 min e anti double booking precisam de transação; Calendar não dá isso. |
| D5 | Anti double booking por **exclusion constraint** no Postgres (não por checagem na aplicação). | Dois clientes no mesmo horário ao mesmo tempo. |
| D6 | PIN de 4 caracteres alfanuméricos (sem `0/O/1/I`) + **rate limit de 5 tentativas por telefone por hora**. | 4 caracteres sozinhos são força-brutáveis e o cancelamento movimenta dinheiro. |
| D7 | Cartão via **checkout hospedado do Asaas** (`invoiceUrl`); nunca capturamos dados de cartão. | Fora de escopo PCI. |
| D8 | **Pagamento atrasado** (Pix pago após os 10 min): se o horário ainda estiver livre, confirma; se não, estorno integral automático. | Cobrança Pix do Asaas vence por dia, não por minuto; o lock de 10 min é nosso. |
| D9 | Colunas extras em `agendamentos`: `origem`, `google_event_id`, `expira_em`, `pago_em`, `valor_liquido`, `valor_estornado`, `servicos_resumo`, `cancelado_em`. Tabelas extras: `horarios_funcionamento`, `webhook_eventos`, `tentativas_cancelamento`. | Necessárias para balcão, exclusão do evento, lock, dashboard e idempotência. |
| D10 | Dashboard "Entrou" usa valor **líquido** (após tarifa Asaas e split) menos estornos. | "Lucro no bolso" com valor bruto enganaria o barbeiro. |
| D11 | **Um serviço por agendamento.** Combos como "Corte + Barba" são serviços próprios, com preço e duração próprios; a tela e a API não aceitam somar serviços avulsos. | Somar "Corte" + "Barba" avulsos dava R$ 70 por algo que o combo vende a R$ 60, e permitia combinações sem sentido (combo + avulso). |

## Regras de negócio

- **Lock**: criar agendamento `pendente` com `expira_em = agora + 10 min`. Pendente vencido não bloqueia horário.
- **Confirmação**: webhook `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` → `pago`, grava `pago_em` e `valor_liquido`, cria evento no Calendar.
- **Cancelamento pelo cliente** (telefone + PIN): ≥ 1h antes → estorno de 70% do valor, remove evento, `cancelado`. < 1h → bloqueado, valor retido.
- **Estorno parcial e split**: os 30% retidos preservam primeiro a taxa da plataforma; o estorno sai da parte do barbeiro, e só atinge o split se a parte do barbeiro não cobrir (`splitRefunds`).
- **Balcão**: barbeiro cria agendamento já `pago`, `origem = balcao`, sem cobrança Asaas e sem split.
- **Faltou**: `pago` → `ausente`, valor retido. Só pode ser marcada depois que o horário do agendamento começou.
- **Cancelar e estornar** (barbeiro): estorno 100%, libera agenda.
- **Split**: conta Asaas é do barbeiro; `ASAAS_SPLIT_WALLET_ID` é a carteira da plataforma; `ASAAS_SPLIT_FIXO` ou `ASAAS_SPLIT_PERCENTUAL`.

## Fora do MVP

Múltiplos barbeiros, lembretes por WhatsApp, reagendamento, cupons, relatórios além do mês.

## Riscos abertos

- Supabase free pausa o projeto após ~7 dias sem atividade — precisa de keep-alive (cron no EC2).
- Estorno Pix exige saldo na conta Asaas do barbeiro; se ele sacou tudo, o estorno falha (`502 ESTORNO_INDISPONIVEL`).
- LGPD: guardamos nome e telefone; falta política de privacidade e retenção.
