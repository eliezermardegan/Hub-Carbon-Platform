# EU CBAM — Official Source Registry

**Status:** Source inventory only. This file does not encode legal rules or certify compliance.
**Registry schema version:** 1.0.0
**Reviewed on:** 2026-10-09
**Scope:** European Union Carbon Border Adjustment Mechanism (CBAM).

## Status conventions

- **catalogued**: official publisher URL and source identity recorded.
- **needs-legal-review**: verify consolidated text, amendments, interpretation and effective dates before implementing executable rules.
- **historical-test-only**: suitable for reproducing a historical example, not as authority for definitive-period calculations.
- Publication date, entry into force, application date and individual obligation effective dates are distinct. Do not substitute one for another.
- Prefer the current consolidated legal text. URLs below are official EUR-Lex or European Commission sources.

## Sources

### CBAM-BASE-2023-956 — Foundational regulation
- **Publisher:** European Parliament and Council
- **Instrument:** Regulation (EU) 2023/956 establishing a carbon border adjustment mechanism
- **Official ELI:** https://eur-lex.europa.eu/eli/reg/2023/956/oj
- **Scope:** CBAM framework, goods, declarants, embedded emissions, declarations, certificates, verification and governance.
- **Temporal note:** Transitional period 1 October 2023–31 December 2025; definitive period begins 1 January 2026, subject to amendments and provision-specific application dates.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** verify current consolidated text, annexes and amendments before encoding coverage or obligations.

### CBAM-SIMPLIFICATION-2025-2083 — Simplification and scope amendment
- **Publisher:** European Parliament and Council
- **Instrument:** Regulation (EU) 2025/2083 amending Regulation (EU) 2023/956 to simplify and strengthen CBAM
- **Official ELI:** https://eur-lex.europa.eu/eli/reg/2025/2083/oj
- **Scope:** amendments to the CBAM framework, including simplification measures and a mass-based exemption threshold.
- **Temporal note:** amended provisions may have different application dates; verify the specific article and consolidated text.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** do not hard-code a threshold from a summary; capture measurement period, aggregation scope, exceptions and application date.

### CBAM-CALC-2025-2547 — Calculation of embedded emissions
- **Publisher:** European Commission
- **Instrument:** Commission Implementing Regulation (EU) 2025/2547 laying down rules for methods for calculating embedded emissions in goods
- **Official ELI:** https://eur-lex.europa.eu/eli/reg_impl/2025/2547/oj
- **Scope:** embedded-emissions calculation methodology under the definitive-period framework.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** model production route, precursor treatment, emissions scope, data hierarchy and fallback separately, with exact article/annex citations.

### CBAM-DEFAULT-VALUES-2025-2621 — Default values
- **Publisher:** European Commission
- **Instrument:** Commission Implementing Regulation (EU) 2025/2621 on default values for calculating embedded emissions
- **Official ELI:** https://eur-lex.europa.eu/eli/reg_impl/2025/2621/oj
- **Scope:** default values and conditions of use.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** every value must carry source provision/table, version, unit, goods scope, geography, validity interval and applicability conditions. Never store a naked numeric value.

### CBAM-VERIFICATION-2025-2546 — Verification principles
- **Publisher:** European Commission
- **Instrument:** Commission Implementing Regulation (EU) 2025/2546 on verification principles for declared embedded emissions
- **Official ELI:** https://eur-lex.europa.eu/eli/reg_impl/2025/2546/oj
- **Scope:** verification principles and requirements.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** preserve verifier/accreditation references, evidence references, reporting period and rule version separately from emissions results.

### CBAM-CERTIFICATE-PRICE-2025-2548 — Price of CBAM certificates
- **Publisher:** European Commission
- **Instrument:** Commission Implementing Regulation (EU) 2025/2548 on calculation and publication of the price of CBAM certificates
- **Official ELI:** https://eur-lex.europa.eu/eli/reg_impl/2025/2548/oj
- **Adopted:** 10 December 2025; published in the Official Journal on 22 December 2025.
- **Application:** 1 January 2026 (Article 9).
- **Scope:** Quarterly certificate prices for 2026 and weekly price methodology from 2027.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** treat certificate-price calculation as a separate financial/reporting rule family, not an emissions calculation.


### CBAM-AUTHORISED-DECLARANT-2025-486 — Authorised CBAM declarant status
- **Publisher:** European Commission
- **Instrument:** Commission Implementing Regulation (EU) 2025/486 on conditions and procedures related to the status of authorised CBAM declarant
- **Official ELI:** https://eur-lex.europa.eu/eli/reg_impl/2025/486/oj
- **Adopted:** 17 March 2025; published in the Official Journal on 18 March 2025.
- **Status:** catalogued; needs-legal-review.
- **Implementation gate:** model authorisation eligibility, status, validity and evidence independently from emissions calculations; verify current text and application provisions before encoding.

### CBAM-COMMISSION-GUIDANCE-TRANSITIONAL-EAF — Historical worked example
- **Publisher:** European Commission, DG TAXUD
- **Document:** Guidance document on CBAM implementation for installation operators outside the EU
- **Official document:** https://taxation-customs.ec.europa.eu/system/files/2023-12/Guidance%20document%20on%20CBAM%20implementation%20for%20installation%20operators%20outside%20the%20EU.pdf
- **Pinpoint:** Section 7.2.2.2, Example 2 — EAF and conversion to iron or steel products; Tables 7-11 to 7-14.
- **Repository use:** historical golden-test provenance only.
- **Status:** historical-test-only.
- **Fixture values:** 1.440 tCO2/t direct, 1.732 tCO2/t indirect, 3.171 tCO2/t total as displayed in the source, and 317.2 tCO2 for the 100 t import example.
- **Caveat:** displayed direct and indirect values sum to 3.172; the source's 3.171 total reflects underlying unrounded values. This example is not the definitive-period production methodology.

## Immutable provenance contract

Every source snapshot used for a rule must record:
- stable source ID, instrument/document identifier, publisher and official URL/ELI;
- title, document/consolidation version and retrieval timestamp;
- publication, entry-into-force and application dates as distinct fields where applicable;
- exact article, annex, table or section;
- SHA-256 digest of the exact retrieved artifact where technically and legally permissible;
- reuse/licensing notes and whether the original artifact is stored or only referenced;
- reviewer, review status and supersession links.

Every executable rule must separately record stable rule ID, immutable rule version, effective-from/effective-to dates, source IDs and pinpoint provisions, jurisdiction, goods/activity scope, rationale, required inputs/evidence, tests and the commit that introduced it.

Do not mutate historical source or rule records in place. Add a new version and preserve past decisions with their original context, rule/source versions and evidence references.

## Production-rule gate

No production EU CBAM rule should be enabled until:
1. Current consolidated legal text, amendments and corrections are checked.
2. Every criterion has an exact official legal pinpoint and effective date.
3. A legal/compliance reviewer approves the interpretation.
4. Positive, negative, boundary-date, missing-data and historical-regression tests exist.
5. Review confirms the rule does not mutate canonical carbon-accounting results.
