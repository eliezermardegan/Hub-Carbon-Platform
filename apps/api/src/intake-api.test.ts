import test from "node:test";
import assert from "node:assert/strict";
import { createIntakeApi } from "./intake-api.ts";

async function withServer(handler: Parameters<typeof createIntakeApi>[0], run: (baseUrl: string) => Promise<void>) {
  const server = createIntakeApi(handler);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind a TCP port");
  try {
    await run("http://127.0.0.1:" + address.port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("health endpoint remains available without caller identity", async () => {
  await withServer({ service: {} as any, authenticate: async () => null }, async baseUrl => {
    const response = await fetch(baseUrl + "/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "data-intake" });
  });
});

test("rejects caller-supplied tenant and actor headers without trusted authentication", async () => {
  let ingestCalls = 0;
  await withServer({
    service: { ingestActivity: async () => { ingestCalls++; } } as any,
    authenticate: async () => null,
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "victim-tenant", "x-actor-id": "admin" },
      body: JSON.stringify({ companyId: "victim-tenant" }),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "authenticated_tenant_context_required" });
    assert.equal(ingestCalls, 0);
  });
});

test("uses only the authenticated identity, not caller-supplied identity headers", async () => {
  let receivedContext: unknown;
  await withServer({
    service: { ingestActivity: async (_body: unknown, context: unknown) => {
      receivedContext = context;
      return { accepted: true };
    } } as any,
    authenticate: async () => ({ tenantId: "trusted-tenant", actorId: "trusted-actor", methodologyVersion: "v2" }),
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "attacker-tenant", "x-actor-id": "attacker" },
      body: JSON.stringify({ companyId: "trusted-tenant" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(receivedContext, { tenantId: "trusted-tenant", actorId: "trusted-actor", methodologyVersion: "v2" });
  });
});

test("rejects malformed JSON with a controlled client error", async () => {
  await withServer({ service: {} as any, authenticate: async () => ({ tenantId: "t", actorId: "a", methodologyVersion: "v1" }) }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{",
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid_json" });
  });
});
