import type { ActivityRecord, CalculationResult } from "../../carbon-core/src/index.js";
import type { FactorProvenance } from "../../factor-registry/src/index.js";
import type { EvidenceReference } from "./index.js";

export type LedgerEventType = "entry" | "restatement" | "reversal";

export interface TenantContext { tenantId: string; actorId: string; }

export interface PersistedLedgerEvent {
  id: string; tenantId: string; actorId: string; eventType: LedgerEventType;
  sequence: number; recordedAt: string; activity?: ActivityRecord;
  factor?: { id: string; version: string; value: number; factorUnit: string; provenance: FactorProvenance };
  calculation?: CalculationResult; evidence: EvidenceReference[];
  methodologyVersion: string; reason?: string; replacesEventId?: string;
  previousEntryHash: string | null; eventHash: string;
  idempotencyKey: string;
}

export interface AuditRecord {
  id: string; tenantId: string; actorId: string;
  action: "append" | "restatement" | "reversal" | "verification";
  eventId?: string; recordedAt: string; metadata?: Record<string, string>;
}

export interface LedgerPersistence {
  appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null>;
  listEvents(tenantId: string): Promise<PersistedLedgerEvent[]>;
  listAudit(tenantId: string): Promise<AuditRecord[]>;
  getHead(tenantId: string): Promise<string | null>;
  recordAudit(audit: AuditRecord): Promise<void>;
}

export const POSTGRES_SCHEMA = "create extension if not exists pgcrypto;\n\ncreate table if not exists carbon_ledger_events (\n  id uuid primary key,\n  tenant_id uuid not null,\n  actor_id uuid not null,\n  event_type text not null check (event_type in ('entry','restatement','reversal')),\n  sequence bigint not null,\n  recorded_at timestamptz not null,\n  activity jsonb,\n  factor jsonb,\n  calculation jsonb,\n  evidence jsonb not null default '[]'::jsonb,\n  methodology_version text not null,\n  reason text,\n  replaces_event_id uuid,\n  previous_event_hash text,\n  event_hash text not null,\n  unique (tenant_id, sequence),\n  unique (tenant_id, event_hash),
  unique (tenant_id, idempotency_key)\n);

alter table carbon_ledger_events add column if not exists idempotency_key text;
create unique index if not exists carbon_ledger_events_tenant_idempotency on carbon_ledger_events (tenant_id, idempotency_key) where idempotency_key is not null;\n\ncreate index if not exists carbon_ledger_events_tenant_sequence on carbon_ledger_events (tenant_id, sequence);\n\ncreate table if not exists carbon_ledger_audit (\n  id uuid primary key,\n  tenant_id uuid not null,\n  actor_id uuid not null,\n  action text not null,\n  event_id uuid,\n  recorded_at timestamptz not null,\n  metadata jsonb\n);\ncreate index if not exists carbon_ledger_audit_tenant_time on carbon_ledger_audit (tenant_id, recorded_at desc);\n\ncreate table if not exists carbon_ledger_tenant_heads (\n  tenant_id uuid primary key,\n  head_event_hash text,\n  updated_at timestamptz not null default now()\n);\n\ncreate or replace function prevent_append_only_mutation() returns trigger language plpgsql as $$\nbegin raise exception 'carbon ledger is append-only'; end;\n$$;\n\ndrop trigger if exists carbon_ledger_events_no_update on carbon_ledger_events;\ncreate trigger carbon_ledger_events_no_update before update or delete on carbon_ledger_events for each row execute function prevent_append_only_mutation();\n\nalter table carbon_ledger_events enable row level security;\nalter table carbon_ledger_audit enable row level security;
alter table carbon_ledger_tenant_heads enable row level security;\ndrop policy if exists carbon_ledger_events_tenant_isolation on carbon_ledger_events;
drop policy if exists carbon_ledger_audit_tenant_isolation on carbon_ledger_audit;
drop policy if exists carbon_ledger_heads_tenant_isolation on carbon_ledger_tenant_heads;
create policy carbon_ledger_events_tenant_isolation on carbon_ledger_events using (tenant_id = current_setting('app.tenant_id', true)::uuid);\ncreate policy carbon_ledger_audit_tenant_isolation on carbon_ledger_audit using (tenant_id = current_setting('app.tenant_id', true)::uuid);\n";
\ncreate policy carbon_ledger_events_tenant_insert on carbon_ledger_events for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);\ncreate policy carbon_ledger_audit_tenant_insert on carbon_ledger_audit for insert with check (tenant_id = current_setting('app.tenant_id', true)::uuid);\ncreate policy carbon_ledger_heads_tenant_isolation on carbon_ledger_tenant_heads using (tenant_id = current_setting('app.tenant_id', true)::uuid) with check (tenant_id = current_setting('app.tenant_id', true)::uuid);\n