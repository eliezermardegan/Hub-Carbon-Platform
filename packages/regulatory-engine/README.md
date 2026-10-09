# regulatory-engine

Versioned jurisdictional rules and reporting mappings.

## Purpose

This package is the regulatory/compliance boundary of Hub Carbon Platform. It interprets business/activity context against independently versioned, jurisdiction-specific rules.

- `carbon-core` owns deterministic emissions mathematics.
- `factor-registry` owns emission-factor identity, provenance and versioning.
- `carbon-ledger` records calculation and evidence lineage.
- `regulatory-engine` determines regulatory applicability and compliance inputs.

A regulatory engine may decide whether, when and how a carbon result is used for a compliance workflow, but it must not redefine the underlying physical/accounting calculation.

## Contract guarantees

1. **Jurisdiction-specific** — rules belong to a jurisdiction and regulation.
2. **Versioned and effective-dated** — the rule identity/version and inclusive calendar-date window are explicit.
3. **Contextual rule selection** — active rules are filtered by the obligation date and then matched against activity/product context.
4. **Fail closed** — missing, inactive, unmatched or ambiguous rules return `insufficient_data`; they must not silently assume applicability.
5. **Date validation** — obligation dates and configured rule windows must be valid `YYYY-MM-DD` calendar dates.
6. **Explainable** — decisions carry a rule identity, reason, required inputs and evidence requirements.
7. **Auditable** — downstream persistence should record the exact regulatory decision and rule version used.
8. **No legal source copying by default** — legal requirements are implemented as structured rules with provenance, not by copying protected source texts.

## Boundary

The package provides a domain contract and deterministic rule-selection behavior only. It does **not** implement EU CBAM, UK CBAM, EU ETS, CSRD/ESRS, or any other real regulation yet.

Real regulatory implementations must be introduced only after authoritative legal sources, effective dates, methodologies, data requirements and licensing/reuse constraints have been verified.

## Intended flow

```text
Business / ERP / document data
            |
            v
       Data Intake
            |
            v
      Carbon Accounting
       (independent)
            |
            +--------------------+
            |                    |
            v                    v
      Carbon Ledger       Regulatory Engine
                               |
                         applicability
                               |
                         rule/version
                               |
                         evidence needs
                               |
                         compliance workflow
```
