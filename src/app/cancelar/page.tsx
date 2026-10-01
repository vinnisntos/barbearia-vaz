import type { Metadata } from "next";
import { CancelarForm } from "@/components/CancelarForm";
import { Cabecalho, Pagina } from "@/components/ui";

export const metadata: Metadata = { title: "Cancelar horário" };

export default function PaginaCancelar() {
  return (
    <>
      <Cabecalho />
      <Pagina>
        <CancelarForm />
      </Pagina>
    </>
  );
}
