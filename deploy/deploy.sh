#!/usr/bin/env bash
# Deploy na EC2 (rodar como root, via SSM). Só faz pull da imagem — nunca build.
# O .env.production vem do Parameter Store (/barbearia-vaz/env-production, SecureString), lido com a
# role da própria instância: nenhum segredo passa pela linha de comando nem fica no histórico do SSM.
set -euo pipefail

DIR=/var/www/barbearia-vaz
REGIAO=us-east-2
PARAMETRO=/barbearia-vaz/env-production
REPO_RAW=https://raw.githubusercontent.com/vinnisntos/barbearia-vaz/main

mkdir -p "$DIR"
cd "$DIR"
curl -fsSL "$REPO_RAW/deploy/docker-compose.yml" -o docker-compose.yml

# Credenciais temporárias da role da instância (IMDSv2).
IMDS=http://169.254.169.254/latest
TOKEN=$(curl -fsS -X PUT "$IMDS/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 120")
ROLE=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" "$IMDS/meta-data/iam/security-credentials/")
CREDS=$(curl -fsS -H "X-aws-ec2-metadata-token: $TOKEN" "$IMDS/meta-data/iam/security-credentials/$ROLE")
campo() { python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])" <<<"$CREDS"; }

umask 077
curl -fsS "https://ssm.$REGIAO.amazonaws.com/" \
  --aws-sigv4 "aws:amz:$REGIAO:ssm" \
  --user "$(campo AccessKeyId):$(campo SecretAccessKey)" \
  -H "x-amz-security-token: $(campo Token)" \
  -H "X-Amz-Target: AmazonSSM.GetParameter" \
  -H "Content-Type: application/x-amz-json-1.1" \
  -d "{\"Name\":\"$PARAMETRO\",\"WithDecryption\":true}" |
  python3 -c "import sys,json; sys.stdout.write(json.load(sys.stdin)['Parameter']['Value'])" >.env.production.novo
test -s .env.production.novo
[ -f .env.production ] && cp -p .env.production ".env.production.bak-$(date +%Y%m%d%H%M%S)"
mv .env.production.novo .env.production
chmod 600 .env.production

docker compose pull -q
docker compose up -d

for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3003/api/health >/dev/null 2>&1; then
    echo "OK: app respondendo em 127.0.0.1:3003"
    docker compose ps --format '{{.Name}} | {{.Image}} | {{.Status}}'
    docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' | grep barbearia || true
    exit 0
  fi
  sleep 2
done
echo "FALHA: app não respondeu ao healthcheck" >&2
docker compose logs --tail 40 >&2
exit 1
