import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { api, fmt, short } from "../api";
import { ContourField } from "../components/ContourField";
import { LinkButton, OutcomeToken, Reveal, StatusPill } from "../components/primitives";
import { Ruler, type RulerLane } from "../components/Ruler";
import { SerialAnatomy } from "../components/SerialAnatomy";
import { SiteFooter, SiteHeader } from "../components/Shell";
import type { Outcome } from "../lib/outcomes";

// Real Verra retirement (Berkeley VROD 2026-08): VCS 1904, batch 18453, retired 2026-08-06.
// Northwind and Helios are synthetic claimants; their ranges are illustrative.
const REAL = { start: 896309560, end: 896329558 };
const NW = { start: 896309560, end: 896319559 };
const HE = { start: 896315001, end: 896322000 };
const NW_SERIAL = "18453-896309560-896319559-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0";
const n = (r: { start: number; end: number }) => r.end - r.start + 1;
const SHARED = { start: Math.max(NW.start, HE.start), end: Math.min(NW.end, HE.end) };

const STAGES = [
  { title: "Retirement", text: `Verra records ${fmt(n(REAL))} units of VCS project 1904 as retired on 6 Aug 2026. This record is real registry data.` },
  { title: "Claim A", text: `Northwind's FY2025 claim cites ${fmt(n(NW))} of those units. ClaimLedger locks them to Northwind.` },
  { title: "Claim B", text: `Helios's claim cites ${fmt(n(HE))} units from the same retirement. Read on its own, each document looks fine.` },
  { title: "Overlap", text: `${fmt(n(SHARED))} units appear in both claims. OnceOnly flags them as potential double use, and the contract refuses the second registration.` },
];

