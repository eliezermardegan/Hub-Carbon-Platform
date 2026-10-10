# Data Intake Persistence & Recovery — Engineering Handover

**Status:** TESTED — EVIDENCE RECORDED; independent review pending  
**Review date:** 2026-10-10  
**Repository:** eliezermardegan/Hub-Carbon-Platform  
**Branch:** hardening/ip-supply-chain-governance  
**Latest overall CI-verified SHA:** `aae7744dc548d61a117f84ade07d6d6dee8b895f` (108/108 + SQL audit pass in disposable CI)  
**Data Intake process-boundary recovery evidence SHA:** `7168f513a203dc78d742cf42c70cb4e3fcaca6c9`
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


## Handover refresh — PostgreSQL privilege/RLS audit — 2026-10-10

**Latest verified code + CI-audit SHA:** `aae7744dc548d61a117f84ade07d6d6dee8b895f`.

- [Test CI / run 38073769246](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073769246): PASS, **108 passed, 0 failed, 0 skipped**; npm ci, typecheck, typecheck:tests, npm test, and the PostgreSQL tenant-security audit all passed. Audit output explicitly says it passed against the disposable CI database.
- [Supply Chain Security / run 38073769170](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073769170): PASS on the same SHA.
- [Factor Provenance Gate / run 38073769169](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073769169): PASS on the same SHA.

**Environment boundary:** this is disposable PostgreSQL 16.15 CI evidence, not a staging/production audit. No staging credentials were provided and no staging database was accessed. Actual deployment roles, memberships, grants, ownership and RLS remain unverified.

### Audit runner failure history

- [Run 38073331913](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073331913), SHA `6ec2f6f`: failed because the runner attempted grants before `carbon_ledger_events` existed; normal suite was skipped.
- [Run 38073755433](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073755433), SHA `b03da7e`, and [run 38073765454](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38073765454), SHA `44ac4eb`: same schema-initialization order defect.
- Corrected on `aae7744`: CI runs `npm test` first, then the CI-only mutating role harness and read-only SQL auditor. No security assertions were removed or weakened.

Expected PostgreSQL ERROR log lines in a passing run are generated by negative tests (RLS-denied writes, permission denials, append-only triggers, duplicate keys and tenant-head guards). Judge them together with the test count and final workflow conclusion.

### Exact role/grant contract checked in disposable CI

- `carbon_ledger_app`: NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS.
- `carbon_ledger_runtime`: LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS; no direct table/column grants. It can explicitly `SET ROLE carbon_ledger_app` via membership with INHERIT FALSE, SET TRUE, ADMIN FALSE.
- App/runtime need schema USAGE but not CREATE; PUBLIC must not have CREATE on public or privileges on protected tables; app/runtime must not own protected tables.
- App role grants: SELECT/INSERT on `carbon_ledger_events` and `carbon_ledger_audit`; SELECT/INSERT/UPDATE on `carbon_ledger_tenant_heads`, `data_intake_records`, and `data_intake_activities`; no UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on append-only event/audit tables. No grants on legacy carbon_* tables until an executable adapter and reviewed access contract exist.
- RLS and FORCE RLS plus reviewed tenant predicates in USING and WITH CHECK are checked for protected tenant tables; auditor checks ownership, role memberships, effective grants, PUBLIC ACLs and default table ACLs.

### Security definitions and limitations

RLS `USING` constrains visible/existing rows; `WITH CHECK` constrains inserted/updated rows. FORCE RLS also subjects table owners to RLS, but not superusers or BYPASSRLS roles. NOLOGIN makes the app role a group role; NOINHERIT prevents automatic privilege inheritance; explicit SET ROLE makes the privilege transition visible. Tenant context is set transaction-locally on the adapter's leased connection and compared with trusted server context.

Threat-model limit: `app.tenant_id` is a PostgreSQL custom setting. RLS does not protect against arbitrary SQL execution under the same DB role that can set a different tenant GUC. Parameterized queries, no untrusted SQL execution, trusted server-side tenant derivation and least privilege remain required.

### Data Intake recovery / API history preserved

- Run #245 / [38066959913](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38066959913), SHA `578cea9`: 90/99; literal `\\n` passed into `psql -c` caused SQL bootstrap failure and cascaded role/concurrency/recovery errors; separate Node 22/tsx ESM export issue remained.
- Run #246 / [38067325288](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067325288), SHA `d8f41b3`: 98/99 after SQL delimiter fix; ESM issue remained.
- Run #247 / [38067344626](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067344626), SHA `c31fcf6`: 100/100 after namespace/default-export resolution.
- Run #248 / [38067395157](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157), SHA `4d5659f`: 100/100 with canonical Data Intake schema in integration tests.
- Run #250 / [38068658097](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658097), SHA `86f98d6`: 101/101; two-process recovery passed.
- Run #252 / [38069001785](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38069001785), SHA `7168f51`: 101/101; expired lease holder rejected before a new claimant, then fencing/reclaim checks passed.
- API/tenant hardening: [Test CI #257 / 38071325608](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38071325608), SHA `e65f273`: 108/108; Supply Chain Security #177 and Factor Provenance Gate #172 also passed. Earlier failures were ESM loader and psql-output parsing defects, not evidence of a successful cross-tenant read.

### Next operator steps

1. Use approved staging access and run only the read-only auditor:
   ```bash
   psql "$PG_AUDIT_URL" -X -v ON_ERROR_STOP=1 \\
     -f infra/postgres/verify_tenant_security.sql
   ```
   Never share the URL/credentials; attach redacted output.
2. Confirm live role attributes/memberships, owner/migration principal, schema CREATE/USAGE, direct/inherited/column/default grants, PUBLIC ACLs, RLS/FORCE and predicates.
3. Under the actual runtime/app roles, test absent tenant context, cross-tenant SELECT/INSERT/UPDATE/DELETE, activity claim, transaction rollback and reused-pool context cleanup with approved synthetic fixtures.
4. Diagnose each deviation and prepare reviewed changes; never run `scripts/verify-postgres-tenant-security.mjs` outside disposable CI and never guess production GRANT/REVOKE commands.
5. Run all three workflows on the same exact SHA after changes; obtain independent security/privacy review.

### Project gate state

- PR #21: OPEN / DRAFT / UNMERGED.
- Issue #27: OPEN — independent review and readiness decision pending.
- Issue #28: CLOSED — process-boundary recovery and strict lease-expiry fencing criteria met in CI.
- Issue #29: OPEN — live staging privileges/RLS audit pending.
- Production changes: NOT AUTHORISED. CI does not prove staging configuration, legal compliance, residency, production readiness or independent certification. Real IdP/JWT/session/MFA/SSO/revocation and role/object authorization remain future work after database deployment verification.
