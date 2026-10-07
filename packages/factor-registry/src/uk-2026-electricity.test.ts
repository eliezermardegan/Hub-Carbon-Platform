import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFactor, factorIsImportable, findFactors } from "./index.js";
import { ukGovernment2026ElectricityFactor } from "./uk-2026-electricity.js";

test("accepts the verified UK Government 2026 electricity factor", () => {
  assert.doesNotThrow(() => assertValidFactor(ukGovernment2026ElectricityFactor));
  assert.equal(factorIsImportable(ukGovernment2026ElectricityFactor), true);
});

test("resolves the UK electricity factor for 2026 Scope 2 activity", () => {
  const matches = findFactors([ukGovernment2026ElectricityFactor], { scope: 2, geography: "GB", activityUnit: "kWh", asOf: "2026-06-01" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].value, 0.13096);
  assert.equal(matches[0].factorUnit, "kgCO2e/kWh");
});

test("does not resolve the 2026 factor outside its effective year", () => {
  assert.equal(findFactors([ukGovernment2026ElectricityFactor], { scope: 2, geography: "GB", activityUnit: "kWh", asOf: "2027-01-01" }).length, 0);
});

test("keeps official source and licence provenance", () => {
  assert.equal(ukGovernment2026ElectricityFactor.provenance.sourceVersion, "2026");
  assert.equal(ukGovernment2026ElectricityFactor.provenance.license, "Open Government Licence v3.0");
  assert.equal(ukGovernment2026ElectricityFactor.provenance.redistributionAllowed, true);
  assert.equal(ukGovernment2026ElectricityFactor.provenance.attributionRequired, true);
});
