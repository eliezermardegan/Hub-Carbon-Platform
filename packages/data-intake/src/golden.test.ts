import test from "node:test";
import assert from "node:assert/strict";
import { calculateEmissions } from "../../carbon-core/src/index.js";

const cases = [
  {name:"Scope 1 natural gas",scope:1 as const,quantity:1000,unit:"m3",factorId:"fixture-s1",factorValue:2,factorUnit:"kgCO2e/m3",expected:2000},
  {name:"Scope 2 electricity",scope:2 as const,quantity:10000,unit:"kWh",factorId:"fixture-s2",factorValue:.5,factorUnit:"kgCO2e/kWh",expected:5000},
  {name:"Scope 3 category 1 spend",scope:3 as const,quantity:100000,unit:"BRL",factorId:"fixture-s3c1",factorValue:.2,factorUnit:"kgCO2e/BRL",expected:20000},
  {name:"Scope 3 category 4 freight",scope:3 as const,quantity:20000,unit:"tonne-km",factorId:"fixture-s3c4",factorValue:.1,factorUnit:"kgCO2e/tonne-km",expected:2000}
];

for (const c of cases) {
  test(c.name + " reproduces declared expected emissions", () => {
    const result = calculateEmissions({id:c.name,scope:c.scope,category:c.name,quantity:c.quantity,unit:c.unit,method:"activity_based",factorId:c.factorId,factorValue:c.factorValue,factorUnit:c.factorUnit,factorVersion:"fixture-1"});
    assert.equal(result.emissionsKgCo2e,c.expected);
    assert.equal(result.formula, `${c.quantity} ${c.unit} × ${c.factorValue} ${c.factorUnit}`);
  });
}
