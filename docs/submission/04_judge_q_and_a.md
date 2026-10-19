# 04 — Judge Q&A

Each answer has a **short** version (15–30 seconds, live), a **deep** version for follow-ups, its **sources**, and an **evidence flag** wherever a claim needs independent evidence we don't have.
Ground rule: if it isn't implemented or measured, we say so.

---

### 1. What gap does OnceOnly address if registries already prevent double retirement?
**Short:** Registries guarantee a unit is retired once. They don't see what happens next: the public claims companies make about those units. Two companies can cite overlapping retired units in their reports or labels, and nothing checks across claims. OnceOnly checks claims against each other, to the unit, and a contract refuses the second one.

**Deep:**
- Double counting has three forms: double issuance, double claiming and double use. Registries prevent double retirement within their own books, and CAD Trust harmonises registry-level data.
- Neither ingests corporate *claim documents*. Auditors see one client at a time.
- OnceOnly works on the claim layer: it reads the serials a claim cites, reconciles them with registry records, and compares them with every other registered claim in the same batch.

**Sources:**
- `docs/03_competitive_landscape.md`
- `docs/06_product_thesis.md`
- `eval/results/registry_audit.json`: 0 overlapping Verra retirements within a batch, so the registry itself is consistent.

**Evidence flag:** how often real double use happens is **not measured**. We show it's possible and detectable, not that it's common.

### 2. How can separate corporate claims refer to overlapping retired units?
**Short:** One retirement often covers many end users. A broker retires 20,000 units and then allocates slices to customers in statements. If two statements allocate overlapping slices, by error, resale or fraud, each customer's claim looks valid on its own. Our demo is exactly that: two broker statements over one real Verra retirement.

**Deep:**
- The registry records the retiring account and, sometimes, a beneficiary. In VROD 2026-08, **44.7% of Verra retirement rows have no beneficiary** (measured), so the registry often can't say who is entitled to claim.
- Allocation then happens off-registry, in PDFs.
- Other routes include the same certificate reused across group entities, a product-level claim plus a corporate-level claim over the same units, and a reformatted serial cited twice.

**Sources:**
- `backend/app/rules.py` (BEN-002 text, 44.7%)
- `data/demo/` (synthetic statements)

**Evidence flag:** the scenarios are plausible mechanisms; we have **no real-world case study** of them.

### 3. What does a serial-range overlap establish, and what does it not establish?
**Short:** It establishes that two claims cite at least one identical retired unit, which is exact and checkable. It does **not** establish fraud, which claim is right, or anything about credit quality. That's why OnceOnly flags *potential* double use for human review, and the contract only enforces first-come ordering.

**Deep:**
- A legitimate split can look like an overlap if a claim cites a whole range while only using part of it. Errors in the claim document can create a false overlap.
- A hash match proves a document is unchanged, not that it's true.
- The UI states this in findings ("does not say which claim is right") and on Verify.
- Resolution goes through challenge → reviewer uphold (release units) or dismiss.

**Sources:**
- `backend/app/rules.py` (DUP-001 wording)
- `contracts/contracts/ClaimLedger.sol` (`openChallenge`, `resolveChallenge`)

### 4. How are batch identifiers, source conventions and serial boundaries handled?
**Short:** Every range is keyed by registry **and** issuance batch, because Verra unit numbers restart in every batch. Ignore the batch and you get 11,631 false overlaps in real data. Ranges are inclusive at both ends. The parser handles current and legacy Verra and Gold Standard formats, and every one of the 493,518 registry rows parses with quantity = end − start + 1.

**Deep:**
- **Namespaces:** on chain, the namespace is `keccak256("<REGISTRY>:<BATCH_ID>")`.
- **Formats:**
  - Verra: `18453-896309560-896329558-VCS-VCU-…`
  - legacy Verra: no `VCS-` segment
  - Gold Standard: `GS1-1-XZ-GS12303-17-2022-30775-1077-1127`
  - legacy GS: no `GS` before the project number
- **Normalisation:** Unicode dashes and line-wrapped serials are normalised.
- **Boundaries:** inclusive `[start, end]`, so adjacent ranges (end + 1 = next start) are correctly *not* overlaps. That's one of the nine evaluation case types.
- **Gold Standard anomaly:** GS has 5 within-batch overlapping pairs in the registry data itself: 3 exact duplicate rows, plus one 10,000-unit record whose range equals two other records combined. We report them rather than hide them.

**Sources:**
- `backend/app/serials.py`
- `backend/tests/test_serials.py`
- `backend/scripts/build_reference.py` (`make data`; writes the registry audit)
- `eval/results/registry_audit.json`

