import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import { api } from "./api";
import Overview from "./pages/Overview";
import Claims from "./pages/Claims";
import NewClaim from "./pages/NewClaim";
import ClaimPage from "./pages/ClaimPage";
import Verify from "./pages/Verify";
import Evaluation from "./pages/Evaluation";

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="6" fill="#12333a" />
      <rect x="5" y="13" width="22" height="6" rx="1" fill="#8fa3a6" />
      <rect x="5" y="13" width="11" height="6" rx="1" fill="#3f8f6b" />
    </svg>
  );
}

function LedgerStatus() {
  const [h, setH] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => api.health().then((x) => alive && setH(x)).catch(() => alive && setH({ offline: true }));
    tick();
    const t = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!h) return null;
  if (h.offline) return <span className="text-xs text-crimson">API offline</span>;
  const c = h.chain;
  if (!c?.available) return <span className="text-xs text-crimson" title={c?.error}>Ledger offline</span>;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-ink-soft" title={`ClaimLedger ${c.address}`}>
      <span className="h-2 w-2 rounded-full bg-lichen" aria-hidden />
      {c.public_network ? `Chain ${c.chain_id}` : "Local dev chain"} · block {c.block_number}
    </span>
  );
}

const nav = [
  { to: "/", label: "Overview", end: true },
  { to: "/claims", label: "Claims ledger" },
  { to: "/claims/new", label: "Check a claim" },
  { to: "/verify", label: "Verify" },
  { to: "/evaluation", label: "Evidence" },
];

export default function App() {
  const { pathname } = useLocation();
  // "/claims/new" belongs to "Check a claim", not to the ledger
  const isActive = (to: string, active: boolean) => (to === "/claims" ? active && pathname !== "/claims/new" : active);
  return (
    <div className="min-h-screen">
      <header className="border-b border-rule bg-sheet">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <Mark />
            <span className="text-[17px]">OnceOnly</span>
          </Link>
          <nav className="order-3 flex w-full gap-5 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive: a }) => `whitespace-nowrap border-b-2 py-1 ${isActive(n.to, a) ? "border-ink font-semibold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto"><LedgerStatus /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/claims/new" element={<NewClaim />} />
          <Route path="/claims/:id" element={<ClaimPage />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="*" element={<p>Page not found. <Link className="underline" to="/">Go to the overview</Link>.</p>} />
        </Routes>
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs leading-relaxed text-muted">
          OnceOnly checks whether the same retired registry units back more than one public claim. It does not rate credit quality, additionality or permanence, and a finding is not a determination of fraud.
          Registry data: Berkeley Carbon Trading Project, Voluntary Registry Offsets Database v2026-08 (CC BY 4.0). All claimants in the demo are fictional.
        </div>
      </footer>
    </div>
  );
}
