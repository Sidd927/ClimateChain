import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fmt } from "../api";
import { Disclosure } from "./primitives";

/**
 * The Ruler: OnceOnly's signature instrument. A measured scale of registry unit
 * numbers inside one issuance batch (one namespace). Lanes stack registry records,
 * other claims and the focal claim; units held by more than one locking claim are
 * hatched crimson on both lanes. Every interval is a focusable button that drives a
 * readout, and the same data is available as a table.
 */

export type BandTone = "registry" | "issuance" | "claim" | "released" | "focus";
export interface RulerBand { start: number; end: number; title: string; detail?: string; href?: string }
export interface RulerLane {
  key: string;
  label: string;
  sub?: string;
  href?: string;
  tone: BandTone;
  locking?: boolean; // anchored/challenged claims lock units
  bands: RulerBand[];
}
interface Selection { lane: string; idx: number; overlap?: boolean }

const TONE: Record<BandTone, { day: string; night: string; legend: string }> = {
  registry: { day: "hatch-slate bg-slate-wash border border-slate", night: "hatch-slate-night bg-night-2 border border-[#4f6f75]", legend: "Registry retirement record" },
  issuance: { day: "bg-sheet border border-slate border-dashed", night: "bg-transparent border border-dashed border-[#4f6f75]", legend: "Issued, not recorded as retired" },
  claim: { day: "bg-lichen", night: "bg-lichen-bright", legend: "Units locked by another claim" },
  released: { day: "bg-transparent border border-dashed border-slate", night: "bg-transparent border border-dashed border-[#4f6f75]", legend: "Released claim (revoked or withdrawn)" },
  focus: { day: "bg-ink/12 border-2 border-ink", night: "bg-white/10 border-2 border-[#e9f2ef]", legend: "This claim" },
};

