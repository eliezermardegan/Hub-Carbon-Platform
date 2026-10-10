# Technical hardening status

Date: 2026-10-09
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
| Real PostgreSQL integration suite | **TESTED — EVIDENCE RECORDED** | CI #178 on exact head `502fe9dfd6dafb04f4850d1bd36795c45cf96462` passed `npm ci`, `npm run typecheck`, and `npm test` against disposable PostgreSQL 16.15: 83 passed, 0 failed, 0 skipped. |

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

No claim of GDPR compliance or EU-only residency is made. The repository does not currently provide enough infrastructure evidence to map actual database replicas, object storage, queues, logs, monitoring, OCR/AI processors, backups, support tooling, retention, deletion and international transfers. This requires deployment-specific evidence and should be completed before enterprise production claims.

## Carbon calculation and provenance

The factor registry now requires source/version/legal basis/artifact SHA-256/retrieval/geography/units/transformation/evidence provenance for production factors. Official ADEME Base Carbone V23.6 and UK DESNZ 2026 examples are preserved as explicit test fixtures under `tests/fixtures/factors/` and are not treated as production factors.

The ledger stores factor snapshots, methodology version and evidence references. The remaining traceability work is to map actual intake/document hashes and extraction/import records end-to-end.

## Data intake / integrations

The inspected repository does not provide evidence sufficient to call ERP, procurement, utility, fleet, invoice, OCR or AI integrations operational. These remain implementation/review work and are not described as complete.

## Regulatory engine

The repository architecture keeps regulatory rules separate from deterministic carbon calculations. `docs/architecture/ADR-001-regulatory-boundary.md` remains the governing boundary. No broad claim of complete CBAM, UK CBAM, EU ETS, CSRD/ESRS or other regulatory implementation is made.

## Infrastructure / recovery

Migration rollback, encrypted backups, PITR, restore tests, RPO/RTO, monitoring and production change approvals require deployment evidence. They are not claimed as implemented by this branch.

## Third-party licensing

The existing legal inventory and CI controls are retained. No new third-party runtime dependency was added in this tranche. Missing or ambiguous licence evidence remains a blocker for importing external code or datasets.

## Deployment readiness

**Not production-ready.** The branch contains meaningful P0 ledger hardening and the specified adapter/database scenarios pass against disposable PostgreSQL 16.15 CI. Independent security review, target-deployment role/RLS verification, repository security administration (issues #22/#23), authentication/authorization deployment evidence, GDPR/data-residency mapping, backup/restore evidence and broader integration/regulatory review remain outstanding.

No merge, deployment, production migration, or production database access is authorized by this work.
