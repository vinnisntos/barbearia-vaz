import { randomUUID } from 'node:crypto';
import type {
  Agendamento,
  Calendario,
  Cobranca,
  Despesa,
  HorarioFuncionamento,
  NovoAgendamento,
  Pagamentos,
  Repositorio,
  Servico,
} from '../portas';
import { ErroNegocio } from '../erros';
import { sobrepoe } from '../tempo';

const servicosIniciais: Servico[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    nome: 'Corte',
    precoCentavos: 4000,
    duracaoMinutos: 30,
    ativo: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    nome: 'Barba',
    precoCentavos: 3000,
    duracaoMinutos: 30,
    ativo: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    nome: 'Corte + Barba',
    precoCentavos: 6000,
    duracaoMinutos: 60,
    ativo: true,
  },
];
const horariosIniciais: HorarioFuncionamento[] = [1, 2, 3, 4, 5]
  .map((diaSemana) => ({ diaSemana, abre: '09:00', fecha: '19:00' }))
  .concat([{ diaSemana: 6, abre: '09:00', fecha: '17:00' }]);
export interface EstadoFake {
  servicos: Servico[];
  horarios: HorarioFuncionamento[];
  agendamentos: Agendamento[];
  despesas: Despesa[];
  eventos: Set<string>;
  tentativas: { telefone: string; criadoEm: string }[];
  ocupados: { inicio: string; fim: string }[];
  falharEstorno?: boolean;
  falharCobranca?: boolean;
  falharCalendario?: boolean;
}
export function criarEstadoFake(): EstadoFake {
  return {
    servicos: structuredClone(servicosIniciais),
    horarios: structuredClone(horariosIniciais),
    agendamentos: [],
    despesas: [],
    eventos: new Set(),
    tentativas: [],
    ocupados: [],
  };
}
const memoria = globalThis as typeof globalThis & { __barbeariaFake?: EstadoFake };
export const estadoFake = (): EstadoFake => (memoria.__barbeariaFake ??= criarEstadoFake());
export class RepositorioFake implements Repositorio {
  constructor(public estado: EstadoFake) {}
  async listarServicos() {
    return this.estado.servicos.map((s) => ({ ...s }));
  }
  async listarHorarios() {
    return this.estado.horarios.map((h) => ({ ...h }));
  }
  async listarAgendamentos(inicio: string, fim: string) {
    return this.estado.agendamentos
      .filter((a) => sobrepoe(a.dataInicio, a.dataFim, inicio, fim))
      .map((a) => ({ ...a }));
  }
  async buscarAgendamento(id: string) {
    const a = this.estado.agendamentos.find((item) => item.id === id);
    return a ? { ...a } : null;
  }
  async buscarPorCobranca(id: string) {
    const a = this.estado.agendamentos.find((a) => a.asaasCobrancaId === id);
    return a ? { ...a } : null;
  }
  async buscarPagoPorTelefone(telefone: string, agora: string) {
    return this.estado.agendamentos
      .filter(
        (a) =>
          a.telefoneCliente === telefone &&
          a.status === 'pago' &&
          Date.parse(a.dataInicio) > Date.parse(agora),
      )
      .map((a) => ({ ...a }));
  }
  async contarPendentes(telefone: string, agora: string) {
    return this.estado.agendamentos.filter(
      (a) =>
        a.telefoneCliente === telefone &&
        a.status === 'pendente' &&
        a.expiraEm !== null &&
        Date.parse(a.expiraEm) > Date.parse(agora),
    ).length;
  }
  async criarAgendamento(dados: NovoAgendamento, agora: string) {
    for (const a of this.estado.agendamentos)
      if (a.status === 'pendente' && a.expiraEm && Date.parse(a.expiraEm) < Date.parse(agora))
        a.status = 'expirado';
    if (
      this.estado.agendamentos.some(
        (a) =>
          (a.status === 'pendente' || a.status === 'pago') &&
          sobrepoe(a.dataInicio, a.dataFim, dados.dataInicio, dados.dataFim),
      )
    )
      throw new ErroNegocio('SLOT_INDISPONIVEL', 409, 'Horário indisponível.');
    const novo: Agendamento = {
      ...dados,
      id: randomUUID(),
      asaasCobrancaId: null,
      googleEventId: null,
      valorEstornadoCentavos: 0,
      canceladoEm: null,
    };
    this.estado.agendamentos.push(novo);
    return { ...novo };
  }
  async atualizarAgendamento(id: string, dados: Partial<Agendamento>) {
    const a = this.estado.agendamentos.find((item) => item.id === id);
    if (!a) throw new Error('Agendamento não encontrado');
    Object.assign(a, dados);
    return { ...a };
  }
  async transicionar(id: string, de: Agendamento['status'][], dados: Partial<Agendamento>) {
    const a = this.estado.agendamentos.find((item) => item.id === id);
    if (!a || !de.includes(a.status)) return null;
    Object.assign(a, dados);
    return { ...a };
  }
  async reativarAgendamento(id: string, dados: Partial<Agendamento>, agora: string) {
    const a = this.estado.agendamentos.find((item) => item.id === id);
    if (!a) throw new Error('Agendamento não encontrado');
    for (const outro of this.estado.agendamentos)
      if (outro.status === 'pendente' && outro.expiraEm && Date.parse(outro.expiraEm) < Date.parse(agora))
        outro.status = 'expirado';
    if (
      this.estado.agendamentos.some(
        (outro) =>
          outro.id !== id &&
          (outro.status === 'pago' || outro.status === 'pendente') &&
          sobrepoe(outro.dataInicio, outro.dataFim, a.dataInicio, a.dataFim),
      )
    )
      throw new ErroNegocio('SLOT_INDISPONIVEL', 409, 'Horário indisponível.');
    Object.assign(a, dados);
    return { ...a };
  }
  async registrarEvento(id: string) {
    if (this.estado.eventos.has(id)) return false;
    this.estado.eventos.add(id);
    return true;
  }
  async removerEvento(id: string) {
    this.estado.eventos.delete(id);
  }
  async registrarTentativa(telefone: string, agora: string) {
    this.estado.tentativas.push({ telefone, criadoEm: agora });
    return this.estado.tentativas.filter(
      (t) => t.telefone === telefone && Date.parse(t.criadoEm) > Date.parse(agora) - 3600000,
    ).length;
  }
  async listarDespesas(inicio: string, fim: string) {
    return this.estado.despesas
      .filter((d) => d.dataRegistro >= inicio && d.dataRegistro < fim)
      .map((d) => ({ ...d }));
  }
  async criarDespesa(descricao: string, valorCentavos: number, agora: string) {
    const d = { id: randomUUID(), descricao, valorCentavos, dataRegistro: agora };
    this.estado.despesas.push(d);
    return { ...d };
  }
  async removerDespesa(id: string) {
    this.estado.despesas = this.estado.despesas.filter((d) => d.id !== id);
  }
}
export class PagamentosFake implements Pagamentos {
  constructor(public estado: EstadoFake) {}
  async criarCobranca(dados: { agendamentoId: string; forma: 'PIX' | 'CARTAO' }): Promise<Cobranca> {
    if (this.estado.falharCobranca) throw new Error('Cobrança indisponível');
    return dados.forma === 'PIX'
      ? {
          id: `fake_${dados.agendamentoId}`,
          forma: 'PIX',
          qrCodeBase64: 'ZmFrZQ==',
          copiaECola: `PIX-FAKE-${dados.agendamentoId}`,
        }
      : {
          id: `fake_${dados.agendamentoId}`,
          forma: 'CARTAO',
          urlCheckout: `https://example.invalid/checkout/${dados.agendamentoId}`,
        };
  }
  async estornar() {
    if (this.estado.falharEstorno) throw new Error('Estorno indisponível');
  }
  async cancelarCobranca() {}
  calcularLiquido(netValue: number) {
    return Math.round(netValue * 100);
  }
}
export class CalendarioFake implements Calendario {
  constructor(public estado: EstadoFake) {}
  async intervalosOcupados(inicio: string, fim: string) {
    return this.estado.ocupados.filter((o) => sobrepoe(o.inicio, o.fim, inicio, fim));
  }
  async criarEvento(a: Agendamento) {
    if (this.estado.falharCalendario) throw new Error('Calendário indisponível');
    return `fake_event_${a.id}`;
  }
  async removerEvento() {
    if (this.estado.falharCalendario) throw new Error('Calendário indisponível');
  }
}
