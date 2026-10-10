# Official factor test fixtures

These fixtures are **test-only**. They document real official source records used to exercise the factor-registry code.

They are intentionally outside `factors/`, so the production factor provenance gate does not treat them as production factors.

## ADEME Base Carbone V23.6

- Publisher: ADEME
- Dataset: Base Carbone V23.6
- Official dataset: https://data.ademe.fr/datasets/base-carboner
- Record: 28276
- Value: 0.235 kgCO2e/km
- Fixture snapshot SHA-256: `9aa6c68a0f6aa1c30be1befc3f8a3b78d95b83b40c0c225cbfe29ede59d7ffea`
- The snapshot hash is a hash of the repository fixture, **not** a claim about the upstream ADEME artifact hash.

## UK DESNZ 2026

- Publisher: Department for Energy Security and Net Zero
- Official publication: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026
- Artifact used by the July 2026 automatic-processing update: https://assets.publishing.service.gov.uk/media/6a6c9748862aaf18d9c62ac9/ghg-conversion-factors-2026-flat-format-revised.xlsx
- Record: Factors by Category, ID 7_400_4000_5_1
- Value: 0.13096 kgCO2e/kWh
- Fixture snapshot SHA-256: `f542acabc2e263c01372be6e7e1f6436f1b1d0a0ad2142de175ee4d143c395be`
- The snapshot hash is a hash of the repository fixture, **not** a claim about the upstream DESNZ workbook hash.

## Boundary

A fixture source URL and record reference establish test provenance. They do **not** promote a fixture to production status.

Production factors remain subject to the strict provenance gate, including a real SHA-256 of the exact upstream source artifact when reproducibility depends on that artifact.
