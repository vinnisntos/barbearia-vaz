"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  api,
  ErroApi,
  foiAbortado,
  paraErroApi,
  type Agendamento,
  type DadosPagamento,
} from "@/lib/api";
import { PAGAMENTO_FAKE } from "@/lib/auth";
import {
  interpretarPagamento,
  lerPagamentoBruto,
  marcarRedirecionado,
} from "@/lib/checkout-storage";
import { formatarContador, formatarDataHora, formatarReais } from "@/lib/formato";
import { useAgora } from "@/lib/hooks";
import { SITE } from "@/lib/site";
import { Aviso, Botao, Carregando, Cartao, classesBotao, Titulo } from "./ui";

const INTERVALO_POLLING_MS = 3000;
const INTERVALO_POLLING_EXPIRADO_MS = 15000;

const semAssinatura = () => () => {};

function usePagamentoGuardado(id: string): DadosPagamento | null {
  const bruto = useSyncExternalStore(
    semAssinatura,
    () => lerPagamentoBruto(id),
    () => null,
  );
  return useMemo(() => interpretarPagamento(bruto), [bruto]);
}

interface EstadoConsulta {
  agendamento: Agendamento | null;
  erro: ErroApi | null;
}

export function Checkout({ id }: { id: string }) {
  const [{ agendamento, erro }, setEstado] = useState<EstadoConsulta>({
    agendamento: null,
    erro: null,
  });
  const pagamento = usePagamentoGuardado(id);

  const status = agendamento?.status;
  const naoEncontrado = erro?.status === 404;
  // "expirado" não é final: um Pix pago depois do prazo ainda pode confirmar o horário (D8).
  const encerrado =
    naoEncontrado || status === "pago" || status === "cancelado" || status === "ausente";
  const intervalo = status === "expirado" ? INTERVALO_POLLING_EXPIRADO_MS : INTERVALO_POLLING_MS;

  // Polling enquanto o agendamento puder mudar de status.
  useEffect(() => {
    if (encerrado) return;
    const controle = new AbortController();
    let temporizador: number | undefined;

    const consultar = async () => {
      try {
        const atual = await api.obterAgendamento(id, controle.signal);
        if (controle.signal.aborted) return;
        setEstado({ agendamento: atual, erro: null });
      } catch (excecao) {
        if (controle.signal.aborted || foiAbortado(excecao)) return;
        setEstado((anterior) => ({ ...anterior, erro: paraErroApi(excecao) }));
      }
      if (!controle.signal.aborted) {
        temporizador = window.setTimeout(consultar, intervalo);
      }
    };
    void consultar();

    return () => {
      controle.abort();
      window.clearTimeout(temporizador);
    };
  }, [id, encerrado, intervalo]);

  if (naoEncontrado) {
    return (
      <>
        <Titulo>Agendamento não encontrado</Titulo>
        <Aviso tipo="erro">
          Não achamos este agendamento. O link pode estar incompleto.
        </Aviso>
        <Recomecar />
      </>
    );
  }

  if (!agendamento) {
    return erro ? (
      <Aviso tipo="erro">{erro.message} Tentando de novo…</Aviso>
    ) : (
      <Carregando texto="Carregando seu agendamento…" />
    );
  }

  if (agendamento.status === "pago") return <Sucesso agendamento={agendamento} />;

  if (agendamento.status === "expirado") {
    return (
      <>
        <Titulo>O tempo acabou</Titulo>
        <div role="status" aria-live="polite">
          <Aviso tipo="alerta">
            O prazo de 10 minutos para pagar terminou e o horário foi liberado. Se você
            pagou depois do prazo e o horário já tinha sido ocupado, o valor é devolvido
            automaticamente.
          </Aviso>
        </div>
        <Recomecar texto="Escolher outro horário" />
      </>
    );
  }

  if (agendamento.status === "cancelado" || agendamento.status === "ausente") {
    return (
      <>
        <Titulo>
          {agendamento.status === "cancelado"
            ? "Agendamento cancelado"
            : "Horário não comparecido"}
        </Titulo>
        <Resumo agendamento={agendamento} />
        <Recomecar texto="Fazer novo agendamento" />
      </>
    );
  }

  return (
    <Pendente agendamento={agendamento} pagamento={pagamento} semConexao={erro !== null} />
  );
}

function Recomecar({ texto = "Voltar ao início" }: { texto?: string }) {
  return (
    <Link href="/agendar" className={classesBotao("primario", "w-full")}>
      {texto}
    </Link>
  );
}