### 5. How does the contract enforce the no-overlap rule?
**Short:** `registerClaim` inserts each range into a sorted list of the active ranges in its batch. It checks only the two neighbours of the insertion point. If either shares a unit, the whole transaction reverts with `RangeOverlap(namespace, existingClaim, overlapStart, overlapEnd)`. No interface or backend can override that.

**Deep:**
- Who can call it: only addresses on the registrar allow-list.
- Rejected inputs: empty or inverted ranges, and duplicate references (`ClaimRefExists`).
- **Hints:** the caller supplies a predecessor hint (computed off-chain with `hintFor`). A wrong hint can only revert (`BadHint`); it can never let an overlap through, because both neighbours are always checked against the new range.
- **Which claims block:** active and challenged claims hold their units. Revoked and withdrawn claims are unlinked, which releases them.
- **Testing:** 24 contract tests cover overlap at every boundary, hints, roles and lifecycle.
- **In the demo:** the forced registration sends a real transaction and is mined as a failed transaction.

**Sources:**
- `contracts/contracts/ClaimLedger.sol` (`registerClaim`, `_insert`, `_overlap`)
- `contracts/test/ClaimLedger.test.js`

### 6. Why is the selected interval data structure appropriate?
**Short:** Active ranges in a batch never overlap, so they form a sorted chain of disjoint intervals. Inserting a new one only needs its two neighbours checked. With an off-chain hint, that's constant work on chain, so gas stays flat as the ledger grows: 301,452 gas with 10 or 200 existing claims, versus 832,608 for a linear scan at 200.

**Deep:**
- Alternatives (our reasoning; not separately prototyped): an interval tree (O(log n) on chain, but complex and more storage writes) and per-unit bitmaps (impossible at unit numbers near 10⁹).
- A doubly-linked list gives O(1) unlinking on withdraw or revoke.
- The off-chain hint lookup is an O(k) view call, free for the caller.
- With 0 existing claims, registration costs 333,078 gas: first writes to fresh storage cost more.

**Sources:**
- `eval/results/gas.json`
- `make gas`
- `docs/12_ai_and_blockchain_design.md`

### 7. What are the data-structure and transaction-scaling limitations?
**Short:** Three. The hint lookup and pre-flight check walk the list off chain, which is linear in the batch size. A hint can go stale if someone registers in between, so the transaction reverts and must retry. And about 300k gas per claim is fine on an L2 but would be expensive on Ethereum mainnet.

**Deep:**
- **Batch size:** the busiest real Verra batch has **37,284 retirements** (measured). If every one became a claim, `hintFor` would walk about 37k nodes in an `eth_call`. That works on most nodes, but it would hit provider limits on some. Fix: an off-chain index (we already hold the ranges in SQLite) to compute hints, with the contract only verifying them.
- **Claim size:** multi-range claims cost gas linear in their range count.
- **Concurrency:** there's no batching, and concurrent registrars race on hints. That's safe, because the loser reverts with `BadHint`, but it costs a retry.
- **Storage:** storage grows forever. Unlinking frees list positions, not storage slots.

**Sources:**
- `ClaimLedger.sol` (`hintFor`, `checkRange`)
- `eval/results/registry_audit.json` (`retirements_per_namespace.max`)

**Evidence flag:** we have **not load-tested** large namespaces or provider limits.

### 8. How can correctness be evaluated independently of the implementation?
**Short:** Today it isn't fully independent, and we say so. The strongest independent checks would be (1) a hand-labelled set of real claim documents with overlaps marked by an auditor, (2) a property-based test comparing the contract with a naive per-unit reference model, and (3) known historical double-claim cases. None of those exists yet.

**Deep:**
- What is partly independent today:
  - The contract and the Python engine are separate implementations in different languages that agree on 100% of 270 cases.
  - The registry audit runs on real third-party data.
  - Boundary unit tests were written by hand.
- But both implementations encode the same interval definition, so a shared conceptual error wouldn't be caught.
- Proposed next steps: Hypothesis/Foundry fuzzing against a brute-force model on small unit spaces; a blinded labelling exercise with an assurance partner.

**Sources:**
- `eval/` scripts
- `docs/14_evaluation_plan.md`

### 9. What does the synthetic evaluation demonstrate, and what are its limitations?
**Short:** It shows the implementation behaves as specified across nine case types, and that the obvious baseline (exact serial or hash match) misses 120 of 180 overlaps. It is **circular** for accuracy: the labels come from the same overlap definition the engine uses, so a perfect score is expected by construction. It's a correctness and baseline comparison, not independent validation.

**Deep:**
- The set: 270 pairs, 30 per case type, built on real Verra ranges.
- The two OnceOnly checks (engine and contract): precision 1.000, recall 1.000.
- The baseline: recall 0.333.
- The "ignore batch" ablation: precision 0.857, with 30 false positives on same-numbers-different-batch pairs.
- What it doesn't measure: real document variety, real prevalence, false positives from legitimate splits, or adversarial inputs.

