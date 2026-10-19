# 15 — Implementation Plan

Now: Mon 19 Oct 2026 (IST). Hard deadline: **Sun 25 Oct 2026 19:30 IST** (14:00 UTC). Internal submit target: **Sat 24 Oct 21:00 IST**.

| Day | Date | Goal | Exit criterion |
|---|---|---|---|
| D0 | Mon 19 Oct | Research, selection, docs 01–16; contract + tests; backend skeleton; parser audit on real data; first vertical slice | `make test` green; a claim can be registered and an overlap is rejected via the API |
| D1 | Tue 20 Oct | Rules engine complete; registry reference; frontend wizard + claim detail + unit strip; seed/demo certificates | Full J1 + J2 in the browser |
| D2 | Wed 21 Oct | Verify + challenge flows; evaluation harness + results page; LLM extractor (if key) | J3, J4, J5; `make eval` writes results |
| D3 | Thu 22 Oct | Hardening, clean-clone setup test, UI polish, mobile; open the Devpost form to confirm fields | Clean-clone run passes; checklist updated |
| D4 | Fri 23 Oct | Demo script rehearsal, record video, README, Devpost text, screenshots | Video draft 3–5 min |
| D5 | Sat 24 Oct | Final fixes, re-record if needed, **submit by 21:00 IST** | Submission confirmed on Devpost |
| D6 | Sun 25 Oct | Buffer only (deadline 19:30 IST) | — |

## Stack (decided after checking the environment)

- Node 26.4 / npm 11 available → Hardhat 2.x (Solidity 0.8.24) for contracts; Vite + React + TS + Tailwind for UI.
- Python 3.12 (Homebrew) venv → FastAPI, web3.py, pypdf, rapidfuzz, reportlab, anthropic (optional).
- SQLite (zero-ops, file-based, reproducible).
- Docker is installed but not running → not required by our setup.

## Git workflow

`main` stays runnable. Feature branches: `feature/contracts`, `feature/backend-core`, `feature/frontend`, `feature/evaluation`, merged with `--no-ff` after tests pass, then pushed.
