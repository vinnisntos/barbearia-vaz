// Cliente tipado da API, seguindo docs/API.md.
// Erros do contrato chegam como { erro: { codigo, mensagem } } e viram ErroApi.

export type StatusAgendamento =
  | "pendente"
  | "pago"
  | "cancelado"
  | "ausente"
  | "expirado";

export type OrigemAgendamento = "app" | "balcao";
export type FormaPagamento = "PIX" | "CARTAO";

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
}

export interface Disponibilidade {
  data: string;
  duracaoMinutos: number;
  horarios: string[];
}

export type DadosPagamento =
  | { forma: "PIX"; qrCodeBase64: string; copiaECola: string }
  | { forma: "CARTAO"; urlCheckout: string };

export interface NovoAgendamento {
  nome: string;
  telefone: string;
  cpf: string;
  servicosIds: string[];
  dataInicio: string;
  formaPagamento: FormaPagamento;
}

export interface AgendamentoCriado {
  id: string;
  valorTotal: number;
  dataInicio: string;
  dataFim: string;
  expiraEm: string;
  pagamento: DadosPagamento;
}

export interface Agendamento {
  id: string;
  status: StatusAgendamento;
  nomeCliente: string;
  servicosResumo: string;
  valorTotal: number;
  dataInicio: string;
  dataFim: string;
  expiraEm: string | null;
  codigoCancelamento: string | null;
}

export interface CancelamentoFeito {
  agendamentoId: string;
  valorEstornado: number;
  dataInicio: string;
}

export interface AgendamentoAdmin {
  id: string;
  nomeCliente: string;
  telefoneCliente: string | null;
  servicosResumo: string;
  valorTotal: number;
  dataInicio: string;
  dataFim: string;
  origem: OrigemAgendamento;
  status: StatusAgendamento;
}

export interface NovoBalcao {
  nome: string;
  telefone?: string;
  servicosIds: string[];
  dataInicio: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataRegistro: string;
}

export interface Dashboard {
  mes: string;
  entrou: number;
  saiu: number;
  lucroLiquido: number;
  totalAgendamentos: number;
  totalAusentes: number;
}

export type CodigoErro =
  | "DATA_INVALIDA"
  | "SERVICO_INVALIDO"
  | "DADOS_INVALIDOS"
  | "SLOT_INDISPONIVEL"
  | "PAGAMENTO_INDISPONIVEL"
  | "NAO_ENCONTRADO"
  | "PRAZO_EXPIRADO"
  | "MUITAS_TENTATIVAS"
  | "ESTORNO_INDISPONIVEL"
  | "NAO_AUTENTICADO"
  | "STATUS_INVALIDO"
  | "HORARIO_FUTURO"
  // Gerados pelo próprio cliente:
  | "REDE"
  | "DESCONHECIDO";

export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: CodigoErro | (string & {});

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.codigo = codigo;
  }
}

const MENSAGEM_REDE =
  "Não foi possível conectar. Confira sua internet e tente de novo.";
const MENSAGEM_GENERICA = "Algo deu errado. Tente de novo em instantes.";

/** Converte qualquer exceção em ErroApi, para a UI tratar um tipo só. */
export function paraErroApi(erro: unknown): ErroApi {
  if (erro instanceof ErroApi) return erro;
  return new ErroApi(0, "REDE", MENSAGEM_REDE);
}

