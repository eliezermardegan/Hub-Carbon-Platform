import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmissions } from "./index.js";

test("calculates deterministic activity × factor emissions", () => {
  const result = calculateEmissions({
    id: "activity-1",
    scope: 1,
    category: "scope1.mobile_combustion",
    quantity: 100,
    unit: "L",
    method: "activity_based",
    factorId: "factor-1",
    factorValue: 2.31,
    factorUnit: "kgCO2e/L",
    factorVersion: "test-1"
  });
  assert.equal(result.emissionsKgCo2e, 231);
  assert.equal(result.emissionsUnit, "kgCO2e");
  assert.equal(result.formula, "100 L × 2.31 kgCO2e/L");
});

test("normalizes equivalent mass units before calculation", () => {
  const result = calculateEmissions({
    id: "activity-tonnes",
    scope: 1,
    category: "cbam_embedded_emissions",
    quantity: 10000,
    unit: "t",
    method: "activity_based",
    factorId: "factor-tco2-per-t",
    factorValue: 1.539,
    factorUnit: "tCO2e/t",
    factorVersion: "test-1"
  });

  assert.equal(result.emissionsKgCo2e, 15_390_000);
  assert.equal(result.emissionsUnit, "kgCO2e");
});

test("normalizes quantity when factor denominator uses kg", () => {
  const result = calculateEmissions({
    id: "activity-tonnes-to-kg",
    scope: 1,
    category: "cbam_embedded_emissions",
    quantity: 10,
    unit: "t",
    method: "activity_based",
    factorId: "factor-kg",
    factorValue: 1.539,
    factorUnit: "kgCO2e/kg",
    factorVersion: "test-1"
  });

  assert.equal(result.emissionsKgCo2e, 15_390);
});

test("rejects incompatible units instead of calculating silently", () => {
  assert.throws(
    () => calculateEmissions({
      id: "invalid-unit",
      scope: 1,
      category: "invalid",
      quantity: 100,
      unit: "L",
      method: "activity_based",
      factorId: "factor-1",
      factorValue: 2,
      factorUnit: "kgCO2e/kWh",
      factorVersion: "test-1"
    }),
    /Incompatible activity units/
  );
});
