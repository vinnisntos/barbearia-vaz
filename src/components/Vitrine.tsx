"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, paraErroApi, type FormaPagamento } from "@/lib/api";
import { guardarPagamento } from "@/lib/checkout-storage";
import {
  formatarCentavos,
  formatarDataHora,
  formatarDuracao,
  somarDias,
} from "@/lib/formato";
import { useHoje, useRecurso } from "@/lib/hooks";
import { SITE } from "@/lib/site";
import {
  cpfValido,
  mascararCpf,
  mascararTelefone,
  telefoneValido,
} from "@/lib/validacao";
import { SeletorHorario } from "./SeletorHorario";
import { SeletorServicos, somarServicos } from "./SeletorServicos";
import {
  Aviso,
  Botao,
  Campo,
  Carregando,
  Cartao,
  ErroComRetentativa,
  Titulo,
} from "./ui";

type Etapa = "servicos" | "horario" | "dados";

const ETAPAS: { id: Etapa; nome: string }[] = [
  { id: "servicos", nome: "Serviços" },
  { id: "horario", nome: "Horário" },
  { id: "dados", nome: "Seus dados" },
];

const DIAS_A_FRENTE = 14;
// Sem cobrança, a tela não mostra preço nem pede CPF e forma de pagamento.
const COBRA = SITE.cobraPagamento;

