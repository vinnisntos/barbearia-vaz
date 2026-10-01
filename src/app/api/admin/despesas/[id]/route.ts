import { container } from '@/server/container';
import { autenticarAdmin, responder } from '@/server/http';
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resposta = await responder(async () => {
    await autenticarAdmin(req);
    await container().repositorio.removerDespesa((await params).id);
    return null;
  });
  return resposta.ok ? new Response(null, { status: 204 }) : resposta;
}
