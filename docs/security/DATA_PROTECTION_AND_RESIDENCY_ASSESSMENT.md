# Data Protection, Data Flow and Residency Assessment

- **Status:** IN PROGRESS — evidence collection required; not a compliance attestation
- **Last reviewed:** 2026-10-10
- **Repository:** Hub Carbon Platform
- **Related PR:** [#21](https://github.com/eliezermardegan/Hub-Carbon-Platform/pull/21)
- **Related tracker:** [Technical Implementation & Security Hardening](../project-management/TECHNICAL_HARDENING_PROJECT_TRACKER.md)
- **Decision owner:** UNASSIGNED
- **Independent privacy/legal reviewer:** UNASSIGNED

## 1. Purpose and limits

This is an implementation-facing evidence register for the project team. It identifies the deployment facts, data flows, contracts and controls that must be collected before making claims about GDPR/UK GDPR compliance, data residency, retention, deletion, or international transfers.

Repository inspection alone does not establish where a deployed service stores or accesses data. Items marked **VERIFY** are questions, not assertions that the corresponding service exists. Do not enter secrets, customer records, credentials, personal data samples or unrestricted production logs in this file. Link to approved, access-controlled evidence instead.

This document is not legal advice, a completed DPIA, a transfer assessment, a DPA, or a statement that the product is compliant.

## 2. Applicable reference framework

Use the applicable law and current official guidance, as confirmed by qualified counsel/privacy owner for the actual processing context:

- **EU GDPR (Regulation (EU) 2016/679):** Article 5 (principles), Article 6 (lawfulness), Articles 12–14 (transparency), Article 25 (data protection by design/default), Article 28 (processor terms), Article 30 (records of processing), Article 32 (security), Article 35 (DPIA where required), and Chapter V (international transfers). Official text: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng/
- **UK GDPR / Data Protection Act 2018:** confirm the applicable UK provisions and any amendments in force for the processing and transfer dates. The ICO notes its international-transfer guidance was updated on 15 January 2026 and now uses the term “data protection test” in the relevant UK context. Official guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/a-guide-to-international-transfers/ and https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/completing-a-transfer-risk-assessment/
- **DPIA screening and process:** determine whether processing is likely to result in high risk; document the screening outcome and, where required, the DPIA, mitigations and consultation decision. Official ICO guidance: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/

Legal scope, controller/processor roles, lawful basis, retention periods and transfer mechanisms must be decided from the actual business purpose, contracts, data and deployment—not from this checklist alone. Verify source pages and legal amendments again when completing the assessment.

## 3. System and data-flow inventory

For every row, record the actual vendor/service, environment, legal entity, region(s), subprocessors, data categories, access paths, retention, deletion behavior, contractual evidence, and owner. If a component is not used, mark **NOT USED** with the evidence/source that supports the determination.

| ID | System / flow to verify | Data and risk questions | Evidence required | Initial status |
|---|---|---|---|---|
| DP-01 | Primary PostgreSQL database and replicas | Tenant identifiers, activity data, actor IDs, audit records, factor snapshots; primary/replica regions; operator access; encryption; backups | Infrastructure inventory, provider region settings, DB role configuration, DPA, backup topology | VERIFY |
| DP-02 | Object/file storage and source documents | Invoices, utility statements, supplier reports, identifiers, file metadata; region, versioning, public access, lifecycle and delete propagation | Bucket/container configuration, access policy, region, retention/lifecycle policy, vendor terms | VERIFY |
| DP-03 | Intake and temporary processing | Uploaded bytes, parsed fields, temporary files, queues, retry/dead-letter payloads | Deployment diagram, queue config, temp-storage policy, logs/redaction and deletion evidence | VERIFY |
| DP-04 | OCR, AI, extraction or classification providers | Whether personal/customer data is sent to a model/provider; training/retention terms; region; subprocessors; human review | Actual provider/config, contract/DPA, no-training/retention settings if applicable, transfer analysis | VERIFY / NOT USED |
| DP-05 | Application/API, background workers and scheduled jobs | Tenant authorization, service identities, request payloads, exports, retries, cross-tenant access | Endpoint/job inventory, authz tests, IAM policies, deployment architecture | VERIFY |
| DP-06 | Logs, traces, crash reports and analytics | Identifiers, IP addresses, request bodies, document snippets, secrets; access and retention | Logging config, sample redacted schema, retention policy, processor terms | VERIFY |
| DP-07 | Backups, snapshots, PITR and disaster recovery | Regions, encryption/key ownership, retention, restore access, deletion propagation, RPO/RTO | Backup/replica inventory, key-management evidence, restore exercise, retention and deletion policy | VERIFY |
| DP-08 | Support, administration and incident tooling | Support access, tickets, screen captures, exports, privileged access and locations | Access roster, MFA/SSO settings, support process, vendor agreements, audit logs | VERIFY |
| DP-09 | Customer integrations and exports | ERP/accounting/procurement/fleet/utility/supplier endpoints, recipients, authentication, transfer destination | Integration inventory, data contracts, credentials handling, recipient and transfer register | VERIFY / NOT USED |
| DP-10 | CI/CD and test infrastructure | Test fixtures, artifacts, workflow logs, source bundles, secrets, database test service | Workflow definitions, artifact retention, repository access settings, secret-handling evidence | PARTIAL — inspect each workflow |
| DP-11 | Factor/source provenance | Public-source records vs customer-specific evidence; external factor artifact licensing and hash provenance | Source matrix, data provenance policy, source artifact/version/licence evidence | PARTIAL — factor candidates remain blocked where source proof is missing |

## 4. Processing record to complete

Create one record per distinct purpose and processing operation. Do not assume a single lawful basis or retention period covers every purpose.

| Field | Required record |
|---|---|
| Controller / processor / subprocessor roles | Legal entity names and role rationale; attach signed contract/DPA references |
| Purpose | Specific business purpose, separated by processing operation |
| Data subjects and personal-data categories | Include employee/supplier contact data and identifiers only if actually processed; document sensitive/special-category data assessment |
| Data sources and recipients | Direct collection, customer upload, integrations, vendors and onward recipients |
| Lawful basis / special-category condition if relevant | Decision, rationale, necessity/proportionality and approving legal/privacy owner |
| Transparency | Applicable privacy notice, point of collection, controller identity, purposes, basis, recipients, retention and rights |
| Data minimisation | Fields required, optional fields, redaction, pseudonymisation and prohibited data |
| Accuracy and provenance | Source reference, validation, correction process and audit trail |
| Retention | Purpose-specific period, trigger, legal hold, backup expiry and approval |
| Data-subject rights | Access, rectification, erasure/restriction/objection where applicable, portability where applicable, response owner and workflow |
| Security | Access controls, tenant isolation, encryption, key management, logging, vulnerability/incident response |
| Transfers | Countries and legal entities receiving/accessing data; applicable transfer mechanism and assessment where required |
| DPIA screening | Screening questions, outcome, date, owner; full DPIA and consultation if required |
| Evidence | Links to approved, access-controlled contracts, configs, test results and decision records |
| Owner and review date | Named accountable owner, approver and next review date |

## 5. Required control decisions and tests

- [ ] Map every production and non-production data store, replica, backup, queue, log and external processor.
- [ ] Verify actual physical/contractual locations and remote-access locations; do not infer location from a vendor's marketing page or the region of the primary database alone.
- [ ] Define tenant-level access control across APIs, background jobs, documents, exports, support and administrative paths—not only the ledger adapter.
- [ ] Document encryption in transit and at rest, key ownership/rotation, privileged access and auditability.
- [ ] Define data retention, deletion and backup-expiry behavior; test deletion/retention behavior in a disposable environment.
- [ ] Determine whether immutable ledger evidence can contain personal data; minimize it and document how rights, correction, restriction and legal holds are handled without making unsupported claims that a hash automatically anonymizes data.
- [ ] Inventory every processor/subprocessor and verify contract terms, data-use/training, retention, security, breach assistance and subprocessors.
- [ ] Determine whether each cross-border access/transfer is in scope and document the correct EU/UK mechanism and assessment with legal/privacy review.
- [ ] Complete DPIA screening and conduct a DPIA if required; record mitigations and any residual high risk.
- [ ] Define incident/breach detection, escalation, notification decision ownership and evidence preservation.
- [ ] Review actual data deletion, export, access and correction workflows against product requirements and applicable law.
- [ ] Record a signed-off decision on any data-residency commitment before making customer-facing claims.

## 6. Evidence register and action ownership

Use immutable commit/run links where possible. Store sensitive contractual or infrastructure evidence in approved restricted-access systems and reference it here by identifier only.

| ID | Action | Owner | Evidence / link | Status | Next step |
|---|---|---|---|---|---|
| DP-A01 | Produce deployment and data-flow diagram | UNASSIGNED | Pending | IN PROGRESS | Identify hosting, database, storage, queues, logging, support and vendors |
| DP-A02 | Confirm controller/processor roles and lawful bases | UNASSIGNED — privacy/legal | Pending | BLOCKED on business/contract facts | Gather product purposes, customer contracts and processing inventory |
| DP-A03 | Complete processor/subprocessor register and contract review | UNASSIGNED | Pending | IN PROGRESS | Obtain actual vendor list and DPAs |
| DP-A04 | Complete international-transfer analysis | UNASSIGNED — privacy/legal | Pending | BLOCKED on locations/recipient facts | Identify recipient legal entities, access countries and applicable regimes |
| DP-A05 | Complete DPIA screening; full DPIA if required | UNASSIGNED — privacy/legal | Pending | IN PROGRESS | Evaluate actual data, scale, monitoring, technology and risk to individuals |
| DP-A06 | Verify retention, deletion, backup expiry and restore behavior | UNASSIGNED — engineering/operations | Pending | IN PROGRESS | Define schedules and run isolated tests; no production changes in this task |
| DP-A07 | Review tenant/object-level authorization outside ledger | UNASSIGNED — engineering/security | PR #21 ledger tests only; broader surface not evidenced | IN PROGRESS | Inventory API/jobs/files/exports/support/admin paths |
| DP-A08 | Approve any residency/compliance statements | UNASSIGNED — project approver/legal | Pending | BLOCKED | No claim until evidence and review are complete |

## 7. Acceptance criteria

This assessment is complete only when:

1. Every system/flow row is confirmed as used or not used with evidence.
2. Processing purposes, roles, data categories, lawful basis, retention, recipients and rights workflows have accountable owners and documented decisions.
3. Actual locations, subprocessors and transfers are evidenced and reviewed for applicable EU/UK rules.
4. DPIA screening is documented and any required DPIA/mitigation/consultation is completed.
5. Security, deletion, retention, backup and incident-response controls have test or configuration evidence appropriate to the deployment.
6. Unresolved gaps have severity, owner, target date and an explicit release decision.
7. An independent privacy/legal reviewer records review outcome.
8. The project approver authorizes any external compliance or residency statement based on the evidence.

Until then, status remains **IN PROGRESS — not a compliance attestation**.

## 8. Change log

| Date | Change | Evidence |
|---|---|---|
| 2026-10-10 | Initial evidence-oriented data protection, data-flow and residency assessment created. It records unknown deployment facts as verification tasks, cites official EU/UK sources, and makes no compliance or residency claim. | PR #21; official source links in Section 2 |


## 10. Latest code-level validation and unresolved deployment evidence — 2026-10-10

The code-level API trust-boundary and intake retry changes passed [Test CI #226](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541702) (98 passed, 0 failed, 0 skipped, PostgreSQL 16.15), [Supply Chain Security #146](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541923) and [Factor Provenance Gate #141](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38058541687) on exact code head 3a02d2b7081b93e9bdd920b7be2db7f396e88745. These are code/test results, not evidence of deployed identity configuration, data residency, retention/deletion, processor contracts, backup/restore, or legal compliance. The current documentation refresh needs its own CI checks.
