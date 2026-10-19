"""Rules + service tests against the committed real-data demo subset (no chain needed)."""
import pytest

SERIAL = "18453-{a}-{b}-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0"  # real VROD retirement block 896309560-896329558


def cert(name, a, b, qty=None):
    return f"Retired on behalf of: {name}\nSerial Number: {SERIAL.format(a=a, b=b)}\nQuantity: {qty if qty is not None else b - a + 1:,}"


@pytest.fixture()
def svc(tmp_env):
    from app import db, service
    from app.reference import Reference

    con = db.connect()
    ref = Reference.open()
    assert ref is not None and ref.scope == "demo-subset"
    return service, db, con, ref


def make(svc, name, text, **kw):
    service, db, con, ref = svc
    cid = service.create_claim(con, ref, claimant=name, claim_date=None, period="FY2025", statement=None, pasted_text=text, uploads=[], **kw)
    rows = con.execute("SELECT rule_id, severity FROM findings WHERE claim_id=?", (cid,)).fetchall()
    return cid, {r[0]: r[1] for r in rows}


def mark_anchored(svc, cid):
    _, _, con, _ = svc
    con.execute("UPDATE claims SET status='anchored' WHERE id=?", (cid,))
    con.commit()


def test_clean_claim_reconciles_with_real_registry_record(svc):
    cid, f = make(svc, "Northwind Foods (SYNTHETIC)", cert("Northwind Foods (SYNTHETIC)", 896309560, 896319559))
    assert f.get("REG-000") == "pass"
    assert f.get("BEN-002") == "info"  # this real retirement records no beneficiary
    assert "DUP-001" not in f


def test_partial_overlap_is_blocking_double_use(svc):
    a, _ = make(svc, "A Co (SYNTHETIC)", cert("A", 896309560, 896319559))
    mark_anchored(svc, a)
    _, f = make(svc, "B Co (SYNTHETIC)", cert("B", 896315001, 896322000))
    assert f["DUP-001"] == "blocking"


def test_adjacent_range_is_not_double_use(svc):
    a, _ = make(svc, "A Co (SYNTHETIC)", cert("A", 896309560, 896319559))
    mark_anchored(svc, a)
    _, f = make(svc, "B Co (SYNTHETIC)", cert("B", 896319560, 896329558))
    assert "DUP-001" not in f and f["REG-000"] == "pass"


def test_unanchored_drafts_do_not_reserve_units(svc):
    make(svc, "A Co (SYNTHETIC)", cert("A", 896309560, 896319559))
    _, f = make(svc, "B Co (SYNTHETIC)", cert("B", 896309560, 896319559))
    assert "DUP-001" not in f  # only anchored/challenged claims lock units


def test_quantity_mismatch_and_unknown_serial(svc):
    _, f = make(svc, "A (SYNTHETIC)", cert("A", 896309560, 896319559, qty=12000))
    assert f["SER-002"] == "review"
    _, f2 = make(svc, "A (SYNTHETIC)", f"Serial: 99999-1-500-VCS-VCU-1-VER-IN-1-1904-01012024-31122024-0")
    assert f2["REG-001"] == "review"


def test_range_spanning_adjacent_real_records_is_fully_covered(svc):
    _, f = make(svc, "A (SYNTHETIC)", cert("A", 896329000, 896330000))  # crosses two adjacent real retirements
    assert f["REG-000"] == "pass"


def test_range_crossing_a_retirement_gap_is_partial(svc):
    _, f = make(svc, "A (SYNTHETIC)", cert("A", 896333000, 896334000))  # real gap starts at 896333687
    assert f["REG-003"] == "review"


def test_issued_but_not_retired(svc):
    _, f = make(svc, "A (SYNTHETIC)", cert("A", 896340000, 896341000))  # inside issuance, no retirement
    assert f["REG-002"] == "review"


def test_no_serials_blocks_and_explains(svc):
    _, f = make(svc, "A (SYNTHETIC)", "We retired 8,000 tCO2e of VCS credits from project 1904, vintage 2024 to offset our 2025 travel.")
    assert f["EVD-001"] == "blocking"


def test_reused_document_flagged(svc):
    t = cert("A", 896309560, 896310000)
    make(svc, "A (SYNTHETIC)", t)
    _, f = make(svc, "Other (SYNTHETIC)", t)
    assert f["DUP-002"] == "review"


def test_input_validation(svc):
    service, db, con, ref = svc
    with pytest.raises(service.ServiceError) as e:
        service.create_claim(con, ref, claimant=" ", claim_date=None, period=None, statement=None, pasted_text="x", uploads=[])
    assert e.value.status == 422
    with pytest.raises(service.ServiceError) as e:
        service.create_claim(con, ref, claimant="A", claim_date=None, period=None, statement=None, pasted_text=None,
                             uploads=[service.Upload("evil.exe", b"MZ")])
    assert e.value.status == 415


def test_anchor_without_chain_is_503_not_silent(svc):
    service, db, con, ref = svc
    cid, _ = make(svc, "A (SYNTHETIC)", cert("A", 896309560, 896310000))
    with pytest.raises(service.ServiceError) as e:
        service.anchor(con, ref, cid, acknowledge_review=True)
    assert e.value.status == 503


def test_blocked_claim_cannot_anchor(svc):
    service, db, con, ref = svc
    a, _ = make(svc, "A (SYNTHETIC)", cert("A", 896309560, 896319559))
    mark_anchored(svc, a)
    b, _ = make(svc, "B (SYNTHETIC)", cert("B", 896315001, 896322000))
    with pytest.raises(service.ServiceError) as e:
        service.anchor(con, ref, b)
    assert e.value.status == 409 and "blocking" in e.value.detail


def test_api_health_and_create(tmp_env):
    from fastapi.testclient import TestClient

    from app.main import app

    c = TestClient(app)
    h = c.get("/api/health").json()
    assert h["reference"]["loaded"] and not h["chain"]["available"]
    r = c.post("/api/claims", data={"claimant": "Northwind (SYNTHETIC)", "text": cert("N", 896309560, 896310000)})
    assert r.status_code == 201
    body = r.json()
    assert body["ref"] == "OO-2026-0001" and body["blocks"][0]["quantity"] == 441
    assert body["unit_strips"][0]["records"][0]["unit_start"] == 896309560
    assert c.get(f"/api/claims/{body['id']}/report.html").status_code == 200
    assert c.post("/api/claims", data={"claimant": "X"}).status_code == 422
    sha = body["evidence"][0]["sha256"]
    hits = c.get(f"/api/evidence/{sha}").json()["claims"]
    assert [h["ref"] for h in hits] == ["OO-2026-0001"]
    assert c.get("/api/evidence/" + "0" * 64).json()["claims"] == []
    assert c.get("/api/evidence/not-a-hash").status_code == 422
