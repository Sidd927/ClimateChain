# 03 — Demo Script (final, exact)

**Runtime:** 3:27 in the reference take (206.96 s); aim for 3:20–3:45 with a human voice. Hard limits: 3:00 minimum and 5:00 maximum.
**Voice-over:** 444 words. At about 150 words a minute that's roughly 3:00 of speech, plus the on-screen action.
**Source of truth:** `frontend/qa/demo/beats.mjs`. The voice-over below is copied from it verbatim (pause markers become `/`). If you change a line, change it in both places.
**Timestamps** come from the verified reference take (`exports/demo_reference/timeline.json`).

## Before you record
1. Start the stack in this order:
   - `make chain`
   - `make reset`
   - restart `make api`
   - `make web`
   - **Do not run `make seed`.** The film builds the ledger live, so Northwind becomes claim #1 and Helios claim #2.
2. Set up Chrome:
   - one window at 1440 × 810 or larger, zoom 100%
   - the bookmarks bar hidden
   - notifications off (macOS Focus)
   - logged-out profile
3. Open http://127.0.0.1:5173/ and wait for the hero animation to settle on "4 Overlap".
4. Keep `data/demo/northwind_allocation.pdf` easy to reach in Finder. You'll need it at 2:40.
5. See `09_demo_recording_checklist.md` for the full checklist and `10_demo_fallbacks.md` for recovery.

Delivery throughout: calm, unhurried, confident. Let the interface finish moving before you speak over it. A `/` in the voice-over means a half-second pause.

---

## Scene 1 — The hook (0:00–0:21)
### 1a · 0:00 · Route `/` · State: fresh ledger, hero showing "4 Overlap"
**Action:** none. Rest the pointer in the empty space beside the headline.
**Voice-over:**
> This is a real carbon credit retirement. Nineteen thousand, nine hundred and ninety-nine units from a wind project in Tamil Nadu, retired on Verra's registry.

**Delivery:** slow; let "real" land. Say the number in full.
**Recovery:** if the hero isn't on "4 Overlap", click **4 Overlap**.

### 1b · 0:11 · `/`
**Action:** none.
**Voice-over:**
> The registry makes sure each unit is retired only once. / But a retirement isn't where the story ends. It's where the claims begin.

**Delivery:** a slight turn on "But".
**Transition:** straight into 2a without a pause.

## Scene 2 — The insight (0:21–0:49)
### 2a · 0:21 · `/`
**Action:** hover over **4 Overlap** without clicking, then drift back to the hero copy.
**Voice-over:**
> Companies cite retired units in reports, product labels and web pages. Two of those claims can cite the same units. And read alone, each one looks perfectly fine.

### 2b · 0:33 · `/` → `/#how`
**Action:**
1. Click **How it works** in the hero. It scrolls to the serial anatomy.
2. Click **First unit: 896309560**.
3. Click **Last unit: 896319559**.

**Voice-over:**
> OnceOnly checks claims against each other. / Every serial number is a range: an issuance batch, a first unit, and a last unit.

**Delivery:** time "first unit" and "last unit" to the clicks.
**Recovery:** if the scroll stops short, scroll by hand to "Read a serial number".

### 2c · 0:43 · `/#how`
**Action:** none.
**Voice-over:**
> So a claim becomes an interval. And double use becomes something you can measure.

**Transition:** scroll back to the top.

## Scene 3 — The product (0:49–1:26)
### 3a · 0:49 · `/` → `/claims/new`
**Action:** click **Check a claim**.
**Voice-over:**
> Let's check one. The companies here are synthetic. The registry records are real, from Berkeley's public offsets database.

### 3b · 0:58 · `/claims/new`
**Action:** click the **Clean claim** sample (Northwind Foods). Wait for "SHA-256, computed in your browser".
**Voice-over:**
> Northwind Foods submits a broker's allocation statement. OnceOnly fingerprints the file in the browser, then reads its serial numbers.

### 3c · 1:08 · → `/claims/1`
**Action:** click **Run checks**. When "Every check passed" appears, scroll to **Claimed units**.
**Voice-over:**
> It matches them to the registry. / Every check passes, and the Ruler shows Northwind's units inside the real retirement.

**Recovery:** if the claim lands on a number other than 1, the ledger wasn't fresh. Carry on; the numbers just won't match the script. Re-record for the final take.

### 3d · 1:16 · `/claims/1`
**Action:** scroll to **Provenance** and sweep the pointer left to right across its four steps. Then scroll back to the top.
**Voice-over:**
> Below it, the provenance chain: the document, its serial block, the registry record, and, once anchored, the ledger.

## Scene 4 — The proof (1:26–1:57)
### 4a · 1:26 · `/claims/1`
**Action:**
1. Click **Anchor on ledger** in the Ledger actions panel.
2. In the dialog, click **Anchor on ledger**.
3. Wait for "Anchored as ledger claim #1".

**Voice-over:**
> Anchoring writes this exact unit range, and a fingerprint of the evidence, to a smart contract called ClaimLedger.

**Recovery:** if the anchor fails ("chain unavailable"), the Hardhat node or API is down. Restart `make chain`, `make reset` and `make api`, then begin again.

### 4b · 1:34 · → `/claims/new` → `/claims/2`
**Action:**
1. Click **Check a claim**.
2. Click the **Overlapping claim** sample (Helios Apparel).
3. Click **Run checks**.

**Voice-over:**
> Now a second company, Helios Apparel, submits its own statement. Same retirement. Different serial number.

