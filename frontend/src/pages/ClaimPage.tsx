import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Blocks, FileText, Link2, Server, Stamp } from "lucide-react";
import { ApiError, api, fmt, short, type ClaimDetail, type Finding } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Button, CopyValue, Disclosure, ErrorBox, LinkButton, Mono, OutcomeToken, SectionHeader, StatusPill, SyntheticTag } from "../components/primitives";
import { Ruler } from "../components/Ruler";
import { SerialAnatomy } from "../components/SerialAnatomy";
import { findingOutcome, type Outcome } from "../lib/outcomes";
import { stripToLanes } from "../lib/ruler";
import { usePublicDemo } from "../lib/usePublicDemo";

const EVENT: Record<string, { label: string; chain?: boolean }> = {
  submitted: { label: "Evidence submitted" },
  extracted: { label: "Serial numbers extracted" },
  checked: { label: "Checks run" },
  anchored: { label: "Anchored on ClaimLedger", chain: true },
  chain_rejected: { label: "ClaimLedger rejected the registration", chain: true },
  challenged: { label: "Challenge opened", chain: true },
  challenge_upheld: { label: "Challenge upheld; claim revoked, units released", chain: true },
  challenge_dismissed: { label: "Challenge dismissed; claim active again", chain: true },
  withdrawn: { label: "Claim withdrawn; units released", chain: true },
};

type Pending = null | "anchor" | "force" | "uphold" | "dismiss" | "withdraw" | "challenge";

function verdict(c: ClaimDetail): { outcome: Outcome; text: string } {
  const dup = c.findings.find((f) => f.rule_id === "DUP-001");
  const b = c.findings.filter((f) => f.severity === "blocking").length;
  const r = c.findings.filter((f) => f.severity === "review").length;
  if (c.status === "anchored") return { outcome: "anchored", text: `Anchored on ClaimLedger. Its ${fmt(c.total_units)} units cannot back another claim while it is active.` };
  if (c.status === "challenged") return { outcome: "review", text: "Under challenge. Its units stay locked until a reviewer decides." };
  if (c.status === "revoked") return { outcome: "not-established", text: "Revoked after an upheld challenge. Its units are free to be claimed again." };
  if (c.status === "withdrawn") return { outcome: "not-established", text: "Withdrawn by its registrar. Its units are free to be claimed again." };
  if (dup) return { outcome: "double-use", text: `${fmt(dup.evidence?.overlap?.units)} units already back ${dup.evidence?.conflict?.claim_ref}. Anchoring is blocked.` };
  if (c.findings.some((f) => f.rule_id === "EVD-001")) return { outcome: "insufficient", text: "No serial numbers were disclosed, so the units cannot be checked for double use." };
  if (b) return { outcome: "review", text: `${b} blocking finding${b > 1 ? "s" : ""}. Anchoring is blocked.` };
  if (r) return { outcome: "review", text: `${r} item${r > 1 ? "s" : ""} to review before anchoring.` };
  return { outcome: "passed", text: "Every check passed. Ready to anchor on the ledger." };
}

