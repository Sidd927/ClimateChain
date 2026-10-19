# 09 — Demo Recording Checklist

Use this for a human-narrated take. The synthetic reference cut already exists (`exports/demo_reference/demo_reference.mp4`, see `11_reference_video_report.md`).

## Machine (about 10 minutes before)
- [ ] Turn on macOS Focus / Do Not Disturb, and quit Slack, Mail and Messages.
- [ ] Close unrelated tabs and windows, and hide the Dock (⌥⌘D).
- [ ] Plug in power. Turn off Low Power Mode so animations run smoothly.
- [ ] Set the display to its default resolution and Chrome zoom to 100% (⌘0).
- [ ] Hide the bookmarks bar (⇧⌘B) and use a profile with no extensions showing.
- [ ] Make the Chrome window at least 1440 × 810. For a 1080p capture, use a 1920 × 1080 window or record the window region.
- [ ] Set the microphone input level so normal speech peaks around −12 dB. Record 10 s of room tone.

## Stack (in order)
- [ ] Terminal 1: `make chain`
- [ ] Terminal 2: `make reset`, then `make api`. **Do not `make seed`.**
- [ ] Terminal 3: `make web`
- [ ] Run `curl -s 127.0.0.1:8000/api/claims`. It should return `[]`.
- [ ] Open http://127.0.0.1:5173/. The header should show "Local dev chain · block N" with a green dot.
- [ ] Have `data/demo/northwind_allocation.pdf` ready in Finder (beat 6b).

## Dry run
- [ ] Rehearse once with the script (`03_demo_script.md`), then reset again: `make reset` and restart `make api`.
- [ ] Time the run. It must fall between 3:00 and 5:00. The target is 3:20–3:45.

## Record
- [ ] Use QuickTime (File → New Screen Recording, choose the microphone, record the selected window) or OBS at 1080p30.
- [ ] Wait 2 s of silence on the hero before the first line.
- [ ] Follow `03_demo_script.md` beat by beat. If a beat goes wrong, see `10_demo_fallbacks.md`.
- [ ] Hold 2 s on the hero after "claimed once."

## After
- [ ] Trim the head and tail only. Don't speed up the footage.
- [ ] Export H.264 MP4 at 1080p.
- [ ] Check that the duration is between 3:00 and 5:00 and that the audio is in sync at 4d ("from here, to here").
- [ ] Captions: adapt `exports/demo_reference/captions.srt` or use YouTube auto-captions and correct them.
- [ ] Upload to YouTube as **Unlisted** (or Vimeo), after the owner approves. Title: "OnceOnly: every retired tonne, claimed once (IEEE ClimateChain 2026)".
- [ ] Open the link in a private window to confirm it plays without signing in.
- [ ] Restore the seeded demo for judges: `make reset`, restart `make api`, `make seed`, `make demo-check`.

## Voice notes
- Speak at about 150 words a minute; the script has 444 words.
- Smile on the first line. Slow down on 4d and 7c.
- Say numbers in full (see the pronunciation guide in `03_demo_script.md`).
