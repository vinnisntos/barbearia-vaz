import { container } from '@/server/container';
import { dashboard } from '@/server/casos/admin';
import { autenticarAdmin, consulta, mesSchema, responder } from '@/server/http';
export async function GET(req: Request) {
  return responder(async () => {
    await autenticarAdmin(req);
    return dashboard(container(), consulta(req.url, 'mes', mesSchema));
  });
}
