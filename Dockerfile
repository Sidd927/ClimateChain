# OnceOnly demo instance: one container running a private local chain, the API and the built UI.
# State (SQLite, evidence files, chain) lives inside the container and is rebuilt on every start,
# so every restart produces the same seeded demo story. See docs/submission/08_deployment_runbook.md.

# ---- frontend build -----------------------------------------------------------
FROM node:22-bookworm-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- runtime ------------------------------------------------------------------
FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv curl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN chown node:node /app
USER node

# contracts: install, compile (solc is fetched at build time, not at runtime)
COPY --chown=node:node contracts/package.json contracts/package-lock.json contracts/
RUN cd contracts && npm ci --no-audit --no-fund
COPY --chown=node:node contracts/ contracts/
ENV HARDHAT_DISABLE_TELEMETRY_PROMPT=true
RUN cd contracts && npx hardhat compile

# backend
COPY --chown=node:node backend/requirements.txt backend/
RUN python3 -m venv /app/.venv && /app/.venv/bin/pip install --no-cache-dir -r backend/requirements.txt
COPY --chown=node:node backend/ backend/
COPY --chown=node:node data/reference/demo_subset.csv.gz data/reference/
COPY --chown=node:node data/demo/ data/demo/
COPY --chown=node:node eval/results/ eval/results/
COPY --chown=node:node deploy/entrypoint.sh deploy/
COPY --chown=node:node --from=web /app/frontend/dist frontend/dist

# Publicly known Hardhat development keys: valid only on the chain inside this container,
# which listens on 127.0.0.1 and is never exposed. Never use real or funded keys here.
ENV PORT=7860 \
    ONCEONLY_PUBLIC_DEMO=1 \
    ONCEONLY_STATIC_DIR=/app/frontend/dist \
    ONCEONLY_REFERENCE_MODE=demo \
    ONCEONLY_DB=/tmp/onceonly/onceonly.sqlite \
    ONCEONLY_EVIDENCE_DIR=/tmp/onceonly/evidence \
    ONCEONLY_REFERENCE_DEMO_DB=/tmp/onceonly/registry_demo.sqlite \
    CHAIN_RPC_URL=http://127.0.0.1:8545 \
    CHAIN_DEPLOYMENT=contracts/deployments/localhost.json \
    REGISTRAR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    REVIEWER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    CHALLENGER_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a \
    ANTHROPIC_API_KEY= \
    ONCEONLY_LLM=off

EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s CMD curl -fs "http://127.0.0.1:${PORT}/api/health" || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bash", "deploy/entrypoint.sh"]
