# 06 — Product Thesis: OnceOnly

**OnceOnly — Every retired tonne, claimed once.**

## 1. Who experiences the problem?

- **Primary user: the claim reviewer.** A sustainability-reporting or assurance analyst who must substantiate a company's offset-based claim (VCMI Carbon Integrity claim, CSRD/ESRS E1 disclosure, contribution claim) and answer the auditor's question: *"How do you know these credits haven't been claimed by someone else?"*
- Secondary: claim registers and standard bodies (e.g., a VCMI-style register), credit brokers and retail offset platforms that split retirements across many customers, and the public and NGOs who scrutinize claims.

## 2. What failure, risk, or cost do they face?

A retirement is one registry event. The *claims* built on it live in PDFs, sustainability reports, websites, and product labels. The same retired units can be:
1. **Cited by two different companies** (e.g., a broker retires a block "on behalf of customers" and two customers both cite the full block). This is **double use**.
2. **Cited twice by the same company** in two reporting years or for two products.
3. **Over-claimed**: claims citing a project and vintage add up to more tonnes than were ever retired.
4. **Mis-cited**: serials that don't exist in the registry, quantities that don't match the range, or a claimant who isn't the recorded beneficiary.

Today a reviewer checks the registry for *their* company's serials, but **cannot see other companies' claims**. The check is manual, per-client, and unrepeatable.

## 3. Why it matters for climate action

ICVCM's Core Carbon Principles and Article 6 accounting treat **no double counting** (double issuance, double use, double claiming) as a core integrity condition. Every tonne counted twice is a tonne of emissions that was never compensated, and each scandal erodes trust in a market that finances mitigation. With the EU's EmpCo rules (since 27 Sep 2026) and CSRD assurance raising the stakes for unsubstantiated claims, claim-level integrity is becoming a compliance requirement.

## 4. Why existing approaches are insufficient

- Registries guarantee a unit is retired once. **Measured: 0 overlapping retired ranges per batch across 307,416 Verra rows.** But their scope ends at retirement.
- Beneficiary fields are optional free text (**measured: 44.7% of Verra retirement rows have no Beneficial Owner**), so the registry often cannot say *who* may claim the units.
- CAD Trust harmonizes registry data; it does not ingest corporate claims (per its documentation).
- Auditors see one client at a time.

## 5. Our unique insight

**A claim is an interval.** Every Verra and Gold Standard serial encodes a contiguous range of unit numbers inside an issuance batch. Reducing each public claim to `(registry, batch, [start, end])` turns "has anyone else claimed this?" into an exact, machine-checkable **interval-overlap** question. Document hashes and record IDs can't answer it: two claims citing *different but overlapping* ranges have different hashes and different serial strings. We measured that unit numbers restart across Verra batches (11,631 false overlaps if the batch is ignored), so the namespace *must* be `(registry, batch)`.

## 6. What OnceOnly does that alternatives don't demonstrate

1. Extracts cited serial ranges from heterogeneous retirement certificates and claim text (AI plus deterministic parser, cross-validated).
2. Reconciles each range against **real registry retirement records** (Berkeley VROD): exists? retired? quantity, project, and vintage match? beneficiary consistent?
3. Registers the claim in a smart contract that **rejects any overlapping unit range** and reports the exact conflicting claim and overlap.
4. Records a challenge/review lifecycle for conflicts a range check can't settle (no serials disclosed; aggregate over-claiming).
5. Lets anyone **verify** a claim receipt and document fingerprint without seeing confidential documents.

## 7. Why AI and blockchain each have a justified role

**Blockchain (essential, not decorative):** the claim ledger must be shared by parties that compete or audit each other: companies, brokers, auditors, registries, and NGOs across jurisdictions. A central database could run the same overlap check, but its operator could reorder, edit, or delete claims, and every party would have to trust it. A smart contract gives (a) a single neutral **first-come ordering** of claims, (b) an **invariant enforced by code** that no one can bypass (no overlapping unit ranges), (c) **append-only history** of challenges and resolutions, and (d) **permissionless verification**. This is the same reasoning CAD Trust used for a public ledger at the registry layer. Honest limit: if a single trusted body (e.g., one standard-setter) ran the only claims register, a database with signed logs would cover much of this. Blockchain earns its place when claims come from many registers and platforms.

**AI (bounded):** certificates and reports come in many layouts (tables, line breaks inside serials, prose such as "units 1,001–2,000 of batch …"). An LLM turns them into a strict JSON schema. A deterministic parser independently re-parses every serial, and conflicts are surfaced, never auto-resolved. The AI never decides legitimacy.

## 8. What we can prove before the deadline

- Contract invariant: no two active claims overlap within a namespace (unit tests plus a randomized fuzz test).
- Real-data parser coverage and quantity consistency on 307k Verra and 166k Gold Standard rows.
- On a labeled synthetic claim set: interval method vs a hash/ID baseline. Precision and recall for double-use detection, with sample sizes.
- End-to-end workflow on a local EVM chain, with real transactions and receipts. A public testnet only if a funded test wallet is provided.

## 9. What success looks like

- **Demo**: a judge sees a second company's claim rejected *by the contract*, with the overlapping units highlighted, and then verifies the first claim independently.
- **Evaluation**: the baseline misses partial-overlap double use; OnceOnly catches it with no false positives on adversarial near-misses (adjacent ranges, the same numbers in different batches).
- **Adoption story**: input = the retirement certificate a company already has; output = a verifiable receipt for its auditor.

## 10. What we must NOT claim

- That OnceOnly verifies carbon credits, their quality, additionality, or permanence.
- That a flagged conflict is fraud. It is a **potential double use requiring review**.
- That any real company has double-claimed. **All claims and claimants in the demo are synthetic** and use fictional names.
- That local-chain transactions are on a public blockchain.
- That a document hash proves the document is true.
- Any measured climate impact (tonnes saved). We claim risk closure only.
- That registry data is current beyond the VROD 2026-08 snapshot (data through 2026-08-31).
