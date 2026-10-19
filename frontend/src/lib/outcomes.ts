import {
  AlertTriangle, CheckCircle2, CircleDashed, FileQuestion, Fingerprint, Info, OctagonX, Stamp, SquareSplitHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ClaimStatus, ClaimSummary, Severity } from "../api";

/** One visual token per outcome. Meaning is carried by icon + label + colour, never colour alone. */
export type Outcome =
  | "passed" | "review" | "insufficient" | "double-use" | "rejected" | "anchored"
  | "fingerprint-match" | "fingerprint-differs" | "not-established" | "note";

export const OUTCOMES: Record<Outcome, { label: string; icon: LucideIcon; cls: string }> = {
  passed: { label: "Check passed", icon: CheckCircle2, cls: "text-lichen bg-lichen-wash border-lichen/30" },
  review: { label: "Needs review", icon: AlertTriangle, cls: "text-ochre bg-ochre-wash border-ochre/30" },
  insufficient: { label: "Insufficient evidence", icon: FileQuestion, cls: "text-ochre bg-ochre-wash border-ochre/50 border-dashed" },
  "double-use": { label: "Potential double use", icon: SquareSplitHorizontal, cls: "text-crimson bg-crimson-wash border-crimson/40" },
  rejected: { label: "Rejected by contract", icon: OctagonX, cls: "text-white bg-crimson border-crimson" },
  anchored: { label: "Anchored on ledger", icon: Stamp, cls: "text-white bg-ink border-ink ring-2 ring-lichen/60 ring-offset-1" },
  "fingerprint-match": { label: "Fingerprint matches", icon: Fingerprint, cls: "text-glacier bg-glacier-wash border-glacier/30" },
  "fingerprint-differs": { label: "Fingerprint differs", icon: Fingerprint, cls: "text-crimson bg-sheet border-crimson/60" },
  "not-established": { label: "Not established", icon: CircleDashed, cls: "text-ink-soft bg-sheet border-slate border-dashed" },
  note: { label: "Note", icon: Info, cls: "text-ink-soft bg-slate-wash border-slate/40" },
};

/** Map a rule finding to the outcome vocabulary. */
export function findingOutcome(rule: string, severity: Severity): Outcome {
  if (rule === "DUP-001") return "double-use";
  if (rule === "EVD-001") return "insufficient";
  if (severity === "pass") return "passed";
  if (severity === "info") return "note";
  if (severity === "review") return "review";
  return "review";
}

export const STATUS: Record<ClaimStatus, { label: string; cls: string; hint: string }> = {
  checked: { label: "Checked · not anchored", cls: "bg-slate-wash text-ink border-slate/50", hint: "Checks have run; nothing is on the ledger yet." },
  blocked: { label: "Blocked", cls: "bg-crimson-wash text-crimson border-crimson/30", hint: "A blocking finding prevents anchoring." },
  anchored: { label: "Anchored", cls: "bg-ink text-white border-ink", hint: "Its unit ranges are locked on ClaimLedger." },
  challenged: { label: "Challenged", cls: "bg-ochre-wash text-ochre border-ochre/40", hint: "Under review; its units stay locked." },
  revoked: { label: "Revoked", cls: "bg-sheet text-crimson border-crimson/50 border-dashed", hint: "Challenge upheld; units released." },
  withdrawn: { label: "Withdrawn", cls: "bg-sheet text-muted border-slate border-dashed", hint: "Withdrawn by its registrar; units released." },
};

/** Summarise a ledger row's check result (blocking rules are DUP-001 with serials, EVD-001 without). */
export function checkOutcome(c: ClaimSummary): { outcome: Outcome; label: string } {
  if (c.finding_counts.blocking) return c.total_units > 0 ? { outcome: "double-use", label: "Potential double use" } : { outcome: "insufficient", label: "No serials disclosed" };
  if (c.finding_counts.review) return { outcome: "review", label: `${c.finding_counts.review} to review` };
  return { outcome: "passed", label: "Checks passed" };
}

