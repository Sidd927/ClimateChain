import { lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/Shell";
import { LinkButton } from "./components/primitives";
import Landing from "./pages/Landing";
// App pages load on demand so the landing story doesn't pay for them (and vice versa).
const Overview = lazy(() => import("./pages/Overview"));
const Claims = lazy(() => import("./pages/Claims"));
const NewClaim = lazy(() => import("./pages/NewClaim"));
const ClaimPage = lazy(() => import("./pages/ClaimPage"));
const Verify = lazy(() => import("./pages/Verify"));
const Evidence = lazy(() => import("./pages/Evidence"));

const TITLES: [RegExp, string][] = [
  [/^\/$/, "OnceOnly — every retired tonne, claimed once"],
  [/^\/overview/, "Overview · OnceOnly"],
  [/^\/claims\/new/, "Check a claim · OnceOnly"],
  [/^\/claims\/\d+/, "Claim · OnceOnly"],
  [/^\/claims/, "Claims ledger · OnceOnly"],
  [/^\/verify/, "Verify · OnceOnly"],
  [/^\/evidence/, "Evidence · OnceOnly"],
];

/** Scroll to top on route change (keep hash navigation), and set a useful document title. */
function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
    document.title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "Not found · OnceOnly";
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return (
    <div className="max-w-xl space-y-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">This page isn't on the ledger.</h1>
      <p className="text-ink-soft">The address doesn't match any OnceOnly page. Claims live under the claims ledger, by their number.</p>
      <div className="flex flex-wrap gap-3"><LinkButton to="/claims">Open the claims ledger</LinkButton><LinkButton to="/" variant="secondary">Go to the story</LinkButton></div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppLayout />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/claims/new" element={<NewClaim />} />
          <Route path="/claims/:id" element={<ClaimPage />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/evaluation" element={<Navigate to="/evidence" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
