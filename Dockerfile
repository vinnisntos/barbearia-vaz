# Imagem de produção (Next.js standalone). É buildada pelo GitHub Actions e publicada no ghcr;
# na EC2 só se faz pull — nunca build (a máquina é pequena e compartilhada).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# As NEXT_PUBLIC_* entram no bundle do navegador em tempo de build. Nenhuma é segredo.
# NEXT_PUBLIC_MODO_FAKE=1 (login fake: qualquer e-mail e senha entram no painel) só é passado pelo CI
# desta branch, cuja demo roda inteira em memória (MODO_FAKE=1 no compose) — nunca use com banco real.
# NEXT_PUBLIC_PAGAMENTO_FAKE=1 só mostra o
# botão "Simular pagamento" do ambiente demonstrativo (Asaas sandbox); com o Asaas de produção a rota
# por trás dele responde 404, então deixe a variável vazia no build de produção.
ARG NEXT_PUBLIC_MODO_FAKE
ARG NEXT_PUBLIC_PAGAMENTO_FAKE
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_WHATSAPP_BARBEARIA
ENV NEXT_PUBLIC_MODO_FAKE=$NEXT_PUBLIC_MODO_FAKE \n    NEXT_PUBLIC_PAGAMENTO_FAKE=$NEXT_PUBLIC_PAGAMENTO_FAKE \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_WHATSAPP_BARBEARIA=$NEXT_PUBLIC_WHATSAPP_BARBEARIA \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
