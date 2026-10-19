"""OnceOnly evaluation. Reproducible: `make eval` (seeded; reads real registry records).

A. Double-use detection on labelled claim pairs
   Each case = an anchored claim + a new claim built from REAL registry retirement records
   (Berkeley VROD 2026-08). Claimants are synthetic. Ground truth is defined by construction:
   double use <=> the two claims share at least one unit in the same (registry, batch).
   Methods compared:
     * OnceOnly: the production rules engine (DUP-001), run through service.create_claim
     * Baseline H: flag if any serial string or evidence document hash matches exactly
     * Baseline N: unit-number interval overlap ignoring the batch (shows why the namespace matters)
     * Contract: the same pairs replayed on a fresh ClaimLedger deployment (if a local chain is up)
B. Serial extraction from labelled document variants
     * deterministic parser; LLM extractor only if ANTHROPIC_API_KEY is configured

Writes eval/results/latest.json and eval/results/latest.md
"""
from __future__ import annotations

import json
import os
import random
import sqlite3
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
SEED = 20261019
CASES_PER_CATEGORY = 30

CATEGORIES = {
    "exact_duplicate": ("Same serial, same units", True),
    "reformatted_duplicate": ("Same units, serial reformatted (line break, spaces, dashes)", True),
    "partial_overlap": ("Partial overlap, different serial strings", True),
    "contained": ("New range inside an existing claim", True),
    "superset": ("New range contains an existing claim", True),
    "reused_document": ("Same evidence document resubmitted", True),
    "adjacent": ("Adjacent ranges, no shared unit", False),
    "disjoint_same_batch": ("Same batch, disjoint ranges", False),
    "same_numbers_other_batch": ("Same unit numbers in a different batch", False),
}


def pick_records(n: int) -> list[dict]:
    """Real Verra retirement records with >= 400 units and distinct batches."""
    ref = ROOT / "data/reference/registry_full.sqlite"
    if not ref.exists():
        sys.exit("Full registry index missing: run `make data` first.")
    con = sqlite3.connect(ref)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT * FROM records WHERE kind='retirement' AND registry='VCS' AND quantity >= 400 AND quantity <= 200000 "
        "GROUP BY batch_id ORDER BY batch_id"
    ).fetchall()
    rng = random.Random(SEED)
    rows = [dict(r) for r in rows]
    rng.shuffle(rows)
    return rows[:n]


def serial_for(rec: dict, a: int, b: int, batch: str | None = None) -> str:
    parts = rec["serial"].split("-")
    parts[0] = batch or parts[0]
    parts[1], parts[2] = str(a), str(b)
    return "-".join(parts)


def reformat(serial: str, rng: random.Random) -> str:
    p = serial.split("-")
    style = rng.randrange(3)
    if style == 0:
        cut = len(p) // 2
        return "-".join(p[:cut]) + "-\n" + "-".join(p[cut:])
    if style == 1:
        return " - ".join(p)
    return "–".join(p)  # en dash


def cert(name: str, serials: list[str]) -> str:
    lines = [f"Allocation statement (SYNTHETIC EVAL) for {name}"] + [f"Serial Number: {s}" for s in serials]
    return "\n".join(lines)


