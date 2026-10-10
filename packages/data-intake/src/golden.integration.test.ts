import test from "node:test";
import assert from "node:assert/strict";
import { DataIntakeService } from "./service";
import type { ActivityRecord } from "./index";
import { InMemoryDataIntakePersistence } from "./persistence";

const base:ActivityRecord={activityId:"golden-1",companyId:"tenant-1",reportingPeriodId:"2026",scope:2,activityType:"electricity",quantity:10000,unit:"kWh",method:"activity_based",dataAvailability:"provided",dataQuality:{level:"A",completeness:1,rationale:"synthetic fixture"},confidence:{score:1,level:"high",source:"manual",humanReviewed:true},evidenceIds:["ev-1"],classificationStatus:"classified",calculationStatus:"ready",idempotencyKey:"golden-1"};
const factor:any={id:"fixture-s2",version:"fixture-1",status:"verified",name:"Synthetic test factor",scope:2,category:"electricity",activityUnit:"kWh",factorUnit:"kgCO2e/kWh",value:.5,dataQuality:"high",provenance:{sourceName:"Hub Carbon synthetic test fixture",sourceUrl:"test://factor/fixture-s2",sourceVersion:"fixture-v1",license:"test-only",legalBasis:"Synthetic test fixture; not production evidence",attributionRequired:false,redistributionAllowed:true,sourceContentSha256:"ba7b10b5afb62f2852574f5969acaa64ba71d4f062ac2224f90f9ec23435fdaa",retrievedAt:"2026-01-01T00:00:00Z",geography:"TEST",originalUnit:"kWh",normalizedUnit:"kgCO2e/kWh",transformation:"Synthetic fixture; no transformation",evidenceRef:"test://factor/fixture-s2"}};

test("golden end-to-end: 10000 kWh at 0.5 kgCO2e/kWh = 5000 kgCO2e", async () => {
  let appendCount=0;
  let command:any;
  const persistence=new InMemoryDataIntakePersistence();
  const resolver:any={resolve:async()=>factor};
  const ledger:any={append:async(c:any)=>{appendCount++;command=c;return{id:"golden-1"}}};
  const service=new DataIntakeService(persistence,resolver,ledger);
  const result=await service.ingestActivity(base,{tenantId:"tenant-1",actorId:"test",methodologyVersion:"fixture-1"});
  assert.equal(result.calculation?.emissionsKgCo2e,5000);
  assert.equal(appendCount,1);
  assert.equal(command.factor.id,"fixture-s2");
  assert.equal(command.factor.version,"fixture-1");
  assert.equal(command.activity.quantity,10000);
});
