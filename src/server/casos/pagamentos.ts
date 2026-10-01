import { createHash, timingSafeEqual } from 'node:crypto';
import type { Agendamento, Portas, Relogio } from '../portas';
import { erro, ErroNegocio } from '../erros';
import { isoLocal, reais } from '../tempo';

export interface EventoPagamento {
  id: string;
  tipo: string;
  cobrancaId: string;
  referencia?: string;
  netValue?: number;
  splitCentavos?: number;
}
async function espelharCalendario(portas: Portas, a: Agendamento) {
  try {
    const googleEventId = await portas.calendario.criarEvento(a);
    await portas.repositorio.atualizarAgendamento(a.id, { googleEventId });
  } catch (e) {
    console.error('Falha ao espelhar agendamento no Google Calendar:', e);
  }
}
export async function confirmarPagamento(portas: Portas, agora: Relogio, evento: EventoPagamento) {
  if (evento.tipo !== 'PAYMENT_RECEIVED' && evento.tipo !== 'PAYMENT_CONFIRMED') return;
  const a =
    (await portas.repositorio.buscarPorCobranca(evento.cobrancaId)) ??
    (evento.referencia ? await portas.repositorio.buscarAgendamento(evento.referencia) : null);
  if (!a || a.status === 'pago' || a.status === 'cancelado' || a.status === 'ausente') return;
  const pagoEm = agora().toISOString();
  const valorLiquidoCentavos = portas.pagamentos.calcularLiquido(
    evento.netValue ?? reais(a.valorTotalCentavos),
    a.valorTotalCentavos,
    evento.splitCentavos,
  );
  const dados = { status: 'pago' as const, pagoEm, valorLiquidoCentavos };
  const vencido =
    a.status === 'expirado' ||
    (a.status === 'pendente' && a.expiraEm && Date.parse(a.expiraEm) < agora().getTime());
  let confirmado: Agendamento;
  if (vencido) {
    try {
      confirmado = await portas.repositorio.reativarAgendamento(a.id, dados, pagoEm);
    } catch (e) {
      if (!(e instanceof ErroNegocio && e.codigo === 'SLOT_INDISPONIVEL')) throw e;
      await portas.pagamentos.estornar(
        evento.cobrancaId,
        a.valorTotalCentavos,
        a.valorTotalCentavos,
        valorLiquidoCentavos,
      );
      await portas.repositorio.atualizarAgendamento(a.id, {
        status: 'expirado',
        valorEstornadoCentavos: a.valorTotalCentavos,
      });
      return;
    }
  } else {
    const transicao = await portas.repositorio.transicionar(a.id, ['pendente'], dados);
    if (!transicao) return; // outro evento confirmou (ou o status mudou) nesse meio-tempo
    confirmado = transicao;
  }
  await espelharCalendario(portas, confirmado);
}
export async function processarWebhook(portas: Portas, agora: Relogio, evento: EventoPagamento) {
  const novo = await portas.repositorio.registrarEvento(evento.id, evento.tipo);
  if (!novo) return;
  try {
    await confirmarPagamento(portas, agora, evento);
  } catch (e) {
    await portas.repositorio.removerEvento(evento.id);
    throw e;
  }
}
function mesmoPin(a: string, b: string) {
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}
/** O estorno falhou: o agendamento volta a "pago" para o cliente não ficar sem horário e sem dinheiro. */
export async function desfazerCancelamento(portas: Portas, id: string) {
  try {
    await portas.repositorio.transicionar(id, ['cancelado'], {
      status: 'pago',
      valorEstornadoCentavos: 0,
      canceladoEm: null,
    });
  } catch (e) {
    console.error(`ATENÇÃO: agendamento ${id} ficou cancelado sem estorno e não pôde ser restaurado:`, e);
  }
}
export async function cancelarCliente(portas: Portas, agora: Relogio, telefone: string, pin: string) {
  const momento = agora().toISOString();
  const tentativas = await portas.repositorio.registrarTentativa(telefone, momento);
  if (tentativas > 5) erro('MUITAS_TENTATIVAS', 429, 'Muitas tentativas. Tente novamente em uma hora.');
  const candidatos = await portas.repositorio.buscarPagoPorTelefone(telefone, momento);
  const a = candidatos.find((item) => mesmoPin(item.codigoCancelamento, pin));
  if (!a) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
  if (Date.parse(a.dataInicio) - agora().getTime() < 3600000)
    erro('PRAZO_EXPIRADO', 422, 'O prazo para cancelamento terminou.');
  const valor = Math.round(a.valorTotalCentavos * 0.7);
  // Reserva o cancelamento antes de mexer em dinheiro: só um pedido passa de "pago" para "cancelado",
  // então não há estorno em dobro nem falta marcada em cima de um cancelamento em andamento.
  const reservado = await portas.repositorio.transicionar(a.id, ['pago'], {
    status: 'cancelado',
    valorEstornadoCentavos: valor,
    canceladoEm: momento,
  });
  if (!reservado) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
  if (a.asaasCobrancaId) {
    try {
      await portas.pagamentos.estornar(
        a.asaasCobrancaId,
        valor,
        a.valorTotalCentavos,
        a.valorLiquidoCentavos ?? undefined,
      );
    } catch (e) {
      console.error('Falha no estorno do cancelamento:', e instanceof Error ? e.message : e);
      await desfazerCancelamento(portas, a.id);
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
  return { agendamentoId: a.id, valorEstornado: reais(valor), dataInicio: isoLocal(new Date(a.dataInicio)) };
}
