"use client";

import { useId } from "react";
import type { Servico } from "@/lib/api";
import { formatarDuracao, formatarReais, paraCentavos } from "@/lib/formato";
import { SITE } from "@/lib/site";

export function somarServicos(servicos: Servico[], ids: string[]) {
  const escolhidos = servicos.filter((s) => ids.includes(s.id));
  return {
    escolhidos,
    centavos: escolhidos.reduce((soma, s) => soma + paraCentavos(s.preco), 0),
    minutos: escolhidos.reduce((soma, s) => soma + s.duracaoMinutos, 0),
  };
}

export function SeletorServicos({
  servicos,
  selecionados,
  aoAlternar,
  legenda = "Serviços",
}: {
  servicos: Servico[];
  selecionados: string[];
  aoAlternar: (id: string) => void;
  legenda?: string;
}) {
  // Um serviço por agendamento: combos são serviços próprios, com preço próprio.
  const grupo = useId();
  return (
    <fieldset>
      <legend className="sr-only">{legenda}</legend>
      <ul className="flex flex-col gap-3">
        {servicos.map((servico) => (
          <li key={servico.id}>
            <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-borda bg-superficie px-4 py-3 transition-colors has-checked:border-amarelo has-checked:bg-relevo has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-amarelo-claro">
              <input
                type="radio"
                name={grupo}
                className="peer sr-only"
                checked={selecionados.includes(servico.id)}
                onChange={() => aoAlternar(servico.id)}
              />
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-borda text-transparent peer-checked:border-amarelo peer-checked:bg-amarelo peer-checked:text-fundo"
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="none">
                  <path
                    d="M3 8.5l3.2 3L13 4.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium break-words">{servico.nome}</span>
                <span className="block text-sm text-suave">
                  {formatarDuracao(servico.duracaoMinutos)}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-amarelo-claro">
                {SITE.cobraPagamento ? formatarReais(servico.preco) : "Gratuito"}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
