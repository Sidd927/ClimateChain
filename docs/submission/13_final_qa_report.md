# 13 — Final QA, Security and Licence Report (2026-10-19)

Every result below came from a command run on 2026-10-19 on the owner's Mac, at commit `7c9b7ca` or later on `feature/submission-readiness`. Nothing here is carried over from earlier missions unless it says so.

## Test and build results
| Check | Command | Result |
|---|---|---|
| Backend tests | `cd backend && ../.venv/bin/python -m pytest -q` | **24 passed**, 2 deprecation warnings from dependencies (websockets.legacy, anyio alias). None from our code |
| Contract tests | `cd contracts && npx hardhat test` | **24 passing** |
| Type check | `cd frontend && npx tsc -b` | no errors |
| Lint | `cd frontend && npx oxlint` | exit 0, no findings |
| Production build | `cd frontend && npm run build` | built; main chunk 327.6 kB (102.8 kB gzip); routes lazy-loaded |
| Browser tests, seeded local stack | `cd frontend && npx playwright test` | **30 passed**: 18 interaction, 4 keyboard-only walkthroughs, link crawl, 7 axe-core WCAG A/AA page checks |
| Browser tests, container | `BASE_URL=http://127.0.0.1:7860 npx playwright test` | **29 passed, 1 skipped** (forced-registration dialog disabled in public demo mode, by design) |
| Scripted demo replay | `make demo-validate` on a fresh ledger | **23/23 beats, 8/8 checks** (`12_demo_validation_report.md`) |
| Demo determinism | `make reset` → restart API → `make seed` → `make demo-check` | identical fingerprint `c544f589…6483b` on every run, after Playwright, and in the container |
| Fresh clone | `git clone` from GitHub → `make setup` → `make test` → `tsc -b` → `npm run build` | setup 18.7 s; 24 + 24 tests passed; build ok; **working tree clean afterwards** |
| Container | `make docker-build`, `docker run` | builds (24 s cached, 2 min 04 s cold); serving 3.8 s after start; public health shows `public_demo: true`; `POST /api/claims/1/withdraw` → **403** |
| Docs path check | script over `docs/submission/*.md` and README | every cited repository file exists; the only non-file hits are app routes and runtime folders |
| Reference video | ffprobe and a full ffmpeg decode | 206.96 s, 1920×1080 H.264 30 fps + AAC, decodes with no errors (`11_reference_video_report.md`) |

### Lighthouse 12
Run against the production build (`vite preview`) in headless Chrome, re-run after the Ruler fix. Scores are performance / accessibility / best practices.

| Page | Mobile | Desktop | Mobile LCP · CLS · TBT |
|---|---|---|---|
| `/` | 97 / 100 / 100 | 100 / 100 / 100 | 2.3 s · 0.013 · 10 ms |
| `/claims/2` | 96 / 100 / 100 | 100 / 100 / 100 | 2.6 s · 0 · 20 ms |

These are lab measurements on this machine with simulated throttling, not field data. The other pages were measured in Mission 03 (`docs/design/10_final_qa_report.md`) and weren't affected by this mission's changes.

## Defects found and fixed in this mission
| Defect | How found | Fix | Verified by |
|---|---|---|---|
| The Ruler's overlap bracket and label sat 36 px too high whenever motion was on. In the hero at 1280–1440 px, the label overlapped the "Illustration: synthetic claimants" chip | Frame review of the reference video | `Ruler.tsx`: the animated wrapper now fills its row (`absolute inset-0`) | Bounding boxes measured at 375/1024/1440 px; Playwright 30/30; Lighthouse CLS unchanged; film re-recorded |
| Two Playwright tests failed against the public-demo container | Container test run | Tests are now mode-aware | 29 + 1 skipped |
| Runbook claimed a boot time that hadn't been measured | Self-review | Measured (3.8 s) and corrected | `docker logs -t` |
| The `serials.py` docstring and Q&A cited a script that doesn't exist (`audit_registry.py`) | Docs path check | Point to `backend/scripts/build_reference.py` | grep |
| README said 22 backend tests | Self-review | 24 | pytest |

