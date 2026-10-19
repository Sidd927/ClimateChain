"""SQLite persistence for claims, evidence, extracted blocks, findings and audit events."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT UNIQUE NOT NULL,
  claimant TEXT NOT NULL,
  claimant_salt TEXT NOT NULL,
  claimant_commitment TEXT NOT NULL,
  claim_date TEXT,
  period TEXT,
  statement TEXT,
  synthetic INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,          -- checked | blocked | anchored | challenged | revoked | withdrawn
  verdict TEXT,                  -- clear | review | blocked
  report_hash TEXT,
  evidence_hash TEXT,
  chain_claim_id INTEGER,
  tx_hash TEXT,
  block_number INTEGER,
  chain_id INTEGER,
  contract_address TEXT,
  llm_status TEXT,
  extraction_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT,
  text_excerpt TEXT
);
CREATE INDEX IF NOT EXISTS ix_evidence_sha ON evidence(sha256);
CREATE TABLE IF NOT EXISTS claim_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  idx INTEGER NOT NULL,
  registry TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  unit_start INTEGER NOT NULL,
  unit_end INTEGER NOT NULL,
  serial TEXT NOT NULL,
  project_id TEXT,
  vintage TEXT,
  country TEXT,
  source TEXT
);
CREATE INDEX IF NOT EXISTS ix_blocks_ns ON claim_blocks(registry, batch_id, unit_start);
CREATE TABLE IF NOT EXISTS findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER NOT NULL REFERENCES claims(id),
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  uncertainty TEXT,
  next_action TEXT,
  evidence_json TEXT,
  block_index INTEGER
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id INTEGER REFERENCES claims(id),
  kind TEXT NOT NULL,
  detail_json TEXT,
  tx_hash TEXT,
  block_number INTEGER,
  created_at TEXT NOT NULL
);
"""

LOCKING = ("anchored", "challenged")


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(SCHEMA)
    return con


@contextmanager
def tx(con: sqlite3.Connection):
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise


def add_event(con, claim_id: int | None, kind: str, detail: dict | None = None, tx_hash: str | None = None, block_number: int | None = None):
    con.execute(
        "INSERT INTO events (claim_id, kind, detail_json, tx_hash, block_number, created_at) VALUES (?,?,?,?,?,?)",
        (claim_id, kind, json.dumps(detail or {}), tx_hash, block_number, now()),
    )


def next_ref(con) -> str:
    n = con.execute("SELECT COUNT(*) FROM claims").fetchone()[0] + 1
    return f"OO-2026-{n:04d}"


def row(r) -> dict | None:
    return dict(r) if r is not None else None
