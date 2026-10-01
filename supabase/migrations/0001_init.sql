-- Barbearia Vaz — schema inicial
-- Todo acesso passa pelo backend (service role). RLS fica ligado e sem policies
-- para anon/authenticated, exceto leitura da vitrine de serviços.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type status_agendamento as enum ('pendente', 'pago', 'cancelado', 'ausente', 'expirado');
create type origem_agendamento as enum ('app', 'balcao');

create table servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  duracao_minutos int not null check (duracao_minutos > 0),
  ativo boolean not null default true
);

-- dia_semana: 0 = domingo ... 6 = sábado. Horário local (America/Sao_Paulo).
create table horarios_funcionamento (
  dia_semana smallint primary key check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  check (fecha > abre)
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  nome_cliente text not null,
  telefone_cliente text not null,            -- só dígitos, com DDD (ex: 11999998888)
  servicos_ids uuid[] not null,
  servicos_resumo text not null,             -- snapshot dos nomes no momento da reserva
  valor_total numeric(10,2) not null check (valor_total >= 0),
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  origem origem_agendamento not null default 'app',
  status status_agendamento not null default 'pendente',
  codigo_cancelamento text not null,         -- PIN de 4 caracteres (ex: A7K9)
  asaas_cobranca_id text unique,             -- null para balcão
  google_event_id text,
  expira_em timestamptz,                     -- lock do checkout; null para balcão
  pago_em timestamptz,
  valor_liquido numeric(10,2),               -- líquido do barbeiro (após tarifa Asaas e split)
  valor_estornado numeric(10,2) not null default 0,
  cancelado_em timestamptz,
  criado_em timestamptz not null default now(),
  check (data_fim > data_inicio),
  -- Impede double booking mesmo sob concorrência: só um agendamento "vivo" por intervalo.
  constraint agendamentos_sem_conflito exclude using gist (
    tstzrange(data_inicio, data_fim, '[)') with &&
  ) where (status in ('pendente', 'pago'))
);

create index agendamentos_data_inicio_idx on agendamentos (data_inicio);
create index agendamentos_telefone_idx on agendamentos (telefone_cliente);

create table despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10,2) not null check (valor > 0),
  data_registro timestamptz not null default now()
);

-- Idempotência do webhook do Asaas (entrega "at least once").
create table webhook_eventos (
  id text primary key,                       -- id do evento enviado pelo Asaas
  tipo text not null,
  recebido_em timestamptz not null default now()
);

-- Rate limit do cancelamento por PIN (anti brute force).
create table tentativas_cancelamento (
  id bigint generated always as identity primary key,
  telefone text not null,
  criado_em timestamptz not null default now()
);
create index tentativas_cancelamento_idx on tentativas_cancelamento (telefone, criado_em);

-- Expira locks vencidos e insere o agendamento na mesma transação.
-- Conflito de horário levanta exclusion_violation (SQLSTATE 23P01) -> backend responde 409.
create or replace function criar_agendamento(
  p_nome text,
  p_telefone text,
  p_servicos_ids uuid[],
  p_servicos_resumo text,
  p_valor_total numeric,
  p_data_inicio timestamptz,
  p_data_fim timestamptz,
  p_origem origem_agendamento,
  p_status status_agendamento,
  p_codigo text,
  p_expira_em timestamptz
) returns agendamentos
language plpgsql
as $$
declare
  novo agendamentos;
begin
  update agendamentos
     set status = 'expirado'
   where status = 'pendente'
     and expira_em is not null
     and expira_em < now();

  insert into agendamentos (
    nome_cliente, telefone_cliente, servicos_ids, servicos_resumo, valor_total,
    data_inicio, data_fim, origem, status, codigo_cancelamento, expira_em, pago_em
  ) values (
    p_nome, p_telefone, p_servicos_ids, p_servicos_resumo, p_valor_total,
    p_data_inicio, p_data_fim, p_origem, p_status, p_codigo, p_expira_em,
    case when p_status = 'pago' then now() end
  )
  returning * into novo;

  return novo;
end;
$$;

alter table servicos enable row level security;
alter table horarios_funcionamento enable row level security;
alter table agendamentos enable row level security;
alter table despesas enable row level security;
alter table webhook_eventos enable row level security;
alter table tentativas_cancelamento enable row level security;

create policy servicos_leitura_publica on servicos
  for select to anon, authenticated using (ativo);

revoke execute on function criar_agendamento from public, anon, authenticated;

insert into horarios_funcionamento (dia_semana, abre, fecha) values
  (1, '09:00', '19:00'),
  (2, '09:00', '19:00'),
  (3, '09:00', '19:00'),
  (4, '09:00', '19:00'),
  (5, '09:00', '19:00'),
  (6, '09:00', '17:00');

insert into servicos (nome, preco, duracao_minutos) values
  ('Corte', 40.00, 30),
  ('Barba', 30.00, 30),
  ('Corte + Barba', 60.00, 60);
