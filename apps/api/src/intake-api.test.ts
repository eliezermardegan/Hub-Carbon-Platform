import test from "node:test";
import assert from "node:assert/strict";
import { createIntakeApi } from "./intake-api.ts";
import { DataIntakeService } from "../../../packages/data-intake/src/service.ts";

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


test("rejects cross-tenant activity body through the real DataIntakeService before persistence", async () => {
  let claims = 0;
  let resolverCalls = 0;
  const service = new DataIntakeService({
    claimActivity: async () => { claims++; throw new Error("must not claim"); },
  } as any, {
    resolve: async () => { resolverCalls++; return null; },
  }, {} as any);
  await withServer({
    service,
    authenticate: async () => ({ tenantId: "tenant-owned-by-session", actorId: "trusted-actor", methodologyVersion: "v1" }),
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": "attacker-tenant", "x-actor-id": "attacker" },
      body: JSON.stringify({ companyId: "attacker-tenant" }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "tenant_mismatch" });
    assert.equal(claims, 0, "cross-tenant activity must be rejected before any durable claim");
    assert.equal(resolverCalls, 0, "cross-tenant activity must not resolve factors");
  });
});

test("rejects a non-JSON content type before calling the service", async () => {
  let calls = 0;
  await withServer({
    service: { ingestActivity: async () => { calls++; return {}; } } as any,
    authenticate: async () => ({ tenantId: "tenant-a", actorId: "actor-a", methodologyVersion: "v1" }),
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST", headers: { "content-type": "text/plain" }, body: "{}",
    });
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: "unsupported_media_type" });
    assert.equal(calls, 0);
  });
});

test("rejects JSON primitives and arrays as invalid request bodies", async () => {
  await withServer({
    service: { ingestActivity: async () => { throw new Error("must not call service"); } } as any,
    authenticate: async () => ({ tenantId: "tenant-a", actorId: "actor-a", methodologyVersion: "v1" }),
  }, async baseUrl => {
    for (const body of ["null", "[]", "42", JSON.stringify("not-an-activity")]) {
      const response = await fetch(baseUrl + "/activities", {
        method: "POST", headers: { "content-type": "application/json" }, body,
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "invalid_request_body" });
    }
  });
});

test("does not expose internal service/database errors in client responses", async () => {
  const internal = new Error("password=do-not-leak; relation private_schema.secret_table missing");
  let reportedError: unknown;
  let reportedPhase: string | undefined;
  await withServer({
    service: { ingestActivity: async () => { throw internal; } } as any,
    authenticate: async () => ({ tenantId: "tenant-a", actorId: "actor-a", methodologyVersion: "v1" }),
    onInternalError: (error, phase) => { reportedError = error; reportedPhase = phase; },
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId: "tenant-a" }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "internal_error" });
    assert.equal(reportedError, internal);
    assert.equal(reportedPhase, "ingest");
  });
});

test("returns a safe service-unavailable response when the auth provider throws", async () => {
  const internal = new Error("OIDC issuer config contains sensitive deployment detail");
  let reportedError: unknown;
  await withServer({
    service: {} as any,
    authenticate: async () => { throw internal; },
    onInternalError: error => { reportedError = error; },
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyId: "tenant-a" }),
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "authentication_unavailable" });
    assert.equal(reportedError, internal);
  });
});

test("returns controlled activity validation issues without reflecting request field values", async () => {
  const service = new DataIntakeService({ claimActivity: async () => { throw new Error("must not claim invalid input"); } } as any, { resolve: async () => null }, {} as any);
  await withServer({
    service,
    authenticate: async () => ({ tenantId: "tenant-a", actorId: "actor-a", methodologyVersion: "v1" }),
  }, async baseUrl => {
    const response = await fetch(baseUrl + "/activities", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: "tenant-a", reportingPeriodId: "2026", activityType: "electricity",
        scope: 2, quantity: 1, unit: "kWh", method: "activity_based", dataAvailability: "provided",
        dataQuality: null, confidence: null, evidenceIds: ["e1"], classificationStatus: "classified",
        calculationStatus: "ready", idempotencyKey: "validation-key", secretFieldValue: "must-not-echo",
      }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error, "invalid_activity");
    assert.equal(JSON.stringify(payload).includes("must-not-echo"), false);
    assert.equal(payload.issues.some((issue: { field: string }) => issue.field === "dataQuality"), true);
  });
});
