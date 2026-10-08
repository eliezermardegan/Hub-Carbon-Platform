import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmissions } from "../../carbon-core/src/index.js";
import { ukGovernment2026ElectricityFactor } from "./uk-2026-electricity.js";

test("UK Government 2026 electricity factor flows through Carbon Core", () => {
  const activity = {
    id: "uk-2026-electricity-golden",
    scope: 2 as const,
    category: ukGovernment2026ElectricityFactor.category,
    quantity: 10_000,
    unit: ukGovernment2026ElectricityFactor.activityUnit,
    method: "activity_based" as const,
    factorId: ukGovernment2026ElectricityFactor.id,
    factorValue: ukGovernment2026ElectricityFactor.value,
    factorUnit: ukGovernment2026ElectricityFactor.factorUnit,
    factorVersion: ukGovernment2026ElectricityFactor.version
  };

  const result = calculateEmissions(activity);

  assert.equal(result.emissionsKgCo2e, 1309.6);
  assert.equal(result.formula, `${activity.quantity} ${activity.unit} × ${activity.factorValue} ${activity.factorUnit}`);
  assert.equal(result.factorId, ukGovernment2026ElectricityFactor.id);
  assert.equal(result.factorVersion, "2026");
});
