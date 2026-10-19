import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Check, ChevronDown, Copy } from "lucide-react";
import type { ClaimStatus } from "../api";
import { OUTCOMES, STATUS, type Outcome } from "../lib/outcomes";

/* ------------------------------------------------------------------ buttons */

type Variant = "primary" | "secondary" | "danger" | "quiet" | "night" | "night-ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-[#0b2429] shadow-[inset_0_-1px_0_rgb(0_0_0/0.25)]",
  secondary: "bg-sheet text-ink border border-rule-strong hover:border-ink",
  danger: "bg-crimson text-white hover:bg-[#9b1c33]",
  quiet: "text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink px-0! py-0!",
  night: "bg-[#e9f2ef] text-night hover:bg-white",
  "night-ghost": "text-night-text border border-night-line hover:border-night-text hover:text-white",
};
const BASE = "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[7px] px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45";

export function Button({ variant = "primary", busy, className = "", children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button {...rest} disabled={disabled || busy} aria-busy={busy || undefined} className={`${BASE} ${VARIANT[variant]} ${className}`}>
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = "primary", className = "", ...rest }: LinkProps & { variant?: Variant }) {
  return <Link viewTransition {...rest} className={`${BASE} ${VARIANT[variant]} ${className}`} />;
}

/* ------------------------------------------------------------------- tokens */

export function OutcomeToken({ outcome, label, size = "sm" }: { outcome: Outcome; label?: string; size?: "sm" | "md" }) {
  const o = OUTCOMES[outcome];
  const Icon = o.icon;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-token border font-semibold whitespace-nowrap ${size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs"} ${o.cls}`}>
      <Icon size={size === "md" ? 15 : 13} aria-hidden strokeWidth={2.2} />
      {label ?? o.label}
    </span>
  );
}

export function StatusPill({ status, size = "sm" }: { status: ClaimStatus; size?: "sm" | "md" }) {
  const s = STATUS[status];
  return (
    <span title={s.hint} className={`inline-flex items-center rounded-token border font-semibold whitespace-nowrap ${size === "md" ? "px-2.5 py-1 text-sm" : "px-2 py-0.5 text-xs"} ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function SyntheticTag() {
  return (
    <span className="rounded-token border border-ochre/30 bg-ochre-wash px-1.5 py-px text-[11px] font-semibold text-ochre" title="Fictional claimant and evidence; registry records are real.">
      Synthetic
    </span>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono text-[0.86em] ${className}`}>{children}</span>;
}

export function CopyValue({ value, label, className = "" }: { value: string | null | undefined; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="text-muted">—</span>;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }); }}
      className={`group inline-flex max-w-full items-start gap-1.5 rounded text-left ${className}`}
      aria-label={`Copy ${label}: ${value}`}
    >
      <span className="font-mono text-[12.5px] leading-snug break-all text-ink-soft group-hover:text-ink">{value}</span>
      <span className="mt-0.5 shrink-0" aria-hidden>{done ? <Check size={13} className="text-lichen" /> : <Copy size={13} className="text-muted opacity-60 group-hover:opacity-100" />}</span>
      <span className="sr-only" role="status">{done ? "Copied" : ""}</span>
    </button>
  );
}

export function ErrorBox({ error, title }: { error: unknown; title?: string }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="fade-in rounded-panel border border-crimson/30 bg-crimson-wash px-3.5 py-2.5 text-sm text-crimson">
      {title && <div className="font-semibold">{title}</div>}
      {msg}
    </div>
  );
}

/* ------------------------------------------------------------------- layout */

export function PageHeader({ title, lede, crumbs, actions, meta }: { title: ReactNode; lede?: ReactNode; crumbs?: { to: string; label: string }[]; actions?: ReactNode; meta?: ReactNode }) {
  return (
    <header className="mb-8 space-y-3">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c) => (
              <li key={c.to} className="flex items-center gap-1.5">
                <Link viewTransition to={c.to} className="underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ink">{c.label}</Link>
                <span aria-hidden>/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[32px]">{title}</h1>
          {lede && <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">{lede}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {meta}
    </header>
  );
}

export function SectionHeader({ title, aside, id, level = 2 }: { title: string; aside?: ReactNode; id?: string; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2.5">
      <H id={id} className={level === 2 ? "text-[19px] font-semibold tracking-tight" : "text-base font-semibold"}>{title}</H>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  );
}

/** Accessible disclosure with a height transition (no measuring). */
export function Disclosure({ summary, children, defaultOpen = false, className = "" }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="press inline-flex items-center gap-1.5 rounded text-sm font-medium text-ink-soft hover:text-ink">
        <ChevronDown size={15} aria-hidden className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        {summary}
      </button>
      <div id={id} className="disclosure" data-open={open}>
        <div inert={!open}>
          <div className="pt-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- reveal */

/** One-shot reveal when scrolled into view. Content is visible without JS and with reduced motion. */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} data-reveal data-revealed={shown} className={className}>
      {children}
    </Tag>
  );
}
