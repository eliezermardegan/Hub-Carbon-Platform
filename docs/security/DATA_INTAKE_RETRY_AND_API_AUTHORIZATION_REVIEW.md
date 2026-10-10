# Data Intake Retry, Idempotency and API Authorization Review

- **Date:** 2026-10-10
- **Status:** IMPLEMENTED — UNVERIFIED pending latest-head CI; durable production persistence/authentication remain blockers
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
