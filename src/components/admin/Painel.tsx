"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ErroApi } from "@/lib/api";
import { entrar, ErroLogin, MODO_FAKE, obterSessao, obterToken, sair, type Sessao } from "@/lib/auth";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Pagina, Titulo } from "../ui";
import { Agenda } from "./Agenda";
import { Balcao } from "./Balcao";
import { ContextoAdmin, type ChamarAdmin } from "./contexto";
import { Dashboard } from "./Dashboard";
import { Despesas } from "./Despesas";

type Aba = "agenda" | "balcao" | "despesas" | "dashboard";

const ABAS: { id: Aba; nome: string }[] = [
  { id: "agenda", nome: "Agenda" },
  { id: "balcao", nome: "Novo" },
  { id: "despesas", nome: "Despesas" },
  { id: "dashboard", nome: "Mês" },
];

export function Painel() {
  // undefined = ainda verificando a sessão guardada.
  const [sessao, setSessao] = useState<Sessao | null | undefined>(undefined);
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("agenda");
  const [diaAgenda, setDiaAgenda] = useState<string | null>(null);
  const [avisoAgenda, setAvisoAgenda] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    obterSessao().then((s) => {
      if (ativo) setSessao(s);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const encerrar = useCallback((aviso: string | null) => {
    void sair();
    setAvisoLogin(aviso);
    setSessao(null);
  }, []);

  const chamar = useCallback<ChamarAdmin>(
    async (chamada) => {
      const token = await obterToken();
      if (!token) {
        encerrar("Sua sessão expirou. Entre de novo.");
        throw new ErroApi(401, "NAO_AUTENTICADO", "Sessão expirada. Entre de novo.");
      }
      try {
        return await chamada(token);
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) {
          encerrar("Sua sessão expirou. Entre de novo.");
        }
        throw erro;
      }
    },
    [encerrar],
  );

  if (sessao === undefined) {
    return (
      <Pagina>
        <Carregando />
      </Pagina>
    );
  }

  if (sessao === null) {
    return (
      <Login
        aviso={avisoLogin}
        aoEntrar={(nova) => {
          setAvisoLogin(null);
          setSessao(nova);
        }}
      />
    );
  }

  return (
    <ContextoAdmin value={chamar}>
      <header className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 pt-4">
        <p className="font-titulo text-xl uppercase tracking-widest">
          Barbearia <span className="text-ouro">Vaz</span>
        </p>
        <button
          type="button"
          onClick={() => encerrar(null)}
          className="min-h-11 rounded-lg px-3 text-sm text-suave underline underline-offset-4"
        >
          Sair
        </button>
      </header>

      <nav
        aria-label="Seções do painel"
        className="sticky top-0 z-10 mx-auto w-full max-w-md bg-fundo/95 px-4 py-3 backdrop-blur"
      >
        <ul className="grid grid-cols-4 gap-1 rounded-xl border border-borda bg-superficie p-1">
          {ABAS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={aba === item.id ? "page" : undefined}
                onClick={() => {
                  setAba(item.id);
                  setAvisoAgenda(null);
                }}
                className={`min-h-11 w-full rounded-lg text-sm font-semibold transition-colors ${
                  aba === item.id ? "bg-ouro text-fundo" : "text-suave hover:text-texto"
                }`}
              >
                {item.nome}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <Pagina>
        {aba === "agenda" && (
          <Agenda diaEscolhido={diaAgenda} aoMudarDia={setDiaAgenda} aviso={avisoAgenda} />
        )}
        {aba === "balcao" && (
          <Balcao
            aoCriar={(dia, aviso) => {
              setDiaAgenda(dia);
              setAvisoAgenda(aviso);
              setAba("agenda");
            }}
          />
        )}
        {aba === "despesas" && <Despesas />}
        {aba === "dashboard" && <Dashboard />}
      </Pagina>
    </ContextoAdmin>
  );
}

function Login({
  aviso,
  aoEntrar,
}: {
  aviso: string | null;
  aoEntrar: (sessao: Sessao) => void;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      aoEntrar(await entrar(email.trim(), senha));
    } catch (excecao) {
      setErro(
        excecao instanceof ErroLogin
          ? excecao.message
          : "Não foi possível entrar agora. Tente de novo em instantes.",
      );
      setEnviando(false);
    }
  }

  return (
    <>
      <Cabecalho subtitulo="Painel do barbeiro" />
      <Pagina>
        <Titulo>Entrar</Titulo>
        {aviso && <Aviso tipo="alerta">{aviso}</Aviso>}
        {MODO_FAKE && (
          <Aviso>Modo de demonstração: qualquer e-mail e senha entram.</Aviso>
        )}
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Botao type="submit" ocupado={enviando}>
            Entrar
          </Botao>
        </form>
      </Pagina>
    </>
  );
}
