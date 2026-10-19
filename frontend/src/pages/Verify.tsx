import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Upload, X } from "lucide-react";
import { api, fmt, type ClaimSummary } from "../api";
import { Button, CopyValue, ErrorBox, Mono, OutcomeToken, PageHeader } from "../components/primitives";
import type { Outcome } from "../lib/outcomes";

const STATUS_OUTCOME: Record<string, { outcome: Outcome; label: string; text: string }> = {
  active: { outcome: "anchored", label: "Active on ClaimLedger", text: "Its unit ranges are locked to this claim; no other claim can register them." },
  challenged: { outcome: "review", label: "Challenged", text: "Someone has contested the claim. Its units stay locked until a reviewer decides." },
  revoked: { outcome: "not-established", label: "Revoked", text: "A challenge was upheld. Its units are released." },
  withdrawn: { outcome: "not-established", label: "Withdrawn", text: "The registrar withdrew it. Its units are released." },
};

export default function Verify() {
  const [params, setParams] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [fieldErr, setFieldErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [anchored, setAnchored] = useState<ClaimSummary[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  useEffect(() => { api.claims().then((cs) => setAnchored(cs.filter((c) => c.chain_claim_id))).catch(() => {}); }, []);

  const verify = async (r = ref) => {
    setErr(null);
    setRes(null);
    if (!r.trim()) { setFieldErr("Enter a claim reference such as OO-2026-0001, or an on-chain claim number."); refInput.current?.focus(); return; }
    setFieldErr(null);
    const form = new FormData();
    if (/^\d+$/.test(r.trim())) form.set("chain_claim_id", r.trim()); else form.set("ref", r.trim());
    if (file) form.set("file", file);
    setBusy(true);
    try {
      setRes(await api.verify(form));
      setParams(r.trim() ? { ref: r.trim() } : {}, { replace: true });
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const oc = res?.onchain;
  const st = oc ? STATUS_OUTCOME[oc.status] ?? { outcome: "note" as Outcome, label: oc.status, text: "" } : null;

  return (
    <div>
      <PageHeader title="Verify a claim" lede="Read a claim's record directly from the ClaimLedger contract and, optionally, confirm that a document is byte-identical to the one committed at registration. No account needed." />
      <div className="grid gap-10 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-5" noValidate>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">Claim reference</span>
            <input ref={refInput} value={ref} onChange={(e) => { setRef(e.target.value); setFieldErr(null); }} placeholder="OO-2026-0001" aria-invalid={!!fieldErr} aria-describedby={fieldErr ? "ref-err" : "ref-hint"} className="w-full rounded-[7px] border border-rule-strong bg-sheet px-3 py-2.5 font-mono text-[15px]" />
            {fieldErr ? <span id="ref-err" className="text-sm text-crimson">{fieldErr}</span> : <span id="ref-hint" className="text-xs text-muted">A reference like OO-2026-0001, or the ledger claim number.</span>}
          </label>
          {anchored.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs text-muted">Claims on this ledger</div>
              <div className="flex flex-wrap gap-1.5">
                {anchored.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setRef(c.ref); verify(c.ref); }} className="press rounded-full border border-rule-strong bg-sheet px-3 py-1 font-mono text-xs hover:border-ink">{c.ref}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-sm font-semibold">Document to check <span className="font-normal text-muted">(optional)</span></span>
            {file ? (
              <div className="flex items-center gap-3 rounded-panel border border-rule bg-sheet px-3 py-2.5 text-sm">
                <FileText size={16} className="shrink-0 text-ink-soft" aria-hidden /><span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label={`Remove ${file.name}`} className="press rounded p-1 text-muted hover:text-ink"><X size={15} aria-hidden /></button>
              </div>
            ) : (
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}><Upload size={15} aria-hidden /> Choose a document</Button>
            )}
            <input ref={fileInput} type="file" accept=".pdf,.txt,.md" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <p className="text-xs text-muted">The file is hashed and compared with the on-chain commitment. It is not stored.</p>
          </div>
          <ErrorBox error={err} title="Verification failed" />
          <Button type="submit" busy={busy}>Verify</Button>
        </form>

        <div className="min-w-0" aria-live="polite">
          {!res && (
            <div className="rounded-sheet border border-dashed border-rule-strong bg-sheet p-6 text-sm text-ink-soft">
              <h2 className="mb-3 font-semibold text-ink">What verification can tell you</h2>
              <ul className="space-y-2.5">
                <li className="flex gap-3"><OutcomeToken outcome="anchored" label="Ledger status" /><span>Whether the claim is active, challenged, revoked or withdrawn, read from the contract.</span></li>
                <li className="flex gap-3"><OutcomeToken outcome="fingerprint-match" label="Fingerprint" /><span>Whether your copy of a document is byte-identical to the one committed.</span></li>
                <li className="flex gap-3"><OutcomeToken outcome="not-established" label="Not covered" /><span>Whether the document's content, or the credits behind it, are true.</span></li>
              </ul>
            </div>
          )}
          {res && !res.found && (
            <div className="seal-in space-y-2 rounded-sheet border border-rule bg-sheet p-6">
              <OutcomeToken outcome="not-established" label="Not on the ledger" />
              <p className="text-sm text-ink-soft">{res.message}</p>
            </div>
          )}
          {res?.found && st && (
            <article className="seal-in space-y-6 rounded-sheet border border-rule bg-sheet p-5 sm:p-6">
              <header className="space-y-2">
                <div className="text-xs text-muted">Ledger claim #{oc.claim_id}{res.local?.ref && <> · <Mono>{res.local.ref}</Mono></>}{res.local?.synthetic && " · synthetic demo claim"}</div>
                <OutcomeToken outcome={st.outcome} label={st.label} size="md" />
                <p className="text-[15px]">{st.text}</p>
                <p className="text-xs text-muted">Registered {new Date(oc.registered_at * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} by registrar <Mono>{oc.registrar}</Mono></p>
              </header>

              {res.document && (
                <div key={res.document.sha256} className={`seal-in space-y-2 rounded-panel border p-4 ${res.document.matches_onchain_commitment ? "border-glacier/40 bg-glacier-wash" : "border-crimson/50 bg-sheet"}`}>
                  <OutcomeToken outcome={res.document.matches_onchain_commitment ? "fingerprint-match" : "fingerprint-differs"} size="md" />
                  <p className="text-sm">{res.document.explanation}</p>
                  <div className="text-xs text-ink-soft">{res.document.filename}</div>
                  <CopyValue value={res.document.sha256} label="document SHA-256" />
                </div>
              )}

              <div>
                <h2 className="mb-2 text-sm font-semibold">Unit ranges held by this claim</h2>
                <ul className="divide-y divide-rule rounded-panel border border-rule">
                  {oc.ranges.map((r: any, i: number) => (
                    <li key={i} className="grid gap-1 px-3.5 py-2.5 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                      <span><span className="font-semibold">{fmt(r.unit_start)}–{fmt(r.unit_end)}</span> <span className="text-ink-soft">({fmt(r.unit_end - r.unit_start + 1)} units)</span></span>
                      <span className="text-xs text-muted">namespace <Mono>{r.namespace.slice(0, 10)}…</Mono></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-muted">The namespace is keccak256 of “registry:batch”, e.g. keccak256("VCS:18453").</p>
              </div>

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted">Evidence commitment</dt><dd><CopyValue value={oc.evidence_hash} label="evidence commitment" /></dd></div>
                <div><dt className="text-xs text-muted">Report hash</dt><dd><CopyValue value={oc.report_hash} label="report hash" /></dd></div>
                <div><dt className="text-xs text-muted">Claimant commitment</dt><dd><CopyValue value={oc.claimant_commitment} label="claimant commitment" /></dd></div>
                <div><dt className="text-xs text-muted">Contract</dt><dd><CopyValue value={res.chain.address} label="contract address" /></dd></div>
              </dl>
              <p className="border-t border-rule pt-4 text-xs leading-relaxed text-muted">
                {res.chain.public_network ? `Read from chain ${res.chain.chain_id}.` : "Read from a local development chain (chain id 31337), not a public network."} A matching fingerprint shows the document is unchanged since registration. It does not show that its content, or the credits behind it, are true.
              </p>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
