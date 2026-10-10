import test from "node:test";
import assert from "node:assert/strict";
import { DataIntakeService } from "./service";
import { InMemoryDataIntakePersistence } from "./persistence";
import type { ActivityRecord } from "./index";

const activity = (overrides: Partial<ActivityRecord> = {}): ActivityRecord => ({
  activityId: "a1", companyId: "tenant-1", reportingPeriodId: "2026", scope: 2, activityType: "electricity",
  quantity: 100, unit: "kWh", method: "activity_based", dataAvailability: "provided",
  dataQuality: { level: "A", completeness: 1, rationale: "meter" },
  confidence: { score: 1, level: "high", source: "manual", humanReviewed: true },
  evidenceIds: ["e1"], classificationStatus: "classified", calculationStatus: "ready",
  idempotencyKey: "a1", ...overrides
});

const factor: any = {
  id: "f1", version: "1", status: "verified", name: "test", scope: 2, category: "electricity",
  activityUnit: "kWh", factorUnit: "kgCO2e/kWh", value: .4, dataQuality: "high",
  provenance: {
    sourceName: "Synthetic test fixture", sourceUrl: "https://example.invalid/factor", sourceVersion: "fixture-v1",
    license: "test-only", legalBasis: "Synthetic test fixture; not production evidence",
    attributionRequired: false, redistributionAllowed: true,
    sourceContentSha256: "a".repeat(64), retrievedAt: "2026-01-01T00:00:00Z",
    geography: "TEST", originalUnit: "kWh", normalizedUnit: "kWh",
    transformation: "Synthetic fixture; no transformation", evidenceRef: "test://factor/f1"
  }
};

function makePersistence(onSave?: (value: ActivityRecord) => void) {
  const persistence = new InMemoryDataIntakePersistence();
  const originalSave = persistence.saveActivity.bind(persistence);
  persistence.saveActivity = async (value: ActivityRecord) => {
    onSave?.(value);
    return originalSave(value);
  };
  return persistence;
}

function context() {
  return { tenantId: "tenant-1", actorId: "user-1", methodologyVersion: "v1", now: "2026-01-01T00:00:00Z" };
}

function idempotentLedger() {
  const events = new Map<string, any>();
  let calls = 0;
  return {
    ledger: {
      append: async (command: any) => {
        calls++;
        const existing = events.get(command.id);
        if (existing) return existing;
        const event = { id: command.id, eventType: "entry", eventHash: "hash-" + command.id };
        events.set(command.id, event);
        return event;
      },
    } as any,
    calls: () => calls,
    uniqueWrites: () => events.size,
    ids: () => [...events.keys()],
  };
}

test("ingests, calculates and sends activity to ledger", async () => {
  let resolved = 0;
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => { resolved++; return factor; } }, ledger.ledger);
  const result = await service.ingestActivity(activity(), context());
  assert.equal(result.calculation?.emissionsKgCo2e, 40);
  assert.equal(resolved, 1);
  assert.equal(ledger.uniqueWrites(), 1);
});

test("does not send unresolved data to ledger", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => undefined }, ledger.ledger);
  const result = await service.ingestActivity(activity({ dataAvailability: "not_available", calculationStatus: "not_ready" }), context());
  assert.equal(ledger.uniqueWrites(), 0);
  assert.equal(result.handoff.calculationReady, false);
});

test("persists unresolved activity as not_ready and never appends to ledger", async () => {
  const saved: ActivityRecord[] = [];
  const persistence = makePersistence(value => saved.push(value));
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => null }, ledger.ledger);
  const result = await service.ingestActivity(activity({ activityId: undefined }), context());
  assert.equal(result.activity.calculationStatus, "not_ready");
  assert.equal(result.handoff.calculationReady, false);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].calculationStatus, "not_ready");
  assert.equal(ledger.uniqueWrites(), 0);
});

