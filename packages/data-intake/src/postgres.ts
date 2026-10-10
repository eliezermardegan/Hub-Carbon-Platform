import { randomUUID } from "node:crypto";
import type { ActivityRecord, Company, Evidence, ReportingPeriod, Site, Source, SourceDocument } from "./model.js";
import type { DataIntakePersistence, IntakeClaim } from "./persistence.js";
import { intakePayloadHash } from "./persistence.js";
import type { PgPool, TrustedTenantContextProvider } from "../../carbon-ledger/src/postgres.js";

export interface PostgresDataIntakeOptions { leaseDurationMs?: number; }
type Row<T> = { payload: T | string };
type ClaimRow = { activity_id: string; payload_hash: string; status: ActivityRecord["calculationStatus"]; payload: ActivityRecord | string; lease_token: string | null; lease_active: boolean };
const terminal = new Set<ActivityRecord["calculationStatus"]>(["calculated", "blocked"]);

// Run as a schema-owner/migration role. Application connections should use a non-owner role.
export const DATA_INTAKE_POSTGRES_SCHEMA = [
"create table if not exists data_intake_records (tenant_id text not null, entity_type text not null, entity_id text not null, company_id text not null, payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (tenant_id, entity_type, entity_id), check (tenant_id = company_id))",
"create table if not exists data_intake_activities (tenant_id text not null, company_id text not null, activity_id text not null, reporting_period_id text not null, idempotency_key text not null, payload_hash text not null, status text not null check (status in ('processing','not_ready','ready','calculated','blocked','failed')), payload jsonb not null, lease_token uuid, lease_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key (tenant_id, activity_id), unique (tenant_id, idempotency_key), check (tenant_id = company_id))",
"create index if not exists data_intake_activities_tenant_period on data_intake_activities (tenant_id, reporting_period_id, created_at)",
"alter table data_intake_records enable row level security", "alter table data_intake_records force row level security",
"alter table data_intake_activities enable row level security", "alter table data_intake_activities force row level security",
"drop policy if exists data_intake_records_tenant_isolation on data_intake_records",
"create policy data_intake_records_tenant_isolation on data_intake_records using (tenant_id = nullif(current_setting('app.tenant_id', true), '')) with check (tenant_id = nullif(current_setting('app.tenant_id', true), ''))",
"drop policy if exists data_intake_activities_tenant_isolation on data_intake_activities",
"create policy data_intake_activities_tenant_isolation on data_intake_activities using (tenant_id = nullif(current_setting('app.tenant_id', true), '')) with check (tenant_id = nullif(current_setting('app.tenant_id', true), ''))"
].join("\n");

function decode<T>(value: T | string): T { return (typeof value === "string" ? JSON.parse(value) : value) as T; }

