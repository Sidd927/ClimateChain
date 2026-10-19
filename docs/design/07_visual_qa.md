# Design 07 — Visual QA

All findings below come from rendered pages: Playwright driving Google Chrome against the live, seeded stack (`make chain deploy api web seed`) and the in-app browser pane. Screenshots:

- **Before:** `docs/design/screenshots/baseline/`, all 5 viewports (commit `d1b39f7`).
- **After:** `docs/design/screenshots/after/`. Desktop 1440, tablet 768 and mobile 390 are committed, plus `report.json` for all five viewports. Regenerate everything, including laptop 1280 and mobile 320:

```bash
cd frontend && ROUTES="/,/overview,/claims,/claims/new,/claims/1,/claims/2,/claims/3,/claims/5,/verify,/evidence,/nope" node qa/capture.mjs after
```

## Automated checks (final run)

| Check | Result |
|---|---|
| Page-level horizontal overflow, 11 routes × 5 viewports (1440, 1280, 768, 390, 320) | 0 / 55 |
| Console errors during capture | 0 |
| Playwright interaction tests (`qa/tests/ui.spec.ts`) | 15 / 15 pass |
| axe-core WCAG 2.0/2.1 A + AA, 7 pages (`qa/tests/a11y.spec.ts`) | 7 / 7 pass, 0 violations |
| Cumulative layout shift during hero autoplay (PerformanceObserver) | 0.029 at 1280 × 800; 0.053 at 390 × 844; headline moves 0 px |
| Text contrast of semantic pairs (computed) | lowest 4.90:1 (glacier on wash); night text 5.9–10.7:1 |
| Initial JS (gzip) | 102.4 kB (baseline 99.6 kB); app pages split into 2.7–8.6 kB chunks |
| CSS (gzip) | 10.4 kB |
| `tsc -b`, `oxlint` | clean, 0 warnings (baseline: 3 warnings) |

## Issues found during QA and fixed

| # | Viewport | Finding (observed) | Fix |
|---|---|---|---|
| Q1 | all | Below-the-fold landing sections were blank in full-page captures: reveal relied on IntersectionObserver, which never fired without scrolling | Reveal styles apply only once JS marks the page (`.js`), print shows everything, and the capture script scrolls like a reader |
| Q2 | 1440 | Hero headline wrapped to 3 lines in a 5/12 column | Equal columns, `text-balance`; 2 lines at ≥1280 |
| Q3 | 1440 | Hero step buttons wrapped ("1 A / retirement") | Shorter step names |
| Q4 | all | The Ruler drew a heavy double ring on its *default* selection | Ring only after a user selection |
| Q5 | 1440, narrow containers | Ruler readout's 3-column grid crushed text in the mechanism panel; title repeated the range | Single-column readout; distinct title |
| Q6 | 1440 | Claim header duplicated "FY2025 · FY2025 contribution claim" | Period hidden when the statement begins with it |
| Q7 | 1440 | Evidence table clipped the serial mid-token with no visible scroll | Serial wraps with `break-all` |
| Q8 | 390 | On-chain record card sat above the Ruler, pushing the core visual down | Card renders after the content on mobile, in the sidebar on desktop |
| Q9 | 1440 | "Check a claim" duplicated in header and page actions (ledger, overview) | Page actions removed |
| Q10 | 1440 | Overview "Ledger transactions" missed the Northwind anchoring (server events crowded out chain events) | New read-only `recent_chain_events` query |
| Q11 | 1440 | Evidence headline 04 titled "AI extraction" showed the *parser's* rate | Retitled "Serial extraction, parser only" |
| Q12 | 1280 (browser pane) | Confirmation dialog stuck to the top: the parent's `space-y-8` overrode the dialog's auto margins | `m-auto!` on the dialog |
| Q13 | — | Five dialogs shared `id="confirm-title"` (duplicate IDs) | `useId()` per dialog |
| Q14 | 1280 | Empty registry lane (mistyped serial) rendered as a blank bar | "No matching record in the registry snapshot" label |
| Q15 | 390 / 320 | Header buttons wrapped ("Open the / ledger", "Check a / claim"); a `hidden` class lost to `inline-flex` | `whitespace-nowrap`, wrapper for responsive visibility |
| Q16 | 1280 / 390 | Layout shift: headline drifted as the hero instrument grew during autoplay, and as the live eyebrow loaded | Top-aligned columns, reserved instrument and eyebrow heights (CLS above) |
| Q17 | 320 | 404 action buttons overflowed after the no-wrap change | `flex-wrap` |
| Q18 | — | axe: `<p>` inside a `<dl>` group on Overview | `<dd>` |
| Q20 | 1280 | Measured: each of the 3 contour fields carried 97 KB of path data and recomputed identical geometry | Computed once per page load, coarser grid, integer coordinates: 46 KB per field |
| Q19 | — | Verify showed "Active on ClaimLedger" and an "Anchored" pill for the same fact | Pill removed |