function niceStep(span: number, target = 4) {
  const raw = span / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function Ruler({
  namespace, lanes, focusKey, domain, night = false, animate = false, caption, compactLabels = false,
}: {
  namespace: string;
  lanes: RulerLane[];
  focusKey?: string;
  domain?: [number, number];
  night?: boolean;
  animate?: boolean;
  caption?: ReactNode;
  compactLabels?: boolean;
}) {
  const uid = useId();
  const focusLane = lanes.find((l) => l.key === focusKey);

  const overlaps = useMemo(() => {
    if (!focusLane) return [] as { lane: string; start: number; end: number; with: RulerLane }[];
    const out: { lane: string; start: number; end: number; with: RulerLane }[] = [];
    for (const l of lanes) {
      if (l.key === focusKey || !l.locking) continue;
      for (const b of l.bands) for (const f of focusLane.bands) {
        const lo = Math.max(b.start, f.start), hi = Math.min(b.end, f.end);
        if (lo <= hi) out.push({ lane: l.key, start: lo, end: hi, with: l });
      }
    }
    return out;
  }, [lanes, focusKey, focusLane]);

  const [d0, d1] = useMemo(() => {
    if (domain) return domain;
    const all = lanes.flatMap((l) => l.bands);
    if (!all.length) return [0, 1] as [number, number];
    return [Math.min(...all.map((b) => b.start)), Math.max(...all.map((b) => b.end))] as [number, number];
  }, [lanes, domain]);
  const pad = Math.max(1, Math.round((d1 - d0 + 1) * 0.035));
  const lo = d0 - pad, hi = d1 + pad, span = hi - lo + 1;
  const pct = (x: number) => ((x - lo) / span) * 100;
  const wid = (s: number, e: number) => Math.max(0.5, ((e - s + 1) / span) * 100);

  const ticks = useMemo(() => {
    const step = niceStep(d1 - d0 + 1);
    const first = Math.ceil(d0 / step) * step;
    const t: number[] = [];
    for (let v = first; v <= d1; v += step) t.push(v);
    return t;
  }, [d0, d1]);

  const defaultSel: Selection | null = overlaps.length ? { lane: overlaps[0].lane, idx: 0, overlap: true } : focusLane ? { lane: focusLane.key, idx: 0 } : null;
  const [sel, setSel] = useState<Selection | null>(null);
  const active = sel ?? defaultSel;

  const readout = (() => {
    if (!active) return null;
    if (active.overlap) {
      const o = overlaps.filter((x) => x.lane === active.lane)[active.idx] ?? overlaps[0];
      if (!o) return null;
      return {
        tone: "overlap" as const,
        head: `${fmt(o.end - o.start + 1)} units claimed twice`,
        range: [o.start, o.end] as [number, number],
        body: <>Units held by <strong>{o.with.label}</strong>{o.with.sub ? ` (${o.with.sub})` : ""} and cited again by {focusLane?.label}. A retired unit can support only one claim.</>,
        href: o.with.href,
        hrefLabel: o.with.href ? `Open ${o.with.label}` : undefined,
      };
    }
    const lane = lanes.find((l) => l.key === active.lane);
    const b = lane?.bands[active.idx];
    if (!lane || !b) return null;
    return { tone: lane.tone, head: b.title, range: [b.start, b.end] as [number, number], body: b.detail, href: b.href ?? lane.href, hrefLabel: (b.href ?? lane.href) ? `Open ${lane.label}` : undefined };
  })();

  const doubled = overlaps.reduce((n, o) => n + (o.end - o.start + 1), 0);
  const text = night ? "text-night-text" : "text-ink-soft";
  const strong = night ? "text-white" : "text-ink";
  const laneBg = night ? "bg-white/[0.04]" : "bg-fog";
  const labelCol = compactLabels ? "sm:grid-cols-[7.5rem_1fr]" : "sm:grid-cols-[10.5rem_1fr]";
  let laneIndex = 0;

  return (
    <figure className="space-y-3" aria-labelledby={`${uid}-cap`}>
      <figcaption id={`${uid}-cap`} className="sr-only">
        Unit ranges in {namespace}: {lanes.map((l) => `${l.label} ${l.bands.map((b) => `${b.start} to ${b.end}`).join(", ")}`).join("; ")}.
        {doubled > 0 ? ` ${doubled} units are claimed twice.` : " No unit is claimed twice."}
      </figcaption>

      <div className="space-y-2.5">
        {lanes.map((lane) => {
          const i = laneIndex++;
          const delay = { "--delay": `${i * 220}ms` } as CSSProperties;
          const laneOverlaps = lane.key === focusKey ? overlaps : overlaps.filter((o) => o.lane === lane.key);
          return (
            <div key={lane.key} className={`grid grid-cols-1 gap-1 sm:items-center sm:gap-3 ${labelCol}`}>
              <div className="flex min-w-0 items-baseline gap-2 sm:block sm:text-right">
                {lane.href ? (
                  <Link viewTransition to={lane.href} className={`truncate text-[13px] font-semibold underline decoration-transparent underline-offset-2 hover:decoration-current ${strong}`}>{lane.label}</Link>
                ) : <div className={`truncate text-[13px] font-semibold ${strong}`}>{lane.label}</div>}
                {lane.sub && <div className={`truncate text-[11.5px] ${text}`}>{lane.sub}</div>}
              </div>
              <div className={`relative h-8 rounded-[3px] ${laneBg}`}>
                {lane.bands.length === 0 && <span className={`absolute inset-0 flex items-center px-2.5 text-[12px] ${text}`}>No matching record in the registry snapshot</span>}
                {lane.bands.map((b, k) => {
                  const isSel = sel !== null && !sel.overlap && sel.lane === lane.key && sel.idx === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSel({ lane: lane.key, idx: k })}
                      onFocus={() => setSel({ lane: lane.key, idx: k })}
                      aria-pressed={!!isSel}
                      aria-label={`${lane.label}: ${b.title}, units ${fmt(b.start)} to ${fmt(b.end)}`}
                      className={`absolute top-0 h-full rounded-[3px] transition-[box-shadow,filter] duration-150 hover:brightness-110 ${night ? TONE[lane.tone].night : TONE[lane.tone].day} ${isSel ? (night ? "ring-2 ring-white ring-offset-2 ring-offset-night" : "ring-2 ring-glacier ring-offset-2") : ""} ${animate ? "ruler-draw" : ""}`}
                      style={{ left: `${pct(b.start)}%`, width: `${wid(b.start, b.end)}%`, ...delay }}
                    />
                  );
                })}
                {laneOverlaps.map((o, k) => {
                  const idx = overlaps.filter((x) => x.lane === o.lane).indexOf(o);
                  const isSel = sel !== null && sel.overlap && sel.lane === o.lane && sel.idx === idx;
                  return (
                    <button
                      key={`ov-${k}`}
                      type="button"
                      onClick={() => setSel({ lane: o.lane, idx, overlap: true })}
                      onFocus={() => setSel({ lane: o.lane, idx, overlap: true })}
                      aria-pressed={!!isSel}
                      aria-label={`Overlap: ${fmt(o.end - o.start + 1)} units, ${fmt(o.start)} to ${fmt(o.end)}, also held by ${o.with.label}`}
                      className={`absolute top-0 h-full rounded-[2px] ${night ? "hatch-crimson-night" : "hatch-crimson"} ${isSel ? (night ? "outline-2 outline-offset-2 outline-white" : "outline-2 outline-offset-2 outline-crimson") : ""} ${animate ? "ruler-flash" : ""}`}
                      style={{ left: `${pct(o.start)}%`, width: `${wid(o.start, o.end)}%`, "--delay": `${lanes.length * 220 + 200}ms` } as CSSProperties}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* scale */}
        <div className={`grid grid-cols-1 sm:gap-3 ${labelCol}`}>
          <div className={`hidden text-right text-[11px] sm:block ${text}`}>unit number</div>
          <div className="relative h-7" aria-hidden>
            <div className={`absolute inset-x-0 top-0 h-px ${night ? "bg-night-line" : "bg-rule-strong"}`} />
            {ticks.map((t, k) => (
              <div key={t} className="absolute top-0" style={{ left: `${pct(t)}%` }}>
                <div className={`h-2 w-px ${night ? "bg-[#4f6f75]" : "bg-rule-strong"}`} />
                <div className={`absolute top-2.5 -translate-x-1/2 font-mono text-[10.5px] whitespace-nowrap ${text} ${k % 2 === 1 ? "hidden md:block" : ""}`}>{fmt(t)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* readout */}
      {readout && (
        <div aria-live="polite" className={`space-y-1 rounded-panel border px-4 py-3 text-sm ${night ? "border-night-line bg-night-2/80" : "border-rule bg-sheet"} ${!compactLabels ? "sm:ml-[11.25rem]" : "sm:ml-[8.25rem]"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className={`font-semibold ${readout.tone === "overlap" ? (night ? "text-crimson-bright" : "text-crimson") : strong}`}>{readout.head}</span>
            <span className={`font-mono text-[12px] ${text}`}>{namespace} · {fmt(readout.range[0])}–{fmt(readout.range[1])}</span>
          </div>
          {readout.body && <p className={`leading-relaxed ${text}`}>{readout.body}</p>}
          {readout.href && <Link viewTransition to={readout.href} className={`inline-block text-sm font-semibold underline underline-offset-4 ${strong}`}>{readout.hrefLabel}</Link>}
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] ${text} ${!compactLabels ? "sm:pl-[11.25rem]" : "sm:pl-[8.25rem]"}`}>
        {Array.from(new Set(lanes.map((l) => l.tone))).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded-[2px] ${night ? TONE[t].night : TONE[t].day}`} aria-hidden />{TONE[t].legend}</span>
        ))}
        {overlaps.length > 0 && <span className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded-[2px] ${night ? "hatch-crimson-night" : "hatch-crimson"}`} aria-hidden />Units claimed twice</span>}
        {caption}
      </div>

      {!night && (
        <Disclosure summary="Show ranges as a table" className={!compactLabels ? "sm:pl-[11.25rem]" : "sm:pl-[8.25rem]"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-1.5 pr-3 font-medium">Lane</th><th className="py-1.5 pr-3 font-medium">Interval</th><th className="py-1.5 pr-3 text-right font-medium">First unit</th><th className="py-1.5 pr-3 text-right font-medium">Last unit</th><th className="py-1.5 text-right font-medium">Units</th></tr></thead>
              <tbody className="divide-y divide-rule">
                {lanes.flatMap((l) => l.bands.map((b, k) => (
                  <tr key={`${l.key}-${k}`}><td className="py-1.5 pr-3">{l.label}</td><td className="py-1.5 pr-3">{b.title}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(b.start)}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(b.end)}</td><td className="py-1.5 text-right">{fmt(b.end - b.start + 1)}</td></tr>
                )))}
                {overlaps.map((o, k) => (
                  <tr key={`o-${k}`} className="text-crimson"><td className="py-1.5 pr-3 font-semibold">Claimed twice</td><td className="py-1.5 pr-3">with {o.with.label}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(o.start)}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(o.end)}</td><td className="py-1.5 text-right font-semibold">{fmt(o.end - o.start + 1)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}
    </figure>
  );
}
