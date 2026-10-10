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
- **Adapter and verification status:** InMemoryDataIntakePersistence remains process-local and must not be used as a durable multi-worker claim store. PostgresDataIntakePersistence is implemented with tenant/idempotency uniqueness, payload hash, lease and claim token. The PostgreSQL failure/recovery integration scenario now passes on the latest validated SHA, but its service/pool reinitialisation occurs within one OS process. Recovery after a true process/worker boundary remains open; do not treat that last criterion as proven.

## Factor eligibility

A factor is importable only when its status is exactly verified, redistribution is permitted, and the required provenance fields pass registry validation. Draft, deprecated, blocked or malformed-provenance factors fail closed. A syntactically valid SHA-256 field is not by itself proof that it matches the official source artifact; source bytes, exact row/value and licence still require independent verification.


Validation evidence on code head 3a02d2b7081b93e9bdd920b7be2db7f396e88745: Test CI #226 passed 98/98 (PostgreSQL 16.15), Supply Chain Security #146 passed, and Factor Provenance Gate #141 passed. A subsequent documentation refresh requires fresh checks.


## Durable PostgreSQL Data Intake follow-up — 2026-10-10

Status: **IMPLEMENTED — UNVERIFIED**. A PostgreSQL adapter has been added with tenant-scoped JSONB records, unique tenant/idempotency-key activity rows, transaction-local tenant context, RLS, lease expiry and claim fencing tokens. The integration suite now includes a real PostgreSQL scenario: commit ledger event, simulate failure before final calculated-state intake save, close the first pool, create fresh adapters/service, retry, and assert the original event/activity is recovered without a duplicate.

Initial Test CI attempts failed during module export/import resolution before the new recovery scenario executed. Import-resolution fixes have been pushed; the exact current-head CI result must be checked before declaring the scenario tested. Do not mark this work validated until the recovery test passes and Test CI, Supply Chain Security, and Factor Provenance Gate all pass on the same final SHA. PR #21 remains draft and Issue #27 remains open. No production migration or deployment occurred.


## Latest CI evidence — 2026-10-10

On SHA 4d5659f36b9d6702cd2381484fef474bf8635438, [Test CI #248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) passed 100/100 tests, 0 failed, 0 skipped on Node.js 22 and PostgreSQL 16.15. The run includes the canonical Data Intake schema bootstrap and test #46 covering post-ledger-commit intake-save failure and retry without a duplicate ledger event. [Supply Chain Security #168](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164) and [Factor Provenance Gate #163](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111) passed on the same SHA.

Open follow-up: restart the application in a true new process/worker and verify replay, lease and fencing semantics across that boundary. CI does not imply production readiness, legal compliance or independently reviewed security.
