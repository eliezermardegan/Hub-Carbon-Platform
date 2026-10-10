# ADR-002: Google Workspace-First Operational Tooling

- **Status:** Accepted as the preferred operating principle; actual subscription edition and admin settings must be verified
- **Date:** 2026-10-10
- **Decision owners:** Hub Carbon Platform maintainers / company administrator
- **Related:** ADR-001 (regulatory boundary), CBAM multi-jurisdiction implementation roadmap

## Context

The company already has access to Google Workspace and wants to avoid unnecessary applications, databases, subscriptions and duplicate stores. The platform also requires durable transactional data, deterministic carbon calculations, tenant isolation, legal-source provenance, traceable regulatory decisions, reliable backups and future multi-jurisdiction expansion.

Google Workspace is a strong home for collaboration, office documents, source-review records and operational governance. It is not a relational transactional database and must not become the system of record for calculation ledgers or runtime regulatory decisions merely to reduce the number of products.

This decision prefers services already included in the company's actual Workspace subscription and enabled by its administrator. It does not presume a particular edition, license, policy setting, region, retention configuration or admin permission. Confirm the actual edition and included features in the Admin console before adopting an optional capability.

## Decision

**Use Google Workspace first for collaboration and document governance; keep PostgreSQL as the application system of record. Avoid adding paid tools unless a concrete requirement cannot be met safely with existing entitlements.**

### 1. Preferred uses for Google Workspace

| Need | Preferred tool | System-of-record boundary |
|---|---|---|
| Policies, ADRs, operating procedures, review packs | Google Drive + Docs | Documents and review artefacts; approved runtime policy remains versioned in Git |
| Regulatory/source inventory and review queue | Google Sheets (or Drive-hosted structured files) | Tracking/index only; not the live rule engine or authoritative factor database |
| Human review and approval records | Docs/Drive comments and controlled review records | Approval evidence must identify reviewer, date, source version and decision; do not treat a casual comment as a deploy approval unless the release process says so |
| Intake of internal requests, if already included and approved | Google Forms / AppSheet Core where licensed and configured | Workflow/front-end only; validate and authorize server-side before changing platform records |
| Calendar, tasks, alerts, correspondence | Calendar, Tasks, Gmail | Operational communications; retain formal legal or release decisions in the designated durable record |
| Access to internal files and collaboration | Workspace identity and access groups | Sharing permissions do not replace application-level authentication, tenant authorization, object-level checks or database policy |
| Data extracts for review | Drive with restricted permissions and documented retention | Minimise fields, use synthetic or redacted datasets where possible, and never place credentials/secrets in Sheets or Docs |

Do not assume that optional products (AppSheet, Vault, data regions, advanced security or APIs) are enabled or included for this company's specific edition. Verify entitlement, admin policy, retention and access before relying on them.

### 2. Keep PostgreSQL for application and regulatory records

Keep PostgreSQL as the transactional persistence layer for, at minimum:

- Tenant, user-to-tenant authorization references and application records.
- Normalized activity data, factor references/snapshots, calculation results and append-only ledger events.
- Idempotency/recovery state, regulatory decisions, report versions, and source/evidence references.
- Versioned runtime rule packages and release/activation state where the reviewed architecture places them.

PostgreSQL remains subject to the repository's role separation, RLS/FORCE RLS, least-privilege grants, transaction-local tenant context, append-only guarantees, audit and recovery tests. Google Drive or Sheets must not bypass these controls.

**Do not use Google Sheets as a replacement for PostgreSQL tables or the immutable Carbon Ledger.** A spreadsheet may hold the review index or a human-readable export, but the API/database is the authoritative application state.

### 3. Hosting and database choice

- Keep the existing Neon project as a **staging candidate only** while the current audit and security gates are completed. No migration or schema change is authorised by this ADR.
- Do not assume Neon must be the production database or that moving to Google Cloud is automatically cheaper.
- If the company wants a single cloud provider for application hosting and database, assess Google Cloud Run + Cloud SQL for PostgreSQL as an alternative. Cloud SQL is a separate Google Cloud service with its own billing, configuration and operating responsibilities; it is not included merely because the company subscribes to Google Workspace.
- Compare the current Neon option and Cloud SQL against total monthly cost, production availability, backup/restore, connection pooling, private networking, secrets, observability, point-in-time recovery, tenant isolation, region, data-processing terms, portability and support.
- Make the production hosting decision in a separate reviewed ADR with an explicit estimate and rollback/migration plan. Do not copy production data into Workspace to simplify migration.