function heroLanes(stage: number): RulerLane[] {
  const lanes: RulerLane[] = [{ key: "registry", label: "Registry record", sub: "VCS 1904 · retired", tone: "registry", bands: [{ ...REAL, title: "Retired 2026-08-06" }] }];
  if (stage >= 1) lanes.push({ key: "nw", label: "Northwind Foods", sub: "claim A · anchored", tone: "claim", locking: true, bands: [{ ...NW, title: "Northwind's claim" }] });
  if (stage >= 2) lanes.push({ key: "he", label: "Helios Apparel", sub: "claim B · submitted", tone: "focus", bands: [{ ...HE, title: "Helios's claim" }] });
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

/** The hero transect: an annotated, unboxed Ruler that plays the verification story once. */
function Transect({ rejectedClaimId }: { rejectedClaimId: number | null }) {
  const reduced = usePrefersReducedMotion();
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [auto, setAuto] = useState(!reduced);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!auto || reduced || stage >= 3) return;
    const t = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 900 : 1400);
    return () => clearTimeout(t);
  }, [stage, auto, reduced]);
  const lanes = useMemo(() => heroLanes(stage), [stage]);

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-night-line pt-3 sm:mb-4">
        <p className="text-[13px] text-night-text">
          <span className="font-mono text-white">VCS:18453</span> · a real Verra retirement<span className="hidden sm:inline"> · units {fmt(REAL.start)}–{fmt(REAL.end)}</span>
          <span className="ml-2 inline-block rounded-token border border-night-line px-1.5 py-px text-[11px]">Illustration: synthetic claimants</span>
        </p>
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Story steps">
          {STAGES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => { setAuto(false); setStage(i); }}
              aria-current={stage === i ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={`press rounded-[5px] px-2 py-1.5 text-xs whitespace-nowrap sm:px-2.5 ${stage === i ? "bg-[#e9f2ef] font-semibold text-night" : stage > i ? "text-night-text hover:text-white" : "text-[#86a2a6] hover:text-white"}`}
            >
              <span className="font-mono">{i + 1}</span><span className="hidden min-[360px]:inline"> {s.title}</span>
            </button>
          ))}
          <button type="button" aria-label="Replay the story" onClick={() => { setStage(reduced ? 3 : 0); setAuto(!reduced); setRun((r) => r + 1); }} className="press ml-1 rounded-[5px] p-1.5 text-night-text hover:text-white">
            <RotateCcw size={14} aria-hidden />
          </button>
        </div>
      </div>
      <div className="min-h-[13.5rem] sm:min-h-[12rem]">
        <Ruler key={run} variant="transect" namespace="VCS:18453" lanes={lanes} focusKey={stage >= 3 ? "he" : undefined} domain={[REAL.start, REAL.end]} night animate={!reduced} />
      </div>
      <div className="mt-2 grid gap-3 sm:ml-[11.25rem] md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-8">
        <p className="min-h-[3rem] text-[15px] leading-relaxed text-night-text" aria-live="polite">{STAGES[stage].text}</p>
        {stage >= 3 && (
          <div className="seal-in space-y-1.5 md:max-w-[26rem]">
            <div className="flex flex-wrap items-center gap-2"><OutcomeToken outcome="rejected" /><span className="font-mono text-[12px] text-[#ffd9df]">RangeOverlap(…, {fmt(SHARED.start)}, {fmt(SHARED.end)})</span></div>
            {rejectedClaimId != null
              ? <Link viewTransition to={`/claims/${rejectedClaimId}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white underline decoration-night-line underline-offset-4 hover:decoration-white">See this rejection as a real transaction in the demo ledger <ArrowRight size={13} aria-hidden /></Link>
              : <span className="text-[12.5px] text-night-text">Illustration of the contract's response.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const CHECKS: { title: string; establishes: string; not: string; outcome: Outcome }[] = [
  { title: "Registry reconciliation", outcome: "passed", establishes: "The cited units appear as retired in a public registry snapshot (data through 31 Aug 2026).", not: "Later retirements; private broker allocations." },
  { title: "Overlap check", outcome: "double-use", establishes: "No other registered claim holds any of the same units in the same batch.", not: "Claims never registered on the ledger; which of two claims is right." },
  { title: "Evidence fingerprint", outcome: "fingerprint-match", establishes: "A document is byte-identical to the one committed at registration.", not: "That the document's content is true." },
  { title: "Contract enforcement", outcome: "anchored", establishes: "An append-only record; the contract itself refuses overlapping unit ranges.", not: "Credit quality, additionality or permanence." },
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

  const audit = o?.registry_audit;
  const vr = audit?.verra_retirements;
  const totalRecords = audit ? audit.verra_retirements.rows + audit.verra_issuances.rows + audit.gold_retirements.rows : null;
  const du = o?.evaluation?.double_use;
  const anchored = (o?.claims?.by_status?.anchored ?? 0) + (o?.claims?.by_status?.challenged ?? 0);
  const rejectedClaimId: number | null = o?.recent_chain_events?.find((e: any) => e.kind === "chain_rejected")?.claim_id ?? null;

  const checksList = (tone: "night" | "day") => (
    <>
      <li><span aria-hidden className={`mr-2 font-mono ${tone === "night" ? "text-white" : "text-ink"}`}>1</span>Reads the serial numbers in a claim's evidence.</li>
      <li><span aria-hidden className={`mr-2 font-mono ${tone === "night" ? "text-white" : "text-ink"}`}>2</span>Matches them to {totalRecords ? fmt(totalRecords) : "about half a million"} real Verra and Gold Standard registry records.</li>
      <li><span aria-hidden className={`mr-2 font-mono ${tone === "night" ? "text-white" : "text-ink"}`}>3</span>Flags units another claim already relies on, and a smart contract refuses to register them twice.</li>
    </>
  );

  return (
    <div className="min-h-dvh">
      <a href="#story" className="skip-link">Skip to content</a>

      {/* ------------------------------------------------------------ hero */}
      <div className="on-night relative overflow-hidden bg-night text-white">
        <ContourField />
        <SiteHeader />
        <section id="story" aria-labelledby="hero-h" className="relative mx-auto max-w-[1240px] px-5 pt-4 pb-12 sm:px-8 lg:pt-6 lg:pb-14">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
            <div className="space-y-4 lg:col-span-7">
              <p className="text-sm text-night-text">Carbon-credit claim integrity</p>
              <h1 id="hero-h" className="text-[38px] leading-[1.03] font-[750] tracking-[-0.03em] text-white sm:text-[56px] xl:text-[62px]">Every retired tonne, claimed once.</h1>
              <p className="max-w-[50ch] text-[17px] leading-[1.6] text-night-text">
                Registries make sure a carbon credit is retired only once. OnceOnly checks what happens next: whether two companies' climate claims rely on the same retired units.
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <LinkButton to="/claims/new" variant="night">Check a claim <ArrowRight size={16} aria-hidden /></LinkButton>
                <Link viewTransition to="/#how" className="text-sm font-semibold text-white underline decoration-night-line underline-offset-4 hover:decoration-white">How it works</Link>
              </div>
            </div>
            <ol className="hidden space-y-3 border-l border-night-line pl-6 text-[14.5px] leading-relaxed text-night-text lg:col-span-5 lg:block" aria-label="What OnceOnly checks">
              {checksList("night")}
            </ol>
          </div>
          <div className="mt-8 lg:mt-9">
            <Transect rejectedClaimId={rejectedClaimId} />
          </div>
        </section>
      </div>

      <main>
        {/* --------------------------------------------------------- problem */}
        <section aria-labelledby="problem-h" className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-24">
          <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div className="space-y-4">
              <h2 id="problem-h" className="text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">A retirement happens once. Claims about it happen everywhere.</h2>
              <p className="max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">
                Once a credit is retired, the claims built on it live in reports, product labels and web pages. A broker can retire one block on behalf of many customers. Nothing compares those claims <em>across</em> companies.
              </p>
              <p className="max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">VCMI's Claims Code asks companies to disclose the serial numbers behind their claims, which makes that comparison possible.</p>
              <ol className="space-y-2 border-l border-rule pl-5 text-[15px] leading-relaxed text-ink-soft lg:hidden" aria-label="What OnceOnly checks">{checksList("day")}</ol>
            </div>
            <dl className="divide-y divide-rule border-y border-rule">
              {[
                { k: vr ? fmt(vr.rows) : "—", t: "Verra retirement records parsed", d: vr ? `None is retired twice within its batch (${fmt(vr.overlapping_adjacent_pairs_within_namespace)} overlaps). The registry layer holds.` : "Registry audit not loaded." },
                { k: vr ? `${(100 - (vr.with_beneficiary / vr.rows) * 100).toFixed(1)}%` : "—", t: "record no beneficiary", d: "So the registry often cannot say who is entitled to claim the retired units." },
                { k: "Per client", t: "is how claims are assured", d: "An assurance engagement covers one company's claims, with no view of other companies citing the same units." },
              ].map((f) => (
                <div key={f.t} className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[11rem_1fr] sm:items-baseline">
                  <dt className="text-[30px] leading-none font-bold tracking-tight">{f.k}</dt>
                  <dd><span className="font-semibold">{f.t}.</span> <span className="text-ink-soft">{f.d}</span></dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <p className="mt-3 text-xs text-muted lg:text-right">Source: Berkeley Carbon Trading Project, VROD v2026-08 registry files (CC BY 4.0), parsed by <span className="font-mono">make data</span>.</p>
        </section>

        {/* ------------------------------------------------------- mechanism */}
        <section id="how" ref={howRef} aria-labelledby="how-h" className="on-night relative scroll-mt-4 overflow-hidden bg-night text-white">
          <ContourField drift={false} className="opacity-70" />
          <div className="relative mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-24">
            <Reveal className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
              <div className="space-y-4">
                <h2 id="how-h" className="text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">A claim is an interval.</h2>
                <p className="text-[16px] leading-relaxed text-night-text">
                  Every Verra and Gold Standard serial encodes a contiguous range of unit numbers inside one issuance batch. Read the serial, and "has anyone else claimed this?" becomes an exact question about overlapping intervals. A hash can't answer it: two different serials can share units.
                </p>
                <p className="text-sm leading-relaxed text-night-text">
                  Unit numbers restart in every batch. In the real Verra data, ignoring the batch makes{" "}
                  <span className="font-semibold text-white">{vr ? fmt(vr.overlapping_adjacent_pairs_if_batch_ignored) : "thousands of"}</span> pairs of records from different batches look as if they overlap. They don't, so every range on the ledger is keyed by registry <em>and</em> batch.
                </p>
              </div>
              <div className="space-y-6 rounded-sheet border border-night-line bg-night-2/70 p-5 sm:p-6">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white">Read a serial <span className="font-normal text-night-text">(select a part)</span></h3>
                  <SerialAnatomy serial={NW_SERIAL} night />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-white">The range it names, on its batch</h3>
                  <Ruler variant="transect" namespace="VCS:18453" night compactLabels domain={[REAL.start, REAL.end]} lanes={[
                    { key: "registry", label: "Batch 18453", sub: "retired block", tone: "registry", bands: [{ ...REAL, title: "Retired" }] },
                    { key: "nw", label: "This serial", sub: `${fmt(n(NW))} units`, tone: "focus", bands: [{ ...NW, title: "Serial range" }] },
                  ]} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- checks */}
        <section aria-labelledby="checks-h" className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-24">
          <Reveal className="mb-8 max-w-[62ch] space-y-3">
            <h2 id="checks-h" className="text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">Four checks. Four different guarantees.</h2>
            <p className="text-[16px] leading-relaxed text-ink-soft">Each result says what it established and what it did not. They never share one green tick.</p>
          </Reveal>
          <Reveal>
            <table className="w-full text-left text-[14.5px]">
              <caption className="sr-only">What each check establishes and does not establish</caption>
              <thead className="hidden border-b border-rule text-xs text-muted md:table-header-group">
                <tr><th scope="col" className="py-2 pr-6 font-medium">Check</th><th scope="col" className="py-2 pr-6 font-medium">Establishes</th><th scope="col" className="py-2 font-medium">Does not establish</th></tr>
              </thead>
              <tbody className="divide-y divide-rule border-b border-rule">
                {CHECKS.map((c) => (
                  <tr key={c.title} className="grid gap-1.5 py-4 md:table-row md:py-0">
                    <th scope="row" className="font-semibold md:w-[24%] md:py-4 md:pr-6 md:align-top"><div className="flex flex-col items-start gap-1.5">{c.title}<OutcomeToken outcome={c.outcome} /></div></th>
                    <td className="leading-relaxed md:w-[42%] md:py-4 md:pr-6 md:align-top"><span className="text-xs font-semibold text-lichen md:hidden">Establishes · </span>{c.establishes}</td>
                    <td className="leading-relaxed text-ink-soft md:py-4 md:align-top"><span className="text-xs font-semibold md:hidden">Does not establish · </span>{c.not}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </section>

        {/* ----------------------------------------------------------- proof */}
        <section aria-labelledby="proof-h" className="border-y border-rule bg-fog-2/60">
          <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 lg:py-24">
            <Reveal className="mb-8 max-w-[64ch] space-y-3">
              <h2 id="proof-h" className="text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">Running, and measured.</h2>
              <p className="text-[16px] leading-relaxed text-ink-soft">The running prototype: claims checked against real registry records and registered on a ClaimLedger contract on a local development chain (claimants are fictional). Beside it, why it compares intervals rather than hashes.</p>
            </Reveal>
            <div className="grid gap-8 lg:grid-cols-2">
              <Reveal>
                {offline ? (
                  <div className="rounded-panel border border-dashed border-rule-strong bg-sheet p-6 text-sm text-ink-soft">The API isn't reachable, so the live ledger can't be shown. Start it with <span className="font-mono">make api</span>.</div>
                ) : (
                  <div className="overflow-hidden rounded-sheet border border-rule bg-sheet">
                    <dl className="grid grid-cols-2 divide-x divide-rule border-b border-rule">
                      {[["Claims anchored", fmt(anchored)], ["Rejected by contract", fmt(o?.claims?.chain_rejections)]].map(([k, v]) => (
                        <div key={k} className="p-4"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 text-2xl font-bold tracking-tight">{o ? v : "…"}</dd></div>
                      ))}
                    </dl>
                    <ul className="divide-y divide-rule">
                      {(claims ?? []).slice(0, 5).map((c, i) => (
                        <li key={c.id} className={i >= 3 ? "hidden sm:list-item" : undefined}>
                          <Link viewTransition to={`/claims/${c.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3 hover:bg-fog">
                            <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.claimant.replace(" (SYNTHETIC)", "")}</span><span className="font-mono text-xs text-ink-soft">{c.ref} · {c.total_units ? `${fmt(c.total_units)} units` : "no serials"}</span></span>
                            <StatusPill status={c.status} />
                          </Link>
                        </li>
                      ))}
                      {claims && claims.length === 0 && <li className="px-4 py-6 text-sm text-ink-soft">No claims yet. <Link to="/claims/new" className="underline">Check the first one</Link>.</li>}
                    </ul>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-fog/50 px-4 py-2.5 text-xs text-muted">
                      <span>{o?.chain?.address ? <>ClaimLedger <span className="font-mono">{short(o.chain.address, 6)}</span> · local dev chain (id {o.chain.chain_id}), not a public network</> : "Ledger status unavailable"}</span>
                      <Link viewTransition to="/claims" className="font-semibold text-ink underline underline-offset-4">Open the ledger</Link>
                    </div>
                  </div>
                )}
              </Reveal>
              <Reveal>
                {du?.by_category ? <CategoryChart byCat={du.by_category} total={du.n} /> : <div className="rounded-panel border border-dashed border-rule-strong p-6 text-sm text-muted">Run <span className="font-mono">make eval</span> to populate this chart.</div>}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ close */}
        <section aria-labelledby="close-h" className="on-night relative overflow-hidden bg-night text-white">
          <ContourField drift={false} className="opacity-60" />
          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
            <div className="space-y-4">
              <h2 id="close-h" className="text-[28px] leading-tight font-bold tracking-tight sm:text-[36px]">See it refuse a double claim.</h2>
              <p className="max-w-[52ch] text-[16px] leading-relaxed text-night-text">Check the clean sample statement and anchor it, then submit the overlapping one. The interface flags it, and the contract refuses it on chain.</p>
              <div className="flex flex-wrap gap-3 pt-1"><LinkButton to="/claims/new" variant="night">Check a claim <ArrowRight size={16} aria-hidden /></LinkButton><LinkButton to="/verify" variant="night-ghost">Verify a claim</LinkButton></div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white">What OnceOnly does not tell you</h3>
              <ul className="space-y-2.5 text-[15px] leading-relaxed text-night-text">
                {["Whether a credit is high quality, additional or permanent.", "Who is at fault: a conflict is potential double use to review, not proof of fraud.", "Whether a document is true: a matching hash proves only that it's unchanged.", "Anything about claims that were never registered on the ledger.", "Anything on a public blockchain: the prototype runs on a local development chain."].map((t) => (
                  <li key={t} className="flex gap-3"><span className="mt-2.5 h-px w-4 shrink-0 bg-night-text" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter night />
    </div>
  );
}

function CategoryChart({ byCat, total }: { byCat: Record<string, any>; total: number }) {
  const all = Object.values(byCat) as any[];
  const perCase = all[0]?.n ?? 0;
  // Chart the case types where the methods differ; state the agreeing ones in words (full table on /evidence).
  const rows = all.filter((r) => r.onceonly_correct !== r.baseline_correct);
  const same = all.filter((r) => r.onceonly_correct === r.baseline_correct);
  return (
    <figure className="rounded-sheet border border-rule bg-sheet p-5">
      <figcaption className="mb-4 space-y-2">
        <div className="text-[15px] font-semibold">Where exact serial or hash matching misses double use</div>
        <p className="text-xs leading-relaxed text-ink-soft">
          {fmt(total)} labelled claim pairs ({perCase} per case type) built on real registry ranges; claimants synthetic. Ground truth uses the same interval definition as OnceOnly, so its full marks show the implementation is correct, not real-world accuracy. The informative part is what the baseline misses.
        </p>
        <span className="flex gap-4 text-xs text-ink-soft"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] bg-ink" aria-hidden />OnceOnly</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] border border-slate hatch-slate" aria-hidden />Exact serial / hash match</span></span>
      </figcaption>
      <table className="w-full text-sm">
        <caption className="sr-only">Cases handled correctly out of {perCase}, by case type</caption>
        <thead className="sr-only"><tr><th scope="col">Case type</th><th scope="col">OnceOnly and baseline, correct out of {perCase}</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="align-middle">
              <th scope="row" className="w-[52%] py-1.5 pr-3 text-left text-[13px] leading-snug font-normal text-ink">{r.label}<span className="sr-only">, truth: {r.truth ? "double use" : "not double use"}</span></th>
              <td className="py-1">
                <div className="flex items-center gap-2"><div className="h-1.5 rounded-[2px] bg-ink" style={{ width: `${(r.onceonly_correct / r.n) * 70}%` }} /><span className="font-mono text-[10.5px] text-ink-soft">{r.onceonly_correct}/{r.n}</span></div>
                <div className="mt-0.5 flex items-center gap-2"><div className={`h-1.5 rounded-[2px] ${r.baseline_correct === 0 ? "w-px bg-crimson" : "border border-slate hatch-slate"}`} style={r.baseline_correct ? { width: `${(r.baseline_correct / r.n) * 70}%` } : undefined} /><span className={`font-mono text-[10.5px] ${r.baseline_correct === 0 ? "font-semibold text-crimson" : "text-ink-soft"}`}>{r.baseline_correct}/{r.n}</span></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {same.length > 0 && <p className="mt-3 text-xs leading-relaxed text-ink-soft">On the other {same.length} case types ({same.map((r) => r.label.toLowerCase()).join("; ")}) both methods are correct in {same.every((r) => r.onceonly_correct === r.n) ? "all" : "most"} cases.</p>}
      <Link viewTransition to="/evidence" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">All results and their limits <ArrowRight size={14} aria-hidden /></Link>
    </figure>
  );
}
