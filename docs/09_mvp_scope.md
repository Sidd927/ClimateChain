# 09 — MVP Scope

## In the MVP (must work end to end)

| Feature | Journey |
|---|---|
| Serial parser for Verra (current and legacy) and Gold Standard (current and legacy) | J1, J2 |
| Evidence ingestion: PDF/TXT upload or paste; SHA-256 fingerprints | J1, J3 |
| Deterministic extraction, plus optional LLM extraction with schema validation and cross-check | J1 |
| Registry reconciliation against VROD reference (demo subset committed; full index buildable) | J1 |
| Rules engine: SER, REG, BEN, TIM, DUP, AGG, EVD, EXT findings | J1, J2, J5 |
| ClaimLedger contract (Solidity) + tests; local Hardhat chain | J1–J4 |
| Anchoring, forced-anchor revert demo, verify, challenge/resolve | J2–J4 |
| Frontend: Overview, Claims, New claim wizard, Claim detail with unit strip, Verify, Evaluation | all |
| Deterministic seed + reset; demo certificates (PDF) | demo |
| Evaluation: real-data parser audit; labeled synthetic double-use set vs baseline; extraction accuracy | proof |

## Stretch (only after the MVP is verified end to end)

1. Public testnet deployment (needs a funded test wallet from the account owner).
2. Merkle-root batching of claim commitments (gas efficiency at scale).
3. Signed claim submissions (EIP-712) so the claimant, not the platform, authorizes registration.
4. Hosted demo (frontend static build + backend on a free tier).

## Out of scope

Tokenization, trading, NFTs, footprint calculators, chatbots, auth/multi-tenancy, mainnet, real company claims.

## Demo scenario (credible end to end)

Real Verra retirement block (VROD, CC BY 4.0) → broker "Meridian Offsets (SYNTHETIC)" splits it between two fictional customers → certificate PDFs generated deterministically and labeled SYNTHETIC → Northwind registers cleanly → Helios's certificate overlaps → off-chain detection plus an on-chain revert → auditor verification → challenge → revoke → the correct claimant re-registers.
