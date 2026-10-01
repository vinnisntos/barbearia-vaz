import { z } from 'zod';
import { container } from '@/server/container';
import { cancelarCliente } from '@/server/casos/pagamentos';
import { corpo, responder, telefoneSchema } from '@/server/http';
const schema = z.object({ telefone: telefoneSchema, pin: z.string().trim() });
export async function POST(req: Request) {
  return responder(async () => {
    const dados = await corpo(req, schema);
    return cancelarCliente(container(), () => new Date(), dados.telefone, dados.pin.toUpperCase());
  });
}
