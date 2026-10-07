import test from "node:test";
import assert from "node:assert/strict";
import { POSTGRES_SCHEMA } from "./persistence.js";

test("postgres schema enforces append-only and tenant isolation", () => {
  assert.match(POSTGRES_SCHEMA, /before update or delete/i);
  assert.match(POSTGRES_SCHEMA, /enable row level security/i);
  assert.match(POSTGRES_SCHEMA, /tenant_id/);
  assert.match(POSTGRES_SCHEMA, /event_type in/);
  assert.match(POSTGRES_SCHEMA, /prevent_append_only_mutation/);
  assert.match(POSTGRES_SCHEMA, /carbon_ledger_audit_no_update/);
  assert.match(POSTGRES_SCHEMA, /with check/gi);
});

test("postgres schema has per-tenant sequence and hash uniqueness", () => {
  assert.match(POSTGRES_SCHEMA, /unique \(tenant_id, sequence\)/);
  assert.match(POSTGRES_SCHEMA, /unique \(tenant_id, event_hash\)/);
  assert.match(POSTGRES_SCHEMA, /carbon_ledger_tenant_heads/);
  assert.match(POSTGRES_SCHEMA, /idempotency_key/);
});
