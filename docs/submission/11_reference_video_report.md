# 11 — Reference Video Report

**Status: verified.** A complete reference film was recorded from the real running application and verified on 2026-10-19. It is a **reference cut with synthetic narration**, intended as a timing guide and as a fallback submission. A human-narrated recording made from `03_demo_script.md` is still recommended for the final entry.

## The file
| Property | Verified value (ffprobe, 2026-10-19) |
|---|---|
| Path | `exports/demo_reference/demo_reference.mp4` (gitignored, not committed) |
| Duration | **206.96 s (3 min 27 s)**, inside the official 3–5 minutes |
| Video | H.264, 1920 × 1080, constant 30 fps, yuv420p |
| Audio | AAC 160 kb/s, 48 kHz mono; mean −20.2 dB, peak −0.2 dB |
| Size | 31,600,786 bytes (30.1 MiB), under the 35 MB upload figure a participant reported on the forum (unconfirmed) |
| SHA-256 | `0f712b97cb4f7ec6205fd921d128e8f875603a0ef14dade4fa0b0450d290e484` |
| Integrity | Full decode with `ffmpeg -v error -i … -f null -` gives no errors |
| Container | `+faststart` (plays while it downloads); title and comment metadata disclose the synthetic narration |

Files alongside it, in the same folder:
- `voiceover.wav`: the narration track on its own.
- `captions.srt`: 4,340 bytes, timed proportionally within each beat. Upload it as YouTube captions or burn it in.
- `timeline.json`: the start, end, action and speech durations for each beat.
- `keyframes/`: 23 PNGs, one at the end of each beat.
- `raw.mp4`: the silent picture.
- `audio/`: the per-beat narration clips.

## How it was made
1. **Source of truth:** `frontend/qa/demo/beats.mjs` holds 23 beats. Each beat pairs the verbatim narration with the Playwright actions on screen. `03_demo_script.md` mirrors it.
2. **Narration:** macOS `say` with the **Daniel** (en-GB) voice renders each beat to a clip, which ffmpeg resamples to 48 kHz. That gives 177.1 s of speech and 444 words. The voice is synthetic and labelled as such in the file metadata and in this report.
3. **Picture:** Google Chrome, driven by Playwright, records at 1440 × 810 CSS px with a device scale factor of 4/3. The Chrome DevTools screencast (`Page.startScreencast`, JPEG quality 92) captures 1920 × 1080 frames with wall-clock timestamps. The application is the unmodified local stack (Vite dev server, FastAPI and the Hardhat chain) starting from a **fresh ledger**. Every anchor, overlap, contract rejection and verification in the film happened live during the take.
4. **Pacing:** each beat lasts as long as the longer of its speech and its on-screen action, plus a 1.1 s pause.
5. **Assembly:** ffmpeg turns the frames into a constant 30 fps H.264 video (CRF 16). It mixes the narration clips at their beat start times (`adelay` + `amix`), then muxes the picture and sound into the MP4.

Recording-only aids, which differ from what a visitor sees:
- A drawn **pointer** with a click ripple. Headless Chrome doesn't paint the system cursor, so an injected popover draws one.
- **Hidden scrollbars**, as macOS overlay scrollbars would look. Headless Chrome paints a classic scrollbar gutter.

Nothing else on screen is altered. No frames are composited, retimed or edited.

Reproduce it:
1. Run `make chain`, then `make reset`.
2. Restart `make api` and keep `make web` running. Do not seed.
3. Run `cd frontend && node qa/demo/record.mjs`. It takes about 4 minutes.

The script deletes and rewrites `exports/demo_reference/`.

## Review and corrections
The first take ran 178 s, under the 3-minute minimum. Two beats were added: 3d (provenance) and 6o (overview transactions). The pause between beats was also lengthened, giving 207 s.

| Issue found in review | Fix |
|---|---|
| A white scrollbar gutter on the right edge of every frame | Recording-only CSS hides scrollbars |
| Beat 5c failed once with "element is not attached to the DOM" after the contract's response re-rendered the panel | `point()` retries against a fresh lookup |
| **A real UI bug:** in the landing hero at 1280–1440 px, the "4,559 units claimed twice" label overlapped the "Illustration: synthetic claimants" chip | The Ruler's flash animation animates `filter`, which made a zero-height wrapper the containing block for the bracket and label, so both drew 36 px too high. It only happened with motion enabled, which is the default; reduced-motion screenshots, including the README images, were unaffected, which is why earlier QA missed it. Fixed in `Ruler.tsx` (`absolute inset-0` on the wrapper), checked at 375, 1024 and 1440 px, and the film was re-recorded |

## Keyframes (at the end of each beat)
| Time | Beat | Screen |
|---|---|---|
| 0:00 | 1a | Landing hero: the real VCS:18453 retirement drawn as a Ruler |
| 0:33 | 2b | "How it works": serial anatomy, first and last unit highlighted |
| 1:08 | 3c | `/claims/1` Northwind: every check passed, Ruler inside the registry record |
| 1:26 | 4a | Anchor confirmation, then "Anchored as ledger claim #1" |
| 1:49 | 4d | `/claims/2` Helios: 896,315,001–896,319,559 bracketed, 4,559 units claimed twice |
| 2:08 | 5b | The forced registration is sent to the contract anyway |
| 2:14 | 5c | "Rejected by contract", `RangeOverlap`, audit trail |
| 2:23 | 6o | Overview: ledger transactions, including the rejected one |
| 2:33 | 6a–6b | Verify: the record read from the contract, "Fingerprint matches" |
| 3:01 | 7a | Evidence: "Intervals catch what hashes miss" |
| 3:14 | 7b–7c | Back to the hero; closing line |

## Known limitations of this cut
- The voice is synthetic. Daniel's pace is fixed (`say -r` had no audible effect), and some numbers sound flat. A human voice-over will carry more conviction.
- Captions are timed proportionally inside each beat, not aligned word by word.
- The film shows the local development chain (chain id 31337), as the narration says. It doesn't show a public network.
- The pointer covers part of the "896,319,559" boundary label for about one second in beat 4d.
