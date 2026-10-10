# Data Intake Retry, Idempotency and API Authorization Review

- **Date:** 2026-10-10
- **Status:** API boundary and tenant-isolation tests PASS on `aae7744dc548d61a117f84ade07d6d6dee8b895f`; production identity, role/object authorization and staging grants/RLS remain unverified
- **Branch:** hardening/ip-supply-chain-governance
- **Related:** [PR #21](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21), [Issue #27](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27)

## 1. Idempotency contract

The intake idempotency scope is tenant + idempotency key. A canonical semantic payload fingerprint includes the trusted tenant, actor and methodology version. Generated activity ID and derived status/factor references are excluded; these are not caller-authoritative request fields.

- Same key + same semantic payload + same trusted identity: return the original terminal activity or resume a recoverable attempt.
- Same key + different payload or trusted identity: reject as conflict before ledger append.
- Same key while a request is processing in the current process: reject as busy; callers may retry.
- not_ready: retryable using the same payload, for example after a previously unavailable factor becomes available.
- calculated: terminal replay returns the existing activity without a second append.
- blocked: terminal replay remains rejected; use a controlled, separately reviewed re-import/version process after source eligibility changes.

The original activity ID is retained across retries and used as the ledger append idempotency key.

## 2. Failure and recovery semantics

The service records failed where possible if an operation fails after a claim. If ledger append succeeded but final intake persistence failed, retry reuses the same activity ID and depends on the ledger persistence layer's own tenant-scoped idempotency constraint to return the existing event rather than append a duplicate.

The regression test simulates this ordering and asserts one unique ledger write across two append attempts. **It currently uses an idempotent fake ledger, not a live PostgreSQL ledger.** A PostgreSQL-backed integration test must force failure after committed ledger append, restart the service/process, retry the same request and assert the event count/head/audit remain consistent.

## 3. Concurrency and durability boundary

Current claim and in-flight coordination live in InMemoryDataIntakePersistence and an in-process set. This provides only single-process test semantics. It is not durable across restarts and does not coordinate multiple workers/instances. Production acceptance requires a durable intake adapter and database-enforced uniqueness on tenant + idempotency key, stored request hash, state/lease expiry, atomic claim/reclaim, actor/methodology binding, and tests for competing workers and stale claims.

Do not claim a distributed transaction between intake storage and Carbon Ledger. Recovery relies on stable request identity and the ledger's independent idempotency guard.

## 4. API trust boundary

The API previously accepted x-tenant-id and x-actor-id as if they were trusted identity. It now requires an injected authenticate(req) dependency, passes only that returned tenant/actor/methodology context to the intake service, rejects missing/failed authentication, and ignores caller-supplied identity headers. Request bodies are limited to 1 MiB; malformed JSON is handled as a client error. Tests cover spoofed headers, trusted-context propagation, health endpoint behavior and malformed JSON.

This change is a hardened API boundary, not a complete authentication implementation. The repository does not evidence a concrete identity provider, validated JWT/session/cookie, MFA, role/permission model, rate limiting, deployment proxy trust configuration or production wiring for authenticate. Until that integration is implemented and reviewed, the API is not production-ready.

## 5. Factor eligibility and untrusted fields

- Caller-supplied factor ID/version are discarded before factor resolution.
- A factor is importable only if status is exactly verified, redistribution is allowed and all required provenance metadata passes validation.
- Draft, deprecated, blocked and malformed-provenance factors fail closed.
- A 64-hex SHA-256 field is only a format check. It does not prove the digest matches the official artifact or row. Exact source bytes, value, units, method, licence and attribution still need independent verification.
- ADEME Base Carbone V23.6 and UK DESNZ 2026 candidates remain blocked; no source hash is fabricated and no production promotion is authorized.

## 6. Evidence and tests added

- Equivalent retries with generated IDs preserve the original activity ID and do not duplicate the ledger event.
- Conflicting payload reuse is rejected.
- Reuse by a different actor is rejected.
- A not_ready activity can be retried after its factor becomes available.
- A simulated post-ledger/pre-intake-persistence failure is recovered by retry without a second unique ledger write.
- Concurrent same-key calls within one process do not both process.
- Blocked/unresolved inputs do not append to the ledger.
- Caller-supplied factor references are not trusted.
- API tests verify caller identity headers are ignored, trusted context is passed, missing identity is rejected, and malformed JSON is handled.
- Factor registry tests require verified status and complete provenance for importability.

Code head 3a02d2b7081b93e9bdd920b7be2db7f396e88745 passed Test CI #226 (98/98), Security #146 and Provenance #141. Documentation head 74f5e00e8cd0aecb484e78ec9f40167f13a02dfb also passed Test CI #227 (98/98), Security #147 and Provenance #142. This review-document update is a subsequent commit and requires its own exact-head checks; the latest run links are maintained in PR #21 and Issue #27.

## 7. Outstanding work

| ID | Work | Status |
|---|---|---|
| DI-01 | Durable intake persistence and unique tenant/key constraint | BLOCKED — no durable intake adapter in repository |
| DI-02 | PostgreSQL integration test for committed ledger append + failed intake persistence + process restart + retry | NOT STARTED |
| DI-03 | Multi-instance claim/lease expiry and competing-worker test | NOT STARTED |
| API-01 | Wire concrete trusted authentication provider/session or token validation | BLOCKED — provider/config not supplied |
| API-02 | Define and test roles/permissions, rate limiting, proxy trust and operational audit | NOT STARTED |
| PRIV-01 | Verify actual deployed regions, processors, retention/deletion and backups | VERIFY — deployment evidence required |
| FACT-01 | Verify exact ADEME and UK DESNZ artifacts/rows/licences and compute hashes from bytes | BLOCKED pending evidence |
| REV-01 | Independent security/privacy review of PR #21 | UNASSIGNED |

## 8. Release rule

PR #21 remains draft and Issue #27 remains open until latest-head CI passes, durable recovery/authentication blockers are either implemented or explicitly accepted by the accountable owner, and an independent reviewer records a decision. Green CI is not production deployment evidence or a legal compliance attestation.


## 9. Latest code-head CI evidence — 2026-10-10

Exact code head 3a02d2b7081b93e9bdd920b7be2db7f396e88745 passed:
- Test CI #226: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541702 — npm ci, typecheck and tests; PostgreSQL 16.15; 98 passed, 0 failed, 0 skipped.
- Supply Chain Security #146: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541923 — PASS.
- Factor Provenance Gate #141: https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541687 — PASS.

The ledger domain now compares semantic payload fingerprints even when an event is already present in its in-memory idempotency cache. Data Intake's partial-failure recovery checks for a committed ledger event before re-resolving the factor and verifies identity, methodology, factor snapshot, activity dimensions and evidence IDs. Tests also ensure untrusted factor IDs are removed before claim creation.

The above evidence applies to the code head, not the documentation commit created from it. Fresh checks are required for the resulting documentation head. Durable intake persistence, a real PostgreSQL process-restart recovery test, and production authentication/authorization/MFA remain outstanding.


## 10. Documentation evidence update — 2026-10-10

The review document and related evidence files at head 74f5e00e8cd0aecb484e78ec9f40167f13a02dfb passed [Test CI #227](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058675707) (98/98, PostgreSQL 16.15), [Supply Chain Security #147](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058675686) and [Factor Provenance Gate #142](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058675454). This subsequent evidence-register commit requires its own fresh checks. PR #21 and Issue #27 carry the latest exact-head links.


## 11. End-to-end authorization review refresh — 2026-10-10

The earlier sections are retained as historical reasoning for the initial iteration. The executable surface and acceptance status have since advanced: durable PostgreSQL Data Intake persistence and process-boundary recovery tests exist, while production authentication remains an injected dependency rather than a wired identity implementation.

See the authoritative [End-to-End Authorization and Tenant-Isolation Review](./END_TO_END_AUTHORIZATION_AND_TENANT_ISOLATION.md) for the current surface matrix and test plan. Key gaps remain real identity/session/token validation, MFA/SSO/revocation, role/object-level authorization, deployed role/pool configuration, logging/monitoring integration, and executable worker/file/export handlers. The new negative tests must pass at the exact current SHA before this review is marked tested.


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
