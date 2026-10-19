# 00 — Mission Status (single source of truth)

**Updated:** 2026-10-19 20:05 IST
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
| Milestone 6: hardening | Done: tests, e2e, secret scan, fresh-clone pass, container build |
| Submission package | Done in `docs/submission/` (Mission 04). Owner actions remain: make the repo public, final video upload, Devpost submission, licence choice, optional Render deployment |

## Mission 04: final product, deployment, demo film and submission (done; `feature/submission-readiness` merged to main)

- Official requirements re-verified (`docs/submission/00`). Deadline 25 Oct 2026 17:00 +03 = 19:30 IST.
- Deployment: one Docker image (private chain, deploy, seed, API + UI) with a read-only public demo mode. Tested in isolation (29 + 1 skipped Playwright, 3.8 s boot, fingerprint identical). Render blueprint prepared, **not deployed**.
- Demo: exact 444-word script, storyboard, checklist and fallbacks. Verified reference film (3:27, 1080p, synthetic narration) under `exports/` (not committed). `make demo-validate` replays the film: 23/23 beats, 8/8 checks.
- Devpost copy, judge Q&A (20 questions, with circular-evaluation caveats), final QA, compliance checklist and submission runbook: `docs/submission/01–13`.
- Fixed: the Ruler's bracket label rendered 36 px too high with motion on (overlapped the hero chip).
- Tests: 24 backend, 24 contract, 30 Playwright; Lighthouse 96–100 / 100 / 100; fresh clone passes.

## Mission 03: critique and final polish (done; `feature/final-polish` merged to main)

- Critique with scored areas and the 10 most consequential issues: `docs/design/08`. Changes and before/after: `docs/design/09`. Final QA: `docs/design/10`.
- The hero is now an annotated, full-width Ruler transect; the Ruler shows the overlap, boundaries and linked highlights on the instrument itself.
- Landing page shortened by 30% on mobile without removing evidence. Imprecise figures (11,631; Gold Standard pairs) corrected everywhere.
- Fixed defects found by new checks: dropped keystrokes in ledger search; claim-detail CLS 0.916 → 0; illegible small text; accessibility-tree issues; tests dirtying the tree.
- Tests: 22 backend, 24 contract, 30 Playwright (incl. keyboard-only, link crawl, axe). Lighthouse 97–100 performance and 100 accessibility on every audited page. Reset and seed reproducible (identical fingerprint ×3). Fresh clone passes.

## Mission 02 — product redesign (done, on `feature/frontend-redesign` → main)

- "Survey sheet" design system, landing story at `/`, app at `/overview`, redesigned ledger, intake, claim detail, verify and evidence pages. See `docs/design/01`–`07`.
- Signature element: the **Ruler**, an interactive, keyboard-accessible unit-range instrument built from real registry records.
- Verified: 15 Playwright interaction tests + 7 axe WCAG A/AA checks pass; 0 horizontal overflow across 11 routes × 5 viewports; 0 console errors; CLS ≤ 0.053; initial JS 102 kB gzip.
- Backend: read-only additions only (`/api/evidence/{sha256}`, `recent_chain_events`, gas results in `/api/eval`), with tests.

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
| `cd frontend && npx playwright test` | 30 passing (18 interaction + 4 keyboard + 1 link crawl + 7 axe WCAG A/AA) |
| `make eval` | 270 pairs: OnceOnly and contract P=R=1.000; baseline recall 0.333; batch-blind ablation 30 FP. Parser extraction 65% exact docs |

## Known failures and gaps

- AI extraction not measured. Parser fails on table-column, prose-range and OCR-error layouts (0/7 each).
- Local chain only; GitHub repo is **private** (must be public for submission).
- No auth; demo is single-tenant.

## Next three priorities

1. **B-15/B-16**: demo storyboard and script (docs 17–19) built around the new landing hero and claim page, judge Q&A, and a clean-clone setup test.
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
