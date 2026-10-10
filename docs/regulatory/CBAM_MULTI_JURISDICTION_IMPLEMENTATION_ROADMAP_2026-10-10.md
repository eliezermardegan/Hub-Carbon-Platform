# CBAM Multi-Jurisdiction Implementation Roadmap

**Status:** Proposed delivery plan — not a declaration of regulatory compliance  
**Prepared:** 2026-10-10  
**Implementation priority:** EU-CBAM → UK-CBAM. Maintain an open-ended global jurisdiction/regime registry for Türkiye, India, Canada, Australia, Brazil and any future market; order implementation by verified legal status and product demand, not by a hard-coded country list.

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

### Phase 3 — All additional jurisdictions (watchlist first; implementation only after legal-scope validation)

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

### Global jurisdiction watchlist (open-ended; not a list of presumed CBAM laws)

This is a watchlist of regulatory signals and customer-market priorities, **not** a statement that every listed country has, or will enact, its own CBAM.

| Jurisdiction / regime signal | Current planning status | What the platform should track |
|---|---|---|
| European Union — EU-CBAM | Definitive regime in force from 1 January 2026 | Implement first against current binding EU law and official guidance. |
| United Kingdom — UK-CBAM | Primary legislation enacted; further implementation detail published in 2026; scheduled to begin 1 January 2027 | Prepare a separate UK regime package and keep monitoring force-of-law notices and rules as they are finalised. |
| Türkiye — domestic ETS and EU-CBAM trade exposure | Watchlist. Türkiye has enacted a Climate Law and is developing its national ETS; that is not the same as a Turkish CBAM. | Track ETS implementation, official source versions and EU exporter/importer data needs; create a border-adjustment module only if a separately verified regime requires one. |
| India — domestic carbon market / CCTS | Watchlist. India has a Carbon Credit Trading Scheme and GHG-intensity rules; these are not themselves a CBAM. | Track approved scheme rules, carbon-price evidence and trade-policy developments; do not infer a border tax. |
| Canada — industrial carbon pricing | Watchlist only. Current federal documentation describes industrial carbon-pricing systems; a federal progress report states that border carbon adjustments had been explored but are not planned for implementation in the near future. | Monitor federal/provincial policy and any official legal proposal. Do not schedule a Canadian CBAM implementation without a new verified legal basis. |
| Australia — Safeguard Mechanism | Watchlist. Existing domestic facility-level emissions controls are not a CBAM. | Track policy reviews, carbon-pricing eligibility and future official border-policy instruments separately. |
| Brazil and other Latin American countries | Discovery/watchlist; no region-wide “LATAM-CBAM” assumption | Verify country by country. Do not name a module “LBR-CBAM” unless the intended jurisdiction and authoritative legal instrument are unambiguous. |
| Any other country or supranational bloc | Open registry entry; initial status `watch` | Add whenever an official instrument, proposal, customer requirement or credible policy signal warrants review. |

Official starting references for the watchlist:
- EU definitive CBAM: https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en
- UK CBAM policy summary (updated 9 September 2026): https://www.gov.uk/government/publications/carbon-border-adjustment-mechanism-cbam-policy-summary/carbon-border-adjustment-mechanism-cbam-policy-summary
- Türkiye Directorate of Climate Change, national ETS work under the Climate Law: https://iklim.gov.tr/en/verification-assignments-completed-for-2025-greenhouse-gas-emissions-reports-news-4644
- India Bureau of Energy Efficiency, official CCTS / GHG-intensity scheme notices: https://beeindia.gov.in/show_content.php?lang=1&level=1&lid=294&ls_id=116
- Canada federal carbon-pricing systems: https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work.html
- Canada 2025 Emissions Reduction Plan progress report, including status of border carbon adjustments: https://www.canada.ca/content/dam/eccc/documents/pdf/climate-change/erp/2025-ERP-Progress-Report-EN-Canada-ca.pdf
- Australia Safeguard Mechanism (updated 7 August 2026): https://www.dcceew.gov.au/climate-change/emissions-reporting/national-greenhouse-energy-reporting-scheme/safeguard-mechanism

These sources establish signals and existing domestic systems, not a promise that a country will enact a CBAM. Recheck current status and primary legislation before any production rule is approved.

## Status discipline

This document is a delivery plan, not a legal opinion or compliance certificate. A green CI run proves only the tests and environment exercised by that run. EU-CBAM remains **not validated for production** until the acceptance gates above are met. UK-CBAM is a separate upcoming workstream. Brazil/other jurisdictions remain discovery-only until the applicable legal basis is verified.


## Global extensibility contract — avoid a country-count ceiling

The registry and code layout must support an open-ended number of jurisdictions and multiple distinct regimes within one jurisdiction. Do not implement a fixed enum or central switch statement that must be edited for every country, and do not treat “country” and “regime” as interchangeable identifiers.

Each independently versioned regulatory package must declare a reviewed manifest with at least:

- `jurisdictionId` (stable country/territory/bloc identifier) and `regimeId` (stable identifier for the actual legal instrument/programme).
- Lifecycle status: `watch`, `proposal`, `adopted_not_in_force`, `in_force`, `suspended`, `superseded`, or `withdrawn`.
- Official legal sources, source issuer, stable URLs, legal status, publication/effective dates, retrieval timestamp, source artifact hashes, version and reviewer.
- Ruleset version and effective-from/effective-to window; supported product-code system/version and explicitly supported product scope.
- Applicability inputs, methodology identifiers, required factor/evidence sources, reporting periods, liability/payment/reporting semantics and known unsupported cases.
- Release approval state, responsible regulatory owner, independent reviewer and next review date.

The package registry must allow several regimes for one jurisdiction and regional regimes spanning multiple jurisdictions. It must retain old versions for reproducibility, while making only explicitly approved/in-force versions eligible for live decisions. A proposal or watchlist entry may inform planning but **must never decide legal applicability, calculate a liability or produce a “compliant” status**.

### Required module boundaries

- **Shared platform:** deterministic unit-safe arithmetic; canonical GHG accounting; factor/source provenance; immutable ledger and evidence lineage; schema validation; report transport and audit infrastructure.
- **Jurisdiction/regime package:** goods coverage and code mappings; exemptions and thresholds; legal effective dates; required calculation methods; default values and benchmarks; qualifying carbon-price treatment; reporting/certification/filing obligations.
- **Integration adapters:** portals/APIs, registries and tax/payment systems are separate, explicitly authorised capabilities. A package must not imply an official submission merely because it can generate a report.
- **Review/control plane:** official-source monitoring, change proposals, source hash verification, legal interpretation review, tests, approvals, staged release, rollback and historical reassessment.

### Extensibility acceptance tests

1. Register a new synthetic jurisdiction without changing `carbon-core` or changing EU/UK business logic.
2. Reject unknown jurisdiction/regime IDs with an explicit unresolved result; never fall back to EU rules or a default rule.
3. Prove EU and UK packages cannot resolve each other’s rules, values, thresholds or report semantics.
4. Prove `watch` and `proposal` entries cannot be used for production applicability or monetary calculations.
5. Resolve rules by explicit obligation date and preserve old rule/source versions for audit replay.
6. Validate manifest/schema compatibility and reject unsigned, hash-mismatched, expired or unreviewed source bundles before activation.
7. Test a single jurisdiction with two separate regimes and a regional regime spanning multiple territories.
8. Verify every report identifies jurisdiction, actual regime, rule version, source provenance and unsupported scope.

The roadmap should grow by adding reviewed regulatory packages and registry data—not by creating a new carbon calculator per country, and not by pretending that every future jurisdiction has the same legal instrument.
