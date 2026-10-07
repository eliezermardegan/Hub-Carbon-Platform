import { calculateEmissions } from "../../carbon-core/src/index.js";

const cases=[
 {name:"Scope 1 natural gas",quantity:1000,unit:"m3",factorId:"fixture-s1",factorValue:2,factorUnit:"kgCO2e/m3",expected:2000},
 {name:"Scope 2 electricity",quantity:10000,unit:"kWh",factorId:"fixture-s2",factorValue:.5,factorUnit:"kgCO2e/kWh",expected:5000},
 {name:"Scope 3 category 1 spend",quantity:100000,unit:"BRL",factorId:"fixture-s3c1",factorValue:.2,factorUnit:"kgCO2e/BRL",expected:20000},
 {name:"Scope 3 category 4 freight",quantity:20000,unit:"tonne-km",factorId:"fixture-s3c4",factorValue:.1,factorUnit:"kgCO2e/tonne-km",expected:2000}
];
test.each(cases)("$name reproduces declared expected emissions",c=>{
 const result=calculateEmissions({id:c.name,scope:1,category:c.name,quantity:c.quantity,unit:c.unit,method:"activity_based",factorId:c.factorId,factorValue:c.factorValue,factorUnit:c.factorUnit,factorVersion:"fixture-1"});
 expect(result.emissionsKgCo2e).toBe(c.expected);
 expect(result.formula).toContain("activity quantity");
});
