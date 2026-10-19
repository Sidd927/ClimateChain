import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture()
def tmp_env(tmp_path, monkeypatch):
    """Isolated app DB + evidence dir, demo-subset reference, chain pointed at a dead port."""
    monkeypatch.setenv("ONCEONLY_DB", str(tmp_path / "app.sqlite"))
    monkeypatch.setenv("ONCEONLY_EVIDENCE_DIR", str(tmp_path / "evidence"))
    monkeypatch.setenv("ONCEONLY_REFERENCE_MODE", "demo")
    monkeypatch.setenv("ONCEONLY_REFERENCE_DEMO_DB", str(tmp_path / "ref_demo.sqlite"))
    monkeypatch.setenv("CHAIN_RPC_URL", "http://127.0.0.1:1")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    for m in [m for m in sys.modules if m.startswith("app")]:
        del sys.modules[m]
    yield tmp_path
    for m in [m for m in sys.modules if m.startswith("app")]:
        del sys.modules[m]
