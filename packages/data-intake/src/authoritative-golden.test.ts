import { readFileSync } from "node:fs";
import { calculateEmissions } from "../../carbon-core/src/index.js";

type Fixture={id:string;scope:1|2|3;category:string;quantity:number;unit:string;factorId:string;factorVersion:string;factorValue:number;factorUnit:string;expectedKgCO2e:number;source:{name:string;url:string;license:string;redistributionAllowed:boolean}};
const fixture=JSON.parse(readFileSync(new URL("../fixtures/authoritative-golden.json",import.meta.url),"utf8")) as {cases:Fixture[]};

test.each(fixture.cases)("$id reproduces the declared reference result and provenance",c=>{
 expect(c.source.name).toBeTruthy(); expect(c.source.url).toBeTruthy(); expect(c.source.license).toBeTruthy();
 const result=calculateEmissions({id:c.id,scope:c.scope,category:c.category,quantity:c.quantity,unit:c.unit,method:c.scope===3&&c.unit==="BRL"?"spend_based":"activity_based",factorId:c.factorId,factorValue:c.factorValue,factorUnit:c.factorUnit,factorVersion:c.factorVersion});
 expect(result.emissionsKgCo2e).toBe(c.expectedKgCO2e);
 expect(result.factorId).toBe(c.factorId); expect(result.factorVersion).toBe(c.factorVersion);
});
