import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { POSTGRES_SCHEMA } from "./persistence.js";
import { Pool } from "pg";
import { PostgresLedgerPersistence, type PgPool } from "./postgres.js";
import { CarbonLedgerDomain } from "./domain.js";
import * as dataIntakeServiceModule from "../../data-intake/src/service.ts";
import * as dataIntakeModelModule from "../../data-intake/src/model.ts";
import * as dataIntakePostgresModule from "../../data-intake/src/postgres.ts";
import type { ActivityInput, ActivityRecord } from "../../data-intake/src/model.js";
import type { DataIntakePersistence } from "../../data-intake/src/persistence.js";

function runtimeExport<T>(moduleNamespace: unknown, name: string): T {
  const namespace = moduleNamespace as Record<string, unknown>;
  const defaultExport = namespace.default;
  const defaultRecord = defaultExport !== null &&
    (typeof defaultExport === "object" || typeof defaultExport === "function")
    ? defaultExport as Record<string, unknown>
    : undefined;
  const candidate = namespace[name] ?? defaultRecord?.[name] ??
    (name === "DataIntakeService" && typeof defaultExport === "function" ? defaultExport : undefined);
  assert.notEqual(candidate, undefined, `Data Intake runtime export '${name}' is unavailable`);
  return candidate as T;
}

const DataIntakeService = runtimeExport<typeof import("../../data-intake/src/service.js").DataIntakeService>(dataIntakeServiceModule, "DataIntakeService");
const createActivity = runtimeExport<typeof import("../../data-intake/src/model.js").createActivity>(dataIntakeModelModule, "createActivity");
const PostgresDataIntakePersistence = runtimeExport<typeof import("../../data-intake/src/postgres.js").PostgresDataIntakePersistence>(dataIntakePostgresModule, "PostgresDataIntakePersistence");
const DATA_INTAKE_POSTGRES_SCHEMA = runtimeExport<string>(dataIntakePostgresModule, "DATA_INTAKE_POSTGRES_SCHEMA");

const databaseUrl = process.env.PG_INTEGRATION_URL;
const enabled = Boolean(databaseUrl);
const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tenantC = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const actor = "22222222-2222-4222-8222-222222222222";

const tenantD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const tenantE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const tenantF = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const actorF = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function persistedEvent(overrides: Partial<import("./persistence.js").PersistedLedgerEvent> = {}) {
  return {
    id: "12121212-1212-4212-8212-121212121212",
    tenantId: tenantD,
    actorId: actor,
    eventType: "entry" as const,
    sequence: 1,
    recordedAt: "2026-10-10T00:00:00.000Z",
    evidence: [],
    methodologyVersion: "integration-test",
    previousEntryHash: null,
    eventHash: "event-hash-1",
    idempotencyKey: "integration-idem-key",
    ...overrides,
  };
}

function persistedAudit(eventId: string, tenantId = tenantD, id = "13131313-1313-4313-8313-131313131313") {
  return {
    id,
    tenantId,
    actorId: actor,
    action: "append" as const,
    eventId,
    recordedAt: "2026-10-10T00:00:00.000Z",
    metadata: {},
  };
}

function psql(sql: string): string {
  if (!databaseUrl) throw new Error("PG_INTEGRATION_URL is required");
  return execFileSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", sql], { encoding: "utf8" }).trim();
}

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

