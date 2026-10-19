# 14 — Evaluation Plan and Results

All results below are produced by scripts in this repository and stored in `eval/results/`. Reproduce:

```bash
make data          # downloads Berkeley VROD (67 MB) and writes eval/results/registry_audit.json
make chain         # (separate terminal) local chain, needed for the contract replay
make eval          # writes eval/results/latest.json and latest.md
make test          # contract + backend unit/integration tests
make e2e           # full API + chain walkthrough (needs chain + deploy + api running)
```

## E1 — Real registry data audit (real data, measured)

Question: can registry serials be turned reliably into unit ranges, and where does double counting appear in the registry layer itself?

| Records | Rows | Parsed | Range size = quantity | Overlaps within a batch |
|---|---|---|---|---|
| Verra retirements | 307,416 | 307,416 (100%) | 307,416 (100%) | 0 |
| Verra issuances | 19,624 | 19,624 (100%) | 19,624 (100%) | n/a |
| Gold Standard retirements | 166,478 | 166,478 (100%) | 166,478 (100%) | 5 (data inconsistencies; see doc 04) |

- Sorting Verra retirements by unit number while ignoring the batch yields 11,631 adjacent overlapping pairs, all between different batches (collisions of the wrong key, not overlaps). This is evidence that the uniqueness namespace must be `(registry, batch)`.
- Overlap counts are adjacent overlapping pairs after sorting by first unit; zero adjacent pairs implies no overlapping pair at all within a batch.
- Gold Standard: 5 pairs = 3 exact duplicate rows + 2 from one 10,000-unit record equal to two other records combined. Reported as data inconsistencies, not double retirement.
- 44.7% of Verra retirements record no beneficial owner.
- The parser regex was refined three times against this data (org codes containing digits, 2025 format without a sectoral scope, underscore date separators). Each refinement is covered by a unit test.

## E2 — Double-use detection vs baselines (synthetic pairs on real records)

Design: 270 labelled claim pairs, 30 per case type, seeded (`20261019`). Each pair cites real Verra retirement records; the claimants are synthetic. Ground truth by construction: positive ⇔ the new claim shares ≥1 unit in the same `(registry, batch)` with an anchored claim.

| Method | Precision | Recall | FP | FN |
|---|---|---|---|---|
| OnceOnly rules engine | 1.000 | 1.000 | 0 | 0 |
| ClaimLedger contract (replayed on a separate local deployment) | 1.000 | 1.000 | 0 | 0 |
| Baseline: exact serial string or document hash match | 1.000 | **0.333** | 0 | 120 |
| Ablation: interval overlap ignoring batch | **0.857** | 1.000 | 30 | 0 |

Per case type: the baseline misses all reformatted, partial, contained and superset overlaps (0/30 each). The batch-blind ablation wrongly flags all 30 "same numbers, other batch" cases. The contract and engine agree on 100% of cases.

**How to read this honestly.** Perfect scores for OnceOnly are expected: the ground truth uses the same interval semantics the engine implements, so this verifies the implementation, not real-world accuracy. The informative results are (a) what simpler, commonly used methods miss, and (b) that the on-chain enforcement matches the off-chain engine exactly.

## E2b — On-chain cost vs batch size (measured)

Gas to register one range into a batch holding k active ranges: hinted list 301,452 at k = 10, 50 and 200 (flat); linear v0 314,288 → 423,408 → 832,608. Source: `eval/results/gas.json`, produced by the contract test suite. See doc 12.

## E3 — Serial extraction (synthetic documents, real serial ranges)

60 snippets in 8 layouts. Truth = exact `(batch, start, end)` blocks.

| Extractor | Exact documents | Block precision | Block recall |
|---|---|---|---|
| Deterministic parser | 65.0% | 1.000 | 0.687 |
| Parser + AI extraction | **not yet measured** (needs `ANTHROPIC_API_KEY`) | | |

Parser by layout: canonical 8/8, wrapped 8/8, spaced dashes 8/8, en dash 8/8, two blocks 7/7, **table columns 0/7, prose range 0/7, OCR letter-O 0/7**. The parser never invents a block, but it cannot read the three harder layouts. This is the measured case for the AI extractor; its value is unproven until E3 is run with a key.

## E4 — Tests

| Suite | Count | Status (2026-10-19) |
|---|---|---|
| Contract (Hardhat/Mocha), incl. a 150-op randomized model test, a 300-attempt adversarial-hint property test and a gas benchmark | 24 | passing |
| Backend (pytest): parser formats, rules on real-data subset, API | 22 | passing |
| End-to-end (`make e2e`): 13 checks across the full demo story on a live chain | 13 | passing |

## Not evaluated (known gaps)

- Real-world prevalence of double use. We found no documented public case to test against.
- Beneficiary matching quality (BEN-001) on real beneficiary/claimant pairs.
- AI extraction accuracy, cost and latency (pending API key).
