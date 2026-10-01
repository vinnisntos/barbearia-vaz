export type StatusAgendamento = 'pendente' | 'pago' | 'cancelado' | 'ausente' | 'expirado';
export type OrigemAgendamento = 'app' | 'balcao';
export interface Servico {
  id: string;
  nome: string;
  precoCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
}
export interface HorarioFuncionamento {
  diaSemana: number;
  abre: string;
  fecha: string;
}
export interface Agendamento {
  id: string;
  nomeCliente: string;
  telefoneCliente: string;
  servicosIds: string[];
  servicosResumo: string;
  valorTotalCentavos: number;
  dataInicio: string;
  dataFim: string;
  origem: OrigemAgendamento;
  status: StatusAgendamento;
  codigoCancelamento: string;
  asaasCobrancaId: string | null;
  googleEventId: string | null;
  expiraEm: string | null;
  pagoEm: string | null;
  valorLiquidoCentavos: number | null;
  valorEstornadoCentavos: number;
  canceladoEm: string | null;
}
export interface Despesa {
  id: string;
  descricao: string;
  valorCentavos: number;
  dataRegistro: string;
}
export type NovoAgendamento = Omit<
  Agendamento,
  'id' | 'asaasCobrancaId' | 'googleEventId' | 'valorEstornadoCentavos' | 'canceladoEm'
>;
export interface Repositorio {
  listarServicos(): Promise<Servico[]>;
  listarHorarios(): Promise<HorarioFuncionamento[]>;
  listarAgendamentos(inicio: string, fim: string): Promise<Agendamento[]>;
  buscarAgendamento(id: string): Promise<Agendamento | null>;
  buscarPorCobranca(id: string): Promise<Agendamento | null>;
  buscarPagoPorTelefone(telefone: string, agora: string): Promise<Agendamento[]>;
  /** Reservas ainda dentro do lock de pagamento para este telefone. */
  contarPendentes(telefone: string, agora: string): Promise<number>;
  criarAgendamento(dados: NovoAgendamento, agora: string): Promise<Agendamento>;
  atualizarAgendamento(id: string, dados: Partial<Agendamento>): Promise<Agendamento>;
  /**
   * Muda o agendamento só se o status atual estiver em `de`, de forma atômica.
   * Devolve null se outro pedido já mudou o status (ex.: cliente cancelou enquanto o barbeiro marcava falta).
   */
  transicionar(id: string, de: StatusAgendamento[], dados: Partial<Agendamento>): Promise<Agendamento | null>;
  reativarAgendamento(id: string, dados: Partial<Agendamento>, agora: string): Promise<Agendamento>;
  registrarEvento(id: string, tipo: string): Promise<boolean>;
  removerEvento(id: string): Promise<void>;
  registrarTentativa(telefone: string, agora: string): Promise<number>;
  listarDespesas(inicio: string, fim: string): Promise<Despesa[]>;
  criarDespesa(descricao: string, valorCentavos: number, agora: string): Promise<Despesa>;
  removerDespesa(id: string): Promise<void>;
}
export interface Cobranca {
  id: string;
  forma: 'PIX' | 'CARTAO';
  qrCodeBase64?: string;
  copiaECola?: string;
  urlCheckout?: string;
}
export interface Pagamentos {
  criarCobranca(dados: {
    agendamentoId: string;
    nome: string;
    telefone: string;
    cpf: string;
    valorCentavos: number;
    forma: 'PIX' | 'CARTAO';
  }): Promise<Cobranca>;
  estornar(
    cobrancaId: string,
    valorCentavos: number,
    valorTotalCentavos: number,
    liquidoBarbeiroCentavos?: number,
  ): Promise<void>;
  cancelarCobranca(cobrancaId: string): Promise<void>;
  calcularLiquido(netValue: number, valorTotalCentavos: number, splitInformadoCentavos?: number): number;
}
export interface Calendario {
  intervalosOcupados(inicio: string, fim: string): Promise<{ inicio: string; fim: string }[]>;
  criarEvento(agendamento: Agendamento): Promise<string>;
  removerEvento(id: string): Promise<void>;
}
export interface Portas {
  repositorio: Repositorio;
  pagamentos: Pagamentos;
  calendario: Calendario;
}
export type Relogio = () => Date;
