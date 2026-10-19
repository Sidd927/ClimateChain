# 07 — Product Requirements

**Name:** OnceOnly  **Tagline:** Every retired tonne, claimed once.
**Track:** Carbon Markets & Emissions Transparency

## Persona

**Priya, claim-assurance analyst** at a mid-size consumer goods company (or at its audit firm). Each year she substantiates the company's offset-based claim: 40–200 retirement certificates from 2–3 brokers across Verra and Gold Standard. The auditor's sampling question ("prove nobody else claims these units") currently has no answer beyond "the broker said so".

Jobs to be done:
1. Turn a pile of certificates into a structured, reconciled list of exact unit ranges.
2. Know before publishing whether any unit is already claimed elsewhere.
3. Hand the auditor a receipt they can verify independently.
4. When a conflict appears, see exactly which units, which claim, and the next step.

## Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR1 | Submit a claim: claimant name, claim period, claim statement, plus one or more evidence documents (PDF/TXT) or pasted text | P0 |
| FR2 | Extract serial blocks, quantities, project IDs, vintages, beneficiary, and retirement date from evidence. A deterministic parser always runs; an LLM extractor runs if configured | P0 |
| FR3 | Parse serials into `(registry, batch, start, end)`; check stated quantity = range size | P0 |
| FR4 | Reconcile each range against the registry reference (real VROD snapshot): found / partially covered / issued-not-retired / not found; project and vintage match; beneficiary similarity | P0 |
| FR5 | Check overlap against all active claims (off-chain index and on-chain pre-flight) | P0 |
| FR6 | Anchor eligible claims on the ClaimLedger contract. The contract rejects overlapping ranges and duplicate claim refs | P0 |
| FR7 | Integrity report: every finding has a rule ID, severity, evidence, explanation, what remains uncertain, and the next action | P0 |
| FR8 | Unit-strip visualization of the claim's ranges vs the registry block and conflicting claims | P0 |
| FR9 | Public verification: by claim ID (on-chain state) and by document upload (hash match) | P0 |
| FR10 | Challenge workflow: open a challenge (anyone) → reviewer upholds (revoke, units released) or dismisses | P1 |
| FR11 | Aggregate over-claim check per project+vintage, including claims without serials | P1 |
| FR12 | Audit timeline per claim (off-chain events plus chain tx hashes) | P1 |
| FR13 | Export the integrity report as JSON and printable HTML | P1 |
| FR14 | Evaluation page showing the latest `make eval` results (read from the results file, not hard-coded) | P1 |
| FR15 | Overview page: problem, mechanism, live counts from DB and chain | P0 |

## Non-functional

- Runs locally with one setup command plus one run command; works offline after setup (LLM optional).
- No secrets in the repo; the LLM key lives server-side only.
- Every synthetic record is labeled `SYNTHETIC` in data and UI.
- The core check uses no external network: the registry reference is local.

## Differentiators (the three we defend)

1. **Unit-interval non-overlap enforced by a smart contract**, per `(registry, batch)` namespace.
2. **Reconciliation against real registry retirements** (470k rows with serials).
3. **Explainable findings with honest uncertainty**: rule ID → evidence → what's uncertain → next action.

## Explicitly excluded

Tokens or credit tokenization · trading/marketplace · NFT certificates · carbon footprint calculator · chatbot · satellite MRV · credit quality ratings · user accounts and auth (single-tenant demo; noted as a limitation) · mainnet deployment.

## Acceptance criteria

| FR | Acceptance test |
|---|---|
| FR2/3 | Given the sample certificate, the parser returns the exact serial blocks; quantity mismatch yields SER-002 |
| FR4 | A claim citing a real retirement row returns REG-OK with project/vintage. A fabricated serial in an unknown batch returns REG-001. A sub-range returns covered |
| FR5/6 | Claim B overlapping claim A's units → DUP-001 off-chain, and a direct contract call reverts with `RangeOverlap(…, claimA, overlapStart, overlapEnd)` |
| FR6 | Adjacent ranges ([1,100] and [101,200]) both register; the same numbers in different batches both register |
| FR9 | Verify returns on-chain status, block, tx hash, and document hash match/mismatch; a tampered PDF (1 byte changed) → mismatch |
| FR10 | Upheld challenge → status Revoked on chain; the released units can then be claimed by another claim |
| FR11 | Claims for project P vintage V totalling more than retired(P, V) → AGG-001 |
| FR14 | The evaluation page numbers equal `eval/results/latest.json` |
