# Design 09 — Final Polish Log (Mission 03)

Each change below answers an issue from `08_final_product_critique.md` or a defect found while verifying. Before/after first-viewport pairs are in `docs/design/screenshots/m3/`: `before_*` from commit `90ea4f7`, `after_*` from this branch, both with reduced motion so the final illustration state is shown.

## 1. Hero rebuilt around the Ruler (critique #1, #2, #6)
- **Before** (`before_home_1440.png`, `before_home_1280.png`, `before_home_390.png`): the headline, a paragraph and two buttons, beside a bordered panel holding the Ruler, readout, legend, four step buttons, caption and verdict. At 1280×800 the verdict was cut off; at 390×844 no overlap was visible.
- **After** (`after_home_*.png`):
  - The headline and a lede that names the mechanism, plus a "what OnceOnly checks" list with the live registry record count (493,518, from `/api/overview`).
  - The Ruler runs full-width and unboxed across the contour field, with the verdict inline.
  - The verdict links to the real rejected transaction in the seeded ledger, found via `recent_chain_events`.
  - The steps form a compact control, and the illustration label stays in the caption.
- **Why:** the product's argument is the picture. It now carries the first screen at 1440 and 1280, and at 390 px the three lanes, bracket and boundaries fit in the first screen.
- **Verified:** Playwright `overlap annotation is visible without scrolling at 1280x800 / 390x844`.

## 2. The Ruler explains itself (critique #3)
- **On-instrument annotation:** a bracket over the shared units with "4,559 units claimed twice".
- **Guide lines** at the overlap boundaries through every lane, linking registry, claim A and claim B.
- **Exact boundaries** (896,315,001 / 896,319,559) in crimson on the scale. Round ticks give way on narrow screens; labels flip alignment near the edges, which fixed a collision observed at 390 px.
- **Linked highlighting:** selecting or hovering either hatched segment outlines both. Verified by computed `outline-style` in Playwright.
- **Readout copy:** "flags potential double use for review; it does not say which claim is right".
- **`transect` variant** (no controls) for the illustrations, so they no longer imitate an interactive panel.
- **Empty lanes** carry explicit text; the table alternative uses row headers and covers empty lanes.

## 3. Landing narrative and length (critique #4)
| | Before | After |
|---|---|---|
| Mobile 390 page height | 9,290 px | 6,460 px (−30%) |
| Desktop 1440 page height | 5,348 px | 4,118 px (−23%) |

- **Removed:** the fan-out diagram, now redundant because the hero shows two claims on one retirement.
- **Merged:** the live ledger and the evaluation into "Running, and measured".
- **Checks:** "Four checks" became a definition table (check / establishes / does not establish).
- **Chart:** it now plots the 4 case types where the methods differ, and names the 5 agreeing types in a sentence. The full table is one link away on Evidence.
- **Phones:** show 3 of 5 ledger rows (link to the ledger).
- **Padding:** section padding is lower on small screens.
- **Missed target:** my goal was ≤ 6,000 px on mobile and I stopped at 6,460 px. Going further would have meant removing evidence.

## 4. Truth corrections (critique #5, #9, #10)
- **"11,631 false overlaps"** became "11,631 adjacent pairs of records from different batches that look as if they overlap when the batch is ignored." Verified: all 11,631 are cross-batch (5,880 batches). The definition of "overlap counts" is on Evidence. Corrected in Landing, Evidence, README, docs 04/06/14.
- **Gold Standard "mostly exact duplicate rows"** became "3 exact duplicate rows + 2 from one 10,000-unit record equal to two other records combined (batch GS1-1-VN-GS1083-4-2013-4665)."
- **Evidence page:** each headline metric is defined where it appears (synthetic pairs, same-definition ground truth; "exact" means every block recovered; AI not measured).
- **Chart caption** states the same-definition caveat beside the numbers.
- **Header:** the continuously pinging "live" dot became a static dot; the value is real, the animation was decoration.
- **`make seed`** prints final ledger states instead of status at submission.

## 5. Claim detail (critique #7, #8)
- **Mobile order:** verdict, then the Ruler, then actions (`after_claim_390.png`). Before, the Ruler started about 1,000 px down (`before_claim_390.png`).
- **Synthetic note:** one line beside the tag instead of a tag plus a paragraph.

## 6. Defects found during verification and fixed
| Defect | How found | Fix |
|---|---|---|
| Ledger search dropped keystrokes: typing "helios" left "os" (URL-controlled input; navigation commits async) | Keyboard-only Playwright test | Local state mirrored to the URL |
| Claim detail CLS 0.916 desktop / 0.307 mobile (scrollbar appearing; footer jumping during load) | Lighthouse layout-shift attribution | `scrollbar-gutter: stable`; full-height main. Now CLS 0 |
| 73% of claim-detail text below 12 px (extracted-text preview at 11.5 px) | Lighthouse font-size audit | ≥ 12 px |
| Visual step numbers read as "1Reads…" | Accessibility-tree snapshot | `aria-hidden` on decorative numbers |
| Collapsed table exposed to the accessibility tree | Accessibility-tree snapshot | `aria-hidden` when collapsed |
| Sidebar regression (actions in the wide column) after the mobile reorder | First-viewport capture | `lg:order-last` restored |
| Contract tests rewrote `eval/results/gas.json` on every run; lockfile carried a stale package name | Fresh-clone test left a dirty tree | Gas file written only by `make gas`; lockfile regenerated |
| Checks table tokens aligned inconsistently | Section capture | Token always under the title |

## What was deliberately not changed
The contract, backend architecture and API contracts (no backend changes in this mission beyond the seed script and a new read-only fingerprint script); the outcome vocabulary; the Evidence, Verify, Intake and Ledger designs, apart from the fixes above; the colour system and typography.
