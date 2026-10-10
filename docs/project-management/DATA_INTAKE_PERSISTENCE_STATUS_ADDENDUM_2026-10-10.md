# Data Intake Persistence Status Addendum — 2026-10-10

**Latest overall CI-verified SHA:** `aae7744dc548d61a117f84ade07d6d6dee8b895f` (108/108 + SQL audit pass in disposable CI)  
**Data Intake process-boundary recovery evidence SHA:** `7168f513a203dc78d742cf42c70cb4e3fcaca6c9`  
**Test CI:** [#248 / run 38067395157](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) — **PASS: 100/100, 0 failures, 0 skipped**  
**Supply Chain Security:** [#168 / run 38067395164](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164) — PASS  
**Factor Provenance Gate:** [#163 / run 38067395111](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111) — PASS  
**PR:** #21 — OPEN / DRAFT / UNMERGED  
**Issue #27:** OPEN pending independent review/readiness decision  
**Issue #28:** CLOSED — process-boundary recovery and strict lease-expiry fencing verified  
**Issue #29:** OPEN — staging privileges/RLS audit pending

## 1. Current decision

The durable PostgreSQL Data Intake implementation is **TESTED — EVIDENCE RECORDED** on the exact SHA above for the current integration suite. It is not a production-ready or legally compliant status. Fresh-OS-process recovery and strict lease-expiry/fencing criteria were subsequently satisfied by bounded CI tests #250 and #252 (details below); staging/deployment verification, independent review, sustained load/soak testing and production authorization remain separate gates.

## 2. Verified implementation and test result

- PostgreSQL-backed Data Intake persistence with JSONB records.
- Tenant + idempotency-key uniqueness and canonical request fingerprinting.
- Transaction-local tenant context, RLS/FORCE RLS, lease expiry and claim/fencing tokens.
- Recovery lookup for an event committed before an intake final-save failure; validation of tenant, actor, methodology, factor snapshot, dimensions and evidence before accepting recovered calculated state.
- The integration test uses canonical DATA_INTAKE_POSTGRES_SCHEMA rather than duplicated Data Intake DDL.
- SQL statement boundaries are corrected without weakening ON_ERROR_STOP=1, RLS policies or grant assertions.
- CBAM test uses guarded ESM namespace/default-export resolution under Node 22/tsx; it fails clearly if the expected constructor is missing.
- Full test command includes integration tests; normal and test-inclusive typechecks pass.

## 3. Exact-head CI results

| Workflow | Result | What it demonstrates |
|---|---|---|
| [Test CI #248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) | 100 passed, 0 failed, 0 skipped | Full Node 22 / PostgreSQL 16.15 test suite, including tenant/RLS/grants, bounded concurrency, idempotency and recovery scenario. |
| [Supply Chain Security #168](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164) | PASS | Supply-chain workflow on the exact same SHA. |
| [Factor Provenance Gate #163](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111) | PASS | Provenance gate on the exact same SHA. |

All three workflows ran against exactly 7168f513a203dc78d742cf42c70cb4e3fcaca6c9. The test log reports 100 tests, 100 passed, 0 failed, 0 skipped; test #46 (“Data Intake recovers the committed PostgreSQL ledger event after intake save failure and service restart”) passed.

## 4. Root causes and corrections

### PostgreSQL bootstrap
Earlier Data Intake DDL used a literal backslash-n separator and no proper SQL statement boundaries. PostgreSQL aborted before carbon_ledger_app creation. The correction uses proper SQL boundaries and applies the canonical schema exported by the Data Intake adapter. The subsequent missing-role cluster and bounded concurrent head assertion cleared without weakening security expectations.

### Node 22 / tsx ESM contract
The CBAM test could not statically link the named InMemoryDataIntakePersistence export from the runtime module surface. A guarded module-namespace resolver now checks named and default-wrapped exports, and the full suite passes.

### Iterations
- [#245](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38066959913): 90/99, failed SQL bootstrap cluster plus ESM.
- [#246](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067325288): 98/99, SQL failure cluster cleared, ESM remained.
- [#247](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067344626): 100/100 after ESM resolution.
- [#248](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157): 100/100 after canonical schema reuse; all three workflows passed on the same SHA.

## 5. Process-boundary recovery criteria — satisfied in CI; residual limitations

Issue #28's process-boundary recovery acceptance criteria are satisfied in the disposable CI environment: Test CI #250 exercises recovery across separate OS processes, and Test CI #252 verifies expiry/fencing behavior, including rejection of an expired holder before reclaim and stale-token rejection. The tests cover a committed ledger event followed by final intake-save failure, retry with the same tenant/key/request/actor/methodology, single-event identity/hash stability and factor-snapshot preservation. This remains bounded integration evidence, not sustained load/soak, production-scale multi-process stress testing, or deployment verification. Conflict cases for payload/identity and all independent security, staging, privacy/legal and release gates remain distinct.

Test CI #250 now satisfies this criterion with separate OS processes and verifies expired-owner write rejection before reclaim, lease expiry plus stale fencing-token rejection. This does not constitute sustained load/soak or production-scale multi-process stress testing. The bounded concurrency test is not a sustained load/soak/throughput or multi-process stress campaign.

## 6. Legal, calculation integrity and release boundaries

The project records EU GDPR and UK GDPR / DPA 2018 with ICO guidance, OWASP ASVS 5.0.0, Digital Catapult CCCA recommendations, Novisto/KPMG/King's methodology fit-gaps, ADR-001 regulatory/calculation separation and source/licence provenance controls. These references are governance requirements and fit-gap work items, not legal opinions or certification claims.

ADEME Base Carbone V23.6 and UK DESNZ 2026 candidates remain blocked until exact official artifacts, row/value, units, licence/legal basis and hashes are verified. No source hash was fabricated and redistribution remains disabled.

Passing CI does not establish production authentication/authorization/MFA, deployed EU/UK data residency, retention/deletion behavior, backup/restore, independent security review, legal compliance or production authorization.

PR #21 remains draft/open/unmerged. Issue #27 remains open pending independent review and formal readiness decision. Issue #28 is CLOSED — process/worker-boundary recovery and strict lease-expiry fencing were verified in bounded CI tests #250 and #252.


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
