"""Runtime configuration from environment variables (and an optional repo-root .env file)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv(ROOT / ".env")


def _path(name: str, default: str) -> Path:
    p = Path(os.environ.get(name, default))
    return p if p.is_absolute() else ROOT / p


@dataclass(frozen=True)
class Settings:
    db_path: Path = _path("ONCEONLY_DB", "var/onceonly.sqlite")
    evidence_dir: Path = _path("ONCEONLY_EVIDENCE_DIR", "var/evidence")
    reference_full: Path = _path("ONCEONLY_REFERENCE_DB", "data/reference/registry_full.sqlite")
    reference_demo: Path = _path("ONCEONLY_REFERENCE_DEMO_DB", "var/registry_demo.sqlite")
    reference_subset_csv: Path = ROOT / "data/reference/demo_subset.csv.gz"
    reference_mode: str = os.environ.get("ONCEONLY_REFERENCE_MODE", "auto")  # auto | full | demo
    rpc_url: str = os.environ.get("CHAIN_RPC_URL", "http://127.0.0.1:8545")
    deployment_file: Path = _path("CHAIN_DEPLOYMENT", "contracts/deployments/localhost.json")
    registrar_key: str = os.environ.get("REGISTRAR_PRIVATE_KEY", "")
    reviewer_key: str = os.environ.get("REVIEWER_PRIVATE_KEY", "")
    challenger_key: str = os.environ.get("CHALLENGER_PRIVATE_KEY", "")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    llm_model: str = os.environ.get("ONCEONLY_LLM_MODEL", "claude-opus-5-5")
    llm_enabled: bool = os.environ.get("ONCEONLY_LLM", "auto").lower() != "off"
    max_upload_bytes: int = int(os.environ.get("ONCEONLY_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
    cors_origins: tuple[str, ...] = tuple(
        o.strip() for o in os.environ.get("ONCEONLY_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()
    )


settings = Settings()
