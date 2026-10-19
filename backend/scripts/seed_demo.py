"""Seed the running app with the demo story through the real API (no direct DB writes).

Requires `make chain`, `make deploy` and `make api`. Creates, using the synthetic
sample documents in data/demo:
  1. Northwind  - clean claim, anchored on ClaimLedger
  2. Helios     - overlaps Northwind; blocked, plus one forced registration the contract rejects
  3. Arbor      - Gold Standard + Verra blocks, anchored
  4. Lumen      - mistyped serial, left for review
  5. Kestrel    - no serial numbers, blocked
Run `make reset` (and restart the API) before seeding for a clean ledger.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
API = "http://127.0.0.1:8000"
DEMO = ROOT / "data/demo"


def main() -> None:
    manifest = {m["file"]: m for m in json.loads((DEMO / "manifest.json").read_text())}
    c = httpx.Client(timeout=60)
    if c.get(f"{API}/api/claims").json():
        sys.exit("The app already has claims. Run `make reset`, restart the API, then seed again.")

    def submit(file: str) -> dict:
        m = manifest[file]
        with open(DEMO / file, "rb") as f:
            r = c.post(f"{API}/api/claims", data={"claimant": m["claimant"], "period": "FY2025", "statement": m["statement"]}, files={"files": (file, f)})
        r.raise_for_status()
        d = r.json()
        print(f"{d['ref']}  {d['claimant']:<32} {d['status']}")
        return d

    nw = submit("northwind_allocation.pdf")
    c.post(f"{API}/api/claims/{nw['id']}/anchor", json={}).raise_for_status()
    he = submit("helios_allocation.pdf")
    r = c.post(f"{API}/api/claims/{he['id']}/anchor", json={"force": True})
    print("   forced Helios registration ->", r.json().get("detail", {}).get("chain", {}).get("revert", {}).get("error"))
    ar = submit("arbor_allocation.pdf")
    c.post(f"{API}/api/claims/{ar['id']}/anchor", json={}).raise_for_status()
    submit("lumen_allocation.pdf")
    submit("kestrel_statement.txt")
    print("Seeded the demo story.")


if __name__ == "__main__":
    main()
