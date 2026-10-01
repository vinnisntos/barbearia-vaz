// Conteúdo do site institucional. Tudo que é texto fixo ou foto da barbearia mora aqui:
// para atender outro cliente, troque os valores abaixo (nenhum componente repete o nome da marca).

export interface Foto {
  /** Caminho a partir de /public, ex.: "/fotos/corte-01.jpg". */
  src: string;
  /** Descrição para leitores de tela, ex.: "Degradê com risco lateral". */
  alt: string;
}

export const SITE = {
  nome: "Barbearia Modelo",
  // Trecho de `nome` que aparece em ouro na marca e em letras grandes no topo do site.
  destaque: "Modelo",
  slogan: "Tradição e estilo em cada corte",
  barbeiro: "João Silva",
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_BARBEARIA ?? "").replace(/\D/g, ""),

  // Preencha quando o barbeiro passar os dados; enquanto estiverem vazios, o site não mostra o bloco.
  instagram: "" as string, // só o usuário, sem @
  endereco: "" as string,
  mapaUrl: "" as string, // link do Google Maps

  // Fotos reais: coloque os arquivos em /public/fotos e liste aqui.
  retrato: null as Foto | null, // foto do barbeiro na seção "Quem cuida de você"
  galeria: [] as Foto[], // cortes e ambiente; a seção só aparece com pelo menos 3 fotos
};

/** Divide o nome da marca em trechos, marcando o que vai em destaque. Sem destaque válido, o nome sai inteiro. */
export function partesDoNome(): { texto: string; destaque: boolean }[] {
  const inicio = SITE.destaque ? SITE.nome.indexOf(SITE.destaque) : -1;
  if (inicio < 0) return [{ texto: SITE.nome, destaque: false }];
  const fim = inicio + SITE.destaque.length;
  return [
    { texto: SITE.nome.slice(0, inicio).trim(), destaque: false },
    { texto: SITE.destaque, destaque: true },
    { texto: SITE.nome.slice(fim).trim(), destaque: false },
  ].filter((parte) => parte.texto);
}

export function linkWhatsapp(mensagem: string): string | null {
  return SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensagem)}` : null;
}
