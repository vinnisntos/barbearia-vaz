import Link from "next/link";
import type { ReactNode } from "react";
import { formatarDuracao, formatarReais } from "@/lib/formato";
import { linkWhatsapp, SITE } from "@/lib/site";
import { Simbolo, TracosSimbolo } from "./Logo";
import { Marca } from "./Marca";

export interface ServicoVitrine {
  id: string;
  nome: string;
  preco: number;
  duracaoMinutos: number;
}

export interface HorarioDia {
  diaSemana: number;
  abre: string;
  fecha: string;
}

const botao =
  "inline-flex min-h-13 items-center justify-center gap-2 rounded-xl px-7 text-base font-semibold transition-colors";
const botaoOuro = `${botao} bg-amarelo text-fundo hover:bg-amarelo-claro`;
const botaoLinha = `${botao} vidro text-texto hover:border-amarelo`;

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Junta dias seguidos com o mesmo horário: "Segunda a sexta · 09:00 às 19:00". */
function agruparHorarios(horarios: HorarioDia[]) {
  const porDia = new Map(horarios.map((h) => [h.diaSemana, `${h.abre} às ${h.fecha}`]));
  // Semana começando na segunda, como o cliente lê.
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const grupos: { de: number; ate: number; texto: string }[] = [];
  for (const dia of ordem) {
    const texto = porDia.get(dia) ?? "Fechado";
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.texto === texto) ultimo.ate = dia;
    else grupos.push({ de: dia, ate: dia, texto });
  }
  return grupos.map((g) => ({
    dias: g.de === g.ate ? DIAS[g.de] : `${DIAS[g.de]} a ${DIAS[g.ate].toLowerCase()}`,
    texto: g.texto,
  }));
}

function Secao({
  id,
  rotulo,
  titulo,
  children,
}: {
  id: string;
  rotulo: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mx-auto w-full max-w-5xl px-5 py-16 sm:py-24">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amarelo">{rotulo}</p>
      <h2
        id={`${id}-titulo`}
        className="mt-2 font-titulo text-4xl font-semibold uppercase leading-none tracking-wide sm:text-5xl"
      >
        {titulo}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

/** Selo circular com o nome girando em volta e o símbolo da marca ao centro. */
function Selo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} role="img" aria-label={`Selo da ${SITE.nome}`}>
      <defs>
        <path id="selo-volta" d="M160,160 m-122,0 a122,122 0 1,1 244,0 a122,122 0 1,1 -244,0" />
      </defs>
      <circle cx="160" cy="160" r="156" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="160" cy="160" r="98" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <g className="selo-gira">
        {/* textLength fecha a volta exata (2π·122 ≈ 766): sem isso o fim do texto atropela o começo. */}
        <text fill="currentColor" fontSize="17" className="font-titulo uppercase" style={{ fontWeight: 700 }}>
          <textPath href="#selo-volta" textLength="752" lengthAdjust="spacing">
            {`${SITE.nome} ✦ ${SITE.slogan} ✦`}
          </textPath>
        </text>
      </g>
      <g transform="translate(92 86) scale(2.2)">
        <TracosSimbolo />
      </g>
    </svg>
  );
}

function IconeWhatsapp() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" />
    </svg>
  );
}

