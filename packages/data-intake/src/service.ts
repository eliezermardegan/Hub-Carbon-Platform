import { calculateEmissions } from "../../carbon-core/src/index.js";
import { type EmissionFactor } from "../../factor-registry/src/index.js";
import { type CarbonLedgerDomain, type DomainEvent, type LedgerCommandContext } from "../../carbon-ledger/src/domain.js";
import { createActivity, type ActivityInput, type ActivityRecord, type Evidence, type LedgerHandoff, type SourceDocument, toLedgerHandoff, validateActivity } from "./index.js";
import type { DataIntakePersistence } from "./persistence.js";

export interface FactorResolver {
  resolve(activity: ActivityRecord): Promise<EmissionFactor | null>;
}

export interface IntakeServiceContext extends LedgerCommandContext {
  tenantId: string;
  actorId: string;
  methodologyVersion: string;
}

export interface IntakeResult {
  activity: ActivityRecord;
  handoff: LedgerHandoff;
  calculation?: ReturnType<typeof calculateEmissions>;
  ledgerEvent?: DomainEvent;
}

export class DataIntakeService {
  constructor(
    private readonly persistence: DataIntakePersistence,
    private readonly factorResolver: FactorResolver,
    private readonly ledger: CarbonLedgerDomain
  ) {}

  async ingestActivity(input: ActivityInput, context: IntakeServiceContext): Promise<IntakeResult> {
    if (input.companyId !== context.tenantId) throw new Error("activity company does not match tenant");
    const activity = createActivity(input);
    const validation = validateActivity(activity);
    if (!validation.valid) throw new Error(validation.issues.filter(i => i.severity === "error").map(i => i.message).join("; "));

    await this.persistence.saveActivity(activity);

    if (activity.classificationStatus !== "classified" || activity.dataAvailability === "not_available") {
      return { activity, handoff: toLedgerHandoff(activity) };
    }

    const factor = await this.factorResolver.resolve(activity);
    if (!factor) return { activity, handoff: toLedgerHandoff(activity) };

    const enriched: ActivityRecord = {
      ...activity,
      factorId: factor.id,
      factorVersion: factor.version,
      calculationStatus: "ready"
    };
    const calculationActivity = {
      id: enriched.activityId,
      scope: enriched.scope,
      category: enriched.scope3Category ? String(enriched.scope3Category) : enriched.activityType,
      quantity: enriched.normalizedQuantity ?? enriched.quantity,
      unit: enriched.normalizedUnit ?? enriched.unit,
      method: enriched.method,
      factorId: factor.id,
      factorValue: factor.value,
      factorUnit: factor.factorUnit,
      factorVersion: factor.version
    };
    if (calculationActivity.quantity === undefined) return { activity: enriched, handoff: toLedgerHandoff(enriched) };
    const calculation = calculateEmissions(calculationActivity);
    const evidence = (enriched.evidenceIds ?? []).map(id => ({ id, type: "other" as const, description: "Hub Carbon intake evidence" }));
    const ledgerEvent = await this.ledger.append({
      id: enriched.activityId,
      activity: calculationActivity,
      factor,
      evidence
    }, context);
    const persisted = { ...enriched, calculationStatus: "calculated" as const };
    return { activity: persisted, handoff: toLedgerHandoff(persisted), calculation, ledgerEvent };
  }

  async registerDocument(document: SourceDocument): Promise<void> {
    await this.persistence.saveDocument(document);
  }

  async registerEvidence(evidence: Evidence): Promise<void> {
    await this.persistence.saveEvidence(evidence);
  }
}
