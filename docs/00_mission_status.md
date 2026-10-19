# 00 — Mission Status (single source of truth)

**Updated:** 2026-10-19 14:10 IST
**Deadline:** Sun 25 Oct 2026, 14:00 UTC = **19:30 IST** (verified on the Devpost overview; see doc 01 §5). **Internal submit target: Sat 24 Oct, 21:00 IST.**
**Project:** OnceOnly — every retired tonne, claimed once. Track: Carbon Markets & Emissions Transparency.

## Where we are

| Phase | Status |
|---|---|
| A. Competition intelligence (docs 01–04) | Done |
| B. Idea selection + thesis (docs 05–06) | Done. Selected claim-layer double-use ledger (score 8.55 vs 6.55 runner-up) |
| C. Product design (docs 07–09) | Done |
| D. Architecture (docs 10–13) | Done |
| E/F. AI + blockchain + evaluation (doc 14) | Contract and evaluation done; AI extraction implemented but **not evaluated** (no API key) |
| G. Build: Milestones 1–4 | Verified end to end on a local chain |
| Milestone 5: demo scenario | Five sample documents; story verified in the browser and by `make e2e` |
| Milestone 6: hardening | Partly done (tests, e2e, secret scan). Clean-clone test pending |
| Docs 17–22 (demo, Devpost, compliance, release) | Not started (planned D1–D4) |

## Working features (verified)

- Claim intake (PDF/TXT/paste), in-browser and server SHA-256 fingerprints
- Serial extraction (parser), reconciliation against real VROD records (full index or committed subset)
- Findings with rule IDs, uncertainty and next steps; unit-strip visualization
- Anchoring on ClaimLedger; contract-level rejection of overlapping ranges with decoded `RangeOverlap` and a mined failed transaction
- Challenge → uphold/dismiss → units released; withdraw
- Verification by reference plus document hash (match/tamper)
- Integrity report (HTML/JSON); Evidence page reading result files

## Test evidence (2026-10-19)

| Command | Result |
|---|---|
| `make test-contracts` | 24 passing (incl. adversarial-hint property test, gas benchmark) |
| `make test-backend` | 22 passing |
| `make e2e` | 13/13 checks passing |
| `make eval` | 270 pairs: OnceOnly and contract P=R=1.000; baseline recall 0.333; batch-blind ablation 30 FP. Parser extraction 65% exact docs |

## Known failures and gaps

- AI extraction not measured. Parser fails on table-column, prose-range and OCR-error layouts (0/7 each).
- Local chain only; GitHub repo is **private** (must be public for submission).
- No auth; demo is single-tenant.

## Next three priorities

1. **B-15/B-16**: demo storyboard and script (docs 17–19), judge Q&A, and a clean-clone setup test.
2. **B-11/B-13**: measure AI extraction and deploy to a public testnet, *if the owner provides keys*.
3. **B-17**: Devpost text, compliance checklist, release notes; UI polish pass.

Done since last update: **B-12 scalable contract.** On-chain cost is now O(1) per registration via hinted sorted interval lists. Measured flat at 301,452 gas from 10 to 200 claims per batch (linear v0: 832,608 at 200).

## Decisions needed from the owner

| Decision | Why it matters |
|---|---|
| Provide an `ANTHROPIC_API_KEY` (in your local `.env`) to evaluate AI extraction | Without it, the AI feature is implemented but unproven; the demo says so |
| Provide a funded **test-only** key + RPC for Sepolia (or another testnet), or accept local-only | Public explorer links strengthen credibility; local-only is honest but weaker |
| Make the GitHub repo public (before submission) | Required by the rules |
| License choice (MIT suggested, matching the contract's SPDX header) | Public repo should state terms |
| Open the Devpost submission form to confirm fields (file upload? track selector?) | Forum reports differ from the official page |

## Git

`main` contains all merged, tested work: contracts → backend-core → frontend → (evaluation + docs, this commit). Feature branches are pushed to `origin`.
