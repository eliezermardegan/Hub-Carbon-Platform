# EU CBAM End-to-End Test Data Boundary

This test cycle uses normalized values from an official European Commission worked example for an EAF iron-and-steel route (section 7.2.2.2, Example 2).

Source:
- Publisher: European Commission
- Document: Guidance document on CBAM implementation for installation operators outside the EU
- Section: 7.2.2.2, Example 2 – EAF and conversion to iron or steel products
- URL: https://taxation-customs.ec.europa.eu/system/files/2023-12/Guidance%20document%20on%20CBAM%20implementation%20for%20installation%20operators%20outside%20the%20EU.pdf
- Status: official worked example from the transitional period

Boundary:
- The original Commission PDF is not redistributed.
- The numeric checks below are cross-checked against the Commission worked-example outputs.
- Only normalized test values and source metadata are used.
- The test must not be interpreted as a current definitive-period legal rule.
- The regulatory rule in the end-to-end test is explicitly synthetic and test-only.
- Current definitive EU CBAM rules must be implemented from their applicable legal instruments and guidance in a separate regulatory module.

The test verifies architectural lineage:
source/evidence -> data intake -> deterministic carbon calculation -> append-only ledger -> carbon report -> regulatory decision -> CBAM report.

The report layer intentionally references existing ledger event IDs instead of copying a second accounting record.


## Validated unit contract

The official EAF worked example uses a 100 t import example with 1.440 tCO2/t direct and 1.732 tCO2/t indirect specific embedded emissions. The deterministic carbon-core representation preserves each source factor unit and converts results to canonical kgCO2e:

- Direct: 100 t × 1.440 tCO2e/t = 144 tCO2e = 144,000 kgCO2e
- Indirect: 100 t × 1.732 tCO2e/t = 173.2 tCO2e = 173,200 kgCO2e
- Total: 317.2 tCO2e = 317,200 kgCO2e
- Carbon Report total: 317,200 kgCO2e
- CBAM Report representation: 317.2 tCO2e

These are mathematically equivalent representations of the same result. The test must not substitute a 1,000x-shifted value such as 0.3172 or 317,200 tCO2e.
