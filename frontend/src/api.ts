export type Severity = "blocking" | "review" | "info" | "pass";
export type ClaimStatus = "checked" | "blocked" | "anchored" | "challenged" | "revoked" | "withdrawn";

export interface Finding {
  id: number;
  rule_id: string;
  severity: Severity;
  title: string;
  explanation: string;
  uncertainty: string;
  next_action: string;
  evidence: Record<string, any>;
  block_index: number | null;
}

export interface Block {
  id: number;
  idx: number;
  registry: "VCS" | "GS";
  batch_id: string;
  unit_start: number;
  unit_end: number;
  quantity: number;
  namespace: string;
  serial: string;
  project_id: string | null;
  vintage: string | null;
  country: string | null;
  source: "parser" | "llm" | "both";
}

export interface ClaimEvent {
  id: number;
  kind: string;
  detail: Record<string, any>;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
}

export interface StripRecord { unit_start: number; unit_end: number; kind: "retirement" | "issuance"; event_date: string | null; beneficiary?: string | null; serial: string }
export interface StripOther { claim_id: number; ref: string; claimant: string; status: ClaimStatus; unit_start: number; unit_end: number }
export interface Strip {
  block_index: number;
  namespace: string;
  claim: { unit_start: number; unit_end: number };
  records: StripRecord[];
  others: StripOther[];
  domain: [number, number];
}

export interface ClaimSummary {
  id: number;
  ref: string;
  claimant: string;
  period: string | null;
  statement: string | null;
  status: ClaimStatus;
  verdict: "clear" | "review" | "blocked" | null;
  synthetic: boolean;
  total_units: number;
  block_count: number;
  finding_counts: Partial<Record<Severity, number>>;
  chain_claim_id: number | null;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
}

export interface ClaimDetail extends ClaimSummary {
  claimant_commitment: string;
  report_hash: string | null;
  evidence_hash: string | null;
  chain_id: number | null;
  contract_address: string | null;
  llm_status: string;
  extraction: Record<string, any>;
  evidence: { id: number; filename: string; sha256: string; size: number; mime: string | null; text_excerpt: string }[];
  blocks: Block[];
  findings: Finding[];
  events: ClaimEvent[];
  unit_strips: Strip[];
}

export interface Sample { file: string; claimant: string; title: string; story: string; statement: string; synthetic: boolean }

export class ApiError extends Error {
  status: number;
  detail: any;
  constructor(status: number, message: string, detail: any) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Cannot reach the OnceOnly API. Is the backend running on port 8000?", null);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error ?? (typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`);
    throw new ApiError(res.status, msg, body?.detail ?? body);
  }
  return body as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const api = {
  health: () => request<any>("/api/health"),
  overview: () => request<any>("/api/overview"),
  claims: () => request<ClaimSummary[]>("/api/claims"),
  claim: (id: number | string) => request<ClaimDetail>(`/api/claims/${id}`),
  createClaim: (form: FormData) => request<ClaimDetail>("/api/claims", { method: "POST", body: form }),
  recheck: (id: number) => request<ClaimDetail>(`/api/claims/${id}/recheck`, { method: "POST" }),
  anchor: (id: number, opts: { acknowledge_review?: boolean; force?: boolean }) => request<{ result: any; claim: ClaimDetail }>(`/api/claims/${id}/anchor`, json(opts)),
  challenge: (id: number, reason: string) => request<{ result: any; claim: ClaimDetail }>(`/api/claims/${id}/challenge`, json({ reason })),
  resolve: (id: number, upheld: boolean, note: string) => request<{ result: any; claim: ClaimDetail }>(`/api/claims/${id}/resolve`, json({ upheld, note })),
  withdraw: (id: number) => request<{ result: any; claim: ClaimDetail }>(`/api/claims/${id}/withdraw`, { method: "POST" }),
  verify: (form: FormData) => request<any>("/api/verify", { method: "POST", body: form }),
  samples: () => request<Sample[]>("/api/samples"),
  sampleFile: async (name: string) => {
    const res = await fetch(`/api/samples/${encodeURIComponent(name)}`);
    if (!res.ok) throw new ApiError(res.status, "Could not load the sample document", null);
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type });
  },
  evaluation: () => request<any>("/api/eval"),
  evidenceLookup: (sha256: string) => request<{ sha256: string; claims: { claim_id: number; ref: string; claimant: string; status: ClaimStatus; filename: string }[] }>(`/api/evidence/${sha256}`),
};

export const fmt = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
export const short = (h: string | null | undefined, n = 10) => (!h ? "—" : h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-6)}` : h);
