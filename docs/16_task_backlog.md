# 16 — Task Backlog

Status vocabulary: **Not started** · **In progress** · **Implemented** (code exists) · **Tested** (automated tests pass) · **Verified E2E** (exercised through the running app or `make e2e`).

## P0: MVP (must ship)

| ID | Task | Status | Evidence |
|---|---|---|---|
| B-01 | ClaimLedger contract: non-overlap per (registry, batch), duplicate ref, challenge/resolve/withdraw | Verified E2E | 16 Hardhat tests; `make e2e` |
| B-02 | Serial parser (Verra current/legacy/2025, Gold Standard current/legacy) | Tested | 8 pytest; 100% of 493,518 VROD rows |
| B-03 | Registry reference index + audit from VROD | Tested | `eval/results/registry_audit.json` |
| B-04 | Rules engine (EVD, SER, REG, BEN, DUP, AGG, EXT) | Tested | 14 service tests |
| B-05 | Evidence ingestion (PDF/TXT/paste), SHA-256, content-addressed storage | Verified E2E | sample PDFs in UI and e2e |
| B-06 | Anchoring with review acknowledgement; forced attempt shows on-chain revert | Verified E2E | browser walkthrough; e2e |
| B-07 | Verify by reference and document hash (match/tamper) | Verified E2E | e2e |
| B-08 | Frontend: overview, ledger, intake, claim detail + unit strip, verify, evidence | Verified E2E (manual browser walkthrough, desktop + mobile) | screenshots in session |
| B-09 | Synthetic demo documents (5 scenarios) citing real retirements | Verified E2E | `data/demo/` |
| B-10 | Evaluation harness E2 + E3 + contract replay | Tested | `eval/results/latest.md` |

## P1: next

| ID | Task | Status | Notes |
|---|---|---|---|
| B-11 | Measure AI extraction (E3) with a real API key; record cost and latency | Not started | **Needs ANTHROPIC_API_KEY from the account owner** |
| B-12 | Scalable on-chain overlap check (hinted sorted linked list, O(1) verify) + gas benchmark vs namespace size | Not started | Max 37,284 retirements in one Verra batch makes the linear scan unsafe |
| B-13 | Public testnet deployment (e.g., Sepolia) + explorer links in UI | Not started | **Needs a funded test-only key**; otherwise stays local and labelled |
| B-14 | Multi-document evidence commitment as a Merkle root (independent per-document verification) | Not started | Single-document claims are already independently verifiable |
| B-15 | README, demo storyboard and script (docs 17–19), judge Q&A | Not started | |
| B-16 | Clean-clone setup test (fresh directory: `make setup`, chain, deploy, api, web) | Not started | |
| B-17 | Devpost text, compliance checklist, release notes (docs 20–22) | Not started | After implementation is stable |
| B-18 | Record the 3–5 min demo video | Not started | Owner records; script provided |
| B-19 | Make the GitHub repository public before submission | Not started | **Owner decision**: currently private |

## P2: stretch

| ID | Task | Notes |
|---|---|---|
| B-20 | EIP-712 claimant signatures (the claimant, not the platform, authorizes registration) | Strengthens permissioning story |
| B-21 | Hosted demo (static frontend + API on a free tier) | Optional; the local demo is the primary path |
| B-22 | BEN-001 evaluation on real beneficiary/claimant pairs | |
| B-23 | Import registry updates beyond VROD 2026-08 | Data-access dependent |
