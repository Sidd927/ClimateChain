# Design 03 — Reference Research

Accessed 2026-10-19 in the built-in browser (live pages, first-party sites). Screenshots were taken at reduced scale for inspection only and are not stored in the repo. Cookie banners were not interacted with.

## Climate and environmental data

### CarbonPlan — OffsetsDB (https://carbonplan.org/research/offsets-db)
- **Distinctive:** dark, quiet canvas; monospace small-caps labels; category colours used *only* as data encoding (stacked "credits issued / retired" bars and colour-coded project-ID chips). The UI chrome itself is colourless.
- **Hierarchy:** one big title at left; the rest is a filter column (registry/category chips) feeding a dense table with right-aligned numerals.
- **Technical communication:** totals shown as numbers *and* as a proportional bar directly above the table they summarise.
- **Motion:** essentially none; trust comes from density and precision.
- **Relevant to OnceOnly:** filter chips that are real toggles; registry/project IDs as monospace tokens; proportional bars that summarise the table below. It is also the closest domain neighbour, since it uses the same registry data class.
- **Don't copy:** the all-dark, all-mono aesthetic would make OnceOnly look like CarbonPlan; tracked-out uppercase labels everywhere are a template tell.

### Climate TRACE (https://climatetrace.org/)
- **Distinctive:** a full-bleed data visualization (emissions sources as vertical spikes over a greyscale globe) *is* the hero; large white sans headline; three stacked "doorway" rows to the main tools.
- **Hierarchy:** headline, then three clearly separated entry points with one-line descriptions.
- **Motion:** the visualization moves subtly; the text doesn't.
- **Relevant:** the hero visual is the dataset itself, not decoration. For OnceOnly that means the hero should be the unit ruler built from a real registry record.
- **Don't copy:** a globe. A planetary motif says "global emissions"; OnceOnly's object is a *serial range*, not geography.

### Sylvera (https://www.sylvera.com/)
- **Distinctive:** pale neutral page, lime accent CTA, and a staged text reveal on load (the headline was mid-fade when captured). Below the fold, product fragments include a ratings scale (AAA → D) rendered as circular tokens.
- **Relevant:** domain users (carbon buyers) accept a calm, light, finance-grade palette. A *scale* rendered as UI tokens is a good pattern for our severity/outcome vocabulary.
- **Don't copy:** headline content delayed by animation. The first capture showed an empty hero, which is bad for slow devices and screenshots. Our hero text must be present at first paint.

### Watershed (https://watershed.com/)
- **Distinctive:** very large two-line editorial headline, a small data eyebrow ("# 4.1 Gt CO₂e…"), product UI cards cropped at the right edge, and a dark product panel overlapping a coloured block.
- **Hierarchy:** headline → one-line lede → single conversion field.
- **Relevant:** cropping real product UI into the hero signals "this is a real product". For OnceOnly: show the real claim-detail strip, not an abstract illustration.
- **Don't copy:** the email-capture CTA (we have no sales funnel) and market-leader superlatives.

## Satellite / scientific

### Planet (https://www.planet.com/)
- **Distinctive:** monochrome satellite imagery overlaid with crisp green detection boxes and scan lines, an *organic field + precise geometry* contrast.
- **Relevant:** this contrast is the one we want: an organic atmospheric layer (contours) under a precise instrument (the ruler, ticks, hatches).
- **Don't copy:** real imagery. We have no imagery tied to these projects, and using stock satellite photos would imply evidence we don't have.

## Product craft

### Stripe (https://stripe.com/)
- **Distinctive:** a two-tone headline (the first clause dark, the continuation grey) that reads as one sentence with emphasis; a single diagonal gradient field as atmosphere; a live counter ("Global GDP running on Stripe") as an eyebrow.
- **Relevant:** a *live, real* number as a quiet eyebrow (our equivalent: current block and claims on the ledger, from the API). Tight, restrained header.
- **Don't copy:** the gradient wave; it is Stripe's signature and would read as derivative. Also the customer-logo strip, since we have no customers and inventing one is prohibited.

### Linear (https://linear.app/)
- **Distinctive:** the hero is a faithful replica of the product (issue view with activity log, properties panel), rendered as real HTML text, not an image. The page text dump shows the full UI as DOM text.
- **Hierarchy:** short headline, then the product does the explaining.
- **Motion:** the hero composes in after load. In our background pane the capture was blank until animation ran, again a reminder not to gate content on animation.
- **Relevant:** product-as-hero rendered in real DOM (accessible, crisp, translatable). The activity-log pattern (actor · action · time) maps directly to our audit trail.
- **Don't copy:** near-black canvas with grey type (AI-template cluster #2) and agent/AI-forward messaging.

### Vercel (https://vercel.com/)
- **Distinctive:** extreme restraint: black field, small headline, two pill CTAs, a right-hand list of product areas, and a "read the recap" chip.
- **Relevant:** the confidence of very little copy; clear primary vs secondary CTA.
- **Don't copy:** black minimalism; it would erase any climate identity.

## Synthesis: what OnceOnly takes

| Pattern | Source | OnceOnly application |
|---|---|---|
| The dataset is the hero | Climate TRACE, Linear | Hero = the unit ruler built from a real Verra retirement, rendered in DOM |
| Organic field + precise geometry | Planet | Topographic contour field (generated SVG) behind a precise tick-marked ruler |
| Colour only as data encoding | CarbonPlan | Neutral chrome; colour reserved for outcome semantics |
| Live, real eyebrow number | Stripe | Live block number / claims on ledger from `/api/health` and `/api/overview` |
| Product UI as proof | Watershed, Linear | Landing section embeds real ledger data (labelled synthetic claimants) |
| Scale as tokens | Sylvera | Outcome vocabulary rendered as a consistent token family |
| Activity log pattern | Linear | Audit trail with actor/action/tx, separating on-chain from off-chain |

## Anti-patterns confirmed by the research
Content gated on animation (Sylvera, Linear captures were empty) · logo walls · globe heroes · signature gradients · black minimalism · uppercase tracked labels everywhere.
