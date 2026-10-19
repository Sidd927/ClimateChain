import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt, short, type Strip } from "../api";
import { UnitStrip } from "../components/UnitStrip";
import { Button, ErrorBox, Section } from "../components/ui";

// Real Verra retirement (Berkeley VROD 2026-08): VCS 1904, batch 18453, units 896,309,560–896,329,558, retired 2026-08-06.
// The two claims citing it are synthetic.
const ILLUSTRATION: Strip = {
  block_index: 0,
  namespace: "VCS:18453",
  claim: { unit_start: 896315001, unit_end: 896322000 },
  records: [{ unit_start: 896309560, unit_end: 896329558, kind: "retirement", event_date: "2026-08-06", beneficiary: null, serial: "18453-896309560-896329558-VCS-VCU-1507-VER-IN-1-1904-01092024-31122024-0" }],
  others: [{ claim_id: 0, ref: "claim A", claimant: "Northwind Foods", status: "anchored", unit_start: 896309560, unit_end: 896319559 }],
  domain: [896309560, 896329558],
};

const EVENT_LABEL: Record<string, string> = {
  submitted: "Claim submitted",
  extracted: "Serials extracted",
  checked: "Checks run",
  anchored: "Anchored on ledger",
  chain_rejected: "Rejected by contract",
  challenged: "Challenge opened",
  challenge_upheld: "Challenge upheld, claim revoked",
  challenge_dismissed: "Challenge dismissed",
  withdrawn: "Claim withdrawn",
};

