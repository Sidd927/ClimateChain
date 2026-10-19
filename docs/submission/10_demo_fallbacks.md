# 10 — Demo Fallbacks

Ordered from most to least preferred.

## Fallback ladder for the submission video
1. **Human-narrated take** of `03_demo_script.md` against the local stack. This is the recommended final entry.
2. **The verified reference cut**, `exports/demo_reference/demo_reference.mp4` (3:27, synthetic voice, see `11_reference_video_report.md`). It's acceptable if time runs out. Disclose "narration: synthetic text-to-speech" in the video description.
3. **The reference picture with a human voice-over:** record narration over `exports/demo_reference/raw.mp4`, using `timeline.json` for timing. Mux it with `ffmpeg -i raw.mp4 -i voice.wav -c:v copy -c:a aac -shortest out.mp4`.
4. **Regenerate the reference cut** with `cd frontend && node qa/demo/record.mjs` on a fresh ledger (about 4 minutes, fully automatic).

## Recovery during a live take
| Symptom | Likely cause | Fix |
|---|---|---|
| Header shows a grey dot or "chain unavailable" | Hardhat node stopped | Restart `make chain`, then `make reset`, restart `make api`, and start over |
| Northwind lands on `/claims/3` instead of `/claims/1` | Ledger not fresh | `make reset`, restart `make api`, and start over (the script's numbers assume a fresh ledger) |
| "Anchor on ledger" disabled with a "Public demo instance" note | Recording against the container (`ONCEONLY_PUBLIC_DEMO=1`) | Use the local stack on :5173 |
| Helios doesn't show an overlap | Northwind wasn't anchored first | Go back to `/claims/1`, anchor, then reopen `/claims/2` |
| "Send to the contract anyway" missing | Claim isn't blocked, or you're on the mobile layout | Widen the window to ≥ 1024 px; confirm DUP-001 shows in Findings |
| Verify says "Fingerprint differs" | Wrong file chosen | Pick `data/demo/northwind_allocation.pdf` exactly |
| Hero isn't on "4 Overlap" at the start | Animation still running | Wait 5 s or click **4 Overlap** |
| A beat stumbles | — | Keep going and fix it in the edit at a route change, or retake from the last route change |

## Live judging or Q&A without a laptop stack
- **Seeded state:** `make seed` then `make demo-check` gives the five-claim story (Northwind anchored, Helios blocked with a rejection, Arbor, Lumen, Kestrel). Fingerprint: `c544f5897354081cf1d20efb366b951f14d2b8ffa69bcb87b105cfdc0df6483b`.
- **Container:** `colima start`, then `make docker-build` and `make docker-run`, then open http://127.0.0.1:7860. Ledger writes are disabled there by design.
- **Screenshots:** `docs/design/screenshots/` and the keyframes in `exports/demo_reference/keyframes/`.
- **If nothing runs:** the reference MP4 plus the README's evaluation tables.
