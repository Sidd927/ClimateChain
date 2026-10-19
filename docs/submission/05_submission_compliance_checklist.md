# 05 — Submission Compliance Checklist

Requirements come from `00_official_requirements.md` (Devpost overview, rules and schedule, re-read 2026-10-19).

**Status key:**
- **Done:** verified.
- **Ready:** prepared and verified, waiting on an owner action.
- **Owner:** needs the owner's decision or approval.
- **Confirm:** must be checked in the signed-in Devpost form.

**Mandatory vs recommended.** Items 1–6 are the mandatory official requirements: deadline, track, description, 3–5 minute video, GitHub link, and a working prototype or proof of concept. The rules page says "a link to your GitHub repo (or equivalent)"; only the overview says **public**. A private link can't be opened by judges, so treat public as mandatory. Items 7–11 are the judging criteria. Items 12–19 are optional, recommended or to confirm in the form.

| # | Official requirement | Evidence in this repo | Status | Remaining action |
|---|---|---|---|---|
| 1 | Submit before **25 Oct 2026, 17:00 +03** (14:00 UTC, 19:30 IST) | Schedule page, quoted in `00_official_requirements.md` | Owner | Submit by **24 Oct** to leave a day of margin |
| 2 | Project belongs to one track and explains how it addresses it | Track statement at the top of `01_devpost_submission.md` and the README: *Carbon Markets & Emissions Transparency*; double use of retired units | Ready | Select the track if the form has a field (Confirm) |
| 3 | Description covers problem, solution, target users, scale, adoption | `01_devpost_submission.md`: "The problem", "What OnceOnly does", "Who it is for", "How it scales and how it's adopted" | Ready | Paste into Devpost |
| 4 | Demo video, 3–5 minutes, showing the project in action | Reference cut verified at 3:27 (`11_reference_video_report.md`); exact script for a human take (`03_demo_script.md`) | Ready (reference) / Owner (final take and upload) | Record the human take (recommended) or use the reference cut. Upload to YouTube or Vimeo (Unlisted); paste the link |
| 5 | **Public** GitHub link with source and documentation | https://github.com/Sidd927/ClimateChain: source, README, `docs/` | **Owner: blocker** | Repository is **private**. Make it public (Settings → General → Danger Zone → Change visibility) after the pre-publication check in `06_final_submission_runbook.md` §10 |
| 6 | Working prototype, mockup or proof of concept | Local stack verified: 30/30 Playwright, demo replay 23/23, fingerprint stable. Container verified: 29 + 1 skipped | Done | Optional public demo link (item 12) |
| 7 | Judging: climate impact | Devpost "The problem", "Evidence"; Q&A 1, 17 (impact not yet measured, stated honestly) | Ready | — |
| 8 | Judging: innovation and creativity | Claim-as-interval model; batch-keyed namespaces; contract-level enforcement (Q&A 4–6) | Ready | — |
| 9 | Judging: technical execution | 24 contract + 24 backend + 30 browser tests; gas measurement; fresh-clone pass (`13_final_qa_report.md`) | Done | — |
| 10 | Judging: practical usefulness | Users and adoption path (Devpost; Q&A 13) | Ready | No pilot or user evidence; don't claim one |
| 11 | Judging: presentation and storytelling | `02_demo_storyboard.md`, `03_demo_script.md`, reference video | Ready | Human voice-over recommended |
| 12 | "Try it out" link (optional, not required) | Container and `render.yaml` prepared (`08_deployment_runbook.md`) | Owner | Approve Render free deployment, or leave blank |
| 13 | Team: 2–5 members or individual; every member joined the hackathon | — | Confirm | Add members via "Manage team", or submit as an individual |
| 14 | Eligibility (country restrictions "noted", no list shown) | — | Confirm | Owner checks eligibility in the form or with the organisers |
| 15 | Accurate claims; no fabricated results | Every number traces to `eval/results/`, the app or measured runs; synthetic data labelled; limits stated (`13_final_qa_report.md`) | Done | Keep any later edits to the same standard |
| 16 | Third-party data used under its licence | VROD CC BY 4.0, attributed in README, app, documents and `data/LICENSE` | Done | — |
| 17 | Repository licence (not an official requirement) | `LICENSE` (MIT, code); `data/LICENSE` (data keeps CC BY 4.0) | Done | — |
| 18 | Video file upload, format and size (unofficial forum report: 35 MB, no track field) | Reference MP4 is 31.6 MB (30.1 MiB), H.264/AAC | Confirm | Check the form's field type |
| 19 | AI-use disclosure | No policy found | Done (none required) | The video description discloses synthetic narration if the reference cut is used |
