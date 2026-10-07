import test from "node:test";
import assert from "node:assert/strict";
import { CarbonLedgerDomain, InMemoryIdempotencyStore } from "./domain.js";
import type { LedgerPersistence, PersistedLedgerEvent, AuditRecord } from "./persistence.js";
import type { EmissionFactor } from "../../factor-registry/src/index.js";
import type { EvidenceReference } from "./index.js";

class FakePersistence implements LedgerPersistence {
  events: PersistedLedgerEvent[] = [];
  audits: AuditRecord[] = [];
  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null> {
    if ((this.events.at(-1)?.eventHash ?? null) !== event.previousEntryHash) throw new Error("ledger head conflict");
    this.events.push(structuredClone(event)); this.audits.push(structuredClone(audit)); return null;
  }
  async listEvents(tenantId: string) { return this.events.filter(e => e.tenantId === tenantId).map(e => structuredClone(e)); }
  async listAudit(tenantId: string) { return this.audits.filter(e => e.tenantId === tenantId).map(e => structuredClone(e)); }
  async getHead(tenantId: string) { return this.events.filter(e => e.tenantId === tenantId).at(-1)?.eventHash ?? null; }
  async recordAudit(audit: AuditRecord) { this.audits.push(structuredClone(audit)); }
}

const factor: EmissionFactor = {
  id: "electricity-br", version: "2026.1", status: "verified", name: "Test",
  scope: 2, category: "purchased_electricity", geography: "BR", activityUnit: "kWh",
  factorUnit: "kgCO2e/kWh", value: 0.1, dataQuality: "high",
  provenance: { sourceName: "fixture", sourceUrl: "https://example.invalid", license: "fixture",
    attributionRequired: false, redistributionAllowed: false, retrievedAt: "2026-10-07T00:00:00Z" }
};
const activity = { id:"a1", scope:2 as const, category:"purchased_electricity", quantity:100, unit:"kWh",
  method:"activity_based" as const, factorId:factor.id, factorValue:factor.value, factorUnit:factor.factorUnit, factorVersion:factor.version };
const ctx = { tenantId:"tenant-a", actorId:"actor-a", methodologyVersion:"pbhg-2026.1", now:"2026-10-07T12:00:00Z" };

test("append is deterministic and idempotent", async () => {
  const p=new FakePersistence(), d=new CarbonLedgerDomain(p);
  const one=await d.append({id:"a1",activity,factor,evidence:[]},ctx);
  const two=await d.append({id:"a1",activity,factor,evidence:[]},ctx);
  assert.equal(one.eventHash,two.eventHash); assert.equal(p.events.length,1); assert.equal(one.calculation?.emissionsKgCo2e,10);
});

test("restatement preserves history and creates a new event", async () => {
  const p=new FakePersistence(), d=new CarbonLedgerDomain(p);
  await d.append({id:"a1",activity,factor},ctx);
  const revised={...activity,id:"a2",quantity:120};
  const r=await d.restate({id:"r1",activity:revised,factor,replacesEventId:"a1",reason:"Corrected invoice"},ctx);
  assert.equal(r.eventType,"restatement"); assert.equal(r.replacesEventId,"a1"); assert.equal(p.events.length,2);
});

test("reversal is compensating and does not mutate target", async () => {
  const p=new FakePersistence(), d=new CarbonLedgerDomain(p);
  await d.append({id:"a1",activity,factor},ctx);
  const rev=await d.reverse({id:"v1",targetEventId:"a1",reason:"Invoice cancelled"},ctx);
  assert.equal(rev.eventType,"reversal"); assert.equal(rev.replacesEventId,"a1"); assert.equal(rev.calculation?.emissionsKgCo2e,-10);
  assert.equal(p.events[0].calculation?.emissionsKgCo2e,10);
});

test("tenant isolation is enforced by the domain context", async () => {
  const p=new FakePersistence(), d=new CarbonLedgerDomain(p,new InMemoryIdempotencyStore());
  await d.append({id:"a1",activity,factor},{...ctx,tenantId:"tenant-a"});
  await d.append({id:"a1",activity,factor},{...ctx,tenantId:"tenant-b"});
  assert.equal((await p.listEvents("tenant-a")).length,1); assert.equal((await p.listEvents("tenant-b")).length,1);
});

test("corrections require a reason", async () => {
  const p=new FakePersistence(), d=new CarbonLedgerDomain(p);
  await d.append({id:"a1",activity,factor},ctx);
  await assert.rejects(() => d.restate({id:"r1",activity,factor,replacesEventId:"a1",reason:" "},ctx), /reason is required/);
  await assert.rejects(() => d.reverse({id:"v1",targetEventId:"a1",reason:" "},ctx), /reason is required/);
});
