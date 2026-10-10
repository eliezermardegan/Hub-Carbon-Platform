import { createHash } from "node:crypto";
import type { ActivityRecord, Company, Evidence, ReportingPeriod, Site, Source, SourceDocument } from "./index";

export type IntakeClaim =
  | { kind: "claimed"; activity: ActivityRecord }
  | { kind: "busy" }
  | { kind: "conflict" }
  | { kind: "existing"; activity: ActivityRecord };

export interface DataIntakePersistence {
  saveCompany(v: Company): Promise<void>;
  getCompany(id: string): Promise<Company | null>;
  saveReportingPeriod(v: ReportingPeriod): Promise<void>;
  getReportingPeriod(c: string, p: string): Promise<ReportingPeriod | null>;
  saveSite(v: Site): Promise<void>;
  getSite(c: string, s: string): Promise<Site | null>;
  saveSource(v: Source): Promise<void>;
  saveDocument(v: SourceDocument): Promise<void>;
  getDocument(c: string, d: string): Promise<SourceDocument | null>;
  saveEvidence(v: Evidence): Promise<void>;
  claimActivity(v: ActivityRecord, payloadHash: string): Promise<IntakeClaim>;
  saveActivity(v: ActivityRecord): Promise<ActivityRecord | null>;
  getActivity(c: string, id: string): Promise<ActivityRecord | null>;
  listActivities(c: string, p: string): Promise<ActivityRecord[]>;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(k => JSON.stringify(k) + ":" + canonicalize(object[k])).join(",") + "}";
}

export function intakePayloadHash(value: ActivityRecord): string {
  const { activityId: _activityId, calculationStatus: _status, factorId: _factorId, factorVersion: _factorVersion, ...request } = value;
  return createHash("sha256").update(canonicalize(request), "utf8").digest("hex");
}

interface ActivityClaimRecord {
  activityId: string;
  payloadHash: string;
  status: "processing" | "not_ready" | "ready" | "calculated" | "blocked" | "failed";
}

export class InMemoryDataIntakePersistence implements DataIntakePersistence {
  private companies = new Map<string, Company>();
  private periods = new Map<string, ReportingPeriod>();
  private sites = new Map<string, Site>();
  private sources = new Map<string, Source>();
  private documents = new Map<string, SourceDocument>();
  private evidence = new Map<string, Evidence>();
  private activities = new Map<string, ActivityRecord>();
  private idempotency = new Map<string, ActivityClaimRecord>();
  private inFlight = new Set<string>();

  async saveCompany(v: Company) { this.companies.set(v.companyId, v); }
  async getCompany(id: string) { return this.companies.get(id) ?? null; }
  async saveReportingPeriod(v: ReportingPeriod) { this.periods.set(v.companyId + ":" + v.periodId, v); }
  async getReportingPeriod(c: string, p: string) { return this.periods.get(c + ":" + p) ?? null; }
  async saveSite(v: Site) { this.sites.set(v.companyId + ":" + v.siteId, v); }
  async getSite(c: string, s: string) { return this.sites.get(c + ":" + s) ?? null; }
  async saveSource(v: Source) { this.sources.set(v.sourceId, v); }
  async saveDocument(v: SourceDocument) { this.documents.set(v.companyId + ":" + v.documentId, v); }
  async getDocument(c: string, d: string) { return this.documents.get(c + ":" + d) ?? null; }
  async saveEvidence(v: Evidence) { this.evidence.set(v.evidenceId, v); }

  async claimActivity(v: ActivityRecord, payloadHash: string): Promise<IntakeClaim> {
    const key = v.companyId + ":" + v.idempotencyKey;
    const current = this.idempotency.get(key);
    if (current) {
      if (current.payloadHash !== payloadHash) return { kind: "conflict" };
      const saved = this.activities.get(current.activityId);
      if (!saved) return { kind: "conflict" };
      if (current.status === "calculated" || current.status === "blocked" || current.status === "not_ready") {
        return { kind: "existing", activity: structuredClone(saved) };
      }
      if (this.inFlight.has(key)) return { kind: "busy" };
      this.inFlight.add(key);
      current.status = "processing";
      return { kind: "claimed", activity: structuredClone(saved) };
    }
    this.idempotency.set(key, { activityId: v.activityId, payloadHash, status: "processing" });
    this.activities.set(v.activityId, structuredClone({ ...v, calculationStatus: "processing" }));
    this.inFlight.add(key);
    return { kind: "claimed", activity: structuredClone(this.activities.get(v.activityId)!) };
  }

  async saveActivity(v: ActivityRecord): Promise<ActivityRecord | null> {
    const key = v.companyId + ":" + v.idempotencyKey;
    const claim = this.idempotency.get(key);
    if (claim) {
      this.activities.set(claim.activityId, structuredClone({ ...v, activityId: claim.activityId }));
      claim.status = v.calculationStatus;
      if (v.calculationStatus !== "processing" && v.calculationStatus !== "ready") this.inFlight.delete(key);
      return structuredClone(this.activities.get(claim.activityId)!);
    }
    this.activities.set(v.activityId, structuredClone(v));
    this.idempotency.set(key, { activityId: v.activityId, payloadHash: intakePayloadHash(v), status: v.calculationStatus });
    return null;
  }

  async getActivity(c: string, id: string) {
    const v = this.activities.get(id);
    return v?.companyId === c ? structuredClone(v) : null;
  }
  async listActivities(c: string, p: string) {
    return [...this.activities.values()].filter(v => v.companyId === c && v.reportingPeriodId === p).map(v => structuredClone(v));
  }
}
