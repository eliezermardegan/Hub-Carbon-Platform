import test from "node:test";
import assert from "node:assert/strict";
import { DataIntakeService } from "./service";
import type { ActivityRecord } from "./index";
import { CarbonLedgerDomain, InMemoryIdempotencyStore } from "../../carbon-ledger/src/domain.js";
import type { AuditRecord, LedgerPersistence, PersistedLedgerEvent } from "../../carbon-ledger/src/persistence.js";
import { ukGovernment2026ElectricityFactor } from "../../factor-registry/src/uk-2026-electricity.js";

class MemoryLedgerPersistence implements LedgerPersistence {
  readonly events: PersistedLedgerEvent[] = [];
  readonly audits: AuditRecord[] = [];

  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord) {
    this.events.push(structuredClone(event));
    this.audits.push(structuredClone(audit));
    return structuredClone(event);
  }
  async listEvents(tenantId: string) {
    return this.events.filter(event => event.tenantId === tenantId).map(event => structuredClone(event));
  }
  async listAudit(tenantId: string) {
    return this.audits.filter(audit => audit.tenantId === tenantId).map(audit => structuredClone(audit));
  }
  async getHead(tenantId: string) {
    return this.events.filter(event => event.tenantId === tenantId).at(-1)?.eventHash ?? null;
  }
  async recordAudit(audit: AuditRecord) {
    this.audits.push(structuredClone(audit));
  }
}

test("complete chain: UK factor -> Data Intake -> Carbon Core -> Carbon Ledger -> verification", async () => {
  const activity: ActivityRecord = {
    activityId: "uk-chain-2026",
    companyId: "tenant-1",
    reportingPeriodId: "2026",
    scope: 2,
    activityType: "electricity",
    quantity: 10_000,
    unit: "kWh",
    method: "activity_based",
    dataAvailability: "provided",
    dataQuality: { level: "A", completeness: 1, rationale: "synthetic integration fixture" },
    confidence: { score: 1, level: "high", source: "manual", humanReviewed: true },
    evidenceIds: ["evidence-1"],
    classificationStatus: "classified",
    calculationStatus: "ready",
    idempotencyKey: "uk-chain-2026"
  };

  const saved: ActivityRecord[] = [];
  const persistence = {
    async saveActivity(value: ActivityRecord) { saved.push(structuredClone(value)); },
    async saveDocument() {},
    async saveEvidence() {}
  };

  const resolver = {
    async resolve() {
      return ukGovernment2026ElectricityFactor;
    }
  };

  const ledgerPersistence = new MemoryLedgerPersistence();
  const ledger = new CarbonLedgerDomain(ledgerPersistence, new InMemoryIdempotencyStore());
  const service = new DataIntakeService(persistence, resolver, ledger);

  const result = await service.ingestActivity(activity, {
    tenantId: "tenant-1",
    actorId: "integration-test",
    methodologyVersion: "uk-government-2026",
    now: "2026-10-07T00:00:00Z"
  });

  assert.equal(result.calculation?.emissionsKgCo2e, 1309.6);
  assert.equal(result.calculation?.factorId, ukGovernment2026ElectricityFactor.id);
  assert.equal(result.calculation?.factorVersion, "2026");
  assert.equal(result.ledgerEvent?.calculation.emissionsKgCo2e, 1309.6);
  assert.equal(result.ledgerEvent?.factor.id, ukGovernment2026ElectricityFactor.id);
  assert.equal(result.ledgerEvent?.factor.version, "2026");
  assert.equal(result.ledgerEvent?.evidence.length, 1);
  assert.equal(ledgerPersistence.events.length, 1);
  assert.equal(saved.at(-1)?.calculationStatus, "calculated");

  const verification = await ledger.verify("tenant-1", "integration-test");
  assert.deepEqual(verification, { valid: true, checkedEvents: 1 });
});
