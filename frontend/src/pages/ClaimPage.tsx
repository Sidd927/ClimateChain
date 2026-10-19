import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, api, fmt, short, type ClaimDetail, type Finding } from "../api";
import { UnitStrip } from "../components/UnitStrip";
import { Button, CopyHash, ErrorBox, Mono, Section, SeverityTag, StatusPill, SyntheticNote, severityMeta } from "../components/ui";

const EVENT_LABEL: Record<string, string> = {
  submitted: "Evidence submitted",
  extracted: "Serial numbers extracted",
  checked: "Checks run",
  anchored: "Anchored on ClaimLedger",
  chain_rejected: "ClaimLedger rejected the registration",
  challenged: "Challenge opened",
  challenge_upheld: "Challenge upheld; claim revoked and units released",
  challenge_dismissed: "Challenge dismissed; claim active again",
  withdrawn: "Claim withdrawn; units released",
};

function verdictSentence(c: ClaimDetail) {
  const b = c.findings.filter((f) => f.severity === "blocking").length;
  const r = c.findings.filter((f) => f.severity === "review").length;
  if (c.status === "anchored") return `Anchored on the ledger. Its ${fmt(c.total_units)} units cannot be claimed by anyone else while it is active.`;
  if (c.status === "challenged") return "Under challenge. Its units stay locked until a reviewer decides.";
  if (c.status === "revoked") return "Revoked after an upheld challenge. Its units are free to be claimed again.";
  if (c.status === "withdrawn") return "Withdrawn by its registrar. Its units are free to be claimed again.";
  if (b) return `${b} blocking finding${b > 1 ? "s" : ""}. This claim cannot be anchored until resolved.`;
  if (r) return `${r} item${r > 1 ? "s" : ""} to review before anchoring.`;
  return "All checks passed. Ready to anchor.";
}

