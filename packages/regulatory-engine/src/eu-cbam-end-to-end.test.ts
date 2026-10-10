import assert from "node:assert/strict";
import test from "node:test";
import { CarbonLedgerDomain } from "../../carbon-ledger/src/domain.js";
import type { LedgerPersistence, PersistedLedgerEvent, AuditRecord } from "../../carbon-ledger/src/persistence.js";
import type { EmissionFactor } from "../../factor-registry/src/index.js";
import { DataIntakeService } from "../../data-intake/src/service.js";

import type { ActivityRecord } from "../../data-intake/src/index.js";
import { InMemoryDataIntakePersistence } from "../../data-intake/src/persistence.js";
import { buildCarbonReport, buildCbamReport } from "../../reporting-engine/src/index.js";
import { createRegulatoryEngine } from "./domain.js";

const tenantId = "company-eu-cbam-test";
const periodId = "2026";
const sourceUrl = "test://synthetic-eu-cbam-factor";

const directFactor: EmissionFactor = {
  id: "official-example-eaf-direct",
  version: "test-2026",
  status: "verified",
  name: "Synthetic EAF worked-example direct embedded emissions",
  scope: 1,
  category: "cbam_embedded_emissions_direct",
  geography: "EU-test",
  activityUnit: "t",
  factorUnit: "tCO2e/t",
  value: 1.440,
  dataQuality: "high",
  provenance: {
    sourceName: "Synthetic test fixture (not official source)",
    sourceUrl: "test://synthetic-eu-cbam-factor",
    sourceDocument: "Synthetic test fixture; does not reproduce or attest to official source content",
    sourceVersion: "synthetic-fixture-v1",
    license: "test-only",
    legalBasis: "Synthetic test fixture; no production use or redistribution claim",
    attributionRequired: false,
    redistributionAllowed: true,
    sourceContentSha256: "a11988e6d142d979c940f5fe08d800881243af3975b173c9f620555479c1939c",
    retrievedAt: "2026-10-08T00:00:00Z",
    geography: "TEST",
    originalUnit: "t",
    normalizedUnit: "tCO2e/t",
    transformation: "Synthetic test fixture; no official source transformation claimed",
    evidenceRef: "test://synthetic-eu-cbam-factor/v1"
  }
};

const indirectFactor: EmissionFactor = {
  ...directFactor,
  id: "official-example-eaf-indirect",
  name: "Synthetic EAF worked-example indirect embedded emissions",
  scope: 2,
  category: "cbam_embedded_emissions_indirect",
  value: 1.732
};

class MemoryIntake extends InMemoryDataIntakePersistence {}

class MemoryLedger implements LedgerPersistence {
  events: PersistedLedgerEvent[] = [];
  audits: AuditRecord[] = [];
  async appendEvent(event: PersistedLedgerEvent, audit: AuditRecord) { this.events.push(event); this.audits.push(audit); return event; }
  async listEvents() { return this.events; }
  async listAudit() { return this.audits; }
  async getHead() { return this.events.at(-1)?.eventHash ?? null; }
  async recordAudit(audit: AuditRecord) { this.audits.push(audit); }
}

