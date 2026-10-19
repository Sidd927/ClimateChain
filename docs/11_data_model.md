# 11 — Data Model

## Registry reference (`data/reference/registry.sqlite`, read-only)

```sql
CREATE TABLE retirements (
  registry TEXT,            -- 'VCS' | 'GS'
  batch_id TEXT,            -- uniqueness namespace with registry (measured: Verra unit numbers restart per batch)
  unit_start INTEGER, unit_end INTEGER, quantity INTEGER,
  serial TEXT, project_id TEXT, project_name TEXT, vintage TEXT, country TEXT,
  retirement_date TEXT, beneficiary TEXT, reason TEXT, source_row INTEGER
);
CREATE INDEX ix_ret ON retirements(registry, batch_id, unit_start);
CREATE TABLE issuances (registry, batch_id, unit_start, unit_end, quantity, serial, project_id, project_name, vintage, issuance_date);
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);  -- source, version, license, row counts, build time
```

## Application DB (`var/onceonly.sqlite`)

| Table | Key fields |
|---|---|
| `claims` | id, ref (unique, e.g. `OO-2026-0001`), claimant, claimant_salt, claimant_commitment, period, statement, status (`draft/checked/blocked/anchored/challenged/revoked/withdrawn`), synthetic (bool), report_hash, chain_claim_id, tx_hash, block_number, created_at |
| `evidence` | id, claim_id, filename, sha256, size, mime, text_excerpt, path |
| `claim_blocks` | id, claim_id, registry, batch_id, unit_start, unit_end, stated_quantity, serial_raw, project_id, vintage, source (`parser/llm/both`) |
| `findings` | id, claim_id, rule_id, severity (`blocking/review/info/pass`), title, explanation, evidence_json, uncertainty, next_action |
| `events` | id, claim_id, kind, detail_json, tx_hash, created_at |

## On-chain (ClaimLedger)

```
struct Range  { bytes32 ns; uint64 start; uint64 end; }        // ns = keccak256("VCS:" + batchId)
struct Claim  { bytes32 ref; bytes32 claimantCommitment; bytes32 evidenceHash; bytes32 reportHash;
                address registrar; uint64 registeredAt; Status status; }
enum Status   { None, Active, Challenged, Revoked, Withdrawn }
```
Public information only: serial ranges are already public on registries. The claimant identity is a salted commitment; documents are hashes.
