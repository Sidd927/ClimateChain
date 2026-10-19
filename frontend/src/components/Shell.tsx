import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { api } from "../api";
import { LinkButton } from "./primitives";

export function Wordmark({ night = false }: { night?: boolean }) {
  return (
    <Link viewTransition to="/" className={`flex items-center gap-2.5 rounded font-bold tracking-tight ${night ? "text-white" : "text-ink"}`} aria-label="OnceOnly home">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill={night ? "#e9f2ef" : "#12333a"} />
        <rect x="5" y="14" width="22" height="5" rx="1" fill={night ? "#8fa3a6" : "#8fa3a6"} />
        <rect x="5" y="14" width="10" height="5" rx="1" fill={night ? "#2a7253" : "#6cc49a"} />
        <path d="M5 23h22M8 21v2M13 21v2M18 21v2M23 21v2" stroke={night ? "#12333a" : "#e9f2ef"} strokeWidth="1.2" />
      </svg>
      <span className="text-[17px]">OnceOnly</span>
    </Link>
  );
}

/** Live chain status from /api/health. Polls every 10 s while the tab is visible. */
export function LedgerStatus({ night = false }: { night?: boolean }) {
  const [h, setH] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => { if (document.visibilityState === "visible") api.health().then((x) => alive && setH(x)).catch(() => alive && setH({ offline: true })); };
    tick();
    const t = setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const base = `inline-flex items-center gap-2 text-xs ${night ? "text-night-text" : "text-ink-soft"}`;
  if (!h) return <span className={base} aria-live="polite">Checking ledger…</span>;
  if (h.offline) return <span className={`${base} text-crimson`} role="status">API offline</span>;
  const c = h.chain;
  if (!c?.available) return <span className={`${base} ${night ? "text-crimson-bright" : "text-crimson"}`} title={c?.error} role="status">Ledger offline</span>;
  return (
    <span className={base} title={`ClaimLedger ${c.address}`}>
      <span className="relative flex h-2 w-2" aria-hidden><span className="absolute inline-flex h-full w-full rounded-full bg-lichen-bright opacity-60 motion-safe:animate-ping [animation-duration:2.4s]" /><span className="relative inline-flex h-2 w-2 rounded-full bg-lichen-bright" /></span>
      {c.public_network ? `Chain ${c.chain_id}` : "Local dev chain"} · block <span className="font-mono">{c.block_number}</span>
    </span>
  );
}

type NavItem = { to: string; label: string; match?: (p: string) => boolean };

const APP_NAV: NavItem[] = [
  { to: "/overview", label: "Overview" },
  { to: "/claims", label: "Claims", match: (p) => p === "/claims" || (/^\/claims\/\d+/.test(p)) },
  { to: "/verify", label: "Verify" },
  { to: "/evidence", label: "Evidence" },
];
const SITE_NAV: NavItem[] = [
  { to: "/#how", label: "How it works" },
  { to: "/evidence", label: "Evidence" },
  { to: "/verify", label: "Verify" },
];

function MobileMenu({ items, night }: { items: NavItem[]; night?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const loc = useLocation();
  useEffect(() => { ref.current?.close(); }, [loc.pathname, loc.hash]);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`press inline-flex h-9 w-9 items-center justify-center rounded-[7px] border md:hidden ${night ? "border-night-line text-white" : "border-rule-strong text-ink"}`} aria-label="Open menu" aria-haspopup="dialog">
        <Menu size={18} aria-hidden />
      </button>
      <dialog ref={ref} aria-label="Site menu" className="my-0 mr-0 ml-auto h-dvh max-h-dvh w-[min(20rem,88vw)] max-w-none bg-sheet p-0 text-ink shadow-[var(--shadow-float)]">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3.5">
          <Wordmark />
          <button type="button" onClick={() => ref.current?.close()} className="press inline-flex h-9 w-9 items-center justify-center rounded-[7px] border border-rule-strong" aria-label="Close menu"><X size={18} aria-hidden /></button>
        </div>
        <nav aria-label="Mobile" className="flex flex-col p-3">
          {[...items, { to: "/claims/new", label: "Check a claim" }].map((n) => (
            <Link viewTransition key={n.to} to={n.to} className="rounded-[7px] px-3 py-3 text-[15px] font-medium hover:bg-fog">{n.label}</Link>
          ))}
        </nav>
        <div className="border-t border-rule px-5 py-4"><LedgerStatus /></div>
      </dialog>
    </>
  );
}

function NavLinks({ items, night }: { items: NavItem[]; night?: boolean }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
      {items.map((n) => {
        const isHash = n.to.includes("#");
        const active = n.match ? n.match(pathname) : !isHash && pathname === n.to;
        return (
          <NavLink
            viewTransition
            key={n.to}
            to={n.to}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-[6px] px-3 py-1.5 text-sm transition-colors ${night
              ? active ? "text-white" : "text-night-text hover:text-white"
              : active ? "bg-fog-2 font-semibold text-ink" : "text-ink-soft hover:bg-fog hover:text-ink"}`}
          >
            {n.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="on-night relative z-10">
      <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-5 py-4 sm:px-8">
        <Wordmark night />
        <div className="ml-2"><NavLinks items={SITE_NAV} night /></div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden lg:inline-flex"><LedgerStatus night /></span>
          <LinkButton to="/overview" variant="night" className="hidden py-2! sm:inline-flex">Open the ledger</LinkButton>
          <MobileMenu items={[{ to: "/overview", label: "Overview" }, { to: "/claims", label: "Claims" }, ...SITE_NAV]} night />
        </div>
      </div>
    </header>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-20 border-b border-rule bg-sheet/92 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center gap-5 px-5 py-2.5 sm:px-6">
          <Wordmark />
          <NavLinks items={APP_NAV} />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden lg:inline-flex"><LedgerStatus /></span>
            <LinkButton to="/claims/new" className={`py-2! ${pathname === "/claims/new" ? "ring-2 ring-glacier/40 ring-offset-1" : ""}`} aria-current={pathname === "/claims/new" ? "page" : undefined}>
              Check a claim
            </LinkButton>
            <MobileMenu items={APP_NAV} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-8 pb-20 sm:px-6">
        <Suspense fallback={<div className="h-40 rounded-sheet bg-fog-2/70" aria-busy="true" aria-label="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter({ night = false }: { night?: boolean }) {
  return (
    <footer className={night ? "border-t border-night-line bg-night text-night-text" : "border-t border-rule bg-fog-2/50"}>
      <div className={`mx-auto grid max-w-[1200px] gap-6 px-5 py-8 text-xs leading-relaxed sm:grid-cols-[1.4fr_1fr] sm:px-6 ${night ? "" : "text-muted"}`}>
        <p>
          OnceOnly checks whether the same retired registry units back more than one public claim. It does not rate credit quality, additionality or permanence, and a finding is not a determination of fraud.
          Registry data: Berkeley Carbon Trading Project, Voluntary Registry Offsets Database v2026-08 (CC BY 4.0). Every claimant in the demo is fictional.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap content-start gap-x-5 gap-y-2 sm:justify-end">
          {[["/", "Story"], ["/overview", "Overview"], ["/claims", "Claims"], ["/claims/new", "Check a claim"], ["/verify", "Verify"], ["/evidence", "Evidence"]].map(([to, l]) => (
            <Link viewTransition key={to} to={to} className="underline decoration-transparent underline-offset-4 hover:decoration-current">{l}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <div className="rounded-panel border border-dashed border-rule-strong bg-sheet p-8 text-center text-sm text-ink-soft">{children}</div>;
}