export default function ClaimPage() {
  const { id } = useParams();
  const [c, setC] = useState<ClaimDetail | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [actionErr, setActionErr] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [lastRevert, setLastRevert] = useState<any>(null);

  const load = useCallback(() => api.claim(id!).then(setC).catch(setErr), [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<{ claim: ClaimDetail } | ClaimDetail>) => {
    setBusy(key);
    setActionErr(null);
    try {
      const res = await fn();
      setC("claim" in res ? res.claim : res);
      setLastRevert(null);
    } catch (e) {
      setActionErr(e);
      if (e instanceof ApiError && e.detail?.chain?.revert) setLastRevert(e.detail.chain);
      await load();
    } finally {
      setBusy(null);
    }
  };

  if (err) return <ErrorBox error={err} />;
  if (!c) return <p className="text-sm text-muted">Loading claim…</p>;

  const blocking = c.findings.filter((f) => f.severity === "blocking");
  const review = c.findings.filter((f) => f.severity === "review");
  const preAnchor = c.status === "checked" || c.status === "blocked";
  const rejections = c.events.filter((e) => e.kind === "chain_rejected");
  const shownRevert = lastRevert ?? (rejections.length ? { ...rejections[rejections.length - 1].detail, tx_hash: rejections[rejections.length - 1].tx_hash, block_number: rejections[rejections.length - 1].block_number } : null);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link to="/claims" className="text-sm text-ink-soft underline decoration-rule underline-offset-4">Claims ledger</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{c.claimant.replace(" (SYNTHETIC)", "")}</h1>
          <StatusPill status={c.status} />
        </div>
        <p className="text-sm text-ink-soft"><span className="font-mono">{c.ref}</span>{c.period && <> · {c.period}</>}{c.statement && <> · {c.statement}</>}</p>
        <p className={`text-base font-medium ${blocking.length && preAnchor ? "text-crimson" : "text-ink"}`}>{verdictSentence(c)}</p>
        {c.synthetic && <SyntheticNote />}
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          <Section title="Claimed units" aside={<span className="text-sm text-ink-soft">{fmt(c.total_units)} units in {c.blocks.length} block{c.blocks.length === 1 ? "" : "s"}</span>}>
            {c.unit_strips.length === 0 ? (
              <p className="text-sm text-ink-soft">No registry serial numbers were found, so there are no unit ranges to show.</p>
            ) : (
              <div className="space-y-8">
                {c.unit_strips.map((s) => (
                  <div key={s.block_index} className="rounded-lg border border-rule bg-sheet p-4 sm:p-5">
                    <UnitStrip strip={s} thisLabel={c.claimant.replace(" (SYNTHETIC)", "")} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Findings" aside={<span className="text-xs text-muted">Each finding names the rule that produced it</span>}>
            <ul className="space-y-3">
              {c.findings.map((f) => <FindingRow key={f.id} f={f} />)}
            </ul>
          </Section>

          <Section title="Evidence">
            <div className="space-y-4">
              {c.evidence.map((e) => (
                <div key={e.id} className="rounded-lg border border-rule bg-sheet p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{e.filename}</span>
                    <span className="text-xs text-muted">{(e.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="mt-1 text-xs text-muted">SHA-256 <CopyHash value={e.sha256} label="SHA-256" /></div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-ink-soft">Extracted text</summary>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-fog p-3 font-mono text-[11px] leading-relaxed">{e.text_excerpt}</pre>
                  </details>
                </div>
              ))}
              {c.blocks.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs text-muted">
                      <tr><th className="py-1.5 pr-3 font-medium">Serial block</th><th className="py-1.5 pr-3 text-right font-medium">Units</th><th className="py-1.5 pr-3 font-medium">Project</th><th className="py-1.5 pr-3 font-medium">Vintage</th><th className="py-1.5 font-medium">Found by</th></tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {c.blocks.map((b) => (
                        <tr key={b.id}>
                          <td className="py-2 pr-3"><Mono>{b.serial}</Mono></td>
                          <td className="py-2 pr-3 text-right">{fmt(b.quantity)}</td>
                          <td className="py-2 pr-3">{b.registry} {b.project_id}</td>
                          <td className="py-2 pr-3">{b.vintage}</td>
                          <td className="py-2 text-xs">{b.source === "both" ? "Parser and AI agree" : b.source === "llm" ? <span className="text-ochre">AI only, review</span> : "Parser"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs text-muted">
                    AI extraction: {c.llm_status === "ok" ? "used and cross-checked against the parser" : c.llm_status === "error" ? "failed; the deterministic parser result is used" : "not configured; the deterministic parser result is used"}.
                  </p>
                </div>
              )}
            </div>
          </Section>

          <Section title="Audit trail">
            <ol className="relative space-y-4 border-l border-rule pl-5">
              {c.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ${e.kind === "chain_rejected" ? "bg-crimson" : e.tx_hash ? "bg-lichen" : "bg-slate"}`} aria-hidden />
                  <div className="text-sm font-medium">{EVENT_LABEL[e.kind] ?? e.kind}</div>
                  <div className="text-xs text-muted">
                    {new Date(e.created_at).toLocaleString()}
                    {e.tx_hash && <> · block {e.block_number} · tx <span className="font-mono">{short(e.tx_hash, 8)}</span></>}
                  </div>
                  {e.kind === "chain_rejected" && e.detail?.revert && <div className="mt-1 text-xs text-crimson"><RevertText r={e.detail.revert} /></div>}
                  {e.kind === "challenged" && e.detail?.reason && <div className="mt-1 text-xs text-ink-soft">“{e.detail.reason}”</div>}
                  {(e.kind === "challenge_upheld" || e.kind === "challenge_dismissed") && e.detail?.note && <div className="mt-1 text-xs text-ink-soft">“{e.detail.note}”</div>}
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-3 rounded-lg border border-rule bg-sheet p-4">
            <h2 className="text-sm font-semibold">Ledger actions</h2>
            {preAnchor && (
              <>
                {blocking.length > 0 ? (
                  <p className="text-sm text-ink-soft">Anchoring is blocked by {blocking.map((f) => f.rule_id).join(", ")}. The contract enforces the same rule.</p>
                ) : review.length > 0 ? (
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                    <span>I have reviewed {review.length} item{review.length > 1 ? "s" : ""} ({review.map((f) => f.rule_id).join(", ")}) and want to anchor this claim.</span>
                  </label>
                ) : (
                  <p className="text-sm text-ink-soft">Registers these unit ranges and the evidence fingerprint on ClaimLedger.</p>
                )}
                <Button className="w-full" busy={busy === "anchor"} disabled={blocking.length > 0 || (review.length > 0 && !ack)} onClick={() => run("anchor", () => api.anchor(c.id, { acknowledge_review: ack }))}>
                  Anchor on ledger
                </Button>
                {blocking.some((f) => f.rule_id === "DUP-001") && (
                  <div className="space-y-2 border-t border-rule pt-3">
                    <p className="text-xs leading-relaxed text-muted">To show the rule lives in the contract, not just this interface, send the registration to the chain anyway. The transaction will be rejected.</p>
                    <Button variant="secondary" className="w-full" busy={busy === "force"} onClick={() => run("force", () => api.anchor(c.id, { force: true }))}>Send to the contract anyway</Button>
                  </div>
                )}
              </>
            )}
            {c.status === "anchored" && (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Challenge this claim</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="What evidence suggests these units are not this claimant's to claim?" className="w-full rounded border border-rule p-2 text-sm" />
                </label>
                <Button variant="secondary" className="w-full" disabled={!reason.trim()} busy={busy === "challenge"} onClick={() => run("challenge", () => api.challenge(c.id, reason))}>Open challenge</Button>
                <p className="text-xs text-muted">Anyone can open a challenge. The units stay locked until a reviewer decides.</p>
                <div className="border-t border-rule pt-3">
                  <Button variant="quiet" busy={busy === "withdraw"} onClick={() => run("withdraw", () => api.withdraw(c.id))}>Withdraw claim and release units</Button>
                </div>
              </>
            )}
            {c.status === "challenged" && (
              <>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">Reviewer decision</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Basis for the decision" className="w-full rounded border border-rule p-2 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="danger" busy={busy === "uphold"} onClick={() => run("uphold", () => api.resolve(c.id, true, note))}>Uphold, revoke</Button>
                  <Button variant="secondary" busy={busy === "dismiss"} onClick={() => run("dismiss", () => api.resolve(c.id, false, note))}>Dismiss</Button>
                </div>
              </>
            )}
            {(c.status === "revoked" || c.status === "withdrawn") && <p className="text-sm text-ink-soft">No further actions. Submit a corrected claim if needed.</p>}
            {!(lastRevert?.revert) && <ErrorBox error={actionErr} />}
            {shownRevert?.revert && (
              <div className="space-y-1 rounded-md border border-crimson/30 bg-crimson-wash p-3 text-xs">
                <div className="font-semibold text-crimson">ClaimLedger rejected the registration</div>
                <RevertText r={shownRevert.revert} />
                {shownRevert.tx_hash && (
                  <div className="text-ink-soft">Failed transaction <span className="font-mono">{short(shownRevert.tx_hash, 8)}</span> in block {shownRevert.block_number} (status 0).</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-rule bg-sheet p-4 text-sm">
            <h2 className="font-semibold">On-chain record</h2>
            {c.chain_claim_id ? (
              <dl className="space-y-2">
                <Row k="Ledger claim">#{c.chain_claim_id}</Row>
                <Row k="Block">{c.block_number} {c.chain_id === 31337 && <span className="text-xs text-muted">(local dev chain)</span>}</Row>
                <Row k="Transaction"><CopyHash value={c.tx_hash} label="transaction hash" /></Row>
                <Row k="Contract"><CopyHash value={c.contract_address} label="contract address" /></Row>
              </dl>
            ) : <p className="text-ink-soft">Not anchored.</p>}
            <dl className="space-y-2 border-t border-rule pt-2">
              <Row k="Evidence commitment"><CopyHash value={c.evidence_hash} /></Row>
              <Row k="Report hash"><CopyHash value={c.report_hash} /></Row>
              <Row k="Claimant commitment"><CopyHash value={c.claimant_commitment} /></Row>
            </dl>
            <p className="text-xs leading-relaxed text-muted">Only hashes and unit ranges go on chain. The claimant name is a salted commitment; documents never leave this server.</p>
            <div className="flex gap-4 border-t border-rule pt-2 text-sm">
              <a className="underline underline-offset-4" href={`/api/claims/${c.id}/report.html`} target="_blank" rel="noreferrer">Integrity report</a>
              <a className="underline underline-offset-4" href={`/api/claims/${c.id}/report.json`}>JSON</a>
              {c.chain_claim_id && <Link className="underline underline-offset-4" to={`/verify?ref=${c.ref}`}>Verify</Link>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function RevertText({ r }: { r: any }) {
  if (r.error === "RangeOverlap") {
    return (
      <span>
        <span className="font-mono">RangeOverlap</span>: units {fmt(Number(r.args.overlapStart))}–{fmt(Number(r.args.overlapEnd))} already belong to ledger claim #{r.args.existingClaimId}.
      </span>
    );
  }
  return <span className="font-mono">{r.error}{r.args?.message ? `: ${r.args.message}` : ""}</span>;
}

function FindingRow({ f }: { f: Finding }) {
  const m = severityMeta[f.severity];
  const conflict = f.evidence?.conflict;
  const records = f.evidence?.records as any[] | undefined;
  return (
    <li className="overflow-hidden rounded-lg border border-rule bg-sheet">
      <div className="flex">
        <div className={`w-1 shrink-0 ${m.bar}`} aria-hidden />
        <div className="min-w-0 flex-1 space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SeverityTag severity={f.severity} />
            <span className="font-mono text-xs text-muted">{f.rule_id}</span>
            <span className="font-semibold">{f.title}</span>
          </div>
          <p className="max-w-[78ch] text-sm leading-relaxed">{f.explanation}</p>
          {f.uncertainty && <p className="max-w-[78ch] text-sm leading-relaxed text-ink-soft"><span className="font-semibold">What this cannot tell: </span>{f.uncertainty}</p>}
          {f.next_action && <p className="max-w-[78ch] text-sm leading-relaxed text-ink-soft"><span className="font-semibold">Next step: </span>{f.next_action}</p>}
          {conflict && (
            <p className="text-sm">
              Conflicting claim: <Link className="font-mono underline underline-offset-2" to={`/claims/${conflict.claim_id}`}>{conflict.claim_ref}</Link>
              {conflict.tx_hash && <span className="text-xs text-muted"> · anchored in tx <span className="font-mono">{short(conflict.tx_hash, 8)}</span></span>}
            </p>
          )}
          {records && records.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-ink-soft">Registry record{records.length > 1 ? "s" : ""} matched ({records.length})</summary>
              <ul className="mt-2 space-y-2">
                {records.map((r, i) => (
                  <li key={i} className="rounded bg-fog p-2 leading-relaxed">
                    <Mono>{r.serial}</Mono>
                    <div className="text-ink-soft">{r.project_name} · vintage {r.vintage} · {fmt(r.quantity)} units retired {r.event_date}{r.beneficiary ? ` · beneficiary ${r.beneficiary}` : " · no beneficiary recorded"}</div>
                    <div className="text-muted">Source: Berkeley VROD 2026-08, sheet “{r.source_sheet}”, row {r.source_row}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
