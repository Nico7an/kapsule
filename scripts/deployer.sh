#!/usr/bin/env bash
# Construit l'image, lance les tests, puis crée ou met à jour la stack « cyber »
# dans Portainer (stack gérée par Portainer, comme les autres du serveur).
#
#   scripts/deployer.sh
#
# Identifiants : ~/.config/portainer/env (PORTAINER_API_KEY, PORTAINER_URL).
# L'image porte le commit courant (cyber:<sha>) : chaque déploiement change le nom
# de l'image dans la stack, ce qui force Portainer à recréer le conteneur.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK=cyber
ENDPOINT=${PORTAINER_ENDPOINT:-2}
HOTE=${CYBER_HOST:-cyber.nico7an.fr}

[ -f ~/.config/portainer/env ] && . ~/.config/portainer/env
: "${PORTAINER_API_KEY:?PORTAINER_API_KEY manquant (~/.config/portainer/env)}"

# Portainer n'écoute que sur l'adresse du réseau local : si l'URL configurée
# ne répond pas (localhost), on se replie sur celle-ci.
URL=${PORTAINER_URL:-}
if [ -z "$URL" ] || ! curl -sk -o /dev/null --max-time 3 "$URL/api/system/status"; then
  URL=https://192.168.1.22:9443
fi
api() { curl -sk --fail-with-body -H "X-API-Key: $PORTAINER_API_KEY" -H "Content-Type: application/json" "$@"; }

TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "v1")
git diff --quiet HEAD -- . 2>/dev/null || TAG="$TAG-local"
IMAGE="cyber:$TAG"

echo "→ Tests"
docker build -q --target tests -t cyber:tests . >/dev/null

echo "→ Image $IMAGE"
docker build -q -t "$IMAGE" -t cyber:latest . >/dev/null

ID=$(api "$URL/api/stacks" | python3 -c "import json,sys; print(next((s['Id'] for s in json.load(sys.stdin) if s['Name']=='$STACK'), ''))")
EXISTANTE=$([ -n "$ID" ] && api "$URL/api/stacks/$ID" || echo '{}')

CORPS=$(python3 - "$IMAGE" "$STACK" "$EXISTANTE" <<'PY'
import json, sys
image, nom, existante = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
env = [e for e in existante.get("Env") or [] if e["name"] != "CYBER_IMAGE"]
env.append({"name": "CYBER_IMAGE", "value": image})
corps = {"stackFileContent": open("docker-compose.yml", encoding="utf-8").read(), "env": env}
if existante:
    corps |= {"prune": True, "pullImage": False}
else:
    corps["name"] = nom
print(json.dumps(corps))
PY
)

if [ -z "$ID" ]; then
  echo "→ Création de la stack $STACK dans Portainer"
  api -X POST "$URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT" -d "$CORPS" >/dev/null
else
  echo "→ Mise à jour de la stack $STACK (#$ID) dans Portainer"
  api -X PUT "$URL/api/stacks/$ID?endpointId=$ENDPOINT" -d "$CORPS" >/dev/null
fi

echo -n "→ Attente du service"
for _ in $(seq 1 30); do
  if curl -skf --max-time 3 "https://$HOTE/api/sante" >/dev/null || curl -sf --max-time 3 "http://127.0.0.1:3000/api/sante" >/dev/null; then
    echo " OK"
    echo "✓ https://$HOTE ($IMAGE)"
    exit 0
  fi
  echo -n "."; sleep 2
done
echo; echo "✗ Le service ne répond pas sur https://$HOTE — voir : docker logs cyber" >&2
exit 1
