# Technical hardening status

Date: 2026-10-10
Branch: `hardening/ip-supply-chain-governance`
PR: #21

## Status legend

- **Implemented** — code/configuration exists in this branch.
- **Tested** — executed successfully in an available environment.
- **Documented only** — requirement is recorded, but no implementation evidence exists yet.
- **Blocked** — implementation or verification requires an unavailable prerequisite.
- **Deferred** — intentionally outside the current focused tranche.

## P0 ledger

| Control | Status | Evidence |
|---|---|---|
| Trusted server-side tenant context | Implemented | `packages/carbon-ledger/src/postgres.ts` requires `TrustedTenantContextProvider`. |
| Transaction-local tenant context | Implemented | Same adapter sets and verifies tenant context after `BEGIN` on the leased connection. |
| Pooled-connection isolation | Implemented by design | Tenant state is transaction-local; no session tenant state is retained. CI #178 tests a single-connection pool alternating trusted tenant contexts; target deployment configuration still needs environment-specific verification. |
| Fail-closed tenant mismatch | Implemented + unit tested | Tenant arguments are checked against trusted context. |
| RLS + FORCE RLS | Implemented in schema | `packages/carbon-ledger/src/persistence.ts`. |
| Application role cannot bypass RLS | Verified in disposable CI schema; deployment verification pending | CI #173 and #178 assert non-superuser, NOBYPASSRLS, non-ownership, and effective grants; repeat against the actual deployment role/schema before production. |
| Atomic append/head/audit transaction | Implemented | PostgreSQL adapter performs all writes in one transaction with rollback on failure. |
| Append-only historical events | Implemented in schema | Database triggers reject update/delete. |
| Idempotency equivalent payload | Implemented | Canonical semantic payload hash is stored and compared. |
| Idempotency conflicting payload | Implemented | Conflicting reuse is rejected. |
| PostgreSQL bigint handling | Implemented | Adapter uses `BigInt` and safe-integer bounds. |
| Concurrent sequence allocation | Implemented + integration tested | CI #178 exercises competing concurrent appends and checks tenant sequence/head consistency in PostgreSQL 16.15; this is a bounded race test, not a sustained load/soak benchmark. |
| Hash-chain verification | Existing implementation + tests | `packages/carbon-ledger/src/domain.ts` and ledger tests. |
| Hash-chain as tamper-proof storage | Correctly not claimed | Architecture documentation explicitly limits the claim. |
| Real PostgreSQL integration suite | TESTED — EVIDENCE RECORDED on latest candidate; independent review pending | Test CI #248 on SHA 86f98d6f280b6bb83c5cb332c6a3a502d90a86a0 passed on PostgreSQL 16.15: 100 passed, 0 failed, 0 skipped. Canonical Data Intake schema setup, role/grant assertions, RLS, bounded concurrency, idempotency and true OS process-boundary recovery and stale fencing-token rejection passed in Test CI #250. Issue #28 technical acceptance criteria met. |

## Required P0 integration scenarios

