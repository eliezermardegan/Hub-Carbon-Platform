import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DataIntakeService } from "../../../packages/data-intake/src/service.ts";

export interface AuthenticatedIntakeContext {
  tenantId: string;
  actorId: string;
  methodologyVersion: string;
}

export interface ApiDependencies {
  service: DataIntakeService;
  // Must be backed by trusted authentication/session verification. Never derive
  // actor or tenant identity from caller-controlled headers without verification.
  authenticate(req: IncomingMessage): Promise<AuthenticatedIntakeContext | null>;
}

const MAX_BODY_BYTES = 1024 * 1024;

export function createIntakeApi(deps: ApiDependencies) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("content-type", "application/json");
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { status: "ok", service: "data-intake" });
    }
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (req.url !== "/activities") return send(res, 404, { error: "not_found" });

    let identity: AuthenticatedIntakeContext | null;
    try {
      identity = await deps.authenticate(req);
    } catch {
      return send(res, 401, { error: "authentication_failed" });
    }
    if (!identity?.tenantId || !identity.actorId || !identity.methodologyVersion) {
      return send(res, 401, { error: "authenticated_tenant_context_required" });
    }

    try {
      const body = await readJson(req);
      const result = await deps.service.ingestActivity(body, identity);
      return send(res, 200, result);
    } catch (error) {
      if (error instanceof Error && error.message === "request_body_too_large") {
        return send(res, 413, { error: "request_body_too_large" });
      }
      if (error instanceof Error && error.message === "invalid_json") {
        return send(res, 400, { error: "invalid_json" });
      }
      return send(res, 400, { error: error instanceof Error ? error.message : "invalid_request" });
    }
  });
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

async function readJson(req: IncomingMessage): Promise<any> {
  return await new Promise((resolve, reject) => {
    let data = "";
    let settled = false;
    req.on("data", chunk => {
      if (settled) return;
      data += chunk.toString();
      if (Buffer.byteLength(data, "utf8") > MAX_BODY_BYTES) {
        settled = true;
        reject(new Error("request_body_too_large"));
      }
    });
    req.on("end", () => {
      if (settled) return;
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", error => {
      if (!settled) reject(error);
    });
  });
}
