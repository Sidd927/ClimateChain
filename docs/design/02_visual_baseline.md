# Design 02 — Visual Baseline

Captured 2026-10-19 before any redesign work, from commit `d1b39f7` (main).

**How to reproduce:** `make chain`, `make deploy`, `make api`, `make web`, `make seed`, then run:

```bash
cd frontend && ROUTES="/,/claims,/claims/new,/claims/1,/claims/2,/claims/5,/verify,/evaluation,/nope" node qa/capture.mjs baseline
```

Output: `docs/design/screenshots/baseline/<viewport>_<route>.png` and `report.json` (status, horizontal-overflow check, `<h1>` text, console errors).

## Measurements

| Metric | Value |
|---|---|
| Production JS bundle | 326.0 kB (99.6 kB gzip) |
| CSS | 27.2 kB (6.1 kB gzip) |
| Fonts | Public Sans Variable (latin + latin-ext), IBM Plex Mono 400/500 (self-hosted via @fontsource) |
| Page-level horizontal overflow | none at 1440/1280/768/390/320 |
| Console errors | none recorded |
| Routes without `<h1>` | `*` (404) |
| Lint | 3 warnings (1 fast-refresh export, 2 components defined during render) |
| Tests | 24 contract, 22 backend passing |

## Key baseline frames

| Frame | File | Note |
|---|---|---|
| Home, desktop | `desktop-1440_home.png` | Flat hero, strip in a detached card, P6/P8 visible |
| Home, mobile | `mobile-390_home.png` | Nav truncated (P2); 3,683 px tall page |
| Ledger, desktop | `desktop-1440_claims.png` | Five rows, redundant Findings/Status columns |
| Claim with overlap, desktop | `desktop-1440_claims_2.png` | Strip + findings + rejection box in sidebar |
| Claim with overlap, mobile | `mobile-390_claims_2.png` | Actions below audit trail (P14), clipped table (P15) |
| Claim without serials | `*_claims_5.png` | Empty-strip message |
| Verify | `desktop-1440_verify.png` | Empty dashed result box (P24) |
| Evaluation | `desktop-1440_evaluation.png` | Dense, undifferentiated tables (P25) |