test("real PostgreSQL integration prerequisites are explicit", { skip: !enabled }, () => {
  assert.match(psql("select version()"), /^PostgreSQL /);
  psql("drop schema public cascade; create schema public; grant usage on schema public to public; revoke create on schema public from public;");
  psql(POSTGRES_SCHEMA);
  psql([
    "create table if not exists data_intake_records (tenant_id text not null, entity_type text not null, entity_id text not null, company_id text not null, payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (tenant_id, entity_type, entity_id), check (tenant_id = company_id))",
    "create table if not exists data_intake_activities (tenant_id text not null, company_id text not null, activity_id text not null, reporting_period_id text not null, idempotency_key text not null, payload_hash text not null, status text not null check (status in ('processing','not_ready','ready','calculated','blocked','failed')), payload jsonb not null, lease_token uuid, lease_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (tenant_id, activity_id), unique (tenant_id, idempotency_key), check (tenant_id = company_id))",
    "create index if not exists data_intake_activities_tenant_period on data_intake_activities (tenant_id, reporting_period_id, created_at)",
    "alter table data_intake_records enable row level security", "alter table data_intake_records force row level security",
    "alter table data_intake_activities enable row level security", "alter table data_intake_activities force row level security",
    "drop policy if exists data_intake_records_tenant_isolation on data_intake_records",
    "create policy data_intake_records_tenant_isolation on data_intake_records using (tenant_id = nullif(current_setting('app.tenant_id', true), '')) with check (tenant_id = nullif(current_setting('app.tenant_id', true), ''))",
    "drop policy if exists data_intake_activities_tenant_isolation on data_intake_activities",
    "create policy data_intake_activities_tenant_isolation on data_intake_activities using (tenant_id = nullif(current_setting('app.tenant_id', true), '')) with check (tenant_id = nullif(current_setting('app.tenant_id', true), ''))"
  ].join("\\n"));
  psql(`do $$ begin if not exists (select from pg_roles where rolname = 'carbon_ledger_app') then create role carbon_ledger_app nologin nosuperuser nobypassrls; end if; end $$;`);
  psql("grant usage on schema public to carbon_ledger_app; grant select, insert on carbon_ledger_events, carbon_ledger_audit to carbon_ledger_app; grant select, insert, update on carbon_ledger_tenant_heads to carbon_ledger_app; grant select, insert, update on data_intake_records, data_intake_activities to carbon_ledger_app;");
  assert.equal(psql("select rolsuper || ':' || rolbypassrls from pg_roles where rolname='carbon_ledger_app'"), "false:false");
  assert.equal(psql("select count(*) from pg_class where relname in ('carbon_ledger_events','carbon_ledger_audit','carbon_ledger_tenant_heads') and pg_get_userbyid(relowner)='carbon_ledger_app'"), "0", "application role must not own any ledger table");
  assert.equal(psql("select array_to_string(array[has_table_privilege('carbon_ledger_app','carbon_ledger_events','select'),has_table_privilege('carbon_ledger_app','carbon_ledger_events','insert'),has_table_privilege('carbon_ledger_app','carbon_ledger_events','update'),has_table_privilege('carbon_ledger_app','carbon_ledger_events','delete'),has_table_privilege('carbon_ledger_app','carbon_ledger_audit','select'),has_table_privilege('carbon_ledger_app','carbon_ledger_audit','insert'),has_table_privilege('carbon_ledger_app','carbon_ledger_audit','update'),has_table_privilege('carbon_ledger_app','carbon_ledger_audit','delete'),has_table_privilege('carbon_ledger_app','carbon_ledger_tenant_heads','select'),has_table_privilege('carbon_ledger_app','carbon_ledger_tenant_heads','insert'),has_table_privilege('carbon_ledger_app','carbon_ledger_tenant_heads','update'),has_table_privilege('carbon_ledger_app','carbon_ledger_tenant_heads','delete')],':')"), "t:t:f:f:t:t:f:f:t:t:t:f", "application table privileges must follow least-privilege matrix");
});

