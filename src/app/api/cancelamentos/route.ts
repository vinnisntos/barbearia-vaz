import { z } from 'zod';
import { SITE } from '@/lib/site';
import { container } from '@/server/container';
import { ErroNegocio } from '@/server/erros';
import { cancelarCliente } from '@/server/casos/pagamentos';
import { corpo, responder, telefoneSchema } from '@/server/http';
const schema = z.object({ telefone: telefoneSchema, pin: z.string().trim() });
export async function POST(req: Request) {
  return responder(async () => {
    if (!SITE.clienteCancela) throw new ErroNegocio('NAO_ENCONTRADO', 404, 'Cancelamento pelo site indisponível.');
    const dados = await corpo(req, schema);
    return cancelarCliente(container(), () => new Date(), dados.telefone, dados.pin.toUpperCase());
  });
}
