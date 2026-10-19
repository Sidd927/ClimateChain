import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, FileText, Globe2, RotateCcw, Tag } from "lucide-react";
import { api, fmt, short } from "../api";
import { ContourField } from "../components/ContourField";
import { LinkButton, OutcomeToken, Reveal, StatusPill } from "../components/primitives";
import { Ruler, type RulerLane } from "../components/Ruler";
import { SerialAnatomy } from "../components/SerialAnatomy";
import { SiteFooter, SiteHeader } from "../components/Shell";
import type { Outcome } from "../lib/outcomes";

// Real Verra retirement (Berkeley VROD 2026-08): VCS 1904, batch 18453, units 896,309,560–896,329,558, retired 2026-08-06.
const REAL = { start: 896309560, end: 896329558 };
const NW = { start: 896309560, end: 896319559 };
const HE = { start: 896315001, end: 896322000 };
const NW_SERIAL = "18453-896309560-896319559-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0";

const STAGES = [
  { title: "Retirement", text: "Verra records 19,999 units of VCS 1904 as retired on 6 Aug 2026. Real registry data." },
  { title: "Claim A", text: "Northwind cites 10,000 of those units in its FY2025 claim. ClaimLedger locks them." },
  { title: "Claim B", text: "Helios cites 7,000 units from the same retirement. Each document looks fine on its own." },
  { title: "Overlap", text: "4,559 units appear in both. ClaimLedger refuses the second registration with RangeOverlap." },
];

function heroLanes(stage: number): RulerLane[] {
  const lanes: RulerLane[] = [{ key: "registry", label: "Registry", sub: "VCS 1904 · retired", tone: "registry", bands: [{ ...REAL, title: "Retired 2026-08-06", detail: "19,999 units · no beneficiary recorded · Berkeley VROD 2026-08 (real)" }] }];
  if (stage >= 1) lanes.push({ key: "nw", label: "Northwind Foods", sub: "claim A · anchored", tone: "claim", locking: true, bands: [{ ...NW, title: "Northwind's claim", detail: "Synthetic claimant. Units locked on the ledger." }] });
  if (stage >= 2) lanes.push({ key: "he", label: "Helios Apparel", sub: "claim B · submitted", tone: "focus", bands: [{ ...HE, title: "Helios's claim", detail: "Synthetic claimant citing an overlapping range." }] });
  return lanes;
}

function usePrefersReducedMotion() {
  const [r, setR] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return r;
}

function HeroInstrument() {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [auto, setAuto] = useState(!reduced);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!auto || reduced || stage >= 3) return;
    const t = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 900 : 1500);
    return () => clearTimeout(t);
  }, [stage, auto, reduced]);
  const lanes = useMemo(() => heroLanes(stage), [stage]);
  const overlap = stage >= 3;

  return (
    <div className="relative rounded-sheet border border-night-line bg-night/70 p-4 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.8)] backdrop-blur-[2px] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] text-night-text"><span className="font-mono text-white">VCS:18453</span> · units {fmt(REAL.start)}–{fmt(REAL.end)}</div>
        <span className="rounded-token border border-night-line px-2 py-0.5 text-[11px] text-night-text">Illustration · real retirement, synthetic claims</span>
      </div>
      <Ruler key={run} namespace="VCS:18453" lanes={lanes} focusKey={overlap ? "he" : undefined} domain={[REAL.start, REAL.end]} night animate={!reduced} compactLabels />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4" aria-label="Steps">
          {STAGES.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => { setAuto(false); setStage(i); }}
                aria-current={stage === i ? "step" : undefined}
                className={`press w-full rounded-[6px] border px-2.5 py-2 text-left text-xs ${stage === i ? "border-[#e9f2ef] bg-white/10 text-white" : stage > i ? "border-night-line text-night-text" : "border-night-line/60 text-[#7f9a9e]"}`}
              >
                <span className="font-mono">{i + 1}</span> {s.title}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => { setStage(reduced ? 3 : 0); setAuto(!reduced); setRun((r) => r + 1); }} className="press inline-flex items-center gap-1.5 justify-self-start rounded-[6px] px-2 py-2 text-xs text-night-text hover:text-white">
          <RotateCcw size={13} aria-hidden /> Replay
        </button>
      </div>
      <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-night-text" aria-live="polite">{STAGES[stage].text}</p>
      {overlap && (
        <div className="seal-in mt-1 flex flex-wrap items-center gap-3 rounded-panel border border-crimson-bright/40 bg-[#3a1a22]/60 px-3.5 py-2.5 text-sm">
          <OutcomeToken outcome="rejected" />
          <span className="font-mono text-[12.5px] text-[#ffd9df]">RangeOverlap(VCS:18453, claim #1, 896,315,001, 896,319,559)</span>
        </div>
      )}
    </div>
  );
}

