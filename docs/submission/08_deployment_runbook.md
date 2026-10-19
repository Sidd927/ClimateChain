# 08 — Deployment Runbook

**Status: deployment configuration prepared and tested in an isolated environment (Docker/Colima). Not publicly deployed.**

## A. Local demo (primary, verified)
Prerequisites: Python 3.12, Node 20+ (tested on 26), make, Google Chrome.

Run once:

```bash
make setup
```

Terminal 1:

```bash
make chain
```

Terminal 2:

```bash
make deploy && make api
```

Terminal 3:

```bash
make web
```

Then load the demo story (with the API running):

```bash
make seed
```

Confirm the state:

```bash
make demo-check
```

Expected last line: `fingerprint c544f5897354081cf1d20efb366b951f14d2b8ffa69bcb87b105cfdc0df6483b`. Open http://127.0.0.1:5173.

To reset, keep the chain running, run `make reset`, restart `make api`, then `make seed` and `make demo-check`.

## B. Container (tested in isolation)
Prerequisite: a running Docker engine. On this Mac, start one with `colima start`.

Build the image (about 2 minutes, 2.05 GB):

```bash
make docker-build
```

Run it:

```bash
make docker-run
```

Open http://127.0.0.1:7860. The container prints the demo fingerprint at boot; it must equal the value above.

### Environment variables (all have safe defaults in the Dockerfile)
| Variable | Default in image | Meaning |
|---|---|---|
| `PORT` | 7860 | Listening port (hosts such as Render inject their own) |
| `ONCEONLY_PUBLIC_DEMO` | 1 | Refuse ledger writes (403 with explanation); rate-limit and cap claim checks |
| `ONCEONLY_PUBLIC_MAX_CLAIMS` | 200 | Claim cap per instance lifetime |
| `ONCEONLY_PUBLIC_RATE` | 10 | Claim checks per IP per 10 minutes |
| `ONCEONLY_STATIC_DIR` | /app/frontend/dist | Built UI served by the API |
| `ONCEONLY_LLM` / `ANTHROPIC_API_KEY` | off / empty | AI extraction disabled. **Do not** put a real key in a public instance without a cost limit |
| `REGISTRAR_/REVIEWER_/CHALLENGER_PRIVATE_KEY` | Hardhat public dev keys | Valid only on the private chain inside the container (127.0.0.1:8545, not published) |

### Security notes
- The only published port is the HTTP port. The chain RPC listens on the container's loopback only.
- No secrets are needed or baked in. `.env` files are excluded by `.dockerignore`.
- Uploads: ≤ 10 MB, `.pdf/.txt/.md` only, stored content-addressed in `/tmp` and never served back.
- `X-Forwarded-For` is trusted for rate limiting, which a client can spoof. That's acceptable for a demo, not for production.
- State is ephemeral: a restart wipes it and reseeds the identical story.

## C. Public deployment on Render (prepared; needs owner approval)
**Approval required:** creating a Render account or service, and granting Render access to the GitHub repository (or making the repo public first). Free tier; no payment is needed per Render's free-tier docs.

1. Push `main` (already done for this commit).
2. In Render: **New → Blueprint**, select `Sidd927/ClimateChain`, branch `main`. It reads `render.yaml` (`runtime: docker`, `plan: free`, health check `/api/health`, `autoDeploy: false`).
3. Wait for the build (several minutes), then the boot (about 4 s at full CPU; 116 s measured at 0.1 CPU).
4. Smoke test (replace the URL):
   - `curl -s https://<service>.onrender.com/api/health` should show `"public_demo":true` and `"chain":{"available":true,...}`.
   - `/claims/2` should load in a browser and show "4,559 units already back OO-2026-0001".
   - `cd frontend && BASE_URL=https://<service>.onrender.com npx playwright test` is expected to give 29 passed and 1 skipped (forced-registration dialog disabled in public mode).
5. Label the link in Devpost: "Demo instance (ledger writes disabled; contract runs on a private chain inside the container; may take about 2 minutes to wake)".

**Update:** push to `main`, then **Manual Deploy** in Render.
**Rollback:** Render → Deploys → select the previous deploy → **Rollback**. Or delete the service; nothing persistent is lost.

## Measured container facts (2026-10-19)
| Check | Result |
|---|---|
| Build | success: 2 min 04 s cold; 24 s rebuild with cached layers; image 2.05 GB |
| Boot to serving (4 CPU, Colima, rebuilt image, 2026-10-19 14:21 UTC) | 3.8 s from container start to Uvicorn listening (`docker logs -t`); fingerprint identical to local |
| Boot under `--cpus=0.1 --memory=512m` | 116 s; 198 MB; not OOM-killed; fingerprint identical |
| Warm response at 0.1 CPU | `/` 4 ms, `/api/claims/2` 2 ms, `/api/overview` 182 ms |
| Restart | identical fingerprint |
| Playwright against container | 29 passed, 1 skipped (by design) |
| Ledger write in public mode | HTTP 403 with explanation |
| Memory at steady state | 213–247 MB |

## Known limitations
Free-tier sleep and cold start; the chain is local to the container (not a public network); no persistence by design; the image is large (Hardhat toolchain and pandas); the rate limit is per-process and resets on restart.
