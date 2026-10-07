# Hub Carbon Platform — Official Data Intake Specification

**Status:** Draft for implementation  
**Version:** 0.1.0  
**Scope:** Global carbon accounting foundation, Brazil-ready  
**Audience:** Product, engineering, data, sustainability, implementation and commercial teams

## 1. Purpose

This document defines the official contract for data entering Hub Carbon Platform.

The objective is to make every customer onboarding request answerable in a consistent way:

> What does the customer need to provide, in which format, how is it classified, what carbon activity data is created, how is it calculated, what evidence supports it, and what outputs are produced?

The platform must accept data the customer already possesses rather than requiring the customer to calculate emissions manually.

The canonical flow is:

`Source -> Document/Data -> Extraction -> Normalization -> Activity Data -> Classification -> Factor -> Deterministic Calculation -> Evidence -> Carbon Ledger -> Outputs`

## 2. Core intake principles

1. **Raw evidence is preserved.**
2. **AI may extract, classify and suggest; it does not become the authoritative arithmetic engine.**
3. **Every calculated value must be reproducible.**
4. **Missing data is explicit; it is never silently converted to zero.**
5. **Primary, activity-based, spend-based and unresolved data remain distinguishable.**
6. **Every factor has provenance and version information.**
7. **Every ledger event references the evidence and calculation inputs that produced it.**
8. **Documents and source records are immutable inputs; corrections create new versions/events.**
9. **The same source record must not create duplicate carbon events.**
10. **Jurisdiction, reporting period and organizational boundary are explicit.**

---

# 3. Company registration

## 3.1 Required

| Field | Type | Description |
|---|---|---|
| companyId | UUID | Internal tenant/company identifier |
| legalName | string | Legal entity name |
| country | ISO country code | Primary country |
| reportingCurrency | ISO 4217 | Currency used for financial data |
| reportingPeriodStart | date | Inventory period start |
| reportingPeriodEnd | date | Inventory period end |
| organizationalBoundaryMethod | enum | Operational/control/equity or configured methodology |
| baseTimezone | IANA timezone | Default timezone for source records |

## 3.2 Required for Brazil deployments

| Field | Type | Description |
|---|---|---|
| cnpj | string | Brazilian legal entity identifier |
| legalEntityType | string | Entity/legal structure |
| state | UF | Primary Brazilian state |
| municipality | string | Primary municipality |

CNPJ must be stored as sensitive business identification data and must not be used as a carbon calculation input unless explicitly required by a methodology.

## 3.3 Optional

- trade name;
- CNAE;
- industry/subindustry;
- revenue;
- employee count;
- ownership structure;
- parent company;
- consolidation group;
- countries of operation;
- contact persons;
- sustainability reporting framework;
- regulatory objectives;
- customer/supply-chain reporting requirements.

---

# 4. Reporting period

Every inventory is associated with an explicit period.

Required:

- period identifier;
- start date;
- end date;
- reporting year;
- status: draft / processing / review / closed / restated;
- methodology version;
- factor-registry version;
- currency;
- organizational boundary.

A closed inventory must not be silently edited. Corrections use restatement/reversal mechanisms and retain the original history.

---

# 5. Organizational units / sites

Each physical or logical operating unit may be represented as a site.

Required:

- siteId;
- companyId;
- name;
- country;
- state/province where applicable;
- municipality/city;
- address or geospatial reference where operationally required;
- activeFrom;
- activeTo when applicable.

Optional:

- facility type;
- floor area;
- production capacity;
- employee count;
- cost center;
- business unit;
- ERP company code;
- meter identifiers;
- fleet identifiers.

Examples:

- headquarters;
- factories;
- warehouses;
- stores;
- offices;
- data centers;
- farms;
- mines;
- distribution centers;
- leased facilities.

---

# 6. Supported data sources

The intake layer must classify every input by source.

## 6.1 Structured sources

- ERP;
- accounting system;
- accounts payable;
- accounts receivable when relevant;
- procurement;
- purchasing;
- fiscal system;
- fleet management;
- fuel-card platform;
- utility-management system;
- travel-management system;
- logistics/TMS;
- HR;
- production/MES;
- waste-management system;
- supplier portals;
- spreadsheets/CSV;
- APIs;
- databases.