test("RLS filters tenants and fails closed without transaction-local tenant context", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('33333333-3333-4333-8333-333333333333','${tenantA}','${actor}','entry',1,now(),'test','hash-a'), ('44444444-4444-4444-8444-444444444444','${tenantB}','${actor}','entry',1,now(),'test','hash-b');`);
  psql(`insert into carbon_ledger_audit(id,tenant_id,actor_id,action,recorded_at) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','${tenantA}','${actor}','verification',now()), ('ffffffff-ffff-4fff-8fff-ffffffffffff','${tenantB}','${actor}','verification',now());`);
  psql(`insert into carbon_ledger_tenant_heads(tenant_id,head_event_hash) values ('${tenantA}','head-a'), ('${tenantB}','head-b');`);
  const allTenantCounts = psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); select count(*) from carbon_ledger_events; select count(*) from carbon_ledger_audit; select count(*) from carbon_ledger_tenant_heads; commit;`).split("\n").filter(line => /^\d+$/.test(line));
  assert.deepEqual(allTenantCounts.slice(-3), ["1", "1", "1"], "RLS must isolate events, audit rows and tenant heads");
  const rows = psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); select count(*) from carbon_ledger_events; commit;`).split("\n").filter(x => x === "1" || x === "0");
  assert.ok(rows.includes("1"), `Expected tenant A to see exactly one row, got: ${rows.join(",")}`);
  const withoutContext = psql("begin; set local role carbon_ledger_app; select count(*) from carbon_ledger_events; commit;");
  assert.equal(withoutContext.split("\n").filter(line => /^\d+$/.test(line)).at(-1), "0");
});

test("RLS rejects cross-tenant inserts and application role cannot mutate ledger events", { skip: !enabled }, () => {
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('55555555-5555-4555-8555-555555555555','${tenantB}','${actor}','entry',2,now(),'test','hash-cross'); rollback;`), /row-level security|policy/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_events set event_hash='tampered' where tenant_id='${tenantA}'; commit;`), /permission denied|append-only|carbon ledger/i);
});

test("database triggers reject privileged update/delete for all ledger tables", { skip: !enabled }, () => {
  assert.throws(() => psql("update carbon_ledger_events set event_hash='tampered' where id='33333333-3333-4333-8333-333333333333';"), /append-only|carbon ledger/i);
  assert.throws(() => psql("delete from carbon_ledger_events where id='33333333-3333-4333-8333-333333333333';"), /append-only|carbon ledger/i);
  assert.throws(() => psql("update carbon_ledger_audit set action='append' where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';"), /append-only|carbon ledger/i);
  assert.throws(() => psql("delete from carbon_ledger_audit where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';"), /append-only|carbon ledger/i);
  assert.throws(() => psql(`delete from carbon_ledger_tenant_heads where tenant_id='${tenantA}';`), /tenant head cannot be deleted/i);
});

test("tenant-local setting is reset at transaction end on a reused session", { skip: !enabled }, () => {
  const result = psql(`begin; select set_config('app.tenant_id','${tenantA}',true); commit; select coalesce(nullif(current_setting('app.tenant_id',true),''),'RESET');`);
  assert.equal(result.split("\n").at(-1), "RESET");
});

test("event and audit writes roll back atomically when the transaction aborts", { skip: !enabled }, () => {
  const id = "66666666-6666-4666-8666-666666666666";
  psql(`begin; insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('${id}','${tenantA}','${actor}','entry',8,now(),'test','rollback-hash'); insert into carbon_ledger_audit(id,tenant_id,actor_id,action,event_id,recorded_at) values ('77777777-7777-4777-8777-777777777777','${tenantA}','${actor}','append','${id}',now()); rollback;`);
  assert.equal(psql(`select count(*) from carbon_ledger_events where id='${id}'`), "0");
  assert.equal(psql("select count(*) from carbon_ledger_audit where id='77777777-7777-4777-8777-777777777777'"), "0");
});

test("tenant sequence uniqueness rejects duplicate sequence values", { skip: !enabled }, () => {
  assert.throws(() => psql(`insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('88888888-8888-4888-8888-888888888888','${tenantA}','${actor}','entry',1,now(),'test','duplicate-sequence');`), /unique constraint/i);
});

test("idempotency keys are unique within a tenant", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash,idempotency_key,idempotency_payload_hash) values ('99999999-9999-4999-8999-999999999999','${tenantA}','${actor}','entry',9,now(),'test','idem-a','integration-idem','payload-a');`);
  assert.throws(() => psql(`insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash,idempotency_key,idempotency_payload_hash) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${tenantA}','${actor}','entry',10,now(),'test','idem-b','integration-idem','payload-b');`), /unique constraint/i);
});

