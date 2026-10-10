# Regulatory Source Register

This register records authoritative regulatory sources used to implement jurisdiction-specific rules.

| Jurisdiction | Regime / source | Version / document | Effective period | Source authority | Source URL | Retrieved | Content SHA-256 | Implementation status |
|---|---|---|---|---|---|---|---|---|
| EU | CBAM | European Commission worked example, section 7.2.2.2, tables 7-11 to 7-14 | Transitional-period worked example | European Commission | https://taxation-customs.ec.europa.eu/system/files/2023-12/Guidance%20document%20on%20CBAM%20implementation%20for%20installation%20operators%20outside%20the%20EU.pdf | 2026-10-08 | Pending exact artifact | Test provenance only; not a definitive current legal rule |

## Rules

- Each production regulatory rule must identify its authoritative legal or administrative source.
- Historical versions must remain identifiable and must not be silently overwritten.
- Effective dates are mandatory for rules that change over time.
- A worked example or guidance document must not be represented as the legal instrument itself.
- The repository must distinguish test-only regulatory examples from production compliance rules.
- If an exact source artifact cannot be hashed, mark the hash as pending rather than fabricating provenance.