## 6.2 Document sources

- PDF;
- XML;
- CSV;
- XLS/XLSX;
- JSON;
- TXT;
- scanned documents/images where supported;
- supplier reports;
- contracts;
- certificates;
- statements;
- operational reports.

## 6.3 Brazilian fiscal sources

The initial Brazil intake must be designed to accommodate:

- NF-e/XML;
- NFS-e/XML or supported representations;
- CT-e/XML;
- other fiscal documents when a validated integration is available.

The platform must not assume that a fiscal document alone contains sufficient information for a complete Scope 3 calculation.

---

# 7. Document model

Every uploaded or connected document receives a source record.

Required:

- documentId;
- companyId;
- sourceType;
- sourceSystem;
- originalFilename when applicable;
- documentType;
- documentDate when available;
- ingestionTimestamp;
- reportingPeriod;
- contentHash;
- processingStatus;
- evidenceStatus.

Optional:

- supplier;
- customer;
- invoice number;
- access key;
- currency;
- total value;
- site;
- purchase order;
- contract;
- page count;
- MIME type;
- extraction model/version;
- extraction confidence.

The original document must remain linked to the extracted records.

---

# 8. Canonical activity-data model

Documents are not themselves emissions.

The system transforms source information into normalized activity records.

A canonical activity record contains:

- activityId;
- companyId;
- reportingPeriodId;
- siteId when applicable;
- sourceDocumentId or sourceRecordId;
- supplierId when applicable;
- transactionDate;
- scope;
- scope3Category when applicable;
- activityType;
- quantity;
- unit;
- normalizedQuantity;
- normalizedUnit;
- financialAmount when applicable;
- currency when applicable;
- method;
- factorId;
- factorVersion;
- dataQuality;
- confidence;
- evidenceId;
- classificationStatus;
- calculationStatus.

The activity record must be sufficient to reproduce the calculation without re-reading the original document.

---

# 9. Required versus optional activity fields

## 9.1 Universally required

- company;
- reporting period;
- source;
- activity type;
- source/evidence reference;
- date or applicable period;
- quantity + unit **or** financial amount + currency when a spend-based method is valid;
- classification status;
- data quality status.

## 9.2 Required depending on methodology

- supplier;
- product/service category;
- geography;
- distance;
- mass/volume;
- energy consumption;
- fuel type;
- vehicle/equipment;
- transportation mode;
- waste treatment;
- production output;
- emission factor;
- organizational boundary;
- market/location electricity attributes.

## 9.3 Optional

- invoice line;
- purchase order;
- cost center;
- GL account;
- SKU/material code;
- contract;
- meter;
- vehicle;
- employee;
- project;
- internal allocation key.

---

# 10. Scope 1 intake mapping

Scope 1 activity records cover direct emissions from sources owned or controlled by the reporting organization, according to the selected methodology.

## 10.1 Stationary combustion

Inputs:

- fuel type;
- quantity;
- unit;
- equipment/site;
- period;
- supplier/document;
- optional meter/asset identifier.

Examples:

- natural gas;
- diesel;
- gasoline;
- LPG;
- biomass where methodology requires treatment.

## 10.2 Mobile combustion

Inputs:

- vehicle/equipment;
- fuel type;
- quantity;
- unit;
- mileage/hours when available;
- site/business unit;
- date.

Sources:

- fuel invoices;
- fuel cards;
- fleet systems;
- ERP;
- expense records.

## 10.3 Fugitive emissions

Inputs:

- refrigerant/gas type;
- quantity purchased;
- quantity recharged;
- quantity recovered;
- quantity disposed;
- equipment;
- leakage information when available;
- service document.

## 10.4 Process emissions

Inputs depend on the industrial process:

- material;
- process;
- production quantity;
- process-specific activity data;
- gas;
- stoichiometric/process parameters where required.

---

# 11. Scope 2 intake mapping

Scope 2 must support both electricity and, where applicable, purchased steam, heat and cooling.

Required/conditional inputs:

- energy type;
- consumption;
- unit;
- site;
- meter;
- supplier;
- billing period;
- market/location attributes where applicable;
- renewable procurement attributes where applicable.

