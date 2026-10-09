import type { EmissionFactor } from "./index.js";

export const ukGovernment2026ElectricityFactor: EmissionFactor = {
  id: "uk.gov.desnz.ghg-2026.uk-electricity-generated-including-imports",
  version: "2026",
  status: "blocked",
  name: "UK electricity generated (supplied to grid, plus imports)",
  scope: 2,
  category: "scope2.purchased_electricity.location_based",
  geography: "GB",
  applicableFrom: "2026-01-01",
  applicableTo: "2026-12-31",
  activityUnit: "kWh",
  factorUnit: "kgCO2e/kWh",
  value: 0.13096,
  gases: { CO2: 0.12943, CH4: 0.00067, N2O: 0.00086 },
  gwpBasis: "AR5 for CH4 and N2O (reported; requires source confirmation)",
  method: "Reported historical value; not approved for calculations until the exact July 2026 source artifact and row are verified",
  dataQuality: "unknown",
  provenance: {
    sourceName: "UK Department for Energy Security and Net Zero (DESNZ)",
    sourceUrl: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026",
    sourceVersion: "2026 (July 2026 updated flat file or full set to be verified)",
    sourcePublicationDate: "2026-06-11",
    sourceDocument: "Claimed source: methodology Table 9; exact factor worksheet/row and updated artifact not yet verified",
    license: "Open Government Licence v3.0 (exact artifact applicability pending verification)",
    legalBasis: "Blocked pending verification of exact source artifact, applicable licence, factor row, and value",
    licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    attributionRequired: true,
    redistributionAllowed: false,
    sourceContentSha256: "",
    retrievedAt: "2026-10-09T00:00:00Z",
    geography: "GB",
    originalUnit: "kWh",
    normalizedUnit: "kWh",
    transformation: "No unit conversion claimed; factor value and gas breakdown require verification against the exact source row",
    evidenceRef: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026 (exact attachment/row unverified)"
  }
};
