"""Print a canonical fingerprint of the running demo state (for reset/seed repeatability checks).

Includes what must be identical after every `make reset` + API restart + `make seed`:
claim refs, claimants, statuses, verdicts, unit counts, finding rule IDs, evidence SHA-256,
on-chain claim numbers and recorded contract rejections. Excludes block numbers, tx hashes,
salts and timestamps, which legitimately differ between runs.
"""
from __future__ import annotations

import hashlib
import json

import httpx

API = "http://127.0.0.1:8000"


def main() -> None:
    c = httpx.Client(timeout=30)
    out = []
    for s in sorted(c.get(f"{API}/api/claims").json(), key=lambda x: x["id"]):
        d = c.get(f"{API}/api/claims/{s['id']}").json()
        out.append({
            "ref": d["ref"], "claimant": d["claimant"], "status": d["status"], "verdict": d["verdict"],
            "units": d["total_units"], "chain_claim_id": d["chain_claim_id"],
            "findings": sorted(f["rule_id"] for f in d["findings"]),
            "evidence_sha256": sorted(e["sha256"] for e in d["evidence"]),
            "chain_events": [e["kind"] for e in d["events"] if e["tx_hash"]],
            "rejections": [e["detail"]["revert"]["error"] for e in d["events"] if e["kind"] == "chain_rejected"],
        })
    blob = json.dumps(out, sort_keys=True, separators=(",", ":"))
    for o in out:
        print(f"{o['ref']}  {o['claimant']:<30} {o['status']:<9} units={o['units']:<6} chain#={o['chain_claim_id']}  {','.join(o['findings'])}  rejections={o['rejections']}")
    print("fingerprint", hashlib.sha256(blob.encode()).hexdigest())


if __name__ == "__main__":
    main()
