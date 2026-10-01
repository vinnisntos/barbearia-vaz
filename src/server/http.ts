import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { obrigatoria, portaFake } from './container';
import { ErroNegocio } from './erros';
import { localParaDate, diaLocal } from './tempo';

export const uuid = z.uuid();
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => diaLocal(localParaDate(v, '12:00')) === v);
export const mesSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const inicioSchema = z.iso.datetime({ offset: true });
export const telefoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{10,11}$/));
export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{11}$/));
// Um serviço por agendamento (D11): combos são serviços próprios, com preço próprio.
export const servicosSchema = z.array(uuid).length(1);
export async function corpo<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ErroNegocio('DADOS_INVALIDOS', 400, 'Dados inválidos.');
  }
  const r = schema.safeParse(json);
  if (!r.success) throw new ErroNegocio('DADOS_INVALIDOS', 400, 'Dados inválidos.');
  return r.data;
}
export function consulta<T extends z.ZodType>(
  url: string,
  nome: string,
  schema: T,
  codigo = 'DADOS_INVALIDOS',
): z.output<T> {
  const valor = new URL(url).searchParams.get(nome);
  const r = schema.safeParse(valor);
  if (!r.success) throw new ErroNegocio(codigo, 400, `${nome} inválido.`);
  return r.data;
}
export async function responder(operacao: () => Promise<unknown>, status = 200): Promise<Response> {
  try {
    return Response.json(await operacao(), { status });
  } catch (e) {
    if (e instanceof ErroNegocio)
      return Response.json({ erro: { codigo: e.codigo, mensagem: e.message } }, { status: e.status });
    console.error('Erro na API:', e);
    return Response.json(
      { erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno. Tente novamente.' } },
      { status: 500 },
    );
  }
}
export function tokenIgual(recebido: string | null, esperado: string) {
  const a = Buffer.from(recebido ?? '');
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function autenticarAdmin(req: Request) {
  const cabecalho = req.headers.get('authorization');
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  const naoAutenticado = () => new ErroNegocio('NAO_AUTENTICADO', 401, 'Não autenticado.');
  if (portaFake('repositorio')) {
    if (token === 'fake') return;
    throw naoAutenticado();
  }
  if (!token) throw naoAutenticado();
  // Estar logado no Supabase não basta: o cadastro pode estar aberto. Só entra quem está na lista.
  const permitidos = obrigatoria('ADMIN_EMAILS')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const { data, error } = await clienteAuth().auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !data.user?.email_confirmed_at || !permitidos.includes(email))
    throw naoAutenticado();
}
let auth: SupabaseClient | undefined;
function clienteAuth(): SupabaseClient {
  return (auth ??= createClient(
    obrigatoria('NEXT_PUBLIC_SUPABASE_URL'),
    obrigatoria('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  ));
}
export function validarWebhook(req: Request) {
  if (!tokenIgual(req.headers.get('asaas-access-token'), obrigatoria('ASAAS_WEBHOOK_TOKEN')))
    throw new ErroNegocio('NAO_AUTENTICADO', 401, 'Token inválido.');
}