export function Vitrine() {
  const router = useRouter();
  const hoje = useHoje();
  const servicos = useRecurso("servicos", (sinal) => api.listarServicos(sinal));

  const [etapa, setEtapa] = useState<Etapa>("servicos");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [diaEscolhido, setDiaEscolhido] = useState<string | null>(null);
  const [horario, setHorario] = useState<string | null>(null);
  const [avisoHorario, setAvisoHorario] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [validar, setValidar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  // Leva o foco ao título quando a etapa muda (leitores de tela e teclado).
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primeiraVez = useRef(true);
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    tituloRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [etapa]);

  const { escolhidos, centavos, minutos } = somarServicos(
    servicos.dados ?? [],
    selecionados,
  );
  const dias = hoje
    ? Array.from({ length: DIAS_A_FRENTE }, (_, i) => somarDias(hoje, i))
    : [];
  const dia = diaEscolhido && dias.includes(diaEscolhido) ? diaEscolhido : hoje;

  const erros = {
    nome: nome.trim().length < 3 ? "Informe seu nome completo." : null,
    telefone: telefoneValido(telefone)
      ? null
      : "Informe um WhatsApp válido, com DDD.",
    cpf: !COBRA || cpfValido(cpf) ? null : "CPF inválido. Confira os números.",
  };
  const formularioValido = !erros.nome && !erros.telefone && !erros.cpf;

  function alternarServico(id: string) {
    setSelecionados([id]);
    setHorario(null);
  }

  function irPara(nova: Etapa) {
    setErroEnvio(null);
    setEtapa(nova);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setValidar(true);
    setErroEnvio(null);
    if (!formularioValido || !horario || enviando) return;

    setEnviando(true);
    try {
      const criado = await api.criarAgendamento({
        nome: nome.trim(),
        telefone,
        servicosIds: selecionados,
        dataInicio: horario,
        ...(COBRA ? { cpf, formaPagamento: forma } : {}),
      });
      if (criado.pagamento) guardarPagamento(criado.id, criado.pagamento);
      router.push(`/agendamento/${criado.id}`);
      // Mantém "enviando" até a navegação concluir.
    } catch (excecao) {
      const erro = paraErroApi(excecao);
      setEnviando(false);
      if (erro.codigo === "SLOT_INDISPONIVEL") {
        setHorario(null);
        setAvisoHorario(
          "Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.",
        );
        setEtapa("horario");
      } else {
        setErroEnvio(erro.message);
      }
    }
  }

  const indiceEtapa = ETAPAS.findIndex((e) => e.id === etapa);

  return (
    <>
      <ol className="flex gap-2" aria-label="Etapas do agendamento">
        {ETAPAS.map((e, i) => (
          <li
            key={e.id}
            aria-current={i === indiceEtapa ? "step" : undefined}
            className="flex-1"
          >
            <span
              className={`block h-1 rounded-full ${i <= indiceEtapa ? "bg-amarelo" : "bg-borda"}`}
            />
            <span
              className={`mt-1 block text-xs ${i === indiceEtapa ? "text-texto" : "text-suave"}`}
            >
              {i + 1}. {e.nome}
            </span>
          </li>
        ))}
      </ol>

      {etapa === "servicos" && (
        <section className="flex flex-1 flex-col gap-4">
          <div>
            <Titulo ref={tituloRef}>O que vamos fazer hoje?</Titulo>
            <p className="mt-1 text-suave">Escolha um serviço.</p>
          </div>

          {servicos.erro ? (
            <ErroComRetentativa
              mensagem={servicos.erro.message}
              aoTentar={servicos.recarregar}
            />
          ) : !servicos.dados ? (
            <Carregando texto="Carregando serviços…" />
          ) : servicos.dados.length === 0 ? (
            <Aviso>
              Nenhum serviço disponível no momento. Volte mais tarde.
            </Aviso>
          ) : (
            <SeletorServicos
              servicos={servicos.dados}
              selecionados={selecionados}
              aoAlternar={alternarServico}
            />
          )}

          <div className="sticky bottom-0 -mx-4 mt-auto border-t border-borda bg-fundo/95 px-4 py-3 backdrop-blur">
            <p
              aria-live="polite"
              className="mb-2 flex items-baseline justify-between gap-2"
            >
              <span className="text-suave">
                {escolhidos.length === 0
                  ? "Nenhum serviço escolhido"
                  : `${escolhidos[0].nome} · ${formatarDuracao(minutos)}`}
              </span>
              {COBRA && (
                <span className="text-xl font-semibold text-amarelo-claro">
                  {formatarCentavos(centavos)}
                </span>
              )}
            </p>
            <Botao
              className="w-full"
              disabled={escolhidos.length === 0}
              onClick={() => irPara("horario")}
            >
              Escolher horário
            </Botao>
          </div>
        </section>
      )}

      {etapa === "horario" && (
        <section className="flex flex-1 flex-col gap-4">
          <div>
            <Titulo ref={tituloRef}>Quando fica bom?</Titulo>
            <p className="mt-1 text-suave">
              {escolhidos.map((s) => s.nome).join(" + ")} ·{" "}
              {formatarDuracao(minutos)}
              {COBRA && ` · ${formatarCentavos(centavos)}`}
            </p>
          </div>

          {avisoHorario && <Aviso tipo="alerta">{avisoHorario}</Aviso>}

          {!hoje || !dia ? (
            <Carregando />
          ) : (
            <SeletorHorario
              dias={dias}
              hoje={hoje}
              dia={dia}
              aoMudarDia={(novo) => {
                setDiaEscolhido(novo);
                setHorario(null);
              }}
              servicosIds={selecionados}
              horario={horario}
              aoEscolher={(h) => {
                setHorario(h);
                setAvisoHorario(null);
              }}
            />
          )}

          <div className="sticky bottom-0 -mx-4 mt-auto flex gap-3 border-t border-borda bg-fundo/95 px-4 py-3 backdrop-blur">
            <Botao variante="secundario" onClick={() => irPara("servicos")}>
              Voltar
            </Botao>
            <Botao
              className="flex-1"
              disabled={!horario}
              onClick={() => irPara("dados")}
            >
              Continuar
            </Botao>
          </div>
        </section>
      )}

      {etapa === "dados" && horario && (
        <section className="flex flex-1 flex-col gap-4">
          <Titulo ref={tituloRef}>Falta pouco</Titulo>

          <Cartao>
            <h2 className="text-sm font-medium text-suave">Seu agendamento</h2>
            <p className="mt-1 font-medium first-letter:uppercase">
              {formatarDataHora(horario)}
            </p>
            <p className="text-suave">
              {escolhidos.map((s) => s.nome).join(" + ")} ·{" "}
              {formatarDuracao(minutos)}
            </p>
            {COBRA && (
              <p className="mt-2 flex items-baseline justify-between border-t border-borda pt-2">
                <span>Total</span>
                <span className="text-xl font-semibold text-amarelo-claro">
                  {formatarCentavos(centavos)}
                </span>
              </p>
            )}
          </Cartao>

          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <Campo
              rotulo="Nome completo"
              name="nome"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              erro={validar ? erros.nome : null}
              maxLength={80}
              required
            />
            <Campo
              rotulo="WhatsApp"
              name="telefone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
              erro={validar ? erros.telefone : null}
              ajuda={
                SITE.clienteCancela
                  ? "Você vai usar este número se precisar cancelar."
                  : "Usamos este número para falar com você sobre o agendamento."
              }
              required
            />
            {COBRA && (
              <Campo
                rotulo="CPF"
                name="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(mascararCpf(e.target.value))}
                erro={validar ? erros.cpf : null}
                ajuda="Exigido pelo meio de pagamento para emitir a cobrança. Não fica guardado com a ótica."
                required
              />
            )}

            {COBRA && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">
                  Como quer pagar?
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        valor: "PIX",
                        nome: "Pix",
                        detalhe: "Confirma na hora",
                      },
                      {
                        valor: "CARTAO",
                        nome: "Cartão",
                        detalhe: "Página segura",
                      },
                    ] as const
                  ).map((opcao) => (
                    <label
                      key={opcao.valor}
                      className="flex min-h-16 cursor-pointer flex-col justify-center rounded-xl border border-borda bg-superficie px-4 py-2 has-checked:border-amarelo has-checked:bg-relevo has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-amarelo-claro"
                    >
                      <input
                        type="radio"
                        name="formaPagamento"
                        className="sr-only"
                        value={opcao.valor}
                        checked={forma === opcao.valor}
                        onChange={() => setForma(opcao.valor)}
                      />
                      <span className="font-semibold">{opcao.nome}</span>
                      <span className="text-sm text-suave">
                        {opcao.detalhe}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <p className="text-sm leading-relaxed text-suave">
              {COBRA
                ? "O horário fica reservado por 10 minutos enquanto você paga. Cancelamento até 1 hora antes, com estorno de 70% do valor."
                : SITE.clienteCancela
                  ? "Agendar não tem custo. Se não puder vir, cancele pelo site até 1 hora antes para liberar o horário."
                  : "Agendar não tem custo. Se não puder vir, avise a gente com antecedência."}
            </p>

            {erroEnvio && <Aviso tipo="erro">{erroEnvio}</Aviso>}

            <div className="flex gap-3">
              <Botao
                variante="secundario"
                onClick={() => irPara("horario")}
                disabled={enviando}
              >
                Voltar
              </Botao>
              <Botao type="submit" className="flex-1" ocupado={enviando}>
                {enviando
                  ? "Reservando…"
                  : COBRA
                    ? `Pagar ${formatarCentavos(centavos)}`
                    : "Confirmar agendamento"}
              </Botao>
            </div>
          </form>
        </section>
      )}

      {etapa === "servicos" && SITE.clienteCancela && (
        <p className="text-center text-sm text-suave">
          Já agendou e precisa desmarcar?{" "}
          <Link
            href="/cancelar"
            className="inline-flex min-h-11 items-center font-medium text-amarelo-claro underline underline-offset-4"
          >
            Cancelar meu horário
          </Link>
        </p>
      )}
    </>
  );
}
