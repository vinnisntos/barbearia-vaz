import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Agendamento,
  Despesa,
  HorarioFuncionamento,
  NovoAgendamento,
  Repositorio,
  Servico,
} from '../portas';
import { centavos } from '../tempo';
import { ErroNegocio } from '../erros';

type Linha = Record<string, unknown>;
const numero = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));
function agendamento(l: Linha): Agendamento {
  return {
    id: String(l.id),
    nomeCliente: String(l.nome_cliente),
    telefoneCliente: String(l.telefone_cliente),
    servicosIds: l.servicos_ids as string[],
    servicosResumo: String(l.servicos_resumo),
    valorTotalCentavos: centavos(numero(l.valor_total)),
    dataInicio: String(l.data_inicio),
    dataFim: String(l.data_fim),
    origem: l.origem as Agendamento['origem'],
    status: l.status as Agendamento['status'],
    codigoCancelamento: String(l.codigo_cancelamento),
    asaasCobrancaId: l.asaas_cobranca_id as string | null,
    googleEventId: l.google_event_id as string | null,
    expiraEm: l.expira_em as string | null,
    pagoEm: l.pago_em as string | null,
    valorLiquidoCentavos: l.valor_liquido === null ? null : centavos(numero(l.valor_liquido)),
    valorEstornadoCentavos: centavos(numero(l.valor_estornado)),
    canceladoEm: l.cancelado_em as string | null,
  };
}
function verificar(erro: { code?: string; message: string } | null) {
  if (!erro) return;
  if (erro.code === '23P01') throw new ErroNegocio('SLOT_INDISPONIVEL', 409, 'Horário indisponível.');
  throw new Error(`Supabase: ${erro.message}`);
}
export class RepositorioSupabase implements Repositorio {
  readonly cliente: SupabaseClient;
  constructor(url: string, chave: string) {
    this.cliente = createClient(url, chave, { auth: { persistSession: false } });
  }
  // Serviços e horários de funcionamento quase nunca mudam e entram em toda requisição da vitrine:
  // ficam em memória por 1 minuto (uma alteração feita no banco leva até 1 minuto para aparecer).
  private catalogo = new Map<string, { expira: number; valor: Promise<unknown> }>();
  private emCache<T>(chave: string, buscar: () => Promise<T>): Promise<T> {
    const atual = this.catalogo.get(chave);
    if (atual && atual.expira > Date.now()) return atual.valor as Promise<T>;
    const valor = buscar();
    this.catalogo.set(chave, { expira: Date.now() + 60_000, valor });
    valor.catch(() => this.catalogo.delete(chave)); // erro não fica em cache
    return valor;
  }
  listarServicos() {
    return this.emCache('servicos', async () => {
      const { data, error } = await this.cliente.from('servicos').select('*');
      verificar(error);
      return ((data ?? []) as Linha[]).map((l): Servico => ({
        id: String(l.id),
        nome: String(l.nome),
        precoCentavos: centavos(numero(l.preco)),
        duracaoMinutos: numero(l.duracao_minutos),
        ativo: Boolean(l.ativo),
      }));
    });
  }
  listarHorarios() {
    return this.emCache('horarios', async () => {
      const { data, error } = await this.cliente.from('horarios_funcionamento').select('*');
      verificar(error);
      return ((data ?? []) as Linha[]).map((l): HorarioFuncionamento => ({
        diaSemana: numero(l.dia_semana),
        abre: String(l.abre).slice(0, 5),
        fecha: String(l.fecha).slice(0, 5),
      }));
    });
  }
  async listarAgendamentos(inicio: string, fim: string) {
    const { data, error } = await this.cliente
      .from('agendamentos')
      .select('*')
      .lt('data_inicio', fim)
      .gt('data_fim', inicio);
    verificar(error);
    return ((data ?? []) as Linha[]).map(agendamento);
  }
  async buscarAgendamento(id: string) {
    const { data, error } = await this.cliente.from('agendamentos').select('*').eq('id', id).maybeSingle();
    verificar(error);
    return data ? agendamento(data as Linha) : null;
  }
  async buscarPorCobranca(id: string) {
    const { data, error } = await this.cliente
      .from('agendamentos')
      .select('*')
      .eq('asaas_cobranca_id', id)
      .maybeSingle();
    verificar(error);
    return data ? agendamento(data as Linha) : null;
  }
  async buscarPagoPorTelefone(telefone: string, agora: string) {
    const { data, error } = await this.cliente
      .from('agendamentos')
      .select('*')
      .eq('telefone_cliente', telefone)
      .eq('status', 'pago')
      .gt('data_inicio', agora);
    verificar(error);
    return ((data ?? []) as Linha[]).map(agendamento);
  }
  async criarAgendamento(d: NovoAgendamento) {
    const { data, error } = await this.cliente.rpc('criar_agendamento', {
      p_nome: d.nomeCliente,
      p_telefone: d.telefoneCliente,
      p_servicos_ids: d.servicosIds,
      p_servicos_resumo: d.servicosResumo,
      p_valor_total: d.valorTotalCentavos / 100,
      p_data_inicio: d.dataInicio,
      p_data_fim: d.dataFim,
      p_origem: d.origem,
      p_status: d.status,
      p_codigo: d.codigoCancelamento,
      p_expira_em: d.expiraEm,
    });
    verificar(error);
    return agendamento(data as Linha);
  }
  private colunas(d: Partial<Agendamento>) {
    const m: Record<string, unknown> = {};
    const campos: [keyof Agendamento, string][] = [
      ['status', 'status'],
      ['asaasCobrancaId', 'asaas_cobranca_id'],
      ['googleEventId', 'google_event_id'],
      ['expiraEm', 'expira_em'],
      ['pagoEm', 'pago_em'],
      ['canceladoEm', 'cancelado_em'],
    ];
    for (const [nome, coluna] of campos) if (nome in d) m[coluna] = d[nome];
    if ('valorLiquidoCentavos' in d)
      m.valor_liquido = d.valorLiquidoCentavos === null ? null : (d.valorLiquidoCentavos ?? 0) / 100;
    if ('valorEstornadoCentavos' in d) m.valor_estornado = (d.valorEstornadoCentavos ?? 0) / 100;
    return m;
  }
  async atualizarAgendamento(id: string, d: Partial<Agendamento>) {
    const { data, error } = await this.cliente
      .from('agendamentos')
      .update(this.colunas(d))
      .eq('id', id)
      .select()
      .single();
    verificar(error);
    return agendamento(data as Linha);
  }
  async transicionar(id: string, de: Agendamento['status'][], d: Partial<Agendamento>) {
    // O filtro por status vai no próprio UPDATE: o banco garante que só um pedido concorrente vence.
    const { data, error } = await this.cliente
      .from('agendamentos')
      .update(this.colunas(d))
      .eq('id', id)
      .in('status', de)
      .select()
      .maybeSingle();
    verificar(error);
    return data ? agendamento(data as Linha) : null;
  }
  async reativarAgendamento(id: string, d: Partial<Agendamento>, agora: string) {
    // A constraint impede reativação quando outro agendamento vivo ocupa o intervalo.
    const atual = await this.buscarAgendamento(id);
    if (!atual) throw new Error('Agendamento não encontrado');
    const outros = await this.listarAgendamentos(atual.dataInicio, atual.dataFim);
    for (const outro of outros)
      if (
        outro.id !== id &&
        outro.status === 'pendente' &&
        outro.expiraEm &&
        Date.parse(outro.expiraEm) < Date.parse(agora)
      )
        await this.atualizarAgendamento(outro.id, { status: 'expirado' });
    return this.atualizarAgendamento(id, d);
  }
  async registrarEvento(id: string, tipo: string) {
    const { error } = await this.cliente.from('webhook_eventos').insert({ id, tipo });
    if (error?.code === '23505') return false;
    verificar(error);
    return true;
  }
  async removerEvento(id: string) {
    const { error } = await this.cliente.from('webhook_eventos').delete().eq('id', id);
    verificar(error);
  }
  async registrarTentativa(telefone: string, agora: string) {
    const { error } = await this.cliente
      .from('tentativas_cancelamento')
      .insert({ telefone, criado_em: agora });
    verificar(error);
    const { count, error: erroContagem } = await this.cliente
      .from('tentativas_cancelamento')
      .select('*', { count: 'exact', head: true })
      .eq('telefone', telefone)
      .gt('criado_em', new Date(Date.parse(agora) - 3600000).toISOString());
    verificar(erroContagem);
    return count ?? 0;
  }
  async listarDespesas(inicio: string, fim: string) {
    const { data, error } = await this.cliente
      .from('despesas')
      .select('*')
      .gte('data_registro', inicio)
      .lt('data_registro', fim);
    verificar(error);
    return ((data ?? []) as Linha[]).map((d): Despesa => ({
      id: String(d.id),
      descricao: String(d.descricao),
      valorCentavos: centavos(numero(d.valor)),
      dataRegistro: String(d.data_registro),
    }));
  }
  async criarDespesa(descricao: string, valorCentavos: number, agora: string) {
    const { data, error } = await this.cliente
      .from('despesas')
      .insert({ descricao, valor: valorCentavos / 100, data_registro: agora })
      .select()
      .single();
    verificar(error);
    const d = data as Linha;
    return {
      id: String(d.id),
      descricao: String(d.descricao),
      valorCentavos: centavos(numero(d.valor)),
      dataRegistro: String(d.data_registro),
    };
  }
  async removerDespesa(id: string) {
    const { error } = await this.cliente.from('despesas').delete().eq('id', id);
    verificar(error);
  }
}