The data model must support separate market-based and location-based results when the methodology requires both.

Possible evidence:

- electricity bill;
- utility statement;
- meter data;
- supplier report;
- contract;
- renewable energy certificate/attribute documentation.

---

# 12. Scope 3 — 15-category intake model

The system must represent all 15 GHG Protocol Scope 3 categories.

## Category 1 — Purchased goods and services

Potential inputs:

- supplier;
- product/service;
- SKU/material;
- quantity;
- unit;
- mass/volume;
- spend;
- currency;
- invoice;
- purchase order;
- supplier-specific emissions data;
- product carbon footprint when available.

Preferred calculation hierarchy:

1. supplier-specific primary data;
2. activity-based data;
3. spend-based data;
4. unresolved.

## Category 2 — Capital goods

Inputs:

- asset;
- supplier;
- quantity;
- purchase value;
- currency;
- material/asset type;
- mass where available;
- useful life where relevant;
- invoice;
- capitalization record.

## Category 3 — Fuel- and energy-related activities not included in Scope 1 or 2

Inputs:

- fuel/energy type;
- quantity;
- unit;
- supplier;
- electricity consumption;
- upstream energy information where available;
- source document.

## Category 4 — Upstream transportation and distribution

Inputs:

- supplier/carrier;
- origin;
- destination;
- mode;
- distance;
- mass/volume;
- shipment count;
- freight value where applicable;
- CT-e or equivalent;
- fuel/activity data when available.

## Category 5 — Waste generated in operations

Inputs:

- waste type;
- quantity;
- unit;
- treatment;
- destination;
- recycler/operator;
- transport information where relevant;
- waste report/invoice.

## Category 6 — Business travel

Inputs:

- employee/traveler where permitted;
- travel date;
- origin;
- destination;
- mode;
- distance;
- class where relevant;
- ticket;
- hotel nights;
- rental vehicle;
- reimbursement.

## Category 7 — Employee commuting

Inputs:

- employee population or survey population;
- commuting mode;
- distance;
- frequency;
- working days;
- occupancy where applicable;
- remote/hybrid pattern;
- transportation benefit data.

## Category 8 — Upstream leased assets

Inputs:

- leased asset;
- lessor;
- location;
- energy/fuel consumption where available;
- area/capacity where relevant;
- lease period;
- lease documentation.

## Category 9 — Downstream transportation and distribution

Inputs:

- product;
- shipment;
- origin;
- destination;
- customer/distributor;
- mode;
- distance;
- mass/volume;
- shipment count;
- carrier data.

## Category 10 — Processing of sold products

Inputs:

- product;
- quantity;
- mass;
- customer/process;
- downstream process;
- geography;
- process energy/activity data when available.

## Category 11 — Use of sold products

Inputs:

- product;
- quantity sold;
- use-phase energy/fuel;
- expected lifetime;
- usage profile;
- geography;
- product technical characteristics.

## Category 12 — End-of-life treatment of sold products

Inputs:

- product;
- quantity sold;
- material composition;
- packaging;
- expected disposal route;
- geography;
- recycling/landfill/incineration assumptions where supported.

## Category 13 — Downstream leased assets

Inputs:

- leased asset;
- lessee;
- location;
- energy/fuel consumption;
- lease period;
- operating data where available.

## Category 14 — Franchises

Inputs:

- franchise unit;
- location;
- franchisee;
- energy;
- fuel;
- refrigerants;
- waste;
- operating activity data;
- reporting period.

## Category 15 — Investments

Inputs:

- investee;
- investment type;
- ownership/exposure;
- financed/invested amount;
- emissions data where available;
- sector;
- geography;
- financial data;
- reporting methodology.

---

# 13. Data-method hierarchy

For Scope 3 and other categories where multiple methods are possible, the system should prefer the highest-quality available method.

Default hierarchy:

1. **Supplier-specific primary data**
2. **Direct activity-based data**
3. **Average/activity-based secondary data**
4. **Spend-based estimation**
5. **Unresolved**

The selected method must be recorded on the activity record.

The platform must never hide a fallback from the user.

Example:

`Supplier primary data unavailable -> activity data unavailable -> spend-based estimate used`

This must remain visible in the inventory lineage.

---

