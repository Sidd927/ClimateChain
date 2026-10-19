import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fmt } from "../api";
import { Disclosure } from "./primitives";

/**
 * The Ruler: OnceOnly's signature instrument. A measured scale of registry unit
 * numbers inside one issuance batch (one namespace). Lanes stack registry records,
 * other claims and the focal claim. Units held by more than one locking claim are
 * hatched crimson on both lanes, bracketed and labelled on the instrument itself,
 * with guide lines and exact boundary numbers on the scale.
 *
 * variant "full": interactive (every interval is a button driving a readout), legend, table alternative.
 * variant "transect": the same drawing without controls, for illustrations (hero, explainer).
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
  emptyText?: string;
}
interface Overlap { lane: string; start: number; end: number; with: RulerLane }
interface Selection { lane: string; idx: number; overlap?: boolean }

const TONE: Record<BandTone, { day: string; night: string; legend: string }> = {
  registry: { day: "hatch-slate bg-slate-wash border border-slate", night: "hatch-slate-night bg-night-2 border border-[#4f6f75]", legend: "Registry retirement record" },
  issuance: { day: "bg-sheet border border-slate border-dashed", night: "bg-transparent border border-dashed border-[#4f6f75]", legend: "Issued, not recorded as retired" },
  claim: { day: "bg-lichen", night: "bg-lichen-bright", legend: "Units already locked by another claim" },
  released: { day: "bg-transparent border border-dashed border-slate", night: "bg-transparent border border-dashed border-[#4f6f75]", legend: "Released claim (revoked or withdrawn)" },
  focus: { day: "bg-ink/12 border-2 border-ink", night: "bg-white/10 border-2 border-[#e9f2ef]", legend: "Units this claim cites" },
};

function niceStep(span: number, target = 4) {
  const raw = span / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function Ruler({
  namespace, lanes, focusKey, domain, night = false, animate = false, caption, compactLabels = false, variant = "full",
}: {
  namespace: string;
  lanes: RulerLane[];
  focusKey?: string;
  domain?: [number, number];
  night?: boolean;
  animate?: boolean;
  caption?: ReactNode;
  compactLabels?: boolean;
  variant?: "full" | "transect";
}) {
  const uid = useId();
  const interactive = variant === "full";
  const focusLane = lanes.find((l) => l.key === focusKey);

  const overlaps = useMemo(() => {
    const out: Overlap[] = [];
    if (!focusLane) return out;
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

  // Round ticks, minus any that would collide with the exact overlap boundary labels.
  const boundaries = overlaps.length ? [overlaps[0].start, overlaps[0].end] : [];
  const ticks = useMemo(() => {
    const step = niceStep(d1 - d0 + 1);
    const t: number[] = [];
    for (let v = Math.ceil(d0 / step) * step; v <= d1; v += step) t.push(v);
    return t;
  }, [d0, d1]);
  const visibleTicks = ticks.filter((t) => boundaries.every((b) => Math.abs(pct(t) - pct(b)) > 9));

  const [sel, setSel] = useState<Selection | null>(null);
  const [hoverOverlap, setHoverOverlap] = useState<number | null>(null); // index into overlaps
  const defaultSel: Selection | null = overlaps.length ? { lane: overlaps[0].lane, idx: 0, overlap: true } : focusLane ? { lane: focusLane.key, idx: 0 } : null;
  const active = sel ?? defaultSel;
  const activeOverlapIndex = active?.overlap ? overlaps.findIndex((o) => o === overlaps.filter((x) => x.lane === active.lane)[active.idx]) : -1;
  const linked = hoverOverlap ?? (sel?.overlap ? activeOverlapIndex : -1); // overlap emphasised on every lane

  const readout = (() => {
    if (!active || !interactive) return null;
    if (active.overlap) {
      const o = overlaps[activeOverlapIndex] ?? overlaps[0];
      if (!o) return null;
      return {
        tone: "overlap" as const,
        head: `${fmt(o.end - o.start + 1)} units claimed twice`,
        range: [o.start, o.end] as [number, number],
        body: <>Held by <strong>{o.with.label}</strong>{o.with.sub ? ` (${o.with.sub})` : ""} and cited again by {focusLane?.label}. A retired unit can back only one claim. This flags potential double use for review; it does not say which claim is right.</>,
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
  const alarm = night ? "text-crimson-bright" : "text-crimson";
  const laneBg = night ? "bg-white/[0.04]" : "bg-fog";
  const grid = compactLabels ? "sm:grid-cols-[7.5rem_1fr]" : "sm:grid-cols-[10.5rem_1fr]";
  const indent = compactLabels ? "sm:ml-[8.25rem]" : "sm:ml-[11.25rem]";
  const indentPad = compactLabels ? "sm:pl-[8.25rem]" : "sm:pl-[11.25rem]";
  const ovDelay = `${lanes.length * 220 + 200}ms`;

  return (
    <figure className="space-y-3" aria-labelledby={`${uid}-cap`}>
      <figcaption id={`${uid}-cap`} className="sr-only">
        Unit ranges in {namespace}: {lanes.map((l) => `${l.label}: ${l.bands.length ? l.bands.map((b) => `${fmt(b.start)} to ${fmt(b.end)}`).join(", ") : "none"}`).join("; ")}.
        {doubled > 0 ? ` ${fmt(doubled)} units, ${overlaps.map((o) => `${fmt(o.start)} to ${fmt(o.end)}`).join(" and ")}, are claimed twice.` : " No unit is claimed twice."}
      </figcaption>

      <div className="space-y-2.5">
        {/* on-instrument annotation: bracket over the shared units */}
        {overlaps.length > 0 && (
          <div className={`grid grid-cols-1 sm:gap-3 ${grid}`} aria-hidden>
            <div className="hidden sm:block" />
            <div className="relative h-9">
              {overlaps.map((o, k) => {
                const left = pct(o.start), w = wid(o.start, o.end), mid = left + w / 2;
                const align = mid < 22 ? "left" : mid > 78 ? "right" : "center";
                return (
                  <div key={k} className={animate ? "ruler-flash" : ""} style={{ "--delay": ovDelay } as CSSProperties}>
                    <div className={`absolute bottom-0 h-2.5 border-x-2 border-t-2 ${night ? "border-crimson-bright" : "border-crimson"}`} style={{ left: `${left}%`, width: `${w}%` }} />
                    <div
                      className={`absolute bottom-3.5 text-[13px] font-semibold whitespace-nowrap ${alarm}`}
                      style={align === "center" ? { left: `${mid}%`, transform: "translateX(-50%)" } : align === "left" ? { left: `${left}%` } : { right: `${100 - left - w}%` }}
                    >
                      {fmt(o.end - o.start + 1)} units claimed twice
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {lanes.map((lane, i) => {
          const delay = { "--delay": `${i * 220}ms` } as CSSProperties;
          const laneOverlaps = lane.key === focusKey ? overlaps.map((o, k) => ({ o, k })) : overlaps.map((o, k) => ({ o, k })).filter(({ o }) => o.lane === lane.key);
          return (
            <div key={lane.key} className={`grid grid-cols-1 gap-1 sm:items-center sm:gap-3 ${grid}`}>
              <div className="flex min-w-0 items-baseline gap-2 sm:block sm:text-right">
                {lane.href && interactive ? (
                  <Link viewTransition to={lane.href} className={`truncate text-[13px] font-semibold underline decoration-transparent underline-offset-2 hover:decoration-current ${strong}`}>{lane.label}</Link>
                ) : <div className={`truncate text-[13px] font-semibold ${strong}`}>{lane.label}</div>}
                {lane.sub && <div className={`truncate text-[12px] ${text}`}>{lane.sub}</div>}
              </div>
              <div className={`relative h-8 rounded-[3px] ${laneBg}`}>
                {lane.bands.length === 0 && <span className={`absolute inset-0 flex items-center px-2.5 text-[12px] ${text}`}>{lane.emptyText ?? "No matching record in the registry snapshot"}</span>}
                {lane.bands.map((b, k) => {
                  const isSel = sel !== null && !sel.overlap && sel.lane === lane.key && sel.idx === k;
                  const cls = `absolute top-0 h-full rounded-[3px] ${night ? TONE[lane.tone].night : TONE[lane.tone].day} ${animate ? "ruler-draw" : ""}`;
                  const style = { left: `${pct(b.start)}%`, width: `${wid(b.start, b.end)}%`, ...delay };
                  if (!interactive) return <div key={k} className={cls} style={style} aria-hidden />;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSel({ lane: lane.key, idx: k })}
                      onFocus={() => setSel({ lane: lane.key, idx: k })}
                      aria-pressed={isSel}
                      aria-label={`${lane.label}: ${b.title}, units ${fmt(b.start)} to ${fmt(b.end)}`}
                      className={`${cls} transition-[box-shadow,filter] duration-150 hover:brightness-110 ${isSel ? (night ? "ring-2 ring-white ring-offset-2 ring-offset-night" : "ring-2 ring-glacier ring-offset-2") : ""}`}
                      style={style}
                    />
                  );
                })}
                {/* guides: overlap boundaries drawn through every lane */}
                {overlaps.map((o, k) => (
                  <div key={`g-${k}`} aria-hidden className={`pointer-events-none absolute -top-1.5 -bottom-1.5 border-x border-dashed ${night ? "border-crimson-bright/45" : "border-crimson/40"} ${linked === k ? "opacity-100" : "opacity-70"} ${animate ? "ruler-flash" : ""}`} style={{ left: `${pct(o.start)}%`, width: `${wid(o.start, o.end)}%`, "--delay": ovDelay } as CSSProperties} />
                ))}
                {laneOverlaps.map(({ o, k }) => {
                  const idx = overlaps.filter((x) => x.lane === o.lane).indexOf(o);
                  const emphasised = linked === k;
                  const cls = `absolute top-0 h-full rounded-[2px] ${night ? "hatch-crimson-night" : "hatch-crimson"} ${emphasised ? (night ? "outline-2 outline-offset-2 outline-white" : "outline-2 outline-offset-2 outline-crimson") : ""} ${animate ? "ruler-flash" : ""}`;
                  const style = { left: `${pct(o.start)}%`, width: `${wid(o.start, o.end)}%`, "--delay": ovDelay } as CSSProperties;
                  if (!interactive) return <div key={`ov-${k}`} className={cls} style={style} aria-hidden />;
                  return (
                    <button
                      key={`ov-${k}`}
                      type="button"
                      onClick={() => setSel({ lane: o.lane, idx, overlap: true })}
                      onFocus={() => setSel({ lane: o.lane, idx, overlap: true })}
                      onMouseEnter={() => setHoverOverlap(k)}
                      onMouseLeave={() => setHoverOverlap(null)}
                      aria-pressed={sel !== null && !!sel.overlap && sel.lane === o.lane && sel.idx === idx}
                      aria-label={`Overlap: ${fmt(o.end - o.start + 1)} units, ${fmt(o.start)} to ${fmt(o.end)}, also held by ${o.with.label}`}
                      className={cls}
                      style={style}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* scale: round ticks plus the exact overlap boundaries */}
        <div className={`grid grid-cols-1 sm:gap-3 ${grid}`}>
          <div className={`hidden text-right text-[11px] sm:block ${text}`}>unit number</div>
          <div className="relative h-8" aria-hidden>
            <div className={`absolute inset-x-0 top-0 h-px ${night ? "bg-night-line" : "bg-rule-strong"}`} />
            {visibleTicks.map((t, k) => (
              <div key={t} className="absolute top-0" style={{ left: `${pct(t)}%` }}>
                <div className={`h-2 w-px ${night ? "bg-[#4f6f75]" : "bg-rule-strong"}`} />
                <div className={`absolute top-2.5 -translate-x-1/2 font-mono text-[10.5px] whitespace-nowrap ${text} ${boundaries.length ? "hidden md:block" : k % 2 === 1 ? "hidden md:block" : ""}`}>{fmt(t)}</div>
              </div>
            ))}
            {boundaries.map((b, k) => (
              <div key={`b-${k}`} className="absolute top-0" style={{ left: `${pct(b)}%` }}>
                <div className={`h-3 w-px ${night ? "bg-crimson-bright" : "bg-crimson"}`} />
                {/* first boundary labels leftwards, second rightwards, unless that would run off the instrument */}
                <div className={`absolute top-3 font-mono text-[10.5px] font-semibold whitespace-nowrap ${alarm} ${(k === 0 && pct(b) > 18) || (k === 1 && pct(b) > 82) ? "-translate-x-full pr-1" : "pl-1"}`}>{fmt(b)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {readout && (
        <div aria-live="polite" className={`space-y-1 rounded-panel border px-4 py-3 text-sm ${night ? "border-night-line bg-night-2/80" : "border-rule bg-sheet"} ${indent}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className={`font-semibold ${readout.tone === "overlap" ? alarm : strong}`}>{readout.head}</span>
            <span className={`font-mono text-[12px] ${text}`}>{namespace} · {fmt(readout.range[0])}–{fmt(readout.range[1])}</span>
          </div>
          {readout.body && <p className={`leading-relaxed ${text}`}>{readout.body}</p>}
          {readout.href && <Link viewTransition to={readout.href} className={`inline-block text-sm font-semibold underline underline-offset-4 ${strong}`}>{readout.hrefLabel}</Link>}
        </div>
      )}

      {interactive && (
        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] ${text} ${indentPad}`}>
          {Array.from(new Set(lanes.map((l) => l.tone))).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded-[2px] ${night ? TONE[t].night : TONE[t].day}`} aria-hidden />{TONE[t].legend}</span>
          ))}
          {overlaps.length > 0 && <span className="inline-flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded-[2px] ${night ? "hatch-crimson-night" : "hatch-crimson"}`} aria-hidden />Units claimed twice</span>}
          {caption}
        </div>
      )}

      {interactive && !night && (
        <Disclosure summary="Show ranges as a table" className={indentPad}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <caption className="sr-only">Unit ranges in {namespace}</caption>
              <thead className="text-left text-xs text-muted"><tr><th scope="col" className="py-1.5 pr-3 font-medium">Lane</th><th scope="col" className="py-1.5 pr-3 font-medium">Interval</th><th scope="col" className="py-1.5 pr-3 text-right font-medium">First unit</th><th scope="col" className="py-1.5 pr-3 text-right font-medium">Last unit</th><th scope="col" className="py-1.5 text-right font-medium">Units</th></tr></thead>
              <tbody className="divide-y divide-rule">
                {lanes.flatMap((l) => (l.bands.length ? l.bands : [null]).map((b, k) => (
                  <tr key={`${l.key}-${k}`}>
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">{l.label}</th>
                    {b ? (
                      <><td className="py-1.5 pr-3">{b.title}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(b.start)}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(b.end)}</td><td className="py-1.5 text-right">{fmt(b.end - b.start + 1)}</td></>
                    ) : <td colSpan={4} className="py-1.5 text-ink-soft">{l.emptyText ?? "No matching record in the registry snapshot"}</td>}
                  </tr>
                )))}
                {overlaps.map((o, k) => (
                  <tr key={`o-${k}`} className="text-crimson"><th scope="row" className="py-1.5 pr-3 text-left font-semibold">Claimed twice</th><td className="py-1.5 pr-3">with {o.with.label}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(o.start)}</td><td className="py-1.5 pr-3 text-right font-mono text-[12.5px]">{fmt(o.end)}</td><td className="py-1.5 text-right font-semibold">{fmt(o.end - o.start + 1)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      )}
    </figure>
  );
}
