# Contrato da API (Next.js Route Handlers em `src/app/api`)

Fonte da verdade entre backend e frontend. Mudou o contrato? Atualize este arquivo no mesmo PR.

Convenções:
- JSON em camelCase. Datas em ISO 8601 com offset (`2026-10-02T09:00:00-03:00`). Dinheiro em número com 2 casas (reais).
- Fuso de negócio: `America/Sao_Paulo`.
- Erro: `{ "erro": { "codigo": "SLOT_INDISPONIVEL", "mensagem": "texto para o usuário" } }`.
- Telefone e CPF: o backend normaliza para só dígitos; o front pode mandar com máscara.

## Público

### `GET /api/servicos`
`200 { servicos: [{ id, nome, preco, duracaoMinutos }] }` — só ativos.

### `GET /api/disponibilidade?data=YYYY-MM-DD&servicos=<id>,<id>`
`200 { data, duracaoMinutos, horarios: ["2026-10-02T09:00:00-03:00", ...] }`
Inícios possíveis em passos de 30 min, dentro do horário de funcionamento, sem conflito com
agendamentos vivos (pendente não expirado / pago) nem com eventos ocupados do Google Calendar,
e nunca no passado. `400 DATA_INVALIDA | SERVICO_INVALIDO`.

### `POST /api/agendamentos`
Body: `{ nome, telefone, cpf, servicosIds: [uuid], dataInicio, formaPagamento: "PIX" | "CARTAO" }`
`servicosIds` deve ter exatamente 1 item (D11); mais de um → `400 DADOS_INVALIDOS` (na disponibilidade, `400 SERVICO_INVALIDO`). Vale também para o balcão.
`201 { id, valorTotal, dataInicio, dataFim, expiraEm, pagamento }` onde `pagamento` é
`{ forma: "PIX", qrCodeBase64, copiaECola }` ou `{ forma: "CARTAO", urlCheckout }`.
Erros: `400 DADOS_INVALIDOS`, `409 SLOT_INDISPONIVEL`, `429 MUITAS_RESERVAS` (já há 2 reservas
aguardando pagamento neste telefone), `502 PAGAMENTO_INDISPONIVEL`
(se a cobrança falhar, o agendamento é marcado `expirado` para liberar o horário).
O CPF vai apenas para o Asaas; não é persistido.

### `GET /api/agendamentos/{id}`
Usado no polling do checkout (a cada ~3s) e na tela de sucesso.
`200 { id, status, nomeCliente, servicosResumo, valorTotal, dataInicio, dataFim, expiraEm, codigoCancelamento }`
`codigoCancelamento` só vem preenchido quando `status = "pago"`; caso contrário `null`.
Um `pendente` com `expiraEm` no passado é devolvido como `expirado`. `404 NAO_ENCONTRADO`.

### `POST /api/cancelamentos`
Body: `{ telefone, pin }`
`200 { agendamentoId, valorEstornado, dataInicio }`
Erros: `404 NAO_ENCONTRADO` (telefone+PIN não batem com agendamento `pago` futuro — mesma
resposta para telefone inexistente e PIN errado), `422 PRAZO_EXPIRADO` (menos de 1h),
`429 MUITAS_TENTATIVAS` (5 tentativas por telefone por hora), `502 ESTORNO_INDISPONIVEL`.

### `POST /api/webhooks/asaas`
Header `asaas-access-token` deve bater com `ASAAS_WEBHOOK_TOKEN` (senão `401`).
Idempotente por `event.id` (tabela `webhook_eventos`). Sempre `200` para eventos conhecidos já
processados ou ignorados — erro 5xx só quando queremos retentativa.

### `POST /api/dev/pagar/{id}` (só desenvolvimento)
Existe quando a porta de pagamentos está fake (`MODO_FAKE=1` ou lista contendo `pagamentos`) ou quando
`ASAAS_BASE_URL` aponta para o sandbox (aí confirma a cobrança no sandbox do Asaas antes); em produção
`404`. Confirma o pagamento como o webhook faria. `200 { ok: true }`.

## Admin (sessão Supabase Auth; `401 NAO_AUTENTICADO` sem sessão válida)

Autenticação: `Authorization: Bearer <access_token do Supabase>`. Além de sessão válida, o e-mail
(confirmado) precisa estar em `ADMIN_EMAILS`. Com o repositório fake, o único token aceito é `fake`.

- `GET /api/admin/agendamentos?data=YYYY-MM-DD` → `200 { agendamentos: [{ id, nomeCliente, telefoneCliente, servicosResumo, valorTotal, dataInicio, dataFim, origem, status }] }` (exclui `expirado`).
- `POST /api/admin/agendamentos` (balcão) body `{ nome, telefone?, servicosIds, dataInicio }` → `201` com o agendamento, `status = "pago"`, `origem = "balcao"`, sem cobrança/split. `409 SLOT_INDISPONIVEL`.
- `POST /api/admin/agendamentos/{id}/faltou` → `200 { id, status: "ausente" }`. Só a partir de `pago` (senão `409 STATUS_INVALIDO`) e só depois de `dataInicio` (senão `409 HORARIO_FUTURO`).
- `POST /api/admin/agendamentos/{id}/cancelar-estornar` → `200 { id, status: "cancelado", valorEstornado }`. Estorno 100% no Asaas quando `origem = "app"`; balcão só cancela. Remove o evento do Calendar.
- `GET /api/admin/despesas?mes=YYYY-MM` → `200 { despesas: [{ id, descricao, valor, dataRegistro }] }`
- `POST /api/admin/despesas` body `{ descricao, valor }` → `201`
- `DELETE /api/admin/despesas/{id}` → `204`
- `GET /api/admin/dashboard?mes=YYYY-MM` → `200 { mes, entrou, saiu, lucroLiquido, totalAgendamentos, totalAusentes }`
  - `entrou` = Σ (`coalesce(valor_liquido, valor_total)` − `valor_estornado`) dos agendamentos com `pago_em` preenchido e `data_inicio` no mês.
  - `saiu` = Σ despesas do mês. `lucroLiquido` = `entrou` − `saiu`.