def build_cases() -> list[dict]:
    rng = random.Random(SEED)
    cats = list(CATEGORIES)
    recs = pick_records(len(cats) * CASES_PER_CATEGORY * 2)
    cases, i = [], 0
    for cat in cats:
        for k in range(CASES_PER_CATEGORY):
            r, other = recs[i], recs[i + 1]
            i += 2
            s, e = r["unit_start"], r["unit_end"]
            q = e - s + 1
            third = max(1, q // 3)
            a_rng = (s, s + third - 1)  # existing claim: first third of the retirement
            existing_text = cert("Existing Co (SYNTHETIC)", [serial_for(r, *a_rng)])
            if cat == "exact_duplicate":
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, *a_rng)])
            elif cat == "reformatted_duplicate":
                new_text = cert("New Co (SYNTHETIC)", [reformat(serial_for(r, *a_rng), rng)])
            elif cat == "partial_overlap":
                lo = a_rng[0] + rng.randrange(1, max(2, third))
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, lo, min(e, lo + third))])
            elif cat == "contained":
                lo = a_rng[0] + rng.randrange(0, max(1, third // 2))
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, lo, min(a_rng[1], lo + max(1, third // 3)))])
            elif cat == "superset":
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, s, min(e, a_rng[1] + third))])
            elif cat == "reused_document":
                new_text = existing_text
            elif cat == "adjacent":
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, a_rng[1] + 1, min(e, a_rng[1] + third))])
            elif cat == "disjoint_same_batch":
                lo = a_rng[1] + 1 + rng.randrange(1, max(2, third))
                new_text = cert("New Co (SYNTHETIC)", [serial_for(r, min(lo, e), e)])
            elif cat == "same_numbers_other_batch":
                # identical unit numbers, but in another real batch (a different set of units)
                new_text = cert("New Co (SYNTHETIC)", [serial_for(other, *a_rng)])
            cases.append({"category": cat, "truth": CATEGORIES[cat][1], "existing": existing_text, "new": new_text})
    return cases


def baseline_hash(existing: str, new: str) -> bool:
    from app.serials import find_serials

    ex = {b.serial for b in find_serials(existing)}
    nw = {s.strip() for s in _raw_serial_lines(new)}
    return bool(ex & nw) or existing.encode() == new.encode()


def _raw_serial_lines(text: str) -> list[str]:
    return [ln.split(":", 1)[1].strip() for ln in text.splitlines() if ln.startswith("Serial Number:")]


def baseline_numbers_only(existing: str, new: str) -> bool:
    from app.serials import find_serials

    A, B = find_serials(existing), find_serials(new)
    return any(a.unit_start <= b.unit_end and b.unit_start <= a.unit_end for a in A for b in B)


def onceonly(existing: str, new: str) -> bool:
    os.environ["ONCEONLY_REFERENCE_MODE"] = "full"
    from app import db, service
    from app.reference import Reference

    with tempfile.TemporaryDirectory() as d:
        con = db.connect(Path(d) / "eval.sqlite")
        from app.config import settings
        object.__setattr__(settings, "evidence_dir", Path(d) / "ev")
        ref = REF
        a = service.create_claim(con, ref, claimant="Existing Co (SYNTHETIC)", claim_date=None, period=None, statement=None, pasted_text=existing, uploads=[], use_llm=False)
        con.execute("UPDATE claims SET status='anchored' WHERE id=?", (a,))
        con.commit()
        b = service.create_claim(con, ref, claimant="New Co (SYNTHETIC)", claim_date=None, period=None, statement=None, pasted_text=new, uploads=[], use_llm=False)
        rules = {r[0] for r in con.execute("SELECT rule_id FROM findings WHERE claim_id=?", (b,))}
        con.close()
    return "DUP-001" in rules or "DUP-002" in rules


def metrics(pred: list[bool], truth: list[bool]) -> dict:
    tp = sum(p and t for p, t in zip(pred, truth))
    fp = sum(p and not t for p, t in zip(pred, truth))
    fn = sum((not p) and t for p, t in zip(pred, truth))
    tn = sum((not p) and (not t) for p, t in zip(pred, truth))
    prec = tp / (tp + fp) if tp + fp else None
    rec = tp / (tp + fn) if tp + fn else None
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn, "precision": prec, "recall": rec}


