# Regulatory Compliance Architecture

## Decision

Hub Carbon Platform separates **carbon accounting** from **regulatory/compliance interpretation** while keeping both connected through explicit data and evidence contracts.

The accounting domain is the stable computational foundation:

- activity quantities and units;
- unit conversion;
- emission factors and provenance;
- GHG calculations;
- calculation results;
- carbon ledger and audit lineage.

The regulatory domain is the mutable policy layer:

- jurisdiction;
- regulation and rule versions;
- effective dates;
- applicability;
- thresholds and product/commodity scope;
- required inputs;
- evidence requirements;
- verification requirements;
- reporting/filing requirements.

A change to a regulatory rule must not require a change to the deterministic carbon calculation core unless the underlying accounting methodology itself changes and is separately versioned.

## Architectural boundary

```
                     HUB CARBON PLATFORM
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
     CARBON ACCOUNTING                 REGULATORY / COMPLIANCE
             |                                 |
       Carbon Core                       Rule Registry
       Factor Registry                   Applicability
       Carbon Ledger                     Rule Versioning
       Evidence                          Evidence Requirements
             |                                 |
             +---------------+-----------------+
                             |
                    Audit / Reporting
```

The shared foundation stores facts and evidence. Regulatory engines interpret those facts; they do not own the underlying business reality.

## Regulatory decision model

A regulatory decision should be reconstructable from:

1. the input context;
2. jurisdiction;
3. regulation identifier;
4. regulation version;
5. rule identifier;
6. rule version;
7. effective date;
8. reason for the decision;
9. required inputs;
10. required evidence.

This enables an auditor to ask both:

- **"Why was this transaction subject to this regime?"**
- **"Which rule and version produced that decision?"**

## Effective-dated rules

Rules must never be silently overwritten.

A regulation can evolve:

```
rule v1  ->  rule v2  ->  rule v3
```

Historical decisions must retain the rule/version that was actually used. New rules apply only according to their effective windows.

## Fail-closed principle

The regulatory layer must not silently infer compliance when:

- no active rule exists;
- more than one active rule is eligible;
- required jurisdictional context is missing;
- required product/activity identifiers are missing.

In those cases the result is `insufficient_data` and the workflow must surface the missing information.

## Integration with carbon accounting

The integration direction is:

```
Activity / Evidence
       |
       +------> Carbon Accounting ------> Carbon Result
       |
       +------> Regulatory Applicability -> Regulatory Decision
                                           |
                                           v
                                  Compliance Calculation
```

A regulatory engine may consume a carbon result. It must not mutate the carbon result.

The same underlying activity can therefore support:

- corporate GHG accounting;
- product carbon accounting;
- EU regulatory workflows;
- UK regulatory workflows;
- future jurisdiction-specific border-carbon regimes.

## Future CBAM/BCA regimes

EU CBAM, UK CBAM and future border carbon adjustment regimes must be implemented as independent regulatory modules.

The common layer provides interfaces for:

- applicability evaluation;
- rule/version selection;
- required data;
- evidence requirements;
- verification requirements;
- reporting/filing requirements.

It must **not** provide a universal CBAM rule set.

Different jurisdictions may define different:

- covered goods;
- commodity codes;
- thresholds;
- emissions boundaries;
- methodologies;
- default values;
- verification requirements;
- reporting periods;
- authorities and filing systems.

## External government systems

Official registries and government filing systems remain external systems of record.

The platform may prepare, validate, reconcile or export data for those systems where legally and technically supported. It must not represent an internal regulatory database as an official government registry.

## Audit principle

The target audit chain is:

```
Source Document
    |
    v
Activity Record
    |
    +----> Carbon Calculation
    |          |
    |          v
    |     Carbon Ledger
    |
    +----> Regulatory Applicability
               |
               v
          Rule + Version
               |
               v
       Regulatory Decision
               |
               v
       Compliance Workflow
               |
               v
       Report / Filing Output
```

The regulatory decision and the carbon calculation are therefore linked, but remain independently reproducible.

## Scope of this ADR

This PR establishes the architectural contract only.

It intentionally does **not** implement:

- EU CBAM rules;
- UK CBAM rules;
- EU ETS rules;
- CSRD/ESRS rules;
- US, Indian, Moroccan or other future regimes;
- official government filing integrations.

Those are separate, versioned implementations that must be based on verified authoritative sources.
