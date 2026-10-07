import type { EmissionFactor } from "./index.js";

export const ukGovernment2026ElectricityFactor: EmissionFactor = {
  id: "uk.gov.desnz.ghg-2026.uk-electricity-generated-including-imports",
  version: "2026",
  status: "verified",
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
  gwpBasis: "AR5 for CH4 and N2O",
  method: "Location-based electricity generation factor including imported electricity; excludes transmission/distribution losses",
  dataQuality: "high",
  provenance: {
    sourceName: "UK Department for Energy Security and Net Zero (DESNZ)",
    sourceUrl: "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026",
    sourceVersion: "2026",
    sourcePublicationDate: "2026-06-11",
    sourceDocument: "2026 Government greenhouse gas conversion factors for company reporting: Methodology paper, Table 9",
    license: "Open Government Licence v3.0",
    licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    attributionRequired: true,
    redistributionAllowed: true,
    retrievedAt: "2026-10-07T00:00:00Z"
  }
};
