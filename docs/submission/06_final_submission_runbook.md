# 06 — Final Submission Runbook

**Nothing has been submitted.** Submission, publishing the repository, uploading the video and any public deployment are owner actions.

## 1. Repository and branch
- **URL:** https://github.com/Sidd927/ClimateChain (currently **private**).
- **Branch to submit:** `main`. Mission 04 work was done on `feature/submission-readiness` and merged into `main`.

## 2. Final verified commit
The verified commit is the `main` HEAD after the Mission 04 merge. The handoff message gives the exact SHA. Check it at any time:

```bash
git fetch origin && git rev-parse origin/main
```

## 3. Working tree and remote
`main` should equal `origin/main`, with a clean working tree. Check with:

```bash
git status -sb
```

Expected: `## main...origin/main` and no other lines. Generated media lives in `exports/`, which is gitignored.

## 4. Setup and reset
Run once:

```bash
make setup
```

Each session needs three terminals:
1. `make chain`
2. `make deploy && make api`
3. `make web`

**Reset to the judge story:**
1. Keep the chain running and run `make reset`.
2. Restart `make api`.
3. Run `make seed`.
4. Run `make demo-check`. Expected last line: `fingerprint c544f5897354081cf1d20efb366b951f14d2b8ffa69bcb87b105cfdc0df6483b`.

**Reset for recording (fresh ledger):**
1. Run `make reset`.
2. Restart `make api`.
3. Do **not** seed.

## 5. Demo launch and URL
- **Local:** http://127.0.0.1:5173/. The app proper starts at `/overview`; the money shot is `/claims/2`.
- **Container:** run `colima start`, `make docker-build` and `make docker-run`, then open http://127.0.0.1:7860. Ledger writes are disabled there.

## 6. Recording
- **Script:** `docs/submission/03_demo_script.md`. The source of truth is `frontend/qa/demo/beats.mjs`.
- **Storyboard:** `02_demo_storyboard.md`.
- **Checklist:** `09_demo_recording_checklist.md`.
- **Fallbacks:** `10_demo_fallbacks.md`.
- **Optional pre-flight on a fresh ledger:** `make demo-validate` (about 1 minute), then `make reset` and restart `make api` before recording.

## 7. Reference video
- **Path:** `exports/demo_reference/demo_reference.mp4`.
- **Verified:** 3:27 (206.96 s); 1920×1080 H.264 30 fps; AAC; 31.6 MB; SHA-256 `0f712b97…0e484`.
- **Narration** is synthetic (macOS "Daniel").
- **Also in the folder:** `captions.srt`, `voiceover.wav`, `raw.mp4` (silent) and `keyframes/`.
- **Regenerate** with `make demo-record` on a fresh ledger.
- Details: `11_reference_video_report.md`.

## 8. Devpost copy, field by field
All text is in `01_devpost_submission.md`.

| Devpost field | Paste from |
|---|---|
| Project name | "OnceOnly" |
| Elevator pitch | "Tagline / elevator pitch" (176 characters) |
| About the project / story | "About the project" through "What's next" (Devpost's Markdown supports the tables) |
| Built with | the "Built with" tag list |
| Track (if present) | Carbon Markets & Emissions Transparency |
| Try it out | GitHub URL; the Render URL only if deployed, with its label |
| Video | YouTube/Vimeo link |
| Image gallery | `docs/img/landing-hero.png`, `claim-overlap.png`, `claims-ledger.png`, `claim-mobile.png` |

## 9. Required links and media
1. Public GitHub URL (after §10).
2. Video link, playable while signed out.
3. At least two gallery images (above).
4. Optional demo URL.

## 10. Repository visibility (approval needed)
The overview asks for a **public** repository. Before making it public:
1. Check that no secrets are tracked:

   ```bash
   git ls-files | grep -iE '(^|/)\.env$'
   ```

   It must print nothing. `13_final_qa_report.md` records a clean scan.
2. Remember that the whole commit history becomes public: author name and email on commits, all docs and the design screenshots.
3. The licence is already in place (§12).
4. Then go to GitHub → Settings → General → Danger Zone → **Change repository visibility → Public**.
5. Open the URL in a private window to confirm it's reachable.

## 11. Deployment
- **Status:** container tested in isolation; **not publicly deployed**.
- **Hugging Face Spaces:** Docker Spaces now need a paid plan, so they're not recommended.
- **Render free tier:** prepared (`render.yaml`, `08_deployment_runbook.md` §C). It needs your Render account, plus repository access or a public repository.
- **Decision:** deploy (free, sleeps after 15 minutes, about a 1-minute wake) or skip. A hosted demo isn't required.

## 12. Licence and attribution
- **Data:** Berkeley VROD v2026-08 (CC BY 4.0) is attributed in the README, the app and the documents. OK.
- **Code licence:** MIT (`LICENSE`), added with your approval. It matches the contracts' SPDX headers and `contracts/package.json`.
- **Data:** `data/LICENSE` states that `data/` is outside the MIT licence and keeps CC BY 4.0, with the full citation.

## 13. Pre-submission smoke test (about 10 minutes)
1. In a fresh clone:
   - `git clone https://github.com/Sidd927/ClimateChain.git /tmp/oo-check && cd /tmp/oo-check`
   - `make setup`
   - `make test`, which should report 24 and 24 passing
2. Start the stack and seed it:
   - `make chain`
   - `make deploy && make api`
   - `make web`
   - `make seed`
   - `make demo-check`, which should print the fingerprint above
3. In a browser:
   - `/claims/2` shows "4,559 units already back OO-2026-0001" and "Rejected by contract".
   - `/verify` with OO-2026-0001 shows "Active on ClaimLedger".
4. Play the video link in a private window: check its length (3:00–5:00) and that the audio is present.
5. Open the GitHub link in a private window: the README renders and its images load.

## 14. The last 30 minutes
- [ ] Devpost: every required field filled; track stated in the first paragraph.
- [ ] Video link plays signed out; length between 3 and 5 minutes.
- [ ] Repository is public, and the link opens signed out.
- [ ] Team members confirmed (or individual).
- [ ] Gallery images uploaded.
- [ ] The description makes no claim of a public deployment unless one is live.
- [ ] Preview the Devpost page, then **Submit**. Note that the deadline is 17:00 +03 = 14:00 UTC = 19:30 IST, 25 Oct 2026.
- [ ] Screenshot the confirmation page.

## 15. Remaining blockers (by urgency and impact)
1. **Make the repository public.** Required by the overview; owner approval.
2. **Final video.** Record the human take, or approve the reference cut; then upload and get the link. Owner action.
3. **Submit on Devpost and confirm the form fields** (track field, video field type, team). Owner action.
4. **Optional public demo on Render free.** Owner approval and account.
5. **Optional VoiceOver check.** Five-minute manual checklist in `13_final_qa_report.md`.
