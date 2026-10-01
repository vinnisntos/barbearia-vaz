import { z } from 'zod';
import { container } from '@/server/container';
import { criarAgendamento } from '@/server/casos/agenda';
import { corpo, cpfSchema, inicioSchema, responder, servicosSchema, telefoneSchema } from '@/server/http';
const schema = z.object({
  nome: z.string().trim().min(1),
  telefone: telefoneSchema,
  cpf: cpfSchema,
  servicosIds: servicosSchema,
  dataInicio: inicioSchema,
  formaPagamento: z.enum(['PIX', 'CARTAO']),
});
export async function POST(req: Request) {
  return responder(async () => {
    const dados = await corpo(req, schema);
    return criarAgendamento(container(), () => new Date(), dados);
  }, 201);
}
