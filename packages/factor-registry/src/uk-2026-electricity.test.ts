import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFactor, factorIsImportable, findFactors } from "./index.js";
import { ukGovernment2026ElectricityFactor } from "./uk-2026-electricity.js";

test("keeps UK Government 2026 electricity factor blocked until source verification", () => {
  assert.doesNotThrow(() => assertValidFactor(ukGovernment2026ElectricityFactor));
  assert.equal(ukGovernment2026ElectricityFactor.status, "blocked");
  assert.equal(factorIsImportable(ukGovernment2026ElectricityFactor), false);
  assert.equal(ukGovernment2026ElectricityFactor.provenance.sourceContentSha256, "");
});

test("resolves UK electricity metadata for 2026 review but does not approve use", () => {
  const matches = findFactors([ukGovernment2026ElectricityFactor], { scope: 2, geography: "GB", activityUnit: "kWh", asOf: "2026-06-01", status: "blocked" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, "blocked");
  assert.equal(matches[0].value, 0.13096);
  assert.equal(matches[0].factorUnit, "kgCO2e/kWh");
});

test("does not resolve the 2026 factor outside its effective year", () => {
  assert.equal(findFactors([ukGovernment2026ElectricityFactor], { scope: 2, geography: "GB", activityUnit: "kWh", asOf: "2027-01-01" }).length, 0);
});

test("records UK source and licence claims as unverified", () => {
  assert.equal(ukGovernment2026ElectricityFactor.provenance.sourceVersion.startsWith("2026"), true);
  assert.match(ukGovernment2026ElectricityFactor.provenance.sourceDocument ?? "", /unverified/i);
  assert.equal(ukGovernment2026ElectricityFactor.provenance.redistributionAllowed, false);
  assert.equal(ukGovernment2026ElectricityFactor.provenance.attributionRequired, true);
});
