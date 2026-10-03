// Conteúdo do site institucional. Tudo que é texto fixo ou foto da ótica mora aqui:
// para atender outro cliente, troque os valores abaixo (nenhum componente repete o nome da marca).

export interface Foto {
  /** Caminho a partir de /public, ex.: "/fotos/loja-01.jpg". */
  src: string;
  /** Descrição para leitores de tela, ex.: "Vitrine de armações". */
  alt: string;
}

export interface Responsavel {
  nome: string;
  /** Formação, logo abaixo do nome. */
  formacao: string;
  /** Números de destaque, ex.: { valor: "24 anos", rotulo: "de experiência" }. */
  destaques: { valor: string; rotulo: string }[];
  /** Parágrafos de apresentação. */
  bio: string[];
}

export const SITE = {
  // Palavra pequena acima do nome na assinatura do topo do site (vazio = não aparece).
  prefixo: "Ótica",
  nome: "Lopes Vision",
  // Trecho de `nome` que aparece em amarelo na marca; aqui o nome inteiro, como na fachada.
  destaque: "Lopes Vision",
  slogan: "Muito além dos óculos",
  // Agendamento sem custo: o cliente só reserva o horário. Com `true` volta a cobrança antecipada
  // (Pix/cartão via Asaas), que continua inteira no código, só não é chamada.
  cobraPagamento: false as boolean,
  // Cancelamento pelo próprio cliente (página /cancelar, com WhatsApp + PIN). Com `false` a página
  // e os links somem e só a ótica cancela, pelo painel.
  clienteCancela: false as boolean,
  // Quem atende, na seção "Quem cuida de você". Com `null`, a seção fala só da loja.
  responsavel: {
    nome: "Eder Lopes",
    formacao: "Especialista, bacharel em Optometria",
    destaques: [
      { valor: "24 anos", rotulo: "de experiência em casos ópticos" },
      { valor: "Optometria", rotulo: "bacharelado na área" },
    ],
    bio: [
      "Eder Lopes é especialista graduado, bacharel em Optometria, com 24 anos de experiência em casos ópticos.",
      "Além do atendimento na loja, tem a proposta de transformar outras óticas, levando o conhecimento das dificuldades do ramo em soluções escaláveis e assertivas.",
    ],
  } as Responsavel | null,
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_BARBEARIA ?? "").replace(/\D/g, ""),

  // Preencha quando a ótica passar os dados; enquanto estiverem vazios, o site não mostra o bloco.
  instagram: "" as string, // só o usuário, sem @
  endereco: "Av. Salvador Milego, 450" as string,
  mapaUrl: "" as string, // link do Google Maps

  // Fotos reais: coloque os arquivos em /public/fotos e liste aqui.
  retrato: { src: "/fotos/eder-lopes.jpg", alt: "Eder Lopes na loja, em frente à vitrine de óculos" } as Foto | null, // foto do responsável (ou da loja) na seção "Quem cuida de você"
  galeria: [] as Foto[], // loja, armações e atendimento; a seção só aparece com pelo menos 3 fotos
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
