# 01 — Hackathon Requirements (IEEE ClimateChain Global Hackathon 2026)

Sources read directly on 2026-10-19 (IST) in a browser session:
- Overview: https://ieee-climatechain-hack.devpost.com/
- Rules: https://ieee-climatechain-hack.devpost.com/rules
- Updates: https://ieee-climatechain-hack.devpost.com/updates
- Discussions: https://ieee-climatechain-hack.devpost.com/forum_topics

The official pages are authoritative. Where pages disagree, the discrepancy is listed in §7 and **not** silently resolved.

## 1. Official challenge areas (verbatim intent)

| Challenge | Problem (official wording, condensed) | Official "Build" examples |
|---|---|---|
| **Carbon markets** — improve trust, transparency, and efficiency | "Lack of transparency, double counting, and complex verification reduce credibility" | Blockchain-based carbon credit verification · Real-time emissions tracking · **Smart contracts to prevent double counting** · Transparent carbon trading platforms |
| **Energy systems** — decentralized and efficient | Energy markets remain centralized and inefficient despite renewable growth | P2P energy trading · Renewable certificate tracking · Microgrid coordination · Tokenized clean-energy incentives |
| **Supply chains** — transparency and accountability | Difficult to verify ethical sourcing and sustainability claims | Product lifecycle tracking · Digital product passports · Recycling traceability · Circular-economy incentives |
| **Climate data** — reliable and accessible | Environmental data is fragmented and difficult to verify | Climate data verification · IoT environmental monitoring · Climate data marketplaces · Research/insight tools |

The overview states: "Your project should belong to one of the defined tracks."

**Our track: Carbon Markets & Emissions Transparency.** Our project directly implements the official build item "Smart contracts to prevent double counting", together with "Blockchain-based carbon credit verification" (see doc 06).

## 2. Judging criteria (no weights published)

| Criterion | Official question | What a strong submission must show |
|---|---|---|
| Climate Impact | How effectively does it address a real climate challenge (transparency, carbon tracking…)? | A named, documented integrity failure mode in carbon markets, and a mechanism that measurably closes it |
| Innovation & Creativity | Fresh, unique application of blockchain/emerging tech within the track? | A mechanism that is not just "put credits on a chain": a *unit-range* non-overlap invariant at the claim layer |
| Technical Execution | Does it function as intended? Is the tech sound and appropriate? Effective use of blockchain, smart contracts, AI, data? | A working contract with tests, real registry data, AI extraction with validation, and reproducible evaluation |
| Practical Usefulness | Practical and scalable; usable by organizations, policymakers, businesses? | Fits an existing workflow: VCMI disclosure of serials, CSRD assurance, EU claims rules |
| Presentation & Storytelling | Clear demo explaining (1) the problem, (2) how it works, (3) real-world impact | A 3–5 min video with one cause→effect narrative |

Note: the judging panel is mostly drawn from IEEE Blockchain groups (Türkiye, Estonia, Orange County, Silicon Valley). Blockchain design quality will be scrutinized. **We must not use blockchain as decoration.**

## 3. Mandatory submission elements

From the overview's "What to submit" and the rules' "Project and Submission Requirements":
1. **Track alignment**: state the chosen track and how the project addresses it.
2. **Project description**: problem, solution, target users, how it scales, ease of adoption.
3. **Demo video, 3–5 minutes**, showing the project in action.
4. **Code repository**: public GitHub (or equivalent) link with source and documentation.
5. **Prototype / demo**: working prototype, mockup, or proof of concept.
6. Submit **before the official deadline**.

Unofficial (participant forum post, unverified): the Devpost form reportedly has **no track selector** and **requires a file upload (35 MB max)**. → Action: the account owner must open the form and confirm. We will prepare a ≤10 MB PDF (one-page summary plus architecture and evaluation) in case it is needed.

## 4. Eligibility and team rules (Rules page)

- Open to students, academic researchers and faculty, independent developers and startups, environmental professionals and climate scientists, and international participants ("with country restrictions noted"; no list is shown on the page).
- Teams of 2–5 members; **individual submissions allowed**. One person can only be on one team.
- Excluded: organizers and their immediate family, judges and their immediate family. Previous grand-prize winners may compete for smaller awards only.

