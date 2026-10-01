import Link from "next/link";
import type { ReactNode } from "react";
import { formatarDuracao, formatarReais } from "@/lib/formato";
import { linkWhatsapp, SITE } from "@/lib/site";

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
const botaoOuro = `${botao} bg-ouro text-fundo hover:bg-ouro-claro`;
const botaoLinha = `${botao} border border-borda bg-fundo/40 text-texto backdrop-blur hover:border-ouro`;

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
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-ouro">{rotulo}</p>
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

/** Selo circular com o nome girando em volta e tesoura ao centro. */
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
        <text fill="currentColor" fontSize="20" className="font-titulo uppercase" style={{ fontWeight: 600 }}>
          <textPath href="#selo-volta" textLength="752" lengthAdjust="spacing">
            BARBEARIA VAZ ✦ AUTOESTIMA LÁ EM CIMA ✦
          </textPath>
        </text>
      </g>
      {/* tesoura */}
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="128" cy="206" r="17" />
        <circle cx="192" cy="206" r="17" />
        <path d="M139 192 L194 104" />
        <path d="M181 192 L126 104" />
      </g>
      <circle cx="160" cy="158" r="4.5" fill="currentColor" />
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
  const [primeiroNome] = SITE.barbeiro.split(" ");
  const temGaleria = SITE.galeria.length >= 3;

  return (
    <>
      {/* Barra fixa: a marca e o botão de agendar sempre à mão. */}
      <header className="sticky top-0 z-20 border-b border-borda/60 bg-fundo/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-5">
          <Link href="/" className="font-titulo text-xl font-semibold uppercase tracking-[0.18em]">
            Barbearia <span className="text-ouro">Vaz</span>
          </Link>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm text-suave md:flex">
            <a href="#servicos" className="hover:text-texto">Serviços</a>
            <a href="#como-funciona" className="hover:text-texto">Como funciona</a>
            <a href="#barbeiro" className="hover:text-texto">O barbeiro</a>
            <a href="#contato" className="hover:text-texto">Horários</a>
          </nav>
          <Link
            href="/agendar"
            className="inline-flex min-h-11 items-center rounded-lg bg-ouro px-4 text-sm font-semibold text-fundo transition-colors hover:bg-ouro-claro"
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
              <p className="inline-flex items-center gap-2 rounded-full border border-borda bg-fundo/50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-ouro-claro backdrop-blur">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-ouro" />
                Corte · Barba · Atitude
              </p>
              <h1 className="mt-6 font-titulo font-semibold uppercase leading-[0.9] tracking-wide">
                <span className="block text-[clamp(2.75rem,13vw,5.5rem)] text-texto">Barbearia</span>
                <span className="hero-vaz block text-[clamp(5.5rem,30vw,12.5rem)]">Vaz</span>
              </h1>
              <p className="mt-5 flex items-center gap-4 font-titulo text-2xl font-medium uppercase tracking-[0.14em] text-texto sm:text-3xl">
                <span aria-hidden="true" className="h-px w-10 shrink-0 bg-ouro sm:w-16" />
                {SITE.slogan}
              </p>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-suave">
                Corte na régua e barba alinhada com {SITE.barbeiro}. Você escolhe o horário, garante
                a vaga pelo celular e chega só para sentar na cadeira.
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
              <Selo className="w-full text-ouro" />
            </div>
          </div>

          {/* Selo como marca d'água no celular. */}
          <Selo className="pointer-events-none absolute -right-24 -bottom-24 -z-10 w-80 text-ouro opacity-[0.13] md:hidden" />
          <div className="faixa-barbeiro" aria-hidden="true" />
        </section>

        {/* DIFERENCIAIS */}
        <section aria-label="Por que agendar pelo site" className="border-b border-borda bg-superficie">
          <ul className="mx-auto grid w-full max-w-5xl gap-px bg-borda sm:grid-cols-3">
            {[
              ["Sem cadastro", "Nada de criar conta nem senha para lembrar."],
              ["Vaga garantida", "Pagou, o horário é seu. Sem fila e sem desencontro."],
              ["Confirmação na hora", "O Pix cai e a confirmação aparece na tela."],
            ].map(([titulo, texto]) => (
              <li key={titulo} className="bg-superficie px-5 py-7">
                <p className="font-titulo text-xl font-semibold uppercase tracking-wide text-ouro-claro">
                  {titulo}
                </p>
                <p className="mt-1 text-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* SERVIÇOS */}
        <Secao id="servicos" rotulo="Serviços" titulo="O que a gente faz">
          {servicos.length === 0 ? (
            <p className="text-suave">
              A tabela de serviços está sendo atualizada.{" "}
              <Link href="/agendar" className="text-ouro-claro underline underline-offset-4">
                Veja os horários disponíveis
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicos.map((servico) => (
                <li
                  key={servico.id}
                  className="group flex flex-col rounded-2xl border border-borda bg-superficie p-6 transition-colors hover:border-ouro"
                >
                  <h3 className="font-titulo text-2xl font-semibold uppercase tracking-wide">
                    {servico.nome}
                  </h3>
                  <p className="mt-1 text-sm text-suave">{formatarDuracao(servico.duracaoMinutos)}</p>
                  <p className="mt-6 font-titulo text-4xl font-semibold text-ouro-claro">
                    {formatarReais(servico.preco)}
                  </p>
                  <Link
                    href="/agendar"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-texto underline-offset-4 group-hover:text-ouro-claro hover:underline"
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
        <div className="border-y border-borda bg-superficie">
          <Secao id="como-funciona" rotulo="Como funciona" titulo="Três passos e pronto">
            <ol className="grid gap-8 sm:grid-cols-3">
              {[
                ["Escolha", "Selecione o serviço, o dia e um horário livre na agenda."],
                ["Garanta", "Informe seus dados e pague por Pix ou cartão."],
                ["Apareça", "Chegue no horário marcado. A cadeira já está te esperando."],
              ].map(([titulo, texto], indice) => (
                <li key={titulo} className="relative pl-16 sm:pl-0">
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 font-titulo text-6xl font-semibold leading-none text-ouro/30 sm:static sm:block sm:text-7xl"
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
            <p className="mt-10 rounded-2xl border border-borda bg-fundo px-5 py-4 text-sm leading-relaxed text-suave">
              <strong className="text-texto">Imprevisto?</strong> Dá para cancelar pelo próprio site até 1
              hora antes do horário, com estorno de 70% do valor.{" "}
              <Link href="/cancelar" className="text-ouro-claro underline underline-offset-4">
                Cancelar meu horário
              </Link>
            </p>
          </Secao>
        </div>

        {/* O BARBEIRO */}
        <Secao id="barbeiro" rotulo="Quem cuida de você" titulo={SITE.barbeiro}>
          <div className={`grid items-center gap-10 ${SITE.retrato ? "md:grid-cols-[minmax(0,22rem)_1fr]" : ""}`}>
            {SITE.retrato && (
              // eslint-disable-next-line @next/next/no-img-element -- foto enviada pelo barbeiro, servida de /public
              <img
                src={SITE.retrato.src}
                alt={SITE.retrato.alt}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl border border-borda object-cover"
              />
            )}
            <div className="max-w-2xl">
              <p className="text-xl leading-relaxed text-texto">
                Na {SITE.nome}, cada corte é feito com calma e capricho. O {primeiroNome} acredita que
                sair da cadeira bem cuidado muda o jeito de encarar o dia — por isso o lema da casa:{" "}
                <em className="text-ouro-claro not-italic">{SITE.slogan.toLowerCase()}</em>.
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
          <div className="border-t border-borda bg-superficie">
            <Secao id="galeria" rotulo="Galeria" titulo="Saindo da cadeira">
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {SITE.galeria.map((foto) => (
                  <li key={foto.src}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos enviadas pelo barbeiro, servidas de /public */}
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
        <div className="border-t border-borda bg-superficie">
          <Secao id="contato" rotulo="Horários e contato" titulo="Passa lá">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="font-titulo text-xl font-semibold uppercase tracking-wide text-ouro-claro">
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
                <h3 className="font-titulo text-xl font-semibold uppercase tracking-wide text-ouro-claro">
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
                          className="text-ouro-claro underline underline-offset-4"
                        >
                          Ver no mapa
                        </a>
                      </>
                    )}
                  </p>
                )}
                <p className="mt-4 leading-relaxed text-suave">
                  Dúvida sobre serviço, horário ou encaixe? Chama no WhatsApp. Para garantir a vaga, o
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
                      className="text-ouro-claro underline underline-offset-4"
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
            <span className="font-titulo text-base font-semibold uppercase tracking-[0.18em] text-texto">
              Barbearia <span className="text-ouro">Vaz</span>
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
            <Link href="/cancelar" className="inline-flex min-h-11 items-center hover:text-texto">
              Cancelar horário
            </Link>
            <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-texto">
              Área do barbeiro
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
