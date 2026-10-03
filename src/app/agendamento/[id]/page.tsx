import type { Metadata } from "next";
import { Checkout } from "@/components/Checkout";
import { Cabecalho, Pagina } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE.cobraPagamento ? "Pagamento" : "Seu agendamento",
  robots: { index: false },
};

export default async function PaginaAgendamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <Cabecalho />
      <Pagina>
        <Checkout id={id} />
      </Pagina>
    </>
  );
}
