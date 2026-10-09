# EU CBAM official source register

**Registry status:** source metadata only; no production compliance rules are implemented by this change.
**Registry reviewed on:** 2026-10-09
**Jurisdiction:** European Union
**Regime:** Carbon Border Adjustment Mechanism (CBAM)

## Purpose and safety boundary

This register identifies official legal instruments and Commission guidance that must be consulted before implementing EU CBAM rules. It is not legal advice and is not itself a legal interpretation. A source's inclusion does not mean every provision applies to every product, importer, reporting period or transaction.

The 2023 transitional-period EAF worked example in `legal/EU_CBAM_TEST_DATA.md` remains a historical golden-test fixture only. It must not be used as a definitive-period compliance rule or as a source of 2026 default values.

## Primary and secondary sources

| Source ID | Instrument / source | Official identifier | Date / applicability notes | Intended use |
|---|---|---|---|---|
| `EU-CBAM-BASIC-2023-956` | Regulation (EU) 2023/956 establishing CBAM | CELEX 32023R0956 | Basic act; use the current consolidated text and amendment history, not the original text alone. Definitive regime applies from 2026 under the amended framework. | Legal scope, goods in Annex I, declarant obligations, declarations, embedded-emissions framework, certificates and evidence duties. |
| `EU-CBAM-AMEND-2025-2083` | Regulation (EU) 2025/2083 amending the CBAM framework | CELEX 32025R2083 | Amending act; assess amendments against the basic act and subsequent implementing/correcting acts. | Scope and procedural changes, including the mass-based threshold framework. |
| `EU-CBAM-CALC-2025-2547` | Commission Implementing Regulation (EU) 2025/2547 on methods for calculating emissions embedded in goods | CELEX 32025R2547 | Adopted 2025-12-10; published 2025-12-22; applies to definitive-period calculation methodology from 2026. | Actual-emissions monitoring, attribution to goods, reporting periods, calculation methods and supporting records. |
| `EU-CBAM-DEFAULTS-2025-2621` | Commission Implementing Regulation (EU) 2025/2621 establishing default values | CELEX 32025R2621 | Adopted 2025-12-16; published 2025-12-31; amended/corrected by Regulation (EU) 2026/1740. | Default values only after resolving the current consolidated annexes and the exact product CN code, country/territory and applicable reporting year. |
| `EU-CBAM-DEFAULTS-CORR-2026-1740` | Commission Implementing Regulation (EU) 2026/1740 correcting default-value annexes | CELEX 32026R1740 | Adopted 2026-07-20; published 2026-07-31; expressly applies from 2026-01-01. | Corrections to Annexes I and IV of 2025/2621, including product codes, production routes, units and values. |
| `EU-CBAM-BENCHMARKS-2025-2620` | Commission Implementing Regulation (EU) 2025/2620 on CBAM benchmarks | CELEX 32025R2620 | Definitive-period implementing act; confirm consolidated version and any subsequent amendments before use. | Free-allocation adjustment and production-route benchmarks; do not infer benchmarks from the historical golden fixture. |
| `EU-CBAM-CERTIFICATE-PRICE-2025-2548` | Commission Implementing Regulation (EU) 2025/2548 on calculation and publication of CBAM certificate prices | CELEX 32025R2548 | Adopted 2025-12-10; published 2025-12-22; applies from 2026-01-01. | Certificate pricing, distinct from embedded-emissions calculations; quarterly pricing in 2026 and weekly methodology from 2027. |
| `EU-CBAM-AUTH-2025-486` | Commission Implementing Regulation (EU) 2025/486 on authorised CBAM declarant status | CELEX 32025R0486 | Adopted 2025-03-17; published 2025-03-18. Verify current status before implementing authorisation workflows. | Authorisation conditions and procedures; separate from emissions arithmetic. |
| `EU-CBAM-DEFINITIVE-GUIDANCE` | European Commission CBAM definitive-regime page | European Commission, DG TAXUD | Official overview states definitive regime applies from 2026-01-01. Web page is mutable; record retrieval date and content hash when archived for implementation. | Orientation and links to current sector guidance, registry procedures and applicable acts. |
| `EU-CBAM-GUIDANCE-2026-08` | Commission announcement of definitive-period guidance documents | European Commission, DG TAXUD, published 2026-08-14 | Guidance published for the definitive period; use sector-specific guidance only as interpretive support and check its legal basis against binding acts. | Practical interpretation and installation/operator guidance; not a replacement for binding legislation. |

## Versioning and provenance rules

Every future executable rule must reference a source record and a specific legal provision or annex location. At minimum, persist:

- stable `sourceId` and CELEX/ELI identifier;
- official publisher and canonical EUR-Lex / Commission URL;
- instrument type, adoption date, Official Journal publication date, entry-into-force date and application/effective dates where stated by the instrument;
- amendment, correction, consolidation and supersession relationships;
- provision / article / annex / table / CN-code location used by the rule;
- retrieval timestamp, retrieved artifact SHA-256, language and artifact format for locally archived material;
- interpretation notes and review status, with reviewer and review date;
- reuse/licensing notes for any derived data.

Do not fill unknown dates, hashes, legal interpretations or review approvals with guesses. Use explicit `unknown` / `pending-verification` fields until verified from the official artifact. A web-page retrieval date is not a legal effective date.

## Rule implementation gates

Before a source becomes executable:

1. Retrieve the authentic Official Journal / EUR-Lex document and check its legal status and amendment history.
2. Confirm the provision applies to the requested obligation date, product code, origin, activity and reporting period.
3. Confirm any correcting act and the currently applicable annex/table values.
4. Record exact units, rounding rules, exceptions, evidence requirements and required verification.
5. Create an immutable, versioned rule with `effectiveFrom`, optional inclusive `effectiveTo`, source reference and provision locator.
6. Add source-backed golden tests and boundary tests. A historical guidance example is not a substitute for a definitive-period rule.
7. Keep legal source metadata, rule code, and test fixtures versioned independently.

## Official links

- Basic act: https://eur-lex.europa.eu/eli/reg/2023/956/oj
- Amending act: https://eur-lex.europa.eu/eli/reg/2025/2083/oj
- Emissions calculation methodology: https://eur-lex.europa.eu/eli/reg_impl/2025/2547/oj
- Default values: https://eur-lex.europa.eu/eli/reg_impl/2025/2621/oj
- Default-value correction: https://eur-lex.europa.eu/eli/reg_impl/2026/1740/oj
- Benchmarks: https://eur-lex.europa.eu/eli/reg_impl/2025/2620/oj
- Authorised declarant: https://eur-lex.europa.eu/eli/reg_impl/2025/486/oj
- Certificate prices: https://eur-lex.europa.eu/eli/reg_impl/2025/2548/oj
- Commission definitive regime: https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-definitive-regime_en
- Commission definitive-period guidance announcement (2026-08-14): https://taxation-customs.ec.europa.eu/news/european-commission-publishes-series-guidance-documents-support-cbam-implementation-definitive-2026-08-14_en

## Explicit non-goals of this change

- No CN-code eligibility rules are implemented.
- No 2026 default values are copied into application logic.
- No emissions formula is inferred from the transitional EAF fixture.
- No applicability or compliance conclusion is made for any importer or shipment.
- No automated legal interpretation or update scraping is enabled.
