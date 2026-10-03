import type { Metadata } from "next";
import { Institucional, type HorarioDia, type ServicoVitrine } from "@/components/Institucional";
import { SITE } from "@/lib/site";
import { obterServicos } from "@/server/casos/agenda";
import { container } from "@/server/container";

// Preços e horários vêm do banco a cada visita (com o cache de 1 minuto do repositório),
// então não há o que pré-renderizar no build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.nome} — ${SITE.slogan}` },
  description: `${SITE.slogan}. Agende seu horário na ${SITE.nome} pelo site${SITE.cobraPagamento ? ", pague por Pix ou cartão" : ", sem custo,"} e seja atendido sem espera.`,
};

export default async function PaginaInicial() {
  // O site institucional não pode cair junto com o banco: sem dados, as seções mostram um texto de reserva.
  let servicos: ServicoVitrine[] = [];
  let horarios: HorarioDia[] = [];
  try {
    const portas = container();
    [servicos, horarios] = await Promise.all([obterServicos(portas), portas.repositorio.listarHorarios()]);
  } catch (erro) {
    console.error("Site institucional sem dados do banco:", erro instanceof Error ? erro.message : erro);
  }
  return <Institucional servicos={servicos} horarios={horarios} />;
}
