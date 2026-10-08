import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmissions } from "../../carbon-core/src/index.js";
import { ademeV23_6UtilityUnder3_5tFactor } from "./ademe-v23-6-utility.js";

test("calculates emissions with the real ADEME Base Carbone factor", () => {
  const result = calculateEmissions({
    id: "ademe-chain-utility",
    scope: 3,
    category: "scope3.category4.upstream_transport_and_distribution",
    quantity: 1000,
    unit: "km",
    method: "ademe-base-carbone-v23.6",
    factorId: ademeV23_6UtilityUnder3_5tFactor.id,
    factorValue: ademeV23_6UtilityUnder3_5tFactor.value,
    factorUnit: ademeV23_6UtilityUnder3_5tFactor.factorUnit,
    factorVersion: ademeV23_6UtilityUnder3_5tFactor.version
  });

  assert.equal(result.emissionsKgCo2e, 235);
  assert.equal(result.factorId, ademeV23_6UtilityUnder3_5tFactor.id);
  assert.equal(result.factorVersion, "23.6");
});
