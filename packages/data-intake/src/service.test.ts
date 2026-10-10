import test from "node:test";
import assert from "node:assert/strict";
import { DataIntakeService } from "./service";
import type { ActivityRecord } from "./index";

const activity = (overrides: Partial<ActivityRecord> = {}): ActivityRecord => ({
  activityId:"a1", companyId:"tenant-1", reportingPeriodId:"2026", scope:2, activityType:"electricity",
  quantity:100, unit:"kWh", method:"activity_based", dataAvailability:"provided",
  dataQuality:{level:"A", completeness:1, rationale:"meter"},
  confidence:{score:1, level:"high", source:"manual", humanReviewed:true},
  evidenceIds:["e1"], classificationStatus:"classified", calculationStatus:"ready",
  idempotencyKey:"a1", ...overrides
});

const factor:any = {
  id:"f1", version:"1", status:"verified", name:"test", scope:2, category:"electricity",
  activityUnit:"kWh", factorUnit:"kgCO2e/kWh", value:.4, dataQuality:"high",
  provenance:{sourceName:"test",sourceUrl:"https://example.invalid",license:"test",
    attributionRequired:false,redistributionAllowed:true,retrievedAt:"2026-01-01"}
};

test("ingests, calculates and sends activity to ledger", async () => {
  let resolved = 0;
  let appended = 0;
  const persistence:any = { saveActivity: async () => {}, saveDocument: async () => {}, saveEvidence: async () => {} };
  const resolver:any = { resolve: async () => { resolved++; return factor; } };
  const ledger:any = { append: async () => { appended++; return {id:"a1",eventType:"entry"}; } };
  const service = new DataIntakeService(persistence,resolver,ledger);
  const result = await service.ingestActivity(activity(),{tenantId:"tenant-1",actorId:"user-1",methodologyVersion:"v1",now:"2026-01-01T00:00:00Z"});
  assert.equal(result.calculation?.emissionsKgCo2e,40);
  assert.equal(resolved,1);
  assert.equal(appended,1);
});

test("does not send unresolved data to ledger", async () => {
  let appended = 0;
  const persistence:any = { saveActivity: async () => {}, saveDocument: async () => {}, saveEvidence: async () => {} };
  const resolver:any = { resolve: async () => undefined };
  const ledger:any = { append: async () => { appended++; } };
  const service = new DataIntakeService(persistence,resolver,ledger);
  const result = await service.ingestActivity(activity({dataAvailability:"not_available",calculationStatus:"not_ready"}),{tenantId:"tenant-1",actorId:"user-1",methodologyVersion:"v1"});
  assert.equal(appended,0);
  assert.equal(result.handoff.calculationReady,false);
});


test("persists unresolved activity as not_ready and never appends to ledger", async () => {
  const saved: ActivityRecord[] = [];
  let appended = 0;
  const persistence: any = {
    saveActivity: async (value: ActivityRecord) => { saved.push(value); },
    saveDocument: async () => {}, saveEvidence: async () => {},
  };
  const resolver: any = { resolve: async () => null };
  const ledger: any = { append: async () => { appended++; } };
  const service = new DataIntakeService(persistence, resolver, ledger);

  const result = await service.ingestActivity(activity(), {
    tenantId: "tenant-1", actorId: "user-1", methodologyVersion: "v1",
  });

  assert.equal(result.activity.calculationStatus, "not_ready");
  assert.equal(result.handoff.calculationReady, false);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].calculationStatus, "not_ready");
  assert.equal(appended, 0);
});

test("persists blocked factor state before rejecting and never appends to ledger", async () => {
  const saved: ActivityRecord[] = [];
  let appended = 0;
  const blockedFactor = {
    ...factor,
    status: "blocked",
    provenance: { ...factor.provenance, redistributionAllowed: false },
  };
  const persistence: any = {
    saveActivity: async (value: ActivityRecord) => { saved.push(value); },
    saveDocument: async () => {}, saveEvidence: async () => {},
  };
  const resolver: any = { resolve: async () => blockedFactor };
  const ledger: any = { append: async () => { appended++; } };
  const service = new DataIntakeService(persistence, resolver, ledger);

  await assert.rejects(
    service.ingestActivity(activity(), {
      tenantId: "tenant-1", actorId: "user-1", methodologyVersion: "v1",
    }),
    /factor is not approved for import or calculation/,
  );

  assert.equal(saved.length, 1);
  assert.equal(saved[0].calculationStatus, "blocked");
  assert.equal(saved[0].factorId, blockedFactor.id);
  assert.equal(saved[0].factorVersion, blockedFactor.version);
  assert.equal(appended, 0);
});