function FanOut() {
  const docs = [
    { icon: FileText, label: "Sustainability report", sub: "FY2025 contribution claim" },
    { icon: Tag, label: "Product label", sub: "Offset-backed claim" },
    { icon: Globe2, label: "Company website", sub: "Climate commitments page" },
  ];
  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1.1fr]" aria-label="One registry retirement can be cited by many public claims">
      <div className="rounded-panel border border-rule bg-sheet p-4">
        <div className="text-xs text-muted">Registry</div>
        <div className="mt-1 font-semibold">One retirement record</div>
        <div className="mt-2 h-3 rounded-[2px] border border-slate hatch-slate bg-slate-wash" aria-hidden />
        <div className="mt-2 font-mono text-[11.5px] text-ink-soft break-all">18453-896309560-896329558-…</div>
        <div className="mt-2 text-xs text-ink-soft">Retired once. The registry guarantees that.</div>
      </div>
      <svg className="hidden h-40 w-24 md:block" viewBox="0 0 96 160" aria-hidden>
        {[20, 80, 140].map((y) => <path key={y} d={`M0 80 C 48 80, 48 ${y}, 96 ${y}`} fill="none" stroke="#b7c5c1" strokeWidth="1.5" strokeDasharray="4 4" />)}
        <circle cx="2" cy="80" r="3" fill="#8fa3a6" />
      </svg>
      <ul className="space-y-2.5">
        {docs.map((d) => (
          <li key={d.label} className="flex items-center gap-3 rounded-panel border border-rule bg-sheet px-4 py-3">
            <d.icon size={18} className="text-ink-soft" aria-hidden />
            <div className="min-w-0"><div className="text-sm font-semibold">{d.label}</div><div className="text-xs text-muted">{d.sub}</div></div>
            <span className="ml-auto rounded-token border border-dashed border-slate px-1.5 py-px text-[11px] text-ink-soft">cites serials</span>
          </li>
        ))}
        <li className="px-1 text-sm text-ink-soft">…possibly from different companies, with no shared check between them.</li>
      </ul>
    </div>
  );
}

const CHECKS: { title: string; establishes: string; not: string; outcome: Outcome }[] = [
  { title: "Reconcile with the registry", outcome: "passed", establishes: "The cited units appear as retired in a public registry snapshot (Berkeley VROD, data through 31 Aug 2026).", not: "Retirements after the snapshot, or private broker allocation agreements." },
  { title: "Check the ledger for overlaps", outcome: "double-use", establishes: "No other registered claim holds any of the same units in the same issuance batch.", not: "Claims that were never registered on the ledger." },
  { title: "Fingerprint the evidence", outcome: "fingerprint-match", establishes: "A document is byte-identical to the one committed when the claim was registered.", not: "That the document's content is true." },
  { title: "Anchor on ClaimLedger", outcome: "anchored", establishes: "An append-only record with neutral ordering. The contract itself refuses any overlapping unit range.", not: "Credit quality, additionality or permanence. Those need other tools." },
];