test("EU CBAM EAF end-to-end cycle preserves direct + indirect units and totals", async () => {
  const intakePersistence = new MemoryIntake();
  const ledgerPersistence = new MemoryLedger();
  const ledger = new CarbonLedgerDomain(ledgerPersistence);
  const intake = new DataIntakeService(
    intakePersistence,
    {
      resolve: async (activity: ActivityRecord) =>
        activity.activityType.endsWith("_indirect") ? indirectFactor : directFactor
    },
    ledger
  );

  const base = {
    companyId: tenantId,
    reportingPeriodId: periodId,
    sourceDocumentId: "official-cbam-template-eaf-example",
    unit: "t",
    normalizedQuantity: 100,
    normalizedUnit: "t",
    method: "activity_based" as const,
    quantity: 100,
    dataAvailability: "provided" as const,
    dataQuality: { level: "A" as const, completeness: 1, rationale: "Official Commission EAF worked-example value." },
    confidence: { score: 1, level: "high" as const, source: "manual" as const, humanReviewed: true },
    evidenceIds: ["official-cbam-eaf-example"],
    classificationStatus: "classified" as const,
    calculationStatus: "not_ready" as const
  };

  const direct = await intake.ingestActivity({
    ...base,
    sourceRecordId: "steel-eaf-import-100t-direct",
    scope: 1,
    activityType: "cbam_eaf_embedded_emissions_direct"
  }, {
    tenantId, actorId: "test-runner", methodologyVersion: "carbon-account-test-v1", now: "2026-10-08T00:00:00Z"
  });

  const indirect = await intake.ingestActivity({
    ...base,
    sourceRecordId: "steel-eaf-import-100t-indirect",
    scope: 2,
    activityType: "cbam_eaf_embedded_emissions_indirect"
  }, {
    tenantId, actorId: "test-runner", methodologyVersion: "carbon-account-test-v1", now: "2026-10-08T00:00:00Z"
  });

  assert.equal(direct.calculation?.emissionsKgCo2e, 144000);
  assert.equal(indirect.calculation?.emissionsKgCo2e, 173200);
  assert.equal(direct.ledgerEvent?.calculation?.emissionsKgCo2e, 144000);
  assert.equal(indirect.ledgerEvent?.calculation?.emissionsKgCo2e, 173200);
  assert.equal(ledgerPersistence.events.length, 2);

  const carbonReport = buildCarbonReport({
    reportId: "carbon-report-eaf-2026",
    tenantId,
    reportingPeriodId: periodId,
    ledgerEvents: ledgerPersistence.events
  });
  assert.equal(carbonReport.totalEmissionsKgCo2e, 317200);

  const regulatoryEngine = createRegulatoryEngine({
    regulation: "EU-CBAM",
    jurisdiction: "EU",
    regulationVersion: "test-rule-v1",
    rules: [{
      id: "EU-CBAM-EAF-TEST",
      version: "v1",
      effectiveFrom: "2026-01-01",
      description: "Synthetic test-only applicability rule; not a legal implementation.",
      evaluate: () => ({
        applicability: "applicable",
        regulation: "EU-CBAM",
        regulationVersion: "test-rule-v1",
        ruleId: "EU-CBAM-EAF-TEST",
        ruleVersion: "v1",
        effectiveFrom: "2026-01-01",
        reason: "Test fixture represents the European Commission EAF worked example.",
        requiredInputs: ["product", "quantity", "embedded emissions"],
        requiredEvidence: ["official worked-example provenance"]
      })
    }]
  });

  const decision = regulatoryEngine.evaluate({
    jurisdiction: "EU",
    asOf: "2026-10-08",
    activityType: "imported_cbam_good",
    productCode: "IRON_OR_STEEL_TEST_FIXTURE",
    originCountry: "TEST",
    destinationCountry: "EU",
    quantity: 100,
    quantityUnit: "t"
  });

  assert.equal(decision.applicability, "applicable");

  const cbamReport = buildCbamReport({
    reportId: "eu-cbam-report-eaf-2026",
    decision,
    embeddedEmissionsTco2: carbonReport.totalEmissionsKgCo2e / 1000,
    carbonReport,
    ledgerEventIds: ledgerPersistence.events.map(event => event.id)
  });

  assert.equal(cbamReport.embeddedEmissionsTco2, 317.2);
  assert.equal(cbamReport.carbonReportId, "carbon-report-eaf-2026");
  assert.deepEqual(cbamReport.ledgerEventIds, [direct.ledgerEvent!.id, indirect.ledgerEvent!.id]);
  assert.deepEqual(cbamReport.requiredEvidence, ["official worked-example provenance"]);
});

test("EU CBAM cycle preserves separation when regulatory rule selection is unavailable", () => {
  const engine = createRegulatoryEngine({
    regulation: "EU-CBAM",
    jurisdiction: "EU",
    regulationVersion: "test-rule-v1",
    rules: []
  });
  const decision = engine.evaluate({
    jurisdiction: "EU",
    asOf: "2026-10-08",
    activityType: "imported_cbam_good"
  });
  assert.equal(decision.applicability, "insufficient_data");
  assert.match(decision.reason, /No active rule/);
});
