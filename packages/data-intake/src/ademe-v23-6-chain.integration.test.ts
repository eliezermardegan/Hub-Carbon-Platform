import test from "node:test";
import assert from "node:assert/strict";
import { DataIntakeService } from "./service.js";
import { InMemoryDataIntakePersistence } from "./persistence.js";
import type { PersistedLedgerEvent, LedgerPersistence, AuditRecord } from "../../carbon-ledger/src/persistence.js";
import { CarbonLedgerDomain, InMemoryIdempotencyStore } from "../../carbon-ledger/src/domain.js";
import { ademeV23_6UtilityUnder3_5tFactor } from "../../factor-registry/src/ademe-v23-6-utility.js";

class MemoryLedgerPersistence implements LedgerPersistence {
  readonly events: PersistedLedgerEvent[] = [];
  readonly audits: AuditRecord[] = [];

  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null> {
    const head = this.events.filter(e => e.tenantId === event.tenantId).at(-1)?.eventHash ?? null;
    if (head !== event.previousEntryHash) throw new Error("ledger head conflict");
    this.events.push(structuredClone(event));
    this.audits.push(structuredClone(audit));
    return null;
  }

  async listEvents(tenantId: string): Promise<PersistedLedgerEvent[]> {
    return this.events.filter(event => event.tenantId === tenantId).map(event => structuredClone(event));
  }

  async listAudit(tenantId: string): Promise<AuditRecord[]> {
    return this.audits.filter(audit => audit.tenantId === tenantId).map(audit => structuredClone(audit));
  }

  async recordAudit(audit: AuditRecord): Promise<void> {
    this.audits.push(structuredClone(audit));
  }

  async getHead(tenantId: string): Promise<string | null> {
    return this.events.filter(event => event.tenantId === tenantId).at(-1)?.eventHash ?? null;
  }
}

test("rejects blocked ADEME factor before calculation or ledger append", async () => {
  const persistence = new InMemoryDataIntakePersistence();
  const ledgerPersistence = new MemoryLedgerPersistence();
  const ledger = new CarbonLedgerDomain(ledgerPersistence, new InMemoryIdempotencyStore());
  const service = new DataIntakeService(
    persistence,
    { resolve: async () => ademeV23_6UtilityUnder3_5tFactor },
    ledger
  );

  await assert.rejects(() => service.ingestActivity({
    companyId: "tenant-ademe",
    reportingPeriodId: "period-2026",
    scope: 3,
    scope3Category: 4,
    activityType: "upstream_transportation_and_distribution",
    quantity: 1000,
    unit: "km",
    method: "activity_based",
    dataAvailability: "provided",
    dataQuality: { level: "A", completeness: 1, rationale: "ADEME validation fixture" },
    confidence: { score: 1, level: "high", source: "manual", humanReviewed: true },
    evidenceIds: ["evidence-ademe"],
    classificationStatus: "classified",
    calculationStatus: "ready",
    idempotencyKey: "activity-ademe-utility"
  }, {
    tenantId: "tenant-ademe",
    actorId: "test-suite",
    methodologyVersion: "ademe-base-carbone-v23.6",
    now: "2026-10-08T00:00:00Z"
  }), /factor is not approved for import or calculation/);
  assert.equal(ledgerPersistence.events.length, 0);
  assert.equal(ledgerPersistence.audits.length, 0);
});
