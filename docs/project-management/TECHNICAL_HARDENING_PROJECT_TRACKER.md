# Hub Carbon Platform — Technical Implementation & Security Hardening
## Project charter, execution tracker, evidence register and final handover protocol

**Document type:** Living project-management record  
**Status:** In progress — not approved for production  
**Last status review:** 2026-10-10  
**Repository:** `eliezermardegan/Hub-Carbon-Platform`  
**Working branch:** `hardening/ip-supply-chain-governance`  
**Pull request:** [#21 — chore: add IP, provenance and supply-chain governance](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21)  
**PR state at last review:** Open, draft, unmerged  
**Repository HEAD observed before this tracker metadata update:** `7fbfa80d0e70938cdd5731b9ca8ffcaaabdbffc2`  
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

## 5. Current programme status — 2026-10-10

The current work is on `hardening/ip-supply-chain-governance`, PR #21. The PR is open and draft. No merge or deployment is authorised.

| Workstream | Current status | Evidence / current finding | Remaining gate |
|---|---|---|---|
| P0 — PostgreSQL ledger and tenant isolation | IN PROGRESS | The PR describes trusted server-side tenant context, transaction-local tenant settings, RLS hardening, append-only protections, idempotency payload comparison, audit-context checks and safe `bigint` handling. Unit and mock coverage exists. | Run the required suite against a disposable real PostgreSQL instance; verify role privileges, pooling, concurrency and rollback against the actual schema/driver. |
| P0 — Typecheck and repository CI | IN PROGRESS / TEST FAILURES OBSERVED | On the observed PR run, `npm run typecheck` passed but `npm test` failed: 58 passed, 4 failed out of 62. Failures: golden end-to-end calculation; data-intake factor approval; ADEME provenance wording assertion; EU CBAM end-to-end calculation. | Fix or explicitly adjudicate each regression, then obtain a fresh passing run on the exact latest head. This unit-test run does not exercise real PostgreSQL. |
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

**Evidence log — 2026-10-10 (PostgreSQL CI progress; acceptance still open)**

- [Workflow run #137](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38047182677), tested commit `164afcd6be2b4dcb118e8ced3b225e915337f5bf): PostgreSQL 16.15 service startup, dependency install and `npm run typecheck` passed. `npm test`: **71 passed / 1 failed / 72 total**. The only failure was the test expectation for the transaction-local custom setting; actual output was the explicit `RESET` marker, while the assertion expected an empty string.
- Corrected that assertion in commit `468b6d2a55b7d72da7af2814b16ad5709a9c2e19`. CI has now started for this exact head: [test run #138](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38047290302) was queued at last observation. No result is claimed until it completes.
- The integration harness directly exercises PostgreSQL schema installation, application role attributes/table ownership, RLS tenant read isolation and fail-closed reads, cross-tenant insert rejection, append-only triggers, transaction rollback of paired event/audit inserts, unique tenant sequence, idempotency-key uniqueness, tenant-head storage, and a PostgreSQL `bigint` value above JavaScript's safe integer limit.
- **Not yet full P0 acceptance:** these tests primarily issue SQL through `psql`; they do not yet prove the production persistence adapter with a PostgreSQL driver, pooled connection reuse, concurrent append/head consistency, adapter-level injected rollback, same-key same-payload idempotent replay versus conflicting payload handling, audit tenant/actor/event consistency, cryptographic hash-chain verification/tamper detection, or adapter-level bigint safety rejection. Independent review is also pending. Do not mark PG-01–PG-12 complete until each criterion is linked to executed evidence.
- Previous baseline [workflow #126](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38046517189) had 58 passed / 4 failed / 62 total; the four failures were triaged and test fixtures/assertions corrected without relaxing production factor approval policy.
- Local execution was unavailable in this session because `docker`, `psql` and `postgres` were not installed; GitHub Actions is the available PostgreSQL execution environment. PostgreSQL version observed in CI: 16.15.

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



## 14. CCCA report alignment and required addenda

**Source reviewed:** *Carbon Accounting: Recommendations for Data Management in UK Manufacturing*, AI Data Team / Digital Catapult, March 2025 (the user-provided CCCA report). The report's summary recommendations are in its opening summary (PDF pages 4–6); relevant detailed discussion includes data quality and lineage (approximately pp. 56–69), e-liability and data sharing/interoperability (pp. 69–76), calculation approaches (pp. 77–79), and privacy/security/cyberthreats (pp. 82–85). Page references refer to the report's printed page numbers where shown.

**Interpretation rule:** This is a requirements-alignment assessment, not a claim of conformity with the report or proof that any feature is operational. “Already contemplated” means the existing hardening plan addresses the topic at a design/acceptance-criteria level. “Partially evidenced” means some relevant code or documentation is known to exist, but the complete capability has not been verified. “Addendum required” means a specific requirement must now be tracked with explicit acceptance evidence.

### 14.1 Recommendation-to-project traceability matrix

| CCCA recommendation / report theme | Existing project coverage | Assessment now | Addendum / acceptance evidence required |
|---|---|---|---|
| Standardised carbon-data formats, open standards, APIs, transparent methods, portability and avoidance of vendor lock-in (summary; pp. 71–76) | Existing plan covers intake/integrations, regulatory sources and traceability, but no approved cross-platform schema/API contract is evidenced in this tracker. | PARTIAL — design intent only; interoperability not demonstrated. | CCCA-01: define versioned canonical carbon-data schema, documented API/import-export contract, units and scope/boundary semantics, compatibility/version policy, and portable export. Test round-trip export/import and schema validation. Assess JSON/XML and XBRL where suitable; do not claim standards compliance without a selected specification and tests. |
| Credible verification, validation, and consistent verification practices (summary; pp. 66–70) | Ledger integrity, audit coherence and factor provenance are covered by P0/P1 criteria. A complete independent carbon-data verification workflow is not evidenced. | PARTIAL — technical integrity is not the same as emissions verification. | CCCA-02: define validation vs verification, evidence requirements, review roles, sampling/exception workflow, correction/recalculation process and an independent review record. Any training/qualification requirement is a governance proposal, not a product feature unless adopted by the project owner. |
| Trusted data sharing: disclose only required data, secure APIs, encryption, role-based access, and “disclose once” approach (summary; pp. 71–76, 82–85) | P0 security/privacy criteria cover tenant isolation, encryption review, secrets and data flows; no selective disclosure or consent/authorisation model is evidenced. | PARTIAL — baseline security review remains open; cross-organisation sharing is not demonstrated. | CCCA-03: threat-model external sharing; define recipient, purpose, minimum fields, authorisation, tenant boundary, expiry/revocation, audit trail, encryption in transit/at rest and redaction. Add negative tests proving one customer/partner cannot access unshared evidence. Assess “disclose once” only where lawful, technically feasible and consent/contract boundaries permit. |
| Standardised emission-factor datasets and filling Scope 3 data gaps (summary; P1-A) | Provenance fields, source matrix, licence gate and blocked unverified factor candidates are already in scope. | PARTIAL — governance is present; candidate source artefacts and rights remain blockers. | CCCA-04: maintain a reviewed dataset coverage/gap register by geography, period, scope/category and source quality. Verify source rows, factor method, units, version and licence before enabling. Record explicit fallback policy and label secondary estimates; never invent missing factors or hashes. |
| Integrating siloed sources and automating collection/processing into governed storage (summary; pp. 48–55) | P1-B defines source-to-ledger intake and discusses CSV/spreadsheets and future integrations. Broad end-to-end ERP, utility, procurement, fleet and supplier connectors are not proven operational. | PARTIAL — intake guardrails are in progress; integrations must be evidenced individually. | CCCA-05: create an integration inventory with source/system, connector mode, data owner, frequency, credentials model, failure/retry, duplicate/idempotency handling, reconciliation, audit and test environment. Label each connector manual, prototype, tested or operational based on evidence. |
| Data governance, metadata, cleaning, normalisation, validation, quality dimensions and lineage (pp. 52–69) | Factor provenance, deterministic calculation traceability and intake validation are included in the existing plan. A platform-wide metadata/quality model is not yet evidenced. | PARTIAL — factor metadata is narrower than end-to-end carbon-data quality and lineage. | CCCA-06: define minimum metadata for source, owner, timestamp/period, geography, unit, scope/category, method, evidence, transformations, quality flags, uncertainty, approval and lineage. Define completeness, validity, consistency, timeliness and source reliability checks with thresholds, quarantine/remediation and tests. |
| Transparent calculation approaches: activity-based, spend-based and average-data methods; improve primary data over time (pp. 77–79 and summary) | P1-A requires deterministic calculation and explicit missing data/estimates; it does not yet establish that all three methods are implemented. | ADDENDUM REQUIRED — method coverage is not verified. | CCCA-07: explicitly model calculation method and input-data class (primary activity, spend-based secondary, average-based secondary), factor basis, currency/year where relevant, confidence/quality and reason for fallback. Prefer activity data when fit for purpose; permit spend/average methods with visible limitations and a migration path to primary data. Add tests and prevent silent method switching or missing-to-zero conversion. |
| Scope boundaries, organisational boundaries, comparability and double-counting controls (report themes on scope definitions, data management and verification) | The current plan covers Scope 1/2/3 and tenant/audit consistency at a broad level; a complete boundary and cross-value-chain duplicate policy is not evidenced. | PARTIAL — explicit rules and tests needed. | CCCA-08: document organisational/operational boundaries, reporting period, Scope 2 market/location-based distinctions where applicable, Scope 3 category mapping, ownership of supplier/product emissions and double-counting rules. Add boundary and duplicate-detection tests; preserve source claims and avoid implying that all value-chain double counting can be eliminated automatically. |
| E-liability, product carbon footprints and supply-chain product carbon data exchange (pp. 69–76) | Append-only ledger and factor/evidence traceability provide useful foundations, but they do not implement product-level inherited emissions or a product-carbon exchange protocol by themselves. | ADDENDUM REQUIRED — not evidenced as implemented. | CCCA-09: assess product/lot-level carbon records, inherited supplier emissions, allocation rules, functional unit, lifecycle boundary, provenance, versioning, corrections and double-counting prevention. Select and evaluate a relevant exchange model/specification (for example, the report's referenced PACT/WBCSD work) before implementation; require interoperability and conformance tests. Keep this separate from claims that blockchain or a hash chain alone verifies truth. |
| Financial reporting alignment and XBRL (pp. 73–74) | Regulatory engine and reporting traceability are in scope, but a financial reporting/XBRL interface is not evidenced. | ADDENDUM REQUIRED — discovery before implementation. | CCCA-10: assess whether XBRL or another reporting format is appropriate for target users/regimes; map carbon metrics to financial/reporting concepts, identify taxonomy/version and validation rules, and produce a sample export with reconciliation tests before claiming support. |
| Privacy, security and cyberthreats (pp. 82–85) | P0 security and GDPR/data-residency assessments require a real data-flow map, access review and evidence. | IN PROGRESS / EVIDENCE MISSING. | CCCA-11: include supplier-confidential data, commercially sensitive activity/spend data, personal data in invoices/transport records and shared product data in the threat/privacy assessment. Define minimisation, access/retention/deletion, processor transfers, logs/redaction, incident response and data-sharing risks; link findings to P0-B/P0-C. |
| Shared trust framework / interoperable “digital spine” and clear roles (pp. 74–76) | Governance roles and the security baseline exist in the project plan; no multi-party trust framework or common exchange layer is evidenced. | ADDENDUM REQUIRED — architectural option to assess, not an assumed implementation. | CCCA-12: document the trust model for data producers, platform, verifiers and consumers; define identity, permissions, responsibility, schema/version negotiation, auditability and failure handling. Decide whether a shared interoperability layer is needed based on concrete use cases; avoid building a distributed architecture without validated need. |

### 14.2 New CCCA addendum work items and owners

All owners remain **UNASSIGNED** until explicitly allocated. The work items below are requirements and assessment tasks; they do not assert that the corresponding capability exists.

| ID | Priority | Work item | Acceptance gate | Initial status |
|---|---|---|---|---|
| CCCA-01 | P1 | Canonical schema, open formats, versioning, API and portability | Published schema/API contract, examples, validation and round-trip tests; selected formats/specifications documented | NOT STARTED |
| CCCA-02 | P1 | Data validation and independent verification workflow | Roles, evidence, exceptions, corrections and review trail documented and tested | NOT STARTED |
| CCCA-03 | P0/P1 | Secure selective data sharing | Threat model, minimum-disclosure design, authorisation model and cross-tenant negative tests; linked to P0-B/P0-C | NOT STARTED |
| CCCA-04 | P1 | Factor dataset coverage and Scope 3 gap register | Coverage/gap inventory and source/licence evidence; unverified sources remain blocked | IN PROGRESS — linked to P1-A |
| CCCA-05 | P1 | Data-source and connector maturity inventory | Each integration classified by actual evidence, with failure/idempotency/reconciliation tests | IN PROGRESS — linked to P1-B |
| CCCA-06 | P1 | End-to-end metadata, quality and lineage model | Data dictionary, quality rules, lineage fields and validation/quarantine tests | NOT STARTED |
| CCCA-07 | P1 | Explicit activity/spend/average calculation methods | Method-labelled calculation trace, fallback policy, quality/confidence metadata and reproducibility tests | NOT STARTED |
| CCCA-08 | P1 | Boundaries, Scope mapping and double-counting controls | Documented boundary/mapping policy and regression tests; known limitations explicit | NOT STARTED |
| CCCA-09 | P1 / architecture decision | Product carbon footprint, inherited emissions and exchange protocol | Use cases, allocation/boundary model and protocol decision; implementation only after review | NOT STARTED |
| CCCA-10 | P2 / discovery | Financial reporting and XBRL assessment | Documented applicability decision and sample export/reconciliation if adopted | NOT STARTED |
| CCCA-11 | P0 | Extend security/privacy review to shared carbon data | Findings linked to P0-B/P0-C, with severity, owner, remediation and evidence | IN PROGRESS — linked to P0-B/P0-C |
| CCCA-12 | P2 / architecture decision | Multi-party trust framework / interoperability layer | Trust boundaries, roles and exchange use cases documented; explicit adopt/defer decision | NOT STARTED |

### 14.3 Relationship to the existing hardening plan

The CCCA addenda extend the existing plan; they do not replace or relax the P0 release gates.

- P0 ledger atomicity, RLS/tenant isolation and real-PostgreSQL PG-01–PG-12 tests remain mandatory.
- P0 security/privacy review must include the additional data-sharing and supplier/product data risks identified above.
- P1 factor provenance and intake gating remain mandatory; CCCA coverage does not permit an unverified factor to be enabled.
- Interoperability, XBRL, e-liability/product exchange and a digital-spine-style layer require explicit architecture decisions and scoped acceptance criteria before implementation is claimed.
- No compliance, verification, interoperability, connector, standard-conformance or product-carbon-exchange claim may be made without corresponding implementation and test evidence.
- Where the report describes a policy, ecosystem or regulatory recommendation rather than a software feature, record it as a governance/dependency decision rather than pretending it can be solved by code alone.

### 14.4 CCCA evidence register

For each CCCA item, the task owner must add links to the design decision, relevant files, test runs, evidence artefacts and independent review. Until those are recorded, the status must remain NOT STARTED, IN PROGRESS, BLOCKED or IMPLEMENTED — UNVERIFIED as appropriate.

| ID | Design / implementation references | Test / evidence link | Reviewer | Status / last update |
|---|---|---|---|---|
| CCCA-01 | To be identified after repository inspection | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-02 | To be identified after repository inspection | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-03 | Link to P0-B/P0-C and sharing design when available | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-04 | P1-A, factor registry and legal source matrix | Existing source-gating evidence requires CI confirmation | UNASSIGNED | IN PROGRESS |
| CCCA-05 | P1-B and data-intake package | Connector-specific end-to-end evidence not recorded | UNASSIGNED | IN PROGRESS |
| CCCA-06 | P1-A/P1-B and evidence/lineage design when available | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-07 | P1-A and calculation core | Method coverage not recorded | UNASSIGNED | NOT STARTED |
| CCCA-08 | Regulatory/calculation design when identified | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-09 | Architecture decision required | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-10 | Reporting architecture when identified | Not recorded | UNASSIGNED | NOT STARTED |
| CCCA-11 | P0-B/P0-C | Security/privacy review not yet recorded as complete | UNASSIGNED | IN PROGRESS |
| CCCA-12 | Architecture decision required | Not recorded | UNASSIGNED | NOT STARTED |




## 18. Novisto carbon-accounting guide — repository fit-gap assessment

**Source reviewed:** Novisto, *Carbon Accounting: The Definitive Enterprise Guide*, https://novisto.com/resources/carbon-accounting-guide (web review on 2026-10-10).

**Source-quality note:** This is a vendor-authored educational/marketing guide, useful as an enterprise capability checklist but not itself a regulatory authority, assurance standard, or proof of the Novisto product's actual performance. Regulatory statements in the article are not adopted as legal requirements without a separate check against current primary sources. This section records product/architecture fit-gap analysis, not certification or a claim of feature parity.

### 18.1 What the repository already contemplates or documents

| Guide topic | Evidence inspected in this repository | Assessment |
|---|---|---|
| Activity data × emission factor calculation | `packages/carbon-core/README.md` states deterministic calculation primitives and the initial formula; factor identity/version are retained. | CONTEMPLATED / documented at domain level. Full method coverage and acceptance evidence still need verification. |
| Scope 1, 2 and 3 accounting | Project charter targets Scope 1/2/3; `packages/data-intake/README.md` says Scope 3 supports all 15 categories. | CONTEMPLATED. Must verify category mapping, boundaries, exclusions and tests; this is not proof every calculation pathway is implemented. |
| Activity, spend and unresolved methods | Data Intake README distinguishes primary, activity-based, spend-based and unresolved methods; missing data is not silently zero. | PARTIALLY DOCUMENTED. Explicit average-data method, method selection/fallback policy and comparative quality treatment need acceptance tests. |
| Emission-factor provenance and versioning | `packages/factor-registry/README.md` calls for source/version, licence, attribution, retrieval date, hash, geography, period, units, methodology/GWP and data quality. | CONTEMPLATED; some candidates remain blocked pending source/licence evidence. Automatic updating must not bypass review and licensing gates. |
| Source evidence and audit trail | Data Intake README defines source-to-ledger flow and immutable evidence by content hash; `docs/architecture/persistent-carbon-ledger.md` documents event lineage, factor snapshot, hash chain, audit context and explicit corrections. | DESIGN DOCUMENTED; P0 real-PostgreSQL validation remains outstanding. A hash chain detects inconsistencies but does not prove source truth or prevent all privileged tampering. |
| Flexible ingestion and integration boundary | Data Intake pipeline is documented as source → document/record → normalise → classify → validate → activity → evidence → engine → ledger. | CONTEMPLATED. OCR/PDF extraction, ERP/procurement/HRIS/utility connectors and scheduled feeds must be classified individually by actual implementation and test evidence. |
| Regulatory rule separation and versioning | `packages/regulatory-engine/README.md` documents jurisdictional, versioned, effective-dated and explainable rules, and explicitly says no real regime (including CBAM/CSRD/ETS) is implemented yet. | ARCHITECTURAL BOUNDARY EXISTS; real rule sets are not implemented according to the README. |
| Tenant isolation and transaction integrity | Persistent ledger design documents trusted tenant context, RLS, atomic writes, idempotency and append-only corrections. | DESIGN DOCUMENTED; actual database-role/RLS and concurrency evidence is still a release blocker. |

### 18.2 Gaps and recommended additions

| ID | Priority | Guide capability / gap | Proposed project addition and acceptance criteria | Initial status |
|---|---|---|---|---|
| NOV-01 | P1 | Organisational modelling: entities, subsidiaries, facilities, sites and evolving reporting structures | Define a versioned organisation/site hierarchy and effective-dated relationships to activities, meters, suppliers and reporting boundaries. Model acquisitions, divestments and boundary changes without rewriting prior-period results. Add tests for historical rollups and access control. | NOT STARTED |
| NOV-02 | P1 | Data ownership and multi-step approval workflows | Define accountable data owner, preparer, reviewer/approver, approval state, timestamps, comments and evidence for material data/calculation changes. Add separation-of-duties rules where required and tests for unauthorised approval or edits after approval. | NOT STARTED |
| NOV-03 | P1 | Data-quality/variance checks | Add configurable validation and period-over-period variance/anomaly rules with explainable thresholds, false-positive handling, reviewer disposition and audit events. An anomaly is a review signal, not an automatic correction or proof of error. | NOT STARTED |
| NOV-04 | P1 | Scope 2 location-based and market-based accounting | Define separate method/result identities and required evidence for both approaches; specify geography, period, contractual instruments/energy attributes, factor source and eligibility checks. Prevent double counting and test missing/invalid contractual evidence. | NOT STARTED |
| NOV-05 | P1 | Baseline year, recalculation and forecasting | Define base-year selection, organisational-boundary changes, recalculation triggers, restatement reasons, versioned assumptions and comparable historical series. Separate forecast scenarios from measured/actual ledger results and test reproducibility. | NOT STARTED |
| NOV-06 | P1 | Reduction targets and progress tracking | Assess a target model (absolute and/or intensity metrics), baseline, target year, boundary, scope/category coverage, methodology and progress indicators. External frameworks such as SBTi must be treated as independently versioned requirements; do not imply validation/approval by SBTi. | NOT STARTED |
| NOV-07 | P1 | Supplier engagement and primary Scope 3 data | Define supplier invitation/data-request workflow, reporting period, product/activity units, evidence, confidentiality, response status, validation and factor/method hierarchy. Distinguish supplier-specific primary data from spend/industry-average estimates and track improvements over time. | NOT STARTED |
| NOV-08 | P1 | Emission-factor refresh and coverage | Add a controlled refresh/coverage workflow with source-version diff, effective dates, geography/category coverage, licensing, approval, impact analysis and reproducible recalculation. No automatic production promotion of a new factor solely because a source endpoint changed. | IN PROGRESS — link to P1-A / CCCA-04 |
| NOV-09 | P1 | Multi-step audit-ready reporting package | Define a reproducible report snapshot linking each reported figure to boundary, period, source/evidence, factor version, method, calculation-engine version, owner, approvals and restatements. Add export and reconciliation tests. | NOT STARTED |
| NOV-10 | P2 / discovery | Broader ESG metric and disclosure integration | Decide whether Hub should remain a carbon-accounting platform or expose a general ESG evidence/disclosure layer. If adopted, define shared evidence/control references without conflating non-carbon metrics with emissions calculations. | NOT STARTED |
| NOV-11 | P2 / discovery | Decarbonisation planning, targets, scenario analysis and internal carbon pricing | Assess as a distinct management-planning capability, separate from verified emissions accounting. Define scenario assumptions, price units, time horizon, governance and clear separation from actual emissions and carbon credits. | NOT STARTED |
| NOV-12 | P1 | Product lifecycle, downstream Scope 3 and operational hotspots | Verify that category/data models cover use-of-sold-products, end-of-life, process/fugitive emissions, fleet, facilities, purchased goods and relevant supplier tiers. Record unsupported categories explicitly and test category-specific data requirements. | NOT STARTED |

### 18.3 Product-accounting safeguards arising from the guide

1. **Keep actuals, estimates, forecasts, targets and offsets distinct.** They must not be aggregated under a single unlabeled emissions value. Any offset/removal credit must be represented separately from gross inventory emissions, with its own evidence and eligibility checks.
2. **Do not treat a public factor dataset as automatically reusable.** Verify exact artefact, licence, attribution and redistribution rights. Factor updates must be versioned and approved; historical reports must remain reproducible.
3. **Do not equate audit trail with assurance.** A traceable calculation supports review but does not prove source accuracy, adequate controls, independent verification or regulatory compliance.
4. **Treat automated extraction as a proposal, not truth.** OCR/AI-extracted values require source links, confidence, validation, correction and human review thresholds proportionate to risk.
5. **Preserve Scope 2 method distinctions.** Location-based and market-based results should remain separately identifiable where applicable, with source-specific evidence and transparent assumptions.
6. **Do not silently overwrite baselines or historical periods.** Boundary changes, factor revisions and methodology changes require documented impact assessment and explicit restatement/recalculation events.
7. **Keep management features separate from accounting primitives.** Targets, forecasts, internal carbon prices and reduction initiatives may consume verified results, but should not alter immutable historical ledger facts.
8. **Regulatory assertions require primary-source validation.** The Novisto page includes broad claims about CSRD, SEC, California laws and other frameworks. The project must verify each jurisdiction's current scope, effective dates, status and applicability before encoding rules or marketing compliance.

### 18.4 Crosswalk to the existing CCCA addenda

| Novisto assessment | Existing project task to reuse | Relationship |
|---|---|---|
| NOV-01 organisation/site hierarchy | CCCA-08; P1-C regulatory boundary mapping | Extends boundary modelling; requires a specific domain model. |
| NOV-02 owners and approvals | CCCA-02, CCCA-06, P0-B | Adds operational workflow and separation of duties to provenance/verification. |
| NOV-03 quality and variance checks | CCCA-06, CCCA-05 | Adds period-over-period anomaly signals and review disposition. |
| NOV-04 Scope 2 market/location methods | CCCA-07, CCCA-08, P1-A | Specific method/evidence acceptance criteria. |
| NOV-05 baseline and recalculation | CCCA-08, CCCA-07, P1-C | Connects effective-dated boundaries, restatements and historical reproducibility. |
| NOV-06 targets and progress | P1-C / regulatory and reporting assessment | Adjacent management capability; scope decision needed. |
| NOV-07 supplier engagement | CCCA-03, CCCA-05, CCCA-09 | Supplier-specific data and secure cross-organisation sharing. |
| NOV-08 factor refresh/coverage | CCCA-04, P1-A | Direct extension of existing provenance and licensing gate. |
| NOV-09 reporting snapshot | CCCA-01, CCCA-02, CCCA-06 | Combines interoperability with end-to-end audit evidence. |
| NOV-10 broader ESG | CCCA-10 and architecture review | Optional product-scope decision, not assumed in current carbon scope. |
| NOV-11 decarbonisation planning | Project charter / future roadmap | Keep separate from P0 ledger and compliance claims. |
| NOV-12 source/category coverage | CCCA-07, CCCA-08, CCCA-09 | Category-level coverage and explicit limitations. |

### 18.5 Source and evidence record

- Guide URL: https://novisto.com/resources/carbon-accounting-guide
- Review date: 2026-10-10.
- Repository artefacts inspected: `packages/carbon-core/README.md`, `packages/data-intake/README.md`, `packages/factor-registry/README.md`, `packages/regulatory-engine/README.md`, `docs/architecture/persistent-carbon-ledger.md`, and this tracker.
- Evidence limitation: this was a repository/documentation fit-gap inspection, not a full code audit, live-system test, legal review, assurance engagement, or independent validation. The listed capabilities must be verified against implementation, tests and deployment configuration before being marked complete.



## 19. Additional operational controls from the detailed CCCA report

The existing CCCA alignment above captures the report's main strategic recommendations. This section records additional operational controls identified by reviewing the detailed sections on responsibility for data collection, automation, cleaning, quality, validation, and reporting (printed pages 47–69 and 88–91; PDF pages may differ).

| ID | Report finding / risk | Proposed addition | Acceptance evidence | Initial status |
|---|---|---|---|---|
| CCCA-13 | Data collection responsibilities are distributed across sustainability, operations, finance, procurement, product, HR and IT; unclear ownership reduces data quality. | Define a data responsibility matrix by source and emission category: accountable owner, contributor, reviewer, system of record, cadence and escalation path. Include supplier-submitted data and smaller organisations with combined roles. | Approved RACI/ownership matrix; each required data field/category has an accountable owner or explicit gap; access and approval tests where supported. | NOT STARTED |
| CCCA-14 | Manual collection and annual-only review can delay detection of errors and trends. | Define collection cadence by source and materiality, plus monthly/quarterly monitoring where appropriate. Provide period completeness indicators and late/missing-source alerts; annual reporting remains a reporting cycle, not the only control cycle. | Cadence policy, completeness dashboard/API output, tests for missing/late periods and evidence that alerts do not create or change emissions automatically. | NOT STARTED |
| CCCA-15 | Incoming data may contain missing fields, duplicates, outliers, inconsistent units, naming or time resolution. | Implement a governed data-quality pipeline: preserve raw input, normalise to canonical units/names/time periods, detect duplicates and outliers, quarantine suspect records, and record every transformation and human disposition. Never silently discard, impute or overwrite evidence. | Fixtures for duplicates, outliers, missing values, unit conversion and period alignment; before/after lineage; reviewable quarantine and correction events. | NOT STARTED |
| CCCA-16 | Quality is multidimensional; a single generic “valid” flag cannot explain fitness for use. | Define quality dimensions and fit-for-purpose rules: accuracy/source reliability, completeness, uniqueness, validity, consistency, timeliness, accessibility and security. Record quality flags and limitations at source/activity/calculation/report level. | Published data-quality rubric, configurable thresholds by data class, reproducible scoring/explanations and tests that low-quality data is flagged rather than silently promoted. | NOT STARTED |
| CCCA-17 | Integrations and AI-based extraction can move or transform data without proving that meaning and metadata were preserved. | Add transformation controls: schema and unit validation at each boundary, record-count/reconciliation checks, metadata preservation, provenance of extraction, confidence where machine extraction is used, and human-review thresholds based on materiality/risk. | Contract/integration tests proving no unexplained record loss/duplication, field and unit preservation, extraction confidence/evidence linkage, and reviewed exception handling. | NOT STARTED |
| CCCA-18 | Reporting outputs need periodic review and evidence that results remain consistent and useful for decisions. | Add period-over-period trend review and auditable report snapshots, including completeness/quality warnings, material changes, unresolved estimates and reviewer disposition. Link to NOV-03/NOV-09 and CCCA-02/CCCA-06 rather than building duplicate workflows. | Reproducible report snapshot and reconciliation tests; review record for material anomalies; historical reports remain reproducible after factor or boundary changes. | NOT STARTED |

### 19.1 Implementation guardrails

- Prefer explicit, explainable deterministic checks before introducing AI/ML. AI may suggest classifications, duplicates or anomalies, but must not silently change the ledger or fill missing values as facts.
- Keep original source files and raw extracted values, subject to retention/privacy policy, so every normalised value can be traced back to its origin.
- Data-quality scores must disclose their dimensions and cannot be presented as independent assurance or a probability that an emission figure is correct unless empirically validated for that interpretation.
- Define monitoring cadence by source and materiality; do not impose real-time collection where source systems or use cases do not justify the cost.
- Treat “single source of truth” as a governed logical record and lineage model, not necessarily a mandate to copy all sensitive source data into one physical database.
- Reuse existing CCCA/NOV tasks where possible. These additions should clarify acceptance criteria, not create duplicate implementations.



## 20. GHG reporting handbook and institutional methodology — fit-gap assessment

**Sources reviewed (2026-10-10):**
- *GHG Emissions Reporting*, KPMG LLP, © 2024, user-provided PDF. This is a professional reporting handbook interpreting multiple frameworks; it is not itself a regulator or a substitute for the current primary standards and applicable law.
- *Carbon Accounting Methodology*, King's College London, last updated July 2025, user-provided PDF. This is a useful institutional example of a transparent category-by-category methodology, not a universal method that should be copied without assessing applicability.

**Review scope:** document/repository-level fit-gap against the project tracker and the repository README/architecture files already inspected. This is not a complete code audit, legal opinion, assurance engagement, or test run. Existing design documentation is not treated as proof of an implemented capability.

### 20.1 Existing coverage and gaps

| Topic in the attachments | Existing project coverage | Assessment |
|---|---|---|
| General GHG accounting principles: relevance, completeness, consistency, transparency and accuracy | CCCA-01/02/06/08 and NOV-03/09 cover schema, verification, quality, boundaries and reporting evidence. | PARTIAL. Translate the five principles into inventory-level acceptance criteria and report warnings/exclusions. |
| Organisation and operational boundaries; classify emission sources before calculation | CCCA-08 and NOV-01 cover boundaries and organisation/site hierarchy. | CONTEMPLATED, not verified. Need an explicit, versioned consolidation approach (e.g. equity share, financial control or operational control) selected per reporting framework/customer policy. |
| Category-by-category method documentation | Data-intake and factor-registry READMEs describe broad ingestion/provenance; KCL shows a useful pattern of category, description, data source/unit, factor basis, method maturity and caveats. | PARTIAL. Need a governed methodology catalogue for each scope/category with applicability, owner, activity input, unit, factor basis, estimation method, period, evidence, limitations and review date. Do not adopt a sector-specific SCEF level uncritically. |
| Inventory of unavailable, partial, under-review and out-of-scope categories | CCCA-04/06 and NOV-12 cover factor gaps and category coverage. | PARTIAL. Require explicit per-entity reporting of included, excluded, not applicable, unavailable and partially available categories, with rationale, owner and remediation plan. Never silently treat missing data as zero. |
| Formula, gases and global warming potential (GWP) | Carbon-core documents deterministic activity × factor calculations; factor provenance includes methodology/GWP. | PARTIAL. Confirm calculation dimensions, gas-specific factors and GWP version; retain gas-level amounts where available and CO2e outputs with explicit GWP basis. Add dimensional and regression tests. |
| Scope 2 location-based and market-based results and contractual energy instruments | NOV-04 already requests separate results and evidence. | PLANNED. Make the reporting model distinguish the two methods and attach geography, grid/residual mix where relevant, supplier factor, instrument type, market, vintage, ownership/cancellation evidence and eligibility checks as applicable. Contractual instruments are not the same as offset credits. |
| Base year, significance threshold, structural change and retrospective recalculation | NOV-05 covers baselines and recalculation at a high level. | PARTIAL. Add an explicit recalculation policy: qualitative/quantitative significance thresholds (including cumulative effects), triggering events, approvals, affected years, before/after values and reasons. Preserve previously issued report snapshots and link restatements rather than silently overwriting history. Threshold values are policy/framework-specific, not universal constants. |
| Time-series comparability and factor vintage | P1-A, CCCA-04, NOV-05 and NOV-08 cover versioned factors and historical reproducibility. | PARTIAL. Record reporting period, factor publication/vintage, factor effective period and chosen period-alignment policy. For spend-based estimates, disclose currency, price year and whether inflation/sector-price adjustments are applied; do not compare nominal spend across years as if it were real activity without caveat. |
| Data quality, estimation uncertainty and maturity improvement | CCCA-06/16 and NOV-03 cover quality dimensions and review. | PARTIAL. Add method-specific uncertainty/quality metadata and disclosure of the main uncertainty sources, assumptions and improvement actions. A score must explain its basis and must not imply assurance without validation. |
| Gross inventory versus removals, avoided emissions, project reductions and offset credits | Existing NOV safeguards say actuals, estimates, forecasts, targets and offsets must remain distinct. | PARTIAL. Explicitly keep gross Scope 1/2/3 totals separate from removals, avoided emissions, project accounting and purchased/retired offset credits. If offset management is in scope, track programme, unique serial/registry ID, vintage, ownership, retirement/cancellation, verification status and reversal/claim risks. Never subtract credits invisibly from gross inventory. |
| Report/disclosure package and assurance statement | CCCA-01/02/18 and NOV-09 cover portable formats, verification and report snapshots. | PARTIAL. Define report profiles that can include totals by scope, Scope 2 methods, Scope 3 categories, gases and CO2e, exclusions, methods, boundaries, base year/recalculations, data quality, uncertainty, assumptions, intensity metrics, targets and assurance type/opinion where applicable. Profiles must be selected for a specific framework and jurisdiction, not presented as universal legal requirements. |
| Scope 3 prioritisation and iterative transition from spend/average data to primary data | CCCA-04/07 and NOV-07/12 cover gaps, methods and supplier data. | CONTEMPLATED, needs operational workflow. Support screening/hotspot analysis, a documented method hierarchy, primary-data collection plans, data-quality improvement over time and visible flags when secondary estimates are used. |

### 20.2 New handbook/methodology addenda

| ID | Priority | Work item | Acceptance criteria | Initial status |
|---|---|---|---|---|
| GHGR-01 | P1 | Versioned inventory methodology catalogue | Every applicable category has a reviewed record of boundary, activity data, unit, method, factor basis, source, period, owner, limitations and evidence; unsupported categories are explicit. | NOT STARTED |
| GHGR-02 | P1 | Exclusion and coverage register | Report distinguishes included, excluded, not applicable, unavailable and partial categories; each exclusion has a reason, materiality consideration, owner and remediation decision. | NOT STARTED |
| GHGR-03 | P1 | GHG species, CO2e and GWP basis | Gas-level calculation support where inputs permit; explicit GWP source/version and dimensional tests; historical results remain reproducible. | NOT STARTED |
| GHGR-04 | P1 | Base-year recalculation and restatement policy | Approved policy defines triggers, significance assessment, cumulative changes, approvals and affected periods; restatements are auditable and old report snapshots remain retrievable. | NOT STARTED |
| GHGR-05 | P1 | Reporting-period/factor-vintage and spend-price alignment | Store reporting period, factor vintage/effective period, currency and price year for spend estimates; policy and tests document inflation/price adjustment or its absence. | NOT STARTED |
| GHGR-06 | P1 | Uncertainty and estimation-quality disclosures | Method-specific assumptions/uncertainty, quality dimensions and improvement actions appear in report evidence; scores do not masquerade as independent assurance. | NOT STARTED |
| GHGR-07 | P1 / scope decision | Offset/removal/project-accounting register | Decide product scope. If included, model separately from gross inventory and track unique IDs, programme/registry, vintage, transfer/retirement, verification and reversal/claim status. | NOT STARTED |
| GHGR-08 | P1 | Framework-specific report profiles | Versioned disclosure profiles map each selected framework to required fields and validation; sample exports reconcile to ledger and identify exclusions, estimates and restatements. | NOT STARTED |
| GHGR-09 | P1 | Inventory principles and boundary consolidation policy | Document relevance, completeness, consistency, transparency and accuracy checks; define selected consolidation approach and boundary change history per customer/framework. | NOT STARTED |
| GHGR-10 | P1 | Scope 2 contractual-instrument evidence | Evidence and eligibility validation for market-based results; distinguish energy attribute instruments from offset credits; test invalid, duplicate or out-of-period claims. | NOT STARTED |

### 20.3 Crosswalk to existing work

- GHGR-01/02 extend CCCA-04, CCCA-06 and NOV-12.
- GHGR-03 extends P1-A factor provenance and the deterministic calculation-core acceptance criteria.
- GHGR-04/05 extend NOV-05 and NOV-08; they must preserve historical snapshots and factor versions.
- GHGR-06 extends CCCA-16 and NOV-03.
- GHGR-07 is an explicit product-scope decision and must not be treated as a requirement to trade or promote offsets.
- GHGR-08 extends CCCA-01/02/18 and NOV-09.
- GHGR-09 extends CCCA-08 and NOV-01.
- GHGR-10 extends NOV-04 and CCCA-07/08.

### 20.4 Source and evidence limitations

- KPMG's handbook compares different frameworks (including GHGP, ISSB/IFRS S2, ESRS and the SEC climate rule). Their requirements and applicability differ and may change. Before encoding any rule, validate it against the current primary source, effective date, jurisdiction, entity scope and applicable transition relief.
- King's methodology reflects the institution's own organisational boundaries, reporting calendar, available data and sector context. Use it as a template for documenting decisions and limitations, not as a universal factor policy or mandatory category set.
- No claim is made here that the listed capabilities are implemented, that the platform conforms to any framework, or that any emissions inventory has been independently assured.

## 21. Change log

| Date (UTC) | Change | Evidence / commit | Updated by |
|---|---|---|---|
| 2026-10-09 | Initial living project tracker established from the approved Technical Implementation and Security Hardening Brief and observed branch/PR state. Records P0/P1 work breakdown, acceptance criteria, current blockers, evidence rules and mandatory final-task handover. | This document; branch `hardening/ip-supply-chain-governance`; PR #21 | Project implementation session — individual task owner not assigned in this document |
| 2026-10-10 | Added traceability matrix against the user-provided Digital Catapult CCCA report and 12 explicit addenda covering open formats/APIs, verification, selective sharing, factor gaps, integrations, quality/lineage, calculation methods, boundaries/double counting, product carbon exchange/e-liability, XBRL, security/privacy and trust framework. Statuses distinguish existing design coverage from verified implementation. | CCCA report summary pp. 4–6 and detailed sections pp. 56–85; section 14 of this tracker | Project implementation session — independent review not yet performed |
| 2026-10-10 | Added a repository/documentation fit-gap assessment of Novisto's enterprise carbon accounting guide, 12 proposed capability items, safeguards, crosswalk to CCCA tasks and source/evidence limitations. Updated recorded branch head. | https://novisto.com/resources/carbon-accounting-guide; repository files listed in section 18; commit to be recorded after this change | Project implementation session — independent review not yet performed |
| 2026-10-10 | Expanded the detailed CCCA report fit-gap with six operational addenda covering data ownership, collection cadence, cleaning/quarantine, quality dimensions, transformation controls and auditable trend/report review. | CCCA report printed pp. 47–69 and 88–91; section 19 of this tracker | Project implementation session — independent review not yet performed |
| 2026-10-10 | Added fit-gap analysis of the user-provided KPMG GHG reporting handbook and King's College London carbon-accounting methodology; created ten GHGR addenda for category methodology, exclusions, GWP, restatements, factor-vintage alignment, uncertainty, offsets, report profiles, inventory principles and Scope 2 evidence. | User-provided handbook-ghg-emissions-reporting.pdf and carbon-accounting-methodology.pdf; section 20 of this tracker | Project implementation session — independent review not yet performed |
| 2026-10-10 | Synchronized tracker metadata with the observed repository HEAD; no task status, priority, acceptance criterion or execution order changed. P0 remains open pending real-PostgreSQL evidence; GHGR-01–GHGR-10 remain NOT STARTED. | Pre-update HEAD: `7fbfa80d0e70938cdd5731b9ca8ffcaaabdbffc2`; tracker metadata-only update | Project implementation session — independent review not yet performed |
| 2026-10-10 | Recorded observed CI evidence and explicitly retained the real-PostgreSQL gate: typecheck passed, unit suite failed 4/62; no real PostgreSQL scenarios ran. No task was marked complete. | [Workflow run #126](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38046517189); section 7 evidence log | Project implementation session — independent review not yet performed |
| YYYY-MM-DD | Describe the code/documentation change, status transition, test evidence and blocker/closure. | Commit SHA / CI run / evidence link | Name |

## 22. How this document must be maintained

- Update the relevant task row and findings register in the same change set as substantive implementation work, or in the immediately following documentation commit.
- Every status transition must include a date and evidence link in the change log.
- Do not delete previous findings or overwrite history without recording the reason.
- When a task fails validation, set it to **REJECTED / REWORK REQUIRED** or **IN PROGRESS**, describe the failure, and create a follow-up action.
- When an official source or licence cannot be verified, keep the affected factor/source blocked.
- Keep the tracker consistent with the actual branch, PR and latest workflow head. If the branch or PR changes, update the header and change log.
- Once the final declaration is submitted, preserve it in the PR discussion and link it here. The project approver then decides whether the work may enter independent validation.
- No task in this tracker grants permission to merge, deploy, or alter production.

## 23. Final acceptance principle

The programme is ready to be handed over for independent validation only when the evidence is complete and all exceptions are explicit. It is not automatically production-ready because code was committed, documentation was written, a subset of tests passed, or a CI workflow was green. P0 remains incomplete until the real PostgreSQL integration criteria are demonstrated. Any unresolved security, privacy, licensing, factor provenance, integration, regulatory, backup or operational risk must remain visible to the reviewer and approver.
