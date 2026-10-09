import test from "node:test";
import assert from "node:assert/strict";
import { POSTGRES_SCHEMA } from "./persistence.js";
import { PostgresLedgerPersistence, type PgClient, type PgPool, type PgQueryResult } from "./postgres.js";

test("postgres schema enforces append-only and tenant isolation", () => {
  assert.match(POSTGRES_SCHEMA, /before update or delete/i);
  assert.match(POSTGRES_SCHEMA, /enable row level security/i);
  assert.match(POSTGRES_SCHEMA, /force row level security/i);
  assert.match(POSTGRES_SCHEMA, /tenant_id/);
  assert.match(POSTGRES_SCHEMA, /event_type in/);
  assert.match(POSTGRES_SCHEMA, /prevent_append_only_mutation/);
  assert.match(POSTGRES_SCHEMA, /carbon_ledger_audit_no_update/);
  assert.match(POSTGRES_SCHEMA, /with check/gi);
  assert.match(POSTGRES_SCHEMA, /nullif\(current_setting\('app\.tenant_id'/i);
});

test("postgres schema has per-tenant sequence, hash and idempotency constraints", () => {
  assert.match(POSTGRES_SCHEMA, /unique \(tenant_id, sequence\)/);
  assert.match(POSTGRES_SCHEMA, /unique \(tenant_id, event_hash\)/);
  assert.match(POSTGRES_SCHEMA, /carbon_ledger_tenant_heads/);
  assert.match(POSTGRES_SCHEMA, /idempotency_key/);
  assert.match(POSTGRES_SCHEMA, /idempotency_payload_hash/);
  assert.match(POSTGRES_SCHEMA, /sequence > 0/);
});

const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";

function auditRecord(eventIdValue?: string) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    tenantId,
    actorId,
    action: "verification" as const,
    ...(eventIdValue ? { eventId: eventIdValue } : {}),
    recordedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
  };
}

function persistenceWithEventReference(reference: { tenant_id: string; actor_id: string } | undefined) {
  const statements: string[] = [];
  const client: PgClient & { release(): void } = {
    async query<T = unknown>(sql: string): Promise<PgQueryResult<T>> {
      statements.push(sql);
      if (sql === "SELECT current_setting('app.tenant_id', true) AS tenant_id") {
        return { rows: [{ tenant_id: tenantId } as T], rowCount: 1 };
      }
      if (sql.includes("SELECT tenant_id, actor_id FROM carbon_ledger_events")) {
        return { rows: (reference ? [reference as T] : []), rowCount: reference ? 1 : 0 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const pool: PgPool = {
    async query<T = unknown>(sql: string, values?: readonly unknown[]) {
      return client.query<T>(sql, values);
    },
    async connect() { return client; },
  };
  const persistence = new PostgresLedgerPersistence(pool, {
    getTrustedTenantContext: () => ({ tenantId, actorId }),
  });
  return { persistence, statements };
}

test("recordAudit rejects a reference to a nonexistent event", async () => {
  const { persistence, statements } = persistenceWithEventReference(undefined);
  await assert.rejects(persistence.recordAudit(auditRecord(eventId)), /audit event reference not found/);
  assert.equal(statements.some(sql => sql.startsWith("INSERT INTO carbon_ledger_audit")), false);
  assert.equal(statements.at(-1), "ROLLBACK");
});

test("recordAudit rejects an event reference belonging to another tenant", async () => {
  const { persistence, statements } = persistenceWithEventReference({
    tenant_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    actor_id: actorId,
  });
  await assert.rejects(persistence.recordAudit(auditRecord(eventId)), /audit event reference does not match trusted context/);
  assert.equal(statements.some(sql => sql.startsWith("INSERT INTO carbon_ledger_audit")), false);
  assert.equal(statements.at(-1), "ROLLBACK");
});

test("recordAudit rejects an event reference associated with another actor", async () => {
  const { persistence, statements } = persistenceWithEventReference({
    tenant_id: tenantId,
    actor_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  });
  await assert.rejects(persistence.recordAudit(auditRecord(eventId)), /audit event reference does not match trusted context/);
  assert.equal(statements.some(sql => sql.startsWith("INSERT INTO carbon_ledger_audit")), false);
  assert.equal(statements.at(-1), "ROLLBACK");
});

test("recordAudit permits an audit record without an event reference when omitted", async () => {
  const { persistence, statements } = persistenceWithEventReference(undefined);
  await persistence.recordAudit(auditRecord());
  assert.equal(statements.some(sql => sql.startsWith("INSERT INTO carbon_ledger_audit")), true);
  assert.equal(statements.at(-1), "COMMIT");
});
