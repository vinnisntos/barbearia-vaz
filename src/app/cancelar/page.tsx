import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CancelarForm } from "@/components/CancelarForm";
import { Cabecalho, Pagina } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Cancelar horário" };

export default function PaginaCancelar() {
  if (!SITE.clienteCancela) notFound();
  return (
    <>
      <Cabecalho />
      <Pagina>
        <CancelarForm />
      </Pagina>
    </>
  );
}
