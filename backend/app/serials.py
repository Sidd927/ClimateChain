"""Deterministic parsing of registry serial numbers into unit ranges.

A serial block identifies a contiguous range of units inside one issuance batch.
Unit numbers are only unique *within* a batch (measured on Berkeley VROD 2026-08:
Verra unit numbers restart across batches), so every block is keyed by
``(registry, batch_id)`` — the namespace used on chain.

Supported formats (verified against VROD registry files, see scripts/audit_registry.py):

* Verra VCS:  ``18453-896309560-896329558-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0``
* Verra legacy (no "VCS-" segment): ``7056-367376734-367376744-VCU-263-VER-ID-14-674-01012016-31122016-1``
* Gold Standard: ``GS1-1-XZ-GS12303-17-2022-30775-1077-1127``
* Gold Standard legacy: ``GS1-1-VN-1083-4-2011-364-7073-10000``
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass

_DASHES = "‐‑‒–—−"

VERRA_RE = re.compile(
    r"(?P<batch>\d{1,7})-(?P<start>\d{1,12})-(?P<end>\d{1,12})-(?:VCS-)?VCU-(?P<seq>\d+)-(?P<org>[A-Z0-9]{2,5})"
    r"-(?P<country>[A-Z]{2})(?:-(?P<scope>\d{1,2}))?-(?P<project>\d{1,6})-(?P<vstart>\d{8})[-_](?P<vend>\d{8})-(?P<flag>\d)"
)
GOLD_RE = re.compile(
    r"(?P<prefix>GS\d+-\d+-(?P<country>[A-Z]{2})-(?:GS)?(?P<project>\d{1,6})-(?P<scope>\d{1,2})-(?P<vintage>\d{4})-(?P<batch>\d{1,7}))"
    r"-(?P<start>\d{1,12})-(?P<end>\d{1,12})"
)


@dataclass(frozen=True)
class SerialBlock:
    registry: str  # "VCS" | "GS"
    batch_id: str
    unit_start: int
    unit_end: int
    serial: str
    project_id: str | None = None
    vintage: str | None = None
    country: str | None = None

    @property
    def quantity(self) -> int:
        return self.unit_end - self.unit_start + 1

    @property
    def namespace(self) -> str:
        return f"{self.registry}:{self.batch_id}"

    def to_dict(self) -> dict:
        d = asdict(self)
        d["quantity"] = self.quantity
        d["namespace"] = self.namespace
        return d


class SerialError(ValueError):
    pass


def normalize(text: str) -> str:
    """Undo common layout damage: unicode dashes, spaces/newlines around hyphens."""
    for d in _DASHES:
        text = text.replace(d, "-")
    text = re.sub(r"\s*-\s*\n\s*", "-", text)  # serial wrapped after a hyphen
    text = re.sub(r"\s*\n\s*-\s*", "-", text)  # wrapped before a hyphen
    text = re.sub(r"(?<=[0-9A-Z])\s+-\s+(?=[0-9A-Z])", "-", text)  # "123 - 456"
    return text


def _vintage_from_verra(vstart: str, vend: str) -> str:
    y1, y2 = vstart[4:], vend[4:]
    return y2 if y1 == y2 else f"{y1}-{y2}"


def _from_match(m: re.Match, registry: str) -> SerialBlock:
    start, end = int(m.group("start")), int(m.group("end"))
    if start < 1 or end < start:
        raise SerialError(f"invalid unit range {start}-{end} in {m.group(0)}")
    if registry == "VCS":
        return SerialBlock(
            registry="VCS",
            batch_id=m.group("batch"),
            unit_start=start,
            unit_end=end,
            serial=m.group(0),
            project_id=m.group("project"),
            vintage=_vintage_from_verra(m.group("vstart"), m.group("vend")),
            country=m.group("country"),
        )
    return SerialBlock(
        registry="GS",
        batch_id=m.group("prefix"),
        unit_start=start,
        unit_end=end,
        serial=m.group(0),
        project_id=m.group("project"),
        vintage=m.group("vintage"),
        country=m.group("country"),
    )


def parse_serial(serial: str) -> SerialBlock:
    """Parse exactly one serial string (whole string must match)."""
    s = normalize(serial.strip()).upper()
    s = re.sub(r"\s+", "", s)
    m = VERRA_RE.fullmatch(s)
    if m:
        return _from_match(m, "VCS")
    m = GOLD_RE.fullmatch(s)
    if m:
        return _from_match(m, "GS")
    raise SerialError(f"unrecognized serial format: {serial[:120]!r}")


def find_serials(text: str) -> list[SerialBlock]:
    """Find every serial block in free text (certificates, reports). Deduplicates exact repeats."""
    norm = normalize(text)
    out: list[SerialBlock] = []
    seen: set[tuple] = set()
    spans: list[tuple[int, int]] = []
    for registry, rx in (("VCS", VERRA_RE), ("GS", GOLD_RE)):
        for m in rx.finditer(norm):
            if any(a <= m.start() < b for a, b in spans):
                continue
            try:
                b = _from_match(m, registry)
            except SerialError:
                continue
            key = (b.registry, b.batch_id, b.unit_start, b.unit_end)
            if key not in seen:
                seen.add(key)
                out.append(b)
            spans.append((m.start(), m.end()))
    return out


def overlap(a: SerialBlock, b: SerialBlock) -> tuple[int, int] | None:
    """Inclusive overlap of two blocks in the same namespace, else None."""
    if a.namespace != b.namespace:
        return None
    lo, hi = max(a.unit_start, b.unit_start), min(a.unit_end, b.unit_end)
    return (lo, hi) if lo <= hi else None
