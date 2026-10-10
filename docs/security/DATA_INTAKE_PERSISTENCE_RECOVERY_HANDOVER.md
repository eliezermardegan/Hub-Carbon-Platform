# Data Intake Persistence & Recovery — Engineering Handover

**Status:** TESTED — EVIDENCE RECORDED; independent review pending  
**Review date:** 2026-10-10  
**Repository:** eliezermardegan/Hub-Carbon-Platform  
**Branch:** hardening/ip-supply-chain-governance  
**Latest validated implementation SHA:** 86f98d6f280b6bb83c5cb332c6a3a502d90a86a0
**PR:** [#21 — OPEN / DRAFT / UNMERGED](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21)  
**Tracking issue:** [#27 — OPEN pending independent review/readiness decision](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27)  
**Process-boundary recovery:** passed in Test CI #250; Issue #28 technical acceptance criteria met  
**Production change authorised:** No

## Executive status

The previously failing Data Intake PostgreSQL integration suite now passes on one exact candidate SHA. All three workflows are green on 7168f513a203dc78d742cf42c70cb4e3fcaca6c9:

| Workflow | Run | Result |
|---|---|---|
| Test CI | [#248 / 38067395157](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) | **100 passed, 0 failed, 0 skipped** |
| Supply Chain Security | [#168 / 38067395164](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164) | PASS |
| Factor Provenance Gate | [#163 / 38067395111](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111) | PASS |

Test CI completed on 2026-10-10 with npm ci, normal typecheck, typecheck:tests and npm test passing. The log explicitly reports 100 tests, 100 passed, 0 failed, 0 skipped. The database is disposable PostgreSQL 16.15 in CI.

## What failed and how it was fixed

### 1. PostgreSQL bootstrap SQL

The integration test originally joined DDL statements with a literal backslash-n and lacked statement terminators. PostgreSQL reported a syntax error at a backslash; setup aborted before the carbon_ledger_app role existed. RLS/grant/idempotency/recovery errors referencing the missing role and the concurrent sequence/head assertion were seen while setup was broken.

The fix uses valid SQL boundaries, and the integration test now applies DATA_INTAKE_POSTGRES_SCHEMA from the adapter rather than duplicating DDL in the test. This reduces schema drift and means the integration test exercises the adapter's canonical schema. ON_ERROR_STOP=1 and restrictive application-role grant assertions remain.

### 2. Node 22 / tsx ESM export mismatch

The CBAM test could not statically import InMemoryDataIntakePersistence as a named export in the runtime module shape exposed by Node 22/tsx. Replacing the .js suffix with .ts alone did not solve the issue. The test now imports the module namespace and resolves the named export or default-wrapped export, with an explicit runtime function guard. The full test suite passes with this guard, so missing exports remain a clear failure rather than a silent bypass.

### 3. Test progression

| Run | Result | Diagnosis |
|---|---|---|
| [#245](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38066959913) | 90/99; 9 failures | SQL bootstrap error cluster plus independent ESM import failure. |
| [#246](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067325288) | 98/99; 1 failure | SQL/bootstrap failures cleared; ESM issue remained. |
| [#247](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067344626) | 100/100; 0 failures, 0 skipped | ESM fix brought the complete suite green. |
| [#248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) | 100/100; 0 failures, 0 skipped | Final confirmation after switching to the canonical adapter schema. All three workflows green on SHA 4d5659f36b9d6702cd2381484fef474bf8635438. |

## Implemented persistence and integrity controls in this tranche

- PostgreSQL-backed Data Intake entity persistence with JSONB and tenant-scoped keys.
- Unique tenant/idempotency-key activity claim and canonical request fingerprint.
- Transaction-local tenant context and RLS/FORCE RLS.
- Lease expiry and claim/fencing token propagation.
- Recovery lookup for a ledger event already committed before the intake final-save failure; validation includes tenant, actor, methodology, factor snapshot, activity dimensions and evidence before recovered calculated status is accepted.
- Canonical adapter schema consumed by the real-PostgreSQL integration test rather than duplicated test-only DDL.
- Factor gating keeps unresolved values explicitly not_ready and rejected/non-importable factors blocked; those paths are not silently converted to zero or appended to the ledger.
- Strict test-inclusive typechecking and the full integration-test suite remain in CI.

## What the passing recovery test does and does not prove

Test #46, “Data Intake recovers the committed PostgreSQL ledger event after intake save failure and service restart”, passed. It verifies the injected intake final-save failure after ledger commit and retry using a new pool, adapters and service, with stable event identity/hash and no duplicate ledger event.

**Remaining limitation:** the test reconstructs pools/adapters/service in the same OS process. It does not terminate and relaunch a process or transfer retry to an independently started worker. That is the remaining technical criterion tracked in Issue #28: test persistence and claims across a true process/worker boundary, including lease expiry and stale fencing-token contention. Keep Issue #28 open until that stronger scenario passes.

## Stress/concurrency scope

The bounded concurrent append race passed in #248, together with tenant sequence/head consistency. The suite also passed tenant isolation/RLS, role privilege, append-only, idempotency, rollback, pool reuse and bigint checks.

This is not a sustained stress campaign. No throughput/latency benchmark, soak test, production-scale load test or multi-process lease/fencing stress test is claimed complete. Those remain distinct follow-up work if product service objectives require them.

## Legal, calculation, security and release boundary

The repository incorporates or tracks:
- EU GDPR (Regulation (EU) 2016/679) and UK GDPR / Data Protection Act 2018 with ICO guidance for data-flow, DPIA and international-transfer assessment.
- OWASP ASVS 5.0.0 as a verification framework, not a certification.
- Digital Catapult CCCA recommendations and recorded industry fit-gap work against Novisto, KPMG GHG Reporting Handbook and King's College carbon-accounting methodology.
- ADR-001 separating deterministic Carbon Core calculations from jurisdictional rule selection.
- Source, licence and factor-provenance requirements including exact upstream artifact/version, row/value, geography, units, legal basis/licence, retrieval and hash computed from actual bytes.
- ADEME Base Carbone V23.6 and UK DESNZ 2026 candidates remain blocked until exact official source rows, values, units, licences and hashes are verified. No hash was invented and redistribution remains disabled.

A green CI run is not a legal opinion, GDPR/UK GDPR attestation, source-licence approval, proof of deployed data residency/retention/deletion/backups, independent security certification, or production deployment authorisation.

## Current decision

- Implementation and current CI acceptance: passed on 4d5659f36b9d6702cd2381484fef474bf8635438.
- Process/worker-boundary recovery: OPEN — Issue #28.
- Independent technical/security review and privacy/legal review: pending/unassigned.
- Production readiness: NOT APPROVED.
- PR #21 remains draft/open/unmerged. Issue #27 remains open pending independent review and formal readiness decision. No production migration or deployment is authorised.


## True process-boundary recovery — verified on 2026-10-10

Latest implementation SHA: `86f98d6f280b6bb83c5cb332c6a3a502d90a86a0`.

- [Test CI #250](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658097): **101 passed, 0 failed, 0 skipped**. `npm ci`, normal typecheck, test-inclusive typecheck and full npm test passed against PostgreSQL 16.15 / Node.js 22.
- [Supply Chain Security #170](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658173): PASS on the same SHA.
- [Factor Provenance Gate #165](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658076): PASS on the same SHA.
- Test #46 starts a separate worker process for the injected final-save failure, exits it, then starts another OS process for recovery. It asserts stable activity/event identity and hash, one ledger event, one intake activity, persisted factor snapshot, and no factor re-resolution.
- Test #47 starts a process that establishes a durable claim and exits without releasing it, waits beyond the one-second test lease, then starts another process. The new claimant reclaims the lease; the prior fencing token is rejected; only the current token can persist the final state.
- No RLS, least-privilege, idempotency, calculation, factor-gating or provenance assertion was weakened.

Issue #28's technical acceptance criteria are now met for this test environment and can be closed as completed. Independent security review, target-environment verification, privacy/legal assessment and production readiness remain separate open gates. This test does not constitute a sustained load/soak campaign or production authorisation.


## Lease-expiry fencing invariant — verified 2026-10-10

Implementation SHA: `7168f513a203dc78d742cf42c70cb4e3fcaca6c9`.
- [Test CI #252](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38069001785): **101 passed, 0 failed, 0 skipped**; normal typecheck, test-inclusive typecheck and full npm test passed on Node.js 22 / PostgreSQL 16.15.
- [Supply Chain Security #172](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38069001788): PASS on the same SHA.
- [Factor Provenance Gate #167](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38069001787): PASS on the same SHA.
- Recovery uses two independent OS processes; a separate assertion now rejects writes from an expired owner before a new claimant takes over, then verifies reclaim and stale-token rejection.
- This remains a bounded integration test, not a sustained load/soak or production deployment proof. Independent review, target environment and legal/privacy gates remain open.
