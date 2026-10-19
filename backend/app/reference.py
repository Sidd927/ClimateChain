"""Read-only access to the registry reference index (real Berkeley VROD registry records)."""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import settings

COLS = [
    "kind", "registry", "batch_id", "unit_start", "unit_end", "quantity", "serial", "project_id",
    "project_name", "vintage", "country", "event_date", "beneficiary", "reason", "source_sheet", "source_row",
]


@dataclass
class Coverage:
    retired_units: int
    issued_units: int
    records: list[dict]  # retirement records intersecting the range
    issuance_records: list[dict]


def build_demo_db(csv_path: Path, out: Path) -> None:
    """Materialize the committed demo subset CSV into a SQLite index (idempotent)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    tmp = out.with_suffix(".tmp")
    if tmp.exists():
        tmp.unlink()
    con = sqlite3.connect(tmp)
    con.execute(f"CREATE TABLE records ({', '.join(COLS)})")
    rows = [
        tuple((None if v == "" else (int(v) if c in ("unit_start", "unit_end", "quantity", "source_row") else v)) for c, v in zip(COLS, r))
        for r in df[COLS].itertuples(index=False)
    ]
    con.executemany(f"INSERT INTO records VALUES ({','.join('?' * len(COLS))})", rows)
    con.execute("CREATE INDEX ix_ns ON records(registry, batch_id, unit_start)")
    con.execute("CREATE INDEX ix_proj ON records(registry, project_id, vintage)")
    con.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
    src = {
        "dataset": "Berkeley Carbon Trading Project — VROD registry files (curated demo subset)",
        "version": "2026-08 (data through 2026-08-31)",
        "license": "CC BY 4.0",
        "url": "https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database",
    }
    con.execute("INSERT INTO meta VALUES ('source', ?)", (json.dumps(src),))
    con.execute("INSERT INTO meta VALUES ('scope', ?)", (json.dumps("demo-subset"),))
    con.commit()
    con.close()
    tmp.replace(out)


class Reference:
    def __init__(self, path: Path, scope: str):
        self.path = path
        self.scope = scope
        self.con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, check_same_thread=False)
        self.con.row_factory = sqlite3.Row

    @classmethod
    def open(cls) -> "Reference | None":
        mode = settings.reference_mode
        if mode in ("auto", "full") and settings.reference_full.exists():
            return cls(settings.reference_full, "full")
        if mode == "full":
            return None
        if not settings.reference_demo.exists() and settings.reference_subset_csv.exists():
            build_demo_db(settings.reference_subset_csv, settings.reference_demo)
        if settings.reference_demo.exists():
            return cls(settings.reference_demo, "demo-subset")
        return None

    def meta(self) -> dict:
        out = {k: json.loads(v) for k, v in self.con.execute("SELECT key, value FROM meta")}
        counts = self.con.execute("SELECT registry, kind, COUNT(*) FROM records GROUP BY registry, kind").fetchall()
        out["row_counts"] = {f"{r[0]}_{r[1]}": r[2] for r in counts}
        out["scope"] = self.scope
        return out

    def _intersecting(self, kind: str, registry: str, batch_id: str, start: int, end: int) -> list[dict]:
        rows = self.con.execute(
            "SELECT * FROM records WHERE kind=? AND registry=? AND batch_id=? AND unit_start<=? AND unit_end>=? ORDER BY unit_start",
            (kind, registry, batch_id, end, start),
        ).fetchall()
        return [dict(r) for r in rows]

    def coverage(self, registry: str, batch_id: str, start: int, end: int) -> Coverage:
        ret = self._intersecting("retirement", registry, batch_id, start, end)
        iss = self._intersecting("issuance", registry, batch_id, start, end)
        return Coverage(_union_len(ret, start, end), _union_len(iss, start, end), ret, iss)

    def batch_known(self, registry: str, batch_id: str) -> bool:
        return self.con.execute("SELECT 1 FROM records WHERE registry=? AND batch_id=? LIMIT 1", (registry, batch_id)).fetchone() is not None

    def retired_total(self, registry: str, project_id: str, vintage: str) -> int | None:
        r = self.con.execute(
            "SELECT SUM(quantity), COUNT(*) FROM records WHERE kind='retirement' AND registry=? AND project_id=? AND vintage=?",
            (registry, project_id, vintage),
        ).fetchone()
        return int(r[0]) if r and r[1] else None

    def project_name(self, registry: str, project_id: str) -> str | None:
        r = self.con.execute("SELECT project_name FROM records WHERE registry=? AND project_id=? AND project_name IS NOT NULL LIMIT 1", (registry, project_id)).fetchone()
        return r[0] if r else None

    def sample_retirements(self, limit: int = 20) -> list[dict]:
        rows = self.con.execute(
            "SELECT * FROM records WHERE kind='retirement' ORDER BY event_date DESC, quantity DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def _union_len(records: list[dict], start: int, end: int) -> int:
    spans = sorted((max(r["unit_start"], start), min(r["unit_end"], end)) for r in records)
    total, cur_s, cur_e = 0, None, None
    for s, e in spans:
        if cur_e is None or s > cur_e + 1:
            if cur_e is not None:
                total += cur_e - cur_s + 1
            cur_s, cur_e = s, e
        else:
            cur_e = max(cur_e, e)
    if cur_e is not None:
        total += cur_e - cur_s + 1
    return total
