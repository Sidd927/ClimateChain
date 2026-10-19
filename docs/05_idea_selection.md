# 05 — Idea Selection

## Candidates

| ID | Concept | Track |
|---|---|---|
| A | **Carbon credit evidence integrity**: hash project MRV documents (PDDs, monitoring reports), AI-extract key facts, flag inconsistencies across a project's document set | Carbon |
| B | **Claim-layer double-use detection** ("OnceOnly"): every public offset claim is reduced to the exact registry unit ranges it cites. A smart contract guarantees no unit range is claimed twice. Claims are reconciled against real registry retirements | Carbon |
| C | **Renewable energy attribute reconciliation**: detect EACs (RECs/GOs/I-RECs) claimed against overlapping production or by multiple consumers | Energy |
| D | **Supply-chain carbon claim forensics / evidence-based DPP**: product carbon-footprint claims linked to supplier evidence, with consistency checks | Supply chain |
| E | **Tamper-evident climate observations**: signed sensor/station readings, Merkle-batched and anchored on chain, with AI anomaly detection | Climate data |
| F | *Novel*: **EU EmpCo claim-compliance scanner**: AI scans product marketing for offset-based "carbon neutral" claims banned in the EU since 27 Sep 2026; anchors evidence of remediation | Carbon / supply chain |

## Weighted decision matrix (internal weights, not official)

Weights: Alignment 15% · Impact 15% · Originality 20% · Feasibility 15% · Demo 15% · Usefulness 10% · Data credibility 5% · AI/BC justification 5%

| | Align | Impact | Orig. | Feas. | Demo | Useful | Data | AI/BC | **Total** |
|---|---|---|---|---|---|---|---|---|---|
| A | 9 | 7 | 4 | 7 | 6 | 6 | 4 | 6 | **6.25** |
| **B** | **10** | **8** | **8** | **8** | **9** | **8** | **9** | **9** | **8.55** |
| C | 8 | 7 | 5 | 6 | 6 | 6 | 5 | 7 | **6.25** |
| D | 8 | 6 | 5 | 5 | 7 | 6 | 3 | 5 | **5.90** |
| E | 8 | 5 | 4 | 8 | 6 | 5 | 6 | 7 | **6.00** |
| F | 6 | 6 | 7 | 8 | 7 | 7 | 5 | 3 | **6.55** |

### Evidence behind key scores

- **B alignment 10**: the official build list literally includes "Smart contracts to prevent double counting".
- **B data 9**: 307,416 real Verra and 166,478 Gold Standard retirement rows with serials (CC BY 4.0). We measured 100% parse rate and quantity consistency on Verra. The claims themselves are synthetic (−1).
- **B originality 8**: CAD Trust covers registry-level data; registries cover double retirement; no source in our scan offers cross-claim unit-overlap enforcement. Not 10, because "blockchain against double counting" is a common pitch. Our differentiator is the *unit-interval invariant plus registry reconciliation*.
- **B AI/BC 9**: blockchain provides a neutral, append-only, first-come ordering among mutually distrustful companies, auditors, and registries, which no single party should operate (see 06 §7). AI extracts serials from heterogeneous certificates and reports, validated by a deterministic parser.
- **A originality 4**: AI-plus-hash document integrity is the most common hackathon pattern, and raters (Sylvera etc.) already analyze project documents.
- **C originality 5 / feasibility 6**: EnergyTag-accredited issuers already link GC IDs to EAC ID ranges "to ensure attributes are claimed only once". Real hourly data is harder to obtain and demo.
- **D data 3**: no public supplier-level evidence; everything would be synthetic. Mature vendors (Circulor, Minespider with AI extraction).
- **E impact 5**: tamper evidence does not make readings correct (sensor-level trust problem). A very common pattern.
- **F AI/BC 3**: mostly an NLP problem; blockchain would be decorative.

## Top three: critique

### B — OnceOnly (claim-layer double use)
- **For**: a precise, named failure mode (ICVCM "double use"). VCMI v3.0 now makes serials public, so automation is newly possible. Real registry data. One unforgettable visual: two claims covering the same units, with the second rejected by the chain.
- **Against**: "How common is double claiming in practice?" We found **no documented case** of the same retirement cited by two companies. Impact is therefore argued as *risk closure plus assurance cost*, not as measured fraud. Also, adoption needs a critical mass of claims registered.
- **Closest alternatives**: CAD Trust (registry metadata), VCMI claims register (disclosure), registries (double retirement), auditors (per-client).
- **Technical risks**: serial format diversity across registries (mitigated: real-data parser audit); namespace semantics (measured: Verra unit numbers restart per batch → namespace = registry + batch); on-chain privacy (only salted commitments).
- **Data**: real VROD registry retirements plus synthetic, clearly labeled claims.
- **Demo**: upload certificate → extract → reconcile with the real registry row → anchor → second, overlapping claim → contract rejects with exact overlap → challenge workflow → public verify.
- **Memorable**: "Every tonne, claimed once." The unit strip visual.
- **Rejection risk**: if presented as "fraud detection" or if blockchain looks bolted on. Mitigation: precise vocabulary; show what the contract enforces that a hash cannot.

### F — EmpCo claim-compliance scanner
- **For**: very timely (rules apply since 27 Sep 2026); clear user (EU marketing/legal teams).
- **Against**: legal interpretation risk; blockchain role weak; judges are blockchain-centric.
- **Alternatives**: legal-tech and greenwashing NLP tools.
- **Demo**: decent (scan a page → flag claim) but generic AI.
- **Rejection risk**: "Where is the blockchain?"

### A — Evidence integrity for project documents
- **For**: aligned; easy to build.
- **Against**: undifferentiated; AI "verifying" MRV documents risks overclaiming; hashing proves document integrity, not truth.
- **Alternatives**: rating agencies, dMRV vendors, many hackathon projects.
- **Rejection risk**: "We've seen this ten times."

## Decision

**We build B: OnceOnly.** It wins on every criterion except feasibility, where it ties for second behind E and F. It is the only candidate where (1) the official track explicitly asks for it, (2) real public data supports the core check, and (3) the smart contract enforces something a hash or database lookup alone cannot enforce credibly across distrustful parties.

Elements borrowed from other candidates, only where they reinforce B:
- From A: evidence-document fingerprinting (SHA-256) bound to the claim.
- From F: none in the MVP. EmpCo context is used in the *pitch* (why claims need substantiation now) and in the roadmap.
