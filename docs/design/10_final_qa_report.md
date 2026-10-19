# Design 10 — Final QA Report (Mission 03)

**State tested:** branch `feature/final-polish`, demo restored with `make reset` → API restart → `make seed` (fingerprint below). Date: 2026-10-19.

## Results

| Check | Result |
|---|---|
| Backend (pytest) | 22 passed |
| Contracts (Hardhat), incl. randomized and adversarial-hint property tests, gas benchmark | 24 passing |
| Frontend type check (`tsc -b`) / lint (`oxlint`) | clean / 0 warnings |
| Production build | ok; initial JS 102.8 kB gzip, CSS 10.4 kB gzip, app pages lazy-loaded |
| Playwright, live stack (`cd frontend && npx playwright test`) | **30 passed**: 18 interaction, 4 keyboard-only walkthroughs, 1 link crawl, 7 axe WCAG 2.0/2.1 A+AA |
| Visual capture, 12 routes × 5 viewports (1440, 1280, 768, 390, 320) | 60 captures, 0 horizontal overflow, 0 console errors |
| Link crawl | every internal link resolves; 0 failed API requests; 0 console errors |
| Fresh clone (`git clone` → `make setup` → `make test` → build) | 24 contract + 22 backend passed, build ok, using only committed data. Found and fixed: tests dirtied the tree (gas file, stale lockfile name) |
| Reset and seed repeatability | 3 consecutive cycles, identical fingerprint `c544f5897354081cf1d20efb366b951f14d2b8ffa69bcb87b105cfdc0df6483b` |

### Lighthouse 12 (production build via `vite preview`, headless Chrome; performance / accessibility / best practices)

| Page | Mobile | Desktop | Mobile LCP · CLS · TBT |
|---|---|---|---|
| `/` | 97 / 100 / 100 | 100 / 100 / 100 | 2.3 s · 0.013 · 0 ms |
| `/claims/2` (overlap) | 97 / 100 / 100 | 100 / 100 / 100 | 2.4 s · 0 · 30 ms |
| `/overview` | 97 / 100 / 100 | — | 2.1 s · 0.073 · 0 ms |
| `/claims` | 98 / 100 / 100 | — | 2.3 s · 0 · 0 ms |
| `/claims/new` | 98 / 100 / 100 | — | 2.3 s · 0 · 0 ms |
| `/verify` | 98 / 100 / 100 | — | 2.3 s · 0.037 · 0 ms |
| `/evidence` | 97 / 100 / 100 | — | 2.4 s · 0 · 0 ms |

Before the fixes in this mission, `/claims/2` scored 83 (mobile) / 76 (desktop) with CLS 0.307 / 0.916. Lighthouse is a lab measurement on this machine with simulated throttling, not field data.

## Accessibility: what was and wasn't verified
- **Verified:**
  - axe clean on 7 pages.
  - Keyboard-only flows through the ledger, claim, Ruler, table alternative, dialog (focus starts on Cancel, Tab stays in the modal, Escape closes and returns focus to the trigger), intake and landing steps.
  - The accessibility-tree snapshot reviewed by hand: Ruler intervals are named buttons ("Overlap: 4,559 units, 896,315,001 to 896,319,559, also held by Northwind Foods"), the figure has a text description, and the table has caption, column headers and row headers.
  - Contrast pairs computed (≥ 4.9:1); non-colour encodings (hatching, outline, labels).
  - Reduced motion renders the final state.
- **Not verified:** a real **VoiceOver** pass. Turning VoiceOver on is a system-level setting on the owner's Mac that speaks aloud; I did not change it without permission. The accessibility tree is a proxy, not a substitute. Recommended manual check: VoiceOver + Safari on `/` and `/claims/2`, reading the Ruler figure and tabbing through the intervals.

## Re-scored critique areas (after this mission; 9–10 = exceptional)

| Area | Before | After | Evidence |
|---|---|---|---|
| Immediate impact and memorability | 6 | 8 | The full annotated Ruler, verdict and real-transaction link sit in the first viewport at 1440 and 1280; overlap visible at 390. It's still a single static illustration, with no real-data hero beyond the registry record |
| Typography and hierarchy | 7 | 7.5 | Concrete lede; lighter claim header. Public Sans remains competent rather than distinctive |
| Spacing and rhythm | 6.5 | 7.5 | Tighter mobile padding; uniform section rhythm remains |
| Distinctiveness | 7 | 8 | Generic fan-out and card grid removed; the Ruler, bracket and guides are now the identity |
| Clarity of problem, solution, action | 6.5 | 8.5 | The Ruler reads without prose (bracket, boundaries, guides); each metric is defined where shown |
| Interaction states | 8 | 8.5 | Linked highlighting; a keyboard search bug fixed |
| Mobile | 6 | 7.5 | The Ruler leads on claim detail; landing −30%, but still 6,460 px |
| Trustworthiness | 7.5 | 8.5 | Precise figures, illustration linked to the real transaction, no decorative "live" effects |

## Known limitations and outstanding risks
1. **Local chain only.** Nothing is on a public network. Judges may ask for an explorer link (requires a funded test key and owner approval).
2. **AI extraction is unmeasured.** It is implemented, but its accuracy, cost and latency are unknown without an API key. The parser alone recovers every block in 65% of synthetic snippets.
3. **Evaluation is synthetic.** 270 pairs on real ranges with same-definition ground truth: this shows correct implementation, not real-world accuracy. No real case of cross-company double use was available.
4. **No VoiceOver pass** (see above).
5. **The mobile landing page is 6,460 px**, above the 6,000 px goal.
6. **Demo state is mutable.** Any anchoring done while presenting changes the story. Restore with the reset procedure in the README; `make demo-check` confirms the fingerprint.
7. **`make e2e` and `make seed` are mutually exclusive** on one ledger (e2e needs fresh units); this is documented in the README.
8. **The repository is private**, and no license has been chosen yet (both are the owner's decisions).
