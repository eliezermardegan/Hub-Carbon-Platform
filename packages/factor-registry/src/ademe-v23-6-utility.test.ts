import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFactor, factorIsImportable, findFactors } from "./index.js";
import { ademeV23_6UtilityUnder3_5tFactor } from "./ademe-v23-6-utility.js";

test("keeps ADEME factor blocked while exact source provenance is unverified", () => {
  assert.doesNotThrow(() => assertValidFactor(ademeV23_6UtilityUnder3_5tFactor));
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.status, "blocked");
  assert.equal(factorIsImportable(ademeV23_6UtilityUnder3_5tFactor), false);
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.sourceContentSha256, "");
});

test("resolves the ADEME utility factor metadata for review without approving it for calculations", () => {
  const matches = findFactors([ademeV23_6UtilityUnder3_5tFactor], {
    scope: 3,
    geography: "FR",
    activityUnit: "km",
    status: "blocked"
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, "blocked");
  assert.equal(matches[0].value, 0.235);
  assert.equal(matches[0].factorUnit, "kgCO2e/km");
});

test("records ADEME source claims as unverified pending exact artifact review", () => {
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.sourceVersion, "23.6");
  assert.match(ademeV23_6UtilityUnder3_5tFactor.provenance.sourceDocument ?? "", /unverified/i);
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.redistributionAllowed, false);
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.attributionRequired, true);
});
