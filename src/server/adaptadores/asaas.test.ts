import { afterEach, describe, expect, it, vi } from 'vitest';
import { PagamentosAsaas } from './asaas';

afterEach(() => vi.unstubAllGlobals());
describe('estorno Asaas', () => {
  it('usa o ID do split e só devolve a parcela que excede o líquido do barbeiro', async () => {
    const chamadas: { url: string; corpo?: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, opcoes?: RequestInit) => {
        chamadas.push({
          url,
          corpo: opcoes?.body ? (JSON.parse(String(opcoes.body)) as Record<string, unknown>) : undefined,
        });
        if (url.endsWith('/refund')) return Response.json({ id: 'pay_1' });
        return Response.json({
          id: 'pay_1',
          netValue: 95,
          split: [{ id: 'split_1', walletId: 'wallet_plataforma', fixedValue: 40 }],
        });
      }),
    );
    const pagamentos = new PagamentosAsaas(
      'https://api.asaas.com/v3',
      'chave',
      'wallet_plataforma',
      4000,
      null,
    );
    await pagamentos.estornar('pay_1', 7000, 10000, 5500);
    expect(chamadas[1].corpo).toEqual({ value: 70, splitRefunds: [{ id: 'split_1', value: 15 }] });
  });
  it('calcula percentual sobre o valor líquido após taxas', () => {
    const pagamentos = new PagamentosAsaas(
      'https://api.asaas.com/v3',
      'chave',
      'wallet_plataforma',
      null,
      20,
    );
    expect(pagamentos.calcularLiquido(95, 10000)).toBe(7600);
  });
});
