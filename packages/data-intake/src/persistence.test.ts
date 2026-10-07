import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryDataIntakePersistence } from "./persistence";
import type { ActivityRecord } from "./index";

const activity = (id: string, key: string): ActivityRecord => ({
  activityId:id, companyId:"c1", reportingPeriodId:"2026", scope:2, activityType:"electricity",
  quantity:100, unit:"kWh", method:"activity_based", dataAvailability:"provided",
  dataQuality:{level:"A", completeness:1, rationale:"meter"},
  confidence:{score:1, level:"high", source:"manual", humanReviewed:true},
  evidenceIds:["e1"], classificationStatus:"classified", calculationStatus:"ready",
  factorId:"f1", factorVersion:"1", idempotencyKey:key
});

test("persists activity and prevents duplicate idempotency keys", async () => {
  const p = new InMemoryDataIntakePersistence();
  assert.equal(await p.saveActivity(activity("a1","k1")), null);
  const duplicate = await p.saveActivity(activity("a2","k1"));
  assert.equal(duplicate?.activityId, "a1");
  assert.equal((await p.listActivities("c1","2026")).length, 1);
});
