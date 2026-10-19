"""Generate SYNTHETIC demo evidence documents (deterministic).

Every claimant and the broker "Meridian Offsets" are fictional. The serial ranges cite
REAL registry retirement records from Berkeley VROD 2026-08 (CC BY 4.0); documents are
styled as a fictional broker's allocation statement, never as an official registry certificate.

Output: data/demo/*.pdf|*.txt and data/demo/manifest.json
"""
from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data/demo"

INK = HexColor("#12333A")
MUTED = HexColor("#5B6B70")
WARN = HexColor("#B4233C")

SCENARIOS = [
    {
        "file": "northwind_allocation.pdf",
        "claimant": "Northwind Foods (SYNTHETIC)",
        "title": "Clean claim",
        "story": "Northwind cites 10,000 units from a real Verra retirement (VCS 1904, batch 18453). Expect: confirmed in registry, no conflicts.",
        "statement": "FY2025 contribution claim: 10,000 tCO2e of retired VCUs (SYNTHETIC DEMO)",
        "lines": [("VCS 1904 · Wind Power Project in Tamil Nadu", "18453-896309560-896319559-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0", 10000)],
    },
    {
        "file": "helios_allocation.pdf",
        "claimant": "Helios Apparel (SYNTHETIC)",
        "title": "Overlapping claim",
        "story": "Helios cites 7,000 units from the same retirement; 4,559 of them are already in Northwind's claim. Expect: potential double use, blocked by the contract.",
        "statement": "FY2025 contribution claim: 7,000 tCO2e of retired VCUs (SYNTHETIC DEMO)",
        "lines": [("VCS 1904 · Wind Power Project in Tamil Nadu", "18453-896315001-896322000-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0", 7000)],
    },
    {
        "file": "arbor_allocation.pdf",
        "claimant": "Arbor Logistics (SYNTHETIC)",
        "title": "Two registries, wrapped serials",
        "story": "Arbor cites a Gold Standard block (Istanbul landfill gas, GS 707) and a Verra block (VCS 1742). The long serial is wrapped across lines. Expect: both reconciled.",
        "statement": "FY2025 contribution claim: 6,000 tCO2e across Gold Standard and Verra (SYNTHETIC DEMO)",
        "lines": [
            ("GS 707 · Landfill gas, Istanbul, Türkiye", "GS1-1-TR-GS707-21-2021-26933-63673-65672", 2000),
            ("VCS 1742 · Hydroelectric, Kinnaur, Himachal Pradesh", "13264-481793743-481797742-VCS-VCU-997-VER-IN-1-1742-01052020-31122020-0", 4000),
        ],
        "wrap": True,
    },
    {
        "file": "lumen_allocation.pdf",
        "claimant": "Lumen Retail (SYNTHETIC)",
        "title": "Mistyped serial",
        "story": "Lumen's statement has the batch number mistyped (18435 instead of 18453). Expect: not found in the registry snapshot; review.",
        "statement": "FY2025 contribution claim: 2,000 tCO2e (SYNTHETIC DEMO)",
        "lines": [("VCS 1904 · Wind Power Project in Tamil Nadu", "18435-896323001-896325000-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0", 2000)],
    },
    {
        "file": "kestrel_statement.txt",
        "claimant": "Kestrel Media (SYNTHETIC)",
        "title": "Claim without serials",
        "story": "Kestrel's sustainability page names a project and vintage but no serial numbers. Expect: insufficient evidence; cannot be anchored.",
        "statement": "Carbon neutral operations 2025 (SYNTHETIC DEMO)",
        "text": (
            "Kestrel Media (SYNTHETIC) — Sustainability update 2025 [SYNTHETIC DEMO DOCUMENT]\n\n"
            "Our 2025 operations are carbon neutral. We retired 8,000 tCO2e of VCS credits from project 1904, "
            "vintage 2024, through our broker Meridian Offsets (SYNTHETIC).\n"
        ),
    },
]


def _pdf(path: Path, sc: dict) -> None:
    c = canvas.Canvas(str(path), pagesize=A4, invariant=1)  # byte-reproducible
    w, h = A4
    c.setTitle(f"Credit allocation statement — {sc['claimant']}")
    c.saveState()
    c.setFillColor(HexColor("#F1D5DA"))
    c.setFont("Helvetica-Bold", 46)
    c.translate(w / 2, h / 2)
    c.rotate(35)
    c.drawCentredString(0, 0, "SYNTHETIC DEMO")
    c.restoreState()

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, h - 60, "Meridian Offsets (SYNTHETIC)")
    c.setFont("Helvetica", 10)
    c.setFillColor(MUTED)
    c.drawString(50, h - 76, "Credit allocation statement — fictional broker document generated for the OnceOnly demo")
    c.setFillColor(WARN)
    c.drawString(50, h - 92, "Not a registry certificate. Claimant and broker are fictional; serial ranges cite real public registry retirements.")

    y = h - 130
    c.setFillColor(INK)
    c.setFont("Helvetica", 11)
    for k, v in [("Retired on behalf of", sc["claimant"]), ("Retirement date", "2026-08-20"), ("Purpose", sc["statement"])]:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, f"{k}:")
        c.setFont("Helvetica", 10)
        c.drawString(170, y, v)
        y -= 18
    y -= 10
    total = 0
    for i, (label, serial, qty) in enumerate(sc["lines"], 1):
        total += qty
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y, f"Block {i}: {label}")
        y -= 16
        c.setFont("Courier", 9)
        if sc.get("wrap"):
            parts = serial.split("-")
            cut = len(parts) // 2
            c.drawString(60, y, "Serial Number: " + "-".join(parts[:cut]) + "-")
            y -= 12
            c.drawString(60, y, "-".join(parts[cut:]))
        else:
            c.drawString(60, y, f"Serial Number: {serial}")
        y -= 14
        c.setFont("Helvetica", 10)
        c.drawString(60, y, f"Units: {qty:,} tCO2e")
        y -= 24
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, f"Total quantity: {total:,} tCO2e")
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawString(50, 50, "Registry data: Berkeley Carbon Trading Project, VROD v2026-08 (CC BY 4.0). Generated by backend/scripts/make_demo_docs.py.")
    c.showPage()
    c.save()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for sc in SCENARIOS:
        p = OUT / sc["file"]
        if p.suffix == ".pdf":
            _pdf(p, sc)
        else:
            p.write_text(sc["text"])
        manifest.append({k: sc[k] for k in ("file", "claimant", "title", "story", "statement")} | {"synthetic": True})
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"wrote {len(manifest)} demo documents to {OUT}")


if __name__ == "__main__":
    main()
