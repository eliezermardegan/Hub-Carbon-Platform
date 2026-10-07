export type Scope = 1 | 2 | 3;
export type Scope3Category = 1|2|3|4|5|6|7|8|9|10|11|12|13|14|15;
export type DataAvailability = "provided"|"not_available"|"not_applicable"|"pending"|"estimated"|"inferred"|"rejected";
export type DataQualityLevel = "A"|"B"|"C"|"D";
export type ConfidenceLevel = "high"|"medium"|"low";
export type CalculationMethod = "supplier_specific"|"activity_based"|"spend_based"|"distance_based"|"unknown";

export type SourceType = "erp"|"accounting"|"accounts_payable"|"procurement"|"fiscal"|"fleet"|"fuel_card"|"utility"|"travel"|"logistics"|"hr"|"production"|"waste"|"supplier_portal"|"spreadsheet"|"api"|"database"|"document"|"manual";
export type DocumentType = "nfe_xml"|"nfse"|"cte_xml"|"electricity_bill"|"fuel_invoice"|"fuel_card_statement"|"fleet_report"|"travel_report"|"hotel_statement"|"waste_report"|"supplier_emissions_report"|"production_report"|"contract"|"certificate"|"utility_statement"|"generic";

export interface Company {
  companyId: string; legalName: string; country: string; reportingCurrency: string;
  reportingPeriodStart: string; reportingPeriodEnd: string;
  organizationalBoundaryMethod: "operational_control"|"financial_control"|"equity_share"|"configured";
  baseTimezone: string; cnpj?: string; legalEntityType?: string; state?: string;
  municipality?: string; tradeName?: string; cnae?: string; industry?: string;
  employeeCount?: number; parentCompanyId?: string;
}
export interface ReportingPeriod {
  periodId: string; companyId: string; startDate: string; endDate: string; reportingYear: number;
  status: "draft"|"processing"|"review"|"closed"|"restated";
  methodologyVersion: string; factorRegistryVersion: string; currency: string;
}
export interface Site {
  siteId: string; companyId: string; name: string; country: string; state?: string;
  municipality?: string; address?: string; activeFrom: string; activeTo?: string;
  facilityType?: string; costCenter?: string; erpCompanyCode?: string; meterIds?: string[];
}
export interface Source {
  sourceId: string; companyId: string; type: SourceType; systemName?: string;
  externalId?: string; ingestedAt: string;
}
export interface SourceDocument {
  documentId: string; companyId: string; sourceId: string; sourceType: SourceType;
  documentType: DocumentType; originalFilename?: string; documentDate?: string;
  reportingPeriodId: string; contentHash: string; ingestionTimestamp: string;
  processingStatus: "received"|"extracting"|"extracted"|"validated"|"rejected";
  evidenceStatus: "pending"|"available"|"invalid"; supplierId?: string; invoiceNumber?: string;
  accessKey?: string; currency?: string; totalValue?: number; siteId?: string;
  mimeType?: string; extractionModel?: string; extractionConfidence?: number;
}
export interface Evidence {
  evidenceId: string; companyId: string; sourceDocumentId?: string; sourceRecordId?: string;
  sourceSystem?: string; originalIdentifier?: string; contentHash: string; documentDate?: string;
  locator?: {page?:number; line?:number; cell?:string; record?:string};
  extractedField?: string; extractedValue?: string|number|boolean|null;
  extractionMethod?: "ocr"|"parser"|"api"|"manual"|"model"; extractionModelVersion?: string;
  confidence?: number; reviewedBy?: string; reviewedAt?: string;
  reviewStatus?: "pending"|"approved"|"rejected";
}
export interface DataQuality {
  level: DataQualityLevel; completeness: number; representativeness?: number;
  temporalRelevance?: number; geographicRelevance?: number; technologicalRelevance?: number;
  sourceReliability?: number; rationale: string;
}
export interface Confidence {
  score: number; level: ConfidenceLevel; source: "extraction"|"classification"|"inference"|"manual";
  modelVersion?: string; humanReviewed: boolean; reviewTimestamp?: string; reviewUserId?: string;
}
export interface ActivityRecord {
  activityId: string; companyId: string; reportingPeriodId: string; siteId?: string;
  sourceDocumentId?: string; sourceRecordId?: string; supplierId?: string; transactionDate?: string;
  scope: Scope; scope3Category?: Scope3Category; activityType: string;
  quantity?: number; unit?: string; normalizedQuantity?: number; normalizedUnit?: string;
  financialAmount?: number; currency?: string; method: CalculationMethod;
  dataAvailability: DataAvailability; dataQuality: DataQuality; confidence: Confidence;
  evidenceIds: string[]; classificationStatus: "pending"|"classified"|"review_required"|"rejected";
  calculationStatus: "not_ready"|"ready"|"calculated"|"blocked";
  factorId?: string; factorVersion?: string; idempotencyKey: string;
}
export type ActivityInput = Omit<ActivityRecord,"activityId"|"idempotencyKey"> & {activityId?:string; idempotencyKey?:string};
export interface IntakeValidationIssue {code:string; field:string; message:string; severity:"error"|"warning";}
export interface IntakeValidationResult {valid:boolean; issues:IntakeValidationIssue[];}
export interface LedgerHandoff {
  tenantId:string; activityId:string; idempotencyKey:string; calculationReady:boolean;
  factorId?:string; factorVersion?:string; evidenceIds:string[]; dataQuality:DataQualityLevel; confidence:ConfidenceLevel;
}
export const SCOPE3_CATEGORIES: Readonly<Record<Scope3Category,string>> = {
  1:"purchased_goods_and_services",2:"capital_goods",3:"fuel_and_energy_related_activities",
  4:"upstream_transportation_and_distribution",5:"waste_generated_in_operations",6:"business_travel",
  7:"employee_commuting",8:"upstream_leased_assets",9:"downstream_transportation_and_distribution",
  10:"processing_of_sold_products",11:"use_of_sold_products",12:"end_of_life_treatment_of_sold_products",
  13:"downstream_leased_assets",14:"franchises",15:"investments"
};
export function isScope3Category(v:number):v is Scope3Category { return Number.isInteger(v)&&v>=1&&v<=15; }
export function defaultIdempotencyKey(input:Pick<ActivityRecord,"companyId"|"reportingPeriodId"|"sourceDocumentId"|"sourceRecordId"|"activityType">):string {
  return [input.companyId,input.reportingPeriodId,input.sourceDocumentId??"-",input.sourceRecordId??"-",input.activityType].join(":");
}
export function validateActivity(input:ActivityInput):IntakeValidationResult {
  const issues:IntakeValidationIssue[]=[];
  const error=(code:string,field:string,message:string)=>issues.push({code,field,message,severity:"error"});
  const warning=(code:string,field:string,message:string)=>issues.push({code,field,message,severity:"warning"});
  if(!input.companyId) error("required","companyId","companyId is required");
  if(!input.reportingPeriodId) error("required","reportingPeriodId","reportingPeriodId is required");
  if(!input.activityType) error("required","activityType","activityType is required");
  if(!input.idempotencyKey&&!input.sourceDocumentId&&!input.sourceRecordId) error("idempotency","idempotencyKey","an idempotency key or source identifier is required");
  if(input.scope===3&&!isScope3Category(input.scope3Category??0)) error("scope3_category","scope3Category","Scope 3 activity requires a category from 1 to 15");
  if(input.quantity!==undefined&&(!Number.isFinite(input.quantity)||input.quantity<0)) error("quantity","quantity","quantity must be a finite non-negative number");
  if(input.financialAmount!==undefined&&!Number.isFinite(input.financialAmount)) error("financial_amount","financialAmount","financialAmount must be finite");
  if(input.dataQuality.completeness<0||input.dataQuality.completeness>1) error("quality_range","dataQuality.completeness","completeness must be between 0 and 1");
  if(input.confidence.score<0||input.confidence.score>1) error("confidence_range","confidence.score","confidence score must be between 0 and 1");
  if(input.method!=="spend_based"&&input.quantity===undefined&&input.dataAvailability!=="not_applicable") error("activity_quantity","quantity","quantity is required for non-spend methods");
  if(input.method==="spend_based"&&input.financialAmount===undefined) error("spend_amount","financialAmount","financialAmount is required for spend-based calculation");
  if(input.dataAvailability==="not_available") warning("unresolved","dataAvailability","record is unresolved and must not be treated as zero");
  if(input.dataAvailability==="estimated"||input.dataAvailability==="inferred") warning("estimated","dataAvailability","estimated/inferred input requires visible methodology and review");
  if(input.scope===3&&input.method==="unknown") warning("scope3_method","method","Scope 3 method is unresolved");
  return {valid:issues.every(i=>i.severity!=="error"),issues};
}
export function toLedgerHandoff(activity:ActivityRecord):LedgerHandoff {
  const v=validateActivity(activity);
  return {tenantId:activity.companyId,activityId:activity.activityId,idempotencyKey:activity.idempotencyKey,
    calculationReady:v.valid&&activity.classificationStatus==="classified"&&activity.calculationStatus==="ready"&&!!activity.factorId&&!!activity.factorVersion&&activity.evidenceIds.length>0,
    factorId:activity.factorId,factorVersion:activity.factorVersion,evidenceIds:activity.evidenceIds,
    dataQuality:activity.dataQuality.level,confidence:activity.confidence.level};
}
export function createActivity(input:ActivityInput):ActivityRecord {
  const activity:ActivityRecord={...input,activityId:input.activityId??randomId(),idempotencyKey:input.idempotencyKey??defaultIdempotencyKey(input)};
  const v=validateActivity(activity); if(!v.valid) throw new Error(v.issues.filter(i=>i.severity==="error").map(i=>i.message).join("; ")); return activity;
}
function randomId():string { return globalThis.crypto?.randomUUID?.()??`activity_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