The required adapter/database scenarios are exercised in disposable PostgreSQL CI (CI #173 and revalidated on synchronized head in CI #178): cross-tenant read/write isolation, missing/invalid tenant context, pooled-connection reuse, concurrent append/head consistency, atomic rollback, equivalent/conflicting idempotency, inconsistent audit references, effective role grants/RLS, hash-chain tamper detection, and large-sequence handling. This closes the test-execution gap, not the overall P0/release gate: independent security review and target-environment checks remain pending. Concurrency evidence is a bounded race test, not a sustained load/soak benchmark.

## Security baseline

| Area | Status | Current evidence / gap |
|---|---|---|
| Dependency audit | Implemented in CI | `.github/workflows/security.yml`; previous observed run reported one low-severity npm advisory and the configured gate is high severity. |
| Dependency review/license gate | Implemented in CI | `.github/workflows/dependency-review.yml`. |
| CycloneDX SBOM | Implemented in CI | `.github/workflows/dependency-review.yml`. |
| Dependabot | Implemented | `.github/dependabot.yml`. |
| Secret scanning/push protection | **Blocked / admin action** | Tracked in issue #23; connector cannot change repository security administration. |
| Protected main branch | **Blocked / admin action** | Tracked in issue #22; declarative ruleset exists but is not claimed active. |
| Authentication/MFA | Documented only / gap | No complete application authentication layer was identified in the inspected repository surface. Deployment-specific identity integration is required. |
| Authorization/object-level access | Partial | Ledger adapter now requires trusted tenant context; complete API/background/file/export review remains. |
| Security headers/rate limiting | Deferred | No applicable web/API deployment surface was identified in this tranche. Must be assessed when that surface is present. |
| Secrets management/rotation | Documented only | No production secret store is present in this repository. |
| Encryption at rest/backups | Documented only | Infrastructure is outside this repository's current implementation surface. |

## GDPR / data residency

No claim of GDPR compliance or EU-only residency is made. The repository does not yet evidence actual database replicas, object storage, queues, logs, monitoring, OCR/AI processors, backups, support tooling, retention, deletion or international transfers. The new [Data Protection, Data Flow and Residency Assessment](./DATA_PROTECTION_AND_RESIDENCY_ASSESSMENT.md) provides a system inventory, processing record, action register and acceptance criteria. It cites the official EU GDPR text and current ICO guidance. The assessment/tracker/status content at head `e3c84a0f804a4bdb469c10c49457e059fd191187` passed [CI #189](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38056966764) (85 passed, 0 failed, 0 skipped), [Supply Chain Security #109](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38056966538) and [Factor Provenance Gate #104](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38056966543). Every deployment fact remains marked for verification until supported by access-controlled evidence. Owner and independent privacy/legal reviewer are unassigned; do not make external compliance/residency claims meanwhile.

## Carbon calculation and provenance

The factor registry now requires source/version/legal basis/artifact SHA-256/retrieval/geography/units/transformation/evidence provenance for production factors. Official ADEME Base Carbone V23.6 and UK DESNZ 2026 examples are preserved as explicit test fixtures under `tests/fixtures/factors/` and are not treated as production factors.

The ledger stores factor snapshots, methodology version and evidence references. The remaining traceability work is to map actual intake/document hashes and extraction/import records end-to-end.

## Data intake / integrations

The inspected repository does not provide evidence sufficient to call ERP, procurement, utility, fleet, invoice, OCR or AI integrations operational. These remain implementation/review work and are not described as complete. A follow-up in `packages/data-intake/src/service.ts` now persists unresolved inputs as `not_ready` and non-importable factors as `blocked` before rejecting; regression tests assert no ledger append for those cases. Code commits `40d804d` and `f7ec3f5`; latest CI is pending.

## Regulatory engine

The repository architecture keeps regulatory rules separate from deterministic carbon calculations. `docs/architecture/ADR-001-regulatory-boundary.md` remains the governing boundary. No broad claim of complete CBAM, UK CBAM, EU ETS, CSRD/ESRS or other regulatory implementation is made.

## Infrastructure / recovery

Migration rollback, encrypted backups, PITR, restore tests, RPO/RTO, monitoring and production change approvals require deployment evidence. They are not claimed as implemented by this branch.

## Third-party licensing

The existing legal inventory and CI controls are retained. No new third-party runtime dependency was added in this tranche. Missing or ambiguous licence evidence remains a blocker for importing external code or datasets.

## Deployment readiness

**Not production-ready.** The branch contains meaningful P0 ledger hardening and the specified adapter/database scenarios pass against disposable PostgreSQL 16.15 CI. Independent security review, target-deployment role/RLS verification, repository security administration (issues #22/#23), authentication/authorization deployment evidence, GDPR/data-residency mapping, backup/restore evidence and broader integration/regulatory review remain outstanding.

No merge, deployment, production migration, or production database access is authorized by this work.


## Data-intake factor gate follow-up — 2026-10-10

- Finding: the service previously saved activity before resolving factor eligibility, so a blocked factor could leave an activity with a stale `ready` status after rejection.
- Fix: unresolved/no-factor/missing-quantity paths now persist `not_ready`; blocked-factor path records factor ID/version and `blocked` before throwing; only eligible factors reach calculation and ledger append.
- Regression coverage: `packages/data-intake/src/service.test.ts` tests that unresolved and blocked paths persist their explicit state and perform zero ledger appends.
- Commits: `40d804d070aaaf32046a799857b46964ac052aef`, `f7ec3f503d3ab56b1d4182d8840f9b68c1c62862`.
- Status: implementation committed; latest-head CI pending. Retry/idempotency and persistence-versus-ledger failure recovery remain follow-up design items. This is not evidence of a distributed transaction.


## Data protection / residency workstream — 2026-10-10

- Created `docs/security/DATA_PROTECTION_AND_RESIDENCY_ASSESSMENT.md` with a system/data-flow inventory, processing-record fields, transfer and DPIA screening checklist, evidence register, ownership and acceptance criteria.
- Official references: EU GDPR (EUR-Lex), ICO international transfers guidance (updated 15 January 2026) and ICO DPIA guidance. The current UK terminology/guidance must be confirmed for the specific transfer and date by a privacy/legal owner.
- This is an assessment framework, not a completed DPIA or legal determination. Actual deployment locations, vendors, contracts and retention/deletion behavior remain unverified. This status-document refresh is documentation-only and triggers a new CI run for its resulting commit.


## Latest intake/API/factor validation — 2026-10-10

The implementation head 3a02d2b7081b93e9bdd920b7be2db7f396e88745 passed:
- Test CI #226: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541702 — PostgreSQL 16.15; 98 passed, 0 failed, 0 skipped.
- Supply Chain Security #146: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541923 — PASS.
- Factor Provenance Gate #141: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541687 — PASS.

These checks cover the code head, not this subsequent documentation refresh. Durable intake claims, cross-process failure recovery and concrete production authentication remain blockers; API authorization and data-residency deployment evidence are not complete.


## Durable PostgreSQL Data Intake follow-up — validation passed, process-boundary recovery open (2026-10-10)

Latest implementation SHA: 4d5659f36b9d6702cd2381484fef474bf8635438
Status: **TESTED — EVIDENCE RECORDED** for the current PostgreSQL integration suite; independent review pending.

- [Test CI #248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157): **100 passed, 0 failed, 0 skipped**. npm ci, normal typecheck, typecheck:tests and npm test all passed under Node.js 22 against disposable PostgreSQL 16.15.
- [Supply Chain Security #168](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164): PASS on the same SHA.
- [Factor Provenance Gate #163](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111): PASS on the same SHA.

The SQL issue was fixed by using valid statement boundaries and applying the adapter's canonical DATA_INTAKE_POSTGRES_SCHEMA in the integration test instead of duplicated DDL. The Node 22/tsx ESM issue was resolved for the CBAM test using a namespace import and guarded named/default-export resolution.

The full suite includes RLS and least-privilege application-role checks, bounded concurrent append, idempotency and the Data Intake recovery scenario. Test #46 passed. It recreates pools/adapters/service in the same Node process; it does not yet simulate a genuine OS process exit/relaunch or retry in a separately started worker. Track that remaining criterion in [Issue #28](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/28).

A green CI result is not production approval or legal/security certification. Independent security review, target-environment database-role verification, real auth/authz/MFA, data-protection/residency/retention/deletion evidence, backup/restore, and privacy/legal review remain separate release gates. ADEME Base Carbone V23.6 and UK DESNZ 2026 factor candidates remain blocked until exact source artifacts, rows/values, licence/legal basis and hashes are verified.

PR #21 remains draft/open/unmerged; Issue #27 remains open pending independent review and the project owner's readiness decision. Issue #28 technical acceptance criteria were met on SHA `86f98d6f280b6bb83c5cb332c6a3a502d90a86a0` and the issue is being closed as completed; independent review remains a separate gate.


## True process-boundary recovery — verified on 2026-10-10

Latest implementation SHA: `86f98d6f280b6bb83c5cb332c6a3a502d90a86a0`.

- [Test CI #250](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658097): **101 passed, 0 failed, 0 skipped**. `npm ci`, normal typecheck, test-inclusive typecheck and full npm test passed against PostgreSQL 16.15 / Node.js 22.
- [Supply Chain Security #170](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658173): PASS on the same SHA.
- [Factor Provenance Gate #165](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658076): PASS on the same SHA.
- Test #46 starts a separate worker process for the injected final-save failure, exits it, then starts another OS process for recovery. It asserts stable activity/event identity and hash, one ledger event, one intake activity, persisted factor snapshot, and no factor re-resolution.
- Test #47 starts a process that establishes a durable claim and exits without releasing it, waits beyond the one-second test lease, then starts another process. The new claimant reclaims the lease; the prior fencing token is rejected; only the current token can persist the final state.
- No RLS, least-privilege, idempotency, calculation, factor-gating or provenance assertion was weakened.

Issue #28's technical acceptance criteria are now met for this test environment and can be closed as completed. Independent security review, target-environment verification, privacy/legal assessment and production readiness remain separate open gates. This test does not constitute a sustained load/soak campaign or production authorisation.
