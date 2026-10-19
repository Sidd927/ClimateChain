# Design 08 — Final Product Critique (Mission 03 baseline)

**Baseline:** commit `90ea4f7` (main), demo restored with `make reset` → restart API → `make seed`. Screens were captured fresh at 1440, 1280, 768, 390 and 320 px: `docs/design/screenshots/m3-before/` (motion on) and `m3-before-reduced/` (final hero state). Section heights were measured in the browser (`qa/_sections.mjs` run). These captures came from the running dev server on that commit. The working tree was clean, so they represent the committed implementation.

## Scores (1–10; 9–10 = exceptional)

| Area | Score | Evidence |
|---|---|---|
| Immediate impact and memorability | 6 | The hero is a two-column "headline + paragraph + two buttons | bordered panel" composition. The Ruler, the one memorable object, is boxed and shares its panel with a readout, legend, four step buttons, a caption and a verdict. At 1280×800 the verdict is cut off; at 390×844 the overlap isn't visible at all |
| Typography and hierarchy | 7 | The headline is strong and readable (Public Sans 750, tight tracking). The lede reads as a sentence about *why*, not *what*. On claim detail, five stacked header layers precede the Ruler |
| Spacing and rhythm | 6.5 | Every landing section uses the same 112 px vertical padding regardless of content. On mobile, sections run 1,111–1,681 px; total page height is 9,290 px (desktop 5,348 px) |
| Distinctiveness | 7 | The contour field, Ruler, serial anatomy and outcome tokens are product-specific. The fan-out diagram (three small cards plus dashed curves) and the four-row "checks" grid look generic |
| Landing ↔ app consistency | 7.5 | Shared tokens, Ruler and outcome vocabulary. The landing Ruler and the app Ruler behave identically. Good |
| Clarity of problem, solution, action | 6.5 | The overlap's quantity and boundaries can't be read *from the Ruler itself*. They live in a separate readout, and the scale shows only round ticks, so a judge has to read prose to understand the picture |
| Interaction states | 8 | Hover, focus, pressed, busy, disabled-with-reason, dialogs and Esc all work (verified in Mission 02). The ruler hover only brightens the band; it doesn't relate the two hatched segments to each other |
| Mobile | 6 | Landing at 9,290 px. On claim detail at 390 px the Ruler starts about 1,000 px down, below the actions card. The signature element is buried on the device judges are most likely to check quickly |
| Trustworthiness | 7.5 | Real data throughout and honest caveats, but two figures are worded imprecisely (issue 5), and the hero's "Rejected by contract" seal is illustrative with no link to the real rejection that exists in the seeded ledger |

## Ten most consequential issues (ranked)