## Security review
| Area | Finding | Status |
|---|---|---|
| Secrets in the repo | No API keys, tokens or real private keys in tracked files or history (`git log --all -p` scan for `sk-ant-…`, AWS keys, PEM headers). `.env` is gitignored and was never committed | OK |
| Keys that are present | `.env.example`, `Dockerfile` and `eval/run_eval.py` contain the **publicly known Hardhat development keys** (accounts #0 and #2), labelled as such. They only work on a local chain (31337). The container's chain listens on loopback only | Acceptable; documented |
| AI key | `ANTHROPIC_API_KEY` empty; the container sets `ONCEONLY_LLM=off`. The runbook warns against adding a key to a public instance without a cost limit | OK |
| CORS | Default allow-list is `http://localhost:5173` and `http://127.0.0.1:5173` (`ONCEONLY_CORS_ORIGINS`). The container serves the UI from the same origin | OK |
| Debug settings | Uvicorn runs without `--reload`; FastAPI debug is off; unhandled errors return a generic 500 without a traceback | OK |
| Uploads | Only `.pdf`, `.txt` and `.md` (415 otherwise); ≤ 10 MB (413). Stored content-addressed, never served back. PDF text extracted with pypdf (no script execution) | OK |
| Demo document endpoint | Serves only files listed in the demo manifest (no path traversal) | OK |
| Public exposure | `ONCEONLY_PUBLIC_DEMO=1` refuses all ledger writes (403), rate-limits claim checks (10 per IP per 10 min) and caps them (200 per instance). Rate limiting trusts `X-Forwarded-For`, which can be spoofed. That's acceptable for a demo, not for production | OK for a demo |
| Contract assumptions | One owner (deployer) manages the registrar and reviewer allow-lists. The demo uses one key for both roles. `openChallenge` is permissionless and freezes a claim until a reviewer acts (spam risk; see Q&A 14). First-come ordering lets a registrar squat on ranges (Q&A 20) | Documented limitations |
| Chain configuration | Local Hardhat, chain id 31337; the UI header and the health endpoint report `public_network: false` | OK |

## Licences and attribution
| Item | Finding | Decision needed |
|---|---|---|
| Repository licence | **MIT for the code** (`LICENSE`, © 2026 Siddhant Patil), added with the owner's approval on 2026-10-19. It matches the contracts' SPDX headers; `contracts/package.json` and its lockfile were changed from ISC to MIT. `data/LICENSE` states that `data/` is not covered by MIT and keeps CC BY 4.0 | Done |
| Registry data | Berkeley VROD v2026-08, **CC BY 4.0**. Attribution with the full citation appears in the README, `registry_audit.json`, every demo document and the app's Overview. The committed subset (38,004 rows) is a CC BY redistribution with attribution | OK. Don't relicense the data |
| Synthetic demo documents | Generated by `backend/scripts/make_demo_docs.py`; fictional names, labelled SYNTHETIC. They quote real registry ranges, so they sit under `data/` with CC BY 4.0 terms and attribution | OK |
| Frontend dependencies | react, react-dom, react-router-dom: MIT; lucide-react: ISC; Public Sans and IBM Plex Mono via Fontsource: **OFL-1.1** (the font licence ships with the npm packages) | OK |
| Backend dependencies | fastapi, pydantic, web3, rapidfuzz, anthropic, openpyxl: MIT. uvicorn, pypdf, pandas, httpx, reportlab: BSD. python-multipart: Apache-2.0 | OK; all permissive |
| Reference video narration | macOS system voice (Daniel), generated locally | Disclose it as synthetic narration if that cut is used. Apple's terms for system voices in published media weren't reviewed; a human voice-over avoids the question |

## Accessibility
- **Verified:**
  - axe-core WCAG A/AA clean on 7 pages
  - 4 keyboard-only walkthroughs
  - Lighthouse accessibility 100 on the pages tested
  - reduced motion respected (the hero settles on its final state)
  - 320 px layouts have no horizontal overflow
- **Not verified:** a real **VoiceOver** pass. Turning VoiceOver on is an OS-level setting that speaks aloud, so I didn't change it. Manual check for the owner, about 5 minutes:
  1. Open Safari at http://127.0.0.1:5173/claims/2.
  2. Press ⌘F5 to turn VoiceOver on.
  3. Press VO (Ctrl+Option) + U and open the Landmarks rotor. Confirm "main" and the navigation are listed.
  4. Tab to the Ruler and press VO + Space on the overlap interval. Expect "Overlap: 4,559 units…" and the detail panel to be announced.
  5. Tab to "Send to the contract anyway" and press Space. The dialog should take focus; Escape closes it.
  6. Press ⌘F5 to turn VoiceOver off.

## Remaining known limitations
1. No real-world validation: detection and extraction were evaluated on synthetic claims built on real registry ranges (circular by construction; Q&A 8–9).
2. The AI extractor is implemented but not configured or measured.
3. Local chain only; one registrar key; no authentication.
4. No public deployment (awaiting owner approval).
5. No VoiceOver pass (manual check above).
