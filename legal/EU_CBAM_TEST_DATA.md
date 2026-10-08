# EU CBAM Golden Test Data

## Purpose

This file documents the provenance and legal boundary for normalized EU CBAM
golden-test values used by the repository.

The fixture is derived from an **official European Commission worked example**.
It is test data, not a statement that the example remains the legally applicable
methodology for the EU CBAM definitive period.

## Source

- Publisher: European Commission, Directorate-General for Taxation and Customs Union
- Document: *Guidance document on CBAM implementation for installation operators outside the EU*
- Section: 7.2.2.2, "Example 2 – EAF and conversion to iron or steel products"
- Tables: 7-11, 7-12, 7-13 and 7-14
- Official source:
  https://taxation-customs.ec.europa.eu/system/files/2023-12/Guidance%20document%20on%20CBAM%20implementation%20for%20installation%20operators%20outside%20the%20EU.pdf

The European Commission currently identifies this material in the historical
CBAM guidance context. The repository therefore labels the fixture explicitly
as a **transitional-period worked example**.

## Golden values

The official example provides:

- 1,133,000 t/year total steel products in process 2
- EAF process-2 direct specific embedded emissions: 1.440 tCO2/t
- EAF process-2 indirect specific embedded emissions: 1.732 tCO2/t
- 3.171 tCO2/t specific total embedded emissions (1.440 direct + 1.732 indirect)
- 100 t import example: 144 tCO2 direct + 173.2 tCO2 indirect = 317.2 tCO2 total



## Reuse boundary

The repository does **not** redistribute the original Commission PDF.

Only normalized numerical test values and source metadata are stored.
The original source remains the authoritative reference.

The source file hash is intentionally left unset until the exact downloaded
source artifact can be obtained and hashed locally. This prevents us from
claiming provenance for a different copy or revision.

## Important limitation

These values are suitable for a **golden mathematical regression test**.
They must not be used as the definitive 2026 CBAM compliance calculation.

The definitive CBAM regime has separate current implementing regulations,
default values, benchmarks, sector guidance, verification requirements and
other rules. Those will be introduced as independently versioned regulatory
rules in later PRs.
