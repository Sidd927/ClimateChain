# 01 — Devpost Submission Copy

Paste-ready text for each Devpost field. Every number here is traceable to `eval/results/` or the app, and none is invented. Confirm the actual field list in the signed-in form (see `00_official_requirements.md`).

---

## Project name
OnceOnly

## Tagline / elevator pitch (≤ 200 characters)
Registries stop a carbon credit being retired twice. OnceOnly stops the same retired units backing two companies' climate claims, and a smart contract refuses the second claim.

*(176 characters)*

## Track
**Carbon Markets & Emissions Transparency**

---

## About the project (main description)

### The problem
A carbon registry guarantees a credit is retired only once. That is where its scope ends. After retirement, companies cite those units in sustainability reports, product labels and marketing pages. Nothing checks whether **two claims cite the same retired units**. That is the "double use" leg of double counting, which the ICVCM Core Carbon Principles ask the market to rule out. Each claim, read alone, looks fine. Seen together, they may be counting the same tonnes twice.

### What OnceOnly does
OnceOnly treats every claim as what it really is: a set of **unit intervals**. A registry serial such as `18453-896309560-896329558-VCS-…` names an issuance batch, a first unit and a last unit. Once claims are intervals, double use is measurable to the unit.

1. **Read the evidence.** A deterministic parser pulls serial numbers out of the claim's documents. The file is fingerprinted (SHA-256) in the browser. An optional AI pass is cross-checked against the parser.
2. **Reconcile with the registry.** Each range is matched against **493,518 real Verra and Gold Standard registry records** (Berkeley Voluntary Registry Offsets Database, v2026-08, CC BY 4.0).
3. **Check every other claim.** Ranges are compared with every active claim in the same batch. The **Ruler** draws the registry record, the claims, and the exact shared units, e.g. *4,559 units, 896,315,001–896,319,559*.
4. **Enforce on chain.** `ClaimLedger`, a Solidity contract, stores only unit ranges, a salted claimant commitment and document hashes. It **reverts any registration that overlaps an active claim** (`RangeOverlap`), so the rule holds even if someone bypasses the interface.
5. **Let anyone verify.** Anyone can read a claim's status from the contract and check that a document's fingerprint matches, with no account needed. Anyone can open a challenge; a reviewer upholds it (releasing the units) or dismisses it.

OnceOnly is explicit about what it can't decide: it flags *potential* double use for human review. It doesn't say which company is right, and it doesn't rate credit quality.

### Who it is for
- **Assurance providers and auditors** checking corporate climate claims (CSRD/ESRS, VCMI Claims Code). Today each auditor sees one client's claims, never a competitor's.
- **Registries and claim registers** that want a downstream check without changing their retirement process.
- **Buyers, brokers and retailers** who need to show the units behind a label aren't also behind someone else's.
- **Regulators and watchdogs** investigating greenwashing.

### Why a blockchain, honestly
A central database could run the same overlap query. But claims come from competitors, brokers, auditors and registries across jurisdictions, and whoever runs that database could reorder, edit or delete claims. The contract gives a neutral first-come ordering, an invariant no party can bypass (no overlapping ranges), append-only challenge history, and public verification. Only data that's already public (unit ranges) or non-revealing (hashes and a salted commitment) goes on chain. We don't tokenize credits; that's the practice Verra stopped in 2022.

### Evidence
| What we measured (reproducible with `make eval`, `make gas`, `make data`) | Result |
|---|---|
| Registry rows parsed into unit ranges | 493,518 / 493,518 |
| Overlapping Verra retirements within a batch | 0 of 307,416 |
| Apparent overlaps if you ignore the batch (wrong key) | 11,631 adjacent pairs, all across different batches, so ranges must be keyed by registry **and** batch |
| Double-use detection on 270 labelled claim pairs (OnceOnly engine and contract) | precision 1.000, recall 1.000 |
| Same pairs, exact serial-string / document-hash baseline | recall 0.333: it missed all 120 overlaps that weren't word-for-word copies |
| On-chain registration gas, 10 → 200 active claims in a batch | flat 301,452 (sorted interval list, O(1) hinted insert); a linear scan grows to 832,608 |
| Deterministic serial extraction, 60 synthetic snippets | block precision 1.00, recall 0.69 (fails on tables, prose ranges and OCR errors) |

**Read these honestly:** the 270 pairs are synthetic claims built on real registry ranges, and ground truth uses the same interval definition as the engine. The perfect score is expected by construction. It shows the implementation is correct and that simpler methods miss real cases. It is **not** a measure of real-world prevalence or accuracy.

### How it scales and how it's adopted
- **Data scale:** the full 493,518-row registry index is built by one command (`make data`). Interval checks are indexed per (registry, batch), so a check touches only one batch, however large the index grows.
- **Contract scale:** per-batch sorted interval lists with client-supplied hints keep registration gas constant as the ledger grows.
- **Adoption path:** nothing changes for registries. OnceOnly sits downstream and needs only the serials that VCMI's Claims Code already asks companies to disclose. An auditor can start with one client's claims and the public registry snapshot. A shared ledger becomes valuable as more assurers and registers join, and CAD Trust's registry data could serve as a reference source.
- **Toward production:** a public L2 or permissioned consortium chain, authenticated registrar roles per assurer, live registry feeds instead of snapshots, and an evaluated AI extractor for tables and scans.

