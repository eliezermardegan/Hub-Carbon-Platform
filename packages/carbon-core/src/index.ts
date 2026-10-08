export type Scope = 1 | 2 | 3;

export type CalculationMethod =
  | "activity_based"
  | "spend_based"
  | "supplier_specific"
  | "distance_based"
  | "unknown";

export type MassUnit = "kg" | "t" | "g";
export type VolumeUnit = "L" | "m3";
export type EnergyUnit = "kWh" | "MWh" | "MJ";
export type DistanceUnit = "km" | "mi";
export type ActivityUnit = MassUnit | VolumeUnit | EnergyUnit | DistanceUnit | "BRL" | "USD" | "tonne-km";
export type EmissionsUnit = "kgCO2e" | "tCO2e" | "gCO2e";

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
  emissionsUnit: "kgCO2e";
  formula: string;
  factorId: string;
  factorVersion: string;
}

type ParsedFactorUnit = {
  emissionsUnit: EmissionsUnit;
  activityUnit: string;
};

const activityConversions: Record<string, Record<string, number>> = {
  g: { g: 1, kg: 0.001, t: 0.000001 },
  kg: { g: 1000, kg: 1, t: 0.001 },
  t: { g: 1_000_000, kg: 1000, t: 1 },
  L: { L: 1, m3: 0.001 },
  m3: { L: 1000, m3: 1 },
  kWh: { kWh: 1, MWh: 0.001, MJ: 3.6 },
  MWh: { kWh: 1000, MWh: 1, MJ: 3600 },
  MJ: { kWh: 1 / 3.6, MWh: 1 / 3600, MJ: 1 },
  km: { km: 1, mi: 0.621371192237334 },
  mi: { km: 1.609344, mi: 1 },
  BRL: { BRL: 1 },
  USD: { USD: 1 },
};

const emissionsToKg: Record<EmissionsUnit, number> = {
  gCO2e: 0.001,
  kgCO2e: 1,
  tCO2e: 1000,
};

function parseFactorUnit(factorUnit: string): ParsedFactorUnit {
  const match = /^(g|kg|t)CO2e\/(.+)$/.exec(factorUnit.trim());
  if (!match) {
    throw new Error(`Unsupported factor unit: ${factorUnit}`);
  }
  return { emissionsUnit: `${match[1]}CO2e` as EmissionsUnit, activityUnit: match[2] };
}

function convertActivityQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;

  const conversions = activityConversions[fromUnit]?.[toUnit];
  if (conversions === undefined) {
    throw new Error(`Incompatible activity units: ${fromUnit} cannot be converted to ${toUnit}`);
  }
  return quantity * conversions;
}

export function calculateEmissions(activity: ActivityRecord): CalculationResult {
  if (!Number.isFinite(activity.quantity)) throw new Error("quantity must be finite");
  if (!Number.isFinite(activity.factorValue)) throw new Error("factorValue must be finite");

  const factor = parseFactorUnit(activity.factorUnit);
  const normalizedQuantity = convertActivityQuantity(activity.quantity, activity.unit, factor.activityUnit);
  const emissionsKgCo2e = normalizedQuantity * activity.factorValue * emissionsToKg[factor.emissionsUnit];

  if (!Number.isFinite(emissionsKgCo2e)) throw new Error("calculation overflow");

  return {
    activityId: activity.id,
    emissionsKgCo2e,
    emissionsUnit: "kgCO2e",
    formula: `${activity.quantity} ${activity.unit} × ${activity.factorValue} ${activity.factorUnit}`,
    factorId: activity.factorId,
    factorVersion: activity.factorVersion
  };
}
