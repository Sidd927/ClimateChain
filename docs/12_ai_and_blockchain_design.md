# 12 — AI and Blockchain Design

## Double-counting vocabulary (we never conflate these)

| Term | Meaning | Does OnceOnly detect it? |
|---|---|---|
| Duplicate document | Same bytes submitted twice | Yes: SHA-256 match (DUP-002) |
| Duplicate record | Same claim reference registered twice | Yes: contract `ClaimRefExists` |
| Reused evidence | One certificate supporting two claims | Yes: same document hash on different claims (DUP-002) |
| **Double use** (overlapping claims on the same units) | Two claims cite intersecting unit ranges in the same registry batch | **Yes: core invariant** (DUP-001 + contract `RangeOverlap`) |
| Over-claiming (aggregate) | Claims on project/vintage exceed retired quantity | Yes, as review (AGG-001) |
| Registry-level double retirement | The registry retired the same unit twice | Audited on VROD: 0 cases found (doc 04) |
| Double issuance | Same reduction issued in two programs | **No** (needs project-level matching; roadmap) |
| Double claiming (host country NDC + buyer) | Corresponding adjustment missing | **No** (needs Article 6 data; roadmap) |

## AI feature: evidence extraction

| Aspect | Design |
|---|---|
| Task | Read retirement certificate or claim text; output JSON: claimant, beneficiary, retirement_date, blocks[{serial, quantity, project_id, vintage}] |
| Why rules alone fall short | Layouts vary: serials split across lines or columns, ranges written in prose ("units 1,001 to 2,000 of batch 18453"), quantities formatted as "12.000" or "12,000 tCO2e". Regexes catch canonical serials; prose and broken layouts need language understanding |
| Model | Configurable via `ONCEONLY_LLM_MODEL`; default `claude-haiku-4-5` (low latency and cost). Structured JSON output, pydantic-validated |
| Validation | Each AI serial is re-parsed by the deterministic parser; quantity = range size is checked; AI blocks that fail parsing are dropped with EXT-002 |
| Uncertainty | Block source tag: `both` (agree), `parser-only`, `llm-only` (review). Disagreement → EXT-001 |
| Errors | Timeout, no key, or invalid JSON → parser-only with an EXT-000 info finding |
| Never | The LLM does not judge legitimacy, quality, or fraud. Rules decide; humans resolve |
| Evaluation | Labeled synthetic certificate set (canonical, broken-line, prose formats). Field-level exact-match accuracy for parser-only vs parser+LLM (`make eval`) |
| Cost/latency | One call per document, roughly 1–3k input tokens; latency ~1–3 s; skipped when parser and layout are canonical (optional optimization) |

## Blockchain feature: ClaimLedger

**Invariant I1.** For any namespace `ns`, the unit ranges of all claims with status Active or Challenged are pairwise disjoint.
**Invariant I2.** A claim `ref` can be registered at most once.
**Invariant I3.** Status transitions: Active→Challenged→(Active|Revoked); Active→Withdrawn. Revoked and Withdrawn release their ranges.

| Function | Who | Effect |
|---|---|---|
| `registerClaim(ref, Range[] ranges, claimantCommitment, evidenceHash, reportHash)` | registrar role | Validates start ≤ end and that ranges in the same call don't overlap each other; checks every range against active claims in `ns`; reverts `RangeOverlap(ns, existingClaimId, overlapStart, overlapEnd)` on the first conflict |
| `checkRange(ns, start, end)` | anyone (view) | Pre-flight: (free, conflictingClaimId, overlapStart, overlapEnd) |
| `openChallenge(claimId, reasonHash)` | anyone | Active → Challenged (units stay locked) |
| `resolveChallenge(claimId, upheld, resolutionHash)` | reviewer role | upheld → Revoked (units released); else → Active |
| `withdrawClaim(claimId)` | the original registrar | Active → Withdrawn (units released) |
| `getClaim`, `getRanges`, `claimCount` | anyone (view) | Verification |

**Why roles?** Registration is permissioned for registrars (claim platforms, auditors, registries) to limit spam and Sybil claims that squat on units. Challenges are permissionless, so anyone can contest a claim. A production version would use EIP-712 signatures from claimants and a multi-party reviewer set; see roadmap.

**Squatting risk.** Someone could register a claim on units that aren't theirs to block the rightful owner. Mitigations: permissioned registrars, registry reconciliation before anchoring (the backend refuses REG-001), and the challenge/revoke path, which releases the units.

**Gas.** The overlap check is O(k) over ranges in the same `(registry, batch)` namespace. Batches are typically split into a modest number of retirements (measured distribution in doc 14). A production version would use a sorted structure or Merkle batching.

**Chain choice.** A local Hardhat network (chainId 31337) for the reproducible demo. The contract is EVM-generic; the deploy script supports any RPC (e.g., Sepolia) given a funded test key. We do not present local transactions as public-chain proof.

**What a hash does NOT prove.** A document's SHA-256 proves it is byte-identical to the one committed at registration. It does not prove that the certificate is genuine, that the units were retired, or that the claim is true. Registry reconciliation covers part of that; the rest needs registry APIs and human review.
