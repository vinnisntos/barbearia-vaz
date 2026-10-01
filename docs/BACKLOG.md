# Backlog

Status: `[ ]` a fazer · `[~]` em andamento · `[x]` aceito pelo PO (revisado + testes passando).
Dono: **Codex** (backend), **Claude** (frontend), **PO** (orquestração/revisão), **Vinnicius** (credenciais e contas).

## Sprint 0 — Fundação (PO)
- [x] S0-1 Scaffold Next.js + TS + Tailwind + Vitest
- [x] S0-2 Schema SQL (`supabase/migrations/0001_init.sql`)
- [x] S0-3 Contrato da API (`docs/API.md`) e PRD com decisões (`docs/PRD.md`)

## Sprint 1 — MVP rodando em modo fake (sem credenciais)
### Backend — Codex
- [x] B1 Portas e adaptadores fake/real: repositório, pagamentos (Asaas), calendário (Google)
- [x] B2 `GET /api/servicos`, `GET /api/disponibilidade`
- [x] B3 `POST /api/agendamentos` (lock 10 min + cobrança com split) e `GET /api/agendamentos/{id}`
- [x] B4 `POST /api/webhooks/asaas` (token, idempotência, pagamento atrasado → D8)
- [x] B5 `POST /api/cancelamentos` (PIN, 1h, 70%, rate limit)
- [x] B6 Rotas admin (agenda, balcão, faltou, cancelar-estornar, despesas, dashboard)
- [x] B7 Testes unitários das regras de negócio

### Frontend — Claude
- [x] F1 Vitrine + seleção de serviços e horário
- [x] F2 Identificação (nome, WhatsApp, CPF) + checkout Pix com contador de 10 min e polling
- [x] F3 Tela de sucesso (check verde, PIN, botão WhatsApp)
- [x] F4 Cancelar horário (telefone + PIN)
- [x] F5 Admin: login, agenda do dia, balcão, faltou/estornar, despesas, dashboard

### PO
- [x] R3 Correções da revisão: admin restrito a `ADMIN_EMAILS`; webhook aceitando campos `null` do Asaas; portas criadas sob demanda e `MODO_FAKE` por porta; polling continua em `expirado` (D8); código do backend formatado
- [x] R4 E2E pela API (39 verificações) em modo fake e contra o Supabase real; fluxo do cliente no navegador
- [ ] R5 Painel admin conferido no navegador com login real (**Vinnicius** — eu não digito senha real)
- [x] R1 Revisão de código backend e frontend contra `docs/API.md` e `docs/PRD.md`
- [x] R2 Teste ponta a ponta em modo fake

## Sprint 2 — Integrações reais (bloqueado por credenciais)
- [x] V1a Projeto Supabase criado e migration `0001_init.sql` aplicada (2026-10-01, validada com teste de conflito)
- [x] V1b `SUPABASE_SERVICE_ROLE_KEY` configurada e usuário do barbeiro criado no Auth (login validado)
- [ ] V2 **Vinnicius**: conta Asaas do barbeiro (sandbox + produção), API key, token de webhook, `walletId` da plataforma
- [x] V3 OAuth do Google configurado e refresh token gerado (`scripts/google-token.mjs`); hoje autorizado na conta do Vinnicius, trocar pela do barbeiro antes do deploy
- [x] R6 Transições de status atômicas (`transicionar`): cancelamento reserva o status antes do estorno; falta/cancelamento concorrentes não se sobrepõem nem geram estorno em dobro. 7 testes de regressão novos + regressão HTTP na stack real
- [x] R7 Tempos medidos; disponibilidade com consultas em paralelo e catálogo (serviços/horários) em cache de 1 min
- [ ] P5 Hospedar o app na mesma região do Supabase (us-east-1): cada consulta ao banco custa ~180 ms a partir do Brasil
- [x] I0 Limite de 2 reservas pendentes por telefone em `POST /api/agendamentos` (`429 MUITAS_RESERVAS`). Não há limite por IP: quem trocar de telefone a cada reserva ainda consegue travar horários por 10 min
- [ ] I3 Cartão: URL de retorno do checkout Asaas para `/agendamento/{id}`
- [ ] I4 Balcão: permitir lançar atendimento fora da grade / já ocorrido (decisão de produto)
- [x] I1 Adaptador Asaas validado no sandbox SEM split: cobrança Pix, confirmação, webhook com payload real, estorno parcial de 70%
- [ ] I6 Validar split e `splitRefunds` no sandbox (depende do `walletId` da plataforma — **Vinnicius**)
- [ ] I7 **Bloqueante:** estorno via API fica em `AWAITING_CRITICAL_ACTION_AUTHORIZATION`; desativar a autorização de ações críticas para estornos na conta Asaas (ou o estorno "automático" exige aprovação manual)
- [ ] I8 Cadastrar o webhook no Asaas (URL pública + `ASAAS_WEBHOOK_TOKEN`) — só possível após o deploy
- [x] I2 Adaptador Google Calendar validado na agenda real (free/busy, criar evento no pagamento, remover no cancelamento)
- [ ] I5 Publicar o app OAuth ("Em produção") — em modo teste o refresh token expira em 7 dias

## Sprint 3 — Deploy
- [ ] P1 Dockerfile + compose + proxy HTTPS no EC2
- [ ] P2 Keep-alive do Supabase free + job de limpeza de pendentes vencidos (cancela cobrança no Asaas)
- [ ] P3 Teste em produção com Pix de R$ 5,00 (pagar, cancelar com PIN, conferir estorno de 70%)
- [ ] P4 Política de privacidade (LGPD)
