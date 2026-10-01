import { container } from '@/server/container';
import { consultarAgendamento } from '@/server/casos/agenda';
import { responder } from '@/server/http';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => consultarAgendamento(container(), () => new Date(), (await params).id));
}