# 14. Missing data rules

Missing information is a state, not a zero.

Supported statuses:

- `provided`
- `not_available`
- `not_applicable`
- `pending`
- `estimated`
- `inferred`
- `rejected`

Rules:

1. Missing quantity must not automatically become zero.
2. Missing supplier data may trigger a lower-methodology fallback when permitted.
3. Missing mandatory fields block calculation for methods that require them.
4. Estimated values must identify estimation method.
5. Inferred values must identify inference logic and confidence.
6. Not-applicable requires a reason when the field is normally expected.
7. Unresolved records remain visible in data-quality outputs.
8. Material missing data must be surfaced before inventory closure.
9. A user must be able to distinguish measured, reported, estimated and inferred data.

---

# 15. Data quality

Each activity receives a data-quality classification.

Minimum supported levels:

- **A — Primary / high quality**
- **B — Activity-based / strong secondary**
- **C — Spend-based / estimation**
- **D — Low-confidence / unresolved**

The implementation may later introduce a numeric score, but the underlying reason must remain available.

Data-quality dimensions should include:

- completeness;
- representativeness;
- temporal relevance;
- geographic relevance;
- technological relevance;
- source reliability;
- calculation method.

The system must preserve the reasons behind a quality score.

---

# 16. Confidence

Confidence is distinct from data quality.

Example:

- High-quality supplier data extracted from a poor-quality scan may have high data quality but lower extraction confidence.
- A clearly extracted invoice using a spend-based proxy may have high extraction confidence but lower carbon-data quality.

Confidence must be tracked at extraction/classification level.

Minimum fields:

- confidenceScore;
- confidenceLevel;
- confidenceSource;
- model/version when AI-derived;
- humanReviewed;
- reviewTimestamp;
- reviewUserId where applicable.

Recommended levels:

- high;
- medium;
- low.

AI confidence must never replace methodology quality.

---

# 17. Evidence model

Every calculated activity must have evidence lineage.

Evidence should contain:

- evidenceId;
- source type;
- source document/record;
- content hash;
- source system;
- original identifier;
- document date;
- page/line/cell/record locator where available;
- extracted field;
- extracted value;
- extraction method;
- extraction model/version where applicable;
- confidence;
- reviewer;
- review status.

Example lineage:

`Inventory -> Scope 3 Cat. 1 -> Supplier X -> Invoice 123 -> Page 2 -> Line 14 -> Quantity -> Factor -> Calculation`

The platform must be able to reproduce this path.

---

# 18. How intake reaches the Carbon Ledger

The canonical pipeline is:

`1. Ingest`
`2. Hash and preserve source`
`3. Extract`
`4. Normalize`
`5. Classify`
`6. Validate`
`7. Match factor`
`8. Calculate deterministically`
`9. Create evidence snapshot`
`10. Append ledger event`

A ledger event must capture, directly or through immutable references:

- tenant/company;
- activity identifier;
- calculation result;
- factor identifier/version;
- factor value/unit;
- methodology;
- source evidence;
- data quality;
- confidence where relevant;
- calculation formula;
- event sequence;
- previous event hash;
- event hash;
- idempotency key.

If source data changes, the platform must not mutate the historical event. It creates a new calculation/restate/reversal event according to ledger rules.

---

# 19. Idempotency and duplicate prevention

Every ingestion event should have a deterministic or supplied idempotency key.

Candidate components:

- company;
- source system;
- source record ID;
- document hash;
- line identifier;
- activity type;
- reporting period.

Duplicate source records must be detected before creating duplicate carbon ledger events.

A duplicate detection result must be visible to the user.

---

# 20. Outputs

After processing, Hub Carbon must produce outputs at several levels.

## 20.1 Inventory

- total tCO2e;
- Scope 1;
- Scope 2;
- Scope 3;
- Scope 3 by category;
- organizational/site breakdown;
- period comparison.

## 20.2 Activity

- source activity;
- quantity;
- unit;
- method;
- factor;
- emissions;
- data quality;
- confidence;
- evidence.

## 20.3 Hotspots

- highest-emission suppliers;
- highest-emission categories;
- highest-emission sites;
- highest-emission products/services;
- major transportation modes;
- major fuels/energy sources.