export class PostgresDataIntakePersistence implements DataIntakePersistence {
  private readonly leaseDurationMs: number;
  constructor(private readonly pool: PgPool, private readonly provider: TrustedTenantContextProvider, options: PostgresDataIntakeOptions = {}) {
    this.leaseDurationMs = options.leaseDurationMs ?? 120_000;
    if (!Number.isSafeInteger(this.leaseDurationMs) || this.leaseDurationMs < 1000) throw new Error("leaseDurationMs must be a safe integer of at least 1000");
  }
  private async transaction<T>(work: (client: Awaited<ReturnType<PgPool["connect"]>>, tenant: string) => Promise<T>): Promise<T> {
    const context = await this.provider.getTrustedTenantContext();
    if (!context?.tenantId || !context.actorId) throw new Error("trusted tenant context is required");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [context.tenantId]);
      const check = await client.query<{ tenant_id: string | null }>("SELECT nullif(current_setting('app.tenant_id', true), '') AS tenant_id");
      if (check.rows[0]?.tenant_id !== context.tenantId) throw new Error("failed to establish transaction-local tenant context");
      const result = await work(client, context.tenantId); await client.query("COMMIT"); return result;
    } catch (error) { try { await client.query("ROLLBACK"); } catch { /* preserve original error */ } throw error; } finally { client.release(); }
  }
  private assertTenant(companyId: string, tenant: string): void { if (!companyId || companyId !== tenant) throw new Error("data-intake company does not match trusted tenant context"); }
  private async saveRecord<T extends { companyId: string }>(type: string, id: string, value: T): Promise<void> {
    await this.transaction(async (client, tenant) => { this.assertTenant(value.companyId, tenant); await client.query("insert into data_intake_records (tenant_id,entity_type,entity_id,company_id,payload) values ($1,$2,$3,$4,$5::jsonb) on conflict (tenant_id,entity_type,entity_id) do update set payload=excluded.payload,updated_at=now()", [tenant,type,id,value.companyId,JSON.stringify(value)]); });
  }
  private async getRecord<T>(type: string, companyId: string, id: string): Promise<T | null> {
    return this.transaction(async (client, tenant) => { this.assertTenant(companyId,tenant); const r=await client.query<Row<T>>("select payload from data_intake_records where tenant_id=$1 and entity_type=$2 and entity_id=$3",[tenant,type,id]); return r.rows[0] ? structuredClone(decode(r.rows[0].payload)) : null; });
  }
  async saveCompany(v:Company){return this.saveRecord("company",v.companyId,v);}
  async getCompany(id:string){return this.getRecord<Company>("company",id,id);}
  async saveReportingPeriod(v:ReportingPeriod){return this.saveRecord("period",v.periodId,v);}
  async getReportingPeriod(c:string,p:string){return this.getRecord<ReportingPeriod>("period",c,p);}
  async saveSite(v:Site){return this.saveRecord("site",v.siteId,v);}
  async getSite(c:string,s:string){return this.getRecord<Site>("site",c,s);}
  async saveSource(v:Source){return this.saveRecord("source",v.sourceId,v);}
  async saveDocument(v:SourceDocument){return this.saveRecord("document",v.documentId,v);}
  async getDocument(c:string,d:string){return this.getRecord<SourceDocument>("document",c,d);}
  async saveEvidence(v:Evidence){return this.saveRecord("evidence",v.evidenceId,v);}
  async claimActivity(v:ActivityRecord,payloadHash:string):Promise<IntakeClaim>{
    return this.transaction(async(client,tenant)=>{
      this.assertTenant(v.companyId,tenant); const token=randomUUID(); const processing={...v,calculationStatus:"processing" as const};
      const ins=await client.query<ClaimRow>("insert into data_intake_activities (tenant_id,company_id,activity_id,reporting_period_id,idempotency_key,payload_hash,status,payload,lease_token,lease_until) values ($1,$2,$3,$4,$5,$6,'processing',$7::jsonb,$8,now()+($9::bigint*interval '1 millisecond')) on conflict (tenant_id,idempotency_key) do nothing returning activity_id,payload_hash,status,payload,lease_token,(lease_until>now()) as lease_active",[tenant,v.companyId,v.activityId,v.reportingPeriodId,v.idempotencyKey,payloadHash,JSON.stringify(processing),token,this.leaseDurationMs]);
      if(ins.rows[0]) return {kind:"claimed",activity:structuredClone(decode(ins.rows[0].payload)),claimToken:token};
      const found=await client.query<ClaimRow>("select activity_id,payload_hash,status,payload,lease_token,(lease_until>now()) as lease_active from data_intake_activities where tenant_id=$1 and idempotency_key=$2 for update",[tenant,v.idempotencyKey]);
      const row=found.rows[0]; if(!row || row.payload_hash!==payloadHash) return {kind:"conflict"};
      const saved=decode(row.payload); if(terminal.has(row.status)) return {kind:"existing",activity:structuredClone(saved)};
      if(row.status==="processing" && row.lease_token!==null && row.lease_active) return {kind:"busy"};
      const updated=await client.query<ClaimRow>("update data_intake_activities set status='processing',payload=$3::jsonb,lease_token=$4,lease_until=now()+($5::bigint*interval '1 millisecond'),updated_at=now() where tenant_id=$1 and idempotency_key=$2 returning activity_id,payload_hash,status,payload,lease_token,(lease_until>now()) as lease_active",[tenant,v.idempotencyKey,JSON.stringify({...saved,calculationStatus:"processing"}),token,this.leaseDurationMs]);
      return {kind:"claimed",activity:structuredClone(decode(updated.rows[0].payload)),claimToken:token};
    });
  }
  async releaseActivityClaim(c:string,k:string,token?:string):Promise<void>{
    await this.transaction(async(client,tenant)=>{this.assertTenant(c,tenant);if(token)await client.query("update data_intake_activities set lease_token=null,lease_until=now(),updated_at=now() where tenant_id=$1 and idempotency_key=$2 and lease_token=$3 and status in ('processing','ready')",[tenant,k,token]);});
  }
  async saveActivity(v:ActivityRecord,token?:string):Promise<ActivityRecord|null>{
    return this.transaction(async(client,tenant)=>{
      this.assertTenant(v.companyId,tenant);
      const found=await client.query<ClaimRow>("select activity_id,payload_hash,status,payload,lease_token,(lease_until>now()) as lease_active from data_intake_activities where tenant_id=$1 and idempotency_key=$2 for update",[tenant,v.idempotencyKey]);
      const row=found.rows[0];
      if(row){if(token!==undefined&&row.lease_token!==token)throw new Error("intake claim lease lost");if(token===undefined&&row.lease_token!==null&&row.lease_active)throw new Error("activity is claimed by another intake attempt");
        const saved=structuredClone({...v,activityId:row.activity_id}); const keep=["processing","ready"].includes(v.calculationStatus);
        await client.query("update data_intake_activities set reporting_period_id=$3,status=$4,payload=$5::jsonb,lease_token=case when $6::boolean then lease_token else null end,lease_until=case when $6::boolean then lease_until else now() end,updated_at=now() where tenant_id=$1 and idempotency_key=$2",[tenant,v.idempotencyKey,v.reportingPeriodId,v.calculationStatus,JSON.stringify(saved),keep]); return saved;}
      const inserted=await client.query("insert into data_intake_activities (tenant_id,company_id,activity_id,reporting_period_id,idempotency_key,payload_hash,status,payload) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) on conflict (tenant_id,idempotency_key) do nothing returning activity_id",[tenant,v.companyId,v.activityId,v.reportingPeriodId,v.idempotencyKey,intakePayloadHash(v),v.calculationStatus,JSON.stringify(v)]);
      if(!inserted.rowCount)throw new Error("activity claim concurrently established; use claimActivity");return null;
    });
  }
  async getActivity(c:string,id:string):Promise<ActivityRecord|null>{return this.transaction(async(client,tenant)=>{this.assertTenant(c,tenant);const r=await client.query<Row<ActivityRecord>>("select payload from data_intake_activities where tenant_id=$1 and activity_id=$2",[tenant,id]);return r.rows[0]?structuredClone(decode(r.rows[0].payload)):null;});}
  async listActivities(c:string,p:string):Promise<ActivityRecord[]>{return this.transaction(async(client,tenant)=>{this.assertTenant(c,tenant);const r=await client.query<Row<ActivityRecord>>("select payload from data_intake_activities where tenant_id=$1 and reporting_period_id=$2 order by created_at,activity_id",[tenant,p]);return r.rows.map(x=>structuredClone(decode(x.payload)));});}
}

// Stable default object for ESM/CommonJS interop at the public package boundary.
export default { PostgresDataIntakePersistence, DATA_INTAKE_POSTGRES_SCHEMA };
