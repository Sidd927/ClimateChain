"""End-to-end smoke test of the running stack (chain + API). Run after `make chain`, `make deploy`, `make api`.

Walks the demo story through the public API and fails loudly on any unexpected response:
clean claim -> anchor -> overlapping claim blocked -> forced registration reverts on chain ->
verify document (match + tamper) -> challenge -> uphold -> overlapping claim now anchors.
Note: it writes to the running app's ledger; run `make reset` afterwards for a clean demo.
"""
from __future__ import annotations

import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
API = "http://127.0.0.1:8000"
DEMO = ROOT / "data/demo"


def check(cond: bool, msg: str):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        sys.exit(1)


def submit(c: httpx.Client, claimant: str, file: str) -> dict:
    with open(DEMO / file, "rb") as f:
        r = c.post(f"{API}/api/claims", data={"claimant": claimant, "period": "FY2025"}, files={"files": (file, f)})
    check(r.status_code == 201, f"submit {file} -> 201 ({r.status_code})")
    return r.json()


def main():
    c = httpx.Client(timeout=60)
    h = c.get(f"{API}/api/health").json()
    check(h["chain"]["available"] and h["reference"]["loaded"], f"health: chain and reference available ({h['reference']['scope']})")

    a = submit(c, "E2E Northwind (SYNTHETIC)", "northwind_allocation.pdf")
    check(any(f["rule_id"] == "REG-000" for f in a["findings"]), "clean claim reconciled with registry (REG-000)")
    r = c.post(f"{API}/api/claims/{a['id']}/anchor", json={})
    if r.status_code == 409 and "DUP-001" in r.text:
        sys.exit("The demo units are already claimed on this ledger. Run `make reset` and restart the API first.")
    check(r.status_code == 200 and r.json()["result"]["ok"], "clean claim anchored on chain")

    b = submit(c, "E2E Helios (SYNTHETIC)", "helios_allocation.pdf")
    dup = [f for f in b["findings"] if f["rule_id"] == "DUP-001"]
    check(b["status"] == "blocked" and dup and dup[0]["evidence"]["overlap"]["units"] == 4559, "overlapping claim blocked with 4,559 shared units")
    r = c.post(f"{API}/api/claims/{b['id']}/anchor", json={})
    check(r.status_code == 409, "normal anchor refused (409)")
    r = c.post(f"{API}/api/claims/{b['id']}/anchor", json={"force": True})
    rev = r.json()["detail"]["chain"]["revert"]
    check(r.status_code == 409 and rev["error"] == "RangeOverlap" and rev["args"]["overlapStart"] == 896315001, "contract reverts with RangeOverlap at unit 896,315,001")

    data = (DEMO / "northwind_allocation.pdf").read_bytes()
    r = c.post(f"{API}/api/verify", data={"ref": a["ref"]}, files={"file": ("n.pdf", data)}).json()
    check(r["found"] and r["document"]["matches_onchain_commitment"], "verify: original document matches on-chain commitment")
    tampered = data.replace(b"10,000", b"10,001", 1) if b"10,000" in data else data + b" "
    r = c.post(f"{API}/api/verify", data={"ref": a["ref"]}, files={"file": ("n.pdf", tampered)}).json()
    check(not r["document"]["matches_onchain_commitment"], "verify: tampered document does not match")

    r = c.post(f"{API}/api/claims/{a['id']}/challenge", json={"reason": "E2E: allocation record shows overlap"})
    check(r.status_code == 200 and r.json()["claim"]["status"] == "challenged", "challenge opened on chain")
    r = c.post(f"{API}/api/claims/{a['id']}/resolve", json={"upheld": True, "note": "E2E uphold"})
    check(r.status_code == 200 and r.json()["claim"]["status"] == "revoked", "challenge upheld; claim revoked")
    r = c.post(f"{API}/api/claims/{b['id']}/anchor", json={})
    check(r.status_code == 200 and r.json()["result"]["ok"], "released units: overlapping claim now anchors")
    print("\nAll end-to-end checks passed.")


if __name__ == "__main__":
    main()
