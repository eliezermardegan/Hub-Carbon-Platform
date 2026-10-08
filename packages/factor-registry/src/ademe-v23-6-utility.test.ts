import test from "node:test";
import assert from "node:assert/strict";
import { assertValidFactor, factorIsImportable, findFactors } from "./index.js";
import { ademeV23_6UtilityUnder3_5tFactor } from "./ademe-v23-6-utility.js";

test("accepts the verified ADEME Base Carbone 23.6 factor", () => {
  assert.doesNotThrow(() => assertValidFactor(ademeV23_6UtilityUnder3_5tFactor));
  assert.equal(factorIsImportable(ademeV23_6UtilityUnder3_5tFactor), true);
});

test("resolves the ADEME utility factor for Scope 3 category 4 activity", () => {
  const matches = findFactors([ademeV23_6UtilityUnder3_5tFactor], {
    scope: 3,
    geography: "FR",
    activityUnit: "km"
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].value, 0.235);
  assert.equal(matches[0].factorUnit, "kgCO2e/km");
});

test("preserves the ADEME source record and licence provenance", () => {
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.sourceVersion, "23.6");
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.sourceDocument, "Base_Carbone_V23.6.csv, record 28276; dataset updated 2025-07-03");
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.license, "Licence Ouverte / Open Licence 2.0");
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.redistributionAllowed, true);
  assert.equal(ademeV23_6UtilityUnder3_5tFactor.provenance.attributionRequired, true);
});
