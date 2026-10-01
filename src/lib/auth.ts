// Autenticação do painel admin.
// Com NEXT_PUBLIC_MODO_FAKE=1 qualquer e-mail/senha entra e o token é "fake";
// fora disso, Supabase Auth. Todo o desvio do modo fake fica neste arquivo.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MODO_FAKE = process.env.NEXT_PUBLIC_MODO_FAKE === "1";
// Pagamento simulado com banco e login reais (MODO_FAKE=pagamentos,... no servidor).
export const PAGAMENTO_FAKE = MODO_FAKE || process.env.NEXT_PUBLIC_PAGAMENTO_FAKE === "1";

const TOKEN_FAKE = "fake";
const CHAVE_FAKE = "bv.admin.fake";

export interface Sessao {
  email: string;
}

export class ErroLogin extends Error {}

let cliente: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    throw new ErroLogin(
      "Login indisponível: o Supabase não está configurado neste ambiente.",
    );
  }
  cliente = createClient(url, chave);
  return cliente;
}

function lerFake(): Sessao | null {
  try {
    const email = window.sessionStorage.getItem(CHAVE_FAKE);
    return email ? { email } : null;
  } catch {
    return null;
  }
}

export async function entrar(email: string, senha: string): Promise<Sessao> {
  if (MODO_FAKE) {
    try {
      window.sessionStorage.setItem(CHAVE_FAKE, email);
    } catch {
      // Sem storage a sessão vale só até recarregar a página.
    }
    return { email };
  }

  const { data, error } = await supabase().auth.signInWithPassword({
    email,
    password: senha,
  });
  if (error || !data.session) {
    const credenciais = error?.status === 400 || error?.code === "invalid_credentials";
    throw new ErroLogin(
      credenciais
        ? "E-mail ou senha incorretos."
        : "Não foi possível entrar agora. Tente de novo em instantes.",
    );
  }
  return { email: data.user?.email ?? email };
}

export async function obterSessao(): Promise<Sessao | null> {
  if (MODO_FAKE) return lerFake();
  try {
    const { data } = await supabase().auth.getSession();
    if (!data.session) return null;
    return { email: data.session.user.email ?? "" };
  } catch {
    return null;
  }
}

/** Token para o header Authorization. O Supabase renova sozinho quando preciso. */
export async function obterToken(): Promise<string | null> {
  if (MODO_FAKE) return TOKEN_FAKE;
  try {
    const { data } = await supabase().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function sair(): Promise<void> {
  if (MODO_FAKE) {
    try {
      window.sessionStorage.removeItem(CHAVE_FAKE);
    } catch {
      // nada a limpar
    }
    return;
  }
  try {
    await supabase().auth.signOut();
  } catch {
    // Mesmo que o signOut remoto falhe, a UI volta para o login.
  }
}
