import { z } from 'zod';
import { container } from '@/server/container';
import { processarWebhook } from '@/server/casos/pagamentos';
import { corpo, responder, validarWebhook } from '@/server/http';
import { centavos } from '@/server/tempo';
const schema = z.object({
  id: z.string().min(1),
  event: z.string(),
  payment: z
    .object({
      id: z.string(),
      externalReference: z.string().nullish(),
      netValue: z.number().nullish(),
      split: z
        .array(z.object({ fixedValue: z.number().nullish(), percentualValue: z.number().nullish() }))
        .nullish(),
    })
    .nullish(),
});
export async function POST(req: Request) {
  return responder(async () => {
    validarWebhook(req);
    const evento = await corpo(req, schema);
    const split = evento.payment?.split?.reduce(
      (s, p) =>
        s +
        (p.fixedValue != null
          ? centavos(p.fixedValue)
          : Math.round((centavos(evento.payment?.netValue ?? 0) * (p.percentualValue ?? 0)) / 100)),
      0,
    );
    await processarWebhook(container(), () => new Date(), {
      id: evento.id,
      tipo: evento.event,
      cobrancaId: evento.payment?.id ?? '',
      referencia: evento.payment?.externalReference ?? undefined,
      netValue: evento.payment?.netValue ?? undefined,
      splitCentavos: split,
    });
    return { ok: true };
  });
}
