"use client";

import { useState } from "react";
import { api, paraErroApi, type AgendamentoAdmin, type StatusAgendamento } from "@/lib/api";
import { formatarDiaLongo, formatarHora, formatarReais, somarDias } from "@/lib/formato";
import { useAgora, useHoje, useRecurso } from "@/lib/hooks";
import { SITE } from "@/lib/site";
import { mascararTelefone, soDigitos } from "@/lib/validacao";
import { Aviso, Botao, Carregando, ErroComRetentativa, Modal, Titulo } from "../ui";
import { NavegadorPeriodo, useChamarAdmin } from "./contexto";

// Sem cobrança não há valores, estorno nem "pago": o agendamento só está confirmado ou não.
const COBRA = SITE.cobraPagamento;

const NOME_STATUS: Record<StatusAgendamento, string> = {
  pendente: "Aguardando pagamento",
  pago: COBRA ? "Pago" : "Confirmado",
  cancelado: "Cancelado",
  ausente: "Faltou",
  expirado: "Expirado",
};

const COR_STATUS: Record<StatusAgendamento, string> = {
  pendente: "border-amarelo/60 text-amarelo-claro",
  pago: "border-verde/60 text-verde",
  cancelado: "border-borda text-suave",
  ausente: "border-vermelho/60 text-vermelho",
  expirado: "border-borda text-suave",
};

type Acao = { tipo: "faltou" | "estornar"; agendamento: AgendamentoAdmin };