### 4. Source-of-truth and change workflow

1. Official regulations, official default-value tables and other source artifacts are acquired only from authorised sources and with a lawful reuse basis. Store the exact source artifact in Git or a controlled Drive folder only where terms permit.
2. Record issuer, official URL, legal status, publication/effective dates, retrieval date, artifact SHA-256, licence/reuse basis, parser/transformation version and independent reviewer.
3. Use a Drive/Sheets index for triage and ownership if helpful, but mergeable, versioned rule/factor changes must be reviewed and stored in the repository's governed change process.
4. Production rule activation requires an explicit approval state, valid effective dates, verified source hashes, relevant test evidence and independent legal/regulatory review; a row changed in Sheets is not sufficient.
5. Keep the original source/version and decision history. New interpretations create traceable new versions or reassessments; do not silently rewrite past calculations or reports.

### 5. Security, privacy and residency

- Use managed Workspace users/groups, MFA and least privilege where available; disable unnecessary external sharing and periodically review access.
- No service-account keys, database connection strings, passwords, API tokens, personal data exports or confidential customer emissions evidence in broadly shared docs or spreadsheets.
- Prefer synthetic or redacted examples in Drive during staging and testing. Restrict access to actual customer evidence to named users with a documented business need and retention basis.
- Verify the actual Workspace edition, enabled services, audit capabilities, retention/deletion controls and processor terms before using Workspace as a formal evidence repository.
- Google Workspace data-region controls, where supported by the actual edition and applicable service, offer choices described by Google as United States, Europe or no preference. “Europe” is not a promise of UK-only storage. Review Google's documented coverage and processing locations for each service; do not infer that selecting a region alone proves GDPR, UK GDPR or international-transfer compliance.
- If choosing Cloud SQL, select the actual database region and assess backups, logs, replicas, support access and other processing; the location of the primary database alone does not settle residency or transfer questions.

### 6. Connector/tooling availability

The Google Drive connector inside the ChatGPT environment was observed as disabled by administrator policy at the time this ADR was written. This is an integration restriction for this interface, not evidence that the company's Google Workspace account is unavailable. Do not attempt to bypass administrator policy or assume direct Drive read/write access. Repository changes should continue through the authorised GitHub workflow until an approved connector is enabled.

## Rejected alternatives

### Put the whole platform in Google Sheets / Drive

Rejected: these products are not a substitute for the transactional database, authorization model, concurrency/idempotency controls, append-only ledger and deterministic calculation pipeline. Spreadsheet edits also do not provide the same versioned release gate and replayability guarantees.

### Add multiple SaaS tools before checking existing entitlements

Rejected: this creates cost, duplicate systems, identity sprawl, more subprocessors and additional retention/access policies. Propose an additional tool only when a documented need remains after checking the current Workspace edition and existing stack.

### Automatically migrate the database to Google Cloud

Rejected as premature: Workspace subscription does not include Cloud SQL by default. A move creates separate billing, IAM, network, backup, monitoring and migration work. Evaluate it against actual requirements and cost before deciding.

## Acceptance actions

1. Company administrator confirms the actual Workspace edition, included applications, API availability, data-region eligibility, security controls and retention features.
2. Create or designate a restricted Drive space for architecture decisions, regulatory source reviews, privacy/security evidence and formal approvals.
3. Define an access group and a least-privilege sharing policy; prohibit public links for sensitive review packs.
4. Document which records belong in Git, Drive/Docs, Sheets, PostgreSQL and operational logs.
5. Add a production hosting/database comparison (Neon vs Cloud SQL or other approved PostgreSQL host) with total cost and security/residency criteria before production selection.
6. Complete the open live staging role/RLS audit using the approved read-only SQL auditor only; the CI mutating harness remains disposable-CI-only.
7. Keep PR #21 draft/open and retain independent security, privacy and regulatory review gates.

## Official reference points

- Google Workspace Business edition comparison: https://support.google.com/a/answer/6043385?hl=en
- Google Workspace plans/features: https://workspace.google.com/pricing
- Google Workspace data-region controls and covered data: https://support.google.com/a/answer/14310028?hl=en-GB
- Google Cloud SQL for PostgreSQL overview: https://docs.cloud.google.com/sql/docs/postgres/introduction
- Google Cloud SQL pricing: https://cloud.google.com/sql/pricing

These sources describe product features and commercial/service boundaries. They do not establish which SKU, controls, regions or permissions this company actually has; those require confirmation by its Workspace/Cloud administrator.