export default function ClaimPage() {
  const { id } = useParams();
  const [c, setC] = useState<ClaimDetail | null>(null);
  const [err, setErr] = useState<unknown>(null);
  const [actionErr, setActionErr] = useState<unknown>(null);
  const [busy, setBusy] = useState<Pending>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [ack, setAck] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [lastChain, setLastChain] = useState<any>(null);
  const [justAnchored, setJustAnchored] = useState<any>(null);

  const publicDemo = usePublicDemo();
  const load = useCallback(() => api.claim(id!).then((x) => { setC(x); setErr(null); }).catch(setErr), [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (key: Pending, fn: () => Promise<{ result: any; claim: ClaimDetail }>) => {
    setBusy(key);
    setActionErr(null);
    try {
      const res = await fn();
      setC(res.claim);
      setLastChain(null);
      if (key === "anchor") setJustAnchored(res.result);
    } catch (e) {
      if (e instanceof ApiError && e.detail?.chain?.revert) setLastChain(e.detail.chain);
      else setActionErr(e);
      await load();
    } finally {
      setBusy(null);
      setPending(null);
    }
  };

  const lanesPerStrip = useMemo(() => (c ? c.unit_strips.map((s) => stripToLanes(s, c.claimant, c.ref)) : []), [c]);

  if (err) return <ErrorBox title="Could not load this claim" error={err} />;
  if (!c || String(c.id) !== id) return <ClaimSkeleton />; // also covers navigating between claims
  const strips = c.unit_strips;

  const blocking = c.findings.filter((f) => f.severity === "blocking");
  const review = c.findings.filter((f) => f.severity === "review");
  const preAnchor = c.status === "checked" || c.status === "blocked";
  const rejections = c.events.filter((e) => e.kind === "chain_rejected");
  const lastRej = rejections[rejections.length - 1];
  const shownRevert = lastChain ?? (lastRej ? { ...lastRej.detail, tx_hash: lastRej.tx_hash, block_number: lastRej.block_number } : null);
  const v = verdict(c);
  const regPass = c.findings.filter((f) => f.rule_id === "REG-000").length;
  const statement = c.statement && c.statement !== c.period ? c.statement : null;
  const showPeriod = c.period && !(statement ?? "").startsWith(c.period);

  const actions = (
          <section className="space-y-3 rounded-sheet border border-rule bg-sheet p-4">
            <h2 className="text-sm font-semibold">Ledger actions</h2>
            {publicDemo && (
              <p className="rounded-panel border border-glacier/30 bg-glacier-wash px-3 py-2.5 text-[13px] leading-relaxed text-ink" role="note">
                <strong className="font-semibold">Public demo instance.</strong> Ledger writes are disabled here so every visitor sees the same story. The seeded anchoring and the contract's rejection shown on this page are real transactions on the instance's local chain. Run OnceOnly locally to anchor or challenge claims.
              </p>
            )}
            {preAnchor && (
              <>
                {blocking.length > 0 ? (
                  <p className="text-sm text-ink-soft">Anchoring is blocked by <strong className="font-semibold text-ink">{blocking.map((f) => f.rule_id).join(", ")}</strong>. The ClaimLedger contract enforces the same rule.</p>
                ) : review.length > 0 ? (
                  <label className="flex items-start gap-2.5 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[#12333a]" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                    <span>I've reviewed {review.length} item{review.length > 1 ? "s" : ""} ({review.map((f) => f.rule_id).join(", ")}) and want to anchor this claim.</span>
                  </label>
                ) : (
                  <p className="text-sm text-ink-soft">Writes these unit ranges and the evidence fingerprint to ClaimLedger. This cannot be undone, only challenged or withdrawn.</p>
                )}
                <Button className="w-full" busy={busy === "anchor"} disabled={publicDemo || blocking.length > 0 || (review.length > 0 && !ack)} onClick={() => setPending("anchor")}>
                  <Stamp size={16} aria-hidden /> Anchor on ledger
                </Button>
                {blocking.length > 0 && <p className="text-xs text-muted">Disabled because of the blocking finding above.</p>}
                {blocking.some((f) => f.rule_id === "DUP-001") && (
                  <div className="space-y-2 border-t border-rule pt-3">
                    <p className="text-xs leading-relaxed text-ink-soft">To show the rule lives in the contract and not only in this interface, you can send the registration to the chain anyway. It will be rejected and recorded as a failed transaction.</p>
                    <Button variant="secondary" className="w-full" busy={busy === "force"} disabled={publicDemo} onClick={() => setPending("force")}>Send to the contract anyway</Button>
                  </div>
                )}
              </>
            )}
            {c.status === "anchored" && (
              <>
                {justAnchored && (
                  <div className="seal-in flex items-start gap-2.5 rounded-panel bg-ink px-3 py-2.5 text-sm text-white">
                    <Stamp size={18} className="mt-0.5 shrink-0 text-lichen-bright" aria-hidden />
                    <span>Anchored as ledger claim #{justAnchored.claim_id} in block {justAnchored.block_number}. Gas used {fmt(justAnchored.gas_used)}.</span>
                  </div>
                )}
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Challenge this claim</span>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="What evidence suggests these units are not this claimant's to claim?" className="w-full rounded-[7px] border border-rule-strong bg-sheet p-2.5 text-sm" />
                </label>
                <Button variant="secondary" className="w-full" disabled={publicDemo || !reason.trim()} busy={busy === "challenge"} onClick={() => run("challenge", () => api.challenge(c.id, reason))}>Open challenge</Button>
                <p className="text-xs text-muted">Anyone can open a challenge. The units stay locked until a reviewer decides.</p>
                <div className="border-t border-rule pt-3"><Button variant="quiet" disabled={publicDemo} onClick={() => setPending("withdraw")}>Withdraw claim and release its units</Button></div>
              </>
            )}
            {c.status === "challenged" && (
              <>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">Reviewer decision</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Basis for the decision (recorded as a hash on chain)" className="w-full rounded-[7px] border border-rule-strong bg-sheet p-2.5 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="danger" disabled={publicDemo} onClick={() => setPending("uphold")}>Uphold</Button>
                  <Button variant="secondary" disabled={publicDemo} onClick={() => setPending("dismiss")}>Dismiss</Button>
                </div>
                <p className="text-xs text-muted">Upholding revokes the claim and releases its units. Dismissing returns it to active.</p>
              </>
            )}
            {(c.status === "revoked" || c.status === "withdrawn") && <p className="text-sm text-ink-soft">No further ledger actions. A corrected claim can be submitted as a new claim.</p>}
            <ErrorBox error={actionErr} />
            {shownRevert?.revert && (
              <div key={shownRevert.tx_hash ?? "rev"} className="seal-in space-y-1.5 rounded-panel border border-crimson/40 bg-crimson-wash p-3 text-sm" role="status">
                <OutcomeToken outcome="rejected" />
                <p className="text-ink"><RevertText r={shownRevert.revert} /></p>
                {shownRevert.tx_hash && <p className="text-xs text-ink-soft">Failed transaction <Mono>{short(shownRevert.tx_hash, 8)}</Mono> in block {shownRevert.block_number} (status 0).</p>}
              </div>
            )}
          </section>
  );

  const onChain = (
          <section className="space-y-3 rounded-sheet border border-rule bg-sheet p-4 text-sm">
            <h2 className="font-semibold">On-chain record</h2>
            {c.chain_claim_id ? (
              <>
                <OutcomeToken outcome="anchored" />
                <dl className="space-y-2.5">
                  <Row k="Ledger claim">#{c.chain_claim_id}</Row>
                  <Row k="Block">{c.block_number}{c.chain_id === 31337 && <span className="text-xs text-muted"> · local dev chain</span>}</Row>
                  <Row k="Transaction"><CopyValue value={c.tx_hash} label="transaction hash" /></Row>
                  <Row k="Contract"><CopyValue value={c.contract_address} label="contract address" /></Row>
                  <Row k="Evidence commitment"><CopyValue value={c.evidence_hash} label="evidence commitment" /></Row>
                </dl>
                <LinkButton to={`/verify?ref=${c.ref}`} variant="secondary" className="w-full">Verify independently</LinkButton>
              </>
            ) : (
              <>
                <OutcomeToken outcome="not-established" label="Nothing on chain yet" />
                <p className="text-xs leading-relaxed text-ink-soft">If anchored, these commitments are written to the contract. Only hashes and unit ranges go on chain; the claimant name is a salted commitment and documents stay on this server.</p>
                <dl className="space-y-2.5">
                  <Row k="Evidence commitment (pending)"><CopyValue value={c.evidence_hash} label="evidence commitment" /></Row>
                  <Row k="Report hash (pending)"><CopyValue value={c.report_hash} label="report hash" /></Row>
                </dl>
              </>
            )}
            <div className="flex gap-4 border-t border-rule pt-3">
              <a className="underline underline-offset-4" href={`/api/claims/${c.id}/report.html`} target="_blank" rel="noreferrer">Integrity report</a>
              <a className="underline underline-offset-4" href={`/api/claims/${c.id}/report.json`}>JSON</a>
            </div>
          </section>
  );

  return (
    <div className="space-y-8">
      {/* ---------------------------------------------------------- header */}
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex items-center gap-1.5">
            <li><Link viewTransition to="/claims" className="underline decoration-rule-strong underline-offset-4 hover:text-ink">Claims</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-mono text-xs">{c.ref}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[34px]">{c.claimant.replace(" (SYNTHETIC)", "")}</h1>
          <span key={c.status} className="seal-in"><StatusPill status={c.status} size="md" /></span>
          {c.synthetic && <span className="inline-flex items-center gap-2"><SyntheticTag /><span className="text-xs text-muted">fictional claimant and document; registry records are real (Berkeley VROD 2026-08)</span></span>}
        </div>
        <p className="text-sm text-ink-soft"><Mono>{c.ref}</Mono>{showPeriod && <> · {c.period}</>}{statement && <> · {statement}</>}</p>
        <div key={v.outcome} className="seal-in flex flex-wrap items-center gap-3 rounded-panel border border-rule bg-sheet px-4 py-3">
          <OutcomeToken outcome={v.outcome} size="md" />
          <p className="text-[15.5px] font-medium">{v.text}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-rule bg-rule text-sm md:grid-cols-4">
          <Fact k="Units claimed" v={c.total_units ? fmt(c.total_units) : "None disclosed"} />
          <Fact k="Serial blocks" v={String(c.blocks.length)} />
          <Fact k="Registry match" v={c.blocks.length ? `${regPass} of ${c.blocks.length} confirmed` : "Not checkable"} />
          <Fact k="Ledger" v={c.chain_claim_id ? `Claim #${c.chain_claim_id} · block ${c.block_number}` : rejections.length ? `Not anchored · ${rejections.length} rejected attempt${rejections.length > 1 ? "s" : ""}` : "Not anchored"} />
        </dl>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ------------------------------------------------------ side panel */}
        <aside className="hidden space-y-5 lg:sticky lg:top-20 lg:order-last lg:block lg:self-start" aria-label="Ledger">
          <div className="hidden lg:block">{actions}</div>

          <div className="hidden lg:block">{onChain}</div>
        </aside>

        {/* ------------------------------------------------------- main column */}
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="units-h">
            <SectionHeader id="units-h" title="Claimed units" aside={c.blocks.length ? `${fmt(c.total_units)} units in ${c.blocks.length} block${c.blocks.length === 1 ? "" : "s"}` : undefined} />
            {strips.length === 0 ? (
              <div className="rounded-panel border border-dashed border-ochre/50 bg-sheet p-5 text-sm text-ink-soft">
                <OutcomeToken outcome="insufficient" />
                <p className="mt-2">No registry serial numbers were found in this claim's evidence, so there is no unit range to place on the ruler.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {strips.map((s, i) => {
                  const b = c.blocks.find((x) => x.idx === s.block_index);
                  return (
                    <div key={s.block_index} className="rounded-sheet border border-rule bg-sheet p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold">Block {i + 1}{c.blocks.length > 1 ? ` of ${c.blocks.length}` : ""} <span className="font-normal text-ink-soft">· {b?.registry === "GS" ? "Gold Standard" : "Verra"} project {b?.project_id} · vintage {b?.vintage}</span></h3>
                        <Mono className="text-ink-soft">{s.namespace}</Mono>
                      </div>
                      <Ruler namespace={s.namespace} lanes={lanesPerStrip[i]} focusKey="focus" animate />
                      {b && (
                        <Disclosure summary="Read this serial number" className="mt-3 sm:pl-[11.25rem]">
                          <div className="overflow-x-auto pb-1"><SerialAnatomy serial={b.serial} /></div>
                        </Disclosure>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="lg:hidden">{actions}</div>

          <section aria-labelledby="prov-h">
            <SectionHeader id="prov-h" title="Provenance" aside="From document to ledger" />
            <Provenance c={c} />
          </section>

          <section aria-labelledby="find-h">
            <SectionHeader id="find-h" title="Findings" aside="Each names the rule that produced it" />
            <ul className="space-y-3">{c.findings.map((f) => <FindingRow key={f.id} f={f} />)}</ul>
          </section>

          <section aria-labelledby="ev-h">
            <SectionHeader id="ev-h" title="Evidence documents" />
            <div className="space-y-3">
              {c.evidence.map((e) => (
                <div key={e.id} className="rounded-panel border border-rule bg-sheet p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="inline-flex items-center gap-2 font-medium"><FileText size={16} className="text-ink-soft" aria-hidden />{e.filename}</span>
                    <span className="text-xs text-muted">{(e.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="mt-2 text-xs text-muted">SHA-256 fingerprint</div>
                  <CopyValue value={e.sha256} label="SHA-256" />
                  <Disclosure summary="Extracted text" className="mt-2">
                    <pre className="max-h-64 overflow-auto rounded-[6px] bg-fog p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">{e.text_excerpt}</pre>
                  </Disclosure>
                </div>
              ))}
              {c.blocks.length > 0 && (
                <div className="rounded-panel border border-rule bg-sheet">
                  <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_7rem_5rem_8rem] gap-3 border-b border-rule px-4 py-2 text-xs text-muted md:grid">
                    <span>Serial block</span><span className="text-right">Units</span><span>Project</span><span>Vintage</span><span>Found by</span>
                  </div>
                  <ul className="divide-y divide-rule">
                    {c.blocks.map((b) => (
                      <li key={b.id} className="grid gap-x-3 gap-y-1 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_5.5rem_7rem_5rem_8rem] md:items-center">
                        <Mono className="break-all text-ink">{b.serial}</Mono>
                        <div className="md:text-right"><span className="text-xs text-muted md:hidden">Units </span>{fmt(b.quantity)}</div>
                        <div><span className="text-xs text-muted md:hidden">Project </span>{b.registry} {b.project_id}</div>
                        <div><span className="text-xs text-muted md:hidden">Vintage </span>{b.vintage}</div>
                        <div className="text-xs">{b.source === "both" ? "Parser and AI agree" : b.source === "llm" ? <span className="font-semibold text-ochre">AI only · review</span> : "Deterministic parser"}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-rule px-4 py-2.5 text-xs text-muted">
                    AI extraction: {c.llm_status === "ok" ? "used and cross-checked against the parser." : c.llm_status === "error" ? "failed; the deterministic parser result is used." : "not configured; the deterministic parser result is used."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="lg:hidden">{onChain}</div>

          <section aria-labelledby="audit-h">
            <SectionHeader id="audit-h" title="Audit trail" aside={<span className="inline-flex gap-3"><span className="inline-flex items-center gap-1"><Blocks size={13} aria-hidden />on chain</span><span className="inline-flex items-center gap-1"><Server size={13} aria-hidden />server</span></span>} />
            <ol className="relative space-y-4 border-l border-rule pl-6">
              {c.events.map((e) => {
                const m = EVENT[e.kind] ?? { label: e.kind };
                const Icon = m.chain ? Blocks : Server;
                return (
                  <li key={e.id} className="relative">
                    <span className={`absolute top-0.5 -left-[35px] flex h-5 w-5 items-center justify-center rounded-full border bg-sheet ${e.kind === "chain_rejected" ? "border-crimson text-crimson" : m.chain ? "border-ink text-ink" : "border-rule-strong text-muted"}`} aria-hidden><Icon size={11} /></span>
                    <div className="text-sm font-medium">{m.label}<span className="sr-only"> ({m.chain ? "on chain" : "server"})</span></div>
                    <div className="text-xs text-muted">
                      <time dateTime={e.created_at}>{new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}</time>
                      {e.tx_hash && <> · block {e.block_number} · tx <Mono>{short(e.tx_hash, 8)}</Mono></>}
                    </div>
                    {e.kind === "chain_rejected" && e.detail?.revert && <div className="mt-1 text-xs text-crimson"><RevertText r={e.detail.revert} /></div>}
                    {e.kind === "challenged" && e.detail?.reason && <div className="mt-1 text-xs text-ink-soft">“{e.detail.reason}”</div>}
                    {(e.kind === "challenge_upheld" || e.kind === "challenge_dismissed") && e.detail?.note && <div className="mt-1 text-xs text-ink-soft">“{e.detail.note}”</div>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={pending === "anchor"} title="Anchor this claim on ClaimLedger?" confirmLabel="Anchor on ledger" busy={busy === "anchor"}
        onClose={() => setPending(null)} onConfirm={() => run("anchor", () => api.anchor(c.id, { acknowledge_review: ack }))}
      >
        <p>This writes {fmt(c.total_units)} units in {c.blocks.length} block{c.blocks.length === 1 ? "" : "s"}, the evidence fingerprint and the report hash to the contract. While the claim is active, no other claim can register these units.</p>
        <p>A transaction cannot be deleted. It can later be challenged or withdrawn.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "force"} title="Send a registration the contract should reject?" confirmLabel="Send to the contract" tone="danger" busy={busy === "force"}
        onClose={() => setPending(null)} onConfirm={() => run("force", () => api.anchor(c.id, { force: true }))}
      >
        <p>This broadcasts the registration without the interface's safeguard. ClaimLedger checks the unit ranges itself and is expected to revert with <Mono>RangeOverlap</Mono>.</p>
        <p>The failed transaction is mined and recorded in this claim's audit trail.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "uphold"} title="Uphold the challenge and revoke this claim?" confirmLabel="Uphold and revoke" tone="danger" busy={busy === "uphold"}
        onClose={() => setPending(null)} onConfirm={() => run("uphold", () => api.resolve(c.id, true, note))}
      >
        <p>The claim becomes revoked on ClaimLedger and its {fmt(c.total_units)} units are released so another claim can register them.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "dismiss"} title="Dismiss the challenge?" confirmLabel="Dismiss challenge" busy={busy === "dismiss"}
        onClose={() => setPending(null)} onConfirm={() => run("dismiss", () => api.resolve(c.id, false, note))}
      >
        <p>The claim returns to active and keeps its units locked.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={pending === "withdraw"} title="Withdraw this claim?" confirmLabel="Withdraw and release units" tone="danger" busy={busy === "withdraw"}
        onClose={() => setPending(null)} onConfirm={() => run("withdraw", () => api.withdraw(c.id))}
      >
        <p>The claim is marked withdrawn on ClaimLedger and its units are released. The registration and withdrawal both stay in the contract's history.</p>
      </ConfirmDialog>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="bg-sheet px-4 py-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div><dt className="text-xs text-muted">{k}</dt><dd className="min-w-0">{children}</dd></div>;
}

function RevertText({ r }: { r: any }) {
  if (r.error === "RangeOverlap") {
    return <span><Mono>RangeOverlap</Mono>: units {fmt(Number(r.args.overlapStart))}–{fmt(Number(r.args.overlapEnd))} already belong to ledger claim #{r.args.existingClaimId}.</span>;
  }
  return <Mono>{r.error}{r.args?.message ? `: ${r.args.message}` : ""}</Mono>;
}

function Provenance({ c }: { c: ClaimDetail }) {
  const regPass = c.findings.filter((f) => f.rule_id === "REG-000").length;
  const regIssues = c.findings.filter((f) => /^REG-00[1-4]$/.test(f.rule_id)).length;
  const dup = c.findings.some((f) => f.rule_id === "DUP-001");
  const steps: { icon: any; title: string; body: string; outcome: Outcome; tokenLabel?: string }[] = [
    { icon: FileText, title: `${c.evidence.length} document${c.evidence.length === 1 ? "" : "s"}`, body: "Fingerprinted with SHA-256 on arrival.", outcome: "fingerprint-match", tokenLabel: "Fingerprinted" },
    { icon: Link2, title: `${c.blocks.length} serial block${c.blocks.length === 1 ? "" : "s"}`, body: c.blocks.length ? `${fmt(c.total_units)} units extracted.` : "No serials found in the evidence.", outcome: c.blocks.length ? "passed" : "insufficient", tokenLabel: c.blocks.length ? "Extracted" : undefined },
    { icon: Blocks, title: "Registry records", body: c.blocks.length ? `${regPass} of ${c.blocks.length} block${c.blocks.length === 1 ? "" : "s"} fully covered by retirement records.` : "Nothing to reconcile.", outcome: !c.blocks.length ? "not-established" : regIssues ? "review" : "passed", tokenLabel: !c.blocks.length ? "Not checked" : regIssues ? "Needs review" : "Reconciled" },
    { icon: Stamp, title: "ClaimLedger", body: c.chain_claim_id ? `Ledger claim #${c.chain_claim_id}, block ${c.block_number}.` : dup ? "Blocked: units already held by another claim." : "Not anchored yet.", outcome: c.chain_claim_id ? "anchored" : dup ? "double-use" : "not-established", tokenLabel: c.chain_claim_id ? "Anchored" : dup ? "Overlap" : "Pending" },
  ];
  return (
    <ol className="grid gap-3 md:grid-cols-4 md:gap-0">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 rounded-panel border border-rule bg-sheet p-4 md:flex-col md:rounded-none md:border-y md:border-r md:border-l-0 md:first:rounded-l-panel md:first:border-l md:last:rounded-r-panel">
          <s.icon size={18} className="mt-0.5 shrink-0 text-ink-soft md:mt-0" aria-hidden />
          <div className="min-w-0 space-y-1.5">
            <div className="text-sm font-semibold">{s.title}</div>
            <p className="text-xs leading-relaxed text-ink-soft">{s.body}</p>
            <OutcomeToken outcome={s.outcome} label={s.tokenLabel} />
          </div>
          {i < steps.length - 1 && <ArrowRight size={14} className="absolute top-1/2 -right-[7px] z-10 hidden -translate-y-1/2 rounded-full bg-fog text-muted md:block" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const outcome = findingOutcome(f.rule_id, f.severity);
  const conflict = f.evidence?.conflict;
  const records = f.evidence?.records as any[] | undefined;
  const bar = { "double-use": "bg-crimson", insufficient: "bg-ochre", review: "bg-ochre", passed: "bg-lichen", note: "bg-slate" }[outcome as string] ?? "bg-slate";
  return (
    <li className="overflow-hidden rounded-panel border border-rule bg-sheet">
      <div className="flex">
        <div className={`w-1 shrink-0 ${bar}`} aria-hidden />
        <div className="min-w-0 flex-1 space-y-2.5 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <OutcomeToken outcome={outcome} />
            <Mono className="text-muted">{f.rule_id}</Mono>
            <h3 className="font-semibold">{f.title}</h3>
          </div>
          <p className="max-w-[76ch] text-[14.5px] leading-relaxed">{f.explanation}</p>
          {(f.uncertainty || f.next_action) && (
            <dl className="grid max-w-[76ch] gap-2 text-sm leading-relaxed text-ink-soft sm:grid-cols-2 sm:gap-6">
              {f.uncertainty && <div><dt className="text-xs font-semibold text-ink">What this cannot tell</dt><dd>{f.uncertainty}</dd></div>}
              {f.next_action && <div><dt className="text-xs font-semibold text-ink">Next step</dt><dd>{f.next_action}</dd></div>}
            </dl>
          )}
          {conflict && (
            <p className="text-sm">
              Conflicting claim: <Link viewTransition className="font-mono font-medium underline underline-offset-2" to={`/claims/${conflict.claim_id}`}>{conflict.claim_ref}</Link>
              {conflict.tx_hash && <span className="text-xs text-muted"> · anchored in tx <Mono>{short(conflict.tx_hash, 8)}</Mono></span>}
            </p>
          )}
          {records && records.length > 0 && (
            <Disclosure summary={`Registry record${records.length > 1 ? "s" : ""} matched (${records.length})`}>
              <ul className="space-y-2">
                {records.map((r, i) => (
                  <li key={i} className="rounded-[6px] bg-fog p-3 text-xs leading-relaxed">
                    <div className="overflow-x-auto"><Mono className="whitespace-nowrap text-ink">{r.serial}</Mono></div>
                    <div className="mt-1 text-ink-soft">{r.project_name} · vintage {r.vintage} · {fmt(r.quantity)} units retired {r.event_date} · {r.beneficiary ? `beneficiary ${r.beneficiary}` : "no beneficiary recorded"}</div>
                    <div className="text-muted">Source: Berkeley VROD 2026-08, sheet “{r.source_sheet}”, row {r.source_row}</div>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </div>
      </div>
    </li>
  );
}

function ClaimSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading claim">
      <div className="h-4 w-32 rounded bg-fog-2" />
      <div className="h-9 w-72 rounded bg-fog-2" />
      <div className="h-14 rounded-panel bg-fog-2" />
      <div className="h-48 rounded-sheet bg-fog-2" />
    </div>
  );
}
