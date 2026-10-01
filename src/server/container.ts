import type { Calendario, Pagamentos, Portas, Repositorio } from './portas';
import { CalendarioFake, estadoFake, PagamentosFake, RepositorioFake } from './adaptadores/fakes';
import { RepositorioSupabase } from './adaptadores/supabase';
import { PagamentosAsaas } from './adaptadores/asaas';
import { CalendarioGoogle } from './adaptadores/google';

// MODO_FAKE=1 troca tudo por fakes em memória. Uma lista (ex.: "pagamentos,calendario")
// troca só essas portas, para validar uma integração real de cada vez.
export type NomePorta = 'repositorio' | 'pagamentos' | 'calendario';
export function portaFake(porta: NomePorta): boolean {
  const modo = (process.env.MODO_FAKE ?? '').trim();
  // Com fake ligado o painel aceita o token "fake" e nenhum dinheiro é cobrado: em produção é erro de configuração.
  if (modo && process.env.AMBIENTE === 'producao')
    throw new Error('MODO_FAKE não pode ser usado com AMBIENTE=producao');
  if (modo === '1') return true;
  return modo
    .split(',')
    .map((item) => item.trim())
    .includes(porta);
}

export function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  return valor;
}

function criarRepositorio(): Repositorio {
  if (portaFake('repositorio')) return new RepositorioFake(estadoFake());
  return new RepositorioSupabase(
    obrigatoria('NEXT_PUBLIC_SUPABASE_URL'),
    obrigatoria('SUPABASE_SERVICE_ROLE_KEY'),
  );
}

function criarPagamentos(): Pagamentos {
  if (portaFake('pagamentos')) return new PagamentosFake(estadoFake());
  const carteira = process.env.ASAAS_SPLIT_WALLET_ID || null;
  if (!carteira) {
    console.warn('ASAAS_SPLIT_WALLET_ID vazio: cobranças serão criadas SEM split.');
    return new PagamentosAsaas(obrigatoria('ASAAS_BASE_URL'), obrigatoria('ASAAS_API_KEY'), null, null, null);
  }
  const fixo = process.env.ASAAS_SPLIT_FIXO;
  const percentual = process.env.ASAAS_SPLIT_PERCENTUAL;
  if (Boolean(fixo) === Boolean(percentual))
    throw new Error('Configure exatamente uma variável: ASAAS_SPLIT_FIXO ou ASAAS_SPLIT_PERCENTUAL');
  const fixoCentavos = fixo ? Math.round(Number(fixo) * 100) : null;
  const percentualNumero = percentual ? Number(percentual) : null;
  const fixoInvalido = fixoCentavos !== null && (!Number.isFinite(fixoCentavos) || fixoCentavos < 0);
  const percentualInvalido =
    percentualNumero !== null &&
    (!Number.isFinite(percentualNumero) || percentualNumero < 0 || percentualNumero > 100);
  if (fixoInvalido || percentualInvalido) throw new Error('Configuração de split Asaas inválida');
  return new PagamentosAsaas(
    obrigatoria('ASAAS_BASE_URL'),
    obrigatoria('ASAAS_API_KEY'),
    carteira,
    fixoCentavos,
    percentualNumero,
  );
}

function criarCalendario(): Calendario {
  if (portaFake('calendario')) return new CalendarioFake(estadoFake());
  return new CalendarioGoogle(
    obrigatoria('GOOGLE_CLIENT_ID'),
    obrigatoria('GOOGLE_CLIENT_SECRET'),
    obrigatoria('GOOGLE_REFRESH_TOKEN'),
    obrigatoria('GOOGLE_CALENDAR_ID'),
  );
}

// Cada porta é criada só quando usada (uma rota que só lê serviços não exige as credenciais
// do Asaas) e reaproveitada entre requisições.
const cache: Partial<Portas> & { modo?: string } = {};
export function container(): Portas {
  const modo = process.env.MODO_FAKE ?? '';
  if (cache.modo !== modo) {
    cache.repositorio = cache.pagamentos = cache.calendario = undefined;
    cache.modo = modo;
  }
  return {
    get repositorio() {
      return (cache.repositorio ??= criarRepositorio());
    },
    get pagamentos() {
      return (cache.pagamentos ??= criarPagamentos());
    },
    get calendario() {
      return (cache.calendario ??= criarCalendario());
    },
  };
}
