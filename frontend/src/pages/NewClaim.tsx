import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Upload, X } from "lucide-react";
import { api, type Sample } from "../api";
import { Button, ErrorBox, Mono, OutcomeToken, PageHeader } from "../components/primitives";

const ALLOWED = [".pdf", ".txt", ".md"];
const MAX = 10 * 1024 * 1024;

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Attached = { file: File; hash: string | null; problem?: string; reused?: { claim_id: number; ref: string; claimant: string }[] };

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-rule pt-6 sm:grid-cols-[2.5rem_1fr]">
      <legend className="sr-only">{title}</legend>
      <div className="font-mono text-sm text-muted" aria-hidden>{String(n).padStart(2, "0")}</div>
      <div className="space-y-4">
        <div><h2 className="text-[17px] font-semibold">{title}</h2>{hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}</div>
        {children}
      </div>
    </fieldset>
  );
}

const input = "w-full rounded-[7px] border border-rule-strong bg-sheet px-3 py-2.5 text-[15px] placeholder:text-muted/80 hover:border-ink-soft";

export default function NewClaim() {
  const nav = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [claimant, setClaimant] = useState("");
  const [period, setPeriod] = useState("FY2025");
  const [statement, setStatement] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attached[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [fieldErr, setFieldErr] = useState<{ claimant?: string; evidence?: string }>({});
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const claimantRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.samples().then(setSamples).catch(() => setSamples([])); }, []);

  const attach = async (list: FileList | File[]) => {
    const added: Attached[] = Array.from(list).map((file) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      const problem = !ALLOWED.includes(ext) ? `Unsupported type (${ext || "no extension"}). Use PDF, TXT or MD.` : file.size > MAX ? "Larger than 10 MB." : undefined;
      return { file, hash: null, problem };
    });
    setFiles((f) => [...f, ...added]);
    setFieldErr((e) => ({ ...e, evidence: undefined }));
    for (const a of added) {
      if (a.problem) continue;
      const h = await sha256(a.file);
      let reused: Attached["reused"] = [];
      try { reused = (await api.evidenceLookup(h)).claims; } catch { /* lookup is advisory */ }
      setFiles((f) => f.map((x) => (x.file === a.file ? { ...x, hash: h, reused } : x)));
    }
  };

  const applySample = async (s: Sample) => {
    setErr(null);
    try {
      const f = await api.sampleFile(s.file);
      setClaimant(s.claimant);
      setStatement(s.statement);
      setText("");
      setFiles([]);
      setFieldErr({});
      await attach([f]);
    } catch (e) { setErr(e); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const fe: typeof fieldErr = {};
    if (!claimant.trim()) fe.claimant = "Enter the company making the claim.";
    const usable = files.filter((a) => !a.problem);
    if (!usable.length && !text.trim()) fe.evidence = "Attach a certificate or allocation statement, or paste its text.";
    setFieldErr(fe);
    if (fe.claimant) { claimantRef.current?.focus(); return; }
    if (fe.evidence) return;
    const form = new FormData();
    form.set("claimant", claimant.trim());
    form.set("period", period);
    form.set("statement", statement);
    if (text.trim()) form.set("text", text);
    usable.forEach((a) => form.append("files", a.file, a.file.name));
    setBusy(true);
    try {
      const c = await api.createClaim(form);
      nav(`/claims/${c.id}`, { viewTransition: true });
    } catch (e) { setErr(e); setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Check a claim" lede="Add the claim and the document behind it. OnceOnly finds the serial numbers, reconciles them with registry records and checks the ledger for overlaps. Nothing is written on chain until you choose to anchor." />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={submit} className="space-y-8" noValidate aria-busy={busy}>
          <Step n={1} title="Who is claiming">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold">Claimant</span>
                <input ref={claimantRef} value={claimant} onChange={(e) => { setClaimant(e.target.value); setFieldErr((x) => ({ ...x, claimant: undefined })); }} placeholder="Company making the claim" className={input} aria-invalid={!!fieldErr.claimant} aria-describedby={fieldErr.claimant ? "claimant-err" : undefined} autoComplete="organization" />
                {fieldErr.claimant && <span id="claimant-err" className="text-sm text-crimson">{fieldErr.claimant}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold">Reporting period</span>
                <input value={period} onChange={(e) => setPeriod(e.target.value)} className={input} />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-semibold">Claim statement <span className="font-normal text-muted">(optional)</span></span>
                <input value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="e.g. FY2025 contribution claim: 10,000 tCO2e retired" className={input} />
              </label>
            </div>
          </Step>

          <Step n={2} title="Evidence" hint="Retirement certificates, broker allocation statements or claim pages: PDF with a text layer, TXT or MD, up to 10 MB each. Scanned images can't be read yet.">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); attach(e.dataTransfer.files); }}
              className={`rounded-sheet border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-glacier bg-glacier-wash" : fieldErr.evidence ? "border-crimson/60 bg-sheet" : "border-rule-strong bg-sheet"}`}
            >
              <Upload className="mx-auto text-ink-soft" size={22} aria-hidden />
              <p className="mt-2 text-sm">Drop files here or</p>
              <Button type="button" variant="secondary" className="mt-2" onClick={() => fileInput.current?.click()}>Choose files</Button>
              <input ref={fileInput} type="file" accept=".pdf,.txt,.md" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { if (e.target.files) attach(e.target.files); e.target.value = ""; }} />
            </div>
            {fieldErr.evidence && <p className="text-sm text-crimson" role="alert">{fieldErr.evidence}</p>}
            {files.length > 0 && (
              <ul className="divide-y divide-rule rounded-panel border border-rule bg-sheet" aria-label="Attached files">
                {files.map((a, i) => (
                  <li key={i} className="fade-in flex items-start gap-3 px-4 py-3">
                    <FileText size={18} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-medium break-all">{a.file.name} <span className="font-normal text-muted">· {(a.file.size / 1024).toFixed(1)} KB</span></div>
                      {a.problem ? <OutcomeToken outcome="review" label={a.problem} /> : (
                        <div className="text-xs text-muted">SHA-256, computed in your browser: {a.hash ? <Mono className="break-all text-ink-soft">{a.hash}</Mono> : "computing…"}</div>
                      )}
                      {a.reused && a.reused.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <OutcomeToken outcome="review" label="Already used as evidence" />
                          <span className="text-ink-soft">by {a.reused.map((r, k) => <span key={r.ref}>{k > 0 && ", "}<Link className="font-mono underline" to={`/claims/${r.claim_id}`}>{r.ref}</Link> ({r.claimant.replace(" (SYNTHETIC)", "")})</span>)}. Submitting again will be flagged for review.</span>
                        </div>
                      )}
                    </div>
                    <button type="button" aria-label={`Remove ${a.file.name}`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="press rounded p-1 text-muted hover:bg-fog hover:text-ink"><X size={16} aria-hidden /></button>
                  </li>
                ))}
              </ul>
            )}
            <details className="group rounded-panel border border-rule bg-sheet px-4 py-3" open={!!text}>
              <summary className="cursor-pointer text-sm font-medium">Paste certificate text instead</summary>
              <textarea value={text} onChange={(e) => { setText(e.target.value); setFieldErr((x) => ({ ...x, evidence: undefined })); }} rows={6} aria-label="Certificate text" className="mt-3 w-full rounded-[7px] border border-rule-strong p-2.5 font-mono text-xs" placeholder="Serial Number: 18453-896309560-896319559-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0" />
            </details>
            <p className="text-xs leading-relaxed text-muted">A fingerprint lets anyone confirm later that a document hasn't changed. It doesn't show that what the document says is true.</p>
          </Step>

          <Step n={3} title="Run the checks">
            <ErrorBox error={err} title="The claim could not be checked" />
            {busy ? (
              <div className="fade-in flex items-start gap-3 rounded-panel border border-rule bg-sheet px-4 py-3 text-sm" role="status">
                <span className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-ink border-r-transparent motion-reduce:animate-none" aria-hidden />
                <span>Running checks: reading the documents, extracting serial numbers, reconciling with registry records and comparing against the ledger. This usually takes a second.</span>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" busy={busy}>{busy ? "Running checks" : "Run checks"}</Button>
              <span className="text-xs text-muted">You'll review the findings before anything is anchored.</span>
            </div>
          </Step>
        </form>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start" aria-labelledby="samples-h">
          <h2 id="samples-h" className="text-[15px] font-semibold">Try the sample statements</h2>
          <p className="text-xs leading-relaxed text-ink-soft">Fictional broker statements for fictional companies. Their serial ranges point at real Verra and Gold Standard retirements, so the checks run against real registry data. Use them in order: anchor the first, then submit the second.</p>
          <ol className="space-y-2">
            {samples.map((s, i) => (
              <li key={s.file}>
                <button type="button" onClick={() => applySample(s)} className="press group w-full rounded-panel border border-rule bg-sheet p-3.5 text-left hover:border-ink">
                  <div className="flex items-baseline gap-2"><span className="font-mono text-xs text-muted">{i + 1}</span><span className="text-sm font-semibold">{s.title}</span></div>
                  <div className="mt-0.5 text-xs text-ink-soft">{s.claimant.replace(" (SYNTHETIC)", "")} · <span className="font-mono">{s.file}</span></div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.story}</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-ink underline decoration-transparent underline-offset-4 group-hover:decoration-ink">Use this sample</span>
                </button>
              </li>
            ))}
            {samples.length === 0 && <li className="text-xs text-muted">Sample documents load from the API. Start it with <span className="font-mono">make api</span>.</li>}
          </ol>
        </aside>
      </div>
    </div>
  );
}
