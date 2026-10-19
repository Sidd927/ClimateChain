import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, fmt } from "../api";
import { Button, CopyHash, ErrorBox } from "../components/ui";

const STATUS_TEXT: Record<string, string> = {
  active: "Active: its units are locked to this claim",
  challenged: "Challenged: units locked pending review",
  revoked: "Revoked: units released",
  withdrawn: "Withdrawn: units released",
};

export default function Verify() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setRes(null);
    if (!ref.trim()) return setErr(new Error("Enter a claim reference such as OO-2026-0001, or an on-chain claim number."));
    const form = new FormData();
    if (/^\d+$/.test(ref.trim())) form.set("chain_claim_id", ref.trim());
    else form.set("ref", ref.trim());
    if (file) form.set("file", file);
    setBusy(true);
    try { setRes(await api.verify(form)); } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  const oc = res?.onchain;
  return (
    <div className="grid gap-10 lg:grid-cols-[24rem_1fr]">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verify a claim</h1>
          <p className="mt-1 text-sm text-ink-soft">Read a claim's record straight from the ClaimLedger contract and, optionally, check that a document is the one committed when the claim was registered.</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Claim reference</span>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="OO-2026-0001" className="w-full rounded-md border border-rule bg-sheet px-3 py-2 font-mono text-sm" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Document to check <span className="font-normal text-muted">(optional)</span></span>
          <input type="file" accept=".pdf,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm file:mr-3 file:rounded file:border file:border-rule file:bg-sheet file:px-3 file:py-1.5 file:text-sm" />
          <span className="text-xs text-muted">The file is hashed and compared; it is not stored.</span>
        </label>
        <ErrorBox error={err} />
        <Button type="submit" busy={busy}>Verify</Button>
      </form>

      <div className="min-w-0">
        {!res && <p className="rounded-lg border border-dashed border-rule p-8 text-sm text-muted">The contract's answer appears here. Verification needs no account: anyone with the reference can run it.</p>}
        {res && !res.found && <p className="rounded-lg border border-rule bg-sheet p-5 text-sm">{res.message}</p>}
        {res?.found && (
          <div className="space-y-5 rounded-lg border border-rule bg-sheet p-5">
            <div>
              <div className="text-xs text-muted">Ledger claim #{oc.claim_id}{res.local?.ref && <> · {res.local.ref}</>}</div>
              <div className="text-xl font-bold">{STATUS_TEXT[oc.status] ?? oc.status}</div>
              <div className="text-sm text-ink-soft">Registered {new Date(oc.registered_at * 1000).toLocaleString()} by registrar <span className="font-mono text-xs">{oc.registrar}</span></div>
            </div>
            {res.document && (
              <div className={`flex gap-3 rounded-md p-3 ${res.document.matches_onchain_commitment ? "bg-lichen-wash" : "bg-crimson-wash"}`}>
                {res.document.matches_onchain_commitment ? <CheckCircle2 className="shrink-0 text-lichen" /> : <XCircle className="shrink-0 text-crimson" />}
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{res.document.matches_onchain_commitment ? "Document matches the on-chain commitment" : "Document does not match"}</div>
                  <div className="text-ink-soft">{res.document.explanation}</div>
                  <div className="mt-1 text-xs text-muted">{res.document.filename} · SHA-256 <CopyHash value={res.document.sha256} /></div>
                </div>
              </div>
            )}
            <div>
              <h2 className="mb-2 text-sm font-semibold">Unit ranges held by this claim</h2>
              <ul className="space-y-1 text-sm">
                {oc.ranges.map((r: any, i: number) => (
                  <li key={i}>{fmt(r.unit_start)}–{fmt(r.unit_end)} <span className="text-muted">({fmt(r.unit_end - r.unit_start + 1)} units) in namespace</span> <CopyHash value={r.namespace} /></li>
                ))}
              </ul>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Evidence commitment</dt><dd><CopyHash value={oc.evidence_hash} /></dd></div>
              <div><dt className="text-xs text-muted">Report hash</dt><dd><CopyHash value={oc.report_hash} /></dd></div>
              <div><dt className="text-xs text-muted">Claimant commitment</dt><dd><CopyHash value={oc.claimant_commitment} /></dd></div>
              <div><dt className="text-xs text-muted">Contract</dt><dd><CopyHash value={res.chain.address} /></dd></div>
            </dl>
            <p className="text-xs leading-relaxed text-muted">
              {res.chain.public_network ? `Read from chain ${res.chain.chain_id}.` : "Read from a local development chain (chain id 31337), not a public network."} A matching hash shows the document is unchanged since registration; it does not show the document's content is true.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
