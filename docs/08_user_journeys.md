# 08 — User Journeys

## J1 — Register a clean claim (happy path)

1. Priya opens **New claim** and enters claimant "Northwind Foods (SYNTHETIC)", period FY2025, and statement "Contribution claim: 12,000 tCO2e retired".
2. She uploads `northwind_vcu_certificate.pdf`. OnceOnly shows the SHA-256 fingerprint immediately.
3. **Extraction**: two serial blocks found. The parser and the AI agree (badge: "2/2 blocks confirmed by deterministic parser").
4. **Checks** run in under 1 s: each block is matched to a real Verra retirement record (project, vintage, retirement date shown, with a link to the source row). Beneficiary: recorded as "—" (not recorded) → BEN-002 info.
5. **Overlap**: no active claim touches these units.
6. Priya clicks **Anchor on ledger** → a contract transaction is mined → receipt with tx hash, block, and gas.
7. She exports the integrity report and sends the claim ID to her auditor.

## J2 — Double use blocked (the demo moment)

1. A second company, "Helios Apparel (SYNTHETIC)", submits a certificate from the same broker citing a block that **partially overlaps** Northwind's units.
2. Checks: DUP-001 **Potential double use**: units 896,315,001–896,320,000 (5,000 units) are already claimed by claim #1 (Northwind, anchored at block N).
3. The unit strip shows the registry retirement block (grey), Northwind (green), Helios (outline), and the overlap (red hatch).
4. Explanation: "A retired unit can support only one claim. Possible causes: the broker allocated the same units to two customers; a transcription error; a legitimately split retirement with incorrect ranges. This check cannot determine which claim is correct."
5. Next action: "Request the broker's allocation record; if Northwind's claim is wrong, open a challenge."
6. To prove the contract enforces this, not just the UI, Priya clicks **Attempt anchor anyway** → the transaction **reverts** with `RangeOverlap(namespace, 1, 896315001, 896320000)`, decoded and shown.

## J3 — Auditor verifies independently

1. The auditor opens **Verify**, enters the claim ID, and sees on-chain status, the registering block, the evidence hash, and the claimant commitment.
2. The auditor drops in the PDF they received → recomputed hash matches ✔.
3. They try a modified PDF → mismatch ✖ ("the document differs from the one committed at registration").

## J4 — Challenge and resolution

1. An NGO analyst (anyone) opens a challenge on a claim, with a reason ("broker allocation shows units went to another customer").
2. The claim status becomes **Challenged** on chain.
3. A reviewer upholds the challenge → **Revoked**; the units are released. Or dismisses it → **Active**.
4. Every step appears in the audit timeline with tx hashes.

## J5 — Claim without serials (honest uncertainty)

1. A claim states "8,000 tCO2e from VCS project 1904, vintage 2024" with no serials.
2. EVD-001: insufficient evidence; the units cannot be checked for double use.
3. AGG-001 (if applicable): the project/vintage total claimed exceeds the total retired.
4. The claim **cannot be anchored** as unit-specific; OnceOnly recommends requesting serials (VCMI v3.0 requires them).
