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
    sourceVersion: "2025-test",
    license: "TEST",
    legalBasis: "Synthetic test data permission",
    attributionRequired: false,
    redistributionAllowed: true,
    sourceContentSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    retrievedAt: "2026-01-01T00:00:00Z",
    geography: "US",
    originalUnit: "m3",
    normalizedUnit: "kgCO2e/m3",
    transformation: "None; value reproduced as published.",
    evidenceRef: "test://synthetic-factor/2025-test"
  }
};

test("requires complete provenance metadata", () => {
  assert.doesNotThrow(() => assertValidFactor(factor));
  assert.throws(() => assertValidFactor({
    ...factor,
    provenance: { ...factor.provenance, sourceContentSha256: "pending" }
  }), /sourceContentSha256 must be a SHA-256 hex digest/);
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

test("excludes blocked factors from normal lookups unless explicitly requested for review", () => {
  const blocked = {
    ...factor,
    id: "blocked.factor",
    status: "blocked" as const,
    provenance: { ...factor.provenance, redistributionAllowed: false, sourceContentSha256: "" }
  };
  assert.equal(findFactors([blocked], { scope: 1 }).length, 0);
  assert.equal(findFactors([blocked], { scope: 1, status: "blocked" }).length, 1);
  assert.equal(factorIsImportable(blocked), false);
});