test("persists blocked factor state before rejecting and never appends to ledger", async () => {
  const saved: ActivityRecord[] = [];
  const blockedFactor = { ...factor, status: "blocked", provenance: { ...factor.provenance, redistributionAllowed: false } };
  const persistence = makePersistence(value => saved.push(value));
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => blockedFactor }, ledger.ledger);
  await assert.rejects(service.ingestActivity(activity(), context()), /factor is not approved for import or calculation/);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].calculationStatus, "blocked");
  assert.equal(saved[0].factorId, blockedFactor.id);
  assert.equal(saved[0].factorVersion, blockedFactor.version);
  assert.equal(ledger.uniqueWrites(), 0);
});

test("equivalent retries with generated activity IDs return the original activity without duplicate ledger writes", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => factor }, ledger.ledger);
  const first = await service.ingestActivity(activity({ activityId: undefined }), context());
  const replay = await service.ingestActivity(activity({ activityId: undefined }), context());
  assert.equal(replay.activity.activityId, first.activity.activityId);
  assert.equal(replay.activity.calculationStatus, "calculated");
  assert.equal(ledger.uniqueWrites(), 1);
  assert.equal(ledger.calls(), 1);
});

test("rejects conflicting payload reuse of an idempotency key before ledger append", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => factor }, ledger.ledger);
  await service.ingestActivity(activity(), context());
  await assert.rejects(
    service.ingestActivity(activity({ quantity: 101 }), context()),
    /idempotency key conflict: payload differs from original intake/,
  );
  assert.equal(ledger.uniqueWrites(), 1);
  assert.equal(ledger.calls(), 1);
});

test("rejects reuse of an idempotency key by a different actor", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => factor }, ledger.ledger);
  await service.ingestActivity(activity(), context());
  await assert.rejects(
    service.ingestActivity(activity(), { ...context(), actorId: "different-actor" }),
    /idempotency key conflict: payload differs from original intake/,
  );
  assert.equal(ledger.uniqueWrites(), 1);
});

test("recovers when ledger append succeeded but final intake persistence failed", async () => {
  let failCalculatedSave = true;
  const persistence = makePersistence(value => {
    if (value.calculationStatus === "calculated" && failCalculatedSave) {
      failCalculatedSave = false;
      throw new Error("simulated intake persistence outage");
    }
  });
  const ledger = idempotentLedger();
  const service = new DataIntakeService(persistence, { resolve: async () => factor }, ledger.ledger);
  await assert.rejects(service.ingestActivity(activity({ activityId: undefined }), context()), /simulated intake persistence outage/);
  const recovered = await service.ingestActivity(activity({ activityId: undefined }), context());
  assert.equal(recovered.activity.calculationStatus, "calculated");
  assert.equal(ledger.calls(), 2);
  assert.equal(ledger.uniqueWrites(), 1);
  assert.equal(ledger.ids().length, 1);
});

test("retries a not_ready activity with the same payload when its factor becomes available", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  let attempts = 0;
  const service = new DataIntakeService(persistence, {
    resolve: async () => (++attempts === 1 ? null : factor),
  }, ledger.ledger);
  const first = await service.ingestActivity(activity({ activityId: undefined }), context());
  assert.equal(first.activity.calculationStatus, "not_ready");
  const retry = await service.ingestActivity(activity({ activityId: undefined }), context());
  assert.equal(retry.activity.calculationStatus, "calculated");
  assert.equal(retry.activity.activityId, first.activity.activityId);
  assert.equal(attempts, 2);
  assert.equal(ledger.uniqueWrites(), 1);
});

test("concurrent requests with the same idempotency key do not both process", async () => {
  const persistence = makePersistence();
  const ledger = idempotentLedger();
  let releaseResolver!: (value: any) => void;
  let resolverStarted!: () => void;
  const started = new Promise<void>(resolve => { resolverStarted = resolve; });
  const wait = new Promise<any>(resolve => { releaseResolver = resolve; });
  const service = new DataIntakeService(persistence, {
    resolve: async () => { resolverStarted(); return wait; },
  }, ledger.ledger);
  const first = service.ingestActivity(activity({ activityId: undefined }), context());
  await started;
  await assert.rejects(
    service.ingestActivity(activity({ activityId: undefined }), context()),
    /idempotent intake request is already processing/,
  );
  releaseResolver(factor);
  await first;
  assert.equal(ledger.uniqueWrites(), 1);
});
