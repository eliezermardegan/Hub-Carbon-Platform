import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { CarbonLedgerDomain } from "./domain.js";
import { PostgresLedgerPersistence, type PgPool } from "./postgres.js";
import * as intakeServiceNamespace from "../../data-intake/src/service.ts";
import * as intakeModelNamespace from "../../data-intake/src/model.ts";
import * as intakePersistenceNamespace from "../../data-intake/src/persistence.ts";
import * as intakePostgresNamespace from "../../data-intake/src/postgres.ts";
import type { ActivityInput, ActivityRecord } from "../../data-intake/src/model.js";
import type { DataIntakePersistence, IntakeClaim } from "../../data-intake/src/persistence.js";
import type { IntakeServiceContext } from "../../data-intake/src/service.js";

function runtimeExport<T>(moduleNamespace: unknown, name: string): T {
  const namespace = moduleNamespace as Record<string, unknown>;
  const defaultExport = namespace.default;
  const defaultRecord = defaultExport !== null &&
    (typeof defaultExport === "object" || typeof defaultExport === "function")
    ? defaultExport as Record<string, unknown>
    : undefined;
  const candidate = namespace[name] ?? defaultRecord?.[name] ??
    (name === "DataIntakeService" && typeof defaultExport === "function" ? defaultExport : undefined);
  if (candidate === undefined) throw new Error("Data Intake runtime export '" + name + "' is unavailable");
  return candidate as T;
}

const DataIntakeService = runtimeExport<typeof import("../../data-intake/src/service.js").DataIntakeService>(intakeServiceNamespace, "DataIntakeService");
const createActivity = runtimeExport<typeof import("../../data-intake/src/model.js").createActivity>(intakeModelNamespace, "createActivity");
const intakePayloadHash = runtimeExport<typeof import("../../data-intake/src/persistence.js").intakePayloadHash>(intakePersistenceNamespace, "intakePayloadHash");
const PostgresDataIntakePersistence = runtimeExport<typeof import("../../data-intake/src/postgres.js").PostgresDataIntakePersistence>(intakePostgresNamespace, "PostgresDataIntakePersistence");

const databaseUrl = process.env.PG_INTEGRATION_URL;
if (!databaseUrl) throw new Error("PG_INTEGRATION_URL is required");
const mode = process.argv[2];
const tenantId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const actorId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const recoveryKey = "data-intake-postgres-process-recovery";
const leaseKey = "data-intake-postgres-process-lease-fencing";
const context: IntakeServiceContext = {
  tenantId,
  actorId,
  methodologyVersion: "data-intake-process-recovery-integration",
  now: "2026-10-10T12:00:00.000Z",
};
const input = (idempotencyKey: string): ActivityInput => ({
  companyId: tenantId,
  reportingPeriodId: "2026",
  scope: 2,
  activityType: "electricity",
  quantity: 100,
  unit: "kWh",
  method: "activity_based",
  dataAvailability: "provided",
  dataQuality: { level: "A", completeness: 1, rationale: "isolated process recovery fixture" },
  confidence: { score: 1, level: "high", source: "manual", humanReviewed: true },
  evidenceIds: ["process-recovery-evidence-1"],
  classificationStatus: "classified",
  calculationStatus: "ready",
  idempotencyKey,
});
const factor = {
  id: "postgres-recovery-factor",
  version: "1",
  status: "verified",
  name: "Synthetic test factor",
  scope: 2,
  category: "electricity",
  geography: "TEST",
  activityUnit: "kWh",
  factorUnit: "kgCO2e/kWh",
  value: 0.4,
  dataQuality: "high",
  provenance: {
    sourceName: "Synthetic fixture",
    sourceUrl: "https://example.invalid/factor",
    sourceVersion: "fixture-v1",
    license: "test-only",
    legalBasis: "Synthetic fixture; not production evidence",
    attributionRequired: false,
    redistributionAllowed: true,
    sourceContentSha256: "ba7b10b5afb62f2852574f5969acaa64ba71d4f062ac2224f90f9ec23435fdaa",
    retrievedAt: "2026-01-01T00:00:00Z",
    geography: "TEST",
    originalUnit: "kWh",
    normalizedUnit: "kWh",
    transformation: "No transformation",
    evidenceRef: "test://factor/postgres-recovery-factor",
  },
};
const leaseDurationMs = Number(process.env.INTAKE_LEASE_DURATION_MS ?? "120000");
const provider = { getTrustedTenantContext: () => ({ tenantId, actorId }) };

