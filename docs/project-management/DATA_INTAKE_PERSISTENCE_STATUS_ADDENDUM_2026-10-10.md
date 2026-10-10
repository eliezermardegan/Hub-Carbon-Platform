# Data Intake Persistence Status Addendum — 2026-10-10

**Authoritative current candidate:** `52c9cb71f1b84a87b6e4fa23657dcc57ba5be4bd`  
**Test CI:** [#240 / run 38063916945](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38063916945) — **FAILED**  
**Supply Chain Security:** [run 38063916913](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38063916913) — PASS  
**Factor Provenance Gate:** [run 38063916906](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38063916906) — PASS  
**PR:** #21 — OPEN / DRAFT / UNMERGED  
**Issue:** #27 — OPEN

## 1. Current decision

The durable PostgreSQL Data Intake implementation is **IMPLEMENTED — UNVERIFIED / REWORK REQUIRED**. It must not be treated as production-ready, legally compliant, residency-certified, or independently security-reviewed.

## 2. What is implemented

- PostgreSQL-backed Data Intake persistence with JSONB records.
- Tenant + idempotency-key uniqueness and canonical request fingerprinting.
- Transaction-local tenant context and RLS/FORCE RLS policies.
- Lease expiry and claim/fencing tokens.
- Recovery lookup for a ledger event already committed before a final intake-save failure.
- Validation of tenant, actor, methodology, factor snapshot, activity dimensions and evidence before recovered calculation state is accepted.
- Domain functions separated into `packages/data-intake/src/model.ts` to reduce the service/index dependency cycle.
- Strict `typecheck:tests` covering test files.
- Full test command retains `*.integration.test.ts`.
- Factor gating keeps unresolved data `not_ready` and rejected factors `blocked`; these paths do not append to the ledger.

## 3. Current failures

### PostgreSQL bootstrap
The Data Intake DDL used a literal backslash-n separator and lacked statement terminators. PostgreSQL failed before `carbon_ledger_app` was created. RLS/grant/idempotency/recovery failures reporting a missing role are therefore at least partly cascading setup failures. They are not independent evidence that those controls are broken, but they cannot be counted as passes.

### Runtime ESM
The CBAM integration test cannot link the named `InMemoryDataIntakePersistence` export under Node 22/tsx. Earlier attempts also failed with `DataIntakeService` and `DATA_INTAKE_POSTGRES_SCHEMA`. Typecheck does not prove runtime module-linking compatibility.

### Concurrent append
The bounded sequence/head assertion reported `0 !== 1`. This must be rerun after database setup is valid. The assertion must not be weakened.

### Recovery
The intended PostgreSQL failure/restart test did not reach the injected `simulated final intake persistence failure`; the missing application role prevented the scenario. Restart recovery is therefore **not demonstrated**.

## 4. Test history boundary

Historical green runs remain valid evidence for their exact revisions only:

- CI #178 / `502fe9d`: 83/83 PostgreSQL ledger tests passed.
- CI #183 / `f7ec3f5`: 85/85 passed.
- CI #226 / `3a02d2b`: 98/98 passed.
- CI #227 / `74f5e00`: 98/98 passed.

Those revisions predate or do not contain the current durable Data Intake implementation. The current candidate has not achieved an equivalent green result.

## 5. Stress-test boundary

The project has a bounded concurrent append race and historical PostgreSQL evidence for it. There is **no claim of sustained load, soak, throughput/latency benchmarking, multi-process claim/fencing stress, or production-scale stress testing**. The current bounded concurrency assertion is unresolved.

## 6. Safe next sequence

1. Repair SQL bootstrap using valid statement boundaries; keep `ON_ERROR_STOP=1`.
2. Verify the application role is non-owner, `NOSUPERUSER`, `NOBYPASSRLS`, and has only the intended effective grants before dependent tests run.
3. Add a minimal Node 22/tsx consumer smoke test and establish one consistent ESM/TypeScript resolution strategy.
4. Rerun RLS, cross-tenant, grants, append-only, tenant-head, rollback, idempotency, pool-reuse, concurrency and bigint tests.
5. Prove recovery across a fresh process/worker: commit ledger event → fail final intake save → persist failure state → restart → retry same request → verify one identical ledger event, factor snapshot and calculated intake state. Include conflicting payload/identity, expired lease and stale fencing-token cases.
6. Require normal typecheck, test-inclusive typecheck, full test suite and all three CI workflows to pass on one exact SHA.
7. Keep independent security/privacy/legal review, deployment authentication/authorization, production database verification, GDPR/data-flow/residency evidence and backup/restore as separate release gates.

## 7. Integrity and legal boundary

The repository incorporates EU GDPR/UK GDPR and ICO guidance, OWASP ASVS 5.0.0, Digital Catapult CCCA recommendations, Novisto fit-gap guidance, KPMG GHG reporting guidance, King's College methodology, source/licence provenance controls and ADR-001 regulatory/calculation separation. These are project governance references and fit-gap requirements, not compliance attestations.

ADEME Base Carbone V23.6 and UK DESNZ 2026 candidates remain blocked until exact official artifacts, rows/values, licence/legal basis and hashes are verified. No source hash is fabricated and redistribution remains disabled.

No CI result authorises merge, deployment, production migration, legal/compliance claims, residency commitments or independent security certification.
