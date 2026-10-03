"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatarMes, formatarReais, somarMeses } from "@/lib/formato";
import { useHoje, useRecurso } from "@/lib/hooks";
import { Carregando, ErroComRetentativa, Titulo } from "../ui";
import { NavegadorPeriodo, useChamarAdmin } from "./contexto";

export function Dashboard() {
  const chamar = useChamarAdmin();
  const hoje = useHoje();
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);
  const mes = mesEscolhido ?? hoje?.slice(0, 7) ?? null;

  const painel = useRecurso(mes, (sinal) =>
    chamar((token) => api.admin.dashboard(token, mes ?? "", sinal)),
  );

  if (!mes) return <Carregando />;
  const dados = painel.dados;

  return (
    <>
      <Titulo>Resumo do mês</Titulo>

      <NavegadorPeriodo
        rotulo={formatarMes(mes)}
        nomeAnterior="Mês anterior"
        nomeProximo="Próximo mês"
        aoAnterior={() => setMesEscolhido(somarMeses(mes, -1))}
        aoProximo={() => setMesEscolhido(somarMeses(mes, 1))}
      />

      <div aria-live="polite" aria-busy={painel.carregando} className="flex flex-col gap-3">
        {painel.erro ? (
          <ErroComRetentativa mensagem={painel.erro.message} aoTentar={painel.recarregar} />
        ) : !dados ? (
          <Carregando texto="Calculando…" />
        ) : (
          <dl className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-verde/40 bg-verde/10 p-4">
                <dt className="text-sm text-suave">Entrou</dt>
                <dd className="mt-1 text-xl font-semibold break-words text-verde">
                  {formatarReais(dados.entrou)}
                </dd>
              </div>
              <div className="rounded-2xl border border-vermelho/40 bg-vermelho/10 p-4">
                <dt className="text-sm text-suave">Saiu</dt>
                <dd className="mt-1 text-xl font-semibold break-words text-vermelho">
                  {formatarReais(dados.saiu)}
                </dd>
              </div>
            </div>
            <div className="vidro rounded-2xl border-2 border-amarelo p-4">
              <dt className="text-sm text-suave">Lucro líquido</dt>
              <dd
                className={`mt-1 font-titulo text-4xl break-words ${
                  dados.lucroLiquido < 0 ? "text-vermelho" : "text-texto"
                }`}
              >
                {formatarReais(dados.lucroLiquido)}
              </dd>
              <p className="mt-2 text-sm leading-relaxed text-suave">
                Entradas já descontam tarifas e estornos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="vidro rounded-2xl p-4">
                <dt className="text-sm text-suave">Agendamentos</dt>
                <dd className="mt-1 text-2xl font-semibold">{dados.totalAgendamentos}</dd>
              </div>
              <div className="vidro rounded-2xl p-4">
                <dt className="text-sm text-suave">Faltas</dt>
                <dd className="mt-1 text-2xl font-semibold">{dados.totalAusentes}</dd>
              </div>
            </div>
          </dl>
        )}
      </div>
    </>
  );
}