### What is real and what is synthetic
- **Real:** registry records (Berkeley VROD v2026-08, CC BY 4.0), the smart contract and its transactions, the tests and measurements above.
- **Synthetic:** every company, broker statement and claim in the demo (labelled "SYNTHETIC" in the app).
- **Local:** the chain is a Hardhat development network (chain id 31337), not a public network.

---

## Inspiration
Double counting is usually described in three forms: double issuance, double claiming and double use. Registries handle the first, and CAD Trust works on the registry side. But once a credit is retired, the claims built on it go unchecked. We wanted to know if that gap could be closed with data that's already public.

## How we built it
- **Contract:** Solidity 0.8.24 on Hardhat. `ClaimLedger` keeps a sorted doubly-linked list of intervals per (registry, batch) namespace, with custom errors (`RangeOverlap`, `BadHint`, `ClaimRefExists`) and roles for registrar and reviewer. 24 contract tests.
- **Backend:** Python 3.12, FastAPI, SQLite and web3.py. A rules engine (DUP-001 and others), a deterministic serial parser, registry reconciliation, an evidence store, and an optional Claude extraction pass with structured output and cross-checking. 24 backend tests.
- **Frontend:** React 19, Vite, Tailwind 4, and the Ruler, a custom interval instrument. Native dialogs and View Transitions. 30 Playwright tests, including keyboard-only walkthroughs and axe-core WCAG A/AA checks.
- **Data:** a pipeline over the Berkeley VROD workbook: 493,518 rows parsed and audited. A 38,004-row real subset ships with the repo.
- **Deployment:** a single Docker image runs a private chain, deploys the contract, reseeds a deterministic demo (verified by a state fingerprint) and serves a read-only public demo mode.

## Challenges we ran into
- **The key is not the serial number.** Verra unit numbers restart in every batch. Treating units as global produced 11,631 "overlaps" that were really collisions between different batches. Every interval had to be keyed by registry and batch, on and off chain.
- **Gas that grows with the ledger.** A first contract scanned every claim, and the cost rose to 832,608 gas at 200 claims. Moving to sorted lists with off-chain hints made it flat at 301,452.
- **Being honest about our own evaluation.** It's easy to score 100% on test data you built yourself. We report the baseline, the ablation and the limits alongside the score.

## Accomplishments that we're proud of
- The rule is enforced by the contract itself. You can bypass the UI and send the registration straight to the chain; it still refuses.
- The demo runs on real registry records and real (local-chain) transactions. The only invented parts are the claimant companies and their statements, and the app labels them SYNTHETIC.
- One command resets the demo to a byte-identical state (checked by fingerprint).

## What we learned
Interval arithmetic is a better model for carbon claims than document hashing. Most real double use won't be a copied file; it will be an overlapping range. And the strongest argument for a blockchain here isn't storage. It's a neutral ordering and an invariant that nobody, including us, can switch off.

## What's next
- Deploy `ClaimLedger` to a public testnet or L2 and run a pilot with an assurance provider on real (consented) claim documents.
- Evaluate the AI extractor on tables, scans and prose before enabling it.
- Live registry feeds, Article 6 / corresponding-adjustment fields, and integration with VCMI and CAD Trust data.

## Built with
`solidity` `hardhat` `ethers.js` `python` `fastapi` `sqlite` `web3.py` `react` `typescript` `vite` `tailwindcss` `playwright` `docker` `claude` (optional, not enabled in the demo)

## Links (fill in after owner approval)
| Field | Value | Status |
|---|---|---|
| Source code | https://github.com/Sidd927/ClimateChain | **Private; it must be made public before submission (owner action)** |
| Demo video | YouTube/Vimeo link to the final MP4 | **Not uploaded; owner action** |
| Try it out (optional) | Render URL, labelled "Demo instance: ledger writes disabled; contract runs on a private chain inside the container; may take ~2 minutes to wake" | **Not deployed; needs owner approval** (`08_deployment_runbook.md` §C) |

## Media gallery (suggested order)
1. `docs/img/landing-hero.png`: the hero Ruler on a real retirement.
2. `docs/img/claim-overlap.png`: the overlap and the contract's rejection.
3. `docs/img/claims-ledger.png`: the claims ledger.
4. `docs/img/claim-mobile.png`: the mobile layout.

## Video description (for YouTube/Vimeo)
> OnceOnly: every retired tonne, claimed once. IEEE ClimateChain Global Hackathon 2026, track: Carbon Markets & Emissions Transparency.
> Recorded from the working prototype on a local development chain. Registry records are real (Berkeley Voluntary Registry Offsets Database v2026-08, CC BY 4.0); companies and claims are synthetic.
> *(If the reference cut is used, add: "Narration: synthetic text-to-speech.")*
