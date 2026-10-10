# ADR-001: Separation of Carbon Accounting and Regulatory Compliance

- **Status:** Accepted for implementation
- **Date:** 2026-10-09
- **Decision owners:** Hub Carbon Platform maintainers
- **Supersedes:** None
- **Related documentation:** [Regulatory Compliance Architecture](./regulatory-compliance.md)

## Context

Hub Carbon Platform must transform source documents and operational or economic activity data into reproducible greenhouse-gas (GHG) calculations, while also supporting reporting and obligations that vary by jurisdiction, regulatory regime, rule version, product, activity and effective date.

These concerns evolve at different rates and have different correctness criteria. Carbon accounting requires deterministic mathematics, dimensional correctness, explicit emission-factor provenance and reproducible calculation history. Regulatory compliance requires interpretation of jurisdiction-specific rules, applicability, required inputs and evidence, methodology selection, verification and reporting obligations. Regulations and administrative guidance may change without changing the underlying physical activity or the canonical accounting calculation.

Combining these responsibilities in one domain would couple routine legal changes to the accounting core, make independent testing and release difficult, and risk silently changing historical accounting results when a regulatory rule changes.

The repository already contains `carbon-core`, `factor-registry`, `carbon-ledger`, `data-intake`, a `regulatory-engine` domain contract and reporting foundations. This ADR formalizes their architectural boundary; it does not claim that any particular regulatory implementation is legally complete.

## Decision

**Carbon Accounting and Regulatory Compliance are separate architectural domains connected through explicit, versioned contracts.**

1. `carbon-core` owns deterministic, jurisdiction-independent canonical GHG calculations.
2. `factor-registry` owns emission-factor identity, source provenance, licensing metadata, methodology, geography, units and factor version/effective-date metadata.
3. `carbon-ledger` records durable calculation and evidence lineage so historical inputs, factors, calculation versions and results can be reconstructed.
4. `regulatory-engine` owns jurisdiction- and regime-specific applicability, rule selection, regulatory methodology requirements, required data/evidence, verification and reporting obligations.
5. Reporting components may present canonical carbon results and regulatory-specific representations, but must preserve their relationship and must not silently mutate or relabel the canonical result.
6. Each regulatory regime and rule set must be independently identified, versioned, effective-dated, explainable and tested.
7. No real regulatory rule may be represented as authoritative until its applicable official sources, effective dates, methodology and lawful reuse constraints have been verified.

## Domain responsibilities

### Carbon Accounting

Carbon Accounting MUST:

- Accept structured activity data with explicit quantities, units, activity boundaries and provenance.
- Validate dimensional compatibility before performing arithmetic; convert units only through explicit, supported conversions.
- Calculate emissions deterministically from validated activity data and identified emission factors/methodologies.
- Preserve factor identifiers and versions, calculation/methodology versions, input references and relevant conversion details.
- Use `kgCO2e` as the canonical result unit where required by the existing core contract, retaining source and display units explicitly when needed.
- Keep a reproducible record of the canonical result in the Carbon Ledger.
- Expose results through stable contracts that downstream reporting and regulatory domains can consume without changing the original result.

Carbon Accounting MUST NOT contain jurisdiction-specific applicability, commodity coverage, filing deadlines, legal thresholds or CBAM-specific branching merely to support a regulatory report. The core must not need to know whether a result will be used for EU CBAM, UK CBAM, corporate inventory reporting or another regime.

### Factor Registry

The Factor Registry MUST preserve the factor's source, license/reuse basis, geography, category, activity unit, factor unit, methodology, gases/GWP basis, version and applicable validity metadata as available. Factor selection and factor validity must remain distinguishable from regulatory applicability.

An emission factor is not, by itself, proof that a particular regulatory methodology accepts that factor.

### Carbon Ledger and evidence lineage

The Ledger MUST retain durable references linking, as applicable:

