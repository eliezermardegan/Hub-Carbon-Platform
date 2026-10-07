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

  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT tenant_id FROM carbon_ledger_tenant_heads WHERE tenant_id = $1 FOR UPDATE", [event.tenantId]);
      const head = await client.query<HeadRow>(
        "SELECT head_event_hash FROM carbon_ledger_tenant_heads WHERE tenant_id = $1",
        [event.tenantId]
      );
      const currentHead = head.rows[0]?.head_event_hash ?? null;
      if (currentHead !== event.previousEntryHash) {
        throw new Error("ledger head conflict: stale previousEntryHash");
      }

      await client.query(
        `INSERT INTO carbon_ledger_events
          (id, tenant_id, actor_id, event_type, sequence, recorded_at, activity, factor,
           calculation, evidence, methodology_version, reason, replaces_event_id,
           previous_event_hash, event_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15)`,
        [
          event.id, event.tenantId, event.actorId, event.eventType, event.sequence,
          event.recordedAt, JSON.stringify(event.activity ?? null), JSON.stringify(event.factor ?? null),
          JSON.stringify(event.calculation ?? null), JSON.stringify(event.evidence),
          event.methodologyVersion, event.reason ?? null, event.replacesEventId ?? null,
          event.previousEntryHash, event.eventHash
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
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listEvents(tenantId: string): Promise<PersistedLedgerEvent[]> {
    const result = await this.pool.query<EventRow>(
      "SELECT * FROM carbon_ledger_events WHERE tenant_id = $1 ORDER BY sequence ASC",
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

  async getHead(tenantId: string): Promise<string | null> {
    const result = await this.pool.query<HeadRow>(
      "SELECT head_event_hash FROM carbon_ledger_tenant_heads WHERE tenant_id = $1",
      [tenantId]
    );
    return result.rows[0]?.head_event_hash ?? null;
  }
}