export default function Overview() {
  const [o, setO] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  useEffect(() => { api.overview().then(setO).catch(setErr); }, []);
  const audit = o?.registry_audit;
  const vr = audit?.verra_retirements;
  const gr = audit?.gold_retirements;
  const ev = o?.evaluation;

  return (
    <div className="space-y-14">
      <section className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">Every retired tonne, claimed once.</h1>
          <p className="max-w-[64ch] text-lg leading-relaxed text-ink-soft">
            Carbon registries make sure a credit is retired only once. Nothing checks what happens next: whether the same retired units end up behind two companies' climate claims.
            OnceOnly reads the serial numbers in a claim's evidence, reconciles them with real registry records, and registers the exact unit ranges on a smart contract that refuses any unit already claimed.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/claims/new"><Button>Check a claim</Button></Link>
            <Link to="/claims"><Button variant="secondary">Open the claims ledger</Button></Link>
          </div>
        </div>

        <div className="rounded-lg border border-rule bg-sheet p-5 sm:p-6">
          <UnitStrip strip={ILLUSTRATION} thisLabel="Helios Apparel" animate />
          <p className="mt-4 max-w-[80ch] text-xs leading-relaxed text-muted sm:pl-[10.75rem]">
            A real Verra retirement of 19,999 units (VCS project 1904, issuance batch 18453, retired 6 Aug 2026) and two synthetic claims that cite overlapping parts of it.
            Each claim looks fine on its own; only a shared ledger of unit ranges shows that 4,559 units are counted twice.
          </p>
        </div>
      </section>

      <ErrorBox error={err} />

      <Section title="Where double counting slips through">
        <div className="grid gap-8 md:grid-cols-3">
          <Fact
            figure={vr ? `${fmt(vr.overlapping_adjacent_pairs_within_namespace)} overlaps` : "…"}
            text={vr ? `in ${fmt(vr.rows)} Verra retirement records we parsed. The registry layer is consistent: a unit is retired once.` : "Loading registry audit"}
          />
          <Fact
            figure={vr ? `${(100 - (vr.with_beneficiary / vr.rows) * 100).toFixed(1)}%` : "…"}
            text="of those retirements record no beneficiary, so the registry often cannot say who is entitled to claim the units."
          />
          <Fact
            figure="One client at a time"
            text="is how claims are assured today: an auditor sees its client's serials, not whether another company cites the same units. VCMI now requires serial numbers in claims, which makes a shared check possible."
          />
        </div>
        {gr && gr.overlapping_adjacent_pairs_within_namespace > 0 && (
          <p className="mt-6 max-w-[80ch] text-sm text-ink-soft">
            In Gold Standard data we found {gr.overlapping_adjacent_pairs_within_namespace} pairs of retirement rows covering the same units, mostly exact duplicate rows in the export.
            We report these as registry data inconsistencies to clarify, not as double retirement.
          </p>
        )}
      </Section>

      <Section title="How a claim is checked">
        <ol className="grid gap-x-8 gap-y-6 md:grid-cols-5">
          {[
            ["Read the evidence", "Serial numbers are extracted from the certificate or claim document by a deterministic parser; an optional AI pass catches serials in messy layouts and is cross-checked."],
            ["Reconcile with the registry", "Each serial becomes a unit range in one issuance batch and is matched to real retirement records (Berkeley VROD, 493k rows)."],
            ["Check the ledger", "The range is compared with every active claim in the same batch. Any shared unit is a potential double use."],
            ["Anchor on the contract", "ClaimLedger stores the ranges plus hashes of the evidence and report. It rejects overlapping ranges itself."],
            ["Verify independently", "Anyone can check a claim's on-chain status and confirm a document matches the committed fingerprint."],
          ].map(([t, d], i) => (
            <li key={t} className="space-y-1.5">
              <div className="text-sm font-semibold"><span className="mr-1.5 text-muted">{i + 1}.</span>{t}</div>
              <p className="text-sm leading-relaxed text-ink-soft">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Ledger right now" aside={o?.chain?.address && <span className="text-xs text-muted">ClaimLedger <span className="font-mono">{short(o.chain.address, 8)}</span>{o.chain.public_network === false && " on a local development chain"}</span>}>
        {o && (
          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Stat label="Claims anchored" value={fmt((o.claims.by_status.anchored ?? 0) + (o.claims.by_status.challenged ?? 0))} />
              <Stat label="Units locked by claims" value={fmt(o.claims.units_anchored)} />
              <Stat label="Claims flagged for double use" value={fmt(o.claims.with_double_use_findings)} />
              <Stat label="Registrations rejected by the contract" value={fmt(o.claims.chain_rejections)} />
            </dl>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Recent activity</h3>
              {o.recent_events.length === 0 ? (
                <p className="text-sm text-muted">No claims yet. <Link to="/claims/new" className="underline">Check the first one</Link>.</p>
              ) : (
                <ul className="divide-y divide-rule text-sm">
                  {o.recent_events.slice(0, 7).map((e: any) => (
                    <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                      <span>
                        <span className={e.kind === "chain_rejected" ? "font-semibold text-crimson" : ""}>{EVENT_LABEL[e.kind] ?? e.kind}</span>
                        {e.ref && <> · <Link className="underline decoration-rule underline-offset-2 hover:decoration-ink" to={`/claims/${e.claim_id}`}>{e.ref}</Link></>}
                      </span>
                      {e.tx_hash && <span className="font-mono text-xs text-muted">block {e.block_number}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Section>

      <Section title="Evidence that it works" aside={<Link to="/evaluation" className="text-sm underline underline-offset-4">Full evaluation</Link>}>
        {ev?.double_use ? (
          <p className="max-w-[80ch] text-ink-soft">
            On {fmt(ev.double_use.n)} labelled test claims (synthetic claims citing real registry records), OnceOnly found potential double use with precision{" "}
            <strong className="text-ink">{ev.double_use.onceonly.precision.toFixed(2)}</strong> and recall <strong className="text-ink">{ev.double_use.onceonly.recall.toFixed(2)}</strong>.
            A baseline that compares serial strings and document hashes reached recall <strong className="text-ink">{ev.double_use.baseline.recall.toFixed(2)}</strong>: it misses partial overlaps.
          </p>
        ) : (
          <p className="text-sm text-muted">Evaluation results appear here after running <span className="font-mono">make eval</span>.</p>
        )}
      </Section>

      <Section title="What OnceOnly does not do">
        <ul className="grid max-w-[90ch] gap-2 text-sm text-ink-soft md:grid-cols-2">
          <li>It does not judge credit quality, additionality or permanence.</li>
          <li>A conflict is a potential double use to review, not proof of fraud.</li>
          <li>A matching document hash proves the file is unchanged, not that its content is true.</li>
          <li>It cannot see claims that were never registered on the ledger.</li>
        </ul>
      </Section>
    </div>
  );
}

function Fact({ figure, text }: { figure: string; text: string }) {
  return (
    <div className="space-y-2">
      <div className="text-3xl font-bold tracking-tight">{figure}</div>
      <p className="text-sm leading-relaxed text-ink-soft">{text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-2xl font-bold tracking-tight">{value}</dd>
    </div>
  );
}
