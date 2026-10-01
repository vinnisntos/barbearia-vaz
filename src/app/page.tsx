import { Cabecalho, Pagina } from "@/components/ui";
import { Vitrine } from "@/components/Vitrine";

export default function PaginaInicial() {
  return (
    <>
      <Cabecalho subtitulo="Agende e pague em menos de um minuto" />
      <Pagina>
        <Vitrine />
      </Pagina>
    </>
  );
}
