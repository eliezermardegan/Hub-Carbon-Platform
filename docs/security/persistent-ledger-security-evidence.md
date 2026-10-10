# Persistent Carbon Ledger — Security Evidence and Traceability

## 1. Purpose and assurance boundary

This evidence record maps the persistent ledger's security requirements to implementation-level tests and to immutable GitHub revision/workflow identifiers. It is intended for engineering review, internal control evidence, and future audit preparation.

**Scope:** tenant isolation (RLS), least-privilege database grants, append-only records, tenant-head integrity, trusted transaction context, rollback, concurrency, idempotency, audit-reference consistency, hash-chain verification, and PostgreSQL `bigint` handling.

**Environment:** disposable PostgreSQL 16 CI service. The passing CI log reports PostgreSQL 16.15. The test suite rebuilds the test schema, creates/validates the `carbon_ledger_app` role, and uses test fixtures. No production database or production data was accessed.

**Assurance boundary:** GitHub commit SHAs, workflow run IDs, and GitHub-hosted logs provide source/run traceability. This page does not claim a separate cryptographic signing attestation, SLSA provenance statement, independent penetration test, or production-environment certification. The Supply Chain Security and Factor Provenance workflows are recorded separately below.

## Latest candidate acceptance status — 2026-10-10

The latest candidate SHA 86f98d6f280b6bb83c5cb332c6a3a502d90a86a0 passed all three relevant workflows on one identical source revision:

