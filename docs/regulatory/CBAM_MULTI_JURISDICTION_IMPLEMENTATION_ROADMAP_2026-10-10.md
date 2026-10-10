# CBAM Multi-Jurisdiction Implementation Roadmap

**Status:** Proposed delivery plan — not a declaration of regulatory compliance  
**Prepared:** 2026-10-10  
**Priority order:** EU-CBAM → UK-CBAM → Brazil/other jurisdictions after legal-scope validation

## Decision

Deliver EU-CBAM first because the EU definitive regime applies from 1 January 2026 and the repository already contains an EU-CBAM end-to-end test seam. Prepare UK-CBAM next, in parallel at the requirements/source-review level because the UK regime is scheduled to apply from 1 January 2027. Design jurisdiction boundaries now so future regimes can be added without borrowing rules, thresholds, factors, or effective dates from another jurisdiction.

The company’s UK domicile does not itself determine which CBAM regime a customer needs. Applicability depends on the relevant goods, import destination, liable person, dates, thresholds, and jurisdiction-specific law.

## Important naming and scope note

“LBR-CBAM” is not treated here as an established official regulatory regime. If the intended future market is Brazil, use **Brazil / BR** as a provisional product identifier only; verify the country-specific legal scope and terminology against primary Brazilian sources before naming or implementing a regulatory adapter. Do not imply that Brazil has an EU-equivalent CBAM without authoritative evidence. Latin America is not one legal jurisdiction; assess each target country independently.

## Delivery phases

### Phase 0 — Regulatory source register and scope lock

- Create a reviewed source register for each jurisdiction: legal instrument, official guidance, publication/effective date, retrieval date, version/hash, source authority, and affected rule IDs.
- Separate binding legal text from explanatory web pages and downloadable convenience spreadsheets.
- Record products by jurisdiction-specific commodity/CN/HS code, exclusions, thresholds, liable-party rules, accounting periods, filing/payment obligations, and transitional arrangements.
- Require regulatory/legal review to approve scope and interpretation before a rule can be marked production-eligible.
- Do not copy values from synthetic tests or old fixtures into production rule bundles.

### Phase 1 — EU-CBAM (active priority)

Implement and validate against the EU definitive regime and currently effective official sources:

- Product scope and commodity-code mapping, including exclusions and applicable thresholds.
- Embedded-emissions calculation by applicable goods/sector and precursor treatment; direct/indirect emissions only where the current EU rules require them.
- Verified actual emissions versus legally applicable default values, with explicit method selection and provenance.
- Carbon price paid in a third country, where legally deductible and adequately evidenced.
- Applicable benchmarks, certificate price/time basis, reporting/declaration periods, authorised declarant requirements, and applicable simplifications.
- Rule effective dates and versioned source bundles; never silently overwrite a historical rule set.
- Audit trail for inputs, units, conversions, factor IDs, source versions/hashes, calculation engine version, outputs, and corrections.

The repository currently has an EU-CBAM end-to-end test using synthetic factors and a test rule. This is useful scaffolding, not proof of legal correctness or production readiness. Replace synthetic fixtures only after the official source values/methods are verified and independently reviewed.

### Phase 2 — UK-CBAM (next adapter; preparation starts now)

Build a separate UK ruleset; do not reuse EU liability or calculation logic merely because sectors overlap. Verify the current UK primary legislation and HMRC/HM Treasury guidance, including:

- Effective date and goods defined by UK commodity codes.
- Registration/liability threshold and liable person.
- Direct emissions and precursor treatment; UK guidance currently states indirect emissions are delayed until 2029 at the earliest.
- Actual versus default emissions data, tax-rate calculation and UK ETS/free-allocation interactions.
- Accounting periods, return and payment deadlines, qualifying carbon-price relief, records and audit evidence.

Re-check all sources immediately before release because legislation, implementation details and published rates may change.

### Phase 3 — Brazil and additional jurisdictions (requirements discovery only until validated)

