import { container, portaFake } from '@/server/container';
import { PagamentosAsaas } from '@/server/adaptadores/asaas';
import { confirmarPagamento } from '@/server/casos/pagamentos';
import { ErroNegocio } from '@/server/erros';
import { responder } from '@/server/http';
import { reais } from '@/server/tempo';

// Atalho de desenvolvimento: confirma o pagamento sem depender do webhook (que não alcança localhost).
// Só existe com pagamentos fake ou com o Asaas apontando para o sandbox; em produção responde 404.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    const portas = container();
    const fake = portaFake('pagamentos');
    const asaas = !fake && portas.pagamentos instanceof PagamentosAsaas ? portas.pagamentos : null;
    if (!fake && !asaas?.sandbox) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Não encontrado.');
    const id = (await params).id;
    const a = await portas.repositorio.buscarAgendamento(id);
    if (!a) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento não encontrado.');
    let netValue: number | undefined = reais(a.valorTotalCentavos);
    if (asaas) {
      if (!a.asaasCobrancaId) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Agendamento sem cobrança.');
      if (a.status === 'pendente' || a.status === 'expirado')
        netValue = await asaas.confirmarNoSandbox(a.asaasCobrancaId);
    }
    await confirmarPagamento(portas, () => new Date(), {
      id: `dev_${id}`,
      tipo: 'PAYMENT_CONFIRMED',
      cobrancaId: a.asaasCobrancaId ?? '',
      referencia: id,
      netValue,
    });
    return { ok: true };
  });
}
