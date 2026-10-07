# carbon-ledger

Audit-oriented carbon ledger primitives connecting normalized activities, versioned emission factors, deterministic calculations and evidence.

## Design

- Append-only entries with sequence numbers.
- Exact factor ID/version and provenance snapshot per entry.
- Deterministic calculation delegated to `carbon-core`.
- Evidence references for invoices, receipts, meters, ERP records and supplier submissions.
- SHA-256 hash chain with canonical serialization and verification.
- Methodology version recorded on every entry.

This package is an in-memory domain primitive. Production persistence must add transactional storage, authorization, tenant isolation and immutable archival without mutating historical entries.
