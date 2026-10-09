import test from "node:test";
import assert from "node:assert/strict";
import { PostgresLedgerPersistence, type PgClient, type PgPool } from "./postgres.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";

function fakePool(queries: string[]): PgPool {
  const client: PgClient & { release(): void } = {
    async query(text) {
      queries.push(text);
      if (/current_setting/i.test(text)) return { rows: [{ tenant_id: tenantId }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
    release() {}
  };
  return {
    async query() { return { rows: [], rowCount: 0 }; },
    async connect() { return client; }
  };
}

test("schema uses transaction-local tenant context and fail-closed RLS", async () => {
  const queries: string[] = [];
  const persistence = new PostgresLedgerPersistence(fakePool(queries), {
    getTrustedTenantContext: () => ({ tenantId, actorId })
  });

  await assert.rejects(() => persistence.listEvents("33333333-3333-4333-8333-333333333333"), /does not match trusted context/);
  assert.equal(queries.length, 0);
});

test("trusted tenant context is established after BEGIN on the same client", async () => {
  const queries: string[] = [];
  const persistence = new PostgresLedgerPersistence(fakePool(queries), {
    getTrustedTenantContext: () => ({ tenantId, actorId })
  });

  await persistence.listEvents(tenantId);
  assert.equal(queries[0], "BEGIN");
  assert.match(queries[1], /set_config\('app\.tenant_id'/);
  assert.match(queries[2], /current_setting\('app\.tenant_id'/);
  assert.equal(queries.at(-1), "COMMIT");
});
