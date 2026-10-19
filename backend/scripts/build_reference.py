"""Build the registry reference index from Berkeley VROD registry files (CC BY 4.0).

Outputs
  data/reference/registry_full.sqlite      full index (gitignored, ~470k retirement rows)
  data/reference/demo_subset.csv.gz        curated subset committed to the repo for reproducible demos
  eval/results/registry_audit.json         measured parser coverage / consistency / overlap audit

Usage
  python backend/scripts/build_reference.py [--xlsx data/raw/VROD-registry-files--2026-08.xlsx]
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.serials import SerialError, parse_serial  # noqa: E402

SOURCE = {
    "dataset": "Berkeley Carbon Trading Project — Voluntary Registry Offsets Database (VROD) registry files",
    "version": "2026-08 (data through 2026-08-31)",
    "license": "CC BY 4.0",
    "citation": "Quartson, P., Haya, B.K., Bernard, T., Abayo, A., Rong, X., So, I.S., Elias, M. (2026). "
    "Voluntary Registry Offsets Database v2026-08, Berkeley Carbon Trading Project, UC Berkeley.",
    "url": "https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database",
}

COLS = [
    "kind", "registry", "batch_id", "unit_start", "unit_end", "quantity", "serial", "project_id",
    "project_name", "vintage", "country", "event_date", "beneficiary", "reason", "source_sheet", "source_row",
]


def _s(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)) or (v is pd.NaT):
        return None
    s = str(v).strip()
    return s or None


def _date(v) -> str | None:
    s = _s(v)
    return s[:10] if s else None


def load(xlsx: Path, sheet: str, cols: list[str]) -> pd.DataFrame:
    t = time.time()
    df = pd.read_excel(xlsx, sheet_name=sheet, engine="openpyxl", usecols=lambda c: c in cols)
    print(f"  {sheet}: {len(df):,} rows ({time.time() - t:.0f}s)")
    return df


def convert(df, kind, registry, sheet, qty_col, date_col, ben_col, reason_col, name_col, vintage_col, country_col):
    rows, audit = [], {"rows": len(df), "parsed": 0, "qty_consistent": 0, "unparsed_examples": []}
    for i, r in enumerate(df.itertuples(index=False)):
        rec = r._asdict()
        serial = _s(rec.get("Serial_Number") or rec.get("Serial Number"))
        if not serial:
            continue
        try:
            b = parse_serial(serial)
        except SerialError:
            if len(audit["unparsed_examples"]) < 5:
                audit["unparsed_examples"].append(serial)
            continue
        audit["parsed"] += 1
        q = rec.get(qty_col)
        try:
            q = int(q)
        except (TypeError, ValueError):
            q = None
        if q == b.quantity:
            audit["qty_consistent"] += 1
        rows.append((
            kind, registry, b.batch_id, b.unit_start, b.unit_end, q if q is not None else b.quantity, b.serial,
            b.project_id, _s(rec.get(name_col)), _s(rec.get(vintage_col)) or b.vintage, _s(rec.get(country_col)) or b.country,
            _date(rec.get(date_col)), _s(rec.get(ben_col)) if ben_col else None, _s(rec.get(reason_col)) if reason_col else None,
            sheet, i + 2,  # +2: header row + 1-based
        ))
    return rows, audit


def overlap_audit(rows) -> dict:
    by_ns: dict[str, list] = defaultdict(list)
    global_list = []
    for r in rows:
        by_ns[f"{r[1]}:{r[2]}"].append((r[3], r[4]))
        global_list.append((r[1], r[3], r[4]))
    within = 0
    sizes = []
    for spans in by_ns.values():
        spans.sort()
        sizes.append(len(spans))
        within += sum(1 for i in range(1, len(spans)) if spans[i][0] <= spans[i - 1][1])
    ignoring_batch = 0
    for reg in {g[0] for g in global_list}:
        g = sorted((a, b) for rr, a, b in global_list if rr == reg)
        ignoring_batch += sum(1 for i in range(1, len(g)) if g[i][0] <= g[i - 1][1])
    sizes.sort()
    return {
        "namespaces": len(by_ns),
        "overlapping_adjacent_pairs_within_namespace": within,
        "overlapping_adjacent_pairs_if_batch_ignored": ignoring_batch,
        "retirements_per_namespace": {"median": sizes[len(sizes) // 2], "p99": sizes[int(len(sizes) * 0.99)], "max": sizes[-1]},
    }


def write_sqlite(path: Path, rows, meta: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    con = sqlite3.connect(path)
    con.execute(f"CREATE TABLE records ({', '.join(COLS)})")
    con.executemany(f"INSERT INTO records VALUES ({','.join('?' * len(COLS))})", rows)
    con.execute("CREATE INDEX ix_ns ON records(registry, batch_id, unit_start)")
    con.execute("CREATE INDEX ix_proj ON records(registry, project_id, vintage)")
    con.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
    con.executemany("INSERT INTO meta VALUES (?, ?)", [(k, json.dumps(v)) for k, v in meta.items()])
    con.commit()
    con.close()


def pick_demo_projects(ret_rows, registry, n, must) -> set[str]:
    counts: dict[str, int] = defaultdict(int)
    for r in ret_rows:
        if r[1] == registry and (r[11] or "") >= "2025-01-01":
            counts[r[7]] += 1
    ranked = sorted(counts, key=lambda p: (-counts[p], p))
    chosen = set(must)
    for p in ranked:
        if len(chosen) >= n:
            break
        if counts[p] <= 400:  # keep the committed subset small
            chosen.add(p)
    return chosen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", default=str(ROOT / "data/raw/VROD-registry-files--2026-08.xlsx"))
    args = ap.parse_args()
    xlsx = Path(args.xlsx)
    if not xlsx.exists():
        sys.exit(f"Missing {xlsx}. Run `make data-download` first.")

    print("Loading VROD registry sheets…")
    vr = load(xlsx, "Verra VCS Retirements", ["Retirement Date", "Project ID", "Project Name", "Vintage", "Serial Number", "Retirement QTY", "Country", "Beneficial Owner", "Retirement Reason Details"])
    vi = load(xlsx, "Verra VCS Issuances", ["Issuance Date", "Project ID", "Project Name", "Vintage", "Serial Number", "Total Vintage Quantity +", "Units", "Country"])
    gr = load(xlsx, "Gold Retirements", ["Vintage", "Quantity", "GSID", "Project Name", "Country", "Retirement Date", "Serial Number", "Note", "Using Entity"])
    for df in (vr, vi, gr):
        df.columns = [c.replace(" ", "_").replace("+", "").strip("_") for c in df.columns]

    vr_rows, vr_a = convert(vr, "retirement", "VCS", "Verra VCS Retirements", "Retirement_QTY", "Retirement_Date", "Beneficial_Owner", "Retirement_Reason_Details", "Project_Name", "Vintage", "Country")
    vi_rows, vi_a = convert(vi, "issuance", "VCS", "Verra VCS Issuances", "Units", "Issuance_Date", None, None, "Project_Name", "Vintage", "Country")
    gr_rows, gr_a = convert(gr, "retirement", "GS", "Gold Retirements", "Quantity", "Retirement_Date", "Using_Entity", "Note", "Project_Name", "Vintage", "Country")

    ben_v = sum(1 for r in vr_rows if r[12])
    ben_g = sum(1 for r in gr_rows if r[12])
    audit = {
        "source": SOURCE,
        "verra_retirements": {**vr_a, "with_beneficiary": ben_v, **overlap_audit(vr_rows)},
        "verra_issuances": {**vi_a},
        "gold_retirements": {**gr_a, "with_beneficiary": ben_g, **overlap_audit(gr_rows)},
        "built_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    out = ROOT / "eval/results/registry_audit.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(audit, indent=2))
    print(json.dumps(audit, indent=2))

    all_rows = vr_rows + vi_rows + gr_rows
    meta = {"source": SOURCE, "scope": "full", "row_counts": {"VCS_retirement": len(vr_rows), "VCS_issuance": len(vi_rows), "GS_retirement": len(gr_rows)}}
    write_sqlite(ROOT / "data/reference/registry_full.sqlite", all_rows, meta)

    vcs = pick_demo_projects(vr_rows, "VCS", 16, {"1904"})
    gs = pick_demo_projects(gr_rows, "GS", 6, {"12303"})
    subset = [r for r in all_rows if (r[1] == "VCS" and r[7] in vcs) or (r[1] == "GS" and r[7] in gs)]
    pd.DataFrame(subset, columns=COLS).to_csv(ROOT / "data/reference/demo_subset.csv.gz", index=False, compression="gzip")
    print(f"Full index: {len(all_rows):,} rows. Demo subset: {len(subset):,} rows from VCS {sorted(vcs)} GS {sorted(gs)}")


if __name__ == "__main__":
    main()
