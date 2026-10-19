import { useEffect, useState } from "react";
import { api } from "../api";

let cached: boolean | null = null;

/** True when the API runs as a public demo instance (ledger writes refused server-side). */
export function usePublicDemo() {
  const [v, setV] = useState<boolean>(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    api.health().then((h) => { cached = !!h.public_demo; setV(cached); }).catch(() => {});
  }, []);
  return v;
}
