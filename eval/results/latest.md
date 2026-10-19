# OnceOnly evaluation results

Generated 2026-10-19T08:14:10Z (seed 20261019, 5.6 s). Reproduce with `make eval`.

## A. Double-use detection

270 labelled claim pairs (30 per case type). Each pair cites real Verra retirement records (Berkeley VROD 2026-08); claimants are synthetic. Positive = the new claim shares at least one unit with an anchored claim.

| Method | Precision | Recall | TP | FP | FN | TN |
|---|---|---|---|---|---|---|
| OnceOnly rules engine (DUP-001/002) | 1.000 | 1.000 | 180 | 0 | 0 | 90 |
| ClaimLedger contract (revert on 2nd registration) | 1.000 | 1.000 | 180 | 0 | 0 | 90 |
| Baseline: exact serial string / document hash | 1.000 | 0.333 | 60 | 0 | 120 | 90 |
| Ablation: interval overlap ignoring batch | 0.857 | 1.000 | 180 | 30 | 0 | 60 |

| Case type | n | Truth | OnceOnly | Contract | Baseline | Numbers-only |
|---|---|---|---|---|---|---|
| Same serial, same units | 30 | double use | 30/30 | 30/30 | 30/30 | 30/30 |
| Same units, serial reformatted (line break, spaces, dashes) | 30 | double use | 30/30 | 30/30 | 0/30 | 30/30 |
| Partial overlap, different serial strings | 30 | double use | 30/30 | 30/30 | 0/30 | 30/30 |
| New range inside an existing claim | 30 | double use | 30/30 | 30/30 | 0/30 | 30/30 |
| New range contains an existing claim | 30 | double use | 30/30 | 30/30 | 0/30 | 30/30 |
| Same evidence document resubmitted | 30 | double use | 30/30 | 30/30 | 30/30 | 30/30 |
| Adjacent ranges, no shared unit | 30 | not double use | 30/30 | 30/30 | 30/30 | 30/30 |
| Same batch, disjoint ranges | 30 | not double use | 30/30 | 30/30 | 30/30 | 30/30 |
| Same unit numbers in a different batch | 30 | not double use | 30/30 | 30/30 | 30/30 | 0/30 |

Contract and rules engine agree on 100.0% of cases. Median gas for a single-range registration: 304,132.

## B. Serial extraction

60 synthetic document snippets citing real serial ranges, in 8 layouts: canonical, wrapped across lines, spaced dashes, en dashes, two blocks, table columns, prose range description, OCR letter-O errors. Truth = exact (batch, start, end) blocks.

| Extractor | Docs | Exact docs | Block precision | Block recall |
|---|---|---|---|---|
| Deterministic parser | 60 | 65.0% | 1.000 | 0.687 |
| Parser + AI extraction (cross-checked) | not run (no ANTHROPIC_API_KEY) | | | |

Parser by layout: canonical 8/8, wrapped 8/8, spaced_dashes 8/8, en_dash 8/8, two_blocks 7/7, table_columns 0/7, prose_range 0/7, ocr_letter_o 0/7.

## Limitations

- Claim pairs and documents are synthetic; serial ranges come from real registry records.
- Ground truth is defined by construction, so these results measure detection logic, not real-world prevalence of double use.
- Contract replay runs on a local Hardhat chain.
