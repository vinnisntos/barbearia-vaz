"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, paraErroApi, type CancelamentoFeito, type ErroApi } from "@/lib/api";
import { formatarDataHora, formatarReais } from "@/lib/formato";
import { SITE } from "@/lib/site";
import { mascararPin, mascararTelefone, telefoneValido } from "@/lib/validacao";
import { Aviso, Botao, Campo, Cartao, classesBotao, Modal, Titulo } from "./ui";

function mensagemDeErro(erro: ErroApi): string {
  switch (erro.status) {
    case 404:
      return SITE.cobraPagamento
        ? "Não encontramos um horário pago e futuro com esse WhatsApp e PIN. Confira os dois e tente de novo."
        : "Não encontramos um horário futuro com esse WhatsApp e PIN. Confira os dois e tente de novo.";
    case 422:
      return SITE.cobraPagamento
        ? "Faltam menos de 1 hora para o seu horário, então não é mais possível cancelar pelo site. O valor não é estornado."
        : "Faltam menos de 1 hora para o seu horário, então não é mais possível cancelar pelo site. Fale com a ótica.";
    case 429:
      return "Muitas tentativas para este número. Por segurança, aguarde 1 hora antes de tentar de novo.";
    case 502:
      return "Não conseguimos fazer o estorno agora, então seu horário continua marcado. Tente de novo em alguns minutos ou fale com a ótica.";
    default:
      return erro.message;
  }
}

export function CancelarForm() {
  const [telefone, setTelefone] = useState("");
  const [pin, setPin] = useState("");
  const [validar, setValidar] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<CancelamentoFeito | null>(null);

  const erros = {
    telefone: telefoneValido(telefone) ? null : "Informe o WhatsApp usado no agendamento, com DDD.",
    pin: pin.length === 4 ? null : "O PIN tem 4 caracteres.",
  };

  function pedirConfirmacao(evento: FormEvent) {
    evento.preventDefault();
    setValidar(true);
    setErro(null);
    if (erros.telefone || erros.pin) return;
    setConfirmando(true);
  }

  async function cancelar() {
    setEnviando(true);
    try {
      setFeito(await api.cancelar(telefone, pin));
    } catch (excecao) {
      setErro(mensagemDeErro(paraErroApi(excecao)));
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  if (feito) {
    return (
      <>
        <Titulo>Horário cancelado</Titulo>
        <div role="status" aria-live="polite">
          <Cartao className="flex flex-col gap-2">
            <p>
              Seu horário de{" "}
              <strong>{formatarDataHora(feito.dataInicio)}</strong> foi cancelado.
            </p>
            {SITE.cobraPagamento && (
              <>
                <p className="text-sm text-suave">Valor estornado (70%)</p>
                <p className="text-3xl font-semibold text-verde">
                  {formatarReais(feito.valorEstornado)}
                </p>
                <p className="text-sm leading-relaxed text-suave">
                  O estorno volta pelo mesmo meio de pagamento. No Pix costuma cair em
                  instantes; no cartão, depende da fatura.
                </p>
              </>
            )}
          </Cartao>
        </div>
        <Link href="/agendar" className={classesBotao("primario", "w-full")}>
          Fazer novo agendamento
        </Link>
      </>
    );
  }

  return (
    <>
      <Titulo>Cancelar meu horário</Titulo>

      <Cartao>
        <h2 className="font-semibold text-amarelo-claro">Antes de cancelar</h2>
        <ul className="mt-2 list-inside list-disc text-sm leading-relaxed text-texto">
          <li>
            O cancelamento só é possível <strong>até 1 hora antes</strong> do horário
            marcado.
          </li>
          {SITE.cobraPagamento && (
            <li>
              O estorno é de <strong>70% do valor pago</strong>; os outros 30% ficam
              retidos.
            </li>
          )}
          <li>Depois de confirmado, o cancelamento não pode ser desfeito.</li>
        </ul>
      </Cartao>

      <form onSubmit={pedirConfirmacao} noValidate className="flex flex-col gap-4">
        <Campo
          rotulo="WhatsApp usado no agendamento"
          name="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="(11) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          erro={validar ? erros.telefone : null}
          required
        />
        <Campo
          rotulo="PIN de cancelamento"
          name="pin"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="4 caracteres"
          value={pin}
          onChange={(e) => setPin(mascararPin(e.target.value))}
          erro={validar ? erros.pin : null}
          ajuda={
            SITE.cobraPagamento
              ? "É o código mostrado na tela de confirmação do pagamento."
              : "É o código mostrado na tela de confirmação do agendamento."
          }
          className="font-mono tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:normal-case"
          required
        />

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <Botao type="submit" variante="perigo">
          Cancelar meu horário
        </Botao>
        <Link href="/" className={classesBotao("fantasma")}>
          Voltar sem cancelar
        </Link>
      </form>

      {confirmando && (
        <Modal titulo="Confirmar cancelamento?" aoFechar={() => !enviando && setConfirmando(false)}>
          <p className="leading-relaxed text-suave">
            {SITE.cobraPagamento ? (
              <>
                Você recebe de volta <strong className="text-texto">70% do valor pago</strong>{" "}
                e o horário é liberado. Isso não pode ser desfeito.
              </>
            ) : (
              "O horário é liberado para outra pessoa. Isso não pode ser desfeito."
            )}
          </p>
          <div className="flex flex-col gap-3">
            <Botao variante="perigo" ocupado={enviando} onClick={cancelar}>
              Sim, cancelar meu horário
            </Botao>
            <Botao
              variante="secundario"
              disabled={enviando}
              onClick={() => setConfirmando(false)}
            >
              Manter meu horário
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}