- [Test CI #248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157): PostgreSQL 16.15, 100 passed, 0 failed, 0 skipped.
- [Supply Chain Security #168](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164): PASS.
- [Factor Provenance Gate #163](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111): PASS.

This supersedes prior failure-status notes for the Data Intake SQL bootstrap and ESM fixes. Historical run records below remain immutable and valid only for their pinned commits. The passing suite includes RLS/role grants, append-only controls, bounded concurrent append and the Data Intake recovery test after reinitialising pools/adapters in a single process. True process-boundary recovery and stale fencing-token rejection passed in Test CI #250; Issue #28 technical acceptance criteria met. Independent review, target deployment verification and legal/privacy/release gates remain pending.

## 2. Traceability identifiers

| Evidence item | Immutable/reference identifier | Result |
|---|---|---|
| Code/test revision containing the security matrix | `a3dbcd229f83d78a6e72345268c17b14b3a86b76` | Tested |
| Documentation revision with RLS/grant review | `4e430fdd740f43e4701f1d3809366c8055c546cc` | CI validated |
| Test workflow | [CI #173](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38053103506) | Success; 83 passed, 0 failed |
| Test workflow on documentation revision | [CI #174](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38053302319) | Success: `npm ci`, `npm run typecheck`, `npm test` |
| Supply-chain workflow on documentation revision | [Supply Chain Security #94](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38053302273) | Success |
| Factor-provenance workflow on documentation revision | [Factor Provenance Gate #89](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38053302368) | Success |
| Pull request | [PR #21](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21) | Open, draft at time of evidence capture |
| Control tracker | [Issue #27](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27) | Evidence checklist updated; closure follows CI for this evidence-document revision |

The test run #173 reports `# tests 83`, `# pass 83`, `# fail 0`, and `# skipped 0`. The subsequent test run #174 passed all three named steps on the documentation commit. Run links expose the associated run summaries and logs in GitHub.

## 3. Control-to-test evidence matrix

Test paths and names are listed so reviewers can navigate from a control objective to the executable evidence. Line anchors refer to the code revision above.

| Control ID | Risk / objective | Evidence in source | What the test demonstrates |
|---|---|---|---|
| LEDGER-ENV-01 | Test the real database contract and establish a constrained application role | [PostgreSQL integration prerequisites, lines 79–89](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L79-L89) | A disposable PostgreSQL instance is used; schema is applied; `carbon_ledger_app` is non-superuser, NOBYPASSRLS, does not own ledger tables, lacks public-schema CREATE, and has the expected grants. |
| LEDGER-RLS-01 | Prevent cross-tenant reads and fail closed without trusted tenant context | [RLS filter test, lines 90–101](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L90-L101) | Rows visible to tenant A are scoped to A; absent transaction-local context exposes no events. |
| LEDGER-RLS-02 | Prevent cross-tenant writes and avoid session-context leakage | [Cross-tenant insert test, lines 102–106](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L102-L106); [transaction-local reset test, lines 115–119](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L115-L119) | An insert for another tenant is rejected by RLS; tenant context set locally in a transaction is reset at transaction end. |
| LEDGER-GRANT-01 | Apply least privilege to every ledger table | [Application role setup and privilege matrix, lines 79–89](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L79-L89) | The asserted grant matrix is: events and audit allow SELECT/INSERT only; tenant heads allow SELECT/INSERT/UPDATE; DELETE is denied on all three. The application role is not table owner, superuser, or BYPASSRLS. |
| LEDGER-IMM-01 | Keep event and audit history append-only even for privileged DML | [Privileged mutation-guard test, lines 107–114](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L107-L114); [audit append-only test, lines 136–140](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L136-L140) | UPDATE and DELETE against events/audit are rejected by the database triggers. Separate application-role tests confirm the grants deny writes before a trigger can be invoked. |
| LEDGER-HEAD-01 | Protect tenant-head identity and integrity | [Tenant-head policy test, lines 148–156](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L148-L156); [explicit head test, lines 157–162](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L157-L162) | Cross-tenant mutation does not change another tenant's head; invalid event hashes, tenant reassignment, and deletion are rejected. |
| LEDGER-TX-01 | Keep event and audit writes atomic | [Rollback test, lines 120–126](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L120-L126) | Aborting the transaction leaves neither event nor audit record persisted. |
| LEDGER-SEQ-01 | Enforce tenant-local sequence uniqueness and serialize concurrent appends | [Sequence uniqueness, lines 127–130](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L127-L130); [concurrent append test, lines 206–232](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L206-L232) | Duplicate sequence values are rejected; concurrent appends cannot both commit as sequence 1; the persisted tenant head matches the committed event. |
| LEDGER-IDEM-01 | Prevent duplicate operations and distinguish replay from conflict | [Unique key constraint test, lines 131–135](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L131-L135); [application replay/conflict test, lines 233–257](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L233-L257) | Tenant-scoped idempotency keys are unique; equivalent replay returns the original event; a different payload under the same key is rejected. |
| LEDGER-POOL-01 | Avoid tenant-context leakage on a reused connection | [Pool reuse test, lines 185–205](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L185-L205) | A single-connection pool can alternate trusted tenant contexts without cross-tenant event/audit results. |
| LEDGER-AUD-01 | Reject inconsistent audit identity/references | [Audit persistence tests](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/persistence.test.ts#L70-L96) | Audit writes reject missing event references, references to another tenant, and event/actor mismatches. |
| LEDGER-HASH-01 | Detect changes to event content, chain links, and sequence continuity | [Ledger hash verification tests](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/index.test.ts#L52-L106) | Valid chains verify; tampering, broken previous-hash links, and sequence gaps fail verification. A hash chain is tamper-evident, not proof that an administrator cannot alter storage and all related hashes. |
| LEDGER-BIGINT-01 | Avoid silent JavaScript precision loss for PostgreSQL bigint | [Database bigint test, lines 163–168](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L163-L168); [adapter safe-integer test, lines 258 onward](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L258-L269) | PostgreSQL can persist values above the JavaScript safe-integer threshold; the adapter explicitly rejects unsafe values instead of silently rounding. |
| LEDGER-CTX-01 | Ensure trusted context precedes tenant-scoped SQL | [Tenant-scoped reads](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.integration.test.ts#L169-L184); [context mismatch, invalid identifier, and same-client transaction checks](https://github.com/eliezermardegan/Hub-Carbon-Platform/blob/a3dbcd229f83d78a6e72345268c17b14b3a86b76/packages/carbon-ledger/src/postgres.test.ts#L20-L41) | Tenant mismatch and invalid trusted identifiers fail closed; tenant context is established inside the same transaction/client used for reads/writes. |

## 4. Exact application-role grant matrix

The integration test uses PostgreSQL's `has_table_privilege` to assert the effective table privileges, rather than relying only on the grant statement text.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| `carbon_ledger_events` | Allow | Allow | Deny | Deny |
| `carbon_ledger_audit` | Allow | Allow | Deny | Deny |
| `carbon_ledger_tenant_heads` | Allow | Allow | Allow | Deny |

The tenant-head UPDATE grant is intentionally retained because normal append operations update the head. Database triggers constrain the allowed changes: the tenant ID is immutable, the hash must reference an existing event for that tenant, the head cannot be deleted, and it cannot be cleared while events exist. Tests also run concurrent append and idempotency flows through a pool that adopts the application role, to catch privilege regressions in legitimate writes.

## 5. Reproduction protocol

From a clean checkout at the revision under review:

1. Provision the same disposable PostgreSQL major version used by CI (PostgreSQL 16) and set `PG_INTEGRATION_URL` to that test database only.
2. Install locked dependencies with `npm ci`.
3. Run `npm run typecheck`.
4. Run `npm test`; the integration tests are enabled when `PG_INTEGRATION_URL` is present.
5. Retain the Git commit SHA, GitHub Actions run ID/URL, timestamps, job result, test counts, and database version in the review record. Do not paste connection strings, passwords, access tokens, or other secrets into logs or evidence.

The authoritative result for this evidence set is GitHub Actions, not a local-only run. Workflow links are preserved above so a reviewer can inspect the run summaries and logs.

## 6. Evidence maintenance and limitations

- Treat the Git commit SHA as the source revision identifier; do not cite a branch name alone as immutable evidence.
- Keep links to the original Actions runs rather than copying log excerpts as the only proof.
- Any change to the schema, grants, RLS policies, trigger functions, persistence adapter, or related tests requires a new passing integration run and an update to this matrix.
- Re-validate this document revision in CI before closing the tracker.
- Do not infer production configuration compliance from a disposable test service. Production deployments should independently verify migrations, ownership/grants, RLS enablement/force settings, backups, and operational access paths.
- This record is engineering test evidence. If compliance requires a formal attestation or an independent reviewer, add a separately signed release/provenance artifact and record reviewer identity/approval through the organization's controlled process.


## True process-boundary recovery — verified on 2026-10-10

Latest implementation SHA: `86f98d6f280b6bb83c5cb332c6a3a502d90a86a0`.

- [Test CI #250](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658097): **101 passed, 0 failed, 0 skipped**. `npm ci`, normal typecheck, test-inclusive typecheck and full npm test passed against PostgreSQL 16.15 / Node.js 22.
- [Supply Chain Security #170](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658173): PASS on the same SHA.
- [Factor Provenance Gate #165](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38068658076): PASS on the same SHA.
- Test #46 starts a separate worker process for the injected final-save failure, exits it, then starts another OS process for recovery. It asserts stable activity/event identity and hash, one ledger event, one intake activity, persisted factor snapshot, and no factor re-resolution.
- Test #47 starts a process that establishes a durable claim and exits without releasing it, waits beyond the one-second test lease, then starts another process. The new claimant reclaims the lease; the prior fencing token is rejected; only the current token can persist the final state.
- No RLS, least-privilege, idempotency, calculation, factor-gating or provenance assertion was weakened.

Issue #28's technical acceptance criteria are now met for this test environment and can be closed as completed. Independent security review, target-environment verification, privacy/legal assessment and production readiness remain separate open gates. This test does not constitute a sustained load/soak campaign or production authorisation.
