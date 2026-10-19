"""Deterministic integrity rules. Each finding states what was checked, what was found,
what remains uncertain, and the next action. Wording is deliberately non-accusatory:
a rule can surface a *potential* inconsistency; it never establishes fraud."""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

from rapidfuzz import fuzz

from .extraction import Extraction, block_source
from .reference import Reference
from .serials import SerialBlock

BLOCKING, REVIEW, INFO, PASS = "blocking", "review", "info", "pass"


@dataclass
class Finding:
    rule_id: str
    severity: str
    title: str
    explanation: str
    uncertainty: str = ""
    next_action: str = ""
    evidence: dict = field(default_factory=dict)
    block_index: int | None = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ActiveRange:
    claim_id: int
    claim_ref: str
    claimant: str
    status: str
    registry: str
    batch_id: str
    unit_start: int
    unit_end: int
    chain_claim_id: int | None = None
    tx_hash: str | None = None


RULES = {
    "EVD-001": "No registry serial numbers disclosed",
    "SER-002": "Stated quantity differs from the serial ranges",
    "REG-000": "Units confirmed as retired in registry snapshot",
    "REG-001": "Serial range not found in registry snapshot",
    "REG-002": "Units issued but not recorded as retired",
    "REG-003": "Range only partially covered by retirement records",
    "REG-004": "Project or vintage differs from registry record",
    "BEN-000": "Claimant matches registry beneficiary",
    "BEN-001": "Claimant differs from registry beneficiary",
    "BEN-002": "Registry records no beneficiary",
    "DUP-001": "Potential double use: units already claimed",
    "DUP-002": "Evidence document reused by another claim",
    "AGG-001": "Claims exceed retired total for project and vintage",
    "EXT-000": "AI extraction unavailable",
    "EXT-001": "AI and parser extraction disagree",
    "EXT-002": "AI reported a serial the parser rejects",
}

_SUFFIX = re.compile(r"\b(ltd|limited|inc|llc|gmbh|ag|sa|plc|co|corp|corporation|company|bv|nv|pte|pvt|private|holding|holdings|group)\b\.?", re.I)


