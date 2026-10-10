# Data Intake Persistence & Recovery — Engineering Handover

**Status:** IMPLEMENTED — UNVERIFIED / REWORK REQUIRED  
**Review date:** 2026-10-10  
**Branch:** `hardening/ip-supply-chain-governance`  
**PR:** [#21 — OPEN / DRAFT / UNMERGED](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21)  
**Issue:** [#27 — OPEN](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27)  
**Implementation head assessed:** `52c9cb71f1b84a87b6e4fa23657dcc57ba5be4bd`  
**Production change authorised:** No

## Executive status

The durable PostgreSQL Data Intake path has been implemented, including JSONB persistence, tenant/idempotency-key uniqueness, payload fingerprinting, transaction-local tenant context, RLS, leases and claim/fencing tokens. Recovery logic checks a previously committed ledger event before marking intake calculated.

It is **not validated**. Test CI #240 (`38063916945`) failed on the assessed SHA: 99 tests, 90 passed, 9 failed, 0 skipped. Both normal and test-inclusive typechecks passed. Supply Chain Security and Factor Provenance Gate passed on the same SHA, but they do not replace the application test suite.

## Current failures

1. **PostgreSQL bootstrap:** Data Intake DDL was joined with a literal backslash-n and without statement terminators. PostgreSQL reports a syntax error before `carbon_ledger_app` is created. Later RLS/grant/idempotency/recovery failures involving that role are at least partly cascading setup failures.
2. **Concurrent append:** the bounded sequence/head assertion reports `0 !== 1`. It must be rerun after valid database setup; the assertion must not be weakened.
3. **ESM runtime exports:** the CBAM integration test cannot link the named `InMemoryDataIntakePersistence` export under Node 22/tsx. Earlier attempts also failed for `DataIntakeService` and `DATA_INTAKE_POSTGRES_SCHEMA`. Typecheck success does not prove runtime module linking.
4. **Recovery:** the PostgreSQL recovery test did not reach the injected `simulated final intake persistence failure`; the missing application role prevented the intended scenario. Restart recovery therefore remains unproven.

## Implemented work

- `PostgresDataIntakePersistence` with JSONB records, tenant scoping, unique tenant/idempotency key, request hash, RLS, leases and claim tokens.
- Service claim-token propagation and recovery validation of tenant, actor, methodology, factor snapshot, activity dimensions and evidence before calculating a recovered intake.
- Domain functions moved to `packages/data-intake/src/model.ts` to reduce the service/index dependency cycle.
- `tsconfig.tests.json` and `npm run typecheck:tests`, exposing and correcting previously hidden test-fixture/type errors.
- Factor gating preserves explicit `not_ready` and `blocked` states and prevents those paths from appending to the ledger.
- Full `npm test` integration glob retained; PostgreSQL integration tests are not optional.

## Historical evidence

- CI #178: 83/83 PostgreSQL ledger tests passed on SHA `502fe9d`; valid historical evidence only.
- CI #183: 85/85 passed on `f7ec3f5`; historical factor-gating evidence.
- CI #226: 98/98 passed on `3a02d2b`; historical baseline before durable Data Intake.
- CI #227: 98/98 passed on `74f5e00`; historical documentation-head validation.
- CI #240 / Test CI `38063916945`: current assessed candidate failed, 90/99 passed.

Historical green runs must never be treated as validation of the newer durable-intake implementation.

## Stress/concurrency boundary

The repository has a **bounded concurrent append race** and historical PostgreSQL evidence for it. This is not a sustained load, soak, throughput/latency, multi-process lease/fencing or production-scale stress test. The current bounded assertion is itself unresolved and must be rerun after bootstrap repair.

## Safe next steps

1. Repair Data Intake SQL bootstrap using valid SQL statement boundaries; keep `ON_ERROR_STOP=1` and fail fast.
2. Assert application-role existence, non-ownership, `NOSUPERUSER`, `NOBYPASSRLS` and the exact grant matrix before dependent tests run. Do not use a superuser shortcut or weaken RLS.
3. Add a minimal Node 22/tsx consumer smoke test and establish one consistent ESM/TypeScript resolution strategy; avoid speculative default/namespace fallbacks.
4. Rerun RLS, cross-tenant, grant, append-only, tenant-head, rollback, idempotency, pool-reuse, concurrency and bigint cases after preflight succeeds.
5. Prove recovery by committing the ledger event, failing only the final intake save, closing the original pool, starting a fresh process/worker, retrying the same tenant/key/request and proving one identical ledger event plus the persisted factor snapshot. Test conflicting identity/payload, expired lease and stale fencing token.
6. Accept only a single SHA where `npm ci`, normal typecheck, `typecheck:tests`, full `npm test`, Supply Chain Security and Factor Provenance Gate all pass.
7. Keep independent security review, production role/schema verification, repository security administration, real authentication/authorization, GDPR/data-flow/residency evidence, backup/restore and privacy/legal review as separate release gates.

## Legal and integrity boundary

The project records EU GDPR / UK GDPR and ICO guidance, OWASP ASVS 5.0.0, Digital Catapult CCCA recommendations, Novisto fit-gap guidance, KPMG GHG reporting guidance, King's College methodology, source/licence provenance controls and ADR-001 regulatory/calculation separation. These are governance requirements and fit-gap references, not compliance attestations.

ADEME Base Carbone V23.6 and UK DESNZ 2026 candidate factors remain blocked until exact official artifacts, rows/values, licences and hashes are verified. No hash is fabricated and redistribution remains disabled.

No production readiness, legal compliance, GDPR compliance, residency commitment, tamper-proof-storage claim or independent security certification is implied by CI results.

## Decision

**Durable Data Intake PostgreSQL persistence: IMPLEMENTED — UNVERIFIED / REWORK REQUIRED.**  
**Overall production readiness: NOT READY.**  
PR #21 remains draft/open/unmerged and Issue #27 remains open. No production migration or deployment is authorised.