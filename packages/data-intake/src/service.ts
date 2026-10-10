import { calculateEmissions } from "../../carbon-core/src/index.js";
import { factorIsImportable, type EmissionFactor } from "../../factor-registry/src/index.js";
import { type CarbonLedgerDomain, type DomainEvent, type LedgerCommandContext } from "../../carbon-ledger/src/domain.js";
import { createActivity, type ActivityInput, type ActivityRecord, type Evidence, type LedgerHandoff, type SourceDocument, toLedgerHandoff } from "./index.js";
import { intakePayloadHash, type DataIntakePersistence } from "./persistence.js";

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
    private readonly ledger: CarbonLedgerDomain,
  ) {}

  async ingestActivity(input: ActivityInput, context: IntakeServiceContext): Promise<IntakeResult> {
    if (input.companyId !== context.tenantId) throw new Error("activity company does not match tenant");

    const requested = createActivity(input);
    const claim = await this.persistence.claimActivity(requested, intakePayloadHash(requested));
    if (claim.kind === "conflict") throw new Error("idempotency key conflict: payload differs from original intake");
    if (claim.kind === "busy") throw new Error("idempotent intake request is already processing");
    if (claim.kind === "existing") {
      if (claim.activity.calculationStatus === "blocked") {
        throw new Error("factor is not approved for import or calculation");
      }
      return { activity: claim.activity, handoff: toLedgerHandoff(claim.activity) };
    }

    // Reuse the first activity ID for every retry. The ledger uses that stable
    // ID as its own idempotency key, including recovery after a partial failure.
    let activity: ActivityRecord = {
      ...requested,
      activityId: claim.activity.activityId,
      calculationStatus: requested.calculationStatus,
    };
    let terminal = false;

    try {
      if (activity.classificationStatus !== "classified" || activity.dataAvailability === "not_available") {
        activity = { ...activity, calculationStatus: "not_ready" };
        await this.persistence.saveActivity(activity);
        terminal = true;
        return { activity, handoff: toLedgerHandoff(activity) };
      }

      const factor = await this.factorResolver.resolve(activity);
      if (!factor) {
        activity = { ...activity, calculationStatus: "not_ready" };
        await this.persistence.saveActivity(activity);
        terminal = true;
        return { activity, handoff: toLedgerHandoff(activity) };
      }

      if (!factorIsImportable(factor)) {
        activity = {
          ...activity,
          factorId: factor.id,
          factorVersion: factor.version,
          calculationStatus: "blocked",
        };
        await this.persistence.saveActivity(activity);
        terminal = true;
        throw new Error("factor is not approved for import or calculation");
      }

      activity = {
        ...activity,
        factorId: factor.id,
        factorVersion: factor.version,
        calculationStatus: "ready",
      };

      const quantity = activity.normalizedQuantity ?? activity.quantity;
      if (quantity === undefined) {
        activity = { ...activity, calculationStatus: "not_ready" };
        await this.persistence.saveActivity(activity);
        terminal = true;
        return { activity, handoff: toLedgerHandoff(activity) };
      }

      const calculationActivity = {
        id: activity.activityId,
        scope: activity.scope,
        category: activity.scope3Category ? String(activity.scope3Category) : activity.activityType,
        quantity,
        unit: activity.normalizedUnit ?? activity.unit ?? factor.activityUnit,
        method: activity.method,
        factorId: factor.id,
        factorValue: factor.value,
        factorUnit: factor.factorUnit,
        factorVersion: factor.version,
      };

      const calculation = calculateEmissions(calculationActivity);
      const evidence = activity.evidenceIds.map(id => ({
        id,
        type: "other" as const,
        description: "Hub Carbon intake evidence",
      }));
      const ledgerEvent = await this.ledger.append(
        { id: activity.activityId, activity: calculationActivity, factor, evidence },
        context,
      );

      activity = { ...activity, calculationStatus: "calculated" };
      await this.persistence.saveActivity(activity);
      terminal = true;
      return { activity, handoff: toLedgerHandoff(activity), calculation, ledgerEvent };
    } catch (error) {
      if (!terminal) {
        try {
          await this.persistence.saveActivity({ ...activity, calculationStatus: "failed" });
        } catch {
          // Preserve the original operation error. Release below lets a retry
          // reclaim a processing record if persistence itself is unavailable.
        }
      }
      throw error;
    } finally {
      await this.persistence.releaseActivityClaim(context.tenantId, requested.idempotencyKey);
    }
  }

  async registerDocument(document: SourceDocument) {
    await this.persistence.saveDocument(document);
  }

  async registerEvidence(evidence: Evidence) {
    await this.persistence.saveEvidence(evidence);
  }
}

export default DataIntakeService;
