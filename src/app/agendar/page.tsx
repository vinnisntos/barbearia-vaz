import type { Metadata } from "next";
import { Cabecalho, Pagina } from "@/components/ui";
import { Vitrine } from "@/components/Vitrine";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agendar horário",
  description: `Escolha o serviço, o dia e o horário e garanta sua vaga na ${SITE.nome}${SITE.cobraPagamento ? " pagando por Pix ou cartão" : ", sem custo para agendar"}.`,
};

export default function PaginaAgendar() {
  return (
    <>
      <Cabecalho subtitulo={SITE.cobraPagamento ? "Agende e pague em menos de um minuto" : "Agende em menos de um minuto"} />
      <Pagina>
        <Vitrine />
      </Pagina>
    </>
  );
}
