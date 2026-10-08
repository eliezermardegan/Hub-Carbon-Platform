import { calculateEmissions } from "../../carbon-core/src/index.js";
import { type EmissionFactor } from "../../factor-registry/src/index.js";
import { type CarbonLedgerDomain, type DomainEvent, type LedgerCommandContext } from "../../carbon-ledger/src/domain.js";
import { createActivity, type ActivityInput, type ActivityRecord, type Evidence, type LedgerHandoff, type SourceDocument, toLedgerHandoff } from "./index.js";
import type { DataIntakePersistence } from "./persistence.js";
export interface FactorResolver { resolve(activity: ActivityRecord): Promise<EmissionFactor | null>; }
export interface IntakeServiceContext extends LedgerCommandContext { tenantId:string; actorId:string; methodologyVersion:string; }
export interface IntakeResult { activity:ActivityRecord; handoff:LedgerHandoff; calculation?:ReturnType<typeof calculateEmissions>; ledgerEvent?:DomainEvent; }
export class DataIntakeService {
 constructor(private readonly persistence:DataIntakePersistence,private readonly factorResolver:FactorResolver,private readonly ledger:CarbonLedgerDomain){}
 async ingestActivity(input:ActivityInput,context:IntakeServiceContext):Promise<IntakeResult>{
  if(input.companyId!==context.tenantId) throw new Error("activity company does not match tenant");
  let activity=createActivity(input); await this.persistence.saveActivity(activity);
  if(activity.classificationStatus!=="classified"||activity.dataAvailability==="not_available") return {activity,handoff:toLedgerHandoff(activity)};
  const factor=await this.factorResolver.resolve(activity); if(!factor) return {activity,handoff:toLedgerHandoff(activity)};
  activity={...activity,factorId:factor.id,factorVersion:factor.version,calculationStatus:"ready"};
  const quantity=activity.normalizedQuantity??activity.quantity; if(quantity===undefined)return {activity,handoff:toLedgerHandoff(activity)};
  const calculationActivity={id:activity.activityId,scope:activity.scope,category:activity.scope3Category?String(activity.scope3Category):activity.activityType,quantity,unit:activity.normalizedUnit??activity.unit??factor.activityUnit,method:activity.method,factorId:factor.id,factorValue:factor.value,factorUnit:factor.factorUnit,factorVersion:factor.version};
  const calculation=calculateEmissions(calculationActivity);
  const evidence=activity.evidenceIds.map(id=>({id,type:"other" as const,description:"Hub Carbon intake evidence"}));
  const ledgerEvent=await this.ledger.append({id:activity.activityId,activity:calculationActivity,factor,evidence},context);
  activity={...activity,calculationStatus:"calculated"}; await this.persistence.saveActivity(activity);
  return {activity,handoff:toLedgerHandoff(activity),calculation,ledgerEvent};
 }
 async registerDocument(document:SourceDocument){await this.persistence.saveDocument(document)}
 async registerEvidence(evidence:Evidence){await this.persistence.saveEvidence(evidence)}
}
export default DataIntakeService;