- Confirm the intended jurisdiction and actual regulatory instrument using primary government/legal sources.
- Define a jurisdiction-specific adapter only after a documented legal scope review.
- If no applicable CBAM exists, do not manufacture a regime; support relevant carbon-accounting/reporting requirements under their correct names instead.
- Add future jurisdictions through configuration and versioned rule packages, not hard-coded assumptions or a shared global “CBAM rate”.

## Shared engine boundaries

Keep the common platform limited to reusable, non-jurisdictional primitives:

- Typed quantities, units, conversions, and deterministic arithmetic.
- Evidence objects, immutable/versioned factor references, calculation lineage, and reproducible outputs.
- Source registry and artifact hashes.
- Rule package metadata: jurisdiction, instrument, version, effective-from/to, scope, approval state.
- Test harnesses and golden cases with explicit provenance.

Jurisdiction adapters own product scope, legal eligibility, thresholds, prescribed methodologies, default values, rates, reporting periods, and filing semantics. A calculation must fail closed when a required rule/source/version is missing or expired; it must not silently fall back to another jurisdiction or synthetic defaults.

## Acceptance gates for an EU-CBAM release candidate

1. Each implemented requirement maps to an in-force official source and a reviewed interpretation.
2. Official values and methods are independently checked against source artifacts; downloadable convenience files are not assumed to override binding acts.
3. Tests cover effective-date boundaries, in-scope/out-of-scope goods, thresholds, units, missing evidence, default/actual pathways, precursor chains, third-country carbon-price evidence, and rounding.
4. Golden examples are reproducible and traceable to source/version; synthetic fixtures remain clearly marked as test-only.
5. No cross-jurisdiction rule leakage: EU tests cannot resolve UK rules and vice versa.
6. Security, tenant isolation, authorization, privacy/legal review, and independent regulatory review pass.
7. Reports clearly distinguish “calculation support” from “filing submitted”, “declarant authorised”, or “legally compliant”. No such status is inferred from a successful calculation alone.

## Infrastructure and data residency

The Neon project/branch is a staging infrastructure task, not a regulatory implementation milestone. Use synthetic data only. Before live tenant data, decide data residency, transfer/access arrangements, retention/deletion, backups, secrets, role ownership, effective privileges, RLS, and independent review. A region selection alone does not establish legal compliance. Do not run the mutating CI harness against staging; use the reviewed read-only SQL audit for database checks.

## Official starting points

### European Union

- European Commission — CBAM definitive regime: https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en
- European Commission — CBAM legislation and guidance, including current default values and benchmarks: https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-legislation-and-guidance_en
- Regulation (EU) 2025/2083 (amending the CBAM framework): https://eur-lex.europa.eu/eli/reg/2025/2083/oj
- Commission Implementing Regulation (EU) 2025/2621 on default values, read together with later amendments including Implementing Regulation (EU) 2026/1740; verify the currently consolidated binding text before encoding values.
- Commission Implementing Regulation (EU) 2025/2620 on CBAM benchmarks: verify current text and amendments before encoding values.

### United Kingdom

- GOV.UK — UK Carbon Border Adjustment Mechanism policy and legislation: https://www.gov.uk/government/publications/introduction-of-carbon-border-adjustment-mechanism
- GOV.UK — UK CBAM policy summary: https://www.gov.uk/government/publications/carbon-border-adjustment-mechanism-cbam-policy-summary/carbon-border-adjustment-mechanism-cbam-policy-summary
- GOV.UK — registration guidance: https://www.gov.uk/guidance/work-out-the-date-youll-need-to-register-for-carbon-border-adjustment-mechanism-cbam

### Brazil / other future jurisdictions

No jurisdiction-specific CBAM rules are approved by this roadmap. Find and review primary legal and government sources for each country before creating a ruleset.

## Status discipline

This document is a delivery plan, not a legal opinion or compliance certificate. A green CI run proves only the tests and environment exercised by that run. EU-CBAM remains **not validated for production** until the acceptance gates above are met. UK-CBAM is a separate upcoming workstream. Brazil/other jurisdictions remain discovery-only until the applicable legal basis is verified.
