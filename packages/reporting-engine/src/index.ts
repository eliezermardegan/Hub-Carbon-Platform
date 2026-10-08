export interface CarbonReport {
  reportId: string;
  tenantId: string;
  reportingPeriodId: string;
  totalEmissionsKgCo2e: number;
  ledgerEventIds: readonly string[];
}

export interface CbamReport {
  reportId: string;
  jurisdiction: string;
  regulation: string;
  regulationVersion: string;
  applicability: "applicable" | "not_applicable" | "insufficient_data";
  embeddedEmissionsTco2: number;
  carbonReportId: string;
  ledgerEventIds: readonly string[];
  requiredEvidence: readonly string[];
  decisionReason: string;
}

export function buildCarbonReport(input: {
  reportId: string;
  tenantId: string;
  reportingPeriodId: string;
  ledgerEvents: readonly { id: string; calculation?: { emissionsKgCo2e: number } }[];
}): CarbonReport {
  return {
    reportId: input.reportId,
    tenantId: input.tenantId,
    reportingPeriodId: input.reportingPeriodId,
    totalEmissionsKgCo2e: input.ledgerEvents.reduce((sum, event) => sum + (event.calculation?.emissionsKgCo2e ?? 0), 0),
    ledgerEventIds: input.ledgerEvents.map(event => event.id),
  };
}

export function buildCbamReport(input: {
  reportId: string;
  decision: {
    applicability: "applicable" | "not_applicable" | "insufficient_data";
    regulation: string;
    regulationVersion: string;
    requiredEvidence: readonly string[];
    reason: string;
  };
  embeddedEmissionsTco2: number;
  carbonReport: CarbonReport;
  ledgerEventIds: readonly string[];
}): CbamReport {
  return {
    reportId: input.reportId,
    jurisdiction: "EU",
    regulation: input.decision.regulation,
    regulationVersion: input.decision.regulationVersion,
    applicability: input.decision.applicability,
    embeddedEmissionsTco2: input.embeddedEmissionsTco2,
    carbonReportId: input.carbonReport.reportId,
    ledgerEventIds: input.ledgerEventIds,
    requiredEvidence: input.decision.requiredEvidence,
    decisionReason: input.decision.reason,
  };
}