function Resumo({ agendamento }: { agendamento: Agendamento }) {
  return (
    <Cartao>
      <dl className="flex flex-col gap-2">
        <div>
          <dt className="text-sm text-suave">Cliente</dt>
          <dd className="font-medium break-words">{agendamento.nomeCliente}</dd>
        </div>
        <div>
          <dt className="text-sm text-suave">Serviços</dt>
          <dd className="font-medium break-words">{agendamento.servicosResumo}</dd>
        </div>
        <div>
          <dt className="text-sm text-suave">Quando</dt>
          <dd className="font-medium first-letter:uppercase">
            {formatarDataHora(agendamento.dataInicio)}
          </dd>
        </div>
        {SITE.cobraPagamento && (
          <div className="flex items-baseline justify-between border-t border-borda pt-2">
            <dt>Valor</dt>
            <dd className="text-xl font-semibold text-amarelo-claro">
              {formatarReais(agendamento.valorTotal)}
            </dd>
          </div>
        )}
        {SITE.endereco && (
          <div>
            <dt className="text-sm text-suave">Onde</dt>
            <dd className="font-medium break-words">{SITE.endereco}</dd>
          </div>
        )}
      </dl>
    </Cartao>
  );
}

function Pendente({
  agendamento,
  pagamento,
  semConexao,
}: {
  agendamento: Agendamento;
  pagamento: DadosPagamento | null;
  semConexao: boolean;
}) {
  const agora = useAgora(1000);
  const expiraEm = agendamento.expiraEm ? Date.parse(agendamento.expiraEm) : null;
  const restante = agora !== null && expiraEm !== null ? expiraEm - agora : null;
  const esgotado = restante !== null && restante <= 0;
  const urlCartao =
    pagamento?.forma === "CARTAO" && /^https?:\/\//i.test(pagamento.urlCheckout)
      ? pagamento.urlCheckout
      : null;

  // Cartão: leva ao checkout hospedado uma única vez; ao voltar, fica o botão.
  useEffect(() => {
    // No modo fake a URL não existe; fica só o botão.
    if (urlCartao && !PAGAMENTO_FAKE && marcarRedirecionado(agendamento.id)) {
      window.location.assign(urlCartao);
    }
  }, [urlCartao, agendamento.id]);

  return (
    <>
      <div>
        <Titulo>{pagamento?.forma === "CARTAO" ? "Pague com cartão" : "Pague com Pix"}</Titulo>
        <p className="mt-1 text-suave">
          Seu horário está reservado. Ele só é confirmado depois do pagamento.
        </p>
      </div>

      <Cartao className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-suave">Tempo para pagar</p>
          <p
            role="timer"
            aria-label="Tempo restante para pagar"
            className={`font-titulo text-4xl tabular-nums ${
              restante !== null && restante < 60_000 ? "text-vermelho" : "text-texto"
            }`}
          >
            {restante === null ? "--:--" : formatarContador(restante)}
          </p>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="flex max-w-[55%] items-center gap-2 text-right text-sm text-suave"
        >
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 animate-pulse rounded-full bg-amarelo"
          />
          {esgotado ? "Tempo esgotado, conferindo…" : "Aguardando pagamento"}
        </p>
      </Cartao>

      {semConexao && (
        <Aviso tipo="alerta">
          Sem conexão para conferir o pagamento. Tentando de novo automaticamente…
        </Aviso>
      )}

      {pagamento?.forma === "PIX" && !esgotado && <Pix pagamento={pagamento} />}

      {urlCartao && !esgotado && (
        <Cartao className="flex flex-col gap-3">
          <p className="text-suave">
            O pagamento com cartão é feito na página segura do nosso parceiro. Depois
            de pagar, volte para esta tela para ver a confirmação.
          </p>
          <a href={urlCartao} className={classesBotao("primario", "w-full")}>
            Ir para o pagamento
          </a>
        </Cartao>
      )}

      {!pagamento && !esgotado && (
        <Aviso>
          Os dados do pagamento não estão mais nesta aba. Se você já copiou o código
          Pix ou abriu a página do cartão, é só concluir o pagamento: esta tela
          atualiza sozinha. Se preferir, espere o tempo acabar e faça um novo
          agendamento.
        </Aviso>
      )}

      <Resumo agendamento={agendamento} />

      {PAGAMENTO_FAKE && <SimularPagamento id={agendamento.id} />}
    </>
  );
}

