# End-to-End Authorization and Tenant-Isolation Review

- **Review date:** 2026-10-10
- **Review branch:** \`hardening/ip-supply-chain-governance\`
- **Implementation baseline before this review:** \`6996e3881d0234c6a4f95eb474f4422d520b31c6\`
- **Status:** code/test hardening in progress; production authentication and full product-surface authorization are not implemented/proven by this repository snapshot.
- **Related:** [PR #21](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21), [Issue #27](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27).

## 1. Scope and interpretation

This review follows executable source paths, not placeholder README claims. It covers the Data Intake HTTP server, service tenant binding, PostgreSQL Data Intake/ledger adapters and the available worker/document/export surfaces. The scope is deliberately split between (a) controls verified in code and disposable tests, (b) missing application/infrastructure wiring, and (c) surfaces that do not yet have an executable implementation to test.

A passing test of an injected \`authenticate\` function proves how the API behaves when supplied a context; it does **not** prove that a real JWT, cookie/session, identity provider, MFA, service-account or role policy is wired and correctly configured in a deployed environment.

## 2. Authorization decision matrix

| Surface | Executable path found | Identity / authorization boundary | Negative tests / evidence | Residual gap |
|---|---|---|---|---|
| Public health | \`GET /health\` in \`apps/api/src/intake-api.ts\` | Intentionally public liveness response only; returns no tenant data. | API test asserts success with no identity. | Deployment routing and whether a separate readiness endpoint should be private remain operational decisions. |
| Data Intake create | \`POST /activities\` | Injected \`authenticate(req)\` must return non-empty tenant, actor and methodology. Caller headers do not set identity. Service checks input \`companyId === context.tenantId\` before claim, factor resolution or ledger activity. | API tests cover missing identity, spoofed tenant/actor headers and cross-tenant body rejection using the real service. | Concrete authenticator/provider, token/session validation, issuer/audience/expiry checks, MFA/SSO, revocation, roles and production dependency wiring remain absent/unverified. |
| Error boundary | Same route | Known input/idempotency/eligibility failures map to stable client codes. Unexpected service/auth provider exceptions must not be reflected to clients. | Tests assert internal database/configuration messages do not leak; unexpected auth-provider failure is fail-closed and generic. | Integrate a redacted structured logger and alerting/metrics in deployment. |
| Durable Data Intake records | \`PostgresDataIntakePersistence\` | Server-side tenant provider, transaction-local \`app.tenant_id\`, tenant assertions, RLS + FORCE RLS. Unique tenant/activity and tenant/idempotency keys. | New disposable PostgreSQL tests seed two tenants; assert SELECT isolation, no-context zero-row fail-closed behavior, cross-tenant inserts denied, and adapter mismatch rejected before query. | Verify actual deployed owner, grants, role inheritance, pool wiring, migrations, backups and connection identities. |
| Durable ledger/audit/head | \`PostgresLedgerPersistence\` | Transaction-local tenant context, RLS/FORCE RLS, least-privilege \`carbon_ledger_app\`, append-only triggers and tenant-head integrity. | Existing PostgreSQL tests exercise grants, RLS, append-only behavior, cross-tenant writes, rollback, idempotency and bounded concurrent append. | Independent review plus actual deployment role/schema tests. Hash chain is not claimed to be tamper-proof storage by itself. |
| Background jobs / queues | \`apps/worker/README.md\` only; no executable worker entrypoint found. | No production job authorizer/tenant propagation can be evidenced from a README placeholder. | Not applicable until code exists. | Before implementation: bind tenant/actor to signed job envelope or durable job record; authenticate worker identity, reject mutable caller tenant fields, re-check tenant at read/write boundaries, redact payloads in logs/dead letters, define retry/deduplication/retention. |
| Documents / OCR / extraction | \`packages/document-ai/README.md\` and source-document/evidence domain models; no upload/blob-service endpoint or storage adapter found in inspected TypeScript source paths. | Document/entity models have \`companyId\`; this alone is not object-level access control. | Data Intake RLS test covers persisted records; no executable upload/download route found to test. | Before implementation: tenant-scoped opaque object keys, signed short-lived access, server authorization on every upload/read/delete, MIME/size/content validation, malware/quarantine, immutable hash, delete propagation and processor/subprocessor review. |
| Reports / exports | \`packages/reporting-engine/src/index.ts\` is calculation/reporting logic, not an HTTP export endpoint; no executable export route found. | No downloadable artifact authorization path found in the inspected source tree. | No export handler to test. | Before implementation: tenant scope in query and artifact metadata, requester authorization, re-check at download, expiry, cache key tenant isolation, audit, no public object ACLs, deletion/retention policy. |
| Accounting / ERP integrations | README placeholders in \`integrations/accounting\`, \`integrations/erp\`, and \`integrations/invoices\`. | No active connector/job credential or tenant authorization logic found in this surface. | No executable integration path to test. | Later connector review must cover per-tenant credentials, least privilege, webhook signatures, replay prevention, tenant binding and destination allowlisting. |
| Administration / support / audit export | No dedicated runnable handler surfaced in this repository scan. | Not enough code/config evidence to assess deployed admin authorization. | Not applicable until an executable route/config is supplied. | Identity roster, privilege separation, MFA, break-glass, support access review and audit export controls require deployment evidence. |

## 3. Changes made by this review

- API errors are now mapped to stable codes. Only known client/domain errors are returned as 4xx; unexpected service faults return generic \`500 internal_error\` and are sent to an optional operational callback. Callback consumers must redact secrets/personal data.
- Authentication-provider exceptions return a generic \`503 authentication_unavailable\` and are reported through the same callback; the API still fails closed.
- JSON media type is required; malformed JSON, primitive/array body and oversized input are controlled errors. The 1 MiB bound remains.
- Activity model validation now handles malformed/missing nested objects (data quality/confidence/evidence IDs) as explicit validation errors rather than throwing accidental TypeErrors.
- API tests use the real \`DataIntakeService\` for cross-tenant body rejection and assert no claim/factor-resolution work begins.
- PostgreSQL integration coverage checks tenant isolation for both \`data_intake_records\` and \`data_intake_activities\`, missing-context fail-closed behavior, denied cross-tenant writes and adapter-level mismatch rejection.
- The normal and test-inclusive typechecks and all three workflows must pass on the exact commit before these changes are marked validated.

## 4. Test plan and release gates

### Run automatically in Test CI
1. API missing/failed auth context; caller-supplied tenant/actor spoofing; trusted-identity propagation.
2. Real-service cross-tenant input is rejected before durable claim or factor resolution.
3. Wrong content type; malformed JSON; JSON null/primitive/array; body size ceiling; invalid activity shape.
4. Generic internal exception response does not disclose messages; callback receives the error for redacted observability.
5. Data Intake RLS isolation for records and claim activities; no tenant context returns zero rows; cross-tenant writes are rejected by PostgreSQL.
6. Existing ledger RLS/grant/append-only/idempotency/concurrency/recovery tests and factor-gating golden tests remain in the same suite.

### Requires deployment or product implementation not present here
- Real authentication provider, token/session validation, MFA/SSO, revocation and identity lifecycle.
- Role/permission and per-object authorization model, especially admin/support, jobs, documents, downloads and exports.
- Secret manager, KMS/encryption settings, proxy trust and rate limiting.
- Queue, object store, OCR/AI subprocessor controls, logging/retention and deletion propagation.
- Actual deployment regions, subprocessors, backup/restore and incident response evidence.

## 5. Acceptance boundary

Exact current-head CI evidence is recorded in §6 below. Even when those workflows pass, the conclusion will remain “tested authorization/tenant-isolation controls for the implemented surface,” not “authentication fully implemented”, “GDPR-compliant”, or “production-ready”. Keep PR #21 draft/open and Issue #27 open until independent technical/security review and a project-owner readiness decision are recorded.


## 6. Current-head CI verification — 2026-10-10

Implementation/test head `e65f273f15f0b7667d2c92d632f01f0178891ac2` passed all three required workflows:

- [Test CI #257](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38071325608): **108 passed, 0 failed, 0 skipped**. The run completed `npm ci`, `npm run typecheck`, `npm run typecheck:tests`, and `npm test`.
- [Supply Chain Security #177](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38071325604): PASS on the same SHA.
- [Factor Provenance Gate #172](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38071325609): PASS on the same SHA.

The passing suite includes the added HTTP boundary checks, cross-tenant request rejection before persistence/factor resolution, and PostgreSQL RLS isolation for Data Intake records and activity claims. The test corrections use namespace/default-export resolution for the Node 22/tsx test boundary and parse the actual newline-separated `psql` output; no security assertions were removed.

This proves the tested behavior for the implemented code surface and disposable CI database. It does **not** establish a deployed identity provider/JWT/session/MFA integration, a complete RBAC/object-permission model, authorization for missing worker/document/export routes, or deployment configuration correctness. PR #21 remains draft/open; Issue #27 remains open for environment evidence, independent review and a formal readiness decision.


## 7. PostgreSQL deployment privilege/RLS review — 2026-10-10

### Verified in repository code

- `POSTGRES_SCHEMA` enables and forces RLS on `carbon_ledger_events`, `carbon_ledger_audit`, and `carbon_ledger_tenant_heads`. Their policies use `app.tenant_id` in both `USING` and `WITH CHECK`.
- `DATA_INTAKE_POSTGRES_SCHEMA` enables and forces RLS on `data_intake_records` and `data_intake_activities`; both policies use `app.tenant_id` for row visibility and writes.
- The PostgreSQL integration test creates `carbon_ledger_app` as `NOLOGIN NOSUPERUSER NOBYPASSRLS`, checks ledger table ownership and a subset of effective table privileges, and exercises `SET ROLE` against the CI PostgreSQL service.
- The legacy carbon operational tables in `infra/postgres/migrations/002_data_intake.sql` also enable and force RLS with company-scoped policies.

### Deployment gap

The migrations and current repository do not establish evidence of the actual deployment's login role, role membership options, effective grants, table owners, default privileges, or schema CREATE rights. The CI integration role matrix is not evidence of production's effective authorization. The repository's migrations also do not create a complete, deployment-specific runtime role/grant configuration.

Added a read-only audit script at `infra/postgres/verify_tenant_security.sql`. It fails closed when expected roles, attributes, memberships, protected tables, RLS/ FORCE RLS, tenant policy predicates, ownership, or effective table privileges diverge from the explicit contract. Run it only against a staging/deployment-equivalent database using a trusted audit principal; it does not change roles or grants.

Tracking issue: [#29 — Verify effective PostgreSQL privileges and tenant RLS in deployment](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/29).

### Important threat-model boundary

`app.tenant_id` is a PostgreSQL custom setting. Transaction-local `set_config(..., true)` and RLS protect against missing context and application queries that stay within their trusted tenant boundary. They do not, by themselves, prevent arbitrary SQL execution under the same role from setting another tenant's custom GUC. Parameterized queries, no untrusted SQL execution, constrained DB privileges, and trusted server-side tenant derivation remain necessary. If the threat model includes arbitrary SQL injection with database-role execution, consider a stronger tenant identity mechanism (for example, database-authenticated per-tenant roles or a carefully designed trusted context setter) before production authorization.

### Required before advancing

- Run the read-only audit against the actual staging/deployment-equivalent database and preserve redacted output.
- Verify actual role memberships, grants (including inherited/default privileges), table owners, schema privileges, and migration principal.
- Test absent context, cross-tenant reads/writes, and pooled-connection reuse under the actual runtime role.
- Do not close Issue #29 or declare production authorization ready based on CI alone.
