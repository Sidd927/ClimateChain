import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Copy, Info, Check } from "lucide-react";
import type { ClaimStatus, Severity } from "../api";

const statusStyle: Record<ClaimStatus, string> = {
  checked: "bg-slate-wash text-ink",
  blocked: "bg-crimson-wash text-crimson",
  anchored: "bg-lichen-wash text-lichen",
  challenged: "bg-ochre-wash text-ochre",
  revoked: "bg-crimson-wash text-crimson",
  withdrawn: "bg-slate-wash text-muted",
};
const statusLabel: Record<ClaimStatus, string> = {
  checked: "Checked, not anchored",
  blocked: "Blocked",
  anchored: "Anchored",
  challenged: "Challenged",
  revoked: "Revoked",
  withdrawn: "Withdrawn",
};

export function StatusPill({ status }: { status: ClaimStatus }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${statusStyle[status]}`}>{statusLabel[status]}</span>;
}

export const severityMeta: Record<Severity, { label: string; icon: any; text: string; wash: string; bar: string }> = {
  blocking: { label: "Blocking", icon: AlertOctagon, text: "text-crimson", wash: "bg-crimson-wash", bar: "bg-crimson" },
  review: { label: "Needs review", icon: AlertTriangle, text: "text-ochre", wash: "bg-ochre-wash", bar: "bg-ochre" },
  info: { label: "Note", icon: Info, text: "text-ink-soft", wash: "bg-slate-wash", bar: "bg-slate" },
  pass: { label: "Passed", icon: CheckCircle2, text: "text-lichen", wash: "bg-lichen-wash", bar: "bg-lichen" },
};

export function SeverityTag({ severity }: { severity: Severity }) {
  const m = severityMeta[severity];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${m.text}`}>
      <Icon size={14} aria-hidden /> {m.label}
    </span>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[0.82em] break-all ${className}`}>{children}</span>;
}

export function CopyHash({ value, label }: { value: string | null | undefined; label?: string }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="text-muted">—</span>;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="group inline-flex max-w-full items-center gap-1.5 text-left"
      title={`Copy ${label ?? "value"}`}
    >
      <Mono className="text-ink-soft group-hover:text-ink">{value}</Mono>
      {done ? <Check size={13} className="shrink-0 text-lichen" /> : <Copy size={13} className="shrink-0 text-muted opacity-60 group-hover:opacity-100" />}
    </button>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "quiet"; busy?: boolean };

export function Button({ variant = "primary", busy, className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    secondary: "bg-sheet text-ink border border-rule hover:border-ink",
    danger: "bg-crimson text-white hover:brightness-110",
    quiet: "text-ink underline underline-offset-4 decoration-rule hover:decoration-ink",
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
    >
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function SyntheticNote({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <span className="rounded bg-ochre-wash px-1.5 py-0.5 text-[11px] font-semibold text-ochre">Synthetic</span>
  ) : (
    <p className="rounded-md border border-ochre/30 bg-ochre-wash px-3 py-2 text-sm text-ink">
      <strong className="font-semibold">Synthetic demo claim.</strong> The claimant and its evidence document are fictional. The registry records it is checked against are real public data (Berkeley VROD 2026-08, CC BY 4.0).
    </p>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return <p role="alert" className="rounded-md border border-crimson/30 bg-crimson-wash px-3 py-2 text-sm text-crimson">{msg}</p>;
}

export function Section({ title, aside, children, id }: { title: string; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="border-t border-rule pt-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
