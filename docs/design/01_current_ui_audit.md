# Design 01 — Current UI Audit (baseline, 2026-10-19)

Method: the running app (Vite dev server + FastAPI + local Hardhat chain), seeded through the real API with `make seed`, rendered by Playwright in Google Chrome at 1440, 1280, 768, 390 and 320 px. Screenshots: `docs/design/screenshots/baseline/` (45 PNGs plus `report.json`). Every finding below was observed in those renders or in the source. Nothing is judged from source code alone.

## Routes that exist (verified)

| Route | What it does |
|---|---|
| `/` | "Overview": hero, illustrative unit strip, registry facts, 5-step explainer, live ledger stats + recent activity, evaluation summary, limits |
| `/claims` | Claims ledger table (fetches `/api/claims`) |
| `/claims/new` | Intake: claimant, period, statement, file drop/paste, sample documents |
| `/claims/:id` | Claim detail: unit strip, findings, evidence, audit trail, ledger actions, on-chain record |
| `/verify` | Verify by reference ± document |
| `/evaluation` | "Evidence": registry audit, double-use evaluation, extraction benchmark |
| `*` | Not-found paragraph (no heading) |

## What is already good (keep)

1. **The unit strip.** It is the only element that expresses the product's mechanism. In the claim-2 render, the crimson hatch shows the 4,559 shared units instantly. Keep it and make it the signature.
2. **Honest copy.** "What this cannot tell", "Next step", synthetic labelling, and the limits sections are differentiators for a trust product.
3. **Real data everywhere.** Stats, activity and evaluation are all fetched. No invented numbers were found.
4. **Restrained palette** (spruce/fog/lichen/crimson/ochre) with tabular numerals. The base is calm and on-brand.
5. **Findings structure.** A severity bar, rule ID, explanation, uncertainty and next step is a good evidence pattern.

## Problems found

### Information architecture and navigation
- **P1. Marketing and application are one page.** `/` is both the public story and the operational dashboard ("Ledger right now", recent activity). A first-time visitor gets operational noise; an analyst has no dedicated home.
- **P2. Mobile navigation is truncated.** At 390 px the nav row shows "Overview · Claims ledger · Check a claim · Verif…", and "Evidence" is off-screen. The row scrolls horizontally with no affordance (mobile-390_home.png). At 320 px only 2.5 items are visible.
- **P3. The 404 page has no `<h1>`** and no way back except an inline link (report.json: `h1=[]` for `/nope` at all viewports).
- **P4. The route name `/evaluation` doesn't match its label "Evidence".** The label is also overloaded: claim "Evidence" means documents, nav "Evidence" means evaluation results.

### Landing / hero
- **P5. The hero has no focal composition.** The headline and a 5-line paragraph (the 1440 render wraps the lede to 5 lines) sit on a flat fog field. The strip is a white card below, visually detached from the headline. Nothing establishes atmosphere or "climate".
- **P6. The problem stat reads as good news.** "0 overlaps" is the first figure under "Where double counting slips through". A reader skimming sees a success metric under a problem heading.
- **P7. Equal-weight explainer.** "How a claim is checked" is five identical text columns with no visual relation to the strip above. The mechanism is described but not shown.
- **P8. Dead whitespace in "Ledger right now".** The 2×2 stat grid is stretched to the height of the 7-row activity list, leaving about 100 px gaps between stat rows (desktop-1440_home.png).
- **P9. Low-information activity feed.** Six of seven rows are "Checks run / Serials extracted / Claim submitted" for the same two claims. The blockchain events that matter are drowned.
- **P10. Orphaned sections.** "Evidence that it works" is one paragraph. "What OnceOnly does not do" uses 2 of 3 columns. Both read as afterthoughts.

### Claim detail (most important screen)
- **P11. Weak identity block.** The title is 24 px with a tiny status pill. The meta line duplicates the period ("FY2025 · FY2025 contribution claim…"). The full-width ochre synthetic banner is visually louder than the verdict.
- **P12. The strip is not interactive or accessible.** Hover info exists only as native `title` tooltips: no keyboard access, no focus, no legend. It encodes by colour plus hatch, but nowhere does it say what green, outlined or hatched means. There's no link from a conflicting lane to its claim.
- **P13. "Not anchored" above commitment hashes is ambiguous.** The "On-chain record" card says "Not anchored", then lists "Evidence commitment / Report hash / Claimant commitment", which a reader will assume are on-chain values.
- **P14. Primary action buried on mobile.** At 390 px, "Ledger actions" falls below the entire audit trail (mobile-390_claims_2.png), more than 3 screens down.
- **P15. Evidence table overflow.** On desktop, serials wrap mid-token ("…31122024-\n0") and "Found by" / "VCS 1904" wrap. On mobile the table clips to the serial column, and units, project and vintage are cut off.
- **P16. Same-second audit trail.** Four events with identical timestamps and four identical grey dots. It doesn't distinguish off-chain steps from on-chain transactions except by dot colour.
- **P17. No relationship view.** Claim → document → serial block → registry record → ledger commitment is the product's core provenance chain. It is spread over four sections with no visual link.
- **P18. Lint defect.** `UnitStrip` defines `Lane` inside render (oxlint `react(static-components)`), so lane subtrees remount on every render. This blocks any future interactive state in the strip.

### Claims ledger
- **P19. No search, filter or sort.** With 5 rows that's fine; the product story implies hundreds.
- **P20. Redundant columns.** "Findings" ("1 blocking") and "Status" ("Blocked") say the same thing in two places. "Synthetic" chips on every row add noise.
- **P21. Kestrel row shows "0 / 0 blocks".** It's technically correct but reads as a broken record. It should say "no serials disclosed".
- **P22. Large empty canvas** below a short table at 1440 × 900.

### Intake, verify, evaluation
- **P23. Intake.** Sample documents are the most-used demo path but sit in a narrow sidebar. There's no explicit processing state beyond the button spinner, and no duplicate-evidence feedback before submission.
- **P24. Verify.** The result area is an empty dashed box. Outcomes (match, mismatch, revoked, not found) aren't visually distinct before the user acts, and there's no hint of a valid reference to try.
- **P25. Evaluation.** Dense tables are readable but undifferentiated: "OnceOnly 30/30" vs "Baseline 0/30", the page's punchline, has the same weight as every other cell.

### Interaction states and motion
- **P26.** The only motion is a one-off `scaleX` reveal on the overview strip. State changes (anchoring, contract rejection, challenge) swap content with no transition, so the most important moment (rejection) has no emphasis beyond a red box.
- **P27.** Buttons have hover colour, but no pressed state and no consistent focus styling beyond the global outline.
- **P28.** Dialogs: none. Irreversible actions ("Anchor on ledger", "Uphold, revoke", "Withdraw") execute on a single click with no confirmation.

## Data / documentation defect found during the audit
- The Evidence page showed **11,631** false overlaps (from `eval/results/registry_audit.json`), while the README and docs 04/14 said **11,629** (an intermediate rebuild). Docs were corrected to the result file's value.
