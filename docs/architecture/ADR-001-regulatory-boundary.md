# ADR-001: Separate Carbon Accounting from Regulatory Compliance

- **Status:** Accepted for implementation
- **Date:** 2026-10-08
- **Decision:** Separate domains with explicit integration contracts

## Context

Carbon accounting requires deterministic treatment of activity data, units, emission factors and GHG calculations. Regulatory/compliance requirements are jurisdiction-specific and can change independently through legislation, delegated acts, guidance, thresholds, commodity codes, reporting rules and administrative requirements.

Combining both concerns in the same calculation domain would make regulatory changes capable of altering the accounting core and would make historical compliance decisions harder to reconstruct.

## Decision

1. Keep `carbon-core` regulatory-agnostic.
2. Keep `factor-registry` focused on emission factors and their provenance/versioning.
3. Keep `carbon-ledger` focused on durable calculation/evidence lineage.
4. Use `regulatory-engine` as a separate domain boundary.
5. Make regulatory rules jurisdiction-specific, versioned and effective-dated.
6. Require explainable regulatory decisions with rule/version identifiers and reasons.
7. Fail closed on missing, inactive or ambiguous regulatory rules.
8. Do not create a universal CBAM rule set.
9. Implement EU CBAM, UK CBAM and future border-carbon regimes as separate regulatory modules.
10. Keep official government registries and filing systems external to the platform unless a documented integration is later established.

## Consequences

### Positive

- Regulatory changes do not contaminate deterministic carbon accounting.
- Historical decisions can be reconstructed.
- Different jurisdictions can evolve independently.
- Audit evidence can show exactly which rule/version produced a decision.
- New regimes can be added without rewriting `carbon-core`.

### Trade-offs

- More explicit interfaces and domain models are required.
- Regulatory implementations need their own tests and release/version discipline.
- Some data must be shared through controlled contracts rather than direct internal coupling.

## Non-goals

This decision does not establish the legal applicability of any specific regulation and does not constitute legal advice.

It also does not copy or reproduce source legislation. Authoritative legal sources will be referenced and transformed into structured implementation rules only where legally permitted.
