import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { POSTGRES_SCHEMA } from "./persistence.js";

const databaseUrl = process.env.PG_INTEGRATION_URL;
const enabled = Boolean(databaseUrl);
const tenantA = "11111111-1111-4111-8111-111111111111";
const tenantB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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
  assert.equal(result.split("\n").at(-1), "");
});
