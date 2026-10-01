import { container } from '@/server/container';
import { obterServicos } from '@/server/casos/agenda';
import { responder } from '@/server/http';
export async function GET() {
  return responder(async () => ({ servicos: await obterServicos(container()) }));
}