test("audit rows are append-only", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_audit(id,tenant_id,actor_id,action,recorded_at) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','${tenantA}','${actor}','verification',now());`);
  assert.throws(() => psql("update carbon_ledger_audit set action='append' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';"), /append-only|carbon ledger/i);
});

test("application role cannot mutate or delete ledger events and audit rows", { skip: !enabled }, () => {
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_events set event_hash='tampered' where tenant_id='${tenantA}'; commit;`), /permission denied|append-only|carbon ledger/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); delete from carbon_ledger_events where tenant_id='${tenantA}'; commit;`), /permission denied|append-only|carbon ledger/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_audit set action='append' where tenant_id='${tenantA}'; commit;`), /permission denied|append-only|carbon ledger/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); delete from carbon_ledger_audit where tenant_id='${tenantA}'; commit;`), /permission denied|append-only|carbon ledger/i);
});

test("tenant head policy blocks cross-tenant changes and invalid or destructive updates", { skip: !enabled }, () => {
  const before = psql(`select head_event_hash from carbon_ledger_tenant_heads where tenant_id='${tenantB}'`);
  psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_tenant_heads set head_event_hash='hash-a' where tenant_id='${tenantB}'; commit;`);
  assert.equal(psql(`select head_event_hash from carbon_ledger_tenant_heads where tenant_id='${tenantB}'`), before, "cross-tenant update must not change tenant B head");
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_tenant_heads set head_event_hash='not-an-event-hash' where tenant_id='${tenantA}'; commit;`), /must reference an existing tenant event/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_tenant_heads set tenant_id='${tenantB}' where tenant_id='${tenantA}'; commit;`), /tenant_id is immutable/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); delete from carbon_ledger_tenant_heads where tenant_id='${tenantA}'; commit;`), /permission denied|cannot be deleted/i);
});

test("hash chain fields and tenant head remain explicit database values", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_tenant_heads(tenant_id,head_event_hash) values ('${tenantA}','hash-a') on conflict (tenant_id) do update set head_event_hash=excluded.head_event_hash;`);
  assert.equal(psql(`select head_event_hash from carbon_ledger_tenant_heads where tenant_id='${tenantA}'`), "hash-a");
  assert.equal(psql(`select count(*) from carbon_ledger_events where tenant_id='${tenantA}' and (event_hash is null or methodology_version is null)`), "0");
});

test("PostgreSQL bigint preserves values above JavaScript safe integer range", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','${tenantB}','${actor}','entry',9007199254740992,now(),'test','bigint-boundary');`);
  assert.equal(psql("select sequence::text from carbon_ledger_events where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'"), "9007199254740992");
});


test("PostgresLedgerPersistence executes tenant-scoped reads through the pg driver", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const persistence = new PostgresLedgerPersistence(pool as unknown as PgPool, {
      getTrustedTenantContext: () => ({ tenantId: tenantC, actorId: actor }),
    });
    assert.deepEqual(await persistence.listEvents(tenantC), []);
    assert.deepEqual(await persistence.listAudit(tenantC), []);
    assert.equal(await persistence.getHead(tenantC), null);
    await assert.rejects(() => persistence.listEvents(tenantB), /does not match trusted context/);
  } finally {
    await pool.end();
  }
});


test("pooled adapter reads do not leak tenant context across reused connections", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  let activeTenant = tenantA;
  try {
    const persistence = new PostgresLedgerPersistence(pool as unknown as PgPool, {
      getTrustedTenantContext: () => ({ tenantId: activeTenant, actorId: actor }),
    });
    const initialTenantEvents = (await persistence.listEvents(tenantA)).length;
    const initialTenantAudit = (await persistence.listAudit(tenantA)).length;
    assert.ok(initialTenantEvents > 0);
    activeTenant = tenantC;
    assert.deepEqual(await persistence.listEvents(tenantC), []);
    assert.deepEqual(await persistence.listAudit(tenantC), []);
    activeTenant = tenantA;
    assert.equal((await persistence.listEvents(tenantA)).length, initialTenantEvents);
    assert.equal((await persistence.listAudit(tenantA)).length, initialTenantAudit);
  } finally {
    await pool.end();
  }
});

