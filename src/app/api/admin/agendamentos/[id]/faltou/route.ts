import { container } from '@/server/container';
import { marcarAusente } from '@/server/casos/admin';
import { autenticarAdmin, responder } from '@/server/http';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    await autenticarAdmin(req);
    return marcarAusente(container(), () => new Date(), (await params).id);
  });
}