## 20.4 Data quality

- completeness;
- percentage primary/activity/spend/unresolved;
- missing evidence;
- low-confidence records;
- estimated emissions;
- unresolved activity;
- records requiring review.

## 20.5 Auditability

- calculation lineage;
- source documents;
- factor provenance;
- factor version;
- methodology version;
- ledger events;
- restatements;
- reversals;
- audit history.

## 20.6 Reporting

The reporting layer should support configurable outputs for:

- GHG inventory;
- management reporting;
- customer/supply-chain requests;
- ESG reporting;
- assurance/audit preparation;
- jurisdiction-specific reporting;
- future regulatory reporting.

The platform must distinguish "methodology implemented" from "certification/verification completed".

## 20.7 Decarbonization

Future insight outputs include:

- emission reduction opportunities;
- activity drivers;
- scenario analysis;
- supplier engagement priorities;
- energy/fuel substitution opportunities;
- transportation optimization;
- procurement hotspots;
- abatement estimates;
- action tracking.

---

# 21. Minimum viable customer onboarding package

A customer should be able to start with:

### Company

- legal name;
- identifier;
- country;
- reporting period;
- organizational boundary;
- sites.

### Scope 1

At minimum, if applicable:

- fuel consumption;
- fleet fuel;
- refrigerants;
- process activity.

### Scope 2

At minimum:

- electricity consumption;
- site;
- billing period;
- supplier/bill.

### Scope 3

At minimum:

- purchases/spend;
- supplier;
- transportation/logistics;
- business travel;
- waste;
- employee commuting when relevant.

### Evidence

At least one of:

- source document;
- source-system record;
- supplier report;
- structured dataset.

The onboarding process should identify which categories cannot yet be calculated rather than pretending the inventory is complete.

---

# 22. Customer-facing upload/connect checklist

The commercial intake experience should ask:

## Company

- Who is the legal entity?
- What is the reporting period?
- Which sites/branches are included?
- Which countries are included?
- Which accounting/ERP systems are used?

## Documents/data

- Do you have NF-e/XML?
- NFS-e?
- CT-e?
- Electricity bills?
- Fuel invoices or fuel-card data?
- Fleet data?
- Travel data?
- Waste data?
- Procurement/ERP data?
- Supplier emissions data?
- Production data?
- Employee commuting data?

## Objective

- First inventory?
- Annual update?
- Scope 1 and 2?
- Full Scope 1/2/3?
- Audit/assurance preparation?
- ESG reporting?
- Customer requirement?
- Regulatory readiness?
- Decarbonization?

---

# 23. Product promise derived from this specification

> **Você fornece os dados que sua empresa já possui. O Hub Carbon transforma documentos, transações e dados operacionais em atividade de carbono, calcula as emissões de forma determinística e entrega um inventário rastreável desde o documento original até o resultado final.**

The customer should not need to understand emission-factor mathematics to use the platform.

The platform's responsibility is to:

`CONNECT -> EXTRACT -> ORGANIZE -> CLASSIFY -> CALCULATE -> TRACE -> REPORT -> ACT`

---

# 24. Implementation boundary

This specification is the contract for the next engineering layers.

Next components should be built in this order:

1. **Data Intake domain model**
2. **Source/document model**
3. **Canonical activity model**
4. **Validation and missing-data states**
5. **Evidence model**
6. **Data-quality/confidence model**
7. **Scope/category classification**
8. **Intake API**
9. **Document ingestion**
10. **Document AI**
11. **ERP/fiscal/procurement integrations**
12. **Factor matching**
13. **Carbon Ledger integration**
14. **Reporting/output API**
15. **Customer dashboard**

The existing Carbon Core, Factor Registry and Carbon Ledger are the downstream foundations for this intake contract.

---

# 25. Non-goals

This specification does not:

- copy GHG Protocol or ISO standards text;
- declare certification;
- prescribe a single emission-factor dataset;
- assume every fiscal document is sufficient for carbon accounting;
- permit AI-generated values to silently become authoritative;
- define final jurisdiction-specific regulatory compliance;
- replace independent verification or assurance.

Jurisdiction-specific methodology is implemented as versioned rules/configuration with authoritative references and licensing controls.
