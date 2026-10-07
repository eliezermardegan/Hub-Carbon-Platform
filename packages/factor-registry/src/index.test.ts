import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFactor, factorIsImportable, findFactors, type EmissionFactor } from "./index.js";

const factor: EmissionFactor = {
  id: "demo.natural_gas.combustion",
  version: "2025-demo",
  status: "verified",
  name: "Demo natural gas factor",
  scope: 1,
  category: "scope1.stationary_combustion",
  geography: "US",
  applicableFrom: "2025-01-01",
  applicableTo: "2025-12-31",
  activityUnit: "m3",
  factorUnit: "kgCO2e/m3",
  value: 1.9,
  method: "activity_based",
  dataQuality: "medium",
  provenance: {
    sourceName: "Synthetic test source",
    sourceUrl: "https://example.invalid/factor",
    license: "TEST",
    attributionRequired: false,
    redistributionAllowed: true,
    retrievedAt: "2026-01-01T00:00:00Z"
  }
};

test("requires provenance metadata", () => {
  assert.doesNotThrow(() => assertValidFactor(factor));
});

test("matches factors by scope, geography and effective date", () => {
  assert.equal(findFactors([factor], {
    scope: 1, geography: "US", asOf: "2025-06-01"
  }).length, 1);
  assert.equal(findFactors([factor], {
    scope: 1, geography: "US", asOf: "2026-06-01"
  }).length, 0);
});

test("blocks factors whose source does not permit redistribution", () => {
  assert.equal(factorIsImportable(factor), true);
  assert.equal(factorIsImportable({
    ...factor,
    provenance: { ...factor.provenance, redistributionAllowed: false }
  }), false);
});
