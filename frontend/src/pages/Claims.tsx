import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, fmt, type ClaimSummary } from "../api";
import { Button, ErrorBox, StatusPill, SyntheticNote } from "../components/ui";

export default function Claims() {
  const [rows, setRows] = useState<ClaimSummary[] | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const nav = useNavigate();
  useEffect(() => { api.claims().then(setRows).catch(setErr); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claims ledger</h1>
          <p className="text-sm text-ink-soft">Every claim checked by OnceOnly, newest first. Anchored and challenged claims lock their units on the contract.</p>
        </div>
        <Link to="/claims/new"><Button>Check a claim</Button></Link>
      </div>
      <ErrorBox error={err} />
      {rows && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-rule bg-sheet p-8 text-center">
          <p className="font-semibold">No claims yet</p>
          <p className="mt-1 text-sm text-ink-soft">Start with one of the sample allocation statements to see how a clean claim and an overlapping claim are handled.</p>
          <Link to="/claims/new" className="mt-4 inline-block"><Button>Check a claim</Button></Link>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-rule bg-sheet">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-rule text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Reference</th>
                <th className="px-4 py-2.5 font-medium">Claimant</th>
                <th className="px-4 py-2.5 text-right font-medium">Units</th>
                <th className="px-4 py-2.5 font-medium">Findings</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">On chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-fog/60" onClick={() => nav(`/claims/${c.id}`)}>
                  <td className="px-4 py-3"><Link to={`/claims/${c.id}`} className="font-mono text-xs font-medium underline decoration-rule underline-offset-2">{c.ref}</Link></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">{c.claimant.replace(" (SYNTHETIC)", "")}{c.synthetic && <SyntheticNote compact />}</div>
                    {c.period && <div className="text-xs text-muted">{c.period}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(c.total_units)}<div className="text-xs text-muted">{c.block_count} block{c.block_count === 1 ? "" : "s"}</div></td>
                  <td className="px-4 py-3 text-xs">
                    {c.finding_counts.blocking ? <span className="mr-3 font-semibold text-crimson">{c.finding_counts.blocking} blocking</span> : null}
                    {c.finding_counts.review ? <span className="mr-3 font-semibold text-ochre">{c.finding_counts.review} to review</span> : null}
                    {!c.finding_counts.blocking && !c.finding_counts.review && <span className="text-lichen">Clear</span>}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{c.chain_claim_id ? `#${c.chain_claim_id} · block ${c.block_number}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
