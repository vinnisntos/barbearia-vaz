#!/usr/bin/env bash
# Deploy na EC2 (rodar como root, via SSM). Só faz pull da imagem — nunca build.
# Demo em memória (MODO_FAKE=1 no compose): não há .env nem segredo para buscar.
set -euo pipefail

DIR=/var/www/barberdemo
REPO_RAW=https://raw.githubusercontent.com/vinnisntos/barbearia-vaz/barbearia

mkdir -p "$DIR"
cd "$DIR"
curl -fsSL "$REPO_RAW/deploy/docker-compose.yml" -o docker-compose.yml

docker compose pull -q
docker compose up -d

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3004/api/health >/dev/null 2>&1; then
    echo "OK: app respondendo em 127.0.0.1:3004"
    docker compose ps --format '{{.Name}} | {{.Image}} | {{.Status}}'
    docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep barberdemo || true
    exit 0
  fi
  sleep 2
done
echo "FALHA: app não respondeu ao healthcheck" >&2
docker compose logs --tail 40 >&2
exit 1