export function Agenda({
  diaEscolhido,
  aoMudarDia,
  aviso,
}: {
  diaEscolhido: string | null;
  aoMudarDia: (dia: string) => void;
  aviso: string | null;
}) {
  const chamar = useChamarAdmin();
  const hoje = useHoje();
  const dia = diaEscolhido ?? hoje;

  const agenda = useRecurso(dia, (sinal) =>
    chamar((token) => api.admin.listarAgendamentos(token, dia ?? "", sinal)),
  );

  const [acao, setAcao] = useState<Acao | null>(null);
  const [executando, setExecutando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  function abrir(nova: Acao) {
    setErroAcao(null);
    setResultado(null);
    setAcao(nova);
  }

  async function confirmar() {
    if (!acao) return;
    setExecutando(true);
    setErroAcao(null);
    try {
      const { id, nomeCliente } = acao.agendamento;
      if (acao.tipo === "faltou") {
        await chamar((token) => api.admin.marcarFalta(token, id));
        setResultado(`Falta registrada para ${nomeCliente}.`);
      } else {
        const feito = await chamar((token) => api.admin.cancelarEstornar(token, id));
        setResultado(
          feito.valorEstornado > 0
            ? `Agendamento de ${nomeCliente} cancelado. Estorno de ${formatarReais(feito.valorEstornado)} enviado.`
            : `Agendamento de ${nomeCliente} cancelado.`,
        );
      }
      setAcao(null);
      agenda.recarregar();
    } catch (excecao) {
      const erro = paraErroApi(excecao);
      setErroAcao(
        erro.codigo === "ESTORNO_INDISPONIVEL"
          ? "O estorno falhou (provavelmente falta saldo na conta Asaas). O agendamento continua como está."
          : erro.message,
      );
      if (erro.codigo === "STATUS_INVALIDO" || erro.codigo === "HORARIO_FUTURO") agenda.recarregar();
    } finally {
      setExecutando(false);
    }
  }

  // A falta só pode ser marcada depois que o horário começou (o backend aplica a mesma regra).
  const agora = useAgora(30_000);
  const jaComecou = (a: AgendamentoAdmin) => agora !== null && Date.parse(a.dataInicio) <= agora;

  if (!dia || !hoje) return <Carregando />;

  const lista = [...(agenda.dados ?? [])].sort(
    (a, b) => Date.parse(a.dataInicio) - Date.parse(b.dataInicio),
  );

  return (
    <>
      <Titulo>Agenda do dia</Titulo>

      <NavegadorPeriodo
        rotulo={formatarDiaLongo(dia)}
        nomeAnterior="Dia anterior"
        nomeProximo="Próximo dia"
        aoAnterior={() => aoMudarDia(somarDias(dia, -1))}
        aoProximo={() => aoMudarDia(somarDias(dia, 1))}
      >
        {dia === hoje ? (
          <p className="text-sm text-amarelo-claro">Hoje</p>
        ) : (
          <button
            type="button"
            onClick={() => aoMudarDia(hoje)}
            className="min-h-11 px-3 text-sm text-amarelo-claro underline underline-offset-4"
          >
            Voltar para hoje
          </button>
        )}
      </NavegadorPeriodo>

      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      {resultado && <Aviso tipo="sucesso">{resultado}</Aviso>}

      <div aria-live="polite" aria-busy={agenda.carregando} className="flex flex-col gap-3">
        {agenda.erro ? (
          <ErroComRetentativa mensagem={agenda.erro.message} aoTentar={agenda.recarregar} />
        ) : !agenda.dados ? (
          <Carregando texto="Carregando agenda…" />
        ) : lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda px-4 py-8 text-center text-suave">
            Nenhum agendamento neste dia.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lista.map((a) => (
              <li key={a.id} className="vidro rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-titulo text-2xl tabular-nums">
                    {formatarHora(a.dataInicio)}
                    <span className="text-base text-suave"> – {formatarHora(a.dataFim)}</span>
                  </p>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${COR_STATUS[a.status]}`}
                  >
                    {NOME_STATUS[a.status]}
                  </span>
                </div>
                <p className="mt-1 font-semibold break-words">{a.nomeCliente}</p>
                <p className="text-sm break-words text-suave">{a.servicosResumo}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
                  {COBRA && (
                    <span className="font-semibold text-amarelo-claro">
                      {formatarReais(a.valorTotal)}
                    </span>
                  )}
                  <span className="text-suave">{a.origem === "balcao" ? "Pela loja" : "Pelo site"}</span>
                  {a.telefoneCliente && (
                    <a
                      href={`https://wa.me/55${soDigitos(a.telefoneCliente)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-amarelo-claro underline underline-offset-4"
                    >
                      {mascararTelefone(a.telefoneCliente)}
                    </a>
                  )}
                </p>
                {a.status === "pago" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Botao
                      variante="secundario"
                      className="px-2 text-sm"
                      disabled={!jaComecou(a)}
                      title={jaComecou(a) ? undefined : "Disponível depois do horário do agendamento"}
                      onClick={() => abrir({ tipo: "faltou", agendamento: a })}
                    >
                      Faltou
                    </Botao>
                    <Botao
                      variante="perigo"
                      className="px-2 text-sm"
                      onClick={() => abrir({ tipo: "estornar", agendamento: a })}
                    >
                      {COBRA ? "Cancelar e estornar" : "Cancelar"}
                    </Botao>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {acao && (
        <Modal
          titulo={acao.tipo === "faltou" ? "Marcar falta?" : COBRA ? "Cancelar e estornar?" : "Cancelar agendamento?"}
          aoFechar={() => !executando && setAcao(null)}
        >
          <p className="leading-relaxed text-suave">
            <strong className="text-texto">{acao.agendamento.nomeCliente}</strong>,{" "}
            {formatarHora(acao.agendamento.dataInicio)} · {acao.agendamento.servicosResumo}
          </p>
          <p className="leading-relaxed">
            {!COBRA
              ? acao.tipo === "faltou"
                ? "O cliente não veio. O agendamento fica registrado como falta."
                : "O horário é liberado para outro cliente. Não dá para desfazer."
              : acao.tipo === "faltou"
              ? `O cliente não veio. O valor de ${formatarReais(acao.agendamento.valorTotal)} fica retido, sem estorno.`
              : acao.agendamento.origem === "app"
                ? `O cliente recebe de volta 100% (${formatarReais(acao.agendamento.valorTotal)}) e o horário é liberado. Não dá para desfazer.`
                : "Agendamento de balcão: o horário é liberado e nenhum estorno é feito pelo sistema. Não dá para desfazer."}
          </p>
          {erroAcao && <Aviso tipo="erro">{erroAcao}</Aviso>}
          <div className="flex flex-col gap-3">
            <Botao
              variante={acao.tipo === "faltou" ? "primario" : "perigo"}
              ocupado={executando}
              onClick={confirmar}
            >
              {acao.tipo === "faltou" ? "Confirmar falta" : COBRA ? "Cancelar e estornar" : "Cancelar agendamento"}
            </Botao>
            <Botao variante="secundario" disabled={executando} onClick={() => setAcao(null)}>
              Voltar
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}
