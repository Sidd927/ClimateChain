"""OnceOnly API."""
from __future__ import annotations

import html
import json
import logging
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from . import db, service
from .chain import try_ledger
from .config import ROOT, settings
from .extraction import llm_available
from .reference import Reference
from .rules import RULES

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(title="OnceOnly API", version="0.1.0", description="Every retired tonne, claimed once.")
app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_origins), allow_methods=["*"], allow_headers=["*"])

_state: dict = {}


def con():
    if "con" not in _state:
        _state["con"] = db.connect()
    return _state["con"]


def ref() -> Reference | None:
    if "ref" not in _state:
        _state["ref"] = Reference.open()
    return _state["ref"]


@app.exception_handler(service.ServiceError)
async def _svc_err(_: Request, e: service.ServiceError):
    return JSONResponse(status_code=e.status, content={"error": e.message, "detail": e.detail})


# ------------------------------------------------------------------- read models

def claim_detail(claim_id: int) -> dict:
    c = con().execute("SELECT * FROM claims WHERE id=?", (claim_id,)).fetchone()
    if c is None:
        raise HTTPException(404, "Claim not found")
    out = dict(c)
    out.pop("claimant_salt", None)
    out["synthetic"] = bool(out["synthetic"])
    out["extraction"] = json.loads(out.pop("extraction_json") or "{}")
    out["evidence"] = [dict(r) | {"text_excerpt": (r["text_excerpt"] or "")[:1500]} for r in con().execute("SELECT id, filename, sha256, size, mime, text_excerpt FROM evidence WHERE claim_id=?", (claim_id,))]
    out["blocks"] = [dict(r) | {"quantity": r["unit_end"] - r["unit_start"] + 1, "namespace": f"{r['registry']}:{r['batch_id']}"} for r in con().execute("SELECT * FROM claim_blocks WHERE claim_id=? ORDER BY idx", (claim_id,))]
    out["findings"] = [dict(r) | {"evidence": json.loads(r["evidence_json"] or "{}")} for r in con().execute("SELECT * FROM findings WHERE claim_id=? ORDER BY CASE severity WHEN 'blocking' THEN 0 WHEN 'review' THEN 1 WHEN 'info' THEN 2 ELSE 3 END, id", (claim_id,))]
    for f in out["findings"]:
        f.pop("evidence_json", None)
    out["events"] = [dict(r) | {"detail": json.loads(r["detail_json"] or "{}")} for r in con().execute("SELECT * FROM events WHERE claim_id=? ORDER BY id", (claim_id,))]
    for e in out["events"]:
        e.pop("detail_json", None)
    out["total_units"] = sum(b["quantity"] for b in out["blocks"])
    out["unit_strips"] = unit_strips(claim_id, out["blocks"])
    return out


def unit_strips(claim_id: int, blocks: list[dict]) -> list[dict]:
    """For each block: the registry records and other claims in the same namespace, for visualization."""
    strips = []
    r = ref()
    for b in blocks:
        lo, hi = b["unit_start"], b["unit_end"]
        records = []
        if r is not None:
            cov = r.coverage(b["registry"], b["batch_id"], lo, hi)
            records = [{"unit_start": x["unit_start"], "unit_end": x["unit_end"], "kind": "retirement", "event_date": x["event_date"], "beneficiary": x["beneficiary"], "serial": x["serial"]} for x in cov.records[:50]]
            if not records:
                records = [{"unit_start": x["unit_start"], "unit_end": x["unit_end"], "kind": "issuance", "event_date": x["event_date"], "serial": x["serial"]} for x in cov.issuance_records[:5]]
        others = [dict(x) for x in con().execute(
            """SELECT c.id AS claim_id, c.ref, c.claimant, c.status, b.unit_start, b.unit_end FROM claim_blocks b JOIN claims c ON c.id=b.claim_id
               WHERE b.registry=? AND b.batch_id=? AND c.id != ? AND b.unit_start <= ? AND b.unit_end >= ?""",
            (b["registry"], b["batch_id"], claim_id, hi + (hi - lo + 1), lo - (hi - lo + 1)),
        )]
        spans = [lo, hi] + [x["unit_start"] for x in records + others] + [x["unit_end"] for x in records + others]
        strips.append({"block_index": b["idx"], "namespace": b["namespace"], "claim": {"unit_start": lo, "unit_end": hi},
                       "records": records, "others": others, "domain": [min(spans), max(spans)]})
    return strips


