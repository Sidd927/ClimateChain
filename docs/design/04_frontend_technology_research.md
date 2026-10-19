# Design 04 — Frontend Technology Research

## Existing stack (inspected)
React 19.2, React Router 7.18, Vite 8, Tailwind 4.3 (CSS-first `@theme` tokens), lucide-react icons, self-hosted Public Sans Variable + IBM Plex Mono (@fontsource). Baseline bundle: 99.6 kB gzip JS.

## Motion requirements (from the audit)
1. Hero: a staged, replayable explanation (retirement → claim A → claim B → contract rejection), readable with motion off.
2. Scroll reveals for a few landing sections.
3. Panel/disclosure expand-collapse (findings, evidence text, registry records).
4. Modal confirmation for irreversible ledger actions, with Esc and focus management.
5. State-change emphasis: claim anchored, contract rejection, fingerprint match.
6. Route transitions between ledger and claim detail.
7. Interval selection highlight in the ruler.

## Candidates

| Option | Facts checked | Fit |
|---|---|---|
| **Motion for React** (`motion` 14.3.1, MIT, peer React ^18 \|\| ^19) | Full `motion` component ≥ 43 kB gzip; `LazyMotion` + `m` ≈ 5 kB + `domAnimation` 24 kB (motion.dev/docs/react-reduce-bundle-size). `MotionConfig reducedMotion="user"` disables transform/layout animations automatically (motion.dev/docs/react-accessibility) | Capable, but every requirement above is achievable natively; would add ~29 kB+ and a second animation system alongside CSS |
| **GSAP 3.13+ / ScrollTrigger** | All plugins free incl. commercial use since Webflow's acquisition (gsap.com/blog/3-13, webflow.com/updates/gsap-becomes-free); the standard license restricts use in competing visual-builder tools | Timeline power is for long scroll-scrubbed sequences we explicitly don't want (no scroll hijacking) |
| **View Transitions API** (same-document) | `document.startViewTransition`; React Router 7 exposes `viewTransition` on `<Link>`/`navigate` and `useViewTransitionState` | Route and state-swap animation for 0 kB; progressive enhancement (unsupported browsers just swap instantly) |
| **Native `<dialog>` + `showModal()`** | Built-in focus containment, `Esc` to close, `::backdrop`, inert background | Correct accessible modal with no library |
| **CSS `grid-template-rows: 0fr→1fr`** transitions; `@media (prefers-reduced-motion)` | Broad support | Disclosure animations without JS measurement |
| **IntersectionObserver** | Universal | One-shot scroll reveals without scroll hijacking |
| **SVG** | — | Contour field (generated once, static paths) and ruler ticks |
| Three.js / WebGL | — | No 3D data; would be decoration. Rejected |
| Lenis / smooth scroll | — | Scroll hijacking; prohibited by brief. Rejected |
| Radix / shadcn / MUI | — | We need 1 dialog, 1 menu sheet and tooltips; native elements cover them. Rejected to avoid ~20–60 kB and a foreign visual language |
| **Playwright** (`@playwright/test` 1.64, dev-only) | Drives the installed Chrome (`channel: "chrome"`), so no browser download | Reproducible screenshots and responsive/interaction tests |

## Decision

**A native motion system: CSS tokens + View Transitions API + native `<dialog>` + IntersectionObserver. No runtime animation library.**

- Motion tokens (`--dur-fast 140ms`, `--dur-base 240ms`, `--dur-slow 520ms`, `--ease-out cubic-bezier(.2,.7,.2,1)`, `--ease-in-out cubic-bezier(.6,0,.2,1)`) are defined once in `index.css` and used by every transition.
- Every animation is transform/opacity (or clip-path on the ruler), and all of it is wrapped in `@media (prefers-reduced-motion: no-preference)`. The JS-driven hero sequence checks `matchMedia('(prefers-reduced-motion: reduce)')` and renders the final state immediately.
- Content is never gated on animation: initial states are visible in the static HTML, and animations only enhance.
- Added dev dependency only: `@playwright/test`. Runtime dependencies are unchanged.

Rejected and why: Motion (bundle cost with no capability we need), GSAP (scroll-timeline power we deliberately avoid), WebGL/Three.js (no 3D data), smooth-scroll (hijacking), component libraries (size, foreign styling).

## Skills used
- `frontend-design` (installed in this environment, read in full during Mission 01 and re-applied here): two-pass plan/critique, avoid the listed AI-template clusters, spend boldness in one place, typography as personality, real copy.
- `design:accessibility-review` (installed) is used for the WCAG pass in QA (doc 07).
- No new skills were installed; the installed guidance covers this brief.
