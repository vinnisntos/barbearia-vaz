import { container } from '@/server/container';
import { cancelarAdmin } from '@/server/casos/admin';
import { autenticarAdmin, responder } from '@/server/http';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    await autenticarAdmin(req);
    return cancelarAdmin(container(), () => new Date(), (await params).id);
  });
}
