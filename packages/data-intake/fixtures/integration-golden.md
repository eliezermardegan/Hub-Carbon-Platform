# Integration golden dataset

These fixtures are intentionally synthetic and are not authoritative emission factors. They test arithmetic and lineage only.

## Case A — Scope 1 natural gas
Activity: 1,000 m3 natural gas
Factor: 2.00 kgCO2e/m3
Expected: 2,000 kgCO2e = 2.000 tCO2e

## Case B — Scope 2 electricity
Activity: 10,000 kWh electricity
Factor: 0.50 kgCO2e/kWh
Expected: 5,000 kgCO2e = 5.000 tCO2e

## Case C — Scope 3 Category 1 spend
Activity: BRL 100,000 purchased goods
Method: spend_based
Factor: 0.20 kgCO2e/BRL
Expected: 20,000 kgCO2e = 20.000 tCO2e

## Case D — Scope 3 Category 4 freight
Activity: 20,000 tonne-km
Factor: 0.10 kgCO2e/tonne-km
Expected: 2,000 kgCO2e = 2.000 tCO2e

## Case E — unresolved input
Activity: electricity with no quantity
Expected: no calculation and no Carbon Ledger append.

## Reference rule

A passing test proves that the implementation reproduces the explicitly declared fixture. It does NOT prove that the factor is scientifically authoritative. Authoritative-factor validation requires a separately licensed and versioned source fixture with provenance recorded in the Factor Registry.
