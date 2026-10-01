import { z } from 'zod';
import { container } from '@/server/container';
import { criarDespesa, despesasMes } from '@/server/casos/admin';
import { autenticarAdmin, consulta, corpo, mesSchema, responder } from '@/server/http';
const schema = z.object({ descricao: z.string().trim().min(1), valor: z.number().positive().finite() });
export async function GET(req: Request) {
  return responder(async () => {
    await autenticarAdmin(req);
    return despesasMes(container(), consulta(req.url, 'mes', mesSchema));
  });
}
export async function POST(req: Request) {
  return responder(async () => {
    await autenticarAdmin(req);
    const d = await corpo(req, schema);
    return criarDespesa(container(), () => new Date(), d.descricao, Math.round(d.valor * 100));
  }, 201);
}
