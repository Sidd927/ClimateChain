# 04 — Research Sources

| # | Source | Date | Why it matters |
|---|---|---|---|
| S1 | IEEE ClimateChain overview — https://ieee-climatechain-hack.devpost.com/ | read 2026-10-19 | Tracks, criteria, deliverables, deadline |
| S2 | Rules — https://ieee-climatechain-hack.devpost.com/rules | read 2026-10-19 | Eligibility, team size, requirements |
| S3 | Updates — https://ieee-climatechain-hack.devpost.com/updates | 2026-08..10 | Submissions opened 5 Oct; session recordings |
| S4 | Discussions — https://ieee-climatechain-hack.devpost.com/forum_topics | 2026-09..10 | Unofficial reports: file upload, no track selector, timing |
| S5 | Berkeley Carbon Trading Project, VROD v2026-08 — https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database | 2026-08 | **Primary dataset.** CC BY 4.0. Registry files include serials, quantities, beneficiaries. Citation: Quartson, Haya, Bernard, Abayo, Rong, So, Elias (2026), VROD v2026-08, UC Berkeley |
| S6 | CAD Trust "How it works" — https://climateactiondata.org/how-it-works/ | ongoing | Closest institutional analogue; Chia-based metadata layer |
| S7 | CAD Trust Data Model v2.0 — https://climateactiondata.org/cad-trust-launches-data-model-version-2-0/ | 2025-10 | Aligns with Article 6 AEF; double-counting taskforce |
| S8 | CAD Trust on double counting — https://climateactiondata.org/how-blockchain-technology-addresses-the-double-counting-of-carbon-emissions/ | n/d | Why a public ledger helps with double counting |
| S9 | VCMI Claims Code of Practice v3.0 — https://vcmintegrity.org/wp-content/uploads/2025/04/VCMI-Claims-Code-of-Practice-April-2025-Version-3.0.pdf | 2025-04 | Requires disclosure of the retirement serial number per credit used. A later v3.1 (Aug 2025) is reported; we have not checked it |
| S10 | VCMI MRA Framework — https://vcmintegrity.org/wp-content/uploads/2025/04/VCMI-MRA-Framework_2025_v.1.2_April2025-1.pdf | 2025-04 | Claim assurance process |
| S11 | Article 6 / double-counting taxonomy — https://en.wikipedia.org/wiki/Cooperative_mechanisms_under_Article_6_of_the_Paris_Agreement | n/d | Definitions: double issuance, double claiming, double use |
| S12 | Climate Focus, "Double Claiming and Corresponding Adjustments" — https://climatefocus.com/wp-content/uploads/2023/11/Double-Claiming-and-Corresponding-Adjustments.pdf | 2023-11 | Corresponding adjustments; VCM standards' positions |
| S13 | arXiv 2403.03865, "Blockchain and Carbon Markets: Standards Overview" — https://arxiv.org/pdf/2403.03865 | 2024 | ICVCM CCP no-double-counting; blockchain standards mapping |
| S14 | REDD-Monitor: Verra prohibits tokenisation of retired offsets — https://redd-monitor.org/2022/05/29/verra-prohibits-tokenisation-of-retired-offsets-toucan-welcomes-the-news/ | 2022-05 | Why we must not tokenize retired credits |
| S15 | Verra Registration & Issuance Process v4.3 — https://verra.org/wp-content/uploads/2022/12/VCS-Registration-and-Issuance-Process-v4.3-FINAL-1.pdf | 2023-01 | Registry issues serials, tracks retirement; statuses active/retired/cancelled |
| S16 | Example public VCU retirement certificate (format reference) — https://www.apcoa.com/wp-content/uploads/2025/07/APCOA-Group_Certificates_2024.pdf | 2025 | Real certificate layout with serial ranges; used **only** as a format reference |
| S17 | Directive (EU) 2024/825 explainer — https://www.hhc.earth/knowledge-base/articles/can-you-still-say-carbon-neutral | 2026 | Offset-based product neutrality claims banned from 27 Sep 2026. Secondary source; the primary is EUR-Lex |
| S18 | Holland & Knight, "Double Jeopardy for Double Counting?" — https://www.hklaw.com/en/insights/publications/2023/08/double-jeopardy-for-double-counting-cftc-and-ftc-both-scrutinize-fraud | 2023-08 | CFTC/FTC scrutiny of double counting |
| S19 | Carbon Market Watch, rating agencies report — https://carbonmarketwatch.org/wp-content/uploads/2023/09/PCG_CMW_rating_agencies_final_report_.pdf | 2023-09 | Raters differ on double counting; inconsistent ratings |
| S20 | EnergyTag GC Scheme Standard v2 — https://energytag.org/wp-content/uploads/2024/12/EnergyTag_Granular-Certificate-Scheme-Standard-V2.pdf | 2024-12 | EAC double counting addressed by GC issuers (idea C) |
| S21 | Granular Energy GC protocol — https://energytag.org/wp-content/uploads/2025/10/Granular-Energy_GC-Scheme-Protocol.pdf | 2025-10 | GC IDs linked to EAC ID ranges |
| S22 | Minespider, EU battery passport timeline — https://www.minespider.com/blog/eu-battery-regulation-timeline-explained-what-to-do-before-2027 | 2026 | DPP landscape (idea D) |
| S23 | CarbonPlan OffsetsDB — https://carbonplan.org/research/offsets-db | 2026 | Updates paused; separate data terms → not used |

## Measured facts we derived (reproducible: `make data`)

| Fact | Value | Script |
|---|---|---|
| Verra retirement rows in VROD 2026-08 registry files | 307,416 | `backend/scripts/build_reference.py` → `eval/results/registry_audit.json` |
| Verra serials parsed by our parser | 307,416 (100%) | same |
| Verra rows where end − start + 1 = quantity | 307,416 (100%) | same |
| Overlapping retired ranges within the same Verra batch | 0 | same |
| Overlaps if unit numbers are (wrongly) treated as globally unique | 11,629 → namespace must include the batch | same |
| Verra rows with a Beneficial Owner recorded | 170,010 (55.3%); 44.7% have none | same |
| Verra issuance rows parsed / quantity-consistent | 19,624 / 19,624 (100%) | same |
| Gold Standard retirement rows parsed / quantity-consistent | 166,478 / 166,478 (100%) | same |
| Gold Standard overlapping retirement pairs within a batch | 5 (inspected: mostly exact duplicate rows, one partial overlap with different dates). Reported as data inconsistencies, **not** as double retirement | same |
| Retirements per Verra batch | median 2, p99 210, max 37,284 | same |
