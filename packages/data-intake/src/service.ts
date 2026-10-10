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

    const created = createActivity(input);
    const { factorId: _untrustedFactorId, factorVersion: _untrustedFactorVersion, ...requested } = created;
    const claim = await this.persistence.claimActivity(requested, intakePayloadHash(requested, context));
    if (claim.kind === "conflict") throw new Error("idempotency key conflict: payload differs from original intake");
    if (claim.kind === "busy") throw new Error("idempotent intake request is already processing");
    if (claim.kind === "existing") {
      if (claim.activity.calculationStatus === "blocked") {
        throw new Error("factor is not approved for import or calculation");
      }
      return { activity: claim.activity, handoff: toLedgerHandoff(claim.activity) };
    }
    const claimToken = claim.claimToken;

    // Reuse the first activity ID for every retry. The ledger uses that stable
    // ID as its own idempotency key, including recovery after a partial failure.
    const requestFields = requested;
    const priorFactorId = claim.activity.factorId;
    const priorFactorVersion = claim.activity.factorVersion;
    let activity: ActivityRecord = {
      ...requestFields,
      activityId: claim.activity.activityId,
      calculationStatus: "processing",
      ...(priorFactorId && priorFactorVersion ? { factorId: priorFactorId, factorVersion: priorFactorVersion } : {}),
    };
    let terminal = false;

    try {
      if (priorFactorId && priorFactorVersion) {
        const committed = await this.ledger.findByIdempotencyKey(context.tenantId, activity.activityId);
        if (committed) {
          const quantity = activity.normalizedQuantity ?? activity.quantity;
          const category = activity.scope3Category ? String(activity.scope3Category) : activity.activityType;
          const expectedEvidenceIds = activity.evidenceIds;
          const committedEvidenceIds = (committed.evidence ?? []).map(item => item.id);
          const matches =
            committed.id === activity.activityId &&
            committed.idempotencyKey === activity.activityId &&
            committed.tenantId === context.tenantId &&
            committed.actorId === context.actorId &&
            committed.methodologyVersion === context.methodologyVersion &&
            committed.factor?.id === priorFactorId &&
            committed.factor?.version === priorFactorVersion &&
            committed.activity?.scope === activity.scope &&
            committed.activity?.category === category &&
            committed.activity?.quantity === quantity &&
            committed.activity?.method === activity.method &&
            committed.activity?.factorId === priorFactorId &&
            committed.activity?.factorVersion === priorFactorVersion &&
            (!(activity.normalizedUnit ?? activity.unit) || committed.activity?.unit === (activity.normalizedUnit ?? activity.unit)) &&
            JSON.stringify(committedEvidenceIds) === JSON.stringify(expectedEvidenceIds);
          if (!matches || !committed.calculation || !committed.factor) {
            throw new Error("committed ledger event does not match intake retry; manual reconciliation required");
          }
          activity = {
            ...activity,
            factorId: committed.factor.id,
            factorVersion: committed.factor.version,
            calculationStatus: "calculated",
          };
          await this.persistence.saveActivity(activity, claimToken);
          terminal = true;
          return { activity, handoff: toLedgerHandoff(activity), calculation: committed.calculation, ledgerEvent: committed };
        }
      }

      if (activity.classificationStatus !== "classified" || activity.dataAvailability === "not_available") {
        activity = { ...activity, calculationStatus: "not_ready" };
        await this.persistence.saveActivity(activity, claimToken);
        terminal = true;
        return { activity, handoff: toLedgerHandoff(activity) };
      }

      const factor = await this.factorResolver.resolve(activity);
      if (!factor) {
        activity = { ...activity, calculationStatus: "not_ready" };
        await this.persistence.saveActivity(activity, claimToken);
        terminal = true;
        return { activity, handoff: toLedgerHandoff(activity) };
      }

      if (priorFactorId && priorFactorVersion && (factor.id !== priorFactorId || factor.version !== priorFactorVersion)) {
        throw new Error("factor version changed during idempotent retry; use a new idempotency key after review");
      }

      if (!factorIsImportable(factor)) {
        activity = {
          ...activity,
          factorId: factor.id,
          factorVersion: factor.version,
          calculationStatus: "blocked",
        };
        await this.persistence.saveActivity(activity, claimToken);
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
        await this.persistence.saveActivity(activity, claimToken);
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
      await this.persistence.saveActivity(activity, claimToken);
      terminal = true;
      return { activity, handoff: toLedgerHandoff(activity), calculation, ledgerEvent };
    } catch (error) {
      if (!terminal) {
        try {
          await this.persistence.saveActivity({ ...activity, calculationStatus: "failed" }, claimToken);
        } catch {
          // Preserve the original operation error. Release below lets a retry
          // reclaim a processing record if persistence itself is unavailable.
        }
      }
      throw error;
    } finally {
      await this.persistence.releaseActivityClaim(context.tenantId, requested.idempotencyKey, claimToken);
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