def norm_name(s: str | None) -> str:
    s = (s or "").lower()
    s = re.sub(r"\(synthetic\)", "", s)
    s = _SUFFIX.sub(" ", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def name_similarity(a: str | None, b: str | None) -> int:
    na, nb = norm_name(a), norm_name(b)
    if not na or not nb:
        return 0
    return int(fuzz.token_set_ratio(na, nb))


_PLACEHOLDER_BENEFICIARY = {"not disclosed", "undisclosed", "n a", "na", "none", "unknown", "confidential", "private"}


def real_beneficiary(v: str | None) -> bool:
    """Registry beneficiary fields sometimes hold placeholders such as 'Not Disclosed'."""
    n = re.sub(r"[^a-z]+", " ", (v or "").lower()).strip()
    return bool(n) and n not in _PLACEHOLDER_BENEFICIARY


def fmt(n: int) -> str:
    return f"{n:,}"


def evaluate(
    *,
    claimant: str,
    claim_date: str | None,
    ex: Extraction,
    ref: Reference | None,
    active: list[ActiveRange],
    reused_evidence: list[dict],
    claimed_totals: dict[tuple, int],
) -> list[Finding]:
    F: list[Finding] = []
    blocks = ex.blocks

    # ---- extraction status
    if ex.llm_status in ("error",):
        F.append(Finding("EXT-000", INFO, RULES["EXT-000"], "The AI extractor failed; results below come from the deterministic serial parser only.",
                         next_action="No action needed for canonical serials. Re-run when the AI service is available to catch serials in prose or broken layouts."))
    for i, b in enumerate(blocks):
        if ex.llm_used and block_source(ex, b) == "llm":
            F.append(Finding("EXT-001", REVIEW, RULES["EXT-001"],
                             f"The AI extractor reported serial block {b.serial} that the deterministic parser did not find in the raw text.",
                             uncertainty="The serial may be split by the document layout, or the AI may have misread it.",
                             next_action="Confirm the serial against the original certificate before anchoring.", block_index=i))
    for s in ex.llm_rejected:
        F.append(Finding("EXT-002", INFO, RULES["EXT-002"], f"Ignored AI-reported serial that is not a valid registry format: {s}"))

    # ---- evidence present?
    if not blocks:
        F.append(Finding("EVD-001", BLOCKING, RULES["EVD-001"],
                         "No Verra or Gold Standard serial numbers were found in the evidence. Without serials the exact units behind this claim cannot be identified, so double use cannot be ruled out.",
                         uncertainty="The claim may be valid; it is simply not checkable at unit level.",
                         next_action="Request the retirement serial numbers (VCMI Claims Code v3.0 requires disclosing them) or the registry retirement certificate."))
        for u in ex.unserialized:
            total = ref.retired_total(u.registry, u.project_id, u.vintage) if ref else None
            prior = claimed_totals.get((u.registry, u.project_id, u.vintage), 0)
            ev = {"registry": u.registry, "project_id": u.project_id, "vintage": u.vintage, "asserted": u.quantity, "already_claimed_with_serials": prior, "registry_retired_total": total}
            if total is not None and prior + u.quantity > total:
                F.append(Finding("AGG-001", REVIEW, RULES["AGG-001"],
                                 f"This claim asserts {fmt(u.quantity)} t from {u.registry} project {u.project_id} vintage {u.vintage}. Together with {fmt(prior)} t already claimed on the ledger, that exceeds the {fmt(total)} t recorded as retired for this project and vintage in the registry snapshot.",
                                 uncertainty="Retirements after the snapshot date are not included; some claimed quantities may be from different vintages.",
                                 next_action="Request serial numbers to check which units this claim refers to.", evidence=ev))
            else:
                F.append(Finding("AGG-001", INFO, "Unserialized assertion recorded", f"Asserted {fmt(u.quantity)} t from {u.registry} project {u.project_id} vintage {u.vintage}; registry retired total: {fmt(total) if total is not None else 'unknown'}.", evidence=ev))
        return F

    # ---- quantity consistency
    total_units = sum(b.quantity for b in blocks)
    if ex.stated_quantity is not None and ex.stated_quantity != total_units:
        F.append(Finding("SER-002", REVIEW, RULES["SER-002"],
                         f"The document states a quantity of {fmt(ex.stated_quantity)}, but the disclosed serial ranges contain {fmt(total_units)} units.",
                         uncertainty="The stated figure may include credits without disclosed serials, or one figure contains a typo.",
                         next_action="Reconcile the stated quantity with the serial list.",
                         evidence={"stated": ex.stated_quantity, "from_serials": total_units}))

    # ---- per block: registry reconciliation, beneficiary, double use
    for i, b in enumerate(blocks):
        ev_block = b.to_dict()
        if ref is None:
            F.append(Finding("REG-001", REVIEW, "Registry reference unavailable", "No registry reference index is loaded, so the range could not be reconciled.", block_index=i,
                             next_action="Build the reference index (make data)."))
        else:
            cov = ref.coverage(b.registry, b.batch_id, b.unit_start, b.unit_end)
            recs = [_slim(r) for r in cov.records[:10]]
            if cov.retired_units == b.quantity:
                F.append(Finding("REG-000", PASS, RULES["REG-000"],
                                 f"All {fmt(b.quantity)} units of {b.namespace} [{fmt(b.unit_start)}–{fmt(b.unit_end)}] fall inside {len(cov.records)} retirement record(s) in the {ref.scope} registry snapshot.",
                                 evidence={"block": ev_block, "records": recs}, block_index=i))
            elif cov.retired_units > 0:
                F.append(Finding("REG-003", REVIEW, RULES["REG-003"],
                                 f"Only {fmt(cov.retired_units)} of {fmt(b.quantity)} units are covered by retirement records in the snapshot.",
                                 uncertainty="Remaining units may have been retired after the snapshot date (2026-08-31) or never retired.",
                                 next_action="Check the remaining units on the registry and request the retirement certificate.",
                                 evidence={"block": ev_block, "records": recs, "covered": cov.retired_units}, block_index=i))
            elif cov.issued_units > 0:
                F.append(Finding("REG-002", REVIEW, RULES["REG-002"],
                                 f"The units exist in an issuance batch but no retirement record covers them in the snapshot.",
                                 uncertainty="They may have been retired after 2026-08-31. Units that are not retired cannot support an offset claim.",
                                 next_action="Confirm retirement status on the registry.", evidence={"block": ev_block, "issuances": [_slim(r) for r in cov.issuance_records[:3]]}, block_index=i))
            else:
                known = ref.batch_known(b.registry, b.batch_id)
                why = "the batch exists, but no record covers these unit numbers" if known else "this batch does not appear in the snapshot"
                scope_note = " The loaded reference is a demo subset; run with the full index for complete coverage." if ref.scope != "full" else ""
                F.append(Finding("REG-001", REVIEW, RULES["REG-001"],
                                 f"No registry record matches {b.namespace} [{fmt(b.unit_start)}–{fmt(b.unit_end)}]: {why}.{scope_note}",
                                 uncertainty="Possible causes: a transcription error in the serial, a retirement after the snapshot date, or a serial that was never issued.",
                                 next_action="Look up the serial on the registry website and correct it if mistyped.", evidence={"block": ev_block}, block_index=i))
            # project / vintage consistency with registry
            for r in cov.records[:1]:
                if (r.get("project_id") and b.project_id and r["project_id"] != b.project_id) or (r.get("vintage") and b.vintage and str(r["vintage"]) != str(b.vintage)):
                    F.append(Finding("REG-004", REVIEW, RULES["REG-004"],
                                     f"The serial encodes project {b.project_id} / vintage {b.vintage}, but the registry record lists project {r.get('project_id')} / vintage {r.get('vintage')}.",
                                     next_action="Verify the serial against the registry.", evidence={"block": ev_block, "record": _slim(r)}, block_index=i))
            # beneficiary
            bens = sorted({r["beneficiary"] for r in cov.records if real_beneficiary(r.get("beneficiary"))})
            if cov.records and not bens:
                F.append(Finding("BEN-002", INFO, RULES["BEN-002"],
                                 "The registry retirement record has no beneficiary, so the registry cannot confirm who is entitled to claim these units. This is common: 44.7% of Verra retirement rows in Berkeley VROD 2026-08 record no beneficial owner.",
                                 uncertainty="Entitlement must come from the retiring account holder's allocation records.",
                                 next_action="Keep the broker's allocation confirmation with the claim evidence.", block_index=i))
            elif bens:
                best = max(bens, key=lambda x: name_similarity(claimant, x))
                score = name_similarity(claimant, best)
                if score >= 85:
                    F.append(Finding("BEN-000", PASS, RULES["BEN-000"], f"Claimant matches the registry beneficiary “{best}” (similarity {score}/100).", block_index=i))
                else:
                    F.append(Finding("BEN-001", REVIEW, RULES["BEN-001"],
                                     f"The registry records the beneficiary as “{best}”, which does not match the claimant (similarity {score}/100).",
                                     uncertainty="The beneficiary may be an intermediary retiring on the claimant's behalf, a parent company, or a different entity.",
                                     next_action="Request documentation linking the claimant to the recorded beneficiary.",
                                     evidence={"registry_beneficiaries": bens[:5], "similarity": score}, block_index=i))

        # double use against the ledger
        clashes = [a for a in active if a.registry == b.registry and a.batch_id == b.batch_id and a.unit_start <= b.unit_end and b.unit_start <= a.unit_end]
        for a in clashes:
            lo, hi = max(a.unit_start, b.unit_start), min(a.unit_end, b.unit_end)
            F.append(Finding("DUP-001", BLOCKING, RULES["DUP-001"],
                             f"Units {fmt(lo)}–{fmt(hi)} ({fmt(hi - lo + 1)} units) of {b.namespace} are already backing claim {a.claim_ref} by {a.claimant} ({a.status}). A retired unit can support only one claim.",
                             uncertainty="This check cannot tell which claim is correct. Possible causes: a broker allocated the same units to two customers; a transcription error; a split retirement recorded with wrong ranges.",
                             next_action=f"Request the retiring account holder's allocation record. If {a.claim_ref} is wrong, open a challenge against it; otherwise correct this claim's serials.",
                             evidence={"block": ev_block, "conflict": {"claim_id": a.claim_id, "claim_ref": a.claim_ref, "claimant": a.claimant, "status": a.status,
                                                                          "unit_start": a.unit_start, "unit_end": a.unit_end, "chain_claim_id": a.chain_claim_id, "tx_hash": a.tx_hash},
                                       "overlap": {"start": lo, "end": hi, "units": hi - lo + 1}}, block_index=i))

    for r in reused_evidence:
        F.append(Finding("DUP-002", REVIEW, RULES["DUP-002"],
                         f"The document {r['filename']} (SHA-256 {r['sha256'][:12]}…) is also attached to claim {r['claim_ref']} by {r['claimant']}.",
                         uncertainty="Reusing a certificate is legitimate for the same claimant across reporting documents, but not for two different claims on the same units.",
                         next_action="Confirm the two claims do not count the same units.", evidence=r))
    return F


def _slim(r: dict) -> dict:
    keys = ("serial", "unit_start", "unit_end", "quantity", "project_id", "project_name", "vintage", "country", "event_date", "beneficiary", "reason", "source_sheet", "source_row")
    return {k: r.get(k) for k in keys}


def verdict(findings: list[Finding]) -> str:
    sev = {f.severity for f in findings}
    if BLOCKING in sev:
        return "blocked"
    if REVIEW in sev:
        return "review"
    return "clear"