def contract_replay(cases: list[dict]) -> dict:
    """Replay each pair on a fresh ClaimLedger deployment; truth = the second registration reverts."""
    try:
        from eth_account import Account
        from web3 import Web3

        from app.chain import b32, namespace, ranges_with_hints
        from app.serials import find_serials
    except Exception as e:  # pragma: no cover
        return {"status": f"skipped ({e})"}
    w3 = Web3(Web3.HTTPProvider(os.environ.get("CHAIN_RPC_URL", "http://127.0.0.1:8545")))
    if not w3.is_connected():
        return {"status": "skipped (no local chain on 127.0.0.1:8545; run `make chain`)"}
    art = json.loads((ROOT / "contracts/artifacts/contracts/ClaimLedger.sol/ClaimLedger.json").read_text())
    acct = Account.from_key("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")  # public Hardhat dev key #0
    if w3.eth.chain_id != 31337:
        return {"status": "skipped (refusing to run against a non-local chain)"}

    def send(tx):
        tx.update({"from": acct.address, "nonce": w3.eth.get_transaction_count(acct.address), "chainId": 31337})
        signed = acct.sign_transaction(tx)
        h = w3.eth.send_raw_transaction(signed.raw_transaction)
        return w3.eth.wait_for_transaction_receipt(h)

    Factory = w3.eth.contract(abi=art["abi"], bytecode=art["bytecode"])
    rcpt = send(Factory.constructor().build_transaction({"from": acct.address}))
    c = w3.eth.contract(address=rcpt.contractAddress, abi=art["abi"])
    preds, gas = [], []
    for i, case in enumerate(cases):
        A, B = find_serials(case["existing"]), find_serials(case["new"])
        rA = [(namespace(b.registry, b.batch_id), b.unit_start, b.unit_end) for b in A]
        rB = [(namespace(b.registry, b.batch_id), b.unit_start, b.unit_end) for b in B]
        r = send(c.functions.registerClaim(b32(f"eval-{i}-a"), ranges_with_hints(c, rA), b32("x"), b32("e"), b32("r")).build_transaction({"from": acct.address}))
        gas.append(r.gasUsed)
        try:
            hB = ranges_with_hints(c, rB)
            c.functions.registerClaim(b32(f"eval-{i}-b"), hB, b32("x"), b32("e"), b32("r")).call({"from": acct.address})
            rejected = False
            send(c.functions.registerClaim(b32(f"eval-{i}-b"), hB, b32("x"), b32("e"), b32("r")).build_transaction({"from": acct.address}))
        except Exception as e:
            if "BadHint" in str(e):
                raise  # a hint error would be an adapter bug, not a detection result
            rejected = True
        preds.append(rejected)
    gas.sort()
    return {"status": "ok", "contract": rcpt.contractAddress, "preds": preds, "register_gas_median": gas[len(gas) // 2]}


# ------------------------------------------------------------------ extraction

def extraction_cases() -> list[dict]:
    rng = random.Random(SEED + 1)
    recs = pick_records(400)[-60:]
    variants = ["canonical", "wrapped", "spaced_dashes", "en_dash", "two_blocks", "table_columns", "prose_range", "ocr_letter_o"]
    out = []
    for i, r in enumerate(recs):
        v = variants[i % len(variants)]
        s, e = r["unit_start"], min(r["unit_end"], r["unit_start"] + 999)
        ser = serial_for(r, s, e)
        truth = [(r["batch_id"], s, e)]
        if v == "canonical":
            text = f"Serial Number: {ser}\nQuantity: {e - s + 1:,}"
        elif v == "wrapped":
            p = ser.split("-")
            text = "Serial Number: " + "-".join(p[:5]) + "-\n" + "-".join(p[5:])
        elif v == "spaced_dashes":
            text = "Serial: " + " - ".join(ser.split("-"))
        elif v == "en_dash":
            text = "Serial: " + "–".join(ser.split("-"))
        elif v == "two_blocks":
            s2 = e + 1
            e2 = min(r["unit_end"], s2 + 499)
            if e2 >= s2:
                text = f"Block 1: {ser}\nBlock 2: {serial_for(r, s2, e2)}"
                truth.append((r["batch_id"], s2, e2))
            else:
                text = f"Block 1: {ser}"
        elif v == "table_columns":
            p = ser.split("-")
            text = f"Batch\tFrom\tTo\tRest\n{p[0]}\t{p[1]}\t{p[2]}\t{'-'.join(p[3:])}"
        elif v == "prose_range":
            text = f"We retired units {s:,} to {e:,} of Verra issuance batch {r['batch_id']} (project {r['project_id']}, vintage {r['vintage']})."
        elif v == "ocr_letter_o":
            text = "Serial Number: " + ser.replace("0", "O", 2)
        out.append({"variant": v, "text": text, "truth": truth})
    return out


def score_extraction(cases, extractor) -> dict:
    tp = fp = fn = exact = 0
    per_variant: dict[str, list[int]] = {}
    for c in cases:
        got = {(b.batch_id, b.unit_start, b.unit_end) for b in extractor(c["text"])}
        want = set(c["truth"])
        tp += len(got & want)
        fp += len(got - want)
        fn += len(want - got)
        ok = got == want
        exact += ok
        per_variant.setdefault(c["variant"], [0, 0])
        per_variant[c["variant"]][0] += ok
        per_variant[c["variant"]][1] += 1
    return {
        "status": "ok", "n": len(cases), "doc_exact": exact / len(cases),
        "block_precision": tp / (tp + fp) if tp + fp else None, "block_recall": tp / (tp + fn) if tp + fn else None,
        "per_variant": {k: {"correct": v[0], "n": v[1]} for k, v in per_variant.items()},
    }


def main():
    t0 = time.time()
    global REF
    os.environ["ONCEONLY_REFERENCE_MODE"] = "full"
    os.environ.setdefault("ONCEONLY_LLM", "off")
    from app.reference import Reference

    REF = Reference.open()
    cases = build_cases()
    truth = [c["truth"] for c in cases]
    print(f"Double-use cases: {len(cases)}")
    p_once = [onceonly(c["existing"], c["new"]) for c in cases]
    p_hash = [baseline_hash(c["existing"], c["new"]) for c in cases]
    p_num = [baseline_numbers_only(c["existing"], c["new"]) for c in cases]
    chain = contract_replay(cases)

    by_cat = {}
    for cat, (label, t) in CATEGORIES.items():
        idx = [i for i, c in enumerate(cases) if c["category"] == cat]
        by_cat[cat] = {
            "label": label, "truth": t, "n": len(idx),
            "onceonly_correct": sum(p_once[i] == t for i in idx),
            "baseline_correct": sum(p_hash[i] == t for i in idx),
            "numbers_only_correct": sum(p_num[i] == t for i in idx),
            **({"contract_correct": sum(chain["preds"][i] == t for i in idx)} if chain.get("status") == "ok" else {}),
        }

    from app.extraction import deterministic_extract, extract, llm_available

    ex_cases = extraction_cases()
    methods = {"parser": {"label": "Deterministic parser", **score_extraction(ex_cases, lambda t: deterministic_extract(t).blocks)}}
    if llm_available():
        methods["parser_plus_llm"] = {"label": "Parser + AI extraction (cross-checked)", **score_extraction(ex_cases, lambda t: extract(t, use_llm=True).blocks)}
    else:
        methods["parser_plus_llm"] = {"label": "Parser + AI extraction (cross-checked)", "status": "not run (no ANTHROPIC_API_KEY)"}

    result = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seed": SEED,
        "runtime_seconds": None,
        "double_use": {
            "description": (f"{len(cases)} labelled claim pairs ({CASES_PER_CATEGORY} per case type). Each pair cites real Verra retirement records "
                            "(Berkeley VROD 2026-08); claimants are synthetic. Positive = the new claim shares at least one unit with an anchored claim."),
            "n": len(cases), "positives": sum(truth), "negatives": len(truth) - sum(truth),
            "onceonly": metrics(p_once, truth),
            "baseline": metrics(p_hash, truth),
            "numbers_only": metrics(p_num, truth),
            "contract": ({**metrics(chain["preds"], truth), "register_gas_median": chain["register_gas_median"]} if chain.get("status") == "ok" else {"status": chain.get("status")}),
            "contract_agrees_with_engine": (sum(a == b for a, b in zip(chain["preds"], p_once)) / len(cases)) if chain.get("status") == "ok" else None,
            "by_category": by_cat,
        },
        "extraction": {
            "description": (f"{len(ex_cases)} synthetic document snippets citing real serial ranges, in 8 layouts: canonical, wrapped across lines, spaced dashes, "
                            "en dashes, two blocks, table columns, prose range description, OCR letter-O errors. Truth = exact (batch, start, end) blocks."),
            "methods": methods,
        },
    }
    result["runtime_seconds"] = round(time.time() - t0, 1)
    out = ROOT / "eval/results"
    out.mkdir(parents=True, exist_ok=True)
    (out / "latest.json").write_text(json.dumps(result, indent=2))
    (out / "latest.md").write_text(to_markdown(result))
    print(to_markdown(result))


def _f(x):
    return "—" if x is None else f"{x:.3f}"


def to_markdown(r: dict) -> str:
    d = r["double_use"]
    L = [f"# OnceOnly evaluation results\n\nGenerated {r['generated_at']} (seed {r['seed']}, {r['runtime_seconds']} s). Reproduce with `make eval`.\n",
         "## A. Double-use detection\n", d["description"] + "\n",
         "| Method | Precision | Recall | TP | FP | FN | TN |", "|---|---|---|---|---|---|---|"]
    for k, label in [("onceonly", "OnceOnly rules engine (DUP-001/002)"), ("contract", "ClaimLedger contract (revert on 2nd registration)"),
                     ("baseline", "Baseline: exact serial string / document hash"), ("numbers_only", "Ablation: interval overlap ignoring batch")]:
        m = d[k]
        if "tp" in m:
            L.append(f"| {label} | {_f(m['precision'])} | {_f(m['recall'])} | {m['tp']} | {m['fp']} | {m['fn']} | {m['tn']} |")
        else:
            L.append(f"| {label} | {m.get('status')} | | | | | |")
    L += ["", "| Case type | n | Truth | OnceOnly | Contract | Baseline | Numbers-only |", "|---|---|---|---|---|---|---|"]
    for v in d["by_category"].values():
        L.append(f"| {v['label']} | {v['n']} | {'double use' if v['truth'] else 'not double use'} | {v['onceonly_correct']}/{v['n']} | "
                 f"{str(v.get('contract_correct', '—')) + '/' + str(v['n']) if 'contract_correct' in v else '—'} | {v['baseline_correct']}/{v['n']} | {v['numbers_only_correct']}/{v['n']} |")
    if d.get("contract_agrees_with_engine") is not None:
        L.append(f"\nContract and rules engine agree on {d['contract_agrees_with_engine'] * 100:.1f}% of cases. Median gas for a single-range registration: {d['contract']['register_gas_median']:,}.")
    e = r["extraction"]
    L += ["\n## B. Serial extraction\n", e["description"] + "\n", "| Extractor | Docs | Exact docs | Block precision | Block recall |", "|---|---|---|---|---|"]
    for m in e["methods"].values():
        if m.get("status") == "ok":
            L.append(f"| {m['label']} | {m['n']} | {m['doc_exact'] * 100:.1f}% | {_f(m['block_precision'])} | {_f(m['block_recall'])} |")
        else:
            L.append(f"| {m['label']} | {m['status']} | | | |")
    pv = e["methods"]["parser"]["per_variant"]
    L += ["", "Parser by layout: " + ", ".join(f"{k} {v['correct']}/{v['n']}" for k, v in pv.items()) + "."]
    L += ["\n## Limitations\n", "- Claim pairs and documents are synthetic; serial ranges come from real registry records.",
          "- Ground truth is defined by construction, so these results measure detection logic, not real-world prevalence of double use.",
          "- Contract replay runs on a local Hardhat chain."]
    return "\n".join(L) + "\n"


REF = None

if __name__ == "__main__":
    main()
