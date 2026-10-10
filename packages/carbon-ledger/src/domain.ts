import { createHash } from "node:crypto";
import { calculateEmissions, type ActivityRecord, type CalculationResult } from "../../carbon-core/src/index.js";
import type { EmissionFactor } from "../../factor-registry/src/index.js";
import type { EvidenceReference, LedgerEntry } from "./index.js";
import type { LedgerPersistence, PersistedLedgerEvent, AuditRecord } from "./persistence.js";

export type DomainEventType = "entry" | "restatement" | "reversal";

export interface LedgerCommandContext {
  tenantId: string;
  actorId: string;
  methodologyVersion: string;
  now?: string;
}

export interface AppendCommand {
  id: string;
  activity: ActivityRecord;
  factor: EmissionFactor;
  evidence?: EvidenceReference[];
}

export interface CorrectionCommand extends AppendCommand {
  replacesEventId: string;
  reason: string;
}

export interface ReversalCommand {
  id: string;
  targetEventId: string;
  reason: string;
  evidence?: EvidenceReference[];
}

export interface DomainEvent extends PersistedLedgerEvent {
  eventType: DomainEventType;
}

export interface IdempotencyStore {
  get(key: string, tenantId: string): Promise<DomainEvent | null>;
  put(key: string, tenantId: string, event: DomainEvent): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly values = new Map<string, DomainEvent>();
  async get(key: string, tenantId: string) { return this.values.get(tenantId + ":" + key) ?? null; }
  async put(key: string, tenantId: string, event: DomainEvent) { this.values.set(tenantId + ":" + key, structuredClone(event)); }
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(k => JSON.stringify(k) + ":" + canonicalize(object[k])).join(",") + "}";
}

function eventHash(event: Omit<DomainEvent, "eventHash">): string {
  return eventHashFor(event);
}

function eventHashFor(event: Omit<DomainEvent, "eventHash">): string {
  return createHash("sha256").update(canonicalize(event), "utf8").digest("hex");
}

function idempotencyFingerprint(event: DomainEvent): string {
  const payload = {
    tenantId: event.tenantId,
    actorId: event.actorId,
    eventType: event.eventType,
    activity: event.activity ?? null,
    factor: event.factor ?? null,
    calculation: event.calculation ?? null,
    evidence: event.evidence,
    methodologyVersion: event.methodologyVersion,
    reason: event.reason ?? null,
    replacesEventId: event.replacesEventId ?? null,
    idempotencyKey: event.idempotencyKey,
  };
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}


function requireTenantContext(context: LedgerCommandContext): void {
  if (!context.tenantId || !context.actorId) throw new Error("tenantId and actorId are required");
  if (!context.methodologyVersion) throw new Error("methodologyVersion is required");
}

function validateActivityFactor(activity: ActivityRecord, factor: EmissionFactor): void {
  if (activity.factorId !== factor.id || activity.factorVersion !== factor.version) {
    throw new Error("activity factor reference does not match supplied factor");
  }
  if (activity.factorValue !== factor.value || activity.factorUnit !== factor.factorUnit) {
    throw new Error("activity factor snapshot does not match supplied factor");
  }
}

function baseEvent(
  command: AppendCommand,
  context: LedgerCommandContext,
  type: DomainEventType,
  sequence: number,
  previousEntryHash: string | null,
  calculation: CalculationResult,
  replacesEventId?: string,
  reason?: string
): DomainEvent {
  const recordedAt = context.now ?? new Date().toISOString();
  const unsigned: Omit<DomainEvent, "eventHash"> = {
    id: command.id,
    tenantId: context.tenantId,
    actorId: context.actorId,
    eventType: type,
    sequence,
    recordedAt,
    activity: structuredClone(command.activity),
    factor: {
      id: command.factor.id,
      version: command.factor.version,
      value: command.factor.value,
      factorUnit: command.factor.factorUnit,
      provenance: structuredClone(command.factor.provenance)
    },
    calculation,
    evidence: structuredClone(command.evidence ?? []),
    methodologyVersion: context.methodologyVersion,
    ...(reason ? { reason } : {}),
    ...(replacesEventId ? { replacesEventId } : {}),
    previousEntryHash,
    idempotencyKey: command.id,
  };
  return { ...unsigned, eventHash: eventHash(unsigned) };
}

export class CarbonLedgerDomain {
  constructor(
    private readonly persistence: LedgerPersistence,
    private readonly idempotency: IdempotencyStore = new InMemoryIdempotencyStore()
  ) {}

  async append(command: AppendCommand, context: LedgerCommandContext): Promise<DomainEvent> {
    return this.write(command.id, "entry", context, async (head) => {
      validateActivityFactor(command.activity, command.factor);
      const calculation = calculateEmissions(command.activity);
      return baseEvent(command, context, "entry", head.sequence + 1, head.hash, calculation);
    });
  }

  async restate(command: CorrectionCommand, context: LedgerCommandContext): Promise<DomainEvent> {
    if (!command.reason.trim()) throw new Error("restatement reason is required");
    const target = await this.findEvent(context.tenantId, command.replacesEventId);
    if (!target) throw new Error("restatement target event not found");
    if (target.eventType === "reversal") throw new Error("a reversal cannot be restated");
    return this.write(command.id, "restatement", context, async (head) => {
      validateActivityFactor(command.activity, command.factor);
      const calculation = calculateEmissions(command.activity);
      return baseEvent(command, context, "restatement", head.sequence + 1, head.hash, calculation, target.id, command.reason);
    });
  }

