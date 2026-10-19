# 13 — Security and Privacy

## Separation of concerns (what each check establishes)

| Property | Mechanism | Establishes | Does not establish |
|---|---|---|---|
| Document authenticity | SHA-256 commitment on chain | The document is unchanged since registration | That the document is genuine or issued by the registry |
| Data provenance | Registry reconciliation against VROD (source row cited) | The cited units appear as retired in a public registry snapshot | Events after 2026-08-31; private allocation agreements |
| Claim consistency | Interval non-overlap, aggregate checks | No two registered claims cite the same units | That unregistered claims elsewhere don't exist |
| Environmental integrity | **Not addressed** | — | Additionality, permanence, over-crediting (rating agencies' domain) |

## On-chain data minimization

- **Never on chain:** documents, claimant names, statements, extracted text.
- **On chain:** namespace hash, unit ranges (already public on registries), a salted keccak commitment of the claimant name, the document hash, the report hash.
- The claimant commitment salt is stored off-chain and shared with the verifier by the claimant, enabling selective disclosure.

## Application security

- `.env` is gitignored; `.env.example` holds placeholders only. The LLM key is read server-side only, never sent to the browser.
- The Hardhat private key in `.env.example` is the **publicly known Hardhat test account #0**. It is valid only on the local dev chain. A testnet key must never be committed.
- Uploads: size limit (10 MB), extension and MIME allowlist (pdf, txt), content-addressed storage outside any static route, filenames never used as paths.
- No endpoint serves raw evidence files (the hash-only verify flow works with a re-upload).
- CORS limited to the local frontend origin in dev.
- Pydantic validation on all inputs; SQL via parameterized queries only.
- Contract: custom errors, role checks, no external calls, no ETH handling (no reentrancy surface), Solidity ≥0.8 checked arithmetic.

## Known gaps (prototype)

No authentication or multi-tenancy · single registrar key held by the backend · no rate limiting · no OCR · no malware scanning of uploads.