**Sources:**
- `eval/results/latest.md`, section A
- `make eval` (seed 20261019)

### 10. Has the parser been measured on representative real-world evidence?
**Short:** No. It was measured on 60 **synthetic** snippets that cite real serial ranges in eight layouts. It never invented a block (precision 1.00) but recovered only 69% of blocks: it fails on tables, prose ranges ("units 1,001 to 2,000 of batch…") and OCR letter-O errors. Real broker statements and certificates are the next evaluation.

**Deep:**
- Per-layout results:
  - perfect on canonical, wrapped, spaced-dash, en-dash and two-block layouts
  - 0/7 each on table columns, prose ranges and OCR errors
- Missed blocks surface as EVD-001 or SER-002 findings, so the failures are visible, not silent.

**Sources:**
- `eval/results/latest.md`, section B
- `backend/app/serials.py`
- `backend/app/extraction.py`

**Evidence flag:** **no real-world documents have been tested.**

### 11. What is the actual role of AI today? What works without an API key?
**Short:** Everything in the demo works without a key. The deterministic parser does all extraction. The optional AI pass (Claude, structured output) is implemented but **disabled and unmeasured**. When it's on, it's cross-checked against the parser: agreement is marked "both", disagreement raises a review finding (EXT-001), and an AI-reported serial that fails registry format validation is ignored (EXT-002).

**Deep:**
- The AI never decides an overlap or a verdict; those come from interval arithmetic.
- It's meant only for layouts the parser can't read.
- The UI's Overview shows "AI extraction: Not configured".

**Sources:**
- `backend/app/extraction.py` (`extract`, `block_source`)
- `backend/app/rules.py` (EXT-000/001/002)

**Evidence flag:** AI accuracy is **not measured**.

### 12. Why use blockchain rather than a conventional database?
**Short:** A database could run the same query. The problem is who runs it. Claims come from competitors, brokers, auditors and registries across jurisdictions. A contract gives a neutral first-come ordering, a rule nobody can switch off (not even us), append-only challenge history, and verification without an account. Only public ranges and hashes go on chain.

**Deep:**
- **What stays off chain:** documents, names and quality judgements. The claimant is a salted commitment.
- **No tokenization:** we don't tokenize credits, which avoids the "digital ghost" concern behind Verra's 2022 ban on tokenizing retired credits.
- **Honest caveats:**
  - Today it's a local chain with one registrar key held by our backend, so the trust benefit is architectural, not yet realised.
  - A consortium database with audit logs is a credible alternative.
  - The chain's advantage grows with the number of mutually distrustful participants.

**Sources:**
- `README.md` ("Why a blockchain?")
- `docs/06_product_thesis.md`
- `docs/13_security_and_privacy.md`

### 13. Who would use this product, and how could registries or organisations adopt it?
**Short:** The first users are assurance providers checking climate claims (CSRD, VCMI), then claim registers, brokers and retailers proving their labels are clean, and regulators. Adoption needs no registry change: OnceOnly consumes public registry data and the serials companies already disclose under VCMI's Claims Code.

**Deep:** the adoption path:
1. A single auditor runs it on their clients against the public snapshot. There's value even without a network.
2. Several assurers share one ledger as registrars, and cross-client overlaps become visible.
3. Registries or claim registers integrate it as a downstream check, or CAD Trust data feeds it.

**Evidence flag:** **no user interviews, pilots or partnerships exist.** This is a hypothesis.

### 14. How are corrections, revised registry data, conflicting evidence and disputes handled?
**Short:** Disputes: anyone can open a challenge on chain. A reviewer then upholds it, which revokes the claim and releases its units, or dismisses it. A registrar can withdraw its own claim. Conflicting evidence goes to a human; we don't decide it. Registry revisions mean re-running checks against a new snapshot. That's manual today.

**Deep:**
- **Lifecycle:** Active → Challenged → Revoked or Active; Active → Withdrawn. All transitions are events, and the history is append-only.
- **Correcting a claim:** you withdraw it and register again with a new reference. There's no in-place edit.
- **Gaps:**
  - Anyone can open a challenge, and a challenged claim stays frozen until a reviewer acts, so challenges can be spammed. It needs a bond or rate limit.
  - Re-checks after a registry update aren't automatic.
  - Reviewer roles are a simple allow-list with no multi-signature.

**Sources:**
- `ClaimLedger.sol` (`openChallenge`, `resolveChallenge`, `withdrawClaim`)
- `backend/app/main.py` (challenge, resolve and withdraw routes)
- Contract tests

### 15. What are the performance, transaction-cost and operational implications?
**Short:**
- About 300k gas per single-range claim, flat as a batch fills. That's cents on a typical L2 and far more on Ethereum mainnet.
- Checks take milliseconds against an indexed SQLite snapshot.
- The demo container runs in about 200–250 MB of RAM and boots in under 2 minutes, even at 0.1 CPU.

