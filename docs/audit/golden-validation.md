# Golden validation

The repository separates two questions:

1. Arithmetic correctness: deterministic fixtures verify quantity × factorValue and factor identity/version propagation.
2. Source authority: a production factor fixture may only be promoted when its source, publication/version, license, redistribution rights and provenance have been independently verified.

The current golden values are synthetic and must not be presented to customers as official emission factors.

A production evidence chain must preserve:
- source document and URL
- source version/publication date
- factor ID and version
- source content hash when available
- calculation input quantity/unit
- calculation output
- evidence/document identifiers
- Carbon Ledger event ID and hash
- methodology version

Audit assertions:
- recomputed result == ledger result
- ledger factor snapshot == selected factor registry version
