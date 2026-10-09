# Hub Carbon Platform — Technical Implementation & Security Hardening
## Project charter, execution tracker, evidence register and final handover protocol

**Document type:** Living project-management record  
**Status:** In progress — not approved for production  
**Last status review:** 2026-10-09  
**Repository:** `eliezermardegan/Hub-Carbon-Platform`  
**Working branch:** `hardening/ip-supply-chain-governance`  
**Pull request:** [#21 — chore: add IP, provenance and supply-chain governance](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21)  
**PR state at last review:** Open, draft, unmerged  
**Head recorded at last review:** `1d891110a02eae48a0343ca4d4495eca7e3e4d9c`  
**Production changes authorised:** No  
**Independent validation completed:** No

> This document is the working source of truth for the status of this hardening programme. Update it in the same feature branch as implementation changes. A task is not complete merely because code or documentation has been committed: completion requires the acceptance evidence defined below.

---

## 1. Purpose and delivery objective

Deliver a focused, reviewable and demonstrably secure hardening phase for the existing Hub Carbon Platform architecture: a multi-tenant carbon-accounting SaaS serving organisations in the UK and EU. The platform is expected to support Scope 1, Scope 2 and Scope 3 accounting, evidence traceability, deterministic calculations, versioned emission factors, regulatory extensibility, privacy-conscious processing and enterprise-grade security controls.

The repository and its current architecture remain the source of truth. Improve existing components rather than replacing the architecture wholesale.

The outcome is **a review-ready implementation with reproducible evidence**, not an automatic declaration of production readiness. P0 ledger and tenant-isolation work must meet its real-PostgreSQL definition of done before being marked complete. Remaining security, privacy, licensing, regulatory, integration and operational gaps must stay visible.

## 2. Mandatory operating rules

All contributors and task owners must comply with the following:

1. Inspect relevant code, package scripts, schema, migrations, CI and documentation before changing a component.
2. Work only on the dedicated feature branch or a separately authorised follow-up branch. Never commit this work directly to `main`.
3. Do not merge, deploy, change production infrastructure or run production migrations. These require separate explicit written authorisation.
4. Never install tools or dependencies on production systems.
5. Do not expose credentials, tokens, personal data, customer evidence or secrets in code, fixtures, logs, commits or reports.
6. Report test results only when the command/workflow actually ran and its output or run URL is recorded.
7. Label code, tests, mocks, fixtures, documentation, placeholders and future work accurately; do not imply that mocks prove live infrastructure behaviour.
8. Do not silently alter public interfaces, historical calculations, stored records, or regulatory interpretations.
9. Treat an unknown or ambiguous third-party licence as a blocker. Verify the exact source artefact and the rights relevant to commercial use and redistribution.
10. If a permission, database, environment, official source or other prerequisite is unavailable, record the blocker and required evidence instead of bypassing it.
11. Keep changes small, reviewable and traceable to task IDs in this document.
12. Never treat a hash chain alone as proof of tamper-proof storage or claim legal/regulatory compliance based only on a checklist.

## 3. Priority and status vocabulary

### Priority
- **P0 — Critical:** ledger persistence, tenant isolation, transaction integrity, security/privacy baseline.
- **P1 — Required follow-on:** factor provenance and calculation traceability, intake/integrations, regulatory rules, infrastructure/recovery, licence governance.
- **Release gate:** independent review and explicit approval. It is not a code implementation task and does not authorise deployment.

### Status
Use only these status labels in this tracker:

- **NOT STARTED** — no implementation or review evidence recorded.
- **IN PROGRESS** — active work; acceptance criteria not yet met.
- **BLOCKED** — a named prerequisite prevents safe progress.
- **IMPLEMENTED — UNVERIFIED** — change exists but acceptance tests/evidence have not passed or have not been reviewed.
- **TESTED — EVIDENCE RECORDED** — specified tests were executed successfully; scope and run evidence are recorded. This does not imply production readiness.
- **DOCUMENTED ONLY** — process or intended control is described, but implementation has not been demonstrated.
- **DEFERRED** — explicitly postponed with rationale and owner.
- **COMPLETE — INDEPENDENTLY REVIEWED** — acceptance criteria met, evidence linked, and independent reviewer has approved the task.
- **REJECTED / REWORK REQUIRED** — evidence or review found the task does not meet its acceptance criteria.

Do not use a percentage complete as a substitute for task-level evidence.

## 4. Governance, roles and task ownership

Every task must have a named individual or explicitly assigned role as owner. If no owner has been agreed, record **UNASSIGNED**; do not infer assignment from a commit author.

| Role | Responsibility |
|---|---|
| Task owner / implementer | Makes the scoped change, runs the specified tests, records evidence and updates this tracker before handing off. |
| Technical reviewer | Reviews design, compatibility, failure modes, code quality and acceptance evidence independently of the implementation. |
| Security/privacy reviewer | Reviews applicable threat, tenant isolation, privacy, secrets and operational controls. |
| Data/licensing reviewer | Verifies the exact external source, version, licence, attribution and redistribution rights for factor/data changes. |
| Final task owner | Completes the last scheduled task, checks the full programme against this tracker and submits the formal completion handover below. |
| Project approver | Decides whether the completed work is ready for independent validation or any later release decision. Approval to validate is not approval to merge or deploy. |

A single person may perform more than one role only where the project owner explicitly accepts the arrangement. Critical security and P0 ledger changes require independent review; self-review alone is insufficient.

## 5. Current programme status — 2026-10-09

The current work is on `hardening/ip-supply-chain-governance`, PR #21. The PR is open and draft. No merge or deployment is authorised.

| Workstream | Current status | Evidence / current finding | Remaining gate |
|---|---|---|---|
| P0 — PostgreSQL ledger and tenant isolation | IN PROGRESS | The PR describes trusted server-side tenant context, transaction-local tenant settings, RLS hardening, append-only protections, idempotency payload comparison, audit-context checks and safe `bigint` handling. Unit and mock coverage exists. | Run the required suite against a disposable real PostgreSQL instance; verify role privileges, pooling, concurrency and rollback against the actual schema/driver. |
| P0 — Typecheck and repository CI | IN PROGRESS | Earlier CI runs exposed TypeScript provenance errors and subsequent integration-test expectation failures. Follow-up changes were pushed; the newest relevant runs were still queued/in progress at last observation. | Inspect the latest head's final run results and logs; record exact run URLs and failure/pass summaries. Do not infer success from a queued run. |
| P0 — Security baseline | IN PROGRESS | Supply-chain workflows and governance documentation have been added. | Evidence-based review of application/authentication, API/object access, secrets, encryption, logs, rate limiting, monitoring and deployment configuration remains necessary. |
| P0 — GDPR/data residency | NOT STARTED / evidence not recorded | No complete, verified map of actual processing locations, subprocessors, retention and deletion was recorded in this tracker at last review. | Map actual systems and contracts; identify gaps and owners. No residency or GDPR-compliance claim without evidence. |
| P1 — Factor provenance | IN PROGRESS; two candidates blocked | ADEME V23.6 and UK DESNZ 2026 candidate records have been explicitly marked `blocked`; missing source-artifact SHA-256 values are intentionally empty; redistribution is disabled. Default factor lookup excludes blocked factors. | Obtain and verify the exact official artefacts and rows, compute hashes from the actual bytes, verify the value/unit/methodology/licence, and only then consider promotion. |
| P1 — Data intake and factor gating | IMPLEMENTED — UNVERIFIED | Data intake now rejects factors that are not approved for import/calculation. Tests were added to assert blocked factors do not reach ledger append. | Confirm typecheck/test results and review persistence side effects on rejection; ensure blocked factor metadata cannot be used through alternate paths. |
| P1 — Regulatory engine | NOT STARTED / evidence not recorded | No completed, source-verified rule-set inventory is recorded here. | Inventory each implemented jurisdictional rule and validate official sources, versions, effective dates, tests and limitations. |
| P1 — Backups/recovery/operations | NOT STARTED / evidence not recorded | No verified restore exercise, RPO/RTO evidence or full production-observability review is recorded here. | Review infrastructure without changing production; document recovery objectives and run authorised isolated restore tests where available. |
| P1 — Licence and supply-chain controls | IN PROGRESS | Source matrix, third-party notices, provenance policy and security/dependency workflows are present in the PR description; workflow outcomes must be checked per latest head. | Review exact introduced/changed components, SBOM and licence scan results, plus any administrative settings that need owner action. |
| Release / production readiness | BLOCKED pending gates | PR remains draft/unmerged; no independent sign-off or real PostgreSQL acceptance evidence recorded. | Complete acceptance criteria, independent review, final handover and separate project-owner decision. |

**Important distinction:** “implemented” means code has been changed; “tested” means the stated tests actually ran; “complete” requires acceptance criteria and review. The absence of evidence is not evidence that a control is absent or present—it remains unverified until inspected.

## 6. Work breakdown structure and acceptance criteria

Update each task row with an owner, status, date, commit/PR evidence, test evidence and reviewer. Do not mark a task complete while mandatory acceptance evidence is missing.

### P0-A — Ledger persistence and tenant isolation
**Primary locations:** `packages/carbon-ledger/src/postgres.ts`, `persistence.ts`, `persistence.test.ts`, `postgres.test.ts`, package README, `docs/architecture/persistent-carbon-ledger.md`, migrations, RLS policies, DB roles and server-side authorisation code.

**Acceptance criteria**
- Tenant identity is derived from trusted server-side authorisation and fails closed if absent/invalid.
- Tenant context is transaction-local on the same connection used by each tenant-scoped operation; pooled session state cannot leak across tenants.
- All read/write paths (events, audit records, ledger head, append, audit recording) use consistent trusted context.
- The application role cannot bypass RLS; policies and table privileges are verified against a real database.
- Event append, head update and associated audit record are atomic; injected failures roll back all effects.
- Historical events cannot be updated/deleted by the application role; corrections use explicit, documented correction events.
- Canonical hash inputs, serialization, timestamp semantics, precision and chain verification are documented and tested.
- Idempotency returns an existing result only for semantically equivalent payloads and rejects conflicting reuse.
- Audit tenant, actor and event identifiers must match the trusted operation.
- PostgreSQL `bigint` handling is safe above JavaScript's integer precision range; transaction failures leave pooled connections usable.
- Real PostgreSQL tests pass for all 12 scenarios listed in Section 7.

**Current owner:** UNASSIGNED  
**Current status:** IN PROGRESS  
**Blocker:** real PostgreSQL integration execution and database-role verification not yet evidenced.

### P0-B — Security baseline / OWASP ASVS 5.0.0
**Acceptance criteria**
- A finding register covers authentication/MFA, server-side authorisation, tenant isolation across API/jobs/files/exports, secrets/rotation, encryption, error/log redaction, dependencies, headers/rate limiting/abuse controls, administrative access, audit trails, incident response and monitoring.
- Each finding has severity, evidence/reference, impact, owner, remediation, due/target milestone and status.
- Claims are scoped to tested/inspected controls; no unsupported compliance/certification claim.

**Current owner:** UNASSIGNED  
**Current status:** IN PROGRESS

### P0-C — GDPR and data-residency assessment
**Acceptance criteria**
- Data-flow map covers database/replicas, uploads/extracted content, temp files/queues, logs/analytics/errors, OCR/AI/external processors, backups/DR and support tooling.
- Actual data locations, subprocessors, retention, access, transfer mechanisms, deletion and backup implications are recorded with evidence.
- Data minimisation, purpose, data-subject requests, DPA/subprocessor inventory, transfer assessments and separation of personal data from immutable accounting evidence are assessed.
- No EU-only residency or GDPR-compliance claim without supporting infrastructure/contract evidence.

**Current owner:** UNASSIGNED  
**Current status:** NOT STARTED / evidence not recorded

### P1-A — Factor provenance and deterministic calculations
**Primary locations:** `packages/carbon-core/`, `packages/factor-registry/`, `packages/data-intake/`, `legal/SOURCE_MATRIX.md`, `legal/THIRD_PARTY_NOTICES.md`, `legal/DATA_PROVENANCE.md`.

**Acceptance criteria**
- Each enabled factor has verified source/version, exact artefact hash, retrieval time, licence/legal basis, attribution/redistribution rights, geography, period, original/normalised units, transformation and evidence reference.
- Source rows and values are checked against official artefacts; hashes are computed from actual source bytes, never invented or copied from unrelated sources.
- Blocked/unverified factors cannot enter ordinary lookups, imports, calculations or ledger append.
- Results trace to activity/evidence, normalisation, factor ID/version, formula/conversions, methodology/GWP, engine version, actor/time and corrections.
- Tests cover unit conversions, decimal precision, boundary conditions, geography, effective dates, GWP/methodology compatibility and reproducibility.
- Missing data, estimates, uncertainty and data quality remain explicit; no undocumented conversion of missing data to zero.

**Current owner:** UNASSIGNED  
**Current status:** IN PROGRESS  
**Known blocked candidates:** ADEME V23.6 utility hydrogen SMR record; UK DESNZ 2026 electricity factor. Exact source artefact/row and applicable licence must be verified before either can be unblocked.

### P1-B — Data intake and integrations
**Acceptance criteria**
- The workflow preserves source → document/record → normalisation → classification → validation → activity → evidence → calculation → ledger.
- CSV/spreadsheet validation, invalid-row quarantine, duplicate detection, idempotent imports, extraction confidence vs data quality, retry/failure handling, access controls and import audit records are tested or explicitly marked unsupported.
- ERP/accounting/procurement/utility/fleet/invoice integrations are labelled operational only when end-to-end evidence exists.
- Rejection paths do not create unintended ledger entries or leave misleading persisted state.

**Current owner:** UNASSIGNED  
**Current status:** IN PROGRESS for factor gating; other integration coverage requires assessment.

### P1-C — Regulatory engine and change management
**Primary locations:** `packages/regulatory-engine/`, `docs/architecture/ADR-001-regulatory-boundary.md`, `legal/REGULATORY_SOURCES.md`.

**Acceptance criteria**
- Every implemented rule set records jurisdiction/instrument, official URL, source version/publication, effective dates, applicability, inputs/evidence/calculations/outputs, interpretation, reviewer, tests, limitations and release/rollback/impact process.
- Calculation core remains separate from jurisdiction-specific rules.
- Historical results are not silently rewritten when rules change.
- No claim of complete CBAM, ETS, CSRD/ESRS or other regime implementation without scoped, tested evidence.

**Current owner:** UNASSIGNED  
**Current status:** NOT STARTED / evidence not recorded

### P1-D — Infrastructure, backups and delivery pipeline
**Acceptance criteria**
- Migration/rollback, encrypted backups, point-in-time recovery (where supported), backup separation, restore tests, RPO/RTO, monitoring/alerts, ledger integrity checks, CI gates, secret scanning, SBOM, licence scanning, environment separation, least privilege and production approvals are inspected.
- Test and recovery evidence comes from isolated, authorised environments.
- No production infrastructure change is made under this programme without separate written authorisation.

**Current owner:** UNASSIGNED  
**Current status:** NOT STARTED / evidence not recorded

### P1-E — Third-party code and licence governance
**Acceptance criteria**
- Every new or changed dependency/source/dataset is inventoried with exact version, origin, licence evidence, intended use (reused/adapted/reference-only/rejected), attribution, commercial-use and redistribution conclusions.
- Ambiguous licences are blocked pending review; AGPL-3.0 and share-alike obligations are assessed before incorporation.
- Automated dependency/licence inventory and SBOM outputs are retained where available.
- Administrative repository controls are marked active only after an administrator applies and verifies them.

**Current owner:** UNASSIGNED  
**Current status:** IN PROGRESS

### RELEASE-GATE — Independent review and validation handover
**Acceptance criteria**
- All P0 tasks meet their acceptance criteria and have reproducible evidence.
- All P1 tasks are either complete or explicitly deferred/blocked with risk acceptance, owner and rationale.
- Latest branch CI has final results recorded; failing or pending runs are not described as passed.
- Security/privacy findings and dependency/licence reports are attached or linked.
- A technical reviewer independent of the implementer records review outcome and unresolved issues.
- The final task owner posts the completion declaration in Section 10 and updates this tracker.
- Project approver explicitly authorises the next validation stage. This does not authorise merge or deployment.

**Current owner:** UNASSIGNED  
**Current status:** BLOCKED pending P0 evidence and independent review.

## 7. Mandatory PostgreSQL integration test matrix

All tests below must run against an isolated disposable PostgreSQL database configured with the same relevant schema, roles, RLS policies, triggers and driver behaviour as the target environment. Mocks and schema-text/regex checks may supplement, but cannot replace these tests.

| ID | Required scenario | Required evidence |
|---|---|---|
| PG-01 | Tenant A cannot read tenant B events, audit records or head | Executed integration test and assertion output |
| PG-02 | Tenant A cannot insert/update/access tenant B records | Executed test under the actual application role |
| PG-03 | Missing/invalid tenant context fails closed | Negative test output |
| PG-04 | Transaction-local context does not leak across pooled connections | Pool reuse/rollback test output |
| PG-05 | Concurrent appends have unique sequence numbers and consistent heads | Concurrent test output plus chain verification |
| PG-06 | Failed append rolls back event, head and audit atomically | Fault injection and post-rollback database assertions |
| PG-07 | Equivalent idempotency-key reuse returns consistent result | Executed repeat-request test |
| PG-08 | Conflicting idempotency-key reuse is rejected | Executed negative test |
| PG-09 | Inconsistent audit tenant/actor/event is rejected | Executed negative tests |
| PG-10 | Application role cannot bypass RLS or mutate historical events | Role/privilege checks and attempted mutations |
| PG-11 | Hash verification detects altered, missing or mislinked events | Controlled tampering fixture/test |
| PG-12 | Large sequence values and driver conversions are safe | Boundary tests above JS safe integer range |

**Required record for each run:** date/time, branch/head SHA, exact command or workflow URL, PostgreSQL version, test database setup (no secrets), pass/fail counts, relevant logs/artifact link, deviations and reviewer. Never put credentials or sensitive data in this record.

## 8. Evidence and reporting requirements

Maintain a traceable evidence trail for each task. At minimum, record:

- Task ID and requirement reference.
- Owner and independent reviewer.
- Status and last-updated date.
- Files changed and commit SHA(s).
- Exact commands executed or workflow run URL and head SHA.
- Result summary (pass/fail/skipped/not run), with logs or artifact link.
- Known limitations, blockers, risk and follow-up action.
- Acceptance decision and reviewer/date.

A commit SHA proves a repository change exists; it does not prove the change works. A green unit-test job does not prove real PostgreSQL behaviour. A passing workflow from an older commit does not validate the latest head.

## 9. Findings, blockers and deferred work register

Add a row for every finding; do not remove closed findings from history.

| ID | Severity / priority | Finding or blocker | Evidence | Owner | Remediation / required action | Status |
|---|---|---|---|---|---|---|
| B-001 | P0 / critical gate | Real PostgreSQL integration suite and actual database-role/RLS verification not yet evidenced | PR #21 validation notes; no disposable PostgreSQL run recorded here | UNASSIGNED | Provision/use an isolated test database and execute PG-01–PG-12; record output | BLOCKED |
| B-002 | P0 | Latest CI result must be confirmed after the latest changes | [GitHub Actions](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions) | UNASSIGNED | Inspect final runs for current head; fix failures and rerun | IN PROGRESS |
| B-003 | P1 | ADEME factor candidate source artefact, exact record, value and licence applicability not fully verified | Factor module and source matrix mark candidate blocked | UNASSIGNED | Obtain official artefact; verify record/value/licence; compute actual SHA-256; review before unblocking | BLOCKED |
| B-004 | P1 | UK DESNZ 2026 candidate source artefact/updated row and factor breakdown not fully verified | Factor module and source matrix mark candidate blocked | UNASSIGNED | Obtain exact official updated flat file; verify row/value/gas breakdown/licence; compute actual SHA-256; review before unblocking | BLOCKED |
| B-005 | P0 | Full application security and GDPR/data-flow evidence not recorded in this tracker | No completed evidence register linked here | UNASSIGNED | Perform code/configuration and actual processor/data-location assessment | NOT STARTED |

Add new findings rather than overloading an existing row. When closing a finding, record the closure evidence and reviewer.

## 10. Mandatory final-task completion and handover protocol

**This section is mandatory.** The person who completes the last scheduled task must not simply stop after the final code commit. They must:

1. Confirm all tasks in Sections 6 and 7 have an accurate status; no pending, skipped or failed test may be presented as passed.
2. Recheck the current branch/head and the latest CI runs. Record the exact commit SHA and workflow results.
3. Confirm the P0 definition of done is met, or explicitly state that it is **not met** and why. Do not declare P0 complete without the real PostgreSQL evidence.
4. Link the final implementation report, security/privacy findings register, licence/SBOM report, test outputs, and unresolved/deferred-work list.
5. Ensure all blocked or deferred items have an owner (or explicitly state UNASSIGNED), rationale, risk and next action.
6. Request independent technical/security review. The implementer must not approve their own critical work as independently reviewed.
7. Update this document's status, change log and final handover fields below.
8. Submit the declaration below in the pull request or agreed project channel and notify the project approver.

### Required completion declaration — to be filled by the final task owner

> **FINAL IMPLEMENTATION HANDOVER — HUB CARBON PLATFORM**
>
> I confirm that I have completed the final task assigned to me in the approved hardening schedule and reviewed the project tracker against the agreed programme.
>
> - Final task ID/title:
> - Task owner:
> - Completion date (UTC):
> - Repository branch:
> - Exact final commit SHA:
> - Pull request:
> - CI run URLs and final outcomes:
> - PostgreSQL integration test evidence for PG-01–PG-12:
> - Implementation report / file-change map:
> - Security and privacy findings register:
> - Dependency, SBOM and licence evidence:
> - Remaining blockers, failures, deferred tasks or accepted risks:
> - Independent reviewer and review status:
>
> **Declaration:** All work claimed as complete has been performed according to the agreed programme and is supported by the evidence linked above. Any exception, unverified control, failed/skipped test or unresolved risk is explicitly listed above and in this tracker. I am handing the completed work over for independent validation; this declaration is not authorisation to merge, deploy, run production migrations or change production infrastructure.
>
> - Final task owner's name/sign-off:
> - Project approver acknowledgement:
> - Date accepted for independent validation:

Do not pre-fill the declaration as complete. It must be completed only by the person who actually finishes the final scheduled task and can attest to the evidence.

## 11. Change log

| Date (UTC) | Change | Evidence / commit | Updated by |
|---|---|---|---|
| 2026-10-09 | Initial living project tracker established from the approved Technical Implementation and Security Hardening Brief and observed branch/PR state. Records P0/P1 work breakdown, acceptance criteria, current blockers, evidence rules and mandatory final-task handover. | This document; branch `hardening/ip-supply-chain-governance`; PR #21 | Project implementation session — individual task owner not assigned in this document |
| YYYY-MM-DD | Describe the code/documentation change, status transition, test evidence and blocker/closure. | Commit SHA / CI run / evidence link | Name |

## 12. How this document must be maintained

- Update the relevant task row and findings register in the same change set as substantive implementation work, or in the immediately following documentation commit.
- Every status transition must include a date and evidence link in the change log.
- Do not delete previous findings or overwrite history without recording the reason.
- When a task fails validation, set it to **REJECTED / REWORK REQUIRED** or **IN PROGRESS**, describe the failure, and create a follow-up action.
- When an official source or licence cannot be verified, keep the affected factor/source blocked.
- Keep the tracker consistent with the actual branch, PR and latest workflow head. If the branch or PR changes, update the header and change log.
- Once the final declaration is submitted, preserve it in the PR discussion and link it here. The project approver then decides whether the work may enter independent validation.
- No task in this tracker grants permission to merge, deploy, or alter production.

## 13. Final acceptance principle

The programme is ready to be handed over for independent validation only when the evidence is complete and all exceptions are explicit. It is not automatically production-ready because code was committed, documentation was written, a subset of tests passed, or a CI workflow was green. P0 remains incomplete until the real PostgreSQL integration criteria are demonstrated. Any unresolved security, privacy, licensing, factor provenance, integration, regulatory, backup or operational risk must remain visible to the reviewer and approver.
