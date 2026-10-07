import type { LedgerPersistence, PersistedLedgerEvent, AuditRecord } from "./persistence.js";

export interface PgQueryResult<T = unknown> { rows: T[]; rowCount: number | null; }
export interface PgClient {
  query<T = unknown>(text: string, values?: readonly unknown[]): Promise<PgQueryResult<T>>;
}
export interface PgPool extends PgClient {
  connect(): Promise<PgClient & { release(): void }>;
}

type HeadRow = { head_event_hash: string | null };
type EventRow = PersistedLedgerEvent;

export class PostgresLedgerPersistence implements LedgerPersistence {
  constructor(private readonly pool: PgPool) {}

  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<PersistedLedgerEvent>(
        `SELECT id, tenant_id as "tenantId", actor_id as "actorId", event_type as "eventType", sequence,
        recorded_at as "recordedAt", activity, factor, calculation, evidence,
        methodology_version as "methodologyVersion", reason, replaces_event_id as "replacesEventId",
        previous_event_hash as "previousEntryHash", event_hash as "eventHash",
        idempotency_key as "idempotencyKey"
       FROM carbon_ledger_events WHERE tenant_id = $1 AND idempotency_key = $2`,
        [event.tenantId, event.idempotencyKey]
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return existing.rows[0];
      }
      await client.query("INSERT INTO carbon_ledger_tenant_heads (tenant_id, head_event_hash) VALUES ($1, NULL) ON CONFLICT (tenant_id) DO NOTHING", [event.tenantId]);
      await client.query("SELECT tenant_id FROM carbon_ledger_tenant_heads WHERE tenant_id = $1 FOR UPDATE", [event.tenantId]);
      const existingAfterLock = await client.query<PersistedLedgerEvent>(
        "SELECT id, tenant_id as \"tenantId\", actor_id as \"actorId\", event_type as \"eventType\", sequence, recorded_at as \"recordedAt\", activity, factor, calculation, evidence, methodology_version as \"methodologyVersion\", reason, replaces_event_id as \"replacesEventId\", previous_event_hash as \"previousEntryHash\", event_hash as \"eventHash\", idempotency_key as \"idempotencyKey\" FROM carbon_ledger_events WHERE tenant_id = $1 AND idempotency_key = $2",
        [event.tenantId, event.idempotencyKey]
      );
      if (existingAfterLock.rows[0]) {
        await client.query("COMMIT");
        return existingAfterLock.rows[0];
      }
      const head = await client.query<HeadRow>(
        "SELECT head_event_hash FROM carbon_ledger_tenant_heads WHERE tenant_id = $1",
        [event.tenantId]
      );
      const currentHead = head.rows[0]?.head_event_hash ?? null;
      if (currentHead !== event.previousEntryHash) {
        throw new Error("ledger head conflict: stale previousEntryHash");
      }

      const expected = await client.query<{ expected_sequence: string }>(
        "SELECT COALESCE(MAX(sequence), 0) + 1 AS expected_sequence FROM carbon_ledger_events WHERE tenant_id = $1",
        [event.tenantId]
      );
      if (Number(expected.rows[0]?.expected_sequence) !== event.sequence) {
        throw new Error("ledger sequence conflict: expected " + expected.rows[0]?.expected_sequence);
      }

      await client.query(
        `INSERT INTO carbon_ledger_events
          (id, tenant_id, actor_id, event_type, sequence, recorded_at, activity, factor,
           calculation, evidence, methodology_version, reason, replaces_event_id,
           previous_event_hash, event_hash, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16)`,
        [
          event.id, event.tenantId, event.actorId, event.eventType, event.sequence,
          event.recordedAt, JSON.stringify(event.activity ?? null), JSON.stringify(event.factor ?? null),
          JSON.stringify(event.calculation ?? null), JSON.stringify(event.evidence),
          event.methodologyVersion, event.reason ?? null, event.replacesEventId ?? null,
          event.previousEntryHash, event.eventHash, event.idempotencyKey
        ]
      );

      await client.query(
        `INSERT INTO carbon_ledger_tenant_heads (tenant_id, head_event_hash, updated_at)
         VALUES ($1,$2,now())
         ON CONFLICT (tenant_id) DO UPDATE
         SET head_event_hash = EXCLUDED.head_event_hash, updated_at = now()`,
        [event.tenantId, event.eventHash]
      );

      await client.query(
        `INSERT INTO carbon_ledger_audit
         (id, tenant_id, actor_id, action, event_id, recorded_at, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [audit.id, audit.tenantId, audit.actorId, audit.action, audit.eventId ?? null,
         audit.recordedAt, JSON.stringify(audit.metadata ?? {})]
      );
      await client.query("COMMIT");
      return null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listEvents(tenantId: string): Promise<PersistedLedgerEvent[]> {
    const result = await this.pool.query<EventRow>(
      `SELECT id, tenant_id as "tenantId", actor_id as "actorId", event_type as "eventType",
        sequence, recorded_at as "recordedAt", activity, factor, calculation, evidence,
        methodology_version as "methodologyVersion", reason, replaces_event_id as "replacesEventId",
        previous_event_hash as "previousEntryHash", event_hash as "eventHash",
        idempotency_key as "idempotencyKey"
       FROM carbon_ledger_events WHERE tenant_id = $1 ORDER BY sequence ASC`,
      [tenantId]
    );
    return result.rows;
  }

  async listAudit(tenantId: string): Promise<AuditRecord[]> {
    const result = await this.pool.query<AuditRecord>(
      "SELECT id, tenant_id as \"tenantId\", actor_id as \"actorId\", action, event_id as \"eventId\", recorded_at as \"recordedAt\", metadata FROM carbon_ledger_audit WHERE tenant_id = $1 ORDER BY recorded_at ASC",
      [tenantId]
    );
    return result.rows;
  }

  async recordAudit(audit: AuditRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO carbon_ledger_audit
       (id, tenant_id, actor_id, action, event_id, recorded_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [audit.id, audit.tenantId, audit.actorId, audit.action, audit.eventId ?? null,
       audit.recordedAt, JSON.stringify(audit.metadata ?? {})]
    );
  }

  async getHead(tenantId: string): Promise<string | null> {
    const result = await this.pool.query<HeadRow>(
      "SELECT head_event_hash FROM carbon_ledger_tenant_heads WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows[0]?.head_event_hash ?? null;
  }
}