export default function Landing() {
  const [o, setO] = useState<any>(null);
  const [claims, setClaims] = useState<any[] | null>(null);
  const [offline, setOffline] = useState(false);
  const loc = useLocation();
  const howRef = useRef<HTMLElement>(null);

  useEffect(() => {
    api.overview().then(setO).catch(() => setOffline(true));
    api.claims().then(setClaims).catch(() => setClaims([]));
  }, []);
  useEffect(() => {
    if (loc.hash === "#how") howRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [loc.hash]);

  const vr = o?.registry_audit?.verra_retirements;
  const du = o?.evaluation?.double_use;
  const anchored = (o?.claims?.by_status?.anchored ?? 0) + (o?.claims?.by_status?.challenged ?? 0);

  return (
    <div className="min-h-dvh">
      <a href="#story" className="skip-link">Skip to content</a>

      {/* ------------------------------------------------------------ hero */}
      <div className="on-night relative overflow-hidden bg-night text-white">
        <ContourField />
        <SiteHeader />
        <section id="story" className="relative mx-auto grid max-w-[1240px] gap-10 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:pt-16 lg:pb-24">
          <div className="space-y-6">
            <p className="text-sm text-night-text">
              {o?.chain?.block_number != null
                ? <>Running now on a local dev chain · block <span className="font-mono text-white">{o.chain.block_number}</span> · {anchored} claim{anchored === 1 ? "" : "s"} anchored</>
                : "Carbon credit claim integrity"}
            </p>
            <h1 className="text-[40px] leading-[1.04] font-[750] tracking-[-0.03em] text-balance text-white sm:text-[56px] xl:text-[60px]">
              Every retired tonne, claimed once.
            </h1>
            <p className="max-w-[46ch] text-[17px] leading-[1.65] text-night-text">
              Registries stop a carbon credit from being retired twice. OnceOnly checks the next step: that the same retired units don't end up behind two companies' climate claims.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/claims/new" variant="night">Check a claim <ArrowRight size={16} aria-hidden /></LinkButton>
              <LinkButton to="/#how" variant="night-ghost">How it works</LinkButton>
            </div>
          </div>
          <HeroInstrument />
        </section>
      </div>

      <main>
        {/* --------------------------------------------------------- problem */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="space-y-5">
              <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">A retirement happens once. Claims about it happen everywhere.</h2>
              <p className="max-w-[56ch] text-[16.5px] leading-relaxed text-ink-soft">
                Once a credit is retired, the claim built on it lives in reports, labels and web pages. A broker can retire one block on behalf of many customers, and an auditor sees only its own client's serials. Nothing compares claims <em>across</em> companies.
              </p>
              <p className="max-w-[56ch] text-[16.5px] leading-relaxed text-ink-soft">
                Since VCMI's Claims Code asks companies to disclose the serial numbers behind their claims, that comparison has become possible.
              </p>
            </div>
            <FanOut />
          </Reveal>
          <Reveal className="mt-16 grid gap-px overflow-hidden rounded-sheet border border-rule bg-rule sm:grid-cols-3">
            {[
              { k: vr ? `${fmt(vr.rows)}` : "—", t: "Verra retirements parsed", d: vr ? `None of them is retired twice within its batch. The registry layer holds (${fmt(vr.overlapping_adjacent_pairs_within_namespace)} overlaps).` : "Registry audit not loaded." },
              { k: vr ? `${(100 - (vr.with_beneficiary / vr.rows) * 100).toFixed(1)}%` : "—", t: "record no beneficiary", d: "So the registry often cannot say who is entitled to claim the retired units." },
              { k: "1 client", t: "per assurance engagement", d: "An auditor checks its client's serials, not whether another company cites the same units." },
            ].map((f) => (
              <div key={f.t} className="bg-sheet p-6">
                <div className="text-[34px] leading-none font-bold tracking-tight">{f.k}</div>
                <div className="mt-2 text-sm font-semibold">{f.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{f.d}</p>
              </div>
            ))}
          </Reveal>
          <p className="mt-3 text-xs text-muted">Source: Berkeley Carbon Trading Project, VROD v2026-08 registry files (CC BY 4.0), parsed by <span className="font-mono">make data</span>.</p>
        </section>

        {/* ------------------------------------------------------- mechanism */}
        <section id="how" ref={howRef} className="on-night relative scroll-mt-4 overflow-hidden bg-night text-white">
          <ContourField drift={false} className="opacity-70" />
          <div className="relative mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
            <Reveal className="max-w-[60ch] space-y-4">
              <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">A claim is an interval.</h2>
              <p className="text-[16.5px] leading-relaxed text-night-text">
                Every Verra and Gold Standard serial encodes a contiguous range of unit numbers inside one issuance batch. Read the serial, and "has anyone else claimed this?" becomes an exact question about overlapping intervals. Hashes can't answer it: two different serials can share units.
              </p>
            </Reveal>
            <Reveal className="mt-10 grid gap-8 rounded-sheet border border-night-line bg-night-2/70 p-5 sm:p-7 lg:grid-cols-2 lg:gap-12">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">1 · Read the serial <span className="font-normal text-night-text">(select a part)</span></h3>
                <SerialAnatomy serial={NW_SERIAL} night />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">2 · Place it on the batch</h3>
                <Ruler namespace="VCS:18453" night compactLabels domain={[REAL.start, REAL.end]} focusKey="nw" lanes={[
                  { key: "registry", label: "Batch 18453", sub: "retired block", tone: "registry", bands: [{ ...REAL, title: "Retired 2026-08-06", detail: "Real Verra retirement record." }] },
                  { key: "nw", label: "This serial", sub: "10,000 units", tone: "focus", bands: [{ ...NW, title: "Units this serial covers", detail: "The first and last unit come straight from the serial: 10,000 units." }] },
                ]} />
              </div>
            </Reveal>
            <Reveal className="mt-6 max-w-[80ch] text-sm leading-relaxed text-night-text">
              Unit numbers are unique only inside a batch. Measured on the registry data, treating them as registry-wide would create{" "}
              <span className="font-semibold text-white">{o?.registry_audit ? fmt(o.registry_audit.verra_retirements.overlapping_adjacent_pairs_if_batch_ignored) : "thousands of"}</span> false overlaps, so every range on the ledger is keyed by registry <em>and</em> batch.
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- checks */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-[62ch] space-y-4">
            <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">Four checks. Four different guarantees.</h2>
            <p className="text-[16.5px] leading-relaxed text-ink-soft">Each result in OnceOnly says what it established and what it did not. They never share one green tick.</p>
          </Reveal>
          <ol className="mt-12 divide-y divide-rule border-y border-rule">
            {CHECKS.map((c, i) => (
              <Reveal as="li" key={c.title} className="grid gap-4 py-6 md:grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)] md:gap-8">
                <div className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</div>
                <div className="space-y-2"><div className="text-[17px] font-semibold">{c.title}</div><OutcomeToken outcome={c.outcome} /></div>
                <div><div className="text-xs font-semibold text-lichen">Establishes</div><p className="mt-1 text-[15px] leading-relaxed">{c.establishes}</p></div>
                <div><div className="text-xs font-semibold text-ink-soft">Does not establish</div><p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{c.not}</p></div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------ live ledger */}
        <section className="border-y border-rule bg-fog-2/60">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:py-24">
            <Reveal className="space-y-4">
              <h2 className="text-[28px] leading-tight font-bold tracking-tight">The ledger, right now.</h2>
              <p className="text-[15.5px] leading-relaxed text-ink-soft">This is the running prototype, not a mock-up: claims checked against real registry records and registered on a ClaimLedger contract on a local development chain. Claimants are fictional.</p>
              <LinkButton to="/claims" variant="secondary">Open the claims ledger</LinkButton>
            </Reveal>
            <Reveal>
              {offline ? (
                <div className="rounded-panel border border-dashed border-rule-strong bg-sheet p-6 text-sm text-ink-soft">The API isn't reachable, so the live ledger can't be shown. Start it with <span className="font-mono">make api</span>.</div>
              ) : (
                <div className="overflow-hidden rounded-sheet border border-rule bg-sheet">
                  <dl className="grid grid-cols-2 divide-x divide-rule border-b border-rule sm:grid-cols-4">
                    {[
                      ["Claims anchored", fmt(anchored)],
                      ["Units locked", fmt(o?.claims?.units_anchored)],
                      ["Flagged for double use", fmt(o?.claims?.with_double_use_findings)],
                      ["Rejected by contract", fmt(o?.claims?.chain_rejections)],
                    ].map(([k, v], i) => (
                      <div key={k} className={`p-4 ${i >= 2 ? "border-t border-rule sm:border-t-0" : ""}`}><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 text-2xl font-bold tracking-tight">{o ? v : "…"}</dd></div>
                    ))}
                  </dl>
                  <ul className="divide-y divide-rule">
                    {(claims ?? []).slice(0, 5).map((c) => (
                      <li key={c.id}>
                        <Link viewTransition to={`/claims/${c.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fog sm:grid-cols-[7.5rem_1fr_6rem_auto]">
                          <span className="font-mono text-xs text-ink-soft">{c.ref}</span>
                          <span className="order-first col-span-2 truncate text-sm font-medium sm:order-none sm:col-span-1">{c.claimant.replace(" (SYNTHETIC)", "")}</span>
                          <span className="text-right text-sm text-ink-soft">{c.total_units ? `${fmt(c.total_units)} units` : "no serials"}</span>
                          <StatusPill status={c.status} />
                        </Link>
                      </li>
                    ))}
                    {claims && claims.length === 0 && <li className="px-4 py-6 text-sm text-ink-soft">No claims yet. <Link to="/claims/new" className="underline">Check the first one</Link>.</li>}
                  </ul>
                  {o?.chain?.address && <div className="border-t border-rule bg-fog/50 px-4 py-2.5 text-xs text-muted">ClaimLedger <span className="font-mono">{short(o.chain.address, 8)}</span> · chain id {o.chain.chain_id} (local development network, not a public blockchain)</div>}
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* --------------------------------------------------------- evidence */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="space-y-4">
              <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">Why intervals, not hashes.</h2>
              <p className="text-[16.5px] leading-relaxed text-ink-soft">
                We built {du ? fmt(du.n) : "270"} labelled claim pairs on real registry ranges. A check that compares serial strings or document hashes finds exact copies, and misses every partial, contained or reformatted overlap.
              </p>
              <p className="text-sm leading-relaxed text-muted">The pairs are synthetic and their ground truth uses the same interval definition as OnceOnly, so its perfect score shows correct implementation, not real-world accuracy.</p>
              <Link viewTransition to="/evidence" className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">Read the full evaluation <ArrowRight size={15} aria-hidden /></Link>
            </div>
            {du?.by_category ? <CategoryChart byCat={du.by_category} /> : <div className="rounded-panel border border-dashed border-rule-strong p-6 text-sm text-muted">Run <span className="font-mono">make eval</span> to populate this chart.</div>}
          </Reveal>
        </section>

        {/* ------------------------------------------------------------ close */}
        <section className="on-night relative overflow-hidden bg-night text-white">
          <ContourField drift={false} className="opacity-60" />
          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:py-24">
            <div className="space-y-4">
              <h2 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[36px]">See it reject a double claim.</h2>
              <p className="max-w-[52ch] text-[16.5px] leading-relaxed text-night-text">Check the clean sample statement, anchor it, then submit the overlapping one. The interface flags it, and the contract refuses it on chain.</p>
              <div className="flex flex-wrap gap-3 pt-1"><LinkButton to="/claims/new" variant="night">Check a claim <ArrowRight size={16} aria-hidden /></LinkButton><LinkButton to="/verify" variant="night-ghost">Verify a claim</LinkButton></div>
            </div>
            <ul className="space-y-3 text-[15px] leading-relaxed text-night-text">
              {["It does not judge credit quality, additionality or permanence.", "A conflict is a potential double use to review, not proof of fraud.", "A matching hash proves a file is unchanged, not that it is true.", "It cannot see claims that were never registered on the ledger.", "The prototype runs on a local development chain."].map((t) => (
                <li key={t} className="flex gap-3"><span className="mt-2.5 h-px w-4 shrink-0 bg-night-text" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter night />
    </div>
  );
}

function CategoryChart({ byCat }: { byCat: Record<string, any> }) {
  const rows = Object.values(byCat) as any[];
  return (
    <figure className="rounded-sheet border border-rule bg-sheet p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Cases handled correctly, by case type (n = 30 each)</span>
        <span className="flex gap-4 text-xs text-ink-soft"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] bg-ink" aria-hidden />OnceOnly</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] border border-slate hatch-slate" aria-hidden />Serial/hash baseline</span></span>
      </figcaption>
      <table className="w-full text-sm">
        <thead className="sr-only"><tr><th>Case type</th><th>Truth</th><th>OnceOnly correct</th><th>Baseline correct</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="align-middle">
              <th scope="row" className="w-[46%] py-1.5 pr-3 text-left text-[13px] font-normal text-ink-soft">{r.label}<span className="sr-only">, truth: {r.truth ? "double use" : "not double use"}</span></th>
              <td className="py-1.5" colSpan={2}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><div className="h-2 rounded-[2px] bg-ink" style={{ width: `${(r.onceonly_correct / r.n) * 80}%` }} /><span className="font-mono text-[11px] text-ink-soft">{r.onceonly_correct}/{r.n}</span></div>
                  <div className="flex items-center gap-2"><div className={`h-2 rounded-[2px] border border-slate hatch-slate ${r.baseline_correct === 0 ? "w-px border-crimson" : ""}`} style={r.baseline_correct ? { width: `${(r.baseline_correct / r.n) * 80}%` } : undefined} /><span className={`font-mono text-[11px] ${r.baseline_correct === 0 ? "font-semibold text-crimson" : "text-ink-soft"}`}>{r.baseline_correct}/{r.n}</span></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
