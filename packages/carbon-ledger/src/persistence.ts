import type { ActivityRecord, CalculationResult } from "../../carbon-core/src/index.js";
import type { FactorProvenance } from "../../factor-registry/src/index.js";
import type { EvidenceReference } from "./index.js";

export type LedgerEventType = "entry" | "restatement" | "reversal";

export interface TenantContext { tenantId: string; actorId: string; }

export interface PersistedLedgerEvent {
  id: string;
  tenantId: string;
  actorId: string;
  eventType: LedgerEventType;
  sequence: number;
  recordedAt: string;
  activity?: ActivityRecord;
  factor?: {
    id: string;
    version: string;
    value: number;
    factorUnit: string;
    provenance: FactorProvenance;
  };
  calculation?: CalculationResult;
  evidence: EvidenceReference[];
  methodologyVersion: string;
  reason?: string;
  replacesEventId?: string;
  previousEntryHash: string | null;
  eventHash: string;
  idempotencyKey: string;
}

export interface AuditRecord {
  id: string;
  tenantId: string;
  actorId: string;
  action: "append" | "restatement" | "reversal" | "verification";
  eventId?: string;
  recordedAt: string;
  metadata?: Record<string, string>;
}

export interface LedgerPersistence {
  appendEvent(event: PersistedLedgerEvent, audit: AuditRecord): Promise<PersistedLedgerEvent | null>;
  listEvents(tenantId: string): Promise<PersistedLedgerEvent[]>;
  listAudit(tenantId: string): Promise<AuditRecord[]>;
  getHead(tenantId: string): Promise<string | null>;
  recordAudit(audit: AuditRecord): Promise<void>;
}

export const POSTGRES_SCHEMA = `create extension if not exists pgcrypto;

create table if not exists carbon_ledger_events (
  id uuid primary key,
  tenant_id uuid not null,
  actor_id uuid not null,
  event_type text not null check (event_type in ('entry','restatement','reversal')),
  sequence bigint not null check (sequence > 0),
  recorded_at timestamptz not null,
  activity jsonb,
  factor jsonb,
  calculation jsonb,
  evidence jsonb not null default '[]'::jsonb,
  methodology_version text not null,
  reason text,
  replaces_event_id uuid,
  previous_event_hash text,
  event_hash text not null,
  unique (tenant_id, sequence),
  unique (tenant_id, event_hash)
);

alter table carbon_ledger_events add column if not exists idempotency_key text;
alter table carbon_ledger_events add column if not exists idempotency_payload_hash text;
create unique index if not exists carbon_ledger_events_tenant_idempotency
  on carbon_ledger_events (tenant_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists carbon_ledger_events_tenant_sequence
  on carbon_ledger_events (tenant_id, sequence);

create table if not exists carbon_ledger_audit (
  id uuid primary key,
  tenant_id uuid not null,
  actor_id uuid not null,
  action text not null check (action in ('append','restatement','reversal','verification')),
  event_id uuid,
  recorded_at timestamptz not null,
  metadata jsonb
);
create index if not exists carbon_ledger_audit_tenant_time
  on carbon_ledger_audit (tenant_id, recorded_at desc);

create table if not exists carbon_ledger_tenant_heads (
  tenant_id uuid primary key,
  head_event_hash text,
  updated_at timestamptz not null default now()
);

create or replace function prevent_append_only_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'carbon ledger is append-only';
end;
$$;

drop trigger if exists carbon_ledger_events_no_update on carbon_ledger_events;
create trigger carbon_ledger_events_no_update
before update or delete on carbon_ledger_events
for each row execute function prevent_append_only_mutation();

drop trigger if exists carbon_ledger_audit_no_update on carbon_ledger_audit;
create trigger carbon_ledger_audit_no_update
before update or delete on carbon_ledger_audit
for each row execute function prevent_append_only_mutation();

create or replace function guard_carbon_ledger_tenant_head()
returns trigger language plpgsql as $tag$
begin
  if TG_OP = 'DELETE' then
    raise exception 'carbon ledger tenant head cannot be deleted';
  end if;
  if NEW.tenant_id <> OLD.tenant_id then
    raise exception 'carbon ledger tenant head tenant_id is immutable';
  end if;
  if NEW.head_event_hash is null then
    if exists (select 1 from carbon_ledger_events where tenant_id = OLD.tenant_id) then
      raise exception 'carbon ledger tenant head cannot be cleared while events exist';
    end if;
  elsif not exists (
    select 1 from carbon_ledger_events
    where tenant_id = NEW.tenant_id and event_hash = NEW.head_event_hash
  ) then
    raise exception 'carbon ledger tenant head must reference an existing tenant event';
  end if;
  return NEW;
end;
$tag$;

drop trigger if exists carbon_ledger_heads_guard on carbon_ledger_tenant_heads;
create trigger carbon_ledger_heads_guard
before update or delete on carbon_ledger_tenant_heads
for each row execute function guard_carbon_ledger_tenant_head();

alter table carbon_ledger_events enable row level security;
alter table carbon_ledger_audit enable row level security;
alter table carbon_ledger_tenant_heads enable row level security;
alter table carbon_ledger_events force row level security;
alter table carbon_ledger_audit force row level security;
alter table carbon_ledger_tenant_heads force row level security;

drop policy if exists carbon_ledger_events_tenant_isolation on carbon_ledger_events;
drop policy if exists carbon_ledger_events_tenant_insert on carbon_ledger_events;
drop policy if exists carbon_ledger_audit_tenant_isolation on carbon_ledger_audit;
drop policy if exists carbon_ledger_audit_tenant_insert on carbon_ledger_audit;
drop policy if exists carbon_ledger_heads_tenant_isolation on carbon_ledger_tenant_heads;

create policy carbon_ledger_events_tenant_isolation
on carbon_ledger_events
using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy carbon_ledger_audit_tenant_isolation
on carbon_ledger_audit
using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy carbon_ledger_heads_tenant_isolation
on carbon_ledger_tenant_heads
using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- Operational requirement: the application role must not own these tables and must not have BYPASSRLS.
-- Ownership/role grants are deployment-specific and must be verified in the target environment.
`;
