import test from "node:test";
import assert from "node:assert/strict";
import {
  DataIntakeService,
  InMemoryDataIntakePersistence,
  InMemoryIdempotencyStore
} from "./index.js";
import type { LedgerEvent, LedgerPersistence } from "../../carbon-ledger/src/index.js";
import { CarbonLedgerDomain } from "../../carbon-ledger/src/index.js";
import { ademeV23_6UtilityUnder3_5tFactor } from "../../factor-registry/src/ademe-v23-6-utility.js";

class MemoryLedgerPersistence implements LedgerPersistence {
  readonly events: LedgerEvent[] = [];

  async append(event: LedgerEvent): Promise<void> {
    const head = this.events.at(-1)?.eventHash ?? null;
    if (head !== event.previousEntryHash) throw new Error("ledger head conflict");
    this.events.push(event);
  }

  async listByTenant(tenantId: string): Promise<LedgerEvent[]> {
    return this.events.filter(event => event.tenantId === tenantId);
  }

  async getHead(tenantId: string): Promise<string | null> {
    return this.events.filter(event => event.tenantId === tenantId).at(-1)?.eventHash ?? null;
  }
}

test("runs ADEME factor through Data Intake, Carbon Core and Carbon Ledger", async () => {
  const persistence = new InMemoryDataIntakePersistence();
  const ledger = new CarbonLedgerDomain({
    persistence: new MemoryLedgerPersistence()
  });

  const service = new DataIntakeService({
    persistence,
    ledger,
    factorResolver: async () => ademeV23_6UtilityUnder3_5tFactor,
    idempotency: new InMemoryIdempotencyStore()
  });

  const result = await service.ingestActivity({
    tenantId: "tenant-ademe",
    actorId: "test-suite",
    companyId: "company-ademe",
    reportingPeriodId: "period-2026",
    activity: {
      id: "activity-ademe-utility",
      scope: 3,
      category: "scope3.category4.upstream_transport_and_distribution",
      quantity: 1000,
      unit: "km",
      method: "ademe-base-carbone-v23.6"
    },
    evidence: {
      sourceType: "test-fixture",
      sourceReference: "ADEME Base Carbone V23.6 record 28276",
      contentHash: "synthetic-ademe-chain-fixture"
    }
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.calculation?.emissionsKgCo2e, 235);
  assert.equal(result.calculation?.factorId, ademeV23_6UtilityUnder3_5tFactor.id);
  assert.equal(result.calculation?.factorVersion, "23.6");

  const events = await ledger.listEvents("tenant-ademe");
  assert.equal(events.length, 1);
  assert.equal(events[0].previousEntryHash, null);
  assert.equal(events[0].factorSnapshot?.id, ademeV23_6UtilityUnder3_5tFactor.id);
  assert.equal(events[0].factorSnapshot?.version, "23.6");
  assert.equal(events[0].factorSnapshot?.value, 0.235);
  assert.equal(events[0].factorSnapshot?.provenance?.license, "Licence Ouverte / Open Licence 2.0");

  const verification = await ledger.verify("tenant-ademe");
  assert.deepEqual(verification, { valid: true, checkedEvents: 1 });
});
