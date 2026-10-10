import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { POSTGRES_SCHEMA } from "./persistence.js";
import { Pool } from "pg";
import { PostgresLedgerPersistence, type PgPool } from "./postgres.js";

const databaseUrl = process.env.PG_INTEGRATION_URL;
const enabled = Boolean(databaseUrl);
const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tenantC = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const actor = "22222222-2222-4222-8222-222222222222";

function psql(sql: string): string {
  if (!databaseUrl) throw new Error("PG_INTEGRATION_URL is required");
  return execFileSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", sql], { encoding: "utf8" }).trim();
}

test("real PostgreSQL integration prerequisites are explicit", { skip: !enabled }, () => {
  assert.match(psql("select version()"), /^PostgreSQL /);
  psql("drop schema public cascade; create schema public; grant all on schema public to public;");
  psql(POSTGRES_SCHEMA);
  psql(`do $$ begin if not exists (select from pg_roles where rolname = 'carbon_ledger_app') then create role carbon_ledger_app nologin nosuperuser nobypassrls; end if; end $$;`);
  psql("grant usage on schema public to carbon_ledger_app; grant select, insert, update, delete on carbon_ledger_events, carbon_ledger_audit, carbon_ledger_tenant_heads to carbon_ledger_app;");
  assert.equal(psql("select rolsuper || ':' || rolbypassrls from pg_roles where rolname='carbon_ledger_app'"), "false:false");
  assert.notEqual(psql("select pg_get_userbyid(relowner) from pg_class where relname='carbon_ledger_events'"), "carbon_ledger_app");
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

test("RLS rejects cross-tenant inserts and append-only trigger rejects mutation", { skip: !enabled }, () => {
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); insert into carbon_ledger_events(id,tenant_id,actor_id,event_type,sequence,recorded_at,methodology_version,event_hash) values ('55555555-5555-4555-8555-555555555555','${tenantB}','${actor}','entry',2,now(),'test','hash-cross'); rollback;`), /row-level security|policy/i);
  assert.throws(() => psql(`begin; set local role carbon_ledger_app; select set_config('app.tenant_id','${tenantA}',true); update carbon_ledger_events set event_hash='tampered' where tenant_id='${tenantA}'; commit;`), /append-only|carbon ledger/i);
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

test("hash chain fields and tenant head remain explicit database values", { skip: !enabled }, () => {
  psql(`insert into carbon_ledger_tenant_heads(tenant_id,head_event_hash) values ('${tenantA}','head-hash-test') on conflict (tenant_id) do update set head_event_hash=excluded.head_event_hash;`);
  assert.equal(psql(`select head_event_hash from carbon_ledger_tenant_heads where tenant_id='${tenantA}'`), "head-hash-test");
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
    assert.equal(await persistence.getHead(tenantC), null);
    await assert.rejects(() => persistence.listEvents(tenantB), /does not match trusted context/);
  } finally {
    await pool.end();
  }
});
