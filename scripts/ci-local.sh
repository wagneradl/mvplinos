#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts/ci-$(date +"%Y%m%d-%H%M%S")"
mkdir -p "$ART_DIR"

log() { echo -e "\n===== $1 =====\n" | tee -a "$ART_DIR/summary.txt"; }

cleanup() {
  # Tenta matar o frontend se ele tiver sido iniciado
  if [[ -f "$ART_DIR/frontend.pid" ]]; then
    PID="$(cat "$ART_DIR/frontend.pid" 2>/dev/null || true)"
    if [[ -n "${PID:-}" ]]; then
      kill "$PID" 2>/dev/null || true
    fi
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR"

log "SYSTEM INFO"
{
  echo "date: $(date)"
  echo "pwd: $(pwd)"
  echo "user: $(whoami)"
  echo "node: $(node -v || true)"
  echo "yarn: $(yarn -v || true)"
  echo "turbo: $(yarn turbo --version 2>/dev/null || true)"
  echo "git branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  echo "git sha: $(git rev-parse --short HEAD 2>/dev/null || true)"
} | tee "$ART_DIR/system.txt" | tee -a "$ART_DIR/summary.txt"

log "PERMISSIONS QUICK CHECK (frontend client files)"
ls -la packages/frontend/src/app/clientes/[id]/editar 2>/dev/null | tee "$ART_DIR/ls-clientes-editar.txt" || true
ls -la packages/frontend/src/app/produtos/[id]/editar 2>/dev/null | tee "$ART_DIR/ls-produtos-editar.txt" || true

log "CLEAN"
rm -rf "$ROOT_DIR/node_modules/.cache" || true
rm -rf "$ROOT_DIR/.turbo" || true
rm -rf "$ROOT_DIR/packages/frontend/.next" || true
rm -rf "$ROOT_DIR/packages/backend/dist" || true
rm -rf "$ROOT_DIR/packages/frontend/coverage" || true
rm -rf "$ROOT_DIR/packages/backend/coverage" || true

log "INSTALL (frozen lockfile)"
yarn install --frozen-lockfile 2>&1 | tee "$ART_DIR/install.log" || true

log "LINT (root, ci mode)"
( yarn lint:ci ) 2>&1 | tee "$ART_DIR/lint.log" || true

log "TYPECHECK (if exists)"
if yarn run -s | grep -q '^typecheck$'; then
  ( yarn typecheck ) 2>&1 | tee "$ART_DIR/typecheck.log" || true
else
  echo "No typecheck script found. Skipping." | tee "$ART_DIR/typecheck.log"
fi

log "TEST (root, ci mode)"
( yarn test:ci ) 2>&1 | tee "$ART_DIR/test.log" || true

log "BUILD (root, ci mode)"
( yarn build:ci ) 2>&1 | tee "$ART_DIR/build.log" || true

log "FRONTEND PROD-LIKE SMOKE"
cd "$ROOT_DIR/packages/frontend"
( yarn build ) 2>&1 | tee "$ART_DIR/frontend-build.log" || true

# Sobe o frontend e guarda PID (trap vai matar no final)
( nohup yarn start >"$ART_DIR/frontend-start.log" 2>&1 & echo $! > "$ART_DIR/frontend.pid" ) || true

sleep 2

log "HEALTHCHECK (frontend)"
curl -fsS http://localhost:3000/api/health 2>&1 | tee "$ART_DIR/frontend-health.txt" || true

log "DONE"
echo "Artifacts at: $ART_DIR" | tee -a "$ART_DIR/summary.txt"