def summarize(c) -> dict:
    d = dict(c)
    for k in ("claimant_salt", "extraction_json"):
        d.pop(k, None)
    d["synthetic"] = bool(d["synthetic"])
    d["total_units"] = con().execute("SELECT COALESCE(SUM(unit_end-unit_start+1),0) FROM claim_blocks WHERE claim_id=?", (c["id"],)).fetchone()[0]
    d["block_count"] = con().execute("SELECT COUNT(*) FROM claim_blocks WHERE claim_id=?", (c["id"],)).fetchone()[0]
    counts = {r[0]: r[1] for r in con().execute("SELECT severity, COUNT(*) FROM findings WHERE claim_id=? GROUP BY severity", (c["id"],))}
    d["finding_counts"] = counts
    return d


# ------------------------------------------------------------------------ routes

@app.get("/api/health")
def health():
    ledger, err = try_ledger()
    r = ref()
    return {
        "status": "ok",
        "reference": {"loaded": r is not None, "scope": r.scope if r else None},
        "chain": {"available": ledger is not None, "error": err, **({"chain_id": ledger.chain_id, "address": ledger.address, "block_number": ledger.w3.eth.block_number, "public_network": ledger.chain_id != 31337} if ledger else {})},
        "llm": {"configured": llm_available(), "model": settings.llm_model if llm_available() else None},
    }


@app.get("/api/overview")
def overview():
    c = con()
    by_status = {r[0]: r[1] for r in c.execute("SELECT status, COUNT(*) FROM claims GROUP BY status")}
    units_anchored = c.execute("SELECT COALESCE(SUM(b.unit_end-b.unit_start+1),0) FROM claim_blocks b JOIN claims c ON c.id=b.claim_id WHERE c.status IN ('anchored','challenged')").fetchone()[0]
    rejected = c.execute("SELECT COUNT(*) FROM events WHERE kind='chain_rejected'").fetchone()[0]
    dup_findings = c.execute("SELECT COUNT(DISTINCT claim_id) FROM findings WHERE rule_id='DUP-001'").fetchone()[0]
    ledger, err = try_ledger()
    r = ref()
    audit_path = ROOT / "eval/results/registry_audit.json"
    eval_path = ROOT / "eval/results/latest.json"
    recent = [dict(x) | {"detail": json.loads(x["detail_json"] or "{}")} for x in c.execute(
        "SELECT e.id, e.kind, e.tx_hash, e.block_number, e.created_at, e.detail_json, e.claim_id, cl.ref, cl.claimant FROM events e LEFT JOIN claims cl ON cl.id=e.claim_id ORDER BY e.id DESC LIMIT 12")]
    for x in recent:
        x.pop("detail_json", None)
    return {
        "claims": {"total": sum(by_status.values()), "by_status": by_status, "units_anchored": units_anchored, "with_double_use_findings": dup_findings, "chain_rejections": rejected},
        "chain": ledger.info() if ledger else {"available": False, "error": err},
        "reference": r.meta() if r else None,
        "registry_audit": json.loads(audit_path.read_text()) if audit_path.exists() else None,
        "evaluation": json.loads(eval_path.read_text()) if eval_path.exists() else None,
        "llm": {"configured": llm_available(), "model": settings.llm_model if llm_available() else None},
        "recent_events": recent,
    }


@app.get("/api/claims")
def list_claims():
    return [summarize(c) for c in con().execute("SELECT * FROM claims ORDER BY id DESC")]


@app.post("/api/claims", status_code=201)
async def create_claim(
    claimant: str = Form(...),
    claim_date: str | None = Form(None),
    period: str | None = Form(None),
    statement: str | None = Form(None),
    text: str | None = Form(None),
    synthetic: bool = Form(True),
    use_llm: bool | None = Form(None),
    files: list[UploadFile] | None = File(None),
):
    uploads = []
    for f in files or []:
        data = await f.read(settings.max_upload_bytes + 1)
        uploads.append(service.Upload(Path(f.filename or "upload").name, data, f.content_type))
    cid = service.create_claim(con(), ref(), claimant=claimant, claim_date=claim_date, period=period, statement=statement,
                               pasted_text=text, uploads=uploads, synthetic=synthetic, use_llm=use_llm)
    return claim_detail(cid)