test("concurrent appends serialize tenant sequence and head updates", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  try {
    const persistence = new PostgresLedgerPersistence(asApplicationRolePool(pool), {
      getTrustedTenantContext: () => ({ tenantId: tenantD, actorId: actor }),
    });
    const first = persistedEvent();
    const second = persistedEvent({
      id: "14141414-1414-4414-8414-141414141414",
      eventHash: "event-hash-2",
      idempotencyKey: "integration-idem-key-2",
    });
    const results = await Promise.allSettled([
      persistence.appendEvent(first, persistedAudit(first.id, tenantD, "17171717-1717-4717-8717-171717171717")),
      persistence.appendEvent(second, persistedAudit(second.id, tenantD, "18181818-1818-4818-8818-181818181818")),
    ]);
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    const events = await persistence.listEvents(tenantD);
    assert.equal(events.length, 1);
    assert.equal(events[0].sequence, 1);
    assert.equal(await persistence.getHead(tenantD), events[0].eventHash);
  } finally {
    await pool.end();
  }
});

test("application idempotency replays equivalent payload and rejects conflicting payload", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const persistence = new PostgresLedgerPersistence(asApplicationRolePool(pool), {
      getTrustedTenantContext: () => ({ tenantId: tenantE, actorId: actor }),
    });
    const event = persistedEvent({
      tenantId: tenantE,
      id: "15151515-1515-4515-8515-151515151515",
      idempotencyKey: "equivalent-replay-key",
      eventHash: "equivalent-replay-hash",
    });
    assert.equal(await persistence.appendEvent(event, persistedAudit(event.id, tenantE, "19191919-1919-4919-8919-191919191919")), null);
    const replay = await persistence.appendEvent(event, persistedAudit(event.id, tenantE, "20202020-2020-4020-8020-202020202020"));
    assert.equal(replay?.id, event.id);
    await assert.rejects(
      () => persistence.appendEvent({ ...event, id: "16161616-1616-4616-8616-161616161616", methodologyVersion: "different-payload" }, persistedAudit("16161616-1616-4616-8616-161616161616", tenantE, "21212121-2121-4121-8121-212121212121")),
      /idempotency key conflict: payload differs from original operation/,
    );
    assert.equal((await persistence.listEvents(tenantE)).length, 1);
  } finally {
    await pool.end();
  }
});

test("adapter rejects PostgreSQL bigint sequences outside JavaScript safe integer range", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const persistence = new PostgresLedgerPersistence(pool as unknown as PgPool, {
      getTrustedTenantContext: () => ({ tenantId: tenantB, actorId: actor }),
    });
    await assert.rejects(() => persistence.listEvents(tenantB), /ledger sequence exceeds JavaScript safe integer range/);
  } finally {
    await pool.end();
  }
});