## 5. Deadline and time zone

| Source | Displayed value | UTC |
|---|---|---|
| Overview sidebar (rendered in an IST browser) | 25 Oct 2026 @ 7:30 pm GMT+5:30 | **14:00 UTC** |
| Mission brief | 25 Oct 2026 5:00 PM UTC+3 | 14:00 UTC ✔ |
| Forum post (participant) | 25 Oct 10:00 AM ET (EDT) | 14:00 UTC ✔ |
| Forum post (participant) | Devpost schedule: Oct 5 12:00 GMT+8 → Oct 25 22:00 GMT+8 | 14:00 UTC ✔ |

**Governing close: Sunday 25 Oct 2026, 14:00 UTC = 19:30 IST = 17:00 TRT.**
**Our internal target: submission complete by 24 Oct 2026, 21:00 IST**, which leaves about 22 hours of buffer.
Submissions opened on 5 Oct 2026 (official update, 4 Oct).

## 6. Datasets, standards, and resources

The organizers provide no datasets or APIs. The official resources are training-session recordings (Google Drive videos; not reviewed by us, since they are video only) and IEEE vTools registration links.

Resources we selected (details in doc 04):
- **Berkeley Carbon Trading Project, Voluntary Registry Offsets Database v2026-08**, CC BY 4.0. Includes raw registry files with **serial numbers** for Verra (307,416 retirement rows) and Gold Standard (166,478 retirement rows).
- VCMI Claims Code of Practice v3.0: requires disclosure of retirement serial numbers for each credit used.
- ICVCM Core Carbon Principles: no double counting (double issuance, double use, double claiming).
- Directive (EU) 2024/825 (EmpCo): bans offset-based "neutral/reduced impact" product claims from 27 Sep 2026.
- CAD Trust data model (Chia-based metadata layer): precedent for blockchain in registry interoperability.

## 7. Unresolved questions and discrepancies

| # | Issue | Risk | Action |
|---|---|---|---|
| Q1 | Participants report a rules sentence "Don't submit before official start time 8 AM PT on October 25". This sentence is **not present** on the rules page as we read it on 2026-10-19 | Low (appears removed) | Submit within the Devpost window. Re-check the rules page on submission day |
| Q2 | Rules list session dates (Aug 18, Sep 8/15/22, Oct 5) that differ from the updates (Aug 21, Sep 8, Oct 9) | None for eligibility | Ignore |
| Q3 | A participant says the overview says "students only". We did **not** find that statement; the rules explicitly allow independent developers | Low | Account owner confirms their own eligibility category |
| Q4 | Is a track selector present? Is a file upload required? | Medium | Account owner opens the Devpost submission form early (by 22 Oct) |
| Q5 | "International participants (with country restrictions noted)", but no list is shown | Low for India-based entrants (assumption) | Account owner checks the Devpost standard terms at submission |
| Q6 | Prizes "TBD" on the rules page vs $1,500/$1,000/$500 on the overview | None | n/a |
| Q7 | AI-assistance disclosure policy: none found on the pages read | Low | Disclose tooling honestly in the Devpost "Built with" field if asked |

## 8. Compliance checklist (to be ticked in doc 21)

- [ ] Registered on Devpost; all team members joined the hackathon individually
- [ ] Track stated explicitly: Carbon Markets & Emissions Transparency
- [ ] Description covers problem, solution, target users, scalability, adoption
- [ ] Demo video is 3:00–5:00, public or unlisted, link works logged out
- [ ] Public GitHub repo with README, setup, docs, license
- [ ] Working prototype runnable from README instructions on a clean machine
- [ ] File upload prepared (≤35 MB) if the form requires it
- [ ] Every claim in the description maps to a feature, test, or "future work" label
- [ ] No secrets in the repo history
- [ ] Submitted before 25 Oct 2026 14:00 UTC (internal target: 24 Oct 21:00 IST)
