import pytest

from app.serials import SerialError, find_serials, overlap, parse_serial

VERRA = "18453-896309560-896329558-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0"
VERRA_LEGACY = "7056-367376734-367376744-VCU-263-VER-ID-14-674-01012016-31122016-1"
GOLD = "GS1-1-XZ-GS12303-17-2022-30775-1077-1127"
GOLD_LEGACY = "GS1-1-VN-1083-4-2011-364-7073-10000"


def test_verra_current():
    b = parse_serial(VERRA)
    assert (b.registry, b.batch_id, b.unit_start, b.unit_end) == ("VCS", "18453", 896309560, 896329558)
    assert b.quantity == 19999
    assert b.project_id == "1904" and b.vintage == "2024" and b.country == "IN"
    assert b.namespace == "VCS:18453"


def test_verra_legacy_and_multi_year_vintage():
    b = parse_serial(VERRA_LEGACY)
    assert b.project_id == "674" and b.quantity == 11
    b2 = parse_serial("11155-284947290-284997289-VCS-VCU-576-VER-UG-14-2339-01022015-01022020-1")
    assert b2.vintage == "2015-2020" and b2.quantity == 50000


def test_gold_both_formats():
    g = parse_serial(GOLD)
    assert (g.registry, g.batch_id, g.unit_start, g.unit_end) == ("GS", "GS1-1-XZ-GS12303-17-2022-30775", 1077, 1127)
    assert g.project_id == "12303" and g.vintage == "2022" and g.quantity == 51
    gl = parse_serial(GOLD_LEGACY)
    assert gl.project_id == "1083" and gl.quantity == 2928


def test_rejects_garbage_and_inverted_ranges():
    with pytest.raises(SerialError):
        parse_serial("not-a-serial")
    with pytest.raises(SerialError):
        parse_serial("18453-500-400-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0")


def test_find_serials_survives_layout_damage():
    text = (
        "Serial Numbers:\n18453-896309560-\n896329558-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0\n"
        "and GS1-1-XZ-GS12303-17-2022-30775 – 1077 – 1127 retired."
    )
    found = find_serials(text)
    assert [b.registry for b in found] == ["VCS", "GS"]
    assert found[0].unit_end == 896329558
    assert found[1].unit_start == 1077


def test_find_serials_dedupes_repeats():
    assert len(find_serials(f"{VERRA} ... {VERRA}")) == 1


def test_overlap_requires_same_namespace():
    a = parse_serial("100-1-1000-VCS-VCU-1-VER-IN-1-1-01012020-31122020-0")
    b = parse_serial("100-900-1500-VCS-VCU-1-VER-IN-1-1-01012020-31122020-0")
    c = parse_serial("101-900-1500-VCS-VCU-1-VER-IN-1-1-01012020-31122020-0")
    d = parse_serial("100-1001-1500-VCS-VCU-1-VER-IN-1-1-01012020-31122020-0")
    assert overlap(a, b) == (900, 1000)
    assert overlap(a, c) is None  # same numbers, different batch => different units
    assert overlap(a, d) is None  # adjacent


def test_verra_2025_format_without_scope_and_underscore_dates():
    b = parse_serial("19908-1140245440-1140246309-VCS-VCU-1491-VER-BR-2551-01012023-31122023-1")
    assert b.project_id == "2551" and b.vintage == "2023" and b.quantity == 870
    c = parse_serial("1247-54685576-54747845-VCU-008-CDC-IN-1-92-16062010_30062010-0")
    assert c.project_id == "92" and c.vintage == "2010"
