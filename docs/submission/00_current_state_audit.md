# 00 — Current State Audit (2026-10-19, start of Mission 04)

## Repository
| Item | Value |
|---|---|
| Directory | `~/Projects/ClimateChain` |
| Remote | `origin` = https://github.com/Sidd927/ClimateChain.git (**private**) |
| Branch / HEAD | `main` at `159aabf` (Merge feature/final-polish) |
| `main` vs `origin/main` | identical (`159aabfd04df…`) after `git fetch` |
| Working tree | clean |
| Branches | main + 7 merged feature branches (all pushed) |
| Git identity | Siddhant Patil <siddhantpatil.hak@gmail.com>; no AI co-author trailers in history |

## Runtimes and tools (verified on this machine)
Node 26.4 / npm 11 · Python 3.12 venv (`.venv`) · Hardhat 2.29 / solc 0.8.24 · Google Chrome (used by Playwright, no browser download) · ffmpeg/ffprobe (Homebrew) · macOS `say` (offline text-to-speech) · Docker CLI + Colima (VM present, stopped).
Environment: `ANTHROPIC_API_KEY` is **empty** in `.env` (AI extraction disabled); no testnet RPC or deployer key configured.

## Running services at audit time
Hardhat node `127.0.0.1:8545`, FastAPI `127.0.0.1:8000`, Vite dev server `127.0.0.1:5173`.

## Commands (all exist in the Makefile)
`make setup` · `make chain` · `make deploy` · `make api` · `make web` · `make reset` · `make seed` · `make demo-check` · `make test` (contracts + backend) · `make gas` · `make eval` · `make e2e` · `make data` (optional full index) · `make demo-docs`.
Frontend checks: `cd frontend && npx playwright test` (expects the seeded stack).

## Routes and demo interactions
| Route | What a presenter can do |
|---|---|
| `/` | Story: hero Ruler transect with four step buttons and replay, "See this rejection as a real transaction" link, serial anatomy, checks table, live ledger + evaluation chart |
| `/overview` | Ledger stats, needs-attention list, chain transactions, system status |
| `/claims` | Filter chips, search, sortable columns, units bar |
| `/claims/new` | Five sample statements, file upload/drag, paste, Run checks |
| `/claims/:id` | Verdict, Ruler (selectable intervals, bracket, boundaries, table), provenance, findings, evidence, audit trail; actions (anchor with confirmation, forced registration, challenge, resolve, withdraw) |
| `/verify` | Reference + document fingerprint check, quick picks |
| `/evidence` | Registry audit, double-use evaluation, gas, extraction |
| `/evaluation` | Redirects to `/evidence` |

## Data facts (verified)
- `eval/results/registry_audit.json` (Berkeley VROD v2026-08, CC BY 4.0): 307,416 Verra retirements + 19,624 Verra issuances + 166,478 Gold Standard retirements = **493,518 registry rows**, all parsed. The full index is not committed; it's rebuilt by `make data` (downloads ≈67 MB).
- Committed `data/reference/demo_subset.csv.gz`: **38,004 real rows** (30,111 VCS retirements, 669 VCS issuances, 7,224 GS retirements) covering every demo scenario.
- All claimants and claim documents are synthetic (`data/demo/`).

## Deployability as structured (before this mission)
Four separate processes (Hardhat node, deploy script, FastAPI, Vite dev server); state in `var/` (SQLite + evidence files) and in the Hardhat node's memory (lost on restart). No production server for the frontend, no container definition, no read-only safeguards for a public audience. **Status: local demo verified; not deployment-ready.**