@app.get("/api/claims/{claim_id}")
def get_claim(claim_id: int):
    return claim_detail(claim_id)


@app.post("/api/claims/{claim_id}/recheck")
def recheck(claim_id: int):
    service.run_checks(con(), ref(), claim_id)
    return claim_detail(claim_id)


class AnchorBody(BaseModel):
    acknowledge_review: bool = False
    force: bool = False


@app.post("/api/claims/{claim_id}/anchor")
def anchor(claim_id: int, body: AnchorBody):
    res = service.anchor(con(), ref(), claim_id, body.acknowledge_review, body.force)
    return {"result": res, "claim": claim_detail(claim_id)}


class ChallengeBody(BaseModel):
    reason: str


@app.post("/api/claims/{claim_id}/challenge")
def challenge(claim_id: int, body: ChallengeBody):
    res = service.challenge(con(), claim_id, body.reason)
    return {"result": res, "claim": claim_detail(claim_id)}


class ResolveBody(BaseModel):
    upheld: bool
    note: str = ""


@app.post("/api/claims/{claim_id}/resolve")
def resolve(claim_id: int, body: ResolveBody):
    res = service.resolve(con(), claim_id, body.upheld, body.note)
    return {"result": res, "claim": claim_detail(claim_id)}


@app.post("/api/claims/{claim_id}/withdraw")
def withdraw(claim_id: int):
    res = service.withdraw(con(), claim_id)
    return {"result": res, "claim": claim_detail(claim_id)}


