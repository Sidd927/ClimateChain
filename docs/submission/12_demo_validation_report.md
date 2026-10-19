# 12 — Demo Validation Report (2026-10-19)

**Result: VALID.** The complete scripted demo (23 beats, `frontend/qa/demo/beats.mjs`) ran end to end in a real browser on a fresh ledger: 23/23 beats and 8/8 outcome checks passed, with no application errors in the browser or on the API. The seeded judge state reproduces the same fingerprint on every reset.

## Environment
| Item | Value |
|---|---|
| Machine | macOS 27.0 (Apple silicon), Google Chrome via Playwright (`channel: "chrome"`) |
| Stack | Hardhat node `127.0.0.1:8545` (chain id 31337) · FastAPI `127.0.0.1:8000` · Vite dev server `127.0.0.1:5173` |
| Registry reference | Full index, 493,518 rows (Berkeley VROD 2026-08) |
| AI extraction | Not configured (`ANTHROPIC_API_KEY` empty); deterministic parser only |
| Viewport | 1440 × 810 CSS px |

## Commands
**Fresh-ledger film flow (validator):**
1. `make reset`
2. Restart `make api`
3. `make demo-validate` (= `cd frontend && node qa/demo/validate.mjs`)

**Seeded judge state:**
1. `make reset`
2. Restart `make api`
3. `make seed`
4. `make demo-check`

