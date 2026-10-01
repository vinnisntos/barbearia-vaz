"use client";

import { useState, type FormEvent } from "react";
import { api, paraErroApi } from "@/lib/api";
import {
  diaEmSaoPaulo,
  formatarCentavos,
  formatarDataHora,
  formatarDuracao,
  somarDias,
} from "@/lib/formato";
import { useHoje, useRecurso } from "@/lib/hooks";
import { mascararTelefone, soDigitos, telefoneValido } from "@/lib/validacao";
import { SeletorHorario } from "../SeletorHorario";
import { SeletorServicos, somarServicos } from "../SeletorServicos";
import { Aviso, Botao, Campo, Carregando, ErroComRetentativa, Titulo } from "../ui";
import { useChamarAdmin } from "./contexto";

const DIAS_A_FRENTE = 14;

export function Balcao({ aoCriar }: { aoCriar: (dia: string, aviso: string) => void }) {
  const chamar = useChamarAdmin();
  const hoje = useHoje();
  const servicos = useRecurso("servicos", (sinal) => api.listarServicos(sinal));

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  // Muda a cada 409 para remontar o seletor e buscar os horários de novo.
  const [rodada, setRodada] = useState(0);
  const [validar, setValidar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { escolhidos, centavos, minutos } = somarServicos(servicos.dados ?? [], selecionados);
  const dias = hoje ? Array.from({ length: DIAS_A_FRENTE }, (_, i) => somarDias(hoje, i)) : [];
  const dia = diaEscolhido && dias.includes(diaEscolhido) ? diaEscolhido : hoje;

  const temTelefone = soDigitos(telefone).length > 0;
  const erros = {
    nome: nome.trim().length < 2 ? "Informe o nome do cliente." : null,
    telefone: temTelefone && !telefoneValido(telefone) ? "Telefone inválido. Use DDD + número." : null,
    servicos: selecionados.length === 0 ? "Escolha um serviço." : null,
    horario: horario ? null : "Escolha um horário.",
  };

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setValidar(true);
    setErro(null);
    if (erros.nome || erros.telefone || erros.servicos || !horario || enviando) return;

    setEnviando(true);
    try {
      await chamar((token) =>
        api.admin.criarBalcao(token, {
          nome: nome.trim(),
          ...(temTelefone ? { telefone } : {}),
          servicosIds: selecionados,
          dataInicio: horario,
        }),
      );
      aoCriar(
        diaEmSaoPaulo(horario),
        `Agendamento de ${nome.trim()} criado para ${formatarDataHora(horario)}.`,
      );
    } catch (excecao) {
      const falha = paraErroApi(excecao);
      if (falha.codigo === "SLOT_INDISPONIVEL") {
        setHorario(null);
        setRodada((r) => r + 1);
        setErro("Esse horário acabou de ser ocupado. Escolha outro.");
      } else {
        setErro(falha.message);
      }
      setEnviando(false);
    }
  }

  return (
    <>
      <div>
        <Titulo>Novo agendamento</Titulo>
        <p className="mt-1 text-suave">
          Atendimento de balcão: entra como pago, sem cobrança pelo app.
        </p>
      </div>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <Campo
          rotulo="Nome do cliente"
          name="nome"
          autoComplete="off"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={validar ? erros.nome : null}
          maxLength={80}
          required
        />
        <Campo
          rotulo="Telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          erro={validar ? erros.telefone : null}
          required={false}
        />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Serviços</h2>
          {servicos.erro ? (
            <ErroComRetentativa mensagem={servicos.erro.message} aoTentar={servicos.recarregar} />
          ) : !servicos.dados ? (
            <Carregando texto="Carregando serviços…" />
          ) : (
            <SeletorServicos
              servicos={servicos.dados}
              selecionados={selecionados}
              aoAlternar={(id) => {
                setSelecionados([id]);
                setHorario(null);
              }}
            />
          )}
          {validar && erros.servicos && <p className="text-sm text-vermelho">{erros.servicos}</p>}
        </section>

        {selecionados.length > 0 && hoje && dia && (
          <section className="flex flex-col gap-2">
            <SeletorHorario
              key={rodada}
              dias={dias}
              hoje={hoje}
              dia={dia}
              aoMudarDia={(novo) => {
                setDiaEscolhido(novo);
                setHorario(null);
              }}
              servicosIds={selecionados}
              horario={horario}
              aoEscolher={setHorario}
            />
            {validar && erros.horario && <p className="text-sm text-vermelho">{erros.horario}</p>}
          </section>
        )}

        <p aria-live="polite" className="flex items-baseline justify-between gap-2 border-t border-borda pt-3">
          <span className="text-suave">
            {escolhidos.length === 0
              ? "Nenhum serviço escolhido"
              : `${escolhidos[0].nome} · ${formatarDuracao(minutos)}`}
          </span>
          <span className="text-xl font-semibold text-ouro-claro">{formatarCentavos(centavos)}</span>
        </p>

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <Botao type="submit" ocupado={enviando}>
          Criar agendamento
        </Botao>
      </form>
    </>
  );
}
