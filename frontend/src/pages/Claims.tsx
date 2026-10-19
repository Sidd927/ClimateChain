import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { api, fmt, type ClaimStatus, type ClaimSummary } from "../api";
import { ErrorBox, LinkButton, OutcomeToken, PageHeader, StatusPill, SyntheticTag } from "../components/primitives";
import { checkOutcome } from "../lib/outcomes";

const FILTERS: { key: string; label: string; match: (s: ClaimStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "anchored", label: "Anchored", match: (s) => s === "anchored" },
  { key: "blocked", label: "Blocked", match: (s) => s === "blocked" },
  { key: "checked", label: "Not anchored", match: (s) => s === "checked" },
  { key: "challenged", label: "Challenged", match: (s) => s === "challenged" },
  { key: "released", label: "Revoked or withdrawn", match: (s) => s === "revoked" || s === "withdrawn" },
];
type SortKey = "ref" | "claimant" | "units";

export default function Claims() {
  const [rows, setRows] = useState<ClaimSummary[] | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [params, setParams] = useSearchParams();
  // The search box owns its text locally (URL updates commit asynchronously, so a URL-controlled
  // input drops keystrokes); the URL mirrors it for shareable links and back/forward.
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const filter = params.get("status") ?? "all";
  const sort = (params.get("sort") as SortKey) ?? "ref";
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const nav = useNavigate();

  useEffect(() => { api.claims().then(setRows).catch(setErr); }, []);

  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(params);
    if (v === null || v === "" || (k === "status" && v === "all")) p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };
  const toggleSort = (k: SortKey) => {
    const p = new URLSearchParams(params);
    p.set("sort", k);
    p.set("dir", sort === k && dir === "desc" ? "asc" : "desc");
    setParams(p, { replace: true });
  };

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, (rows ?? []).filter((r) => f.match(r.status)).length])), [rows]);
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const needle = q.trim().toLowerCase();
    const out = (rows ?? []).filter((r) => f.match(r.status) && (!needle || r.ref.toLowerCase().includes(needle) || r.claimant.toLowerCase().includes(needle)));
    const m = dir === "asc" ? 1 : -1;
    out.sort((a, b) => (sort === "units" ? a.total_units - b.total_units : sort === "claimant" ? a.claimant.localeCompare(b.claimant) : a.id - b.id) * m);
    return out;
  }, [rows, filter, q, sort, dir]);

  const allSynthetic = rows?.length ? rows.every((r) => r.synthetic) : false;
  const totals = useMemo(() => {
    const t = { locked: 0, blocked: 0, pending: 0, released: 0 };
    for (const r of rows ?? []) {
      if (r.status === "anchored" || r.status === "challenged") t.locked += r.total_units;
      else if (r.status === "blocked") t.blocked += r.total_units;
      else if (r.status === "checked") t.pending += r.total_units;
      else t.released += r.total_units;
    }
    return t;
  }, [rows]);
  const totalUnits = totals.locked + totals.blocked + totals.pending + totals.released;

  const sortHead = (k: SortKey, label: string, right = false) => (
    <th scope="col" aria-sort={sort === k ? (dir === "asc" ? "ascending" : "descending") : "none"} className={`px-4 py-2.5 font-medium ${right ? "text-right" : ""}`}>
      <button type="button" onClick={() => toggleSort(k)} className={`press inline-flex items-center gap-1 rounded hover:text-ink ${sort === k ? "text-ink" : ""}`}>
        {label}{sort === k ? (dir === "asc" ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />) : <ArrowUpDown size={13} className="opacity-50" aria-hidden />}
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader title="Claims ledger" lede="Every claim OnceOnly has checked. Anchored and challenged claims lock their unit ranges on ClaimLedger; blocked claims never reached the chain." />
      <ErrorBox error={err} title="Could not load claims" />

      {rows && rows.length > 0 && totalUnits > 0 && (
        <figure className="mb-6 rounded-sheet border border-rule bg-sheet p-4">
          <figcaption className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-semibold">{fmt(totalUnits)} units cited across {rows.length} claims</span>{allSynthetic && <span className="inline-flex items-center gap-2 text-xs text-muted"><SyntheticTag /> all claims are demo claims</span>}</figcaption>
          <div className="flex h-3 overflow-hidden rounded-[3px] bg-fog" role="img" aria-label={`Units locked on ledger ${totals.locked}, blocked ${totals.blocked}, not anchored ${totals.pending}, released ${totals.released}`}>
            {totals.locked > 0 && <div className="bg-ink" style={{ width: `${(totals.locked / totalUnits) * 100}%` }} />}
            {totals.blocked > 0 && <div className="hatch-crimson" style={{ width: `${(totals.blocked / totalUnits) * 100}%` }} />}
            {totals.pending > 0 && <div className="hatch-slate bg-slate-wash" style={{ width: `${(totals.pending / totalUnits) * 100}%` }} />}
            {totals.released > 0 && <div className="border border-dashed border-slate" style={{ width: `${(totals.released / totalUnits) * 100}%` }} />}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] bg-ink" aria-hidden />Locked on ledger {fmt(totals.locked)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] hatch-crimson" aria-hidden />Blocked {fmt(totals.blocked)}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] hatch-slate bg-slate-wash" aria-hidden />Not anchored {fmt(totals.pending)}</span>
            {totals.released > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[2px] border border-dashed border-slate" aria-hidden />Released {fmt(totals.released)}</span>}
          </div>
        </figure>
      )}

      {rows && rows.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Filter by ledger state" className="flex flex-wrap gap-1.5">
            {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0).map((f) => (
              <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => set("status", f.key)}
                className={`press rounded-full border px-3 py-1 text-[13px] ${filter === f.key ? "border-ink bg-ink text-white" : "border-rule-strong bg-sheet text-ink-soft hover:border-ink hover:text-ink"}`}>
                {f.label} <span className={filter === f.key ? "text-white/70" : "text-muted"}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <label className="relative block md:w-72">
            <span className="sr-only">Search claims</span>
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden />
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value); set("q", e.target.value); }} placeholder="Search reference or claimant" className="w-full rounded-[7px] border border-rule-strong bg-sheet py-2 pr-3 pl-9 text-sm" />
          </label>
        </div>
      )}

      {rows === null && !err && <div className="h-48 rounded-sheet bg-fog-2" aria-busy="true" aria-label="Loading claims" />}

      {rows && rows.length === 0 && (
        <div className="rounded-sheet border border-dashed border-rule-strong bg-sheet p-10 text-center">
          <p className="text-lg font-semibold">No claims yet</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-sm text-ink-soft">Check a claim to see how OnceOnly reconciles serials with the registry and places them on the ledger. The sample statements walk through a clean claim and an overlapping one.</p>
          <LinkButton to="/claims/new" className="mt-5">Check a claim</LinkButton>
        </div>
      )}

      {rows && rows.length > 0 && shown.length === 0 && (
        <div className="rounded-sheet border border-dashed border-rule-strong bg-sheet p-8 text-center text-sm text-ink-soft">
          No claims match {q ? <>“{q}”</> : "this filter"}. <button type="button" className="font-semibold underline" onClick={() => { setQ(""); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</button>
        </div>
      )}

      {shown.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-sheet border border-rule bg-sheet md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Claims, {shown.length} shown</caption>
              <thead className="border-b border-rule bg-fog/50 text-left text-xs text-muted">
                <tr>
                  {sortHead("ref", "Reference")}
                  {sortHead("claimant", "Claimant")}
                  {sortHead("units", "Units", true)}
                  <th scope="col" className="px-4 py-2.5 font-medium">Check result</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {shown.map((c) => {
                  const o = checkOutcome(c);
                  return (
                    <tr key={c.id} className="group cursor-pointer transition-colors hover:bg-fog/70" onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) nav(`/claims/${c.id}`, { viewTransition: true }); }}>
                      <td className="px-4 py-3.5"><Link viewTransition to={`/claims/${c.id}`} className="font-mono text-[13px] font-medium underline decoration-rule-strong underline-offset-4 group-hover:decoration-ink">{c.ref}</Link></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 font-medium">{c.claimant.replace(" (SYNTHETIC)", "")}{c.synthetic && !allSynthetic && <SyntheticTag />}</div>
                        <div className="text-xs text-muted">{c.period}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.total_units ? <><div className="font-semibold">{fmt(c.total_units)}</div><div className="text-xs text-muted">{c.block_count} block{c.block_count === 1 ? "" : "s"}</div></> : <span className="text-xs text-muted">none disclosed</span>}
                      </td>
                      <td className="px-4 py-3.5"><OutcomeToken outcome={o.outcome} label={o.label} /></td>
                      <td className="px-4 py-3.5"><div className="flex flex-wrap items-center gap-2"><StatusPill status={c.status} />{c.chain_claim_id && <span className="text-xs text-muted">#{c.chain_claim_id} · block {c.block_number}</span>}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2.5 md:hidden" aria-label="Claims">
            {shown.map((c) => {
              const o = checkOutcome(c);
              return (
                <li key={c.id}>
                  <Link viewTransition to={`/claims/${c.id}`} className="block space-y-2 rounded-panel border border-rule bg-sheet p-4 hover:border-ink">
                    <div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{c.claimant.replace(" (SYNTHETIC)", "")}</span><span className="font-mono text-xs text-muted">{c.ref}</span></div>
                    <div className="text-sm text-ink-soft">{c.total_units ? `${fmt(c.total_units)} units · ${c.block_count} block${c.block_count === 1 ? "" : "s"}` : "No serials disclosed"} · {c.period}</div>
                    <div className="flex flex-wrap gap-2"><OutcomeToken outcome={o.outcome} label={o.label} /><StatusPill status={c.status} /></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
