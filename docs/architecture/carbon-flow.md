# Carbon flow: activity → factor → calculation → ledger → evidence

The carbon ledger is the audit-oriented boundary between deterministic calculation and durable application workflows.

## Flow

1. **Activity record** — a normalized business activity references a factor ID and exact factor version.
2. **Factor registry** — the selected factor supplies value, unit and provenance metadata. The ledger snapshots this metadata at write time.
3. **Carbon core** — calculates quantity × factorValue deterministically and returns the factor identity used.
4. **Evidence** — invoice, receipt, meter, ERP record, supplier submission or manual evidence is attached by reference.
5. **Ledger entry** — the calculation, factor snapshot, evidence references, methodology version and previous hash are stored together.
6. **Hash chain** — each entry contains a SHA-256 hash over a canonical representation of the unsigned entry and points to the previous entry hash.
7. **Verification** — the chain can be replayed to detect changed, reordered or missing entries.

## Integrity boundary

The current package is an in-memory domain primitive. Hash chaining provides tamper evidence for the application object, but it is **not** a replacement for durable transactional storage, authentication, authorization, tenant isolation, encryption/key management or immutable archival.

A production adapter should persist ledger entries in a transactional database and preserve append-only semantics. Corrections should be represented as explicit restatement/reversal events rather than mutating historical entries.

## Legal and methodological boundary

The ledger does not define emission factors or regulatory methodology. It records which versioned factor and methodology were used. Factor values and regulatory rules remain subject to the provenance and licensing gates in `legal/` and the versioned registries.