export function Institucional({
  servicos,
  horarios,
}: {
  servicos: ServicoVitrine[];
  horarios: HorarioDia[];
}) {
  const whatsapp = linkWhatsapp(`Olá! Vim pelo site da ${SITE.nome}.`);
  const grupos = agruparHorarios(horarios);
  const temGaleria = SITE.galeria.length >= 3;

  return (
    <>
      {/* Barra fixa: a marca e o botão de agendar sempre à mão. */}
      <header className="vidro-barra sticky top-0 z-20 border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5">
          <Link
            href="/"
            className="flex items-center gap-2 font-titulo text-lg font-extrabold uppercase tracking-[0.06em]"
          >
            <Simbolo className="size-8 shrink-0 text-amarelo" />
            <Marca />
          </Link>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm text-suave md:flex">
            <a href="#servicos" className="hover:text-texto">Serviços</a>
            <a href="#como-funciona" className="hover:text-texto">Como funciona</a>
            <a href="#sobre" className="hover:text-texto">A ótica</a>
            <a href="#contato" className="hover:text-texto">Horários</a>
          </nav>
          <Link
            href="/agendar"
            className="inline-flex min-h-11 items-center rounded-lg bg-amarelo px-4 text-sm font-semibold text-fundo transition-colors hover:bg-amarelo-claro"
          >
            Agendar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="hero relative isolate overflow-hidden">
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-5 pt-14 pb-20 sm:pt-20 sm:pb-28 md:grid-cols-[1.25fr_1fr]">
            <div>
              <p className="vidro inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amarelo-claro">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-amarelo" />
                Óculos · Lentes · Hora marcada
              </p>
              {/* Assinatura como na fachada: prefixo pequeno, nome em peso forte e slogan entre dois traços. */}
              <h1 className="mt-7 font-titulo uppercase leading-none">
                {SITE.prefixo && (
                  <span className="block text-[clamp(0.9rem,3.6vw,1.35rem)] font-bold tracking-[0.32em] text-amarelo">
                    {SITE.prefixo}
                  </span>
                )}
                <span className="hero-marca mt-1 block text-[clamp(2.1rem,10.4vw,3.9rem)] font-extrabold">
                  {SITE.nome}
                </span>
              </h1>
              <p className="mt-3 flex items-center gap-3 font-titulo text-[clamp(0.7rem,3vw,1.05rem)] font-bold uppercase tracking-[0.2em] text-amarelo sm:gap-4">
                <span aria-hidden="true" className="h-1 w-6 shrink-0 bg-amarelo sm:w-10" />
                {SITE.slogan}
                <span aria-hidden="true" className="h-1 w-6 shrink-0 bg-amarelo sm:w-10" />
              </p>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">
                Armações e lentes escolhidas com calma, com a atenção de quem entende do assunto. Você
                escolhe o horário, garante a vaga pelo celular e é atendido sem espera.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/agendar" className={botaoOuro}>
                  Agendar meu horário
                  <span aria-hidden="true">→</span>
                </Link>
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={botaoLinha}>
                    <IconeWhatsapp />
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>

            <div className="relative mx-auto hidden w-full max-w-sm md:block">
              <div aria-hidden="true" className="hero-brilho absolute inset-0 -z-10 rounded-full" />
              <Selo className="w-full text-amarelo" />
            </div>
          </div>

          {/* Selo como marca d'água no celular. */}
          <Selo className="pointer-events-none absolute -right-24 -bottom-24 -z-10 w-80 text-amarelo opacity-[0.13] md:hidden" />
          <div className="faixa-marca" aria-hidden="true" />
        </section>

        {/* DIFERENCIAIS */}
        <section aria-label="Por que agendar pelo site" className="vidro-faixa border-y">
          <ul className="mx-auto grid w-full max-w-5xl divide-y divide-vidro-borda sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              ["Sem cadastro", "Nada de criar conta nem senha para lembrar."],
              [
                "Vaga garantida",
                SITE.cobraPagamento
                  ? "Pagou, o horário é seu. Sem fila e sem desencontro."
                  : "Marcou, o horário é seu. Sem fila e sem desencontro.",
              ],
              [
                "Confirmação na hora",
                SITE.cobraPagamento
                  ? "O Pix cai e a confirmação aparece na tela."
                  : "Escolheu o horário, a confirmação aparece na tela.",
              ],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="px-5 py-7">
                <p className="font-titulo text-xl font-semibold uppercase tracking-wide text-amarelo-claro">
                  {titulo}
                </p>
                <p className="mt-1 text-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* SERVIÇOS */}
        <Secao id="servicos" rotulo="Serviços" titulo="Como podemos ajudar">
          {servicos.length === 0 ? (
            <p className="text-suave">
              A tabela de serviços está sendo atualizada.{" "}
              <Link href="/agendar" className="text-amarelo-claro underline underline-offset-4">
                Veja os horários disponíveis
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicos.map((servico) => (
                <li
                  key={servico.id}
                  className="vidro group flex flex-col rounded-2xl p-6 transition-colors hover:border-amarelo"
                >
                  <h3 className="font-titulo text-2xl font-semibold uppercase tracking-wide">
                    {servico.nome}
                  </h3>
                  <p className="mt-1 text-sm text-suave">{formatarDuracao(servico.duracaoMinutos)}</p>
                  <p className="mt-6 font-titulo text-4xl font-semibold text-amarelo-claro">
                    {servico.preco === 0 ? "Gratuito" : formatarReais(servico.preco)}
                  </p>
                  <Link
                    href="/agendar"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-texto underline-offset-4 group-hover:text-amarelo-claro hover:underline"
                    aria-label={`Agendar ${servico.nome}`}
                  >
                    Agendar <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        {/* COMO FUNCIONA */}
        <div className="vidro-faixa border-y">
          <Secao id="como-funciona" rotulo="Como funciona" titulo="Três passos e pronto">
            <ol className="grid gap-8 sm:grid-cols-3">
              {[
                ["Escolha", "Selecione o serviço, o dia e um horário livre na agenda."],
                [
                  "Garanta",
                  SITE.cobraPagamento
                    ? "Informe seus dados e pague por Pix ou cartão."
                    : "Informe seu nome e WhatsApp. Agendar não tem custo.",
                ],
                ["Apareça", "Chegue no horário marcado. Seu atendimento começa na hora."],
              ].map(([titulo, texto], indice) => (
                <li key={titulo} className="relative pl-16 sm:pl-0">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 font-titulo text-6xl font-semibold leading-none text-amarelo/30 sm:static sm:block sm:text-7xl"
                  >
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-titulo text-2xl font-semibold uppercase tracking-wide sm:mt-3">
                    {titulo}
                  </h3>
                  <p className="mt-1 leading-relaxed text-suave">{texto}</p>
                </li>
              ))}
            </ol>
            <p className="vidro mt-10 rounded-2xl px-5 py-4 text-sm leading-relaxed text-suave">
              <strong className="text-texto">Imprevisto?</strong>{" "}
              {SITE.clienteCancela ? (
                <>
                  Dá para cancelar pelo próprio site até 1 hora antes do horário
                  {SITE.cobraPagamento && ", com estorno de 70% do valor"}.{" "}
                  <Link href="/cancelar" className="text-amarelo-claro underline underline-offset-4">
                    Cancelar meu horário
                  </Link>
                </>
              ) : (
                "Avise a gente com antecedência para liberarmos o horário para outra pessoa."
              )}
            </p>
          </Secao>
        </div>

        {/* A ÓTICA */}
        <Secao id="sobre" rotulo="Quem cuida de você" titulo={SITE.responsavel?.nome ?? `A ${SITE.nome}`}>
          <div className={`grid items-center gap-10 ${SITE.retrato ? "md:grid-cols-[minmax(0,22rem)_1fr]" : ""}`}>
            {SITE.retrato && (
              // eslint-disable-next-line @next/next/no-img-element -- foto enviada pela ótica, servida de /public
              <img
                src={SITE.retrato.src}
                alt={SITE.retrato.alt}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl border border-borda object-cover object-top"
              />
            )}
            <div className="max-w-2xl">
              {SITE.responsavel && (
                <>
                  <p className="-mt-6 font-titulo text-sm font-bold uppercase tracking-[0.18em] text-amarelo-claro">
                    {SITE.responsavel.formacao}
                  </p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {SITE.responsavel.destaques.map((item) => (
                      <li key={item.rotulo} className="vidro rounded-2xl px-5 py-4">
                        <span className="block font-titulo text-2xl font-extrabold text-amarelo">
                          {item.valor}
                        </span>
                        <span className="text-sm text-suave">{item.rotulo}</span>
                      </li>
                    ))}
                  </ul>
                  {SITE.responsavel.bio.map((paragrafo, indice) => (
                    <p
                      key={paragrafo}
                      className={indice === 0 ? "mt-6 text-xl leading-relaxed text-texto" : "mt-4 leading-relaxed text-suave"}
                    >
                      {paragrafo}
                    </p>
                  ))}
                </>
              )}
              <p className={SITE.responsavel ? "mt-4 leading-relaxed text-suave" : "text-xl leading-relaxed text-texto"}>
                Na {SITE.nome}, cada atendimento é feito com calma e atenção. Acreditamos que enxergar
                bem muda o jeito de encarar o dia — por isso o lema da casa:{" "}
                <em className="text-amarelo-claro not-italic">{SITE.slogan.toLowerCase()}</em>.
              </p>
              <p className="mt-4 leading-relaxed text-suave">
                Atendimento com hora marcada, sem pressa e sem fila. Você é atendido no horário que
                escolheu, do começo ao fim, pela mesma pessoa.
              </p>
              <Link href="/agendar" className={`${botaoOuro} mt-8`}>
                Quero meu horário
              </Link>
            </div>
          </div>
        </Secao>

        {/* GALERIA: só aparece quando houver fotos reais em src/lib/site.ts */}
        {temGaleria && (
          <div className="vidro-faixa border-t">
            <Secao id="galeria" rotulo="Galeria" titulo="Nosso espaço">
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {SITE.galeria.map((foto) => (
                  <li key={foto.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos enviadas pela ótica, servidas de /public */}
                    <img
                      src={foto.src}
                      alt={foto.alt}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl border border-borda object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Secao>
          </div>
        )}

        {/* HORÁRIOS E CONTATO */}
        <div className="vidro-faixa border-t">
          <Secao id="contato" rotulo="Horários e contato" titulo="Passa lá">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="font-titulo text-xl font-semibold uppercase tracking-wide text-amarelo-claro">
                  Funcionamento
                </h3>
                <dl className="mt-4 divide-y divide-borda border-y border-borda">
                  {grupos.map((grupo) => (
                    <div key={grupo.dias} className="flex items-baseline justify-between gap-4 py-3">
                      <dt>{grupo.dias}</dt>
                      <dd className={grupo.texto === "Fechado" ? "text-suave" : "font-semibold tabular-nums"}>
                        {grupo.texto}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="font-titulo text-xl font-semibold uppercase tracking-wide text-amarelo-claro">
                  Fale com a gente
                </h3>
                {SITE.endereco && (
                  <p className="mt-4 leading-relaxed">
                    {SITE.endereco}
                    {SITE.mapaUrl && (
                      <>
                        {" · "}
                        <a
                          href={SITE.mapaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amarelo-claro underline underline-offset-4"
                        >
                          Ver no mapa
                        </a>
                      </>
                    )}
                  </p>
                )}
                <p className="mt-4 leading-relaxed text-suave">
                  Dúvida sobre serviço, horário ou produto? Chama no WhatsApp. Para garantir a vaga, o
                  caminho mais rápido é agendar pelo site.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
                  <Link href="/agendar" className={botaoOuro}>
                    Agendar meu horário
                  </Link>
                  {whatsapp && (
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={botaoLinha}>
                      <IconeWhatsapp />
                      WhatsApp
                    </a>
                  )}
                </div>
                {SITE.instagram && (
                  <p className="mt-5 text-suave">
                    Instagram:{" "}
                    <a
                      href={`https://instagram.com/${SITE.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amarelo-claro underline underline-offset-4"
                    >
                      @{SITE.instagram}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </Secao>
        </div>
      </main>

      <footer className="border-t border-borda">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 py-8 text-sm text-suave sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-titulo text-base font-extrabold uppercase tracking-[0.06em] text-texto">
              <Marca />
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            {SITE.slogan}
          </p>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/agendar" className="inline-flex min-h-11 items-center hover:text-texto">
              Agendar
            </Link>
            {SITE.clienteCancela && (
              <Link href="/cancelar" className="inline-flex min-h-11 items-center hover:text-texto">
                Cancelar horário
              </Link>
            )}
            <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-texto">
              Área da ótica
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
