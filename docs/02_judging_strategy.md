# 02 — Judging Strategy

The official criteria carry no published weights. This document is our internal plan for earning each one.

## Who is judging

Twelve judges. Most of them chair or belong to IEEE Blockchain working groups (Türkiye, Estonia, Orange County, Silicon Valley). One is an Oracle product manager. We should expect:
- Sharp questions on *why blockchain*, the smart-contract design, invariants, gas, privacy, and permissioning.
- Low tolerance for "token + NFT + dashboard" projects.
- Interest in standards alignment (IEEE culture): we cite ICVCM, VCMI, Article 6, and the CAD Trust data model.

## What each criterion needs, and our evidence

| Criterion | The judge's question | Our proof artifact |
|---|---|---|
| Climate Impact | "Does this fix a real failure in carbon markets?" | Double use (the same unit counted in more than one claim) is a named ICVCM/Article 6 failure mode. VCMI now requires public serial disclosure, so it can be checked by machine. Measured on real data: the registry layer is internally clean (0 overlapping retirements across 307k Verra rows). The risk sits at the claim layer, where no shared check exists |
| Innovation | "Isn't this just hashing documents onto a chain?" | No. The contract enforces a **unit-interval non-overlap invariant** per (registry, batch) namespace. Our evaluation shows that hash- or ID-based dedup misses partial-overlap double use, while the interval method catches it |
| Technical Execution | "Does it work?" | Solidity contract with invariant tests; FastAPI checks engine; real Berkeley VROD data; AI extraction validated against a deterministic parser; reproducible `make eval` |
| Practical Usefulness | "Who would use it tomorrow?" | Sustainability teams preparing VCMI/CSRD disclosures; assurance providers; claim registers. Input = the retirement certificate they already have. Output = an auditable receipt |
| Presentation | "Do I understand it in 30 seconds?" | One visual: the **unit strip**, showing two claims covering the same retired units, with the overlap highlighted in red and the chain rejecting the second claim |

## Anti-patterns we avoid

- Claiming we "verify carbon credits" or "detect fraud". We detect **potential double use and inconsistencies** and route them to review.
- Fabricated metrics, logos, or "tonnes saved" counters.
- A token or marketplace with no integrity role.
- An LLM deciding legitimacy. The LLM only extracts. Rules decide. Humans resolve.

## The 30-second hook

> "Since 2025, VCMI's Claims Code asks companies to disclose the serial numbers of the credits behind their claims. Registries already stop a credit from being retired twice. But we found no shared, automatic check of whether two companies cite the same retired units. We built the missing check: a public ledger where every claimed tonne can be claimed exactly once, enforced by a smart contract and checked against 473,894 real registry retirement records."

(Every number in that pitch must be traceable: 307,416 Verra + 166,478 Gold Standard retirement rows, all parsed; see doc 04 and `eval/results/registry_audit.json`.)
