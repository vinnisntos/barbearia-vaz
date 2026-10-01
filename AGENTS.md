<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Barbearia Vaz

Leia antes de codar: `docs/PRD.md` (regras e decisões), `docs/API.md` (contrato),
`supabase/migrations/0001_init.sql` (schema), `docs/BACKLOG.md` (o que é seu).

## Regras
- Código, nomes de domínio e textos de UI em português (pt-BR). TypeScript estrito, sem `any`.
- O contrato em `docs/API.md` manda. Não mude formato de resposta sem atualizar o arquivo.
- Não edite `supabase/migrations/0001_init.sql`; mudança de schema = nova migration numerada.
- Não faça `git commit`, `git push` nem instale dependências novas sem necessidade clara.
- Nunca grave CPF no banco nem em log. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`/`ASAAS_API_KEY` ao cliente.
- Dinheiro: calcule em centavos (inteiro) e converta na borda.
- Fuso de negócio: `America/Sao_Paulo`.

## Divisão de pastas (não escreva fora da sua)
- **Backend**: `src/server/**`, `src/app/api/**`, testes em `src/server/**/*.test.ts`.
- **Frontend**: `src/app/**` exceto `src/app/api`, `src/components/**`, `src/lib/**`.

## Arquitetura do backend
- `src/server/portas.ts`: interfaces `Repositorio`, `Pagamentos`, `Calendario`.
- `src/server/adaptadores/`: implementações reais (Supabase, Asaas, Google) e fakes em memória.
- `src/server/container.ts`: com `MODO_FAKE=1` entrega os fakes (com serviços e horários semeados,
  estado em `globalThis` para sobreviver ao hot reload); senão, os reais.
- `src/server/casos/`: regras de negócio puras, recebem as portas por parâmetro — é aqui que
  ficam os testes.
- Route handlers finos: validam com zod, chamam o caso de uso, traduzem erros para o formato do contrato.

## Pronto significa
`npm run typecheck`, `npm run lint`, `npm test` e `npm run build` passando.
