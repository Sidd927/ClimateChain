# Design 06 — Design System ("Survey sheet")

Implemented in `frontend/src/index.css` (`@theme` tokens) and `frontend/src/components/`.

## Typography
| Role | Face | Spec |
|---|---|---|
| Display | Public Sans Variable 750 | 56/60 desktop, 38/42 mobile, tracking −0.025em |
| H1 (app) | Public Sans 700 | 30/36 |
| H2 | Public Sans 650 | 21/28 |
| H3 / labels | Public Sans 600 | 15/22 |
| Body | Public Sans 400 | 16/26 (landing 17/28), max 68ch |
| Small | Public Sans 450 | 13/20 |
| Data / serial / hash | IBM Plex Mono 400/500 | 12.5–14, `tnum`, dotted zero |

**Kept:** Public Sans (public-sector registry tone, variable axis in one file, excellent tabular figures) and IBM Plex Mono (unambiguous 0/O, which matters for serials). No new font downloads.

## Colour (semantic first)
| Token | Hex | Use |
|---|---|---|
| `ink` | #12333A | Text, primary actions |
| `ink-soft` | #3B5359 | Secondary text |
| `muted` | #5B6B70 | Tertiary text (≥ 4.5:1 on fog) |
| `night` | #0D262B | Survey band (hero, mechanism) |
| `night-line` | #1E3D43 | Contours and rules on night |
| `fog` | #EDF1EF | Page |
| `sheet` | #FFFFFF | Surfaces |
| `rule` | #D3DCD9 | Dividers |
| `slate` | #8FA3A6 | Registry records |
| `lichen` | #2F7D5B | Deterministic check passed; claimed units on ledger |
| `seal` | #12333A + lichen ring | Anchored on ClaimLedger (integrity commitment) |
| `glacier` | #2B6C8A | Cryptographic fingerprint match |
| `ochre` | #94600F | Needs review / incomplete evidence |
| `crimson` | #B4233C | Potential double use; contract rejection |
| `unknown` | slate, dashed | Unresolved real-world question / not established |

## Outcome vocabulary (never share a badge)
Each outcome has its own token: icon + label + colour + shape, so meaning never depends on colour alone.

| Outcome | Token | Icon |
|---|---|---|
| Check passed (deterministic) | lichen outline | check-circle |
| Needs review | ochre fill-wash | alert-triangle |
| Insufficient evidence | ochre dashed | file-question |
| Potential double use | crimson hatched | overlap glyph |
| Rejected by contract | crimson solid | octagon-x |
| Anchored on ledger | ink solid with lichen ring | stamp |
| Fingerprint matches | glacier | fingerprint |
| Fingerprint differs | crimson outline | fingerprint |
| Not established (real-world) | slate dashed | circle-dashed |

## Spacing, layout, radius, elevation
- 4 px base; steps 4, 8, 12, 16, 24, 32, 48, 72, 112.
- Content widths: app 1200 px; reading 68ch; landing 1240 px with a 12-column grid.
- Radius by hierarchy: 4 (tokens, inputs), 8 (panels), 12 (feature sheets). Never on rules.
- Elevation: none by default (rules separate). One shadow, `0 1px 0 rule, 0 12px 32px -18px rgb(13 38 43 / .28)`, only for floating layers (dialog, menu sheet, ruler readout).

## Motion
| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 140 ms | Hover, press, focus |
| `--dur-base` | 240 ms | Disclosure, tab, selection |
| `--dur-slow` | 520 ms | Ruler reveals, state seal |
| `--ease-out` | cubic-bezier(.2,.7,.2,1) | Entrances |
| `--ease-in-out` | cubic-bezier(.6,0,.2,1) | State swaps |

Rules: animate transform, opacity and clip-path only; one orchestrated sequence per view (hero ruler; claim-detail ruler); never delay content; everything off under `prefers-reduced-motion: reduce` (final state rendered).

## Components
`Ruler` (signature) · `SerialAnatomy` · `OutcomeToken` · `StatusPill` · `Button` (primary/secondary/danger/quiet, hover/pressed/focus/busy/disabled-with-reason) · `ConfirmDialog` (native `<dialog>`) · `Disclosure` · `CopyValue` · `PageHeader` · `AppShell` + `MarketingShell` · `MobileMenu` (dialog sheet) · `DataTable` patterns (sortable headers with `aria-sort`) · `Reveal` (IntersectionObserver one-shot) · `ContourField` (static SVG).