- Source documents and evidence.
- Extracted/normalized data and the resulting activity record.
- Factor identity and version.
- Calculation and methodology version, unit conversions and canonical result.
- Ledger event identifiers and audit metadata.
- Regulatory decision, selected rule/version and generated report.

A correction or new calculation must be represented as a traceable new event or version according to the Ledger contract; it must not silently erase or rewrite the historical result on which an earlier decision or report relied.

### Regulatory Compliance

Regulatory Compliance MUST:

- Identify jurisdiction, regime, regulation version, rule version and applicable effective window.
- Evaluate applicability using explicit contextual inputs such as date, product/activity identifiers, origin/destination and relevant quantities when required by that regime.
- Declare required inputs, documents/evidence, verification, reporting period and output obligations.
- Explain each decision with a reason and references to the rule/version and authoritative sources used.
- Keep regime-specific methodologies, thresholds, exceptions and reporting mappings inside the relevant regulatory module.
- Be independently testable and versionable without requiring unrelated changes to `carbon-core`.
- Fail safely when a rule is missing, inactive, ambiguous or unsupported by required input/evidence.

The regulatory domain may consume a canonical carbon result and may calculate a separate regulatory value when an applicable, versioned regulatory methodology explicitly requires it. Such a result MUST be labeled as regulatory-methodology output, identify the methodology/version and retain a traceable link to its inputs and the canonical result. It MUST NOT overwrite, masquerade as, or silently change the canonical Carbon Accounting result.

## Integration contracts

The domains MUST integrate through explicit, versioned data contracts rather than hidden dependencies on each other's internal implementation.

Contracts should provide stable identifiers/references for:

- Organization/tenant and reporting period.
- Activity and source-data provenance.
- Documents, evidence and data-quality status.
- Canonical calculation result, unit and calculation/methodology version.
- Emission-factor identifiers and versions.
- Carbon Ledger event identifiers.
- Regulatory context, decision, rule/version and effective window.
- Regulatory calculation outputs, where required, and report lineage.

A regulatory decision should be reproducible from its recorded input context, jurisdiction, regime/version, rule/version, effective date, reason, required inputs/evidence and references to the relevant carbon results and Ledger events. Contract changes must be deliberate and versioned when compatibility cannot be maintained.

Conceptual flow:

```text
Source documents and evidence
          |
          v
      Data Intake
          |
          +------------------------------+
          |                              |
          v                              v
  Carbon Accounting             Regulatory Applicability
          |                              |
          v                              v
   Canonical Result                Rule + Version
          |                              |
          v                              v
     Carbon Ledger <---------- Regulatory Decision
          |                              |
          +---------------+--------------+
                          v
              Regulatory calculation
                 (if required)
                          |
                          v
                Compliance report
```

This flow is conceptual: the implementation may use separate services or packages, provided the ownership and data-lineage guarantees remain intact.

## Rule versioning and temporal behavior

- Regulatory rules MUST have stable identifiers, explicit versions and effective-from/effective-to boundaries where applicable.
- Rule selection MUST use the date relevant to the obligation being evaluated, not an implicit current date. The meaning and source of that date must be recorded.
- The system MUST distinguish the date an activity occurred, the reporting period, the date a decision was made and the rule's legal effective period when these differ.
- Publishing a new rule version MUST NOT silently rewrite prior decisions, calculations or issued reports.
- Historical outcomes must retain enough rule, factor, methodology and input references to be reproduced or explained.
- Where retroactive legal effects are genuinely applicable, the system must record a new, traceable reassessment with its basis; it must not silently replace the prior decision.

## Boundary and safety rules