@app.post("/api/verify")
async def verify(
    ref_: str | None = Form(None, alias="ref"),
    chain_claim_id: int | None = Form(None),
    claimant: str | None = Form(None),
    salt: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    up = None
    if file is not None:
        up = service.Upload(Path(file.filename or "upload").name, await file.read(settings.max_upload_bytes + 1), file.content_type)
    return service.verify(con(), ref_, chain_claim_id, up, salt, claimant)


@app.get("/api/claims/{claim_id}/report.json")
def report_json(claim_id: int):
    d = claim_detail(claim_id)
    d.pop("unit_strips", None)
    return JSONResponse(d, headers={"Content-Disposition": f'attachment; filename="{d["ref"]}-integrity-report.json"'})


@app.get("/api/claims/{claim_id}/report.html", response_class=HTMLResponse)
def report_html(claim_id: int):
    d = claim_detail(claim_id)
    e = html.escape
    rows = "".join(
        f"<tr><td class=mono>{e(b['namespace'])}</td><td class=mono>{b['unit_start']:,}–{b['unit_end']:,}</td><td>{b['quantity']:,}</td><td>{e(b['project_id'] or '')}</td><td>{e(b['vintage'] or '')}</td></tr>"
        for b in d["blocks"])
    finds = "".join(
        f"<div class='f {e(f['severity'])}'><b>{e(f['rule_id'])} · {e(f['severity'].upper())}</b> — {e(f['title'])}<p>{e(f['explanation'])}</p>"
        + (f"<p><i>Uncertain:</i> {e(f['uncertainty'])}</p>" if f["uncertainty"] else "") + (f"<p><i>Next action:</i> {e(f['next_action'])}</p>" if f["next_action"] else "") + "</div>"
        for f in d["findings"])
    events = "".join(f"<li>{e(ev['created_at'])} — {e(ev['kind'])}{' · tx ' + e(ev['tx_hash']) if ev['tx_hash'] else ''}</li>" for ev in d["events"])
    chain = (f"Anchored as on-chain claim #{d['chain_claim_id']} in block {d['block_number']} (chain id {d['chain_id']}, contract {e(d['contract_address'] or '')}), tx {e(d['tx_hash'] or '')}."
             if d["chain_claim_id"] else "Not anchored on the ledger.")
    local_note = " Chain id 31337 is a local development network, not a public blockchain." if d.get("chain_id") == 31337 else ""
    page = f"""<!doctype html><html><head><meta charset=utf-8><title>{e(d['ref'])} — OnceOnly integrity report</title>
<style>body{{font:14px/1.5 system-ui,sans-serif;max-width:860px;margin:32px auto;color:#14211b}}.mono{{font-family:ui-monospace,monospace}}table{{border-collapse:collapse;width:100%}}td,th{{border-bottom:1px solid #ddd;padding:6px;text-align:left}}
.f{{border-left:4px solid #999;padding:6px 12px;margin:10px 0;background:#fafaf7}}.blocking{{border-color:#b42318}}.review{{border-color:#b54708}}.pass{{border-color:#067647}}.banner{{background:#fff4d6;padding:8px 12px;border-radius:6px}}</style></head><body>
<h1>Claim integrity report — {e(d['ref'])}</h1>
{"<p class=banner><b>SYNTHETIC DEMO CLAIM.</b> Claimant and certificate are fictional; registry records are real public data (Berkeley VROD 2026-08, CC BY 4.0).</p>" if d['synthetic'] else ""}
<p><b>Claimant:</b> {e(d['claimant'])} · <b>Period:</b> {e(d['period'] or '—')} · <b>Status:</b> {e(d['status'])} · <b>Verdict:</b> {e(d['verdict'] or '')}</p>
<p><b>Ledger:</b> {chain}{local_note}</p>
<p class=mono>Evidence commitment: {e(d['evidence_hash'] or '')}<br>Report hash: {e(d['report_hash'] or '')}<br>Claimant commitment: {e(d['claimant_commitment'])}</p>
<h2>Claimed unit ranges ({d['total_units']:,} units)</h2><table><tr><th>Namespace</th><th>Units</th><th>Qty</th><th>Project</th><th>Vintage</th></tr>{rows}</table>
<h2>Findings</h2>{finds}<h2>Audit trail</h2><ul>{events}</ul>
<p style="color:#666;font-size:12px">OnceOnly checks whether the same registry units are claimed more than once and reconciles serials with a public registry snapshot. It does not assess credit quality, additionality or permanence, and a finding is not a determination of fraud.</p></body></html>"""
    return HTMLResponse(page)


@app.get("/api/reference/lookup")
def reference_lookup(serial: str):
    from .serials import SerialError, parse_serial

    try:
        b = parse_serial(serial)
    except SerialError as e:
        raise HTTPException(422, str(e))
    r = ref()
    if r is None:
        raise HTTPException(503, "Reference index not loaded")
    cov = r.coverage(b.registry, b.batch_id, b.unit_start, b.unit_end)
    return {"block": b.to_dict(), "retired_units": cov.retired_units, "issued_units": cov.issued_units, "records": cov.records[:20], "scope": r.scope}


@app.get("/api/reference/samples")
def reference_samples(limit: int = 12):
    r = ref()
    if r is None:
        raise HTTPException(503, "Reference index not loaded")
    return {"scope": r.scope, "records": r.sample_retirements(min(limit, 50))}


@app.get("/api/rules")
def rules():
    return RULES


@app.get("/api/eval")
def evaluation():
    d = ROOT / "eval/results"
    out = {}
    for name in ("latest.json", "registry_audit.json"):
        p = d / name
        if p.exists():
            out[name.removesuffix(".json")] = json.loads(p.read_text())
    return out


# ------------------------------------------------------------- demo documents

DEMO_DIR = ROOT / "data/demo"


def _demo_manifest() -> list[dict]:
    p = DEMO_DIR / "manifest.json"
    return json.loads(p.read_text()) if p.exists() else []


@app.get("/api/samples")
def samples():
    return _demo_manifest()


@app.get("/api/samples/{name}")
def sample_file(name: str):
    from fastapi.responses import FileResponse

    allowed = {m["file"] for m in _demo_manifest()}
    if name not in allowed:  # only files listed in the manifest; no path traversal
        raise HTTPException(404, "Unknown sample")
    media = "application/pdf" if name.endswith(".pdf") else "text/plain"
    return FileResponse(DEMO_DIR / name, media_type=media, filename=name)
