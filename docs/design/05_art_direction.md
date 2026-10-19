# Design 05 — Art Direction

## The brief in one line
A registry is a measuring instrument for tonnes. OnceOnly should feel like the precision instrument laid on top of it: calm, exact, and honest about what it can't measure.

## Three directions considered

### A. Atmospheric intelligence
Deep spruce sky, layered fog gradients, drifting cloud textures; data panels float above.
- **Pros:** strong climate mood; memorable first impression.
- **Cons:** fog and floating panels drift toward glassmorphism and "climate gradient" clichés. Atmosphere competes with the data. Weak in dense app screens. Expensive blurred layers hurt laptop performance.
- **Distinctiveness 6 · Legibility 6 · Feasibility 7 · Accessibility 6 · Audience fit 6**

### B. Survey sheet (scientific evidence system)
Modelled on a geological survey sheet and a registry ledger: topographic contour lines as the only organic texture; fine rules; a tick-marked *ruler* for unit ranges; serials set in mono with their anatomy (batch · first unit · last unit) made legible; provenance drawn as thin connecting lines.
- **Pros:** the visual language *is* the mechanism (measurement, intervals, provenance). Works equally for landing and dense app screens. Cheap to render (static SVG).
- **Cons:** risks broadsheet austerity (AI cluster #3: hairlines, zero radius, newspaper columns) if overdone.
- **Distinctiveness 8 · Legibility 9 · Feasibility 9 · Accessibility 9 · Audience fit 9**

### C. Climate-finance infrastructure
Premium restraint: white surfaces, confident sans, exceptional tables, very little colour.
- **Pros:** trust and credibility with buyers and auditors.
- **Cons:** generic; would be indistinguishable from any fintech dashboard; no climate identity.
- **Distinctiveness 4 · Legibility 9 · Feasibility 9 · Accessibility 9 · Audience fit 7**

## Decision: B, "Survey sheet", with one atmospheric band from A and the table discipline of C

- **One atmospheric moment:** the landing hero and the mechanism section sit on a deep spruce "night survey" band with a generated topographic contour field: organic lines under the precise ruler (the Planet contrast). The rest of the product lives on light fog and white sheets.
- **The signature (where the boldness goes): the Ruler.** The unit strip becomes a measurement instrument with a tick-marked scale, registry block, claim bands, hatched overlap, and selectable intervals with a readout panel. It appears in the hero, the mechanism explainer, the claim detail and the verify result. Everything else stays quiet.
- **Serial anatomy:** wherever a serial appears in a featured context, its segments can be read (batch / first unit / last unit / project / vintage). This teaches the core idea that *a claim is an interval*.
- **Table discipline from C:** right-aligned tabular numerals, real filters/sort, outcome tokens.

## How this avoids the generated-design clusters
- No cream + terracotta; no near-black + acid green (our dark is a desaturated spruce, and colour on it is semantic, not decorative).
- No broadsheet pastiche: radii exist (6–10 px) and vary by hierarchy; hairlines are used only where they encode measurement (ruler ticks, table rows).
- No uppercase tracked eyebrows; labels are sentence case.
- Mono is used only for serials, hashes, refs and unit numbers, where it has a function (0/O disambiguation: Plex Mono's dotted zero matters because OCR "O vs 0" is a measured extraction failure).
- No logo walls, globes, particles or glowing gradients.

## Climate identity without clichés
Contours (terrain, survey, measured land) instead of leaves and globes; a palette taken from conifer, lichen, glacial water and mineral slate; and the product's own object (the serial range) as the hero.

## Voice
Plain, exact, evidence-led. Every outcome says what was established and what wasn't. No superlatives, no "revolutionising", no fraud language.
