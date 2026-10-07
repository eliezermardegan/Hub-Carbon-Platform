import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateEmissions } from "../../carbon-core/src/index.js";

type Fixture={id:string;scope:1|2|3;category:string;quantity:number;unit:string;factorId:string;factorVersion:string;factorValue:number;factorUnit:string;expectedKgCO2e:number;source:{name:string;url:string;license:string;redistributionAllowed:boolean}};
const fixture=JSON.parse(readFileSync(new URL("../fixtures/authoritative-golden.json",import.meta.url),"utf8")) as {cases:Fixture[]};

for (const c of fixture.cases) {
  test(c.id + " reproduces the declared reference result and provenance", () => {
    assert.ok(c.source.name);
    assert.ok(c.source.url);
    assert.ok(c.source.license);
    const result=calculateEmissions({id:c.id,scope:c.scope,category:c.category,quantity:c.quantity,unit:c.unit,method:c.scope===3&&c.unit==="BRL"?"spend_based":"activity_based",factorId:c.factorId,factorValue:c.factorValue,factorUnit:c.factorUnit,factorVersion:c.factorVersion});
    assert.equal(result.emissionsKgCo2e,c.expectedKgCO2e);
    assert.equal(result.factorId,c.factorId);
    assert.equal(result.factorVersion,c.factorVersion);
  });
}
