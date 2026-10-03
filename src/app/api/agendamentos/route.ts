import { z } from 'zod';
import { SITE } from '@/lib/site';
import { container } from '@/server/container';
import { criarAgendamento } from '@/server/casos/agenda';
import { corpo, cpfSchema, inicioSchema, responder, servicosSchema, telefoneSchema } from '@/server/http';
const schema = z.object({
  nome: z.string().trim().min(1),
  telefone: telefoneSchema,
  // CPF e forma de pagamento só são exigidos (no caso de uso) quando o agendamento é cobrado.
  cpf: cpfSchema.optional(),
  servicosIds: servicosSchema,
  dataInicio: inicioSchema,
  formaPagamento: z.enum(['PIX', 'CARTAO']).optional(),
});
export async function POST(req: Request) {
  return responder(async () => {
    const dados = await corpo(req, schema);
    return criarAgendamento(container(), () => new Date(), dados, SITE.cobraPagamento);
  }, 201);
}
