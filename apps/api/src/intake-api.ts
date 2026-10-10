import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { DataIntakeService } from "../../../packages/data-intake/src/service.ts";
import type { ActivityInput, IntakeValidationIssue } from "../../../packages/data-intake/src/model.ts";

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
  // Integrators should redact secrets and personal data before external logging.
  onInternalError?(error: unknown, phase: "authenticate" | "ingest"): void;
}

const MAX_BODY_BYTES = 1024 * 1024;

export function createIntakeApi(deps: ApiDependencies) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("content-type", "application/json");
    res.setHeader("x-content-type-options", "nosniff");
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { status: "ok", service: "data-intake" });
    }
    if (req.method !== "POST") return send(res, 405, { error: "method_not_allowed" });
    if (req.url !== "/activities") return send(res, 404, { error: "not_found" });

    let identity: AuthenticatedIntakeContext | null;
    try {
      identity = await deps.authenticate(req);
    } catch (error) {
      reportInternalError(deps, error, "authenticate");
      return send(res, 503, { error: "authentication_unavailable" });
    }
    if (!identity?.tenantId || !identity.actorId || !identity.methodologyVersion) {
      return send(res, 401, { error: "authenticated_tenant_context_required" });
    }

    const contentType = req.headers["content-type"];
    const mediaType = (Array.isArray(contentType) ? contentType[0] : contentType ?? "").split(";", 1)[0].trim().toLowerCase();
    if (mediaType !== "application/json") return send(res, 415, { error: "unsupported_media_type" });

    const contentLength = req.headers["content-length"];
    if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
      req.resume();
      return send(res, 413, { error: "request_body_too_large" });
    }

    try {
      const body = await readJson(req);
      const result = await deps.service.ingestActivity(body as unknown as ActivityInput, identity);
      return send(res, 200, result);
    } catch (error) {
      if (errorCode(error) === "REQUEST_BODY_TOO_LARGE") {
        return send(res, 413, { error: "request_body_too_large" });
      }
      if (errorCode(error) === "INVALID_JSON") return send(res, 400, { error: "invalid_json" });
      if (errorCode(error) === "INVALID_REQUEST_BODY") return send(res, 400, { error: "invalid_request_body" });
      if (errorCode(error) === "INVALID_ACTIVITY") {
        const issues = errorIssues(error).map(issue => ({ code: issue.code, field: issue.field, message: issue.message }));
        return send(res, 400, { error: "invalid_activity", issues });
      }
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("idempotency key conflict")) return send(res, 409, { error: "idempotency_conflict" });
      if (message.includes("already processing")) return send(res, 409, { error: "request_in_progress" });
      if (message === "activity company does not match tenant") return send(res, 403, { error: "tenant_mismatch" });
      if (message === "factor is not approved for import or calculation") return send(res, 422, { error: "factor_not_eligible" });
      reportInternalError(deps, error, "ingest");
      return send(res, 500, { error: "internal_error" });
    }
  });
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
function errorIssues(error: unknown): IntakeValidationIssue[] {
  if (error === null || typeof error !== "object") return [];
  const issues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return [];
  return issues.filter((issue): issue is IntakeValidationIssue =>
    issue !== null && typeof issue === "object" &&
    typeof (issue as IntakeValidationIssue).code === "string" &&
    typeof (issue as IntakeValidationIssue).field === "string" &&
    typeof (issue as IntakeValidationIssue).message === "string"
  );
}
function reportInternalError(deps: ApiDependencies, error: unknown, phase: "authenticate" | "ingest"): void {
  try { deps.onInternalError?.(error, phase); } catch { /* logging must not change fail-closed API behavior */ }
}
function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;
    let settled = false;
    req.on("data", (chunk: Buffer | string) => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += buffer.byteLength;
      if (receivedBytes > MAX_BODY_BYTES) {
        settled = true;
        reject(Object.assign(new Error("request_body_too_large"), { code: "REQUEST_BODY_TOO_LARGE" }));
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      let parsed: unknown;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch {
        reject(Object.assign(new Error("invalid_json"), { code: "INVALID_JSON" }));
        return;
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        reject(Object.assign(new Error("invalid_request_body"), { code: "INVALID_REQUEST_BODY" }));
        return;
      }
      resolve(parsed as Record<string, unknown>);
    });
    req.on("error", error => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    req.on("aborted", () => {
      if (!settled) {
        settled = true;
        reject(new Error("request_aborted"));
      }
    });
  });
}
