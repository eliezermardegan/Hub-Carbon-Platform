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

`carbon-core`, `carbon-ledger`, `scope3-engine`, `factor-registry`, `document-ai`, `supplier-engine`, `regulatory-engine`, `reporting-engine`.

## AI boundary

AI may extract, classify, propose mappings and flag anomalies. It must not be the authoritative arithmetic engine.

## Traceability

Every reported quantity should drill down to source evidence, classification, factor, factor version, formula, result and methodology version.
