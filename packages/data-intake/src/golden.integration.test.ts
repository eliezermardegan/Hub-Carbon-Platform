import { DataIntakeService } from "./service";
import type { ActivityRecord } from "./index";

const base:ActivityRecord={activityId:"golden-1",companyId:"tenant-1",reportingPeriodId:"2026",scope:2,activityType:"electricity",quantity:10000,unit:"kWh",method:"activity_based",dataAvailability:"provided",dataQuality:{level:"A",completeness:1,rationale:"synthetic fixture"},confidence:{score:1,level:"high",source:"manual",humanReviewed:true},evidenceIds:["ev-1"],classificationStatus:"classified",calculationStatus:"ready",idempotencyKey:"golden-1"};
const factor:any={id:"fixture-s2",version:"fixture-1",status:"verified",name:"Synthetic test factor",scope:2,category:"electricity",activityUnit:"kWh",factorUnit:"kgCO2e/kWh",value:.5,dataQuality:"high",provenance:{sourceName:"Hub Carbon synthetic fixture",sourceUrl:"internal",license:"project-test",attributionRequired:false,redistributionAllowed:false,retrievedAt:"2026-01-01"}};
test("golden end-to-end: 10000 kWh at 0.5 kgCO2e/kWh = 5000 kgCO2e",async()=>{
 const persistence:any={saveActivity:jest.fn(),saveDocument:jest.fn(),saveEvidence:jest.fn()};
 const resolver:any={resolve:jest.fn().mockResolvedValue(factor)};
 const ledger:any={append:jest.fn().mockResolvedValue({id:"golden-1"})};
 const service=new DataIntakeService(persistence,resolver,ledger);
 const result=await service.ingestActivity(base,{tenantId:"tenant-1",actorId:"test",methodologyVersion:"fixture-1"});
 expect(result.calculation?.emissionsKgCo2e).toBe(5000);
 expect(ledger.append).toHaveBeenCalledTimes(1);
 const command=ledger.append.mock.calls[0][0];
 expect(command.factor.id).toBe("fixture-s2");
 expect(command.factor.version).toBe("fixture-1");
 expect(command.activity.quantity).toBe(10000);
});
