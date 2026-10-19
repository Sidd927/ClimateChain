import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, X } from "lucide-react";
import { api, type Sample } from "../api";
import { Button, ErrorBox, Mono } from "../components/ui";

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Attached = { file: File; hash: string | null };

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
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { api.samples().then(setSamples).catch(() => setSamples([])); }, []);

  const attach = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    const added = arr.map((file) => ({ file, hash: null as string | null }));
    setFiles((f) => [...f, ...added]);
    for (const a of added) {
      const h = await sha256(a.file);
      setFiles((f) => f.map((x) => (x.file === a.file ? { ...x, hash: h } : x)));
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
      await attach([f]);
    } catch (e) { setErr(e); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!claimant.trim()) return setErr(new Error("Enter the name of the company making the claim."));
    if (!files.length && !text.trim()) return setErr(new Error("Attach a retirement certificate or allocation statement, or paste its text."));
    const form = new FormData();
    form.set("claimant", claimant.trim());
    form.set("period", period);
    form.set("statement", statement);
    if (text.trim()) form.set("text", text);
    files.forEach((a) => form.append("files", a.file, a.file.name));
    setBusy(true);
    try {
      const c = await api.createClaim(form);
      nav(`/claims/${c.id}`);
    } catch (e) { setErr(e); setBusy(false); }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={submit} className="space-y-6" noValidate>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Check a claim</h1>
          <p className="mt-1 max-w-[64ch] text-sm text-ink-soft">
            Add the claim and the document behind it. OnceOnly finds the serial numbers, reconciles them with the registry and checks the ledger before anything is anchored.
          </p>
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="space-y-1">
            <span className="text-sm font-semibold">Claimant</span>
            <input value={claimant} onChange={(e) => setClaimant(e.target.value)} placeholder="Company making the claim" className="w-full rounded-md border border-rule bg-sheet px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-semibold">Reporting period</span>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-md border border-rule bg-sheet px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold">Claim statement <span className="font-normal text-muted">(optional)</span></span>
            <input value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="e.g. FY2025 contribution claim: 10,000 tCO2e retired" className="w-full rounded-md border border-rule bg-sheet px-3 py-2 text-sm" />
          </label>
        </fieldset>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Evidence</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); attach(e.dataTransfer.files); }}
            className={`rounded-lg border-2 border-dashed p-6 text-center ${drag ? "border-ink bg-sheet" : "border-rule bg-sheet/60"}`}
          >
            <Upload className="mx-auto text-muted" size={22} aria-hidden />
            <p className="mt-2 text-sm">Drop a PDF or text file here, or <button type="button" className="font-semibold underline underline-offset-4" onClick={() => input.current?.click()}>choose a file</button></p>
            <p className="text-xs text-muted">Retirement certificates, broker allocation statements, claim pages. Up to 10 MB each.</p>
            <input ref={input} type="file" accept=".pdf,.txt,.md" multiple className="hidden" onChange={(e) => e.target.files && attach(e.target.files)} />
          </div>
          {files.length > 0 && (
            <ul className="divide-y divide-rule rounded-md border border-rule bg-sheet">
              {files.map((a, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <FileText size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.file.name} <span className="font-normal text-muted">({(a.file.size / 1024).toFixed(1)} KB)</span></div>
                    <div className="text-xs text-muted">SHA-256 fingerprint computed in your browser: {a.hash ? <Mono className="text-ink-soft">{a.hash}</Mono> : "computing…"}</div>
                  </div>
                  <button type="button" aria-label={`Remove ${a.file.name}`} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} className="text-muted hover:text-ink"><X size={16} /></button>
                </li>
              ))}
            </ul>
          )}
          <details className="rounded-md border border-rule bg-sheet px-3 py-2" open={!!text}>
            <summary className="cursor-pointer text-sm font-medium">Paste certificate text instead</summary>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-2 w-full rounded border border-rule p-2 font-mono text-xs" placeholder="Serial Number: 18453-896309560-896319559-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0" />
          </details>
        </div>

        <ErrorBox error={err} />
        <div className="flex items-center gap-4">
          <Button type="submit" busy={busy}>{busy ? "Running checks" : "Run checks"}</Button>
          <span className="text-xs text-muted">Nothing is written to the ledger until you choose to anchor the claim.</span>
        </div>
      </form>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold">Sample evidence</h2>
        <p className="text-xs leading-relaxed text-muted">Fictional broker statements for fictional companies. Their serial ranges point at real registry retirements, so the checks run against real data. Try them in order.</p>
        <ol className="space-y-2">
          {samples.map((s, i) => (
            <li key={s.file}>
              <button type="button" onClick={() => applySample(s)} className="w-full rounded-md border border-rule bg-sheet p-3 text-left hover:border-ink">
                <div className="text-sm font-semibold"><span className="mr-1 text-muted">{i + 1}.</span>{s.title}</div>
                <div className="text-xs text-ink-soft">{s.claimant.replace(" (SYNTHETIC)", "")} · {s.file}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{s.story}</p>
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
