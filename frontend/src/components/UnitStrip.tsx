import type { Strip, StripOther } from "../api";
import { fmt } from "../api";

const LOCKING = new Set(["anchored", "challenged"]);

function overlapOf(a: { unit_start: number; unit_end: number }, b: { unit_start: number; unit_end: number }) {
  const lo = Math.max(a.unit_start, b.unit_start);
  const hi = Math.min(a.unit_end, b.unit_end);
  return lo <= hi ? { lo, hi } : null;
}

/**
 * The unit strip: a ruler of registry unit numbers inside one issuance batch.
 * Registry records sit on the top lane, other claims below, this claim at the bottom;
 * units claimed twice are hatched crimson across both lanes.
 */
export function UnitStrip({ strip, thisLabel, animate = false }: { strip: Strip; thisLabel: string; animate?: boolean }) {
  const claimRange = { unit_start: strip.claim.unit_start, unit_end: strip.claim.unit_end };
  const [d0raw, d1raw] = strip.domain;
  const pad = Math.max(1, Math.round((d1raw - d0raw + 1) * 0.04));
  const d0 = d0raw - pad;
  const d1 = d1raw + pad;
  const span = d1 - d0 + 1;
  const pct = (x: number) => ((x - d0) / span) * 100;
  const width = (s: number, e: number) => Math.max(0.6, ((e - s + 1) / span) * 100);

  const others = [...strip.others].sort((a, b) => a.unit_start - b.unit_start);
  const conflicts = others
    .filter((o) => LOCKING.has(o.status))
    .map((o) => ({ o, ov: overlapOf(o, claimRange) }))
    .filter((x): x is { o: StripOther; ov: { lo: number; hi: number } } => x.ov !== null);
  const doubled = conflicts.reduce((n, c) => n + (c.ov.hi - c.ov.lo + 1), 0);

  const Lane = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr]">
      <div className="min-w-0 text-right">
        <div className="truncate text-xs font-semibold text-ink">{label}</div>
        {sub && <div className="truncate text-[11px] text-muted">{sub}</div>}
      </div>
      <div className="relative h-7 rounded-sm bg-fog">{children}</div>
    </div>
  );

  return (
    <figure className="space-y-2" aria-label={`Unit ranges in ${strip.namespace}`}>
      <Lane label="Registry" sub={strip.records[0]?.kind === "issuance" ? "issued, not retired" : "retirement records"}>
        {strip.records.length === 0 && <span className="absolute inset-0 flex items-center pl-2 text-[11px] text-muted">no matching registry record</span>}
        {strip.records.map((r, i) => (
          <div
            key={i}
            title={`${r.kind} ${fmt(r.unit_start)}–${fmt(r.unit_end)}${r.event_date ? ` on ${r.event_date}` : ""}${r.beneficiary ? ` for ${r.beneficiary}` : ""}`}
            className={`absolute top-0 h-full border border-slate ${r.kind === "retirement" ? "hatch-slate bg-slate-wash" : "bg-white"} ${animate ? "strip-reveal" : ""}`}
            style={{ left: `${pct(r.unit_start)}%`, width: `${width(r.unit_start, r.unit_end)}%` }}
          />
        ))}
      </Lane>

      {others.map((o) => {
        const locks = LOCKING.has(o.status);
        const ov = locks ? overlapOf(o, claimRange) : null;
        return (
          <Lane key={`${o.claim_id}-${o.unit_start}`} label={o.claimant.replace(" (SYNTHETIC)", "")} sub={`${o.ref} · ${o.status}`}>
            <div
              className={`absolute top-0 h-full rounded-sm ${locks ? "bg-lichen" : "border border-dashed border-slate bg-transparent"} ${animate ? "strip-reveal" : ""}`}
              style={{ left: `${pct(o.unit_start)}%`, width: `${width(o.unit_start, o.unit_end)}%` }}
              title={`${o.ref}: units ${fmt(o.unit_start)}–${fmt(o.unit_end)} (${o.status})`}
            />
            {ov && <div className={`hatch-crimson absolute top-0 h-full ${animate ? "strip-reveal-late" : ""}`} style={{ left: `${pct(ov.lo)}%`, width: `${width(ov.lo, ov.hi)}%` }} />}
          </Lane>
        );
      })}

      <Lane label={thisLabel} sub="this claim">
        <div
          className={`absolute top-0 h-full rounded-sm border-2 border-ink bg-ink/15 ${animate ? "strip-reveal-late" : ""}`}
          style={{ left: `${pct(claimRange.unit_start)}%`, width: `${width(claimRange.unit_start, claimRange.unit_end)}%` }}
        />
        {conflicts.map(({ ov }, i) => (
          <div key={i} className={`hatch-crimson absolute top-0 h-full ${animate ? "strip-reveal-late" : ""}`} style={{ left: `${pct(ov.lo)}%`, width: `${width(ov.lo, ov.hi)}%` }} />
        ))}
      </Lane>

      <div className="grid grid-cols-[7.5rem_1fr] gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="text-right text-[11px] text-muted">unit number</div>
        <div className="relative h-5 text-[11px] text-muted">
          <span className="absolute left-0">{fmt(d0raw)}</span>
          <span className="absolute right-0">{fmt(d1raw)}</span>
        </div>
      </div>

      <figcaption className="flex flex-wrap items-baseline gap-x-6 gap-y-1 pl-0 text-sm sm:pl-[10.75rem]">
        <span>
          <span className="font-mono text-xs text-muted">{strip.namespace}</span>{" "}
          units <strong className="font-semibold">{fmt(claimRange.unit_start)}–{fmt(claimRange.unit_end)}</strong> ({fmt(claimRange.unit_end - claimRange.unit_start + 1)})
        </span>
        {doubled > 0 ? (
          <span className="font-semibold text-crimson">{fmt(doubled)} units already back another claim</span>
        ) : (
          <span className="text-lichen">No unit is claimed twice</span>
        )}
      </figcaption>
    </figure>
  );
}
