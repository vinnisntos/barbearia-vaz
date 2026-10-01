import type { Metadata } from "next";
import { Cabecalho, Pagina } from "@/components/ui";
import { Vitrine } from "@/components/Vitrine";

export const metadata: Metadata = {
  title: "Agendar horário",
  description:
    "Escolha o serviço, o dia e o horário e garanta sua vaga na MV Barbearia pagando por Pix ou cartão.",
};

export default function PaginaAgendar() {
  return (
    <>
      <Cabecalho subtitulo="Agende e pague em menos de um minuto" />
      <Pagina>
        <Vitrine />
      </Pagina>
    </>
  );
}
