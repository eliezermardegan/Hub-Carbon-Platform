# Data Intake

Canonical intake domain for Hub Carbon Platform.

This package turns company, site, source, document and extracted operational/financial data into validated activity records ready for deterministic carbon calculation and Carbon Ledger persistence.

It does not calculate emissions and it does not select authoritative emission factors. Those responsibilities remain with Carbon Core and Factor Registry.

## Pipeline

`source -> document/record -> normalize -> classify -> validate -> activity -> evidence -> carbon engine -> ledger`

## Design rules

- Missing data is explicit; it is never silently converted to zero.
- Data quality and extraction confidence are separate concepts.
- Scope 3 supports all 15 categories.
- Primary, activity-based, spend-based and unresolved methods remain distinguishable.
- Evidence is immutable by content hash.
- Idempotency keys prevent duplicate downstream ledger events.


## Idempotency and retry contract

- The intake idempotency scope is tenant + idempotency key. A canonical request fingerprint also binds the authenticated actor and methodology version; reusing a key for a different request or identity is rejected.
- Generated activity IDs and derived factor/status fields are not part of the request fingerprint. The first claimed activity ID is reused on retries and is also the ledger append key.
- Equivalent completed requests return the original stored activity. Concurrent in-process duplicates are rejected as busy. A not_ready request may be retried with the same payload when a factor/input becomes available; blocked and calculated are terminal for that key.
- Failure after ledger append but before final intake persistence marks the intake attempt failed where persistence is available. A retry first looks up the committed ledger event and validates tenant, actor, methodology, factor snapshot, activity dimensions and evidence IDs before marking intake calculated; if no event exists, it resumes using the original factor ID/version and rejects a changed factor version. The ledger also compares semantic payloads on cached idempotency replays.
- **Current limitation:** InMemoryDataIntakePersistence is process-local. It is not a durable, multi-worker claim store and does not survive restart. The partial-failure recovery test uses a fake ledger that supports lookup by idempotency key; it does not exercise a real PostgreSQL restart. Before production, implement durable intake persistence/claims (unique tenant+key constraint, payload hash, state/lease and recovery semantics) and run the failure scenario against PostgreSQL-backed ledger persistence across process restart.

## Factor eligibility

A factor is importable only when its status is exactly verified, redistribution is permitted, and the required provenance fields pass registry validation. Draft, deprecated, blocked or malformed-provenance factors fail closed. A syntactically valid SHA-256 field is not by itself proof that it matches the official source artifact; source bytes, exact row/value and licence still require independent verification.


Validation evidence on code head 3a02d2b7081b93e9bdd920b7be2db7f396e88745: Test CI #226 passed 98/98 (PostgreSQL 16.15), Supply Chain Security #146 passed, and Factor Provenance Gate #141 passed. A subsequent documentation refresh requires fresh checks.
