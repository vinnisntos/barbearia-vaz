import { describe, expect, it, beforeEach } from 'vitest';
import {
  CalendarioFake,
  criarEstadoFake,
  PagamentosFake,
  RepositorioFake,
  type EstadoFake,
} from '../adaptadores/fakes';
import type { Portas } from '../portas';
import { disponibilidade, criarAgendamento } from './agenda';
import { confirmarPagamento, cancelarCliente, processarWebhook } from './pagamentos';
import { cancelarAdmin, dashboard, marcarAusente } from './admin';

const hoje = new Date('2026-10-01T12:00:00Z');
const relogio = () => new Date(hoje);
const depoisDoHorario = () => new Date('2026-10-02T14:00:00Z');
let estado: EstadoFake;
let portas: Portas;
const corte = '11111111-1111-4111-8111-111111111111';
const barba = '22222222-2222-4222-8222-222222222222';
// Catálogo próprio dos testes: as regras de cobrança e estorno precisam de serviços com preço.
const servicosDeTeste = [
  { id: corte, nome: 'Corte', precoCentavos: 4000, duracaoMinutos: 30, ativo: true },
  { id: barba, nome: 'Barba', precoCentavos: 3000, duracaoMinutos: 30, ativo: true },
  {
    id: '33333333-3333-4333-8333-333333333333',
    nome: 'Corte + Barba',
    precoCentavos: 6000,
    duracaoMinutos: 60,
    ativo: true,
  },
];
beforeEach(() => {
  estado = criarEstadoFake();
  estado.servicos = structuredClone(servicosDeTeste);
  portas = {
    repositorio: new RepositorioFake(estado),
    pagamentos: new PagamentosFake(estado),
    calendario: new CalendarioFake(estado),
  };
});
async function reservar(inicio = '2026-10-02T10:00:00-03:00', ids = [corte]) {
  return criarAgendamento(portas, relogio, {
    nome: 'Cliente',
    telefone: '11999998888',
    cpf: '12345678901',
    servicosIds: ids,
    dataInicio: inicio,
    formaPagamento: 'PIX',
  });
}
async function pagar(id: string, evento = 'evt_1') {
  const a = await portas.repositorio.buscarAgendamento(id);
  await processarWebhook(portas, relogio, {
    id: evento,
    tipo: 'PAYMENT_CONFIRMED',
    cobrancaId: a!.asaasCobrancaId!,
    netValue: 38,
  });
}
describe('agendamento sem cobrança', () => {
  const semCusto = (inicio: string, telefone = '11999998888') =>
    criarAgendamento(
      portas,
      relogio,
      { nome: 'Cliente', telefone, servicosIds: [corte], dataInicio: inicio },
      false,
    );
  it('nasce confirmado, com valor zero, sem cobrança e com evento na agenda', async () => {
    const r = await semCusto('2026-10-02T10:00:00-03:00');
    expect(r).toMatchObject({ valorTotal: 0, expiraEm: null, pagamento: null });
    const a = await portas.repositorio.buscarAgendamento(r.id);
    expect(a).toMatchObject({ status: 'pago', valorTotalCentavos: 0, asaasCobrancaId: null });
    expect(a!.googleEventId).toBeTruthy();
    await expect(semCusto('2026-10-02T10:00:00-03:00', '11988887777')).rejects.toMatchObject({
      codigo: 'SLOT_INDISPONIVEL',
    });
  });
  it('limita os horários futuros por telefone', async () => {
    for (const hora of ['10', '11', '12']) await semCusto(`2026-10-02T${hora}:00:00-03:00`);
    await expect(semCusto('2026-10-02T13:00:00-03:00')).rejects.toMatchObject({ codigo: 'MUITAS_RESERVAS' });
    await expect(semCusto('2026-10-02T13:00:00-03:00', '11988887777')).resolves.toBeTruthy();
  });
  it('cliente e admin cancelam sem estorno', async () => {
    const doCliente = await semCusto('2026-10-02T10:00:00-03:00');
    const a = await portas.repositorio.buscarAgendamento(doCliente.id);
    const cancelado = await cancelarCliente(portas, relogio, '11999998888', a!.codigoCancelamento);
    expect(cancelado.valorEstornado).toBe(0);
    const doAdmin = await semCusto('2026-10-02T11:00:00-03:00');
    expect(await cancelarAdmin(portas, relogio, doAdmin.id)).toMatchObject({
      status: 'cancelado',
      valorEstornado: 0,
    });
  });
  it('com cobrança, exige CPF e forma de pagamento', async () => {
    await expect(
      criarAgendamento(portas, relogio, {
        nome: 'Cliente',
        telefone: '11999998888',
        servicosIds: [corte],
        dataInicio: '2026-10-02T10:00:00-03:00',
      }),
    ).rejects.toMatchObject({ codigo: 'DADOS_INVALIDOS' });
  });
});
describe('agenda e pagamentos', () => {
  it('gera slots de 30 minutos e respeita fechamento, duração e bloqueio externo', async () => {
    estado.ocupados.push({ inicio: '2026-10-03T09:30:00-03:00', fim: '2026-10-03T10:00:00-03:00' });
    const r = await disponibilidade(portas, relogio, '2026-10-03', [corte, barba]);
    expect(r.horarios).toContain('2026-10-03T16:00:00-03:00');
    expect(r.horarios).not.toContain('2026-10-03T16:30:00-03:00');
    expect(r.horarios).not.toContain('2026-10-03T09:00:00-03:00');
    expect((await disponibilidade(portas, relogio, '2026-09-30', [corte])).horarios).toEqual([]);
  });
  it('rejeita conflito e libera o lock vencido', async () => {
    await reservar();
    await expect(reservar('2026-10-02T10:00:00-03:00')).rejects.toMatchObject({
      codigo: 'SLOT_INDISPONIVEL',
    });
    estado.agendamentos[0].expiraEm = '2026-10-01T08:00:00Z';
    await reservar('2026-10-02T10:00:00-03:00');
    expect(estado.agendamentos[0].status).toBe('expirado');
  });
  it('limita reservas pendentes por telefone e libera quando o lock vence', async () => {
    await reservar('2026-10-02T10:00:00-03:00');
    await reservar('2026-10-02T11:00:00-03:00');
    await expect(reservar('2026-10-02T12:00:00-03:00')).rejects.toMatchObject({
      codigo: 'MUITAS_RESERVAS',
      status: 429,
    });
    expect(estado.agendamentos).toHaveLength(2);
    for (const a of estado.agendamentos) a.expiraEm = '2026-10-01T08:00:00Z';
    await expect(reservar('2026-10-02T12:00:00-03:00')).resolves.toMatchObject({ valorTotal: 40 });
  });
  it('processa webhook de forma idempotente', async () => {
    const r = await reservar();
    await pagar(r.id);
    const pagoEm = estado.agendamentos[0].pagoEm;
    await pagar(r.id);
    expect(estado.agendamentos[0].status).toBe('pago');
    expect(estado.agendamentos[0].pagoEm).toBe(pagoEm);
    expect(estado.eventos.size).toBe(1);
  });
  it('estorna pagamento atrasado quando outro cliente tomou o horário', async () => {
    const antigo = await reservar();
    estado.agendamentos[0].expiraEm = '2026-10-01T08:00:00Z';
    await reservar();
    await pagar(antigo.id);
    expect(estado.agendamentos[0].status).toBe('expirado');
    expect(estado.agendamentos[0].valorEstornadoCentavos).toBe(4000);
  });
  it('cancela com pelo menos uma hora e estorna 70% em centavos', async () => {
    const r = await reservar();
    await pagar(r.id);
    const pin = estado.agendamentos[0].codigoCancelamento;
    const resposta = await cancelarCliente(portas, relogio, '11999998888', pin);
    expect(resposta.valorEstornado).toBe(28);
    expect(estado.agendamentos[0].status).toBe('cancelado');
  });
  it('bloqueia cancelamento com menos de uma hora', async () => {
    const r = await reservar('2026-10-01T10:00:00-03:00');
    await pagar(r.id);
    const pin = estado.agendamentos[0].codigoCancelamento;
    await expect(
      cancelarCliente(portas, () => new Date('2026-10-01T12:30:00Z'), '11999998888', pin),
    ).rejects.toMatchObject({ codigo: 'PRAZO_EXPIRADO' });
  });
  it('não revela PIN errado e limita a sexta tentativa por telefone', async () => {
    const r = await reservar();
    await pagar(r.id);
    for (let i = 0; i < 5; i++)
      await expect(cancelarCliente(portas, relogio, '11999998888', 'XXXX')).rejects.toMatchObject({
        codigo: 'NAO_ENCONTRADO',
      });
    await expect(
      cancelarCliente(portas, relogio, '11999998888', estado.agendamentos[0].codigoCancelamento),
    ).rejects.toMatchObject({ codigo: 'MUITAS_TENTATIVAS' });
    expect(estado.agendamentos[0].status).toBe('pago');
  });
  it('mantém pago se o estorno falhar', async () => {
    const r = await reservar();
    await pagar(r.id);
    estado.falharEstorno = true;
    await expect(
      cancelarCliente(portas, relogio, '11999998888', estado.agendamentos[0].codigoCancelamento),
    ).rejects.toMatchObject({ codigo: 'ESTORNO_INDISPONIVEL' });
    expect(estado.agendamentos[0].status).toBe('pago');
  });
  it('calcula dashboard em centavos com líquido, estorno e despesas', async () => {
    const r = await reservar();
    await pagar(r.id);
    await cancelarCliente(portas, relogio, '11999998888', estado.agendamentos[0].codigoCancelamento);
    await portas.repositorio.criarDespesa('Aluguel', 500, hoje.toISOString());
    expect(await dashboard(portas, '2026-10')).toEqual({
      mes: '2026-10',
      entrou: 10,
      saiu: 5,
      lucroLiquido: 5,
      totalAgendamentos: 1,
      totalAusentes: 0,
    });
  });
  it('confirma pagamento tardio se o horário continuar livre', async () => {
    const r = await reservar();
    estado.agendamentos[0].expiraEm = '2026-10-01T08:00:00Z';
    await confirmarPagamento(portas, relogio, {
      id: 'direto',
      tipo: 'PAYMENT_RECEIVED',
      cobrancaId: estado.agendamentos[0].asaasCobrancaId!,
      netValue: 38,
    });
    expect(estado.agendamentos[0].status).toBe('pago');
    expect(estado.agendamentos[0].googleEventId).toBe(`fake_event_${r.id}`);
  });
  describe('transições de status (regressão: falta em agendamento cancelado)', () => {
    const pinDe = () => estado.agendamentos[0].codigoCancelamento;
    function contarEstornos() {
      let n = 0;
      const original = portas.pagamentos.estornar.bind(portas.pagamentos);
      portas.pagamentos.estornar = async (...args) => {
        n++;
        await new Promise((r) => setTimeout(r, 5)); // janela para o pedido concorrente entrar
        return original(...args);
      };
      return () => n;
    }
    it('não marca falta depois do cancelamento pelo cliente', async () => {
      const r = await reservar();
      await pagar(r.id);
      await cancelarCliente(portas, relogio, '11999998888', pinDe());
      await expect(marcarAusente(portas, depoisDoHorario, r.id)).rejects.toMatchObject({
        codigo: 'STATUS_INVALIDO',
        status: 409,
      });
      expect(estado.agendamentos[0]).toMatchObject({ status: 'cancelado', valorEstornadoCentavos: 2800 });
    });
    it('não marca falta depois do cancelar-e-estornar do barbeiro', async () => {
      const r = await reservar();
      await pagar(r.id);
      await cancelarAdmin(portas, relogio, r.id);
      await expect(marcarAusente(portas, depoisDoHorario, r.id)).rejects.toMatchObject({
        codigo: 'STATUS_INVALIDO',
      });
      expect(estado.agendamentos[0]).toMatchObject({ status: 'cancelado', valorEstornadoCentavos: 4000 });
    });
    it('não marca falta antes do horário do agendamento', async () => {
      const r = await reservar();
      await pagar(r.id);
      await expect(marcarAusente(portas, relogio, r.id)).rejects.toMatchObject({
        codigo: 'HORARIO_FUTURO',
        status: 409,
      });
      expect(estado.agendamentos[0].status).toBe('pago');
      await expect(
        marcarAusente(portas, () => new Date(estado.agendamentos[0].dataInicio), r.id),
      ).resolves.toMatchObject({ status: 'ausente' });
    });
    it('não cancela nem estorna depois de marcada a falta', async () => {
      const r = await reservar();
      await pagar(r.id);
      const estornos = contarEstornos();
      await marcarAusente(portas, depoisDoHorario, r.id);
      await expect(cancelarAdmin(portas, relogio, r.id)).rejects.toMatchObject({ codigo: 'STATUS_INVALIDO' });
      await expect(cancelarCliente(portas, relogio, '11999998888', pinDe())).rejects.toMatchObject({
        codigo: 'NAO_ENCONTRADO',
      });
      expect(estornos()).toBe(0);
      expect(estado.agendamentos[0]).toMatchObject({ status: 'ausente', valorEstornadoCentavos: 0 });
    });
    it('falta marcada durante o estorno do cliente é recusada', async () => {
      const r = await reservar();
      await pagar(r.id);
      // O barbeiro clica em "Faltou" exatamente enquanto o estorno do cliente está em andamento.
      let falta: Promise<unknown> = Promise.resolve();
      const original = portas.pagamentos.estornar.bind(portas.pagamentos);
      portas.pagamentos.estornar = async (...args) => {
        falta = marcarAusente(portas, depoisDoHorario, r.id);
        await falta.catch(() => undefined);
        return original(...args);
      };
      await cancelarCliente(portas, relogio, '11999998888', pinDe());
      await expect(falta).rejects.toMatchObject({ codigo: 'STATUS_INVALIDO' });
      expect(estado.agendamentos[0]).toMatchObject({ status: 'cancelado', valorEstornadoCentavos: 2800 });
    });
    it('cliente e barbeiro cancelando ao mesmo tempo geram um único estorno', async () => {
      const r = await reservar();
      await pagar(r.id);
      const estornos = contarEstornos();
      const resultados = await Promise.allSettled([
        cancelarCliente(portas, relogio, '11999998888', pinDe()),
        cancelarAdmin(portas, relogio, r.id),
      ]);
      expect(resultados.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(estornos()).toBe(1);
      expect(estado.agendamentos[0].status).toBe('cancelado');
    });
    it('estorno do barbeiro falhando devolve o agendamento para pago, sem valor estornado', async () => {
      const r = await reservar();
      await pagar(r.id);
      estado.falharEstorno = true;
      await expect(cancelarAdmin(portas, relogio, r.id)).rejects.toMatchObject({
        codigo: 'ESTORNO_INDISPONIVEL',
      });
      expect(estado.agendamentos[0]).toMatchObject({
        status: 'pago',
        valorEstornadoCentavos: 0,
        canceladoEm: null,
      });
    });
    it('dois webhooks do mesmo pagamento criam um único evento na agenda', async () => {
      const r = await reservar();
      let eventos = 0;
      const original = portas.calendario.criarEvento.bind(portas.calendario);
      portas.calendario.criarEvento = async (a) => {
        eventos++;
        return original(a);
      };
      const evento = (id: string, tipo: string) => ({
        id,
        tipo,
        cobrancaId: estado.agendamentos[0].asaasCobrancaId!,
        netValue: 39,
      });
      await Promise.all([
        processarWebhook(portas, relogio, evento('e1', 'PAYMENT_CONFIRMED')),
        processarWebhook(portas, relogio, evento('e2', 'PAYMENT_RECEIVED')),
      ]);
      expect(estado.agendamentos[0].status).toBe('pago');
      expect(eventos).toBe(1);
      expect(r.id).toBe(estado.agendamentos[0].id);
    });
  });
});
