import type { Strip } from "../api";
import { fmt } from "../api";
import type { RulerLane } from "../components/Ruler";

const LOCKING = new Set(["anchored", "challenged"]);

/** Turn the API's unit-strip payload for one block into Ruler lanes (registry, other claims, this claim). */
export function stripToLanes(strip: Strip, focusLabel: string, focusRef: string): RulerLane[] {
  const registry: RulerLane = {
    key: "registry",
    label: "Registry",
    sub: strip.records[0]?.kind === "issuance" ? "issued, not retired" : `${strip.records.length} retirement record${strip.records.length === 1 ? "" : "s"}`,
    tone: strip.records[0]?.kind === "issuance" ? "issuance" : "registry",
    bands: strip.records.map((r) => ({
      start: r.unit_start,
      end: r.unit_end,
      title: r.kind === "retirement" ? `Retired ${r.event_date ?? ""}`.trim() : `Issued ${r.event_date ?? ""}`.trim(),
      detail: `${fmt(r.unit_end - r.unit_start + 1)} units · ${r.kind === "retirement" ? (r.beneficiary ? `beneficiary recorded: ${r.beneficiary}` : "no beneficiary recorded") : "no retirement record in the snapshot"} · Berkeley VROD 2026-08`,
    })),
  };
  const byClaim = new Map<number, RulerLane>();
  for (const o of strip.others) {
    const lane = byClaim.get(o.claim_id) ?? {
      key: `claim-${o.claim_id}`,
      label: o.claimant.replace(" (SYNTHETIC)", ""),
      sub: `${o.ref} · ${o.status}`,
      href: `/claims/${o.claim_id}`,
      tone: LOCKING.has(o.status) ? ("claim" as const) : ("released" as const),
      locking: LOCKING.has(o.status),
      bands: [],
    };
    lane.bands.push({ start: o.unit_start, end: o.unit_end, title: `${o.ref} (${o.status})`, detail: LOCKING.has(o.status) ? "These units are locked on the ledger by this claim." : "Released: this claim no longer locks its units.", href: `/claims/${o.claim_id}` });
    byClaim.set(o.claim_id, lane);
  }
  const focus: RulerLane = {
    key: "focus",
    label: focusLabel.replace(" (SYNTHETIC)", ""),
    sub: `${focusRef} · this claim`,
    tone: "focus",
    bands: [{ start: strip.claim.unit_start, end: strip.claim.unit_end, title: "Units cited by this claim", detail: `${fmt(strip.claim.unit_end - strip.claim.unit_start + 1)} units extracted from the evidence.` }],
  };
  return [registry, ...byClaim.values(), focus];
}
