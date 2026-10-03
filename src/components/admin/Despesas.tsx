"use client";

import { useState, type FormEvent } from "react";
import { api, paraErroApi, type Despesa } from "@/lib/api";
import {
  diaEmSaoPaulo,
  formatarCentavos,
  formatarDiaCurto,
  formatarMes,
  formatarReais,
  paraCentavos,
  somarMeses,
} from "@/lib/formato";
import { useHoje, useRecurso } from "@/lib/hooks";
import { centavosDigitados } from "@/lib/validacao";
import { Aviso, Botao, Campo, Carregando, ErroComRetentativa, Modal, Titulo } from "../ui";
import { NavegadorPeriodo, useChamarAdmin } from "./contexto";

/** `dataRegistro` pode vir como data (YYYY-MM-DD) ou como instante ISO. */
function diaDoRegistro(dataRegistro: string): string {
  return dataRegistro.includes("T") ? diaEmSaoPaulo(dataRegistro) : dataRegistro.slice(0, 10);
}

export function Despesas() {
  const chamar = useChamarAdmin();
  const hoje = useHoje();
  const [mesEscolhido, setMesEscolhido] = useState<string | null>(null);
  const mesAtual = hoje?.slice(0, 7) ?? null;
  const mes = mesEscolhido ?? mesAtual;

  const despesas = useRecurso(mes, (sinal) =>
    chamar((token) => api.admin.listarDespesas(token, mes ?? "", sinal)),
  );

  const [descricao, setDescricao] = useState("");
  const [centavos, setCentavos] = useState(0);
  const [validar, setValidar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [excluindo, setExcluindo] = useState<Despesa | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const erros = {
    descricao: descricao.trim().length < 2 ? "Descreva a despesa." : null,
    valor: centavos > 0 ? null : "Informe um valor maior que zero.",
  };

  async function adicionar(evento: FormEvent) {
    evento.preventDefault();
    setValidar(true);
    setErro(null);
    setAviso(null);
    if (erros.descricao || erros.valor || salvando) return;

    setSalvando(true);
    try {
      await chamar((token) => api.admin.criarDespesa(token, descricao.trim(), centavos / 100));
      setAviso(`Despesa "${descricao.trim()}" adicionada.`);
      setDescricao("");
      setCentavos(0);
      setValidar(false);
      // A despesa nova entra no mês corrente.
      if (mes !== mesAtual) setMesEscolhido(null);
      else despesas.recarregar();
    } catch (excecao) {
      setErro(paraErroApi(excecao).message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    setRemovendo(true);
    setErroExclusao(null);
    try {
      await chamar((token) => api.admin.excluirDespesa(token, excluindo.id));
      setAviso(`Despesa "${excluindo.descricao}" excluída.`);
      setExcluindo(null);
      despesas.recarregar();
    } catch (excecao) {
      setErroExclusao(paraErroApi(excecao).message);
    } finally {
      setRemovendo(false);
    }
  }

  if (!mes) return <Carregando />;

  const lista = despesas.dados ?? [];
  const totalCentavos = lista.reduce((soma, d) => soma + paraCentavos(d.valor), 0);

  return (
    <>
      <Titulo>Despesas</Titulo>

      <form
        onSubmit={adicionar}
        noValidate
        className="vidro flex flex-col gap-3 rounded-2xl p-4"
      >
        <h2 className="font-semibold">Adicionar despesa</h2>
        <Campo
          rotulo="Descrição"
          name="descricao"
          autoComplete="off"
          placeholder="Ex.: lâminas, aluguel"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          erro={validar ? erros.descricao : null}
          maxLength={120}
          required
        />
        <Campo
          rotulo="Valor"
          name="valor"
          inputMode="numeric"
          autoComplete="off"
          placeholder="R$ 0,00"
          value={centavos > 0 ? formatarCentavos(centavos) : ""}
          onChange={(e) => setCentavos(centavosDigitados(e.target.value))}
          erro={validar ? erros.valor : null}
          required
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" ocupado={salvando}>
          Adicionar
        </Botao>
      </form>

      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}

      <NavegadorPeriodo
        rotulo={formatarMes(mes)}
        nomeAnterior="Mês anterior"
        nomeProximo="Próximo mês"
        aoAnterior={() => setMesEscolhido(somarMeses(mes, -1))}
        aoProximo={() => setMesEscolhido(somarMeses(mes, 1))}
      />

      <div aria-live="polite" aria-busy={despesas.carregando} className="flex flex-col gap-3">
        {despesas.erro ? (
          <ErroComRetentativa mensagem={despesas.erro.message} aoTentar={despesas.recarregar} />
        ) : !despesas.dados ? (
          <Carregando texto="Carregando despesas…" />
        ) : lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda px-4 py-8 text-center text-suave">
            Nenhuma despesa neste mês.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {lista.map((d) => (
                <li
                  key={d.id}
                  className="vidro flex items-center gap-3 rounded-xl py-2 pr-2 pl-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{d.descricao}</p>
                    <p className="text-sm text-suave">
                      {formatarDiaCurto(diaDoRegistro(d.dataRegistro))}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-vermelho">{formatarReais(d.valor)}</p>
                  <button
                    type="button"
                    aria-label={`Excluir despesa ${d.descricao}`}
                    onClick={() => {
                      setErroExclusao(null);
                      setExcluindo(d);
                    }}
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg text-suave hover:text-vermelho"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                      <path
                        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <p className="flex items-baseline justify-between border-t border-borda pt-3">
              <span className="text-suave">Total do mês</span>
              <span className="text-xl font-semibold text-vermelho">
                {formatarCentavos(totalCentavos)}
              </span>
            </p>
          </>
        )}
      </div>

      {excluindo && (
        <Modal titulo="Excluir despesa?" aoFechar={() => !removendo && setExcluindo(null)}>
          <p className="leading-relaxed text-suave">
            <strong className="text-texto">{excluindo.descricao}</strong> ·{" "}
            {formatarReais(excluindo.valor)}. Ela sai da conta do mês.
          </p>
          {erroExclusao && <Aviso tipo="erro">{erroExclusao}</Aviso>}
          <div className="flex flex-col gap-3">
            <Botao variante="perigo" ocupado={removendo} onClick={excluir}>
              Excluir
            </Botao>
            <Botao variante="secundario" disabled={removendo} onClick={() => setExcluindo(null)}>
              Voltar
            </Botao>
          </div>
        </Modal>
      )}
    </>
  );
}
