import {SCOPE3_CATEGORIES,createActivity,defaultIdempotencyKey,toLedgerHandoff,validateActivity} from "./index";

const base={
 companyId:"company-1",reportingPeriodId:"2026",scope:3 as const,scope3Category:1 as const,
 activityType:"purchased_goods",quantity:100,unit:"kg",method:"activity_based" as const,
 dataAvailability:"provided" as const,
 dataQuality:{level:"B" as const,completeness:1,rationale:"Supplier quantity from invoice"},
 confidence:{score:.98,level:"high" as const,source:"extraction" as const,modelVersion:"test",humanReviewed:true},
 evidenceIds:["evidence-1"],classificationStatus:"classified" as const,calculationStatus:"ready" as const,
 factorId:"factor-1",factorVersion:"2026.1"
};

test("represents all 15 Scope 3 categories",()=>{expect(Object.keys(SCOPE3_CATEGORIES)).toHaveLength(15);expect(SCOPE3_CATEGORIES[15]).toBe("investments");});
test("creates validated activity and idempotency",()=>{const a=createActivity({...base,sourceDocumentId:"doc-1",sourceRecordId:"line-1"});expect(a.activityId).toBeTruthy();expect(a.idempotencyKey).toBe(defaultIdempotencyKey({companyId:"company-1",reportingPeriodId:"2026",sourceDocumentId:"doc-1",sourceRecordId:"line-1",activityType:"purchased_goods"}));});
test("missing quantity is not zero",()=>{const r=validateActivity({...base,quantity:undefined});expect(r.valid).toBe(false);expect(r.issues.some(i=>i.code==="activity_quantity")).toBe(true);});
test("spend based requires spend",()=>{const r=validateActivity({...base,method:"spend_based",quantity:undefined,financialAmount:undefined});expect(r.valid).toBe(false);expect(r.issues.some(i=>i.code==="spend_amount")).toBe(true);});
test("confidence and quality remain distinct",()=>{const r=validateActivity({...base,dataQuality:{level:"C",completeness:1,rationale:"Spend proxy"},confidence:{score:.99,level:"high",source:"extraction",humanReviewed:true}});expect(r.valid).toBe(true);});
test("ledger handoff blocks missing factor/evidence",()=>{const a=createActivity({...base,factorId:undefined,factorVersion:undefined});expect(toLedgerHandoff(a).calculationReady).toBe(false);});