function asApplicationRolePool(pool: Pool): PgPool {
  return {
    query: pool.query.bind(pool) as PgPool["query"],
    connect: async () => {
      const client = await pool.connect();
      try {
        await client.query("SET ROLE carbon_ledger_app");
      } catch (error) {
        client.release();
        throw error;
      }
      let released = false;
      return {
        query: client.query.bind(client) as PgPool["query"],
        release: () => {
          if (released) return;
          released = true;
          void client.query("RESET ROLE").then(
            () => client.release(),
            () => client.release(),
          );
        },
      };
    },
  } as unknown as PgPool;
}

async function main(): Promise<Record<string, unknown>> {
  const pool = new Pool({ connectionString: databaseUrl, max: 3 });
  try {
    const applicationPool = asApplicationRolePool(pool);
    const intake = new PostgresDataIntakePersistence(applicationPool, provider, { leaseDurationMs });

    if (mode === "recovery-fail") {
      let resolverCalls = 0;
      let failOnce = true;
      const failing = new Proxy(intake, {
        get(target, property, receiver) {
          if (property === "saveActivity") {
            return async (value: ActivityRecord, token?: string) => {
              if (value.calculationStatus === "calculated" && failOnce) {
                failOnce = false;
                throw new Error("simulated final intake persistence failure");
              }
              return target.saveActivity(value, token);
            };
          }
          const member = Reflect.get(target, property, receiver) as unknown;
          return typeof member === "function" ? member.bind(target) : member;
        },
      }) as DataIntakePersistence;
      const ledger = new PostgresLedgerPersistence(applicationPool, provider);
      const service = new DataIntakeService(failing, {
        resolve: async () => {
          resolverCalls++;
          return factor as any;
        },
      }, new CarbonLedgerDomain(ledger));
      let expectedFailure = false;
      try {
        await service.ingestActivity(createActivity(input(recoveryKey)), context);
      } catch (error) {
        if (String(error).includes("simulated final intake persistence failure")) expectedFailure = true;
        else throw error;
      }
      if (!expectedFailure) throw new Error("the injected final intake persistence failure did not occur");
      const events = await ledger.listEvents(tenantId);
      assert.equal(events.length, 1, "ledger commit must survive the injected intake-save failure");
      const saved = (await intake.listActivities(tenantId, "2026")).find(v => v.idempotencyKey === recoveryKey);
      assert.ok(saved, "failed intake state must be durable before this process exits");
      assert.equal(saved.calculationStatus, "failed");
      assert.equal(saved.factorId, factor.id);
      assert.equal(saved.factorVersion, factor.version);
      assert.equal(resolverCalls, 1);
      return {
        phase: mode,
        pid: process.pid,
        activityId: saved.activityId,
        activityStatus: saved.calculationStatus,
        factorId: saved.factorId,
        factorVersion: saved.factorVersion,
        eventId: events[0].id,
        eventHash: events[0].eventHash,
        eventCount: events.length,
      };
    }

    if (mode === "recovery-retry") {
      let resolverCalls = 0;
      const ledger = new PostgresLedgerPersistence(applicationPool, provider);
      const service = new DataIntakeService(intake, {
        resolve: async () => {
          resolverCalls++;
          throw new Error("factor resolver must not be called during committed-event recovery");
        },
      }, new CarbonLedgerDomain(ledger));
      const recovered = await service.ingestActivity(createActivity(input(recoveryKey)), context);
      const events = await ledger.listEvents(tenantId);
      const activities = (await intake.listActivities(tenantId, "2026")).filter(v => v.idempotencyKey === recoveryKey);
      assert.equal(events.length, 1, "retry must not duplicate the committed event");
      assert.equal(activities.length, 1, "retry must preserve the single durable activity");
      assert.equal(activities[0].calculationStatus, "calculated");
      assert.equal(recovered.activity.calculationStatus, "calculated");
      assert.ok(recovered.ledgerEvent?.calculation, "recovered event must preserve the committed calculation");
      assert.ok(recovered.ledgerEvent?.factor, "recovered event must preserve the committed factor snapshot");
      assert.equal(resolverCalls, 0, "recovery must not resolve a potentially changed factor");
      return {
        phase: mode,
        pid: process.pid,
        activityId: recovered.activity.activityId,
        activityStatus: recovered.activity.calculationStatus,
        factorId: recovered.ledgerEvent?.factor?.id,
        factorVersion: recovered.ledgerEvent?.factor?.version,
        factorValue: recovered.ledgerEvent?.factor?.value,
        eventId: recovered.ledgerEvent?.id,
        eventHash: recovered.ledgerEvent?.eventHash,
        eventCount: events.length,
        activityCount: activities.length,
        resolverCalls,
      };
    }

    if (mode === "lease-claim") {
      const created = createActivity(input(leaseKey));
      const requested = { ...created, factorId: undefined, factorVersion: undefined };
      const claim = await intake.claimActivity(requested, intakePayloadHash(requested, context));
      if (claim.kind !== "claimed") throw new Error("expected to establish a durable claim, got " + claim.kind);
      // Exiting without release simulates a process that dies while holding the lease.
      return {
        phase: mode,
        pid: process.pid,
        activityId: claim.activity.activityId,
        claimStatus: claim.kind,
        claimToken: claim.claimToken,
      };
    }

    if (mode === "lease-reclaim") {
      const staleToken = process.env.INTAKE_STALE_TOKEN;
      if (!staleToken) throw new Error("INTAKE_STALE_TOKEN is required");
      const created = createActivity(input(leaseKey));
      const requested = { ...created, factorId: undefined, factorVersion: undefined };
      const claim = await intake.claimActivity(requested, intakePayloadHash(requested, context));
      if (claim.kind !== "claimed") throw new Error("expected expired lease to be reclaimed, got " + claim.kind);
      let staleTokenRejected = false;
      try {
        await intake.saveActivity({ ...claim.activity, calculationStatus: "failed" }, staleToken);
      } catch (error) {
        if (String(error).includes("intake claim lease lost")) staleTokenRejected = true;
        else throw error;
      }
      if (!staleTokenRejected) throw new Error("stale fencing token unexpectedly changed durable state");
      const saved = await intake.saveActivity({ ...claim.activity, calculationStatus: "not_ready" }, claim.claimToken);
      if (!saved) throw new Error("current claim token failed to persist activity state");
      await intake.releaseActivityClaim(tenantId, leaseKey, claim.claimToken);
      const current = await intake.getActivity(tenantId, claim.activity.activityId);
      assert.ok(current);
      assert.equal(current.calculationStatus, "not_ready");
      return {
        phase: mode,
        pid: process.pid,
        activityId: current.activityId,
        claimToken: claim.claimToken,
        reclaimed: true,
        claimTokenChanged: claim.claimToken !== staleToken,
        staleTokenRejected,
        finalStatus: current.calculationStatus,
      };
    }

    throw new Error("unknown worker mode: " + String(mode));
  } finally {
    await pool.end();
  }
}

main().then(
  result => process.stdout.write(JSON.stringify(result) + "\n"),
  error => {
    process.stderr.write((error instanceof Error ? error.stack : String(error)) + "\n");
    process.exitCode = 1;
  },
);
