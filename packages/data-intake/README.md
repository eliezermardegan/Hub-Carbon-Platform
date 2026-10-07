# Data Intake

Canonical intake domain for Hub Carbon Platform.

This package turns company, site, source, document and extracted operational/financial data into validated activity records ready for deterministic carbon calculation and Carbon Ledger persistence.

It does not calculate emissions and it does not select authoritative emission factors. Those responsibilities remain with Carbon Core and Factor Registry.

## Pipeline

`source -> document/record -> normalize -> classify -> validate -> activity -> evidence -> carbon engine -> ledger`

## Design rules

- Missing data is explicit; it is never silently converted to zero.
- Data quality and extraction confidence are separate concepts.
- Scope 3 supports all 15 categories.
- Primary, activity-based, spend-based and unresolved methods remain distinguishable.
- Evidence is immutable by content hash.
- Idempotency keys prevent duplicate downstream ledger events.
