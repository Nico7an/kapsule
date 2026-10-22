#!/usr/bin/env bash
# Construit l'image, lance les tests, puis crée ou met à jour la stack « kapsule »
# dans Portainer (stack gérée par Portainer, comme les autres du serveur).
#
#   scripts/deployer.sh
#
# Identifiants : ~/.config/portainer/env (PORTAINER_API_KEY, PORTAINER_URL).
# Variables de la stack : celles déjà dans Portainer, complétées et mises à jour
# par le .env — sauf les secrets (SMTP_PASSWORD…), dont la valeur saisie dans
# Portainer est conservée d'un déploiement à l'autre.
# L'image porte le commit courant (kapsule:<sha>) : chaque déploiement change le nom
# de l'image dans la stack, ce qui force Portainer à recréer le conteneur.
set -euo pipefail
cd "$(dirname "$0")/.."

STACK=kapsule
# Ancien nom de la stack : à sa création, la nouvelle en reprend les secrets
# (SMTP_PASSWORD…) saisis dans Portainer.
STACK_PRECEDENTE=cyber
ENDPOINT=${PORTAINER_ENDPOINT:-2}
HOTE=${KAPSULE_HOST:-kapsule.nico7an.fr}

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
IMAGE="kapsule:$TAG"

echo "→ Tests"
docker build -q --target tests -t kapsule:tests . >/dev/null

echo "→ Image $IMAGE"
docker build -q -t "$IMAGE" -t kapsule:latest . >/dev/null

PILES=$(api "$URL/api/stacks")
id_pile() { python3 -c "import json,sys; print(next((s['Id'] for s in json.load(sys.stdin) if s['Name']=='$1'), ''))" <<<"$PILES"; }
ID=$(id_pile "$STACK")
EXISTANTE=$([ -n "$ID" ] && api "$URL/api/stacks/$ID" || echo '{}')
# Première création : on repart des secrets de l'ancienne stack, s'il y en a une.
ID_PRECEDENTE=$([ -z "$ID" ] && id_pile "$STACK_PRECEDENTE" || true)
PRECEDENTE=$([ -n "$ID_PRECEDENTE" ] && api "$URL/api/stacks/$ID_PRECEDENTE" || echo '{}')

CORPS=$(python3 - "$IMAGE" "$STACK" "$EXISTANTE" "$PRECEDENTE" <<'PY'
import json, sys, os
image, nom, existante, precedente = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]), json.loads(sys.argv[4])
import re
SECRET = re.compile(r"PASSWORD|SECRET|TOKEN|_KEY$")
env_dict = {e["name"]: e["value"] for e in existante.get("Env") or []}
# Stack neuve : on reprend seulement les secrets de l'ancienne stack.
for e in precedente.get("Env") or []:
    if SECRET.search(e["name"]) and e["value"]:
        env_dict.setdefault(e["name"], e["value"])

if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip()
                if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                    v = v[1:-1]
                # Les secrets se gèrent dans l'env de la stack Portainer : un
                # déploiement ne les écrase jamais, et une valeur vide du .env
                # n'efface rien.
                if not v or (SECRET.search(k) and env_dict.get(k)):
                    continue
                env_dict[k] = v

env_dict["KAPSULE_IMAGE"] = image
env = [{"name": k, "value": v} for k, v in env_dict.items()]

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
# On attend que le conteneur tourne sur la nouvelle image et soit sain :
# l'ancien peut encore répondre quelques secondes après la mise à jour.
for _ in $(seq 1 60); do
  if [ "$(docker inspect kapsule --format '{{.Config.Image}} {{.State.Health.Status}}' 2>/dev/null)" = "$IMAGE healthy" ] \
    && curl -skf --max-time 3 "https://$HOTE/api/sante" >/dev/null; then
    echo " OK"
    echo "✓ https://$HOTE ($IMAGE)"
    exit 0
  fi
  echo -n "."; sleep 2
done
echo; echo "✗ Le service ne répond pas sur https://$HOTE — voir : docker logs kapsule" >&2
exit 1