## Reset determinism
| Run | Fingerprint |
|---|---|
| Reset + seed #1 (local) | `c544f5897354081cf1d20efb366b951f14d2b8ffa69bcb87b105cfdc0df6483b` |
| Reset + seed #2 (local) | identical |
| Reset + seed after the validation runs (local, final state left running) | identical |
| After the full Playwright suite (30 tests) | identical (the tests don't alter the seeded story) |
| Container boot (rebuilt image, demo subset only) | identical |

The fingerprint covers claim references, statuses, unit counts, finding rule IDs, evidence hashes, on-chain claim numbers and contract rejections. Block numbers and timestamps are excluded (`backend/scripts/demo_fingerprint.py`).

## The scenario (registry data real, claimants synthetic)
**Registry record (real):**
- Verra retirement `18453-896309560-896329558-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0`
- Namespace `VCS:18453`; units 896,309,560–896,329,558 (19,999)
- Project 1904, "Wind Power Project in Tamil Nadu by Green Infra Renewable Energy Limited", vintage 2024
- Retired 2026-08-06; no beneficiary recorded
- Source: VROD sheet "Verra VCS Retirements", row 2

**Comparison rule:** ranges compare only within the same (registry, batch) namespace, and both ends are inclusive. Source: `backend/app/serials.py`, `backend/app/rules.py` (DUP-001) and `contracts/contracts/ClaimLedger.sol` (`_insert`, `_overlap`).

| | Claim A | Claim B |
|---|---|---|
| Reference / route | OO-2026-0001 · `/claims/1` | OO-2026-0002 · `/claims/2` |
| Claimant | Northwind Foods (SYNTHETIC) | Helios Apparel (SYNTHETIC) |
| Evidence | `data/demo/northwind_allocation.pdf`, SHA-256 `ae7efda4e094…` | `data/demo/helios_allocation.pdf`, SHA-256 `deedc58c4da9…` |
| Serial range | 896,309,560–896,319,559 (10,000) | 896,315,001–896,322,000 (7,000) |
| Findings | REG-000 pass, BEN-002 info | **DUP-001 blocking**, REG-000 pass, BEN-002 info |
| Expected status | Anchored, ledger claim #1 | Blocked, not on chain |
| Contract result | `ClaimRegistered` (claim #1) | Forced registration reverts with `RangeOverlap(ns, 1, 896315001, 896319559)`; mined with status 0; recorded as a `chain_rejected` event with its transaction hash |

**Intersection:** 896,315,001–896,319,559, which is **4,559 units**.

**Where to see it:**
- `/claims/2`: Ruler, findings, Ledger actions, Audit trail
- `/overview`: Ledger transactions
- `/verify?ref=OO-2026-0001`: ledger record and fingerprint check

**Behaviour proven by:**
- `contracts/test/ClaimLedger.test.js` (overlap at boundaries, hints, lifecycle)
- `backend/tests/test_service.py`
- `frontend/qa/tests/ui.spec.ts`
- `frontend/qa/demo/validate.mjs`

The seeded story adds three more claims:

| Claim | Status | Purpose |
|---|---|---|
| OO-2026-0003 Arbor Logistics | Anchored as #2 | Two registries: VCS:13264 + Gold Standard GS1-1-TR-GS707-21-2021-26933 |
| OO-2026-0004 Lumen Retail | Checked | Mistyped serial: REG-001, not found in the registry |
| OO-2026-0005 Kestrel Media | Blocked | No serials: EVD-001 |

## Step-by-step results (fresh ledger, `make demo-validate`, final run)
| Beat | Route at end | Result |
|---|---|---|
| 1a, 1b | `/` | PASS |
| 2a | `/` (hover "Step 4: Overlap") | PASS |
| 2b, 2c | `/#how` (First/Last unit buttons) | PASS |
| 3a | `/claims/new` | PASS |
| 3b | `/claims/new` (Clean claim → "SHA-256, computed in your browser") | PASS |
| 3c | `/claims/1` ("Every check passed") | PASS |
| 3d | `/claims/1` (Provenance) | PASS |
| 4a | `/claims/1` (Anchor dialog → "Anchored as ledger claim #1") | PASS |
| 4b | `/claims/2` (Overlapping claim → Run checks) | PASS |
| 4c | `/claims/2` ("4,559 units already back…") | PASS |
| 4d | `/claims/2` (Ruler overlap, both boundary labels, overlap detail) | PASS |
| 5a | `/claims/2` (Findings) | PASS |
| 5b | `/claims/2` (Send to the contract anyway → dialog → Send) | PASS |
| 5c | `/claims/2` ("Rejected by contract", Audit trail) | PASS |
| 6o | `/overview` (Ledger transactions, rejected row) | PASS |
| 6a | `/verify?ref=OO-2026-0001` ("Active on ClaimLedger") | PASS |
| 6b | `/verify?ref=OO-2026-0001` (northwind_allocation.pdf → "Fingerprint matches") | PASS |
| 6c | `/verify` | PASS |
| 7a | `/evidence` ("Intervals catch what hashes miss") | PASS |
| 7b, 7c | `/` | PASS |

## Expected versus actual end state
| Check | Expected | Actual |
|---|---|---|
| Claims in the ledger | 2 | 2 |
| OO-2026-0001 | Northwind, anchored, chain #1 | Northwind Foods (SYNTHETIC) / anchored / #1 |
| OO-2026-0002 | Helios, blocked, not on chain | Helios Apparel (SYNTHETIC) / blocked / none |
| DUP-001 overlap | 896,315,001–896,319,559, 4,559 units, vs OO-2026-0001 | `{"start":896315001,"end":896319559,"units":4559}` |
| Contract rejection | `RangeOverlap(existing #1, 896315001, 896319559)`, status 0, tx hash recorded | RangeOverlap, tx `0x3b65e16cb5…`, block 781 |
| Failed HTTP requests | Only the contract's 409 for the forced registration | `409 POST /api/claims/2/anchor` |
| Console errors | None, apart from Chrome's automatic log of that 409 | Exactly that one line |
| Uncaught page errors | None | None |
| API log | No tracebacks or 5xx | 0 |

The first validation run flagged the 409 console line as an error. It is Chrome's built-in "Failed to load resource" message for the expected rejection, not application code, so the check now excludes exactly that line. The 409 itself is asserted separately.

The same flow also produced the reference recording (`record.mjs`); that final take's API log showed 89 successful requests and only the expected 409.

## Other verification on the same day
- **Playwright, seeded local stack:** 30/30 passed (18 interaction, 4 keyboard-only, link crawl, 7 axe-core WCAG A/AA).
- **Playwright, container** (`BASE_URL=http://127.0.0.1:7860`): 29 passed, 1 skipped by design (forced registration is disabled in public demo mode). A ledger write returns HTTP 403.
- **Visual review of the film's frames:** found and fixed a real bug. With motion enabled, the Ruler's bracket label rendered 36 px too high and collided with the hero's "Illustration" chip at 1280–1440 px. See `11_reference_video_report.md`.

## Remaining limitations
- The film flow requires a **fresh** ledger. The seeded state already contains these claims, so on a seeded ledger the "Check a claim" samples create claims 6 and 7 and the script's numbers won't match.
- Validation used a 1440 × 810 viewport only. Smaller layouts are covered by the Playwright suite (320 px overflow test, mobile menu), not by this replay.
- Chain is local (Hardhat, chain id 31337).

## Last-known-good setup
**For recording (fresh ledger):**
1. `make chain`
2. `make reset`
3. Restart `make api`
4. `make web`
5. Run `make demo-validate` (optional, about 1 minute), then `make reset` and restart `make api` before recording.

**For judges and Q&A:**
1. `make reset`
2. Restart `make api`
3. `make seed`
4. `make demo-check`, which should print fingerprint `c544f589…6483b`
5. Open http://127.0.0.1:5173/

The machine was left in the seeded state (fingerprint verified) at the end of this validation.
