import type { Portas, Relogio } from '../portas';
import { erro, ErroNegocio } from '../erros';
import { diaLocal, isoLocal, localParaDate, periodoMes, reais } from '../tempo';
import { gerarPin, respostaAdmin, validarReserva, type DadosReserva } from './agenda';
import { desfazerCancelamento } from './pagamentos';

export async function agendaDia(portas: Portas, data: string) {
  const inicio = localParaDate(data, '00:00');
  const fim = new Date(localParaDate(data, '23:59').getTime() + 60000);
  const itens = await portas.repositorio.listarAgendamentos(inicio.toISOString(), fim.toISOString());
  return {
    agendamentos: itens
      .filter((a) => a.status !== 'expirado' && diaLocal(new Date(a.dataInicio)) === data)
      .map(respostaAdmin),
  };
}
export async function criarBalcao(portas: Portas, agora: Relogio, dados: DadosReserva) {
  const r = await validarReserva(portas, agora, dados);
  const a = await portas.repositorio.criarAgendamento(
    {
      nomeCliente: dados.nome,
      telefoneCliente: dados.telefone,
      servicosIds: dados.servicosIds,
      servicosResumo: r.servicos.map((s) => s.nome).join(' + '),
      valorTotalCentavos: r.valorCentavos,
      dataInicio: r.inicio.toISOString(),
      dataFim: r.fim.toISOString(),
      origem: 'balcao',
      status: 'pago',
      codigoCancelamento: gerarPin(),
      expiraEm: null,
      pagoEm: agora().toISOString(),
      valorLiquidoCentavos: r.valorCentavos,
    },
    agora().toISOString(),
  );
  try {
    const googleEventId = await portas.calendario.criarEvento(a);
    await portas.repositorio.atualizarAgendamento(a.id, { googleEventId });
  } catch (e) {
    console.error('Falha ao espelhar balcão no Google Calendar:', e);
  }
  return respostaAdmin(a);
}
export async function marcarAusente(portas: Portas, agora: Relogio, id: string) {
  const a = await portas.repositorio.buscarAgendamento(id);
  if (!a) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
  // Ninguém "faltou" a um horário que ainda não começou.
  if (a.status === 'pago' && Date.parse(a.dataInicio) > agora().getTime())
    erro('HORARIO_FUTURO', 409, 'A falta só pode ser marcada depois do horário do agendamento.');
  const marcado =
    a.status === 'pago' ? await portas.repositorio.transicionar(id, ['pago'], { status: 'ausente' }) : null;
  if (!marcado) erro('STATUS_INVALIDO', 409, 'O agendamento não está pago.');
  return { id, status: 'ausente' as const };
}
export async function cancelarAdmin(portas: Portas, agora: Relogio, id: string) {
  const a = await portas.repositorio.buscarAgendamento(id);
  if (!a) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
  if (a.status !== 'pago') erro('STATUS_INVALIDO', 409, 'O agendamento não está pago.');
  const valor = a.origem === 'app' ? a.valorTotalCentavos : 0;
  if (a.origem === 'app' && !a.asaasCobrancaId)
    erro('ESTORNO_INDISPONIVEL', 502, 'Estorno indisponível no momento.');
  // Mesma reserva atômica do cancelamento do cliente (ver cancelarCliente).
  const reservado = await portas.repositorio.transicionar(id, ['pago'], {
    status: 'cancelado',
    valorEstornadoCentavos: valor,
    canceladoEm: agora().toISOString(),
  });
  if (!reservado) erro('STATUS_INVALIDO', 409, 'O agendamento não está pago.');
  if (a.origem === 'app') {
    try {
      await portas.pagamentos.estornar(
        a.asaasCobrancaId!,
        valor,
        a.valorTotalCentavos,
        a.valorLiquidoCentavos ?? undefined,
      );
    } catch (e) {
      console.error('Falha no estorno do cancelamento (admin):', e instanceof Error ? e.message : e);
      await desfazerCancelamento(portas, id);
      erro('ESTORNO_INDISPONIVEL', 502, 'Estorno indisponível no momento.');
    }
  }
  if (a.googleEventId) {
    try {
      await portas.calendario.removerEvento(a.googleEventId);
    } catch (e) {
      console.error('Falha ao remover evento do Google Calendar:', e);
    }
  }
  return { id, status: 'cancelado' as const, valorEstornado: reais(valor) };
}
export async function despesasMes(portas: Portas, mes: string) {
  const [inicio, fim] = periodoMes(mes);
  const itens = await portas.repositorio.listarDespesas(inicio, fim);
  return {
    despesas: itens.map((d) => ({
      id: d.id,
      descricao: d.descricao,
      valor: reais(d.valorCentavos),
      dataRegistro: isoLocal(new Date(d.dataRegistro)),
    })),
  };
}
export async function criarDespesa(portas: Portas, agora: Relogio, descricao: string, valorCentavos: number) {
  const d = await portas.repositorio.criarDespesa(descricao, valorCentavos, agora().toISOString());
  return {
    id: d.id,
    descricao: d.descricao,
    valor: reais(d.valorCentavos),
    dataRegistro: isoLocal(new Date(d.dataRegistro)),
  };
}
export async function dashboard(portas: Portas, mes: string) {
  const [inicio, fim] = periodoMes(mes);
  const [agendamentos, despesas] = await Promise.all([
    portas.repositorio.listarAgendamentos(inicio, fim),
    portas.repositorio.listarDespesas(inicio, fim),
  ]);
  const doMes = agendamentos.filter((a) => a.dataInicio >= inicio && a.dataInicio < fim);
  const entrouCentavos = doMes.reduce(
    (s, a) =>
      s + (a.pagoEm ? (a.valorLiquidoCentavos ?? a.valorTotalCentavos) - a.valorEstornadoCentavos : 0),
    0,
  );
  const saiuCentavos = despesas.reduce((s, d) => s + d.valorCentavos, 0);
  return {
    mes,
    entrou: reais(entrouCentavos),
    saiu: reais(saiuCentavos),
    lucroLiquido: reais(entrouCentavos - saiuCentavos),
    totalAgendamentos: doMes.filter((a) => a.pagoEm).length,
    totalAusentes: doMes.filter((a) => a.status === 'ausente').length,
  };
}