### 4c · 1:43 · `/claims/2`
**Action:** wait for "4,559 units already back…", then scroll to **Claimed units**.
**Voice-over:**
> A hash comparison would see nothing in common. / The Ruler sees it at once.

**Delivery:** a full pause before "The Ruler".

### 4d · 1:49 · `/claims/2`
**Action:**
1. Hover the crimson overlap.
2. Point at **896,315,001** on "from here".
3. Point at **896,319,559** on "to here".
4. Click the overlap to open its detail.

**Voice-over:**
> Four thousand, five hundred and fifty-nine units, from here, to here, already back Northwind's claim.

**Delivery:** this is the money shot. Slow down.

## Scene 5 — Evidence and enforcement (1:57–2:23)
### 5a · 1:57 · `/claims/2`
**Action:** scroll to **Findings**. DUP-001 is blocking.
**Voice-over:**
> OnceOnly blocks the claim, and it says what it can't tell you: which company is right. That takes the broker's records, and a human reviewer.

### 5b · 2:08 · `/claims/2`
**Action:**
1. Scroll to the top.
2. Click **Send to the contract anyway**.
3. In the dialog, click **Send to the contract**.

**Voice-over:**
> But the rule doesn't live in this interface. Send the registration straight to the contract anyway.

### 5c · 2:14 · `/claims/2`
**Action:** wait for **Rejected by contract**, point at it, then scroll to **Audit trail**.
**Voice-over:**
> ClaimLedger refuses it. Range overlap. The failed transaction is mined, and recorded in the claim's audit trail.

**Recovery:** if the button is disabled with a "Public demo instance" note, you're on the container (`ONCEONLY_PUBLIC_DEMO=1`). Record against the local stack instead.

## Scene 6 — Auditability and limits (2:23–3:01)
### 6o · 2:23 · → `/overview`
**Action:** click **Overview** in the navigation, scroll to **Ledger transactions**, and point at the "Rejected by contract" row.
**Voice-over:**
> The overview keeps the ledger honest at a glance: what is anchored, what is blocked, and every transaction the contract accepted, or refused.

### 6a · 2:33 · → `/verify`
**Action:** click **Verify** in the navigation, then the quick pick **OO-2026-0001**. Wait for "Active on ClaimLedger".
**Voice-over:**
> Anyone can verify a claim without an account. Read Northwind's record straight from the contract.

### 6b · 2:40 · `/verify?ref=OO-2026-0001`
**Action:**
1. Click **Choose a document** and pick `data/demo/northwind_allocation.pdf`.
2. Click **Verify**.
3. Point at **Fingerprint matches**.

**Voice-over:**
> Then drop in the document. The fingerprint matches what was committed.

### 6c · 2:45 · `/verify`
**Action:** none. Move the pointer away from the text.
**Voice-over:**
> A match proves the file hasn't changed, not that it's true. And an overlap is a signal to investigate, not proof of fraud. This prototype runs on a local development chain, and it checks double use, not credit quality.

**Delivery:** plain and matter-of-fact. This honesty is a strength, so don't rush it.

## Scene 7 — The closing argument (3:01–3:27)
### 7a · 3:01 · → `/evidence`
**Action:** click **Evidence** in the navigation and point at "Intervals catch what hashes miss".
**Voice-over:**
> We tested the interval check on two hundred and seventy synthetic claim pairs, built on real registry ranges. Exact serial or hash matching missed every overlap that wasn't a word-for-word copy.

### 7b · 3:14 · → `/`
**Action:** click the **OnceOnly** logo (home).
**Voice-over:**
> Registries make sure a tonne is retired once. / OnceOnly makes sure it's claimed once.

### 7c · 3:21 · `/`
**Action:** none. Hold on the hero for about 2 seconds after the last word.
**Voice-over:**
> Every retired tonne, / claimed once.

**Delivery:** the slowest line of the film. Then silence.

---

## Pronunciation guide
| Word | Say |
|---|---|
| OnceOnly | "WUNSS-ohn-lee" (two words run together) |
| Verra | "VAIR-uh" |
| Tamil Nadu | "TAM-il NAH-doo" |
| ClaimLedger | "CLAIM-ledger" |
| Berkeley | "BURK-lee" |
| VROD | "V-R-O-D" (letters), only if asked; the film doesn't say it |
| 896,315,001 | Not read aloud; you point at it |
| 4,559 | "four thousand, five hundred and fifty-nine" |
| 19,999 | "nineteen thousand, nine hundred and ninety-nine" |
| RangeOverlap | Spoken as "Range overlap" |

## Word count by scene
| Scene | Words |
|---|---|
| 1 Hook | 48 |
| 2 Insight | 64 |
| 3 Product | 74 |
| 4 Proof | 62 |
| 5 Enforcement | 58 |
| 6 Auditability and limits | 88 |
| 7 Closing | 50 |
| **Total** | **444** |

## Claims in this script and their sources
| Claim | Source |
|---|---|
| 19,999 units, Tamil Nadu wind, Verra | `data/reference/demo_subset.csv.gz`, serial `18453-896309560-896329558-VCS-VCU-1507-VER-IN-1-1904-…` |
| 4,559 shared units, 896,315,001–896,319,559 | Live in the app (`/claims/2`) and in the contract's `RangeOverlap` revert |
| 270 synthetic pairs; exact matching missed 120 of 180 overlaps (all except identical serials and identical documents) | `eval/results/latest.md`, section A |
| Synthetic claimants, real registry records | `data/demo/` (synthetic), Berkeley VROD 2026-08 (CC BY 4.0) |
| Local development chain | Hardhat, chain id 31337, shown in the app header |