  async reverse(command: ReversalCommand, context: LedgerCommandContext): Promise<DomainEvent> {
    if (!command.reason.trim()) throw new Error("reversal reason is required");
    const target = await this.findEvent(context.tenantId, command.targetEventId);
    if (!target) throw new Error("reversal target event not found");
    if (target.eventType === "reversal") throw new Error("event is already a reversal");
    return this.write(command.id, "reversal", context, async (head) => {
      const activity = target.activity;
      const factor = target.factor;
      if (!activity || !factor || !target.calculation) throw new Error("target event is not reversible");
      const reverseActivity: ActivityRecord = { ...activity, id: command.id, quantity: -activity.quantity };
      const calculation = calculateEmissions(reverseActivity);
      const pseudoCommand: AppendCommand = {
        id: command.id,
        activity: reverseActivity,
        factor: {
          id: factor.id,
          version: factor.version,
          status: "verified",
          name: factor.id,
          scope: activity.scope,
          category: activity.category,
          geography: "SNAPSHOT",
          activityUnit: activity.unit,
          factorUnit: factor.factorUnit,
          value: factor.value,
          dataQuality: "high",
          provenance: factor.provenance
        },
        evidence: command.evidence ?? []
      };
      return baseEvent(pseudoCommand, context, "reversal", head.sequence + 1, head.hash, calculation, target.id, command.reason);
    });
  }

  private async write(
    idempotencyKey: string,
    _type: DomainEventType,
    context: LedgerCommandContext,
    build: (head: { hash: string | null; sequence: number }) => Promise<DomainEvent>
  ): Promise<DomainEvent> {
    requireTenantContext(context);
    const existing = await this.idempotency.get(idempotencyKey, context.tenantId);

    const events = await this.persistence.listEvents(context.tenantId);
    const latest = events.at(-1);
    const head = { hash: latest?.eventHash ?? null, sequence: latest?.sequence ?? 0 };
    const event = await build(head);
    if (existing) {
      if (idempotencyFingerprint(existing) !== idempotencyFingerprint(event)) {
        throw new Error("idempotency key conflict: payload differs from original operation");
      }
      return existing;
    }

    const audit: AuditRecord = {
      id: crypto.randomUUID(),
      tenantId: context.tenantId,
      actorId: context.actorId,
      action: event.eventType === "entry" ? "append" : event.eventType,
      eventId: event.id,
      recordedAt: event.recordedAt,
      metadata: { methodologyVersion: event.methodologyVersion }
    };
    const persisted = await this.persistence.appendEvent(event, audit);
    if (persisted) {
      await this.idempotency.put(idempotencyKey, context.tenantId, persisted as DomainEvent);
      return persisted as DomainEvent;
    }
    await this.idempotency.put(idempotencyKey, context.tenantId, event);
    return event;
  }

  async verify(tenantId: string, actorId: string): Promise<{ valid: boolean; checkedEvents: number; error?: string }> {
    if (!tenantId || !actorId) throw new Error("tenantId and actorId are required");
    const events = await this.persistence.listEvents(tenantId);
    let previous: string | null = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.sequence !== i + 1) return this.verificationFailure(tenantId, actorId, i, "sequence mismatch at " + event.id);
      if (event.previousEntryHash !== previous) return this.verificationFailure(tenantId, actorId, i, "previous hash mismatch at " + event.id);
      const { eventHash, ...unsigned } = event;
      if (eventHash !== eventHashFor(unsigned)) return this.verificationFailure(tenantId, actorId, i, "event hash mismatch at " + event.id);

      if (event.activity && event.factor && event.calculation) {
        if (event.activity.factorId !== event.factor.id ||
            event.activity.factorVersion !== event.factor.version ||
            event.activity.factorValue !== event.factor.value ||
            event.activity.factorUnit !== event.factor.factorUnit) {
          return this.verificationFailure(tenantId, actorId, i, "factor snapshot mismatch at " + event.id);
        }
        const expected = calculateEmissions(event.activity);
        if (expected.emissionsKgCo2e !== event.calculation.emissionsKgCo2e) {
          return this.verificationFailure(tenantId, actorId, i, "calculation mismatch at " + event.id);
        }
      }

      previous = eventHash;
    }

    await this.persistence.recordAudit({
      id: crypto.randomUUID(),
      tenantId,
      actorId,
      action: "verification",
      recordedAt: new Date().toISOString(),
      metadata: { checkedEvents: String(events.length), valid: "true" }
    });
    return { valid: true, checkedEvents: events.length };
  }

  private async verificationFailure(tenantId: string, actorId: string, checkedEvents: number, error: string) {
    await this.persistence.recordAudit({
      id: crypto.randomUUID(), tenantId, actorId, action: "verification",
      recordedAt: new Date().toISOString(), metadata: { checkedEvents: String(checkedEvents), valid: "false", error }
    });
    return { valid: false, checkedEvents, error };
  }

  private async findEvent(tenantId: string, id: string): Promise<DomainEvent | null> {
    const events = await this.persistence.listEvents(tenantId);
    return (events.find(e => e.id === id) as DomainEvent | undefined) ?? null;
  }
}
