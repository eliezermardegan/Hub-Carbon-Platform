import { createHash } from "node:crypto";
import { calculateEmissions, type ActivityRecord, type CalculationResult } from "../../carbon-core/src/index.js";
import type { EmissionFactor, FactorProvenance } from "../../factor-registry/src/index.js";

export type EvidenceType = "invoice" | "receipt" | "meter" | "erp_record" | "supplier_submission" | "manual" | "other";
export interface EvidenceReference { id: string; type: EvidenceType; uri?: string; description?: string; }
export interface LedgerEntry {
  id: string; sequence: number; recordedAt: string; activity: ActivityRecord;
  factor: { id: string; version: string; value: number; factorUnit: string; provenance: FactorProvenance };
  calculation: CalculationResult; evidence: EvidenceReference[]; methodologyVersion: string;
  previousEntryHash: string | null; entryHash: string;
}
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map(key => JSON.stringify(key) + ":" + canonicalize(record[key])).join(",") + "}";
}
function hashEntry(entry: Omit<LedgerEntry, "entryHash">): string {
  return createHash("sha256").update(canonicalize(entry), "utf8").digest("hex");
}
export class CarbonLedger {
  private readonly entries: LedgerEntry[] = [];
  append(activity: ActivityRecord, factor: EmissionFactor, evidence: readonly EvidenceReference[], methodologyVersion: string, recordedAt = new Date().toISOString()): LedgerEntry {
    if (activity.factorId !== factor.id || activity.factorVersion !== factor.version) throw new Error("activity factor reference does not match supplied factor");
    const calculation = calculateEmissions(activity);
    const previousEntryHash = this.entries.at(-1)?.entryHash ?? null;
    const unsigned: Omit<LedgerEntry, "entryHash"> = { id: activity.id, sequence: this.entries.length + 1, recordedAt, activity: structuredClone(activity), factor: { id: factor.id, version: factor.version, value: factor.value, factorUnit: factor.factorUnit, provenance: structuredClone(factor.provenance) }, calculation, evidence: structuredClone([...evidence]), methodologyVersion, previousEntryHash };
    const entry: LedgerEntry = { ...unsigned, entryHash: hashEntry(unsigned) };
    this.entries.push(entry);
    return structuredClone(entry);
  }
  list(): LedgerEntry[] { return structuredClone(this.entries); }
  verify(): { valid: boolean; checkedEntries: number; error?: string } {
    let previous: string | null = null;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry.sequence !== i + 1) return { valid: false, checkedEntries: i, error: "sequence mismatch at entry " + entry.id };
      if (entry.previousEntryHash !== previous) return { valid: false, checkedEntries: i, error: "previous hash mismatch at entry " + entry.id };
      const { entryHash, ...unsigned } = entry;
      if (hashEntry(unsigned) !== entryHash) return { valid: false, checkedEntries: i, error: "entry hash mismatch at entry " + entry.id };
      previous = entryHash;
    }
    return { valid: true, checkedEntries: this.entries.length };
  }
  totalKgCo2e(): number { return this.entries.reduce((sum, entry) => sum + entry.calculation.emissionsKgCo2e, 0); }
}

export * from "./domain.js";
export * from "./persistence.js";
export * from "./postgres.js";