**Deep:**
- **Measured:**
  - gas (`eval/results/gas.json`)
  - container memory 213–247 MB steady
  - boot of 116 s at 0.1 CPU / 512 MB
  - warm API responses of 2–182 ms
- **Operations:**
  - registry snapshots need refreshing
  - registrar keys need custody (an HSM or KMS in production)
  - the chain node or RPC provider is a dependency
- No load test has been run.

**Sources:**
- `docs/submission/08_deployment_runbook.md` ("Measured container facts")

**Evidence flag:** L2 fees in money terms are **not measured**; they depend on the network and the day.

### 16. Is the application publicly deployed or a local prototype?
**Short:** It's a local prototype. It runs on a Hardhat development chain (chain id 31337), and every transaction in the demo is real but local. A Docker image that bundles a private chain, the API and the UI in a read-only public demo mode is built and tested. It is **not publicly deployed** unless the owner approves hosting.

**Sources:**
- `docs/submission/07_deployment_assessment.md`
- `08_deployment_runbook.md`

*(Update this answer if a public demo URL is approved and deployed.)*

### 17. What measurable climate-market impact could this enable, and what evidence would be required to demonstrate it?
**Short:** Fewer tonnes counted twice in corporate claims, which means more credible offsetting claims and less greenwashing. The measure is how many tonnes of claimed retirements are found to overlap, and how many are corrected. Showing it needs real claim documents from a pilot. We haven't done that.

**Deep:** the evidence needed:
1. A pilot with an assurer or claim register over a defined claim population.
2. The overlap rate found and how much of it was confirmed by human review.
3. The tonnes corrected or withdrawn.
4. False-positive cost in reviewer hours.

The registry data alone can't show impact, because it is internally consistent within each batch.

**Evidence flag:** **no impact has been measured. Any number would be a projection.**

### 18. What is the biggest limitation of the current implementation?
**Short:** There's no real-world validation. The extraction and detection results come from synthetic claims, and the trust model (one registrar key, a local chain) is a prototype. The core mechanism is sound and tested, but we don't yet know how often real claims overlap or how well we read real documents.

### 19. What would you build next if given more time?
**Short:**
1. A pilot on real, consented claim documents with an assurance partner.
2. An evaluated extractor for tables and scans (the AI pass, measured).
3. Deployment to a public L2 or testnet with per-organisation registrar keys.
4. Challenge bonds and multi-signature reviewers.
5. Live registry feeds and Article 6 / corresponding-adjustment fields.

**Source:** `docs/16_task_backlog.md`

### 20. What happens when a source document is ambiguous, incomplete or malicious?
**Short:**
- **Ambiguous or incomplete:** the parser only accepts well-formed serials. Missing serials block the claim (EVD-001), a quantity mismatch triggers review (SER-002), and unknown ranges are flagged (REG-001/003).
- **Malicious:** a forged document can cite someone else's units. The overlap check catches that if the real owner registered first. If the forger registers first, the real owner's claim is blocked and they must challenge.

**Deep:**
- **First-come risk:** squatting is the main attack. Mitigations today: registrar allow-list, registry beneficiary checks (BEN-000/001/002) and public challenges. Needed for production: registrar accountability and bonds.
- **Uploads:**
  - ≤ 10 MB; `.pdf`, `.txt` and `.md` only
  - stored content-addressed and never served back
  - PDF text extracted without executing content
- **AI output is untrusted:** it's validated against the registry serial grammar.
- **Prompt injection:** a document's text could try to steer the AI pass. Its output can only add candidate blocks, which are validated and marked for review; it can't change verdicts.

**Sources:**
- `backend/app/rules.py`
- `backend/app/extraction.py`
- `backend/app/config.py` (`max_upload_bytes`)
- `docs/13_security_and_privacy.md`

**Evidence flag:** **no adversarial testing** of the AI pass has been done.

---

## Numbers to have ready
| Number | Meaning | Source |
|---|---|---|
| 493,518 | Registry rows parsed (Verra retirements and issuances, GS retirements) | `registry_audit.json` |
| 0 / 307,416 | Overlapping Verra retirements within a batch | same |
| 11,631 | False overlaps if the batch is ignored (Verra) | same |
| 5 | GS within-batch overlapping pairs in the registry data itself | same |
| 44.7% | Verra retirements without a beneficiary | `rules.py` (BEN-002) |
| 270 / 0.333 | Labelled pairs / baseline recall | `latest.md` |
| 301,452 vs 832,608 | Gas with 200 existing claims: hinted vs linear | `gas.json` |
| 4,559 | Shared units in the demo (896,315,001–896,319,559) | live app |
