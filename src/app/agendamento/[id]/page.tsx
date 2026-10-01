import type { Metadata } from "next";
import { Checkout } from "@/components/Checkout";
import { Cabecalho, Pagina } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pagamento",
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
