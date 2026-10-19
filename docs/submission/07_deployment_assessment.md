# 07 — Deployment Assessment

**Status established: Deployment tested in an isolated environment** (Docker under Colima on the owner's Mac). **Nothing is publicly live.**

## What the architecture actually needs
| Concern | Reality of the current stack | Implication |
|---|---|---|
| Processes | Hardhat node, contract deploy step, FastAPI, (Vite in dev) | Bundle into one container with an entrypoint |
| Chain | In-memory Hardhat chain (chain id 31337); lost on restart | Redeploy and reseed on every start (deterministic) |
| Database | SQLite file | Fine for a single instance; ephemeral by design |
| Evidence uploads | Content-addressed files on local disk, ≤ 10 MB, PDF/TXT/MD only | Ephemeral; never served back (hash-only verify) |
| Registry reference | Committed 38,004-row subset (full 493,518 index needs a 67 MB download) | Use the subset; it reproduces the demo fingerprint exactly |
| Frontend | Static build | Served by FastAPI (`ONCEONLY_STATIC_DIR`), same origin, so no CORS needed |
| Secrets | None required. Hardhat dev keys are public and only valid on the private in-container chain. The AI key is optional and off | No secret management needed for the demo |
| Abuse surface | Anyone could anchor, challenge or withdraw, and alter the story for other visitors | `ONCEONLY_PUBLIC_DEMO=1`: ledger writes return 403 with an explanation; claim checks rate-limited (10 per IP per 10 min) and capped (200 per instance) |

## Options compared
| | A. Local demo (current) | B. Public demo container (prepared) | C. Production-oriented |
|---|---|---|---|
| What it is | `make chain/deploy/api/web/seed` on a laptop | One Docker image: private chain + API + UI, reseeded at boot, read-only ledger | Persistent DB (Postgres), object storage, public testnet/L2 contract, auth, multi-tenant registrars |
| Status | **Verified** (30/30 Playwright, demo fingerprint ×3) | **Tested in isolation**: image builds (2:04), 29 pass + 1 skipped by design, identical fingerprint, restart recovers, works at 0.1 CPU / 512 MB (116 s cold start) | Not started; out of scope before the deadline |
| Judge value | Full interactivity incl. anchoring; requires running locally | One click, no setup; ledger writes disabled; ~2 min cold start if idle on a free tier | Would need weeks; doesn't change what the prototype proves |
| Risk | Presenter's machine only | Free-tier sleep and cold start; public abuse (mitigated); still a local chain inside the container | Cost, secrets, compliance |
| Cost | none | Free tier possible (Render free: 15-min idle spin-down, about 1 min wake per Render docs, plus our boot time) | Paid |

## Hosting options checked (primary docs, 2026-10-19)
- **Hugging Face Spaces (Docker):** current docs state Docker Spaces "require a paid plan to create" (PRO). It would need a paid account, so it is **not** recommended without your decision.
- **Render free web service:** Docker runtime supported. Docs: spins down after 15 min without traffic, takes about 1 minute to wake, 750 free instance-hours per month, ephemeral filesystem. RAM/CPU of the free instance weren't shown on the pages fetched; we measured that the container runs within 0.1 CPU / 512 MB. A `render.yaml` blueprint is prepared (`plan: free`, `autoDeploy: false`). Requires your Render account; for a private repo, granting Render access to the GitHub repo.
- Cloud Run, Fly.io and Railway need a billing method; not pursued.

## Does public deployment improve this entry?
**Modestly.** The official rules require a "working prototype, mockup, or proof-of-concept", not a hosted app. The video and repository carry most of the judging. A live link lowers friction for a judge who wants to click around, but on a free tier the first visit after idle waits about 2 minutes, and the instance must be honest that its chain is local to the container. **Recommendation:** the submission does not depend on it. If you approve, deploy B on Render free and put it under "Try it out" with the label "demo instance; ledger writes disabled; local chain inside the container".
