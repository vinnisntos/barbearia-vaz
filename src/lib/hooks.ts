"use client";

import { useCallback, useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";
import { ErroApi, foiAbortado, paraErroApi } from "./api";
import { diaEmSaoPaulo } from "./formato";

interface EstadoRecurso<T> {
  chave: string;
  versao: number;
  dados?: T;
  erro?: ErroApi;
}

export interface Recurso<T> {
  dados: T | undefined;
  erro: ErroApi | undefined;
  carregando: boolean;
  recarregar: () => void;
}

/**
 * Busca dados sempre que `chave` muda (null = não buscar).
 * Ao recarregar a mesma chave, os dados antigos continuam visíveis.
 */
export function useRecurso<T>(
  chave: string | null,
  buscar: (sinal: AbortSignal) => Promise<T>,
): Recurso<T> {
  const [estado, setEstado] = useState<EstadoRecurso<T> | null>(null);
  const [versao, setVersao] = useState(0);
  const aoBuscar = useEffectEvent(buscar);

  useEffect(() => {
    if (chave === null) return;
    const controle = new AbortController();
    aoBuscar(controle.signal).then(
      (dados) => {
        if (!controle.signal.aborted) setEstado({ chave, versao, dados });
      },
      (erro: unknown) => {
        if (controle.signal.aborted || foiAbortado(erro)) return;
        setEstado({ chave, versao, erro: paraErroApi(erro) });
      },
    );
    return () => controle.abort();
  }, [chave, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  const daChave = chave !== null && estado?.chave === chave ? estado : null;
  const emDia = daChave?.versao === versao;
  return {
    dados: daChave?.dados,
    erro: emDia ? daChave?.erro : undefined,
    carregando: chave !== null && !emDia,
    recarregar,
  };
}

/**
 * Relógio do cliente, arredondado para `passoMs`. No servidor (e na hidratação)
 * devolve null, para não haver divergência de HTML.
 */
export function useAgora(passoMs = 1000): number | null {
  const assinar = useCallback(
    (avisar: () => void) => {
      const id = window.setInterval(avisar, Math.min(passoMs, 1000));
      return () => window.clearInterval(id);
    },
    [passoMs],
  );
  return useSyncExternalStore(
    assinar,
    () => Math.floor(Date.now() / passoMs) * passoMs,
    () => null,
  );
}

/** Dia de hoje (YYYY-MM-DD) em São Paulo; null até hidratar. */
export function useHoje(): string | null {
  const agora = useAgora(30_000);
  return agora === null ? null : diaEmSaoPaulo(agora);
}