## Manually verified interactions (browser pane + Playwright)

- Anchor flow on a review claim: acknowledgement checkbox → confirmation dialog (focus on Cancel, Esc closes) → real transaction → seal shows ledger claim #3, block 742, 333,090 gas, from the API response.
- Forced registration dialog → contract rejection rendered from the decoded `RangeOverlap` revert (Playwright checks the dialog; the rejection itself was verified in Mission 01's e2e and the seeded data).
- Ruler: Tab/focus selects intervals, the live readout updates, the overlap links to the other claim, and the table alternative opens.
- Verify: original PDF → "Fingerprint matches"; one appended byte → "Fingerprint differs"; unknown reference → "Not on the ledger".
- Intake: empty submit focuses Claimant with an inline error; sample load computes SHA-256 in the browser and flags reuse ("Already used as evidence") via `/api/evidence/{sha256}`; unsupported file type is rejected client-side.
- Ledger: chip filters (URL state), search, sortable headers with `aria-sort`.
- Mobile menu: dialog sheet, all pages listed, Esc closes.
- Reduced motion: hero renders its final state immediately; reveals and drift are off.
- Keyboard focus: visible on dark (light outline) and light (glacier outline) surfaces.

## Design quality rubric (internal, not independently verified)

| Dimension | Score | Reason |
|---|---|---|
| Distinctiveness | 8 | The Ruler, contour field and serial anatomy are specific to this product; no template components. It loses points because the app screens (tables, cards) are conventional by necessity |
| Hierarchy | 8.5 | The verdict leads every claim; one primary action per view; headline results lead Evidence. The landing is long on mobile (≈9,300 px) |
| Visual consistency | 8.5 | One token set, one outcome vocabulary, consistent radii and section headers across pages |
| Climate-specific identity | 7.5 | Contours, palette and survey language read as environmental-measurement rather than "green tech". There's no imagery, by choice, to avoid implying evidence we don't have |
| Product clarity | 9 | "A claim is an interval" is explained with the real mechanism; each check states what it establishes and what it doesn't |
| Interaction quality | 8.5 | Every control is real; confirmations on irreversible actions; keyboard-operable Ruler; honest loading states. No optimistic UI |
| Responsive behaviour | 8.5 | 0 overflow at 5 widths; mobile reorders actions; the mobile landing is long |
| Accessibility | 8.5 | axe clean on 7 pages, contrast computed, focus visible, non-colour encodings, table alternative. Not tested with a real screen reader |
| Performance | 8.5 | +2.8 kB gzip initial JS over baseline despite a full landing; lazy routes; CLS < 0.1. Contour geometry is computed once (16 paths, 46 KB of path data per field, 3 fields on the landing); continuous drift runs only in the hero (90 s cycle, disabled under reduced motion). No Lighthouse run (tool not installed) |
| Technical integrity | 9 | All numbers come from the API or result files; synthetic data is labelled; local chain is labelled; backend changes are read-only additions with tests |

**Weighted impression ≈ 8.5/10.** Remaining weaknesses: mobile landing length, no screen-reader pass, no Lighthouse/field data, and the contour paths could be precomputed at build time and simplified further.
