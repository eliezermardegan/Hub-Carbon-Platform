import test from "node:test";
import assert from "node:assert/strict";
import { SCOPE3_CATEGORIES, createActivity, defaultIdempotencyKey, toLedgerHandoff, validateActivity } from "./index.js";
import { DataIntakeService, DATA_INTAKE_POSTGRES_SCHEMA, PostgresDataIntakePersistence } from "./index.js";

const base = {
  companyId:"company-1", reportingPeriodId:"2026", scope:3 as const, scope3Category:1 as const,
  activityType:"purchased_goods", quantity:100, unit:"kg", method:"activity_based" as const,
  dataAvailability:"provided" as const,
  dataQuality:{level:"B" as const,completeness:1,rationale:"Supplier quantity from invoice"},
  confidence:{score:.98,level:"high" as const,source:"extraction" as const,modelVersion:"test",humanReviewed:true},
  evidenceIds:["evidence-1"],classificationStatus:"classified" as const,calculationStatus:"ready" as const,
  factorId:"factor-1",factorVersion:"2026.1"
};

test("represents all 15 Scope 3 categories", () => {
  assert.equal(Object.keys(SCOPE3_CATEGORIES).length,15);
  assert.equal(SCOPE3_CATEGORIES[15],"investments");
});
test("creates validated activity and idempotency", () => {
  const a=createActivity({...base,sourceDocumentId:"doc-1",sourceRecordId:"line-1"});
  assert.ok(a.activityId);
  assert.equal(a.idempotencyKey,defaultIdempotencyKey({companyId:"company-1",reportingPeriodId:"2026",sourceDocumentId:"doc-1",sourceRecordId:"line-1",activityType:"purchased_goods"}));
});
test("missing quantity is not zero", () => {
  const r=validateActivity({...base,quantity:undefined});
  assert.equal(r.valid,false);
  assert.ok(r.issues.some(i=>i.code==="activity_quantity"));
});
test("spend based requires spend", () => {
  const r=validateActivity({...base,method:"spend_based",quantity:undefined,financialAmount:undefined});
  assert.equal(r.valid,false);
  assert.ok(r.issues.some(i=>i.code==="spend_amount"));
});
test("confidence and quality remain distinct", () => {
  const r=validateActivity({...base,dataQuality:{level:"C",completeness:1,rationale:"Spend proxy"},confidence:{score:.99,level:"high",source:"extraction",humanReviewed:true}});
  assert.equal(r.issues.some(i => i.code === "quality_range"), false);
  assert.equal(r.issues.some(i => i.code === "confidence_range"), false);
});
test("ledger handoff blocks missing factor/evidence", () => {
  const a=createActivity({...base,factorId:undefined,factorVersion:undefined});
  assert.equal(toLedgerHandoff(a).calculationReady,false);
});


test("public entry point exposes Data Intake runtime exports", () => {
  assert.equal(typeof DataIntakeService, "function");
  assert.equal(typeof PostgresDataIntakePersistence, "function");
  assert.match(DATA_INTAKE_POSTGRES_SCHEMA, /data_intake_activities/);
});
