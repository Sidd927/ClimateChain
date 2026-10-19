#!/usr/bin/env bash
# Start the OnceOnly demo instance: local chain -> contract -> private seeding API -> public API.
set -euo pipefail
cd /app
mkdir -p "$(dirname "$ONCEONLY_DB")" "$ONCEONLY_EVIDENCE_DIR"
rm -f "$ONCEONLY_DB"; rm -rf "${ONCEONLY_EVIDENCE_DIR:?}"/*

echo "[onceonly] starting local chain (127.0.0.1:8545, not exposed)"
(cd contracts && npx hardhat node --hostname 127.0.0.1 --port 8545 > /tmp/onceonly/hardhat.log 2>&1) &
for i in $(seq 1 90); do
  curl -fs -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null && break
  sleep 1
done

echo "[onceonly] deploying ClaimLedger"
(cd contracts && npx hardhat run scripts/deploy.js --network localhost)

echo "[onceonly] seeding the demo story through a private, write-enabled API"
(cd backend && ONCEONLY_PUBLIC_DEMO=0 /app/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --log-level warning) &
SEED_API=$!
for i in $(seq 1 60); do curl -fs http://127.0.0.1:8001/api/health >/dev/null && break; sleep 1; done
ONCEONLY_API=http://127.0.0.1:8001 /app/.venv/bin/python backend/scripts/seed_demo.py
ONCEONLY_API=http://127.0.0.1:8001 /app/.venv/bin/python backend/scripts/demo_fingerprint.py | tail -1
kill "$SEED_API"; wait "$SEED_API" 2>/dev/null || true

echo "[onceonly] serving on 0.0.0.0:${PORT} (public demo mode: ${ONCEONLY_PUBLIC_DEMO})"
cd backend
exec /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --proxy-headers --forwarded-allow-ips='*'
