import { z } from 'zod';
import { container } from '@/server/container';
import { disponibilidade } from '@/server/casos/agenda';
import { consulta, dataSchema, responder, uuid } from '@/server/http';
export async function GET(req: Request) {
  return responder(async () => {
    const data = consulta(req.url, 'data', dataSchema, 'DATA_INVALIDA');
    const ids = consulta(
      req.url,
      'servicos',
      z
        .string()
        .transform((v) => v.split(','))
        .pipe(z.array(uuid).length(1)),
      'SERVICO_INVALIDO',
    );
    return disponibilidade(container(), () => new Date(), data, ids);
  });
}
