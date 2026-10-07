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
  assert.equal(result.formula, "quantity × factorValue");
});
