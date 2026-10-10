# Data Intake Persistence Status Addendum — 2026-10-10

**Latest validated implementation SHA:** 86f98d6f280b6bb83c5cb332c6a3a502d90a86a0
**Test CI:** [#248 / run 38067395157](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395157) — **PASS: 100/100, 0 failures, 0 skipped**  
**Supply Chain Security:** [#168 / run 38067395164](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395164) — PASS  
**Factor Provenance Gate:** [#163 / run 38067395111](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38067395111) — PASS  
**PR:** #21 — OPEN / DRAFT / UNMERGED  
**Issue #27:** OPEN pending independent review/readiness decision  
**Issue #28:** OPEN for true process/worker-boundary recovery

## 1. Current decision

The durable PostgreSQL Data Intake implementation is **TESTED — EVIDENCE RECORDED** on the exact SHA above for the current integration suite. It is not a production-ready or legally compliant status. One technical criterion remains: a fresh OS process or independent worker boundary.

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

## 5. Remaining technical criterion

Issue #28 remains open until a test kills/relaunches the process or delegates retry to a freshly started independent worker. It must commit the ledger event, inject failure at final intake persistence, establish durable failure state, restart across a real process boundary, retry the same tenant/key/request/actor/methodology, and verify one event only with identical event ID/hash and preserved factor snapshot. Add expired-lease and stale-fencing-token races, and conflict cases for payload/identity.

Test CI #250 now satisfies this criterion with separate OS processes and verifies expired-owner write rejection before reclaim, lease expiry plus stale fencing-token rejection. This does not constitute sustained load/soak or production-scale multi-process stress testing. The bounded concurrency test is not a sustained load/soak/throughput or multi-process stress campaign.

## 6. Legal, calculation integrity and release boundaries

The project records EU GDPR and UK GDPR / DPA 2018 with ICO guidance, OWASP ASVS 5.0.0, Digital Catapult CCCA recommendations, Novisto/KPMG/King's methodology fit-gaps, ADR-001 regulatory/calculation separation and source/licence provenance controls. These references are governance requirements and fit-gap work items, not legal opinions or certification claims.

ADEME Base Carbone V23.6 and UK DESNZ 2026 candidates remain blocked until exact official artifacts, row/value, units, licence/legal basis and hashes are verified. No source hash was fabricated and redistribution remains disabled.

Passing CI does not establish production authentication/authorization/MFA, deployed EU/UK data residency, retention/deletion behavior, backup/restore, independent security review, legal compliance or production authorization.

PR #21 remains draft/open/unmerged. Issue #27 remains open pending independent review and formal readiness decision. Issue #28 remains open for process/worker-boundary recovery.


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
