// Conteúdo do site institucional. Tudo que é texto fixo ou foto da barbearia mora aqui.

export interface Foto {
  /** Caminho a partir de /public, ex.: "/fotos/corte-01.jpg". */
  src: string;
  /** Descrição para leitores de tela, ex.: "Degradê com risco lateral". */
  alt: string;
}

export const SITE = {
  nome: "MV Barbearia",
  slogan: "Tradição e estilo em cada corte",
  barbeiro: "Maicon Rodrigues Vaz",
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_BARBEARIA ?? "").replace(/\D/g, ""),

  // Preencha quando o barbeiro passar os dados; enquanto estiverem vazios, o site não mostra o bloco.
  instagram: "" as string, // só o usuário, sem @
  endereco: "" as string,
  mapaUrl: "" as string, // link do Google Maps

  // Fotos reais: coloque os arquivos em /public/fotos e liste aqui.
  retrato: null as Foto | null, // foto do barbeiro na seção "Quem cuida de você"
  galeria: [] as Foto[], // cortes e ambiente; a seção só aparece com pelo menos 3 fotos
};

export function linkWhatsapp(mensagem: string): string | null {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensagem)}` : null;
}
