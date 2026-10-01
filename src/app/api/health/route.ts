// Usado pelo healthcheck do container. Não toca em banco nem em serviços externos de propósito:
// uma instabilidade do Supabase não deve fazer o Docker reiniciar o app.
export function GET() {
  return Response.json({ ok: true });
}