function Pix({ pagamento }: { pagamento: Extract<DadosPagamento, { forma: "PIX" }> }) {
  const [copiado, setCopiado] = useState<"sim" | "falhou" | null>(null);
  const [semImagem, setSemImagem] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const imagem = pagamento.qrCodeBase64.startsWith("data:")
    ? pagamento.qrCodeBase64
    : `data:image/png;base64,${pagamento.qrCodeBase64}`;

  async function copiar() {
    let resultado: "sim" | "falhou" = "sim";
    try {
      await navigator.clipboard.writeText(pagamento.copiaECola);
    } catch {
      // Sem permissão de clipboard: seleciona o texto para copiar à mão.
      campo.current?.focus();
      campo.current?.select();
      resultado = "falhou";
    }
    setCopiado(resultado);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setCopiado(null), 4000);
  }

  return (
    <Cartao className="flex flex-col items-center gap-4">
      <ol className="list-inside list-decimal self-start text-sm leading-relaxed text-suave">
        <li>Abra o app do seu banco e escolha pagar com Pix.</li>
        <li>Use o &ldquo;copia e cola&rdquo; ou leia o QR code.</li>
        <li>Volte aqui: a confirmação aparece sozinha.</li>
      </ol>

      <Botao className="w-full" onClick={copiar}>
        {copiado === "sim" ? "Código copiado!" : "Copiar código Pix"}
      </Botao>
      <p aria-live="polite" className="sr-only">
        {copiado === "sim" && "Código Pix copiado."}
        {copiado === "falhou" &&
          "Não foi possível copiar automaticamente. O código foi selecionado, copie manualmente."}
      </p>
      {copiado === "falhou" && (
        <p className="text-sm text-vermelho">
          Não deu para copiar automaticamente. Selecione o código abaixo e copie.
        </p>
      )}

      <label className="flex w-full flex-col gap-1.5 text-sm text-suave">
        Pix copia e cola
        <textarea
          ref={campo}
          readOnly
          rows={3}
          value={pagamento.copiaECola}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-xl border border-borda bg-fundo p-3 font-mono text-xs break-all text-texto"
        />
      </label>

      {semImagem ? (
        <p className="text-sm text-suave">
          QR code indisponível. Use o código copia e cola acima.
        </p>
      ) : (
        <div className="rounded-xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem em data URI vinda da API */}
          <img
            src={imagem}
            alt="QR code para pagamento via Pix"
            width={220}
            height={220}
            onError={() => setSemImagem(true)}
            className="size-[220px] max-w-full"
          />
        </div>
      )}
    </Cartao>
  );
}

function SimularPagamento({ id }: { id: string }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function simular() {
    setOcupado(true);
    setErro(null);
    try {
      await api.simularPagamento(id);
    } catch (excecao) {
      setErro(paraErroApi(excecao).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={simular}
        disabled={ocupado}
        className="min-h-11 rounded-lg px-3 text-sm text-suave underline underline-offset-4 disabled:opacity-50"
      >
        Simular pagamento (dev)
      </button>
      {erro && (
        <p role="alert" className="text-sm text-vermelho">
          {erro}
        </p>
      )}
    </div>
  );
}

function Sucesso({ agendamento }: { agendamento: Agendamento }) {
  const mensagem = [
    SITE.cobraPagamento ? "Olá! Acabei de agendar e pagar pelo site." : "Olá! Acabei de agendar pelo site.",
    `Nome: ${agendamento.nomeCliente}`,
    `Serviço: ${agendamento.servicosResumo}`,
    `Quando: ${formatarDataHora(agendamento.dataInicio)}`,
    ...(SITE.cobraPagamento ? [`Valor pago: ${formatarReais(agendamento.valorTotal)}`] : []),
    ...(SITE.endereco ? [`Endereço: ${SITE.endereco}`] : []),
    // O PIN vai junto para ficar salvo na conversa do cliente, caso ele não anote.
    ...(SITE.clienteCancela && agendamento.codigoCancelamento
      ? [`PIN de cancelamento: ${agendamento.codigoCancelamento}`]
      : []),
  ].join("\n");

  return (
    <>
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 pt-2 text-center">
        <span className="animar-surgir flex size-20 items-center justify-center rounded-full bg-verde text-fundo">
          <svg viewBox="0 0 24 24" className="size-11" fill="none" aria-hidden="true">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <Titulo>Horário confirmado!</Titulo>
        <p className="text-suave">
          {SITE.cobraPagamento && "Pagamento recebido. "}Te esperamos na ótica.
        </p>
      </div>

      <Resumo agendamento={agendamento} />

      {SITE.clienteCancela && agendamento.codigoCancelamento && (
        <div className="rounded-2xl border-2 border-amarelo bg-amarelo/10 p-4 text-center">
          <p className="text-sm font-medium text-amarelo-claro">Seu PIN de cancelamento</p>
          <p className="my-2 font-mono text-5xl font-bold tracking-[0.3em] text-texto select-all">
            {/* tracking adiciona espaço depois da última letra; o padding compensa */}
            <span className="pl-[0.3em]">{agendamento.codigoCancelamento}</span>
          </p>
          <p className="text-sm leading-relaxed">
            <strong>Guarde este código</strong> (tire um print). Ele não será mostrado
            de novo e é a única forma de cancelar pelo site, junto com o seu WhatsApp.
          </p>
        </div>
      )}

      {SITE.whatsapp && (
        <a
          href={`https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBotao("primario", "w-full bg-verde hover:bg-[#6ee7a0]")}
        >
          {SITE.cobraPagamento ? "Enviar comprovante no WhatsApp" : "Enviar confirmação no WhatsApp"}
        </a>
      )}

      <p className="text-center text-sm leading-relaxed text-suave">
        {SITE.clienteCancela ? (
          <>
            Precisa desmarcar? Até 1 hora antes{SITE.cobraPagamento && ", com estorno de 70%"}.{" "}
            <Link href="/cancelar" className="text-amarelo-claro underline underline-offset-4">
              Cancelar meu horário
            </Link>
          </>
        ) : (
          "Não vai poder vir? Avise a gente com antecedência."
        )}
      </p>
    </>
  );
}