1. **No regulatory contamination:** regulatory regime names and rules do not become dependencies of the canonical calculation core.
2. **No silent recalculation:** a regulatory report cannot alter the stored canonical result. A distinct regulatory methodology output must be labeled and versioned.
3. **Fail closed:** missing, inactive or ambiguous rules, invalid effective dates, or insufficient mandatory context must not yield an unsupported compliance assertion. Return an explicit unresolved/insufficient-data outcome with the reason.
4. **No universal CBAM rule set:** EU CBAM, UK CBAM and other regimes are separate implementations, even where they share infrastructure or similar concepts.
5. **No implied legal assurance:** architectural tests and golden mathematical fixtures validate software behavior, not legal applicability, regulatory completeness, certification or filing acceptance.
6. **Authoritative sources and lawful reuse:** verify official source status, relevant version/date and licensing/reuse terms before implementing or redistributing source-derived material. Do not copy protected legal text by default.
7. **External systems remain external:** internal rule data or reports must not be described as an official government registry or filing unless a documented, authorized integration supports that claim.
8. **AI is not the calculation authority:** AI may extract, classify or suggest data; validated deterministic code performs canonical arithmetic and explicit regulatory rules determine compliance outcomes.

## Consequences

### Positive

- Legal and administrative changes can be implemented without unnecessarily changing canonical accounting mathematics.
- Different jurisdictions can evolve, be tested and be released independently.
- Calculation outputs and regulatory decisions remain separately explainable and reproducible.
- Audit lineage can connect source evidence to activity, factors, calculations, decisions and reports.
- New regimes can reuse shared contracts without forcing their rules into a universal implementation.

### Costs and trade-offs

- The platform must maintain explicit contracts, identifiers and compatibility/versioning policies.
- Some information is represented by references across domains rather than by one coupled model.
- Regulatory modules need their own authoritative-source review, test fixtures, release discipline and maintenance.
- A regime-specific methodology may produce a separate result that requires clear labeling and careful lineage to prevent users confusing it with the canonical accounting result.

## Alternatives considered

### One combined accounting-and-compliance engine — rejected

This would couple legal changes to core arithmetic, make jurisdiction-specific behavior harder to isolate and increase the risk of retroactively changing canonical results.

### Put all regulatory logic in reporting templates — rejected

Reporting presentation alone cannot safely own applicability, effective-dated rule selection, evidence requirements or regulatory calculations. Those are domain decisions that require versioning, tests and audit records.

### Maintain one universal CBAM ruleset with jurisdiction flags — rejected

Regimes may differ in covered goods, methods, thresholds, effective dates, verification and filing obligations. A universal ruleset would conceal those differences and encourage unsafe assumptions.

### Duplicate the canonical accounting engine for every regulation — rejected

Duplicating core arithmetic would create inconsistent implementations and undermine a single deterministic, auditable accounting foundation. A genuinely different legally required methodology may exist as a separate, explicitly named and versioned regulatory calculation, not as a silent fork of canonical accounting.

## Implementation directives

Future changes and pull requests MUST:

- Preserve the domain ownership and boundary in this ADR.
- Keep `carbon-core` free of jurisdiction-specific regulatory dependencies.
- Add or change regulatory rules only in identified, versioned regime modules and only after source/effective-date/reuse review.
- Preserve source, factor, methodology, calculation, rule and Ledger references through reports.
- Add independent tests for rule selection, effective-date boundaries, missing/ambiguous rules, required evidence and regulatory methodology outputs as applicable.
- Label synthetic rules and historical worked examples as test-only; never present them as production legal rules.
- Document code changes needed to enforce this ADR separately from the architectural decision itself.
- Update this ADR through a reviewed change if a future proposal materially changes the boundary.

## Validation and scope

This ADR formalizes the architectural contract only. It does not implement or certify EU CBAM, UK CBAM, EU ETS, CSRD/ESRS or any other regime, and it does not authorize a government registry/filing integration.

For a documentation-only change, validation consists of reviewing consistency with existing package contracts and architecture documentation, checking links and terminology, and confirming the diff contains no regulatory implementation or unrelated refactor. Code tests should be run if implementation files change; repository CI/check results must be reported as observed, never assumed.

## References

- [Regulatory Compliance Architecture](./regulatory-compliance.md)
- `packages/carbon-core/README.md`
- `packages/regulatory-engine/README.md`
- `legal/SOURCE_MATRIX.md`
- `legal/THIRD_PARTY_NOTICES.md`
