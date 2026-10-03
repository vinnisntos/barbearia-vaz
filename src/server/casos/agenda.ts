import { randomInt } from 'node:crypto';
import type { Agendamento, Portas, Relogio, Servico } from '../portas';
import { erro, ErroNegocio } from '../erros';
import { diaLocal, isoLocal, localParaDate, partes, reais, sobrepoe } from '../tempo';
import { espelharCalendario } from './pagamentos';

const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LIMITE_PENDENTES_POR_TELEFONE = 2;
export const LIMITE_CONFIRMADOS_POR_TELEFONE = 3;
export function gerarPin() {
  return Array.from({ length: 4 }, () => alfabeto[randomInt(alfabeto.length)]).join('');
}
export async function obterServicos(portas: Portas) {
  return (await portas.repositorio.listarServicos())
    .filter((s) => s.ativo)
    .map((s) => ({
      id: s.id,
      nome: s.nome,
      preco: reais(s.precoCentavos),
      duracaoMinutos: s.duracaoMinutos,
    }));
}
export async function selecionarServicos(
  portas: Portas,
  ids: string[],
): Promise<{ servicos: Servico[]; duracaoMinutos: number; valorCentavos: number }> {
  if (!ids.length || new Set(ids).size !== ids.length)
    erro('SERVICO_INVALIDO', 400, 'Selecione serviços válidos.');
  const todos = await portas.repositorio.listarServicos();
  const selecionados = ids.map((id) => todos.find((s) => s.id === id && s.ativo));
  if (selecionados.some((s) => !s)) erro('SERVICO_INVALIDO', 400, 'Serviço inexistente ou inativo.');
  const servicos = selecionados as Servico[];
  return {
    servicos,
    duracaoMinutos: servicos.reduce((n, s) => n + s.duracaoMinutos, 0),
    valorCentavos: servicos.reduce((n, s) => n + s.precoCentavos, 0),
  };
}
export async function disponibilidade(portas: Portas, agora: Relogio, data: string, ids: string[]) {
  const dia = localParaDate(data, '12:00');
  const diaSemana = dia.getUTCDay();
  const inicioDia = localParaDate(data, '00:00');
  const fimDia = localParaDate(data, '23:59');
  // As quatro consultas são independentes: em paralelo, a rota custa uma ida ao banco em vez de quatro.
  const [{ duracaoMinutos }, todosHorarios, agendamentos, ocupados] = await Promise.all([
    selecionarServicos(portas, ids),
    portas.repositorio.listarHorarios(),
    portas.repositorio.listarAgendamentos(
      inicioDia.toISOString(),
      new Date(fimDia.getTime() + 60000).toISOString(),
    ),
    portas.calendario.intervalosOcupados(
      inicioDia.toISOString(),
      new Date(fimDia.getTime() + 60000).toISOString(),
    ),
  ]);
  const horario = todosHorarios.find((h) => h.diaSemana === diaSemana);
  if (!horario) return { data, duracaoMinutos, horarios: [] as string[] };
  const abertura = localParaDate(data, horario.abre);
  const fechamento = localParaDate(data, horario.fecha);
  const horarios: string[] = [];
  for (let t = abertura.getTime(); t + duracaoMinutos * 60000 <= fechamento.getTime(); t += 30 * 60000) {
    const fim = new Date(t + duracaoMinutos * 60000).toISOString();
    const inicio = new Date(t).toISOString();
    if (t <= agora().getTime()) continue;
    if (
      agendamentos.some(
        (a) =>
          (a.status === 'pago' ||
            (a.status === 'pendente' && (!a.expiraEm || Date.parse(a.expiraEm) >= agora().getTime()))) &&
          sobrepoe(a.dataInicio, a.dataFim, inicio, fim),
      )
    )
      continue;
    if (ocupados.some((o) => sobrepoe(o.inicio, o.fim, inicio, fim))) continue;
    horarios.push(isoLocal(new Date(t)));
  }
  return { data, duracaoMinutos, horarios };
}
export interface DadosReserva {
  nome: string;
  telefone: string;
  servicosIds: string[];
  dataInicio: string;
}
export async function validarReserva(portas: Portas, agora: Relogio, dados: DadosReserva) {
  const inicio = new Date(dados.dataInicio);
  if (!Number.isFinite(inicio.getTime()) || inicio.getTime() <= agora().getTime())
    erro('SLOT_INDISPONIVEL', 409, 'Horário indisponível.');
  const data = diaLocal(inicio);
  const p = partes(inicio);
  const { servicos, duracaoMinutos, valorCentavos } = await selecionarServicos(portas, dados.servicosIds);
  const disponivel = await disponibilidade(portas, agora, data, dados.servicosIds);
  const horario = `${String(p.hora).padStart(2, '0')}:${String(p.minuto).padStart(2, '0')}`;
  if (
    localParaDate(data, horario).getTime() !== inicio.getTime() ||
    !disponivel.horarios.some((h) => Date.parse(h) === inicio.getTime())
  )
    erro('SLOT_INDISPONIVEL', 409, 'Horário indisponível.');
  return {
    servicos,
    duracaoMinutos,
    valorCentavos,
    inicio,
    fim: new Date(inicio.getTime() + duracaoMinutos * 60000),
  };
}
/** Agendamento sem custo: nasce confirmado ("pago", valor zero), sem cobrança no Asaas. */
async function agendarSemCobranca(
  portas: Portas,
  agora: Relogio,
  dados: DadosReserva,
  r: Awaited<ReturnType<typeof validarReserva>>,
) {
  const momento = agora().toISOString();
  // Sem pagamento não há lock que expire: é o limite de horários futuros por telefone que impede
  // um único visitante de ocupar a agenda inteira.
  const futuros = await portas.repositorio.buscarPagoPorTelefone(dados.telefone, momento);
  if (futuros.length >= LIMITE_CONFIRMADOS_POR_TELEFONE)
    erro(
      'MUITAS_RESERVAS',
      429,
      'Você já tem horários marcados neste número. Cancele um deles antes de marcar outro.',
    );
  const a = await portas.repositorio.criarAgendamento(
    {
      nomeCliente: dados.nome,
      telefoneCliente: dados.telefone,
      servicosIds: dados.servicosIds,
      servicosResumo: r.servicos.map((s) => s.nome).join(' + '),
      valorTotalCentavos: 0,
      dataInicio: r.inicio.toISOString(),
      dataFim: r.fim.toISOString(),
      origem: 'app',
      status: 'pago',
      codigoCancelamento: gerarPin(),
      expiraEm: null,
      pagoEm: momento,
      valorLiquidoCentavos: 0,
    },
    momento,
  );
  await espelharCalendario(portas, a);
  return {
    id: a.id,
    valorTotal: 0,
    dataInicio: isoLocal(new Date(a.dataInicio)),
    dataFim: isoLocal(new Date(a.dataFim)),
    expiraEm: null,
    pagamento: null,
  };
}
export async function criarAgendamento(
  portas: Portas,
  agora: Relogio,
  dados: DadosReserva & { cpf?: string; formaPagamento?: 'PIX' | 'CARTAO' },
  cobrar = true,
) {
  const r = await validarReserva(portas, agora, dados);
  if (!cobrar) return agendarSemCobranca(portas, agora, dados, r);
  const { cpf, formaPagamento } = dados;
  if (!cpf || !formaPagamento)
    throw new ErroNegocio('DADOS_INVALIDOS', 400, 'Informe o CPF e a forma de pagamento.');
  // Sem isso, um único visitante travaria a agenda inteira criando reservas que nunca paga.
  const pendentes = await portas.repositorio.contarPendentes(dados.telefone, agora().toISOString());
  if (pendentes >= LIMITE_PENDENTES_POR_TELEFONE)
    erro(
      'MUITAS_RESERVAS',
      429,
      'Você já tem reservas aguardando pagamento. Conclua o pagamento ou aguarde 10 minutos.',
    );
  const a = await portas.repositorio.criarAgendamento(
    {
      nomeCliente: dados.nome,
      telefoneCliente: dados.telefone,
      servicosIds: dados.servicosIds,
      servicosResumo: r.servicos.map((s) => s.nome).join(' + '),
      valorTotalCentavos: r.valorCentavos,
      dataInicio: r.inicio.toISOString(),
      dataFim: r.fim.toISOString(),
      origem: 'app',
      status: 'pendente',
      codigoCancelamento: gerarPin(),
      expiraEm: new Date(agora().getTime() + 600000).toISOString(),
      pagoEm: null,
      valorLiquidoCentavos: null,
    },
    agora().toISOString(),
  );
  try {
    const cobranca = await portas.pagamentos.criarCobranca({
      agendamentoId: a.id,
      nome: dados.nome,
      telefone: dados.telefone,
      cpf,
      valorCentavos: r.valorCentavos,
      forma: formaPagamento,
    });
    await portas.repositorio.atualizarAgendamento(a.id, { asaasCobrancaId: cobranca.id });
    return {
      id: a.id,
      valorTotal: reais(a.valorTotalCentavos),
      dataInicio: isoLocal(new Date(a.dataInicio)),
      dataFim: isoLocal(new Date(a.dataFim)),
      expiraEm: isoLocal(new Date(a.expiraEm!)),
      pagamento:
        cobranca.forma === 'PIX'
          ? { forma: 'PIX', qrCodeBase64: cobranca.qrCodeBase64, copiaECola: cobranca.copiaECola }
          : { forma: 'CARTAO', urlCheckout: cobranca.urlCheckout },
    };
  } catch (e) {
    await portas.repositorio.atualizarAgendamento(a.id, { status: 'expirado' });
    console.error('Falha ao criar cobrança:', e instanceof Error ? e.message : e);
    throw new ErroNegocio('PAGAMENTO_INDISPONIVEL', 502, 'Pagamento indisponível no momento.');
  }
}
export async function consultarAgendamento(portas: Portas, agora: Relogio, id: string) {
  const a = await portas.repositorio.buscarAgendamento(id);
  if (!a) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
  const status =
    a.status === 'pendente' && a.expiraEm && Date.parse(a.expiraEm) < agora().getTime()
      ? 'expirado'
      : a.status;
  return {
    id: a.id,
    status,
    nomeCliente: a.nomeCliente,
    servicosResumo: a.servicosResumo,
    valorTotal: reais(a.valorTotalCentavos),
    dataInicio: isoLocal(new Date(a.dataInicio)),
    dataFim: isoLocal(new Date(a.dataFim)),
    expiraEm: a.expiraEm ? isoLocal(new Date(a.expiraEm)) : null,
    codigoCancelamento: status === 'pago' ? a.codigoCancelamento : null,
  };
}
export function respostaAdmin(a: Agendamento) {
  return {
    id: a.id,
    nomeCliente: a.nomeCliente,
    telefoneCliente: a.telefoneCliente,
    servicosResumo: a.servicosResumo,
    valorTotal: reais(a.valorTotalCentavos),
    dataInicio: isoLocal(new Date(a.dataInicio)),
    dataFim: isoLocal(new Date(a.dataFim)),
    origem: a.origem,
    status: a.status,
  };
}
