export type FactorScope = 1 | 2 | 3;
export type FactorStatus = "draft" | "verified" | "deprecated" | "blocked";
export type DataQuality = "high" | "medium" | "low" | "unknown";

export interface FactorProvenance {
  sourceName: string;
  sourceUrl: string;
  sourceVersion?: string;
  sourcePublicationDate?: string;
  sourceDocument?: string;
  sourceCommit?: string;
  license: string;
  licenseUrl?: string;
  attributionRequired: boolean;
  redistributionAllowed: boolean;
  sourceContentSha256?: string;
  retrievedAt: string;
}

export interface EmissionFactor {
  id: string;
  version: string;
  status: FactorStatus;
  name: string;
  scope: FactorScope;
  category: string;
  geography?: string;
  applicableFrom?: string;
  applicableTo?: string;
  activityUnit: string;
  factorUnit: string;
  value: number;
  gases?: Record<string, number>;
  gwpBasis?: string;
  method?: string;
  dataQuality: DataQuality;
  provenance: FactorProvenance;
}

export interface FactorQuery {
  category?: string;
  scope?: FactorScope;
  geography?: string;
  activityUnit?: string;
  asOf?: string;
  status?: FactorStatus;
}

function dateInRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function validateFactor(factor: EmissionFactor): string[] {
  const errors: string[] = [];
  if (!factor.id.trim()) errors.push("id is required");
  if (!factor.version.trim()) errors.push("version is required");
  if (!factor.name.trim()) errors.push("name is required");
  if (!Number.isFinite(factor.value)) errors.push("value must be finite");
  if (!factor.activityUnit.trim()) errors.push("activityUnit is required");
  if (!factor.factorUnit.trim()) errors.push("factorUnit is required");
  if (!factor.provenance.sourceName.trim()) errors.push("provenance.sourceName is required");
  if (!factor.provenance.sourceUrl.trim()) errors.push("provenance.sourceUrl is required");
  if (!factor.provenance.license.trim()) errors.push("provenance.license is required");
  if (!factor.provenance.retrievedAt.trim()) errors.push("provenance.retrievedAt is required");
  if (factor.provenance.redistributionAllowed && !factor.provenance.license) {
    errors.push("redistributable factors require a license");
  }
  return errors;
}

export function assertValidFactor(factor: EmissionFactor): void {
  const errors = validateFactor(factor);
  if (errors.length) throw new Error("Invalid emission factor: " + errors.join("; "));
}

export function factorMatches(factor: EmissionFactor, query: FactorQuery): boolean {
  if (query.category && factor.category !== query.category) return false;
  if (query.scope && factor.scope !== query.scope) return false;
  if (query.geography && factor.geography !== query.geography) return false;
  if (query.activityUnit && factor.activityUnit !== query.activityUnit) return false;
  if (query.status && factor.status !== query.status) return false;
  if (query.asOf && !dateInRange(query.asOf, factor.applicableFrom, factor.applicableTo)) return false;
  return true;
}

export function findFactors(factors: readonly EmissionFactor[], query: FactorQuery): EmissionFactor[] {
  return factors.filter(factor => factorMatches(factor, query));
}

export function factorIsImportable(factor: EmissionFactor): boolean {
  return factor.status !== "blocked" && factor.provenance.redistributionAllowed;
}
