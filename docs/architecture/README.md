# Architecture

## Target flow

Financial / accounting / procurement / ERP / invoices / fiscal documents / operational systems

→ document ingestion and extraction

→ normalized activity data

→ deterministic carbon calculation engine

→ carbon ledger + evidence/provenance

→ Scope 1 / 2 / 3 inventory

→ reporting and jurisdictional compliance

→ hotspots, scenarios and decarbonization actions

## Planned packages

- `carbon-core`: units, GHG calculations, boundaries and validation
- `carbon-ledger`: append-only inventory ledger, restatements and audit trail
- `scope3-engine`: supplier/spend/activity normalization and Scope 3 categories
- `factor-registry`: versioned factors, source metadata and applicability
- `document-ai`: OCR/document extraction and classification
- `supplier-engine`: supplier data collection and primary-data workflows
- `regulatory-engine`: jurisdiction/version-specific rules
- `reporting-engine`: GHG Protocol, ISO 14064-1, CSRD/ESRS, IFRS S2, CDP and other output mappings

## AI boundary

AI can extract and classify evidence, propose mappings and flag anomalies. It must not be the authoritative arithmetic engine.

## Traceability requirement

Every reported quantity should be drillable to its source evidence, classification, factor, factor version, formula, calculation result and relevant methodology version.