test("Data Intake recovers the committed PostgreSQL ledger event after intake save failure and service restart", { skip: !enabled }, async () => {
  const context = { tenantId: tenantF, actorId: actorF, methodologyVersion: "data-intake-recovery-integration", now: "2026-10-10T12:00:00.000Z" };
  const input: ActivityInput = { companyId: tenantF, reportingPeriodId: "2026", scope: 2, activityType: "electricity", quantity: 100, unit: "kWh", method: "activity_based", dataAvailability: "provided", dataQuality: { level: "A", completeness: 1, rationale: "integration fixture" }, confidence: { score: 1, level: "high", source: "manual", humanReviewed: true }, evidenceIds: ["recovery-evidence-1"], classificationStatus: "classified", calculationStatus: "ready", idempotencyKey: "data-intake-postgres-restart-recovery" };
  const factor = { id: "postgres-recovery-factor", version: "1", status: "verified", name: "Synthetic test factor", scope: 2, category: "electricity", geography: "TEST", activityUnit: "kWh", factorUnit: "kgCO2e/kWh", value: 0.4, dataQuality: "high", provenance: { sourceName: "Synthetic fixture", sourceUrl: "https://example.invalid/factor", sourceVersion: "fixture-v1", license: "test-only", legalBasis: "Synthetic fixture; not production evidence", attributionRequired: false, redistributionAllowed: true, sourceContentSha256: "ba7b10b5afb62f2852574f5969acaa64ba71d4f062ac2224f90f9ec23435fdaa", retrievedAt: "2026-01-01T00:00:00Z", geography: "TEST", originalUnit: "kWh", normalizedUnit: "kWh", transformation: "No transformation", evidenceRef: "test://factor/postgres-recovery-factor" } } as const;
  const provider = { getTrustedTenantContext: () => ({ tenantId: tenantF, actorId: actorF }) };
  const pool1 = new Pool({ connectionString: databaseUrl, max: 3 });
  const appPool1 = asApplicationRolePool(pool1);
  const intake1 = new PostgresDataIntakePersistence(appPool1, provider);
  let failOnce = true;
  const failing = new Proxy(intake1, { get(target, prop, receiver) { if (prop === "saveActivity") return async (value: ActivityRecord, token?: string) => { if (value.calculationStatus === "calculated" && failOnce) { failOnce = false; throw new Error("simulated final intake persistence failure"); } return target.saveActivity(value, token); }; const member = Reflect.get(target, prop, receiver) as unknown; return typeof member === "function" ? member.bind(target) : member; } }) as DataIntakePersistence;
  let resolverCalls = 0;
  const ledger1 = new PostgresLedgerPersistence(appPool1, provider);
  const service1 = new DataIntakeService(failing, { resolve: async () => { resolverCalls++; return factor as any; } }, new CarbonLedgerDomain(ledger1));
  await assert.rejects(() => service1.ingestActivity(createActivity(input), context), /simulated final intake persistence failure/);
  const originalEvents = await ledger1.listEvents(tenantF);
  assert.equal(originalEvents.length, 1);
  const originalEvent = originalEvents[0];
  const savedBeforeRestart = (await intake1.listActivities(tenantF, "2026"))[0];
  assert.ok(savedBeforeRestart);
  assert.equal(savedBeforeRestart.calculationStatus, "failed");
  assert.equal(savedBeforeRestart.factorId, factor.id);
  assert.equal(savedBeforeRestart.factorVersion, factor.version);
  await pool1.end();
  const pool2 = new Pool({ connectionString: databaseUrl, max: 3 });
  const appPool2 = asApplicationRolePool(pool2);
  const intake2 = new PostgresDataIntakePersistence(appPool2, provider);
  const ledger2 = new PostgresLedgerPersistence(appPool2, provider);
  const service2 = new DataIntakeService(intake2, { resolve: async () => { resolverCalls++; return factor as any; } }, new CarbonLedgerDomain(ledger2));
  const recovered = await service2.ingestActivity(createActivity(input), context);
  assert.equal(recovered.activity.activityId, savedBeforeRestart.activityId);
  assert.equal(recovered.activity.calculationStatus, "calculated");
  assert.equal(recovered.ledgerEvent?.id, originalEvent.id);
  assert.equal(recovered.ledgerEvent?.eventHash, originalEvent.eventHash);
  assert.equal(resolverCalls, 1, "recovery must use the persisted factor snapshot");
  assert.equal((await ledger2.listEvents(tenantF)).length, 1, "retry must not duplicate the committed ledger event");
  assert.equal((await intake2.listActivities(tenantF, "2026")).length, 1);
  assert.equal((await intake2.listActivities(tenantF, "2026"))[0].calculationStatus, "calculated");
  await pool2.end();
});
