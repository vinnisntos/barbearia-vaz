// Gera o GOOGLE_REFRESH_TOKEN da agenda do barbeiro e grava no .env.local.
// Uso: node scripts/google-token.mjs   (precisa de GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local)
// O cliente OAuth precisa aceitar o redirect http://localhost:53682/oauth2callback
// (tipo "App para computador" aceita sozinho; tipo "Aplicativo da Web" exige cadastrar essa URI).
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const ARQUIVO = new URL('../.env.local', import.meta.url);
const PORTA = 53682;
const REDIRECT = `http://localhost:${PORTA}/oauth2callback`;
const ESCOPO = 'https://www.googleapis.com/auth/calendar';

let env = readFileSync(ARQUIVO, 'utf8');
const ler = (nome) => (env.match(new RegExp(`^${nome}=(.*)$`, 'm'))?.[1] ?? '').trim();
const clienteId = ler('GOOGLE_CLIENT_ID');
const segredo = ler('GOOGLE_CLIENT_SECRET');
if (!clienteId || !segredo) {
  console.error('Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local antes de rodar.');
  process.exit(1);
}

const estado = randomBytes(16).toString('hex');
const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
url.search = new URLSearchParams({
  client_id: clienteId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: ESCOPO,
  access_type: 'offline',
  prompt: 'consent', // garante que o Google devolva um refresh token
  state: estado,
}).toString();

// Escuta em IPv4 e IPv6: o navegador pode resolver "localhost" para qualquer um dos dois.
const servidores = [];
const servidor = { close: () => servidores.forEach((s) => s.close()) };
const atender = async (req, res) => {
  const pedido = new URL(req.url ?? '/', REDIRECT);
  if (pedido.pathname !== '/oauth2callback') {
    res.writeHead(404).end();
    return;
  }
  const responder = (texto) => res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(texto);
  const codigo = pedido.searchParams.get('code');
  if (pedido.searchParams.get('state') !== estado || !codigo) {
    responder('Autorização recusada ou inválida. Volte ao terminal.');
    console.error('Falhou:', pedido.searchParams.get('error') ?? 'state/código inválido');
    servidor.close();
    process.exitCode = 1;
    return;
  }
  const resposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: clienteId,
      client_secret: segredo,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }),
  });
  const dados = await resposta.json();
  if (!resposta.ok || !dados.refresh_token) {
    responder('O Google não devolveu um refresh token. Volte ao terminal.');
    console.error('Falhou:', dados.error ?? 'sem refresh_token', dados.error_description ?? '');
    process.exitCode = 1;
  } else {
    env = /^GOOGLE_REFRESH_TOKEN=.*$/m.test(env)
      ? env.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${dados.refresh_token}`)
      : `${env.trimEnd()}\nGOOGLE_REFRESH_TOKEN=${dados.refresh_token}\n`;
    writeFileSync(ARQUIVO, env);
    responder('Pronto! Agenda conectada. Pode fechar esta aba.');
    console.log('GOOGLE_REFRESH_TOKEN gravado no .env.local.');
  }
  servidor.close();
};

for (const host of ['127.0.0.1', '::1']) {
  const s = createServer(atender);
  s.on('error', (e) => console.error(`Aviso: não foi possível escutar em ${host}: ${e.message}`));
  s.listen(PORTA, host);
  servidores.push(s);
}
{
  console.log('Abra este endereço no navegador, logado na conta Google DA AGENDA DO BARBEIRO:\n');
  console.log(url.toString());
  console.log('\nAguardando a autorização...');
}
