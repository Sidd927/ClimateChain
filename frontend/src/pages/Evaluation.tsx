import { useEffect, useState } from "react";
import { api, fmt } from "../api";
import { ErrorBox, Section } from "../components/ui";

const pct = (x: number | null | undefined) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const dec = (x: number | null | undefined) => (x == null ? "—" : x.toFixed(2));

export default function Evaluation() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api.evaluation().then(setD).catch(setErr); }, []);
  const a = d?.registry_audit;
  const e = d?.latest;

  return (
    <div className="space-y-10">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Evidence</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Every number on this page is read from result files produced by the repository's scripts. Rerun them with <span className="font-mono">make data</span> and <span className="font-mono">make eval</span>.
        </p>
      </div>
      <ErrorBox error={err} />

      <Section title="Real registry data: can serials be parsed into unit ranges?" aside={a && <span className="text-xs text-muted">{a.source.dataset}, {a.source.version}, {a.source.license}</span>}>
        {a ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="py-2 pr-4 font-medium">Records</th><th className="py-2 pr-4 text-right font-medium">Rows</th><th className="py-2 pr-4 text-right font-medium">Serials parsed</th><th className="py-2 pr-4 text-right font-medium">Range size = stated quantity</th><th className="py-2 text-right font-medium">Overlapping retirements in a batch</th></tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {[["Verra retirements", a.verra_retirements], ["Verra issuances", a.verra_issuances], ["Gold Standard retirements", a.gold_retirements]].map(([label, r]: any) => (
                  <tr key={label}>
                    <td className="py-2 pr-4">{label}</td>
                    <td className="py-2 pr-4 text-right">{fmt(r.rows)}</td>
                    <td className="py-2 pr-4 text-right">{fmt(r.parsed)} <span className="text-muted">({pct(r.parsed / r.rows)})</span></td>
                    <td className="py-2 pr-4 text-right">{fmt(r.qty_consistent)} <span className="text-muted">({pct(r.qty_consistent / r.parsed)})</span></td>
                    <td className="py-2 text-right">{r.overlapping_adjacent_pairs_within_namespace == null ? "—" : fmt(r.overlapping_adjacent_pairs_within_namespace)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 max-w-[80ch] text-sm text-ink-soft">
              Unit numbers are only unique inside an issuance batch: treating them as registry-wide would create {fmt(a.verra_retirements.overlapping_adjacent_pairs_if_batch_ignored)} false overlaps in Verra data. That is why every range on the ledger is keyed by registry and batch.
              The {a.gold_retirements.overlapping_adjacent_pairs_within_namespace} Gold Standard overlaps are mostly exact duplicate rows; we treat them as data inconsistencies, not double retirements.
            </p>
          </div>
        ) : <p className="text-sm text-muted">Registry audit not found. Run <span className="font-mono">make data</span>.</p>}
      </Section>

      <Section title="Double-use detection on labelled claims" aside={e && <span className="text-xs text-muted">generated {e.generated_at}</span>}>
        {e?.double_use ? (
          <div className="space-y-4">
            <p className="max-w-[80ch] text-sm text-ink-soft">{e.double_use.description}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr><th className="py-2 pr-4 font-medium">Method</th><th className="py-2 pr-4 text-right font-medium">Precision</th><th className="py-2 pr-4 text-right font-medium">Recall</th><th className="py-2 pr-4 text-right font-medium">False positives</th><th className="py-2 text-right font-medium">False negatives</th></tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {[["OnceOnly unit-interval check", e.double_use.onceonly], ["Baseline: exact serial or document hash match", e.double_use.baseline]].map(([label, m]: any) => (
                    <tr key={label}><td className="py-2 pr-4">{label}</td><td className="py-2 pr-4 text-right">{dec(m.precision)}</td><td className="py-2 pr-4 text-right">{dec(m.recall)}</td><td className="py-2 pr-4 text-right">{m.fp}</td><td className="py-2 text-right">{m.fn}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {e.double_use.by_category && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted"><tr><th className="py-2 pr-4 font-medium">Case type</th><th className="py-2 pr-4 text-right font-medium">Cases</th><th className="py-2 pr-4 font-medium">Truth</th><th className="py-2 pr-4 text-right font-medium">OnceOnly correct</th><th className="py-2 text-right font-medium">Baseline correct</th></tr></thead>
                  <tbody className="divide-y divide-rule">
                    {Object.entries(e.double_use.by_category).map(([k, v]: any) => (
                      <tr key={k}><td className="py-2 pr-4">{v.label}</td><td className="py-2 pr-4 text-right">{v.n}</td><td className="py-2 pr-4">{v.truth ? "double use" : "not double use"}</td><td className="py-2 pr-4 text-right">{v.onceonly_correct}/{v.n}</td><td className="py-2 text-right">{v.baseline_correct}/{v.n}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted">Not run yet. Run <span className="font-mono">make eval</span>.</p>}
      </Section>

      <Section title="Serial extraction from documents">
        {e?.extraction ? (
          <div className="space-y-3">
            <p className="max-w-[80ch] text-sm text-ink-soft">{e.extraction.description}</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-muted"><tr><th className="py-2 pr-4 font-medium">Extractor</th><th className="py-2 pr-4 text-right font-medium">Documents</th><th className="py-2 pr-4 text-right font-medium">All blocks exact</th><th className="py-2 pr-4 text-right font-medium">Block precision</th><th className="py-2 text-right font-medium">Block recall</th></tr></thead>
                <tbody className="divide-y divide-rule">
                  {Object.entries(e.extraction.methods).map(([k, m]: any) => (
                    <tr key={k}><td className="py-2 pr-4">{m.label}</td><td className="py-2 pr-4 text-right">{m.status === "ok" ? m.n : "—"}</td><td className="py-2 pr-4 text-right">{m.status === "ok" ? pct(m.doc_exact) : m.status}</td><td className="py-2 pr-4 text-right">{m.status === "ok" ? dec(m.block_precision) : "—"}</td><td className="py-2 text-right">{m.status === "ok" ? dec(m.block_recall) : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-sm text-muted">Not run yet. Run <span className="font-mono">make eval</span>.</p>}
      </Section>

      <Section title="Limits of this evidence">
        <ul className="max-w-[80ch] list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>The labelled claim sets are synthetic. Their serial ranges come from real registry records, but no real company's claims were tested.</li>
          <li>Registry data stops at 31 August 2026; later retirements are reported as "not found" rather than as errors.</li>
          <li>We found no documented public case of two companies citing the same retirement, so these results measure detection ability, not how often double use happens.</li>
          <li>Contract behaviour is tested on a local development chain.</li>
        </ul>
      </Section>
    </div>
  );
}
