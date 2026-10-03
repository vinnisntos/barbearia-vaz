"use client";

import { createContext, useContext } from "react";

/** Executa uma chamada admin com o token atual; em 401 derruba a sessão. */
export type ChamarAdmin = <T>(chamada: (token: string) => Promise<T>) => Promise<T>;

export const ContextoAdmin = createContext<ChamarAdmin | null>(null);

export function useChamarAdmin(): ChamarAdmin {
  const chamar = useContext(ContextoAdmin);
  if (!chamar) throw new Error("useChamarAdmin fora do Painel");
  return chamar;
}

/** Navegação "anterior / rótulo / próximo" usada para dias e meses. */
export function NavegadorPeriodo({
  rotulo,
  nomeAnterior,
  nomeProximo,
  aoAnterior,
  aoProximo,
  children,
}: {
  rotulo: string;
  nomeAnterior: string;
  nomeProximo: string;
  aoAnterior: () => void;
  aoProximo: () => void;
  children?: React.ReactNode;
}) {
  const classeSeta =
    "flex size-12 shrink-0 items-center justify-center vidro rounded-xl text-xl hover:border-amarelo";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={classeSeta} aria-label={nomeAnterior} onClick={aoAnterior}>
        <span aria-hidden="true">‹</span>
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p aria-live="polite" className="font-medium first-letter:uppercase">
          {rotulo}
        </p>
        {children}
      </div>
      <button type="button" className={classeSeta} aria-label={nomeProximo} onClick={aoProximo}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}
