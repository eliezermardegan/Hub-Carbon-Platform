import { createHash } from "node:crypto";
import type { LedgerPersistence, PersistedLedgerEvent, AuditRecord, TenantContext } from "./persistence.js";

export interface PgQueryResult<T = unknown> { rows: T[]; rowCount: number | null; }
export interface PgClient { query<T = unknown>(text: string, values?: readonly unknown[]): Promise<PgQueryResult<T>>; }
export interface PgPool extends PgClient { connect(): Promise<PgClient & { release(): void }>; }
export interface TrustedTenantContextProvider { getTrustedTenantContext(): Promise<TenantContext> | TenantContext; }

type HeadRow = { head_event_hash: string | null };
type EventRow = PersistedLedgerEvent & { idempotencyPayloadHash?: string | null };

function assertUuid(value: string, field: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error(`${field} must be a UUID`);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const object = value as Record<string, unknown>;
  return "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + canonicalize(object[key])).join(",") + "}";
}

function idempotencyPayloadHash(event: PersistedLedgerEvent): string {
  const payload = { tenantId: event.tenantId, actorId: event.actorId, eventType: event.eventType,
    activity: event.activity ?? null, factor: event.factor ?? null, calculation: event.calculation ?? null,
    evidence: event.evidence, methodologyVersion: event.methodologyVersion, reason: event.reason ?? null,
    replacesEventId: event.replacesEventId ?? null, idempotencyKey: event.idempotencyKey };
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

function safeSequence(value: unknown): number {
  const sequence = BigInt(String(value));
  if (sequence < 0n || sequence > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("ledger sequence exceeds JavaScript safe integer range");
  return Number(sequence);
}
function mapEvent(row: EventRow): PersistedLedgerEvent { return { ...row, sequence: safeSequence(row.sequence) }; }

export class PostgresLedgerPersistence implements LedgerPersistence {
  constructor(private readonly pool: PgPool, private readonly tenantContextProvider: TrustedTenantContextProvider) {}

  private async trustedContext(): Promise<TenantContext> {
    const context = await this.tenantContextProvider.getTrustedTenantContext();
    if (!context?.tenantId || !context.actorId) throw new Error("trusted tenant context is required");
    assertUuid(context.tenantId, "tenantId");
    assertUuid(context.actorId, "actorId");
    return context;
  }

  private async beginTenantTransaction(client: PgClient, context: TenantContext): Promise<void> {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
    const check = await client.query<{ tenant_id: string | null }>("SELECT current_setting('app.tenant_id', true) AS tenant_id");
    if (check.rows[0]?.tenant_id !== context.tenantId) throw new Error("failed to establish transaction-local tenant context");
  }

  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null> {
    const context = await this.trustedContext();
    if (event.tenantId !== context.tenantId || event.actorId !== context.actorId) throw new Error("event tenant or actor does not match trusted context");
    if (audit.tenantId !== context.tenantId || audit.actorId !== context.actorId || audit.eventId !== event.id) throw new Error("audit record does not match authorized operation");
    const payloadHash = idempotencyPayloadHash(event);
    const client = await this.pool.connect();
    try {
      await this.beginTenantTransaction(client, context);
      const existing = await client.query<EventRow>(`SELECT id, tenant_id as "tenantId", actor_id as "actorId", event_type as "eventType", sequence,
        recorded_at as "recordedAt", activity, factor, calculation, evidence, methodology_version as "methodologyVersion", reason,
        replaces_event_id as "replacesEventId", previous_event_hash as "previousEntryHash", event_hash as "eventHash",
        idempotency_key as "idempotencyKey", idempotency_payload_hash as "idempotencyPayloadHash"
        FROM carbon_ledger_events WHERE tenant_id = $1 AND idempotency_key = $2`, [context.tenantId, event.idempotencyKey]);
      if (existing.rows[0]) {
        if (existing.rows[0].idempotencyPayloadHash !== payloadHash) throw new Error("idempotency key conflict: payload differs from original operation");
        await client.query("COMMIT"); return mapEvent(existing.rows[0]);
      }
      await client.query("INSERT INTO carbon_ledger_tenant_heads (tenant_id, head_event_hash) VALUES ($1, NULL) ON CONFLICT (tenant_id) DO NOTHING", [context.tenantId]);
      await client.query("SELECT tenant_id FROM carbon_ledger_tenant_heads WHERE tenant_id = $1 FOR UPDATE", [context.tenantId]);
      const existingAfterLock = await client.query<EventRow>(`SELECT id, tenant_id as "tenantId", actor_id as "actorId", event_type as "eventType", sequence,
        recorded_at as "recordedAt", activity, factor, calculation, evidence, methodology_version as "methodologyVersion", reason,
        replaces_event_id as "replacesEventId", previous_event_hash as "previousEntryHash", event_hash as "eventHash",
        idempotency_key as "idempotencyKey", idempotency_payload_hash as "idempotencyPayloadHash"
        FROM carbon_ledger_events WHERE tenant_id = $1 AND idempotency_key = $2`, [context.tenantId, event.idempotencyKey]);
      if (existingAfterLock.rows[0]) {
        if (existingAfterLock.rows[0].idempotencyPayloadHash !== payloadHash) throw new Error("idempotency key conflict: payload differs from original operation");
        await client.query("COMMIT"); return mapEvent(existingAfterLock.rows[0]);
      }
      const head = await client.query<HeadRow>("SELECT head_event_hash FROM carbon_ledger_tenant_heads WHERE tenant_id = $1", [context.tenantId]);
      const currentHead = head.rows[0]?.head_event_hash ?? null;
      if (currentHead !== event.previousEntryHash) throw new Error("ledger head conflict: stale previousEntryHash");
      const expected = await client.query<{ expected_sequence: string }>("SELECT COALESCE(MAX(sequence), 0) + 1 AS expected_sequence FROM carbon_ledger_events WHERE tenant_id = $1", [context.tenantId]);
      if (BigInt(String(expected.rows[0]?.expected_sequence)) !== BigInt(event.sequence)) throw new Error("ledger sequence conflict: expected " + expected.rows[0]?.expected_sequence);
      await client.query(`INSERT INTO carbon_ledger_events
        (id, tenant_id, actor_id, event_type, sequence, recorded_at, activity, factor, calculation, evidence,
         methodology_version, reason, replaces_event_id, previous_event_hash, event_hash, idempotency_key, idempotency_payload_hash)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16,$17)`,
        [event.id, context.tenantId, context.actorId, event.eventType, event.sequence, event.recordedAt,
          JSON.stringify(event.activity ?? null), JSON.stringify(event.factor ?? null), JSON.stringify(event.calculation ?? null), JSON.stringify(event.evidence),
          event.methodologyVersion, event.reason ?? null, event.replacesEventId ?? null, event.previousEntryHash, event.eventHash, event.idempotencyKey, payloadHash]);
      await client.query(`INSERT INTO carbon_ledger_tenant_heads (tenant_id, head_event_hash, updated_at)
        VALUES ($1,$2,now()) ON CONFLICT (tenant_id) DO UPDATE SET head_event_hash = EXCLUDED.head_event_hash, updated_at = now()`, [context.tenantId, event.eventHash]);
      await client.query(`INSERT INTO carbon_ledger_audit (id, tenant_id, actor_id, action, event_id, recorded_at, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`, [audit.id, context.tenantId, context.actorId, audit.action, event.id, audit.recordedAt, JSON.stringify(audit.metadata ?? {})]);
      await client.query("COMMIT"); return null;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
      throw error;
    } finally { client.release(); }
  }

  private async withTenantRead<T>(tenantId: string, work: (client: PgClient) => Promise<T>): Promise<T> {
    const context = await this.trustedContext();
    if (tenantId !== context.tenantId) throw new Error("tenant query does not match trusted context");
    const client = await this.pool.connect();
    try {
      await this.beginTenantTransaction(client, context);
      const result = await work(client); await client.query("COMMIT"); return result;
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch { /* preserve original error */ }
      throw error;
    } finally { client.release(); }
  }

  async listEvents(tenantId: string): Promise<PersistedLedgerEvent[]> {
    return this.withTenantRead(tenantId, async client => (await client.query<EventRow>(`SELECT id, tenant_id as "tenantId", actor_id as "actorId", event_type as "eventType", sequence,
      recorded_at as "recordedAt", activity, factor, calculation, evidence, methodology_version as "methodologyVersion", reason,
      replaces_event_id as "replacesEventId", previous_event_hash as "previousEntryHash", event_hash as "eventHash",
      idempotency_key as "idempotencyKey", idempotency_payload_hash as "idempotencyPayloadHash" FROM carbon_ledger_events ORDER BY sequence ASC`)).rows.map(mapEvent));
  }

  async listAudit(tenantId: string): Promise<AuditRecord[]> {
    return this.withTenantRead(tenantId, async client => (await client.query<AuditRecord>("SELECT id, tenant_id as \"tenantId\", actor_id as \"actorId\", action, event_id as \"eventId\", recorded_at as \"recordedAt\", metadata FROM carbon_ledger_audit ORDER BY recorded_at ASC")).rows);
  }

  async recordAudit(audit: AuditRecord): Promise<void> {
    const context = await this.trustedContext();
    if (audit.tenantId !== context.tenantId || audit.actorId !== context.actorId) throw new Error("audit record does not match trusted context");
    await this.withTenantRead(context.tenantId, async client => {
      if (audit.eventId) {
        const reference = await client.query<{ tenant_id: string; actor_id: string }>(
          "SELECT tenant_id, actor_id FROM carbon_ledger_events WHERE id = $1",
          [audit.eventId],
        );
        const row = reference.rows[0];
        if (!row) throw new Error("audit event reference not found");
        if (row.tenant_id !== context.tenantId || row.actor_id !== context.actorId) {
          throw new Error("audit event reference does not match trusted context");
        }
      }
      await client.query(`INSERT INTO carbon_ledger_audit (id, tenant_id, actor_id, action, event_id, recorded_at, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`, [audit.id, context.tenantId, context.actorId, audit.action, audit.eventId ?? null, audit.recordedAt, JSON.stringify(audit.metadata ?? {})]);
    });
  }

  async getHead(tenantId: string): Promise<string | null> {
    return this.withTenantRead(tenantId, async client => (await client.query<HeadRow>("SELECT head_event_hash FROM carbon_ledger_tenant_heads")).rows[0]?.head_event_hash ?? null);
  }
}
