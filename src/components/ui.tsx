"use client";

import Link from "next/link";
import { Simbolo } from "./Logo";
import { Marca } from "./Marca";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";

type Variante = "primario" | "secundario" | "perigo" | "fantasma";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variantes: Record<Variante, string> = {
  primario: "bg-amarelo text-fundo hover:bg-amarelo-claro",
  secundario: "border border-borda bg-relevo text-texto hover:border-amarelo",
  perigo: "bg-perigo text-white hover:bg-[#c9342b]",
  fantasma: "text-amarelo-claro underline-offset-4 hover:underline",
};

export function classesBotao(variante: Variante = "primario", extra = ""): string {
  return `${base} ${variantes[variante]} ${extra}`;
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  ocupado?: boolean;
}

export function Botao({
  variante = "primario",
  ocupado = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={classesBotao(variante, className)}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
      {...resto}
    >
      {ocupado && <Girando />}
      {children}
    </button>
  );
}

export function Girando({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <p role="status" className="flex items-center justify-center gap-3 py-8 text-suave">
      <Girando />
      {texto}
    </p>
  );
}

type TipoAviso = "erro" | "alerta" | "info" | "sucesso";

const coresAviso: Record<TipoAviso, string> = {
  erro: "border-vermelho/60 bg-vermelho/10 text-texto",
  alerta: "border-amarelo/60 bg-amarelo/10 text-texto",
  info: "border-borda bg-relevo text-suave",
  sucesso: "border-verde/60 bg-verde/10 text-texto",
};

export function Aviso({
  tipo = "info",
  children,
  acao,
}: {
  tipo?: TipoAviso;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div
      role={tipo === "erro" || tipo === "alerta" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${coresAviso[tipo]}`}
    >
      <div>{children}</div>
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

/** Erro de carregamento com botão de tentar de novo. */
export function ErroComRetentativa({
  mensagem,
  aoTentar,
}: {
  mensagem: string;
  aoTentar: () => void;
}) {
  return (
    <Aviso
      tipo="erro"
      acao={
        <Botao variante="secundario" onClick={aoTentar}>
          Tentar de novo
        </Botao>
      }
    >
      {mensagem}
    </Aviso>
  );
}

interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  rotulo: string;
  erro?: string | null;
  ajuda?: ReactNode;
}

export function Campo({ rotulo, erro, ajuda, className = "", ...resto }: CampoProps) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  const descritoPor = [erro ? idErro : null, ajuda ? idAjuda : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-texto">
        {rotulo}
        {resto.required === false && (
          <span className="font-normal text-suave"> (opcional)</span>
        )}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor || undefined}
        className={`min-h-12 w-full rounded-xl border bg-superficie px-4 text-base text-texto placeholder:text-suave/60 ${
          erro ? "border-vermelho" : "border-borda"
        } ${className}`}
        {...resto}
      />
      {ajuda && (
        <p id={idAjuda} className="text-sm leading-relaxed text-suave">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm text-vermelho">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Modal próprio sobre <dialog>: foco preso, Esc fecha, fundo escurecido. */
export function Modal({
  titulo,
  children,
  aoFechar,
}: {
  titulo: string;
  children: ReactNode;
  aoFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (!dialogo.open) dialogo.showModal();
    return () => {
      if (dialogo.open) dialogo.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault();
        aoFechar();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-borda bg-superficie p-5 text-texto backdrop:bg-black/75"
    >
      <h2 id={idTitulo} className="font-titulo text-xl uppercase tracking-wide">
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </dialog>
  );
}

export function Cabecalho({ subtitulo }: { subtitulo?: string }) {
  return (
    <header className="px-4 pt-6 pb-2 text-center">
      <Link href="/" className="inline-block rounded-lg px-2 py-1">
        <span className="flex items-center justify-center gap-2.5 font-titulo text-2xl font-extrabold uppercase tracking-[0.06em] text-texto">
          <Simbolo className="size-9 shrink-0 text-amarelo" />
          <Marca />
        </span>
      </Link>
      {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
    </header>
  );
}

export function Pagina({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10">
      {children}
    </main>
  );
}

/** Título da tela. Aceita ref para receber foco quando a etapa muda. */
export function Titulo({
  children,
  ref,
}: {
  children: ReactNode;
  ref?: Ref<HTMLHeadingElement>;
}) {
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className="rounded font-titulo text-2xl font-medium uppercase tracking-wide text-texto"
    >
      {children}
    </h1>
  );
}

export function Cartao({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-borda bg-superficie p-4 ${className}`}>
      {children}
    </div>
  );
}
