import { DataIntakeService } from "./service";
import type { ActivityRecord } from "./index";

const activity=(overrides:Partial<ActivityRecord>={}):ActivityRecord=>({
 activityId:"a1",companyId:"tenant-1",reportingPeriodId:"2026",scope:2,activityType:"electricity",
 quantity:100,unit:"kWh",method:"activity_based",dataAvailability:"provided",
 dataQuality:{level:"A",completeness:1,rationale:"meter"},
 confidence:{score:1,level:"high",source:"manual",humanReviewed:true},evidenceIds:["e1"],
 classificationStatus:"classified",calculationStatus:"ready",idempotencyKey:"a1",...overrides
});
const factor:any={id:"f1",version:"1",status:"verified",name:"test",scope:2,category:"electricity",activityUnit:"kWh",factorUnit:"kgCO2e/kWh",value:.4,dataQuality:"high",provenance:{sourceName:"test",sourceUrl:"https://example.invalid",license:"test",attributionRequired:false,redistributionAllowed:false,retrievedAt:"2026-01-01"}};
test("ingests, calculates and sends activity to ledger",async()=>{
 const persistence:any={saveActivity:jest.fn(),saveDocument:jest.fn(),saveEvidence:jest.fn()};
 const resolver:any={resolve:jest.fn().mockResolvedValue(factor)};
 const ledger:any={append:jest.fn().mockResolvedValue({id:"a1",eventType:"entry"})};
 const service=new DataIntakeService(persistence,resolver,ledger);
 const result=await service.ingestActivity(activity(),{tenantId:"tenant-1",actorId:"user-1",methodologyVersion:"v1",now:"2026-01-01T00:00:00Z"});
 expect(result.calculation?.emissionsKgCo2e).toBe(40);
 expect(resolver.resolve).toHaveBeenCalled();
 expect(ledger.append).toHaveBeenCalled();
});
test("does not send unresolved data to ledger",async()=>{
 const persistence:any={saveActivity:jest.fn(),saveDocument:jest.fn(),saveEvidence:jest.fn()};
 const resolver:any={resolve:jest.fn()}; const ledger:any={append:jest.fn()};
 const service=new DataIntakeService(persistence,resolver,ledger);
 const result=await service.ingestActivity(activity({dataAvailability:"not_available",calculationStatus:"not_ready"}),{tenantId:"tenant-1",actorId:"user-1",methodologyVersion:"v1"});
 expect(ledger.append).not.toHaveBeenCalled(); expect(result.handoff.calculationReady).toBe(false);
});
