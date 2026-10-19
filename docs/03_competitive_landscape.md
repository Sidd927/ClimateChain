# 03 — Competitive Landscape

Research date: 2026-10-19. Claims about competitors are limited to what the cited sources state. "Limitations" lists only gaps supported by the source or by an explicit statement of scope.

## Carbon market integrity

| Product | Problem solved | Users | Method | AI / Blockchain | Strength | Limitation (evidence-based) | Our differentiation |
|---|---|---|---|---|---|---|---|
| **Registries (Verra, Gold Standard, ACR, CAR)** | Issuance, transfer, and retirement of credits; uniqueness of serials | Developers, buyers | Central registry, serial numbers | Neither (centralized DBs) | Authoritative. Our analysis of 307,416 Verra retirement rows found 0 overlapping retired ranges per batch | Their scope ends at retirement. What a retiree *claims publicly* afterwards, and whether another entity cites the same serials, is outside the registry. Beneficiary fields are free text and blank in ~45% of Verra rows (measured) | We operate **downstream of retirement**, at the claim layer, and reconcile claims back to registry records |
| **CAD Trust** (IETA, World Bank, Singapore) | Harmonize registry metadata; double-counting risk checks; Article 6 visibility | Governments, registries, market | Shared data model (v2.0, Oct 2025) on a Chia-based metadata layer | Blockchain | Institutional backing; common taxonomy; precedent that blockchain adds value to cross-registry integrity | Aggregates **registry-level** data (projects, issuances, retirements). Sources describe no ingestion of corporate claim documents | We are complementary. We add the **claim → units** mapping and enforce non-overlap at claim registration. CAD Trust could be a reference data source |
| **Rating agencies (Sylvera, BeZero, Calyx Global, Renoster)** | Credit *quality* (additionality, permanence, over-crediting) | Buyers, investors | Analyst plus geospatial/ML models | AI (Sylvera, satellite/LiDAR) | Deep project-level risk analysis | Rate projects, not specific claims. Carbon Market Watch (2023) found inconsistent ratings across agencies | Orthogonal. We do not rate quality. We check that the same units are not claimed twice |
| **Toucan / KlimaDAO / Carbonmark** | Tokenize credits for on-chain trading and retirement | Crypto-native buyers | Bridge credits to ERC-20s | Blockchain | Composability, on-chain retirement | Verra banned tokenization of retired credits (May 2022) over "digital ghost" concerns, i.e. double-representation risk | We **do not tokenize** credits or create tradable instruments. We record *claims about already-retired units*, which is consistent with Verra's concern |
| **VCMI Claims Code / claims register** | Rules for credible corporate claims | Companies | Disclosure standard plus third-party assurance | Neither | Requires retirement serial disclosure (v3.0) | A disclosure rule, not an automated cross-claim conflict check (not found in sources) | We turn the VCMI disclosure into a machine-checked, cross-company non-overlap check |
| **Assurance providers / ESG platforms** | CSRD/ESRS assurance | Auditors, corporates | Manual sampling | Some AI | Legal standing | Per-client scope: an auditor sees one company's claims, not competitors' | A shared ledger gives a cross-company view without sharing confidential documents (commitments only) |

## Adjacent tracks (assessed for idea selection)

| Product | Area | Notes |
|---|---|---|
| EnergyTag GC accredited issuers (Granular Energy, Flexidao), I-REC | Granular energy certificates | GCs link to unique IDs/ID ranges of cancelled EACs "to ensure attributes are claimed only once". The double-counting problem in EACs is **already being addressed by accredited issuers** |
| Circulor, Minespider, Circularise, Spherity | Battery/digital product passports | Mature, funded vendors. EU DPP registry live since 19 Jul 2026, battery passport from 18 Feb 2027. Minespider already offers AI PDF extraction. Crowded |
| Pachama, dMRV startups | AI-based MRV | Need geospatial pipelines and ground truth. Hard to validate credibly in 6 days |

## Open-source / research

- Berkeley VROD (CC BY 4.0): our reference dataset.
- CarbonPlan OffsetsDB: updates paused ("issues with data access"); data under separate terms → not used.
- arXiv 2403.03865 "Blockchain and Carbon Markets: Standards Overview": maps ICVCM no-double-counting requirements to blockchain designs.

## Summary of our white space

Registries prevent **double retirement**. CAD Trust targets **double issuance and registry reconciliation**. Raters assess **quality**. Nobody in this scan offers a shared, neutral, automatically enforced check that **the same retired units are not cited by more than one public claim**, which is the "double use" leg of ICVCM's no-double-counting principle.
