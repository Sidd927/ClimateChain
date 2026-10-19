import { useState } from "react";
import { fmt } from "../api";

/**
 * Makes a registry serial legible: the parts that define the unit range (batch,
 * first unit, last unit) are separated from the descriptive parts (programme,
 * country, project, vintage). Segments are focusable and explain themselves.
 */
type Seg = { text: string; role: string; explain: string; key?: boolean };

const VERRA = /^(\d+)-(\d+)-(\d+)-((?:VCS-)?VCU-\d+-[A-Z0-9]+)-([A-Z]{2})-(?:(\d{1,2})-)?(\d+)-(\d{8})[-_](\d{8})-(\d)$/;
const GOLD = /^(GS\d+-\d+)-([A-Z]{2})-((?:GS)?\d+)-(\d+)-(\d{4})-(\d+)-(\d+)-(\d+)$/;

function segments(serial: string): Seg[] | null {
  let m = serial.match(VERRA);
  if (m) {
    const [, batch, a, b, prog, country, scope, project, vs, ve, flag] = m;
    return [
      { text: batch, role: "Issuance batch", explain: "Unit numbers are unique only inside this batch, so the batch is part of the namespace.", key: true },
      { text: a, role: "First unit", explain: `Unit ${fmt(+a)} is the first unit of the range.`, key: true },
      { text: b, role: "Last unit", explain: `Unit ${fmt(+b)} is the last unit. Range size: ${fmt(+b - +a + 1)} units.`, key: true },
      { text: prog, role: "Programme", explain: "Verra VCS, unit type VCU, and the issuing registry's internal codes." },
      { text: scope ? `${country}-${scope}` : country, role: "Country / sector", explain: `Host country ${country}${scope ? `, sectoral scope ${scope}` : ""}.` },
      { text: project, role: "Project", explain: `Verra project ID ${project}.` },
      { text: `${vs}-${ve}`, role: "Vintage", explain: `Monitoring period ${vs.slice(0, 2)}/${vs.slice(2, 4)}/${vs.slice(4)} to ${ve.slice(0, 2)}/${ve.slice(2, 4)}/${ve.slice(4)}.` },
      { text: flag, role: "Label flag", explain: "Additional certification flag." },
    ];
  }
  m = serial.match(GOLD);
  if (m) {
    const [, prog, country, project, scope, vintage, batch, a, b] = m;
    return [
      { text: prog, role: "Programme", explain: "Gold Standard serial prefix." },
      { text: country, role: "Country", explain: `Host country ${country}.` },
      { text: project, role: "Project", explain: `Gold Standard project ${project.replace("GS", "")}.` },
      { text: scope, role: "Sector", explain: `Sector code ${scope}.` },
      { text: vintage, role: "Vintage", explain: `Vintage ${vintage}.` },
      { text: batch, role: "Issuance batch", explain: "Together with the prefix, defines the namespace in which unit numbers are unique.", key: true },
      { text: a, role: "First unit", explain: `Unit ${fmt(+a)} is the first unit of the range.`, key: true },
      { text: b, role: "Last unit", explain: `Unit ${fmt(+b)} is the last unit. Range size: ${fmt(+b - +a + 1)} units.`, key: true },
    ];
  }
  return null;
}

export function SerialAnatomy({ serial, night = false }: { serial: string; night?: boolean }) {
  const segs = segments(serial);
  const [active, setActive] = useState<number>(segs ? segs.findIndex((s) => s.key) + 1 : 0);
  if (!segs) return <span className="font-mono text-sm break-all">{serial}</span>;
  const cur = segs[active] ?? segs[0];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-y-1.5 font-mono text-[13px] sm:text-[15px]" role="group" aria-label="Serial number parts">
        {segs.map((s, i) => (
          <span key={i} className="inline-flex items-center">
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={`${s.role}: ${s.text}`}
              className={`press rounded-[3px] px-1 py-0.5 ${s.key ? (night ? "text-lichen-bright" : "text-lichen") : night ? "text-night-text" : "text-ink-soft"} ${i === active ? (night ? "bg-white/12 ring-1 ring-white/40" : "bg-fog-2 ring-1 ring-ink/30") : night ? "hover:bg-white/8" : "hover:bg-fog"}`}
            >
              {s.text}
            </button>
            {i < segs.length - 1 && <span className={night ? "text-[#4f6f75]" : "text-rule-strong"} aria-hidden>-</span>}
          </span>
        ))}
      </div>
      <div aria-live="polite" className={`min-h-[3rem] text-sm ${night ? "text-night-text" : "text-ink-soft"}`}>
        <span className={`font-semibold ${night ? "text-white" : "text-ink"}`}>{cur.role}.</span> {cur.explain}
        {cur.key && <span className={night ? "text-lichen-bright" : "text-lichen"}> Defines the unit range.</span>}
      </div>
    </div>
  );
}
