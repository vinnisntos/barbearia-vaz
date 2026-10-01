import { z } from 'zod';
import { container } from '@/server/container';
import { agendaDia, criarBalcao } from '@/server/casos/admin';
import {
  autenticarAdmin,
  consulta,
  corpo,
  dataSchema,
  inicioSchema,
  responder,
  servicosSchema,
  telefoneSchema,
} from '@/server/http';
const schema = z.object({
  nome: z.string().trim().min(1),
  telefone: telefoneSchema.optional(),
  servicosIds: servicosSchema,
  dataInicio: inicioSchema,
});
export async function GET(req: Request) {
  return responder(async () => {
    await autenticarAdmin(req);
    const data = consulta(req.url, 'data', dataSchema);
    return agendaDia(container(), data);
  });
}
export async function POST(req: Request) {
  return responder(async () => {
    await autenticarAdmin(req);
    const d = await corpo(req, schema);
    return criarBalcao(container(), () => new Date(), { ...d, telefone: d.telefone ?? '' });
  }, 201);
}