| # | Route · viewport | What is wrong | Why it matters | Correction |
|---|---|---|---|---|
| 1 | `/` · all | The hero is a template composition: text column + boxed "dashboard" panel. The Ruler is small inside a crowded box; at 1280×800 the verdict falls below the fold (m3-before-reduced/laptop-1280_home.png, y≈730–800) | The first 5 seconds decide whether a judge remembers the product. The signature object reads as a screenshot, not as the idea | Art-direct the hero around the Ruler: the headline above, and a full-width, unboxed Ruler running across the survey field like a measured transect, with annotations drawn *on* the instrument. Retire the panel chrome |
| 2 | `/` · all | The lede ("Registries stop a carbon credit from being retired twice. OnceOnly checks the next step…") never says what OnceOnly concretely checks | A judge must infer the mechanism | The lede names the mechanism: it reads the serial numbers behind claims, places them on the registry's unit scale and flags units two claims both rely on. Add three short "what it checks" lines with real figures from the API |
| 3 | `/`, `/claims/2` · all | The Ruler can't be read on its own: the overlap count and boundaries appear only in the readout; the axis shows round ticks; the two hatched segments aren't visually linked | The Ruler is the product's argument. If it needs a paragraph, it isn't a signature | On-instrument annotation: a bracket over the shared units labelled "4,559 units claimed twice", boundary guides through all lanes at the overlap edges, and exact boundary numbers on the scale. Selecting either hatched segment highlights both |
| 4 | `/` · 390 | Page height 9,290 px; "Four checks" 1,606 px, "Problem" 1,681 px, "Why intervals" 1,210 px | Mobile readers abandon long pages; evidence becomes invisible | Merge "ledger" and "evaluation" into one proof section; compress "Four checks" into a dense two-column definition list; simplify the fan-out; reduce section padding on small screens. Target ≤ 6,000 px without hiding evidence |
| 5 | `/#how`, `/evidence`, README, docs 04/14/design | "Would create 11,631 false overlaps" and "the 5 Gold Standard overlaps are mostly exact duplicate rows" are imprecise | Trust: these are the figures a technical judge will check | 11,631 = adjacent overlapping pairs of Verra retirement ranges when sorted ignoring the batch; all are cross-batch collisions (5,880 batches), so they're artefacts of a wrong key, not overlaps. GS: 3 of 5 pairs are exact duplicate rows; 2 come from one 10,000-unit record whose range exactly equals two other records combined (batch …-4665). Neither is a finding about any organisation |
| 6 | `/` hero · all | The "Rejected by contract · RangeOverlap(…)" seal is illustrative, but the seeded ledger contains a *real* rejected transaction | Illustration without a path to the real thing looks staged | Label it as the contract's response in the illustration, and link to the real seeded rejection (found via the API) when it exists |
| 7 | `/claims/:id` · 390 | The Ruler starts about 1,000 px down; actions and the on-chain card come first | Signature buried on mobile | On mobile: verdict, then the Ruler, then actions (the blocked claim has no primary action anyway) |
| 8 | `/claims/:id` · 1440 | Six header layers before content; "synthetic" is stated twice (pill + paragraph) | Visual noise around the most important screen | Fold the synthetic note into one line under the title; tighten spacing |
| 9 | `/`, `/evidence` · all | "Cases handled correctly", "1.00 vs 0.33" and "65.0% exact" lack an adjacent definition of what is measured | Judges may read them as real-world accuracy | Define each metric where it appears: same-definition ground truth; "exact" means every serial block in the document recovered exactly, on 60 synthetic snippets; AI not measured |
| 10 | header · all; seed script | A continuously pinging "live" dot (decorative motion) next to a block counter; `make seed` prints the status at submission ("checked") for claims it then anchors | Fake-live effect; misleading operator output | Static status dot (the value is real; the ping adds nothing); the seed script prints final states |

## Strong elements to preserve (do not redesign)
- The Ruler's semantics: registry hatch, solid locked units, outlined focus claim, crimson hatch for shared units, keyboard selection, the table alternative.
- The outcome vocabulary (separate tokens for passed, review, insufficient, double use, rejected, anchored, fingerprint match/differs, not established).
- The claim-detail structure (verdict, Ruler, provenance chain, findings with "what this cannot tell", on-chain card, audit trail split chain/server).
- Confirmation dialogs, intake duplicate-evidence feedback, verify outcomes.
- The Evidence page tables, and the honesty sections ("Does not establish", limits).
- The contour field (a single atmospheric device; static on the non-hero bands).

## Reconciling 28 audit problems with 20 QA fixes
They are **different lists**, so both counts are correct:
- **P1–P28** (`01_current_ui_audit.md`) are problems found in the *pre-redesign* UI.
- **Q1–Q20** (`07_visual_qa.md`) are defects found *in the new UI* during Mission 02's QA, all fixed.

Status of P1–P28 after Mission 02: **25 fixed, 3 partially addressed.**
- **P5** (hero focal composition): improved, but it is issue 1 above.
- **P16** (same-second audit trail): chain and server events are now distinguished; identical timestamps remain because those events really happen within one second.
- **P22** (empty canvas under a short ledger table): mitigated by the units bar; inherent with 5 demo claims.
