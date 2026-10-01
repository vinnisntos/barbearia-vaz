import type { Cobranca, Pagamentos } from '../portas';
import { centavos, diaLocal } from '../tempo';

type Objeto = Record<string, unknown>;
export class PagamentosAsaas implements Pagamentos {
  constructor(
    private base: string,
    private chave: string,
    private carteira: string | null, // null = cobrança sem split
    private splitFixoCentavos: number | null,
    private splitPercentual: number | null,
  ) {}
  private async requisitar(caminho: string, metodo = 'GET', corpo?: Objeto): Promise<Objeto> {
    const resposta = await fetch(`${this.base}${caminho}`, {
      method: metodo,
      headers: {
        access_token: this.chave,
        'Content-Type': 'application/json',
        'User-Agent': 'barbearia',
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resposta.ok) {
      // Só o código do erro: a descrição do Asaas pode repetir dados do cliente (CPF).
      const erros = ((await resposta.json().catch(() => null)) as { errors?: { code?: string }[] } | null)
        ?.errors;
      const codigos = erros?.map((e) => e.code).join(',') ?? '';
      throw new Error(`Asaas ${metodo} ${caminho.split('?')[0]}: HTTP ${resposta.status} ${codigos}`.trim());
    }
    if (resposta.status === 204) return {};
    return (await resposta.json()) as Objeto;
  }
  private split(valorCentavos: number): number {
    if (!this.carteira) return 0;
    return this.splitFixoCentavos ?? Math.round((valorCentavos * (this.splitPercentual ?? 0)) / 100);
  }
  async criarCobranca(d: {
    agendamentoId: string;
    nome: string;
    telefone: string;
    cpf: string;
    valorCentavos: number;
    forma: 'PIX' | 'CARTAO';
  }): Promise<Cobranca> {
    const consulta = await this.requisitar(`/customers?cpfCnpj=${encodeURIComponent(d.cpf)}`);
    const existentes = Array.isArray(consulta.data) ? (consulta.data as Objeto[]) : [];
    const cliente =
      existentes[0] ??
      (await this.requisitar('/customers', 'POST', {
        name: d.nome,
        cpfCnpj: d.cpf,
        mobilePhone: d.telefone,
      }));
    const parcela =
      this.splitFixoCentavos !== null
        ? { walletId: this.carteira, fixedValue: this.splitFixoCentavos / 100 }
        : { walletId: this.carteira, percentualValue: this.splitPercentual };
    const pagamento = await this.requisitar('/payments', 'POST', {
      customer: cliente.id,
      billingType: d.forma === 'PIX' ? 'PIX' : 'CREDIT_CARD',
      value: d.valorCentavos / 100,
      dueDate: diaLocal(new Date()),
      externalReference: d.agendamentoId,
      ...(this.carteira ? { split: [parcela] } : {}),
    });
    const id = String(pagamento.id);
    if (d.forma === 'CARTAO') return { id, forma: 'CARTAO', urlCheckout: String(pagamento.invoiceUrl) };
    const qr = await this.requisitar(`/payments/${id}/pixQrCode`);
    return { id, forma: 'PIX', qrCodeBase64: String(qr.encodedImage), copiaECola: String(qr.payload) };
  }
  async estornar(id: string, valorCentavos: number, totalCentavos: number, liquidoBarbeiroCentavos?: number) {
    const cobranca = await this.requisitar(`/payments/${id}`);
    const splits = Array.isArray(cobranca.split) ? (cobranca.split as Objeto[]) : [];
    const split = splits.find((item) => item.walletId === this.carteira);
    const netValue = typeof cobranca.netValue === 'number' ? centavos(cobranca.netValue) : totalCentavos;
    const splitCentavos = split
      ? typeof split.fixedValue === 'number'
        ? centavos(split.fixedValue)
        : Math.round((netValue * Number(split.percentualValue ?? this.splitPercentual ?? 0)) / 100)
      : 0;
    const parteBarbeiro = liquidoBarbeiroCentavos ?? netValue - splitCentavos;
    const splitRefundCentavos = Math.min(splitCentavos, Math.max(0, valorCentavos - parteBarbeiro));
    const corpo: Objeto = { value: valorCentavos / 100 };
    if (splitRefundCentavos > 0) {
      if (!split?.id) throw new Error('ID do split Asaas não encontrado para estorno');
      corpo.splitRefunds = [{ id: split.id, value: splitRefundCentavos / 100 }];
    }
    await this.requisitar(`/payments/${id}/refund`, 'POST', corpo);
  }
  get sandbox() {
    return this.base.includes('sandbox');
  }
  /** Só no sandbox: marca a cobrança como recebida e devolve o netValue, como o webhook traria. */
  async confirmarNoSandbox(id: string): Promise<number | undefined> {
    if (!this.sandbox) throw new Error('confirmarNoSandbox só existe no sandbox do Asaas');
    await this.requisitar(`/sandbox/payment/${id}/confirm`, 'POST');
    const cobranca = await this.requisitar(`/payments/${id}`);
    return typeof cobranca.netValue === 'number' ? cobranca.netValue : undefined;
  }
  async cancelarCobranca(id: string) {
    await this.requisitar(`/payments/${id}`, 'DELETE');
  }
  calcularLiquido(netValue: number, _valorTotalCentavos: number, splitInformadoCentavos?: number) {
    return Math.max(0, centavos(netValue) - (splitInformadoCentavos ?? this.split(centavos(netValue))));
  }
}