export function foiAbortado(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === "AbortError";
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function lerErro(status: number, corpo: unknown): ErroApi {
  if (ehObjeto(corpo) && ehObjeto(corpo.erro)) {
    const { codigo, mensagem } = corpo.erro;
    if (typeof codigo === "string") {
      return new ErroApi(
        status,
        codigo,
        typeof mensagem === "string" && mensagem ? mensagem : MENSAGEM_GENERICA,
      );
    }
  }
  if (status === 401) {
    return new ErroApi(status, "NAO_AUTENTICADO", "Sessão expirada. Entre de novo.");
  }
  return new ErroApi(status, "DESCONHECIDO", MENSAGEM_GENERICA);
}

interface Opcoes {
  metodo?: "GET" | "POST" | "DELETE";
  corpo?: unknown;
  token?: string;
  sinal?: AbortSignal;
}

async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const cabecalhos: Record<string, string> = { Accept: "application/json" };
  if (opcoes.corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (opcoes.token) cabecalhos.Authorization = `Bearer ${opcoes.token}`;

  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: opcoes.metodo ?? "GET",
      headers: cabecalhos,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
      signal: opcoes.sinal,
      cache: "no-store",
    });
  } catch (erro) {
    if (foiAbortado(erro)) throw erro;
    throw new ErroApi(0, "REDE", MENSAGEM_REDE);
  }

  let corpo: unknown = null;
  if (resposta.status !== 204) {
    const texto = await resposta.text().catch(() => "");
    if (texto) {
      try {
        corpo = JSON.parse(texto);
      } catch {
        corpo = null;
      }
    }
  }

  if (!resposta.ok) throw lerErro(resposta.status, corpo);
  return corpo as T;
}

const seg = encodeURIComponent;

export const api = {
  listarServicos: (sinal?: AbortSignal) =>
    requisitar<{ servicos: Servico[] }>("/api/servicos", { sinal }).then(
      (r) => r.servicos,
    ),

  disponibilidade: (data: string, servicosIds: string[], sinal?: AbortSignal) =>
    requisitar<Disponibilidade>(
      `/api/disponibilidade?data=${seg(data)}&servicos=${servicosIds.map(seg).join(",")}`,
      { sinal },
    ),

  criarAgendamento: (dados: NovoAgendamento) =>
    requisitar<AgendamentoCriado>("/api/agendamentos", {
      metodo: "POST",
      corpo: dados,
    }),

  obterAgendamento: (id: string, sinal?: AbortSignal) =>
    requisitar<Agendamento>(`/api/agendamentos/${seg(id)}`, { sinal }),

  cancelar: (telefone: string, pin: string) =>
    requisitar<CancelamentoFeito>("/api/cancelamentos", {
      metodo: "POST",
      corpo: { telefone, pin },
    }),

  /** Só existe com MODO_FAKE=1. */
  simularPagamento: (id: string) =>
    requisitar<unknown>(`/api/dev/pagar/${seg(id)}`, { metodo: "POST" }),

  admin: {
    listarAgendamentos: (token: string, data: string, sinal?: AbortSignal) =>
      requisitar<{ agendamentos: AgendamentoAdmin[] }>(
        `/api/admin/agendamentos?data=${seg(data)}`,
        { token, sinal },
      ).then((r) => r.agendamentos),

    criarBalcao: (token: string, dados: NovoBalcao) =>
      requisitar<AgendamentoAdmin>("/api/admin/agendamentos", {
        metodo: "POST",
        corpo: dados,
        token,
      }),

    marcarFalta: (token: string, id: string) =>
      requisitar<{ id: string; status: "ausente" }>(
        `/api/admin/agendamentos/${seg(id)}/faltou`,
        { metodo: "POST", token },
      ),

    cancelarEstornar: (token: string, id: string) =>
      requisitar<{ id: string; status: "cancelado"; valorEstornado: number }>(
        `/api/admin/agendamentos/${seg(id)}/cancelar-estornar`,
        { metodo: "POST", token },
      ),

    listarDespesas: (token: string, mes: string, sinal?: AbortSignal) =>
      requisitar<{ despesas: Despesa[] }>(`/api/admin/despesas?mes=${seg(mes)}`, {
        token,
        sinal,
      }).then((r) => r.despesas),

    criarDespesa: (token: string, descricao: string, valor: number) =>
      requisitar<unknown>("/api/admin/despesas", {
        metodo: "POST",
        corpo: { descricao, valor },
        token,
      }),

    excluirDespesa: (token: string, id: string) =>
      requisitar<null>(`/api/admin/despesas/${seg(id)}`, {
        metodo: "DELETE",
        token,
      }),

    dashboard: (token: string, mes: string, sinal?: AbortSignal) =>
      requisitar<Dashboard>(`/api/admin/dashboard?mes=${seg(mes)}`, {
        token,
        sinal,
      }),
  },
};
