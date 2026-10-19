import { useEffect, useState } from "react";
import { api, fmt } from "../api";
import { ErrorBox, OutcomeToken, PageHeader, SectionHeader } from "../components/primitives";

const pct = (x: number | null | undefined) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const dec = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(2));

export default function Evidence() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api.evaluation().then(setD).catch(setErr); }, []);
  const a = d?.registry_audit;
  const e = d?.latest;
  const g = d?.gas;
  const du = e?.double_use;
  const parser = e?.extraction?.methods?.parser;
  const totalRows = a ? a.verra_retirements.rows + a.verra_issuances.rows + a.gold_retirements.rows : null;
  const totalParsed = a ? a.verra_retirements.parsed + a.verra_issuances.parsed + a.gold_retirements.parsed : null;
  const gasHinted = g?.rows?.slice(1).map((r: any) => r.hinted);
  const gasLast = g?.rows?.[g.rows.length - 1];

  return (
    <div>
      <PageHeader
        title="Evidence"
        lede={<>What the prototype has measured, read directly from result files produced by the repository's scripts (<span className="font-mono text-[13px]">make data</span>, <span className="font-mono text-[13px]">make eval</span>, <span className="font-mono text-[13px]">make test</span>). Synthetic inputs are labelled as such.</>}
      />
      <ErrorBox error={err} title="Could not load results" />

      {/* headline results */}
      <ol className="mb-12 grid gap-px overflow-hidden rounded-sheet border border-rule bg-rule md:grid-cols-2 xl:grid-cols-4">
        <Headline n="01" title="Serials become unit ranges" value={a ? `${fmt(totalParsed)} / ${fmt(totalRows)}` : "…"} detail="Real Verra and Gold Standard registry rows parsed into (batch, first unit, last unit); every range size matches the stated quantity." token={<OutcomeToken outcome="passed" label="Real data" />} />
        <Headline n="02" title="Intervals catch what hashes miss" value={du ? `${dec(du.onceonly.recall)} vs ${dec(du.baseline.recall)}` : "…"} detail={du ? `Recall on ${fmt(du.n)} synthetic claim pairs built on real registry ranges: interval check vs exact serial/hash match. Ground truth uses the same interval definition, so OnceOnly\u2019s 1.00 is expected; the baseline gap is the finding.` : ""} token={<OutcomeToken outcome="review" label="Synthetic pairs" />} />
        <Headline n="03" title="Contract cost stays flat" value={gasHinted ? `${fmt(gasHinted[0])} gas` : "…"} detail={gasLast ? `Registering into a batch with 10 to ${gasLast.existing} active ranges. A linear scan grew to ${fmt(gasLast.linear)} gas.` : "Run the contract tests to generate gas results."} token={<OutcomeToken outcome="passed" label="Measured" />} />
        <Headline n="04" title="Serial extraction, parser only" value={parser ? `${pct(parser.doc_exact)} exact` : "…"} detail={parser ? `Share of ${parser.n} synthetic document snippets (real serial ranges, 8 layouts) where the parser recovered every serial block exactly. It never invented a block (precision ${dec(parser.block_precision)}) but fails on tables, prose ranges and OCR errors. The AI pass is implemented but not measured.` : ""} token={<OutcomeToken outcome="not-established" label="AI not measured" />} />
      </ol>

      <div className="space-y-14">
        <section aria-labelledby="reg-h">
          <SectionHeader id="reg-h" title="Real registry data: can serials be parsed into unit ranges?" aside={a ? `${a.source.version} · ${a.source.license}` : undefined} />
          {a ? (
            <>
              <div className="overflow-x-auto rounded-panel border border-rule bg-sheet">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-rule text-left text-xs text-muted">
                    <tr><th className="px-4 py-2.5 font-medium">Records</th><th className="px-4 py-2.5 text-right font-medium">Rows</th><th className="px-4 py-2.5 text-right font-medium">Serials parsed</th><th className="px-4 py-2.5 text-right font-medium">Range size = quantity</th><th className="px-4 py-2.5 text-right font-medium">Overlaps within a batch</th></tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {[["Verra retirements", a.verra_retirements], ["Verra issuances", a.verra_issuances], ["Gold Standard retirements", a.gold_retirements]].map(([label, r]: any) => (
                      <tr key={label}>
                        <th scope="row" className="px-4 py-2.5 text-left font-medium">{label}</th>
                        <td className="px-4 py-2.5 text-right">{fmt(r.rows)}</td>
                        <td className="px-4 py-2.5 text-right">{fmt(r.parsed)} <span className="text-muted">({pct(r.parsed / r.rows)})</span></td>
                        <td className="px-4 py-2.5 text-right">{fmt(r.qty_consistent)} <span className="text-muted">({pct(r.qty_consistent / r.parsed)})</span></td>
                        <td className="px-4 py-2.5 text-right">{r.overlapping_adjacent_pairs_within_namespace == null ? "—" : fmt(r.overlapping_adjacent_pairs_within_namespace)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-[80ch] text-sm leading-relaxed text-ink-soft">
                Overlaps are counted as adjacent overlapping pairs after sorting each batch's records by first unit (zero adjacent pairs means no two records in a batch overlap at all).
                Unit numbers are unique only inside an issuance batch. Sorting all Verra retirements by unit number <em>without</em> the batch produces <strong className="text-ink">{fmt(a.verra_retirements.overlapping_adjacent_pairs_if_batch_ignored)}</strong> adjacent "overlapping" pairs, every one between records of different batches: collisions created by the wrong key, not overlaps. That is why every ledger range is keyed by registry and batch.
                Of the {a.gold_retirements.overlapping_adjacent_pairs_within_namespace} Gold Standard pairs, 3 are exact duplicate rows and 2 come from one 10,000-unit record whose range exactly equals two other records combined. We report them as registry data inconsistencies to clarify, not as double retirements or as findings about any organisation. Source: {a.source.dataset}.
              </p>
            </>
          ) : <p className="text-sm text-muted">Registry audit not found. Run <span className="font-mono">make data</span>.</p>}
        </section>

        <section aria-labelledby="du-h">
          <SectionHeader id="du-h" title="Double-use detection on labelled claim pairs" aside={e ? `generated ${e.generated_at}` : undefined} />
          {du ? (
            <div className="space-y-5">
              <p className="max-w-[80ch] text-sm leading-relaxed text-ink-soft">{du.description}</p>
              <div className="overflow-x-auto rounded-panel border border-rule bg-sheet">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="border-b border-rule text-left text-xs text-muted"><tr><th className="px-4 py-2.5 font-medium">Method</th><th className="px-4 py-2.5 text-right font-medium">Precision</th><th className="px-4 py-2.5 text-right font-medium">Recall</th><th className="px-4 py-2.5 text-right font-medium">False positives</th><th className="px-4 py-2.5 text-right font-medium">False negatives</th></tr></thead>
                  <tbody className="divide-y divide-rule">
                    {[["OnceOnly rules engine", du.onceonly], ["ClaimLedger contract (replayed on chain)", du.contract], ["Baseline: exact serial or document hash", du.baseline], ["Ablation: interval overlap ignoring the batch", du.numbers_only]].filter(([, m]) => m && "tp" in m).map(([label, m]: any) => (
                      <tr key={label}><th scope="row" className="px-4 py-2.5 text-left font-medium">{label}</th><td className="px-4 py-2.5 text-right">{dec(m.precision)}</td><td className={`px-4 py-2.5 text-right ${m.recall < 0.5 ? "font-semibold text-crimson" : ""}`}>{dec(m.recall)}</td><td className={`px-4 py-2.5 text-right ${m.fp > 0 ? "font-semibold text-crimson" : ""}`}>{m.fp}</td><td className={`px-4 py-2.5 text-right ${m.fn > 0 ? "font-semibold text-crimson" : ""}`}>{m.fn}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {du.contract_agrees_with_engine != null && <p className="text-sm text-ink-soft">Contract and rules engine agree on {(du.contract_agrees_with_engine * 100).toFixed(1)}% of cases.</p>}
              <div className="overflow-x-auto rounded-panel border border-rule bg-sheet">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="px-4 pt-3 text-left text-xs text-muted">Correct out of 30, by case type</caption>
                  <thead className="border-b border-rule text-left text-xs text-muted"><tr><th className="px-4 py-2.5 font-medium">Case type</th><th className="px-4 py-2.5 font-medium">Truth</th><th className="px-4 py-2.5 text-right font-medium">OnceOnly</th><th className="px-4 py-2.5 text-right font-medium">Contract</th><th className="px-4 py-2.5 text-right font-medium">Baseline</th><th className="px-4 py-2.5 text-right font-medium">Ignoring batch</th></tr></thead>
                  <tbody className="divide-y divide-rule">
                    {Object.values(du.by_category).map((v: any) => (
                      <tr key={v.label}>
                        <th scope="row" className="px-4 py-2.5 text-left font-normal">{v.label}</th>
                        <td className="px-4 py-2.5 text-ink-soft">{v.truth ? "double use" : "not double use"}</td>
                        <Cell v={v.onceonly_correct} n={v.n} /><Cell v={v.contract_correct} n={v.n} /><Cell v={v.baseline_correct} n={v.n} /><Cell v={v.numbers_only_correct} n={v.n} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-sm text-muted">Not run yet. Run <span className="font-mono">make eval</span>.</p>}
        </section>

        <section aria-labelledby="gas-h">
          <SectionHeader id="gas-h" title="On-chain cost as a batch fills" aside="Hardhat · solc 0.8.24 · optimizer 200" />
          {g?.rows ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <GasChart rows={g.rows} />
              <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
                <p>{g.note}</p>
                <p>ClaimLedger keeps each batch's active ranges in a sorted linked list. The caller supplies the predecessor and the contract checks only the two neighbours, so cost does not grow with the number of claims. A wrong hint can only cause a revert, never an accepted overlap (tested with 300 adversarial random hints).</p>
                <p>The largest real Verra batch has {a ? fmt(a.verra_retirements.retirements_per_namespace.max) : "tens of thousands of"} retirements, which is why the linear scan of the first version was replaced.</p>
              </div>
            </div>
          ) : <p className="text-sm text-muted">Run <span className="font-mono">make test-contracts</span> to generate gas results.</p>}
        </section>

        <section aria-labelledby="ex-h">
          <SectionHeader id="ex-h" title="Serial extraction from documents" />
          {e?.extraction ? (
            <div className="space-y-4">
              <p className="max-w-[80ch] text-sm leading-relaxed text-ink-soft">{e.extraction.description}</p>
              <div className="overflow-x-auto rounded-panel border border-rule bg-sheet">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-rule text-left text-xs text-muted"><tr><th className="px-4 py-2.5 font-medium">Extractor</th><th className="px-4 py-2.5 text-right font-medium">Documents</th><th className="px-4 py-2.5 text-right font-medium">All blocks exact</th><th className="px-4 py-2.5 text-right font-medium">Block precision</th><th className="px-4 py-2.5 text-right font-medium">Block recall</th></tr></thead>
                  <tbody className="divide-y divide-rule">
                    {Object.entries(e.extraction.methods).map(([k, m]: any) => (
                      <tr key={k}><th scope="row" className="px-4 py-2.5 text-left font-medium">{m.label}</th>{m.status === "ok" ? <><td className="px-4 py-2.5 text-right">{m.n}</td><td className="px-4 py-2.5 text-right">{pct(m.doc_exact)}</td><td className="px-4 py-2.5 text-right">{dec(m.block_precision)}</td><td className="px-4 py-2.5 text-right">{dec(m.block_recall)}</td></> : <td colSpan={4} className="px-4 py-2.5 text-right text-ink-soft">{m.status}</td>}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parser?.per_variant && (
                <ul className="flex flex-wrap gap-2 text-xs" aria-label="Parser results by layout">
                  {Object.entries(parser.per_variant).map(([k, v]: any) => (
                    <li key={k} className={`rounded-token border px-2 py-1 ${v.correct === v.n ? "border-lichen/30 bg-lichen-wash text-lichen" : "border-crimson/40 bg-crimson-wash text-crimson"}`}>{k.replaceAll("_", " ")} <span className="font-mono">{v.correct}/{v.n}</span></li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p className="text-sm text-muted">Not run yet. Run <span className="font-mono">make eval</span>.</p>}
        </section>

        <section aria-labelledby="lim-h">
          <SectionHeader id="lim-h" title="Limits of this evidence" />
          <ul className="grid max-w-[90ch] gap-x-10 gap-y-2.5 text-sm leading-relaxed text-ink-soft md:grid-cols-2">
            <li>The labelled claim pairs are synthetic. Their serial ranges come from real registry records, but no real company's claims were tested.</li>
            <li>Ground truth uses the same interval definition as the engine, so it verifies the implementation, not real-world accuracy.</li>
            <li>Registry data stops at 31 August 2026; later retirements are reported as "not found" rather than as errors.</li>
            <li>We found no documented public case of two companies citing the same retirement, so prevalence is unmeasured.</li>
            <li>Contract behaviour and gas are measured on a local development chain.</li>
            <li>AI extraction accuracy, cost and latency are not yet measured.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Headline({ n, title, value, detail, token }: { n: string; title: string; value: string; detail: string; token: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 bg-sheet p-5">
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-muted">{n}</span>{token}</div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-[26px] leading-tight font-bold tracking-tight">{value}</div>
      <p className="text-xs leading-relaxed text-ink-soft">{detail}</p>
    </li>
  );
}

function Cell({ v, n }: { v: number | undefined; n: number }) {
  if (v == null) return <td className="px-4 py-2.5 text-right text-muted">—</td>;
  return <td className={`px-4 py-2.5 text-right font-mono text-[13px] ${v < n ? "font-semibold text-crimson" : ""}`}>{v}/{n}</td>;
}

function GasChart({ rows }: { rows: { existing: number; hinted: number; linear: number }[] }) {
  const max = Math.max(...rows.map((r) => Math.max(r.hinted, r.linear)));
  return (
    <figure className="rounded-panel border border-rule bg-sheet p-4">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold">Gas per registration</span>
        <span className="flex gap-4 text-xs text-ink-soft"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] bg-ink" aria-hidden />Sorted list (current)</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] border border-slate hatch-slate" aria-hidden />Linear scan (v0)</span></span>
      </figcaption>
      <table className="w-full text-sm">
        <thead className="sr-only"><tr><th>Active ranges in batch</th><th>Sorted list gas</th><th>Linear gas</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.existing}>
              <th scope="row" className="w-24 py-1.5 pr-3 text-left text-xs font-normal text-ink-soft">{r.existing} existing</th>
              <td className="py-1.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><div className="h-2.5 rounded-[2px] bg-ink" style={{ width: `${(r.hinted / max) * 78}%` }} /><span className="font-mono text-[11px] text-ink-soft">{fmt(r.hinted)}</span></div>
                  <div className="flex items-center gap-2"><div className="h-2.5 rounded-[2px] border border-slate hatch-slate" style={{ width: `${(r.linear / max) * 78}%` }} /><span className="font-mono text-[11px] text-ink-soft">{fmt(r.linear)}</span></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
