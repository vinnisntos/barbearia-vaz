"use client";

import { api } from "@/lib/api";
import {
  formatarDiaLongo,
  formatarHora,
  mesCurto,
  numeroDoDia,
  semanaCurta,
} from "@/lib/formato";
import { useRecurso } from "@/lib/hooks";
import { Carregando, ErroComRetentativa } from "./ui";

export function SeletorHorario({
  dias,
  hoje,
  dia,
  aoMudarDia,
  servicosIds,
  horario,
  aoEscolher,
}: {
  dias: string[];
  hoje: string;
  dia: string;
  aoMudarDia: (dia: string) => void;
  servicosIds: string[];
  horario: string | null;
  aoEscolher: (horario: string) => void;
}) {
  const chave = servicosIds.length > 0 ? `${dia}|${servicosIds.join(",")}` : null;
  const { dados, erro, carregando, recarregar } = useRecurso(chave, (sinal) =>
    api.disponibilidade(dia, servicosIds, sinal),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-sm font-medium text-suave">Dia</h2>
        <ul className="sem-barra-rolagem -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1">
          {dias.map((d) => {
            const ativo = d === dia;
            return (
              <li key={d} className="snap-start">
                <button
                  type="button"
                  aria-pressed={ativo}
                  aria-label={`${d === hoje ? "Hoje, " : ""}${formatarDiaLongo(d)}`}
                  onClick={() => aoMudarDia(d)}
                  className={`flex h-[4.5rem] w-14 flex-col items-center justify-center rounded-xl border text-sm transition-colors ${
                    ativo
                      ? "border-ouro bg-ouro text-fundo"
                      : "border-borda bg-superficie text-texto hover:border-ouro"
                  }`}
                >
                  <span className="text-xs uppercase">
                    {d === hoje ? "hoje" : semanaCurta(d)}
                  </span>
                  <span className="text-xl font-semibold leading-tight">
                    {numeroDoDia(d)}
                  </span>
                  <span className="text-xs">{mesCurto(d)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-live="polite" aria-busy={carregando}>
        <h2 className="mb-2 text-sm font-medium text-suave">
          Horários em <span className="text-texto">{formatarDiaLongo(dia)}</span>
        </h2>
        {erro ? (
          <ErroComRetentativa mensagem={erro.message} aoTentar={recarregar} />
        ) : !dados || carregando ? (
          <Carregando texto="Buscando horários…" />
        ) : dados.horarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-suave">
            Sem horários neste dia. Tente outro dia.
          </p>
        ) : (
          <ul className="grid grid-cols-4 gap-2">
            {dados.horarios.map((h) => {
              const ativo = h === horario;
              return (
                <li key={h}>
                  <button
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => aoEscolher(h)}
                    className={`min-h-12 w-full rounded-xl border text-base font-semibold tabular-nums transition-colors ${
                      ativo
                        ? "border-ouro bg-ouro text-fundo"
                        : "border-borda bg-superficie text-texto hover:border-ouro"
                    }`}
                  >
                    {formatarHora(h)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
