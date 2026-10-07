export type Scope = 1 | 2 | 3;

export type CalculationMethod =
  | "activity_based"
  | "spend_based"
  | "supplier_specific"
  | "distance_based"
  | "unknown";

export interface ActivityRecord {
  id: string;
  scope: Scope;
  category: string;
  quantity: number;
  unit: string;
  method: CalculationMethod;
  factorId: string;
  factorValue: number;
  factorUnit: string;
  factorVersion: string;
}

export interface CalculationResult {
  activityId: string;
  emissionsKgCo2e: number;
  formula: string;
  factorId: string;
  factorVersion: string;
}

export function calculateEmissions(activity: ActivityRecord): CalculationResult {
  if (!Number.isFinite(activity.quantity)) throw new Error("quantity must be finite");
  if (!Number.isFinite(activity.factorValue)) throw new Error("factorValue must be finite");
  const emissionsKgCo2e = activity.quantity * activity.factorValue;
  if (!Number.isFinite(emissionsKgCo2e)) throw new Error("calculation overflow");
  return {
    activityId: activity.id,
    emissionsKgCo2e,
    formula: "quantity × factorValue",
    factorId: activity.factorId,
    factorVersion: activity.factorVersion
  };
}
