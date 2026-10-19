import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Blocks } from "lucide-react";
import { api, fmt, short, type ClaimSummary } from "../api";
import { CopyValue, ErrorBox, LinkButton, OutcomeToken, PageHeader, SectionHeader } from "../components/primitives";
import { checkOutcome } from "../lib/outcomes";

const CHAIN_EVENT: Record<string, string> = {
  anchored: "Anchored",
  chain_rejected: "Rejected by contract",
  challenged: "Challenge opened",
  challenge_upheld: "Challenge upheld",
  challenge_dismissed: "Challenge dismissed",
  withdrawn: "Withdrawn",
};

export default function Overview() {
  const [o, setO] = useState<any>(null);
  const [claims, setClaims] = useState<ClaimSummary[] | null>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => {
    api.overview().then(setO).catch(setErr);
    api.claims().then(setClaims).catch(() => setClaims([]));
  }, []);

  const attention = (claims ?? []).filter((c) => c.status === "blocked" || c.status === "challenged" || (c.status === "checked" && (c.finding_counts.review ?? 0) > 0));
  const ready = (claims ?? []).filter((c) => c.status === "checked" && !c.finding_counts.review && !c.finding_counts.blocking);
  const chainEvents = (o?.recent_chain_events ?? []).filter((e: any) => e.kind in CHAIN_EVENT);
  const anchored = (o?.claims?.by_status?.anchored ?? 0) + (o?.claims?.by_status?.challenged ?? 0);
  const ref = o?.reference;

  return (
    <div>
      <PageHeader title="Overview" lede="The current state of the claims ledger, the registry reference and the contract it writes to." actions={<LinkButton to="/claims" variant="secondary">Open the claims ledger</LinkButton>} />
      <ErrorBox error={err} title="Could not load the overview" />

      <dl className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-sheet border border-rule bg-rule md:grid-cols-4">
        {[
          ["Claims anchored", fmt(anchored), "Locking units on ClaimLedger"],
          ["Units locked", fmt(o?.claims?.units_anchored), "Across all anchored claims"],
          ["Flagged for double use", fmt(o?.claims?.with_double_use_findings), "Claims with a DUP-001 finding"],
          ["Rejected by contract", fmt(o?.claims?.chain_rejections), "Failed registrations, recorded on chain"],
        ].map(([k, v, d]) => (
          <div key={k} className="bg-sheet p-5"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 text-[28px] leading-none font-bold tracking-tight">{o ? v : "…"}</dd><dd className="mt-2 text-xs text-ink-soft">{d}</dd></div>
        ))}
      </dl>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          <section aria-labelledby="att-h">
            <SectionHeader id="att-h" title="Needs attention" aside={claims ? `${attention.length} claim${attention.length === 1 ? "" : "s"}` : undefined} />
            {claims && attention.length === 0 && <p className="rounded-panel border border-dashed border-rule-strong bg-sheet p-5 text-sm text-ink-soft">Nothing is blocked, under review or challenged.</p>}
            <ul className="space-y-2.5">
              {attention.map((c) => {
                const out = checkOutcome(c);
                return (
                  <li key={c.id}>
                    <Link viewTransition to={`/claims/${c.id}`} className="grid gap-2 rounded-panel border border-rule bg-sheet p-4 hover:border-ink sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3"><span className="font-semibold">{c.claimant.replace(" (SYNTHETIC)", "")}</span><span className="font-mono text-xs text-muted">{c.ref}</span></div>
                        <div className="mt-0.5 text-sm text-ink-soft">{c.status === "challenged" ? "A reviewer decision is pending." : out.outcome === "double-use" ? "Units already back another claim. Review the overlap." : out.outcome === "insufficient" ? "No serials disclosed. Request the retirement serial numbers." : "Review the findings before anchoring."}</div>
                      </div>
                      <div className="flex flex-wrap gap-2"><OutcomeToken outcome={c.status === "challenged" ? "review" : out.outcome} label={c.status === "challenged" ? "Challenged" : out.label} /></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {ready.length > 0 && (
              <p className="mt-4 text-sm text-ink-soft">
                {ready.length} claim{ready.length === 1 ? " has" : "s have"} passed every check and can be anchored: {ready.map((c, i) => <span key={c.id}>{i > 0 && ", "}<Link className="font-mono underline" to={`/claims/${c.id}`}>{c.ref}</Link></span>)}.
              </p>
            )}
          </section>

          <section aria-labelledby="act-h">
            <SectionHeader id="act-h" title="Ledger transactions" aside="Most recent first" />
            {o && chainEvents.length === 0 && <p className="text-sm text-ink-soft">No ledger transactions yet.</p>}
            <ol className="divide-y divide-rule rounded-panel border border-rule bg-sheet">
              {chainEvents.map((e: any) => (
                <li key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                  <Blocks size={15} className={e.kind === "chain_rejected" ? "text-crimson" : "text-ink-soft"} aria-hidden />
                  <span className="min-w-0 truncate"><span className={e.kind === "chain_rejected" ? "font-semibold text-crimson" : "font-medium"}>{CHAIN_EVENT[e.kind]}</span>{e.ref && <> · <Link viewTransition to={`/claims/${e.claim_id}`} className="font-mono text-xs underline">{e.ref}</Link></>}</span>
                  <span className="font-mono text-xs text-muted">block {e.block_number} · {short(e.tx_hash, 6)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section aria-labelledby="sys-h" className="space-y-4">
          <SectionHeader id="sys-h" title="System" />
          <div className="space-y-4 rounded-sheet border border-rule bg-sheet p-5 text-sm">
            <div>
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">ClaimLedger contract</h3>{o?.chain?.address ? <OutcomeToken outcome="passed" label="Reachable" /> : o ? <OutcomeToken outcome="review" label="Unavailable" /> : null}</div>
              {o?.chain?.address ? (
                <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
                  <dt className="text-muted">Network</dt><dd>{o.chain.public_network ? `Chain ${o.chain.chain_id}` : `Local development chain (id ${o.chain.chain_id})`}</dd>
                  <dt className="text-muted">Block</dt><dd className="font-mono">{o.chain.block_number}</dd>
                  <dt className="text-muted">Contract</dt><dd><CopyValue value={o.chain.address} label="contract address" /></dd>
                  <dt className="text-muted">Registrar</dt><dd><CopyValue value={o.chain.registrar} label="registrar address" /></dd>
                  <dt className="text-muted">Claims on chain</dt><dd>{o.chain.claim_count}</dd>
                </dl>
              ) : o && <p className="mt-2 text-ink-soft">{o.chain?.error ?? "The contract is not reachable."} Start it with <span className="font-mono">make chain</span> and <span className="font-mono">make deploy</span>.</p>}
            </div>
            <div className="border-t border-rule pt-4">
              <h3 className="font-semibold">Registry reference</h3>
              {ref ? (
                <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
                  <dt className="text-muted">Source</dt><dd>Berkeley VROD {ref.source?.version?.split(" ")[0]} · {ref.source?.license}</dd>
                  <dt className="text-muted">Scope</dt><dd>{ref.scope === "full" ? "Full index" : "Demo subset"}</dd>
                  <dt className="text-muted">Records</dt><dd>{fmt(Object.values(ref.row_counts ?? {}).reduce((a: number, b: any) => a + b, 0) as number)} (Verra and Gold Standard)</dd>
                  <dt className="text-muted">Data through</dt><dd>31 Aug 2026</dd>
                </dl>
              ) : o && <p className="mt-2 text-ink-soft">Not loaded.</p>}
            </div>
            <div className="border-t border-rule pt-4">
              <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">AI extraction</h3>{o && (o.llm?.configured ? <OutcomeToken outcome="passed" label="Configured" /> : <OutcomeToken outcome="not-established" label="Not configured" />)}</div>
              <p className="mt-2 text-ink-soft">{o?.llm?.configured ? `Model ${o.llm.model}; every AI-reported serial is re-parsed deterministically.` : "Serials are read by the deterministic parser only. Add ANTHROPIC_API_KEY to .env to enable the cross-checked AI pass."}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
