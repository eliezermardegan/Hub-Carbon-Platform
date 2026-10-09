import type { EmissionFactor } from "./index.js";

export const ademeV23_6UtilityUnder3_5tFactor: EmissionFactor = {
  id: "ademe.base-carbone.v23.6.fr.utility-under-3-5t.hydrogen-smr",
  version: "23.6",
  status: "verified",
  name: "Utilitaire <3,5t — hydrogène SMR gaz naturel centralisé",
  scope: 3,
  category: "scope3.category4.upstream_transport_and_distribution",
  geography: "FR",
  activityUnit: "km",
  factorUnit: "kgCO2e/km",
  value: 0.235,
  method: "Energy, full life cycle: hydrogen production by centralized natural-gas SMR, electricity generation and capital-goods amortization; ADEME record 28276",
  dataQuality: "low",
  provenance: {
    sourceName: "ADEME — Base Carbone",
    sourceUrl: "https://data.ademe.fr/datasets/base-carboner",
    sourceVersion: "23.6",
    sourcePublicationDate: "2025-04-24",
    sourceDocument: "Base_Carbone_V23.6.csv, record 28276; dataset updated 2025-07-03",
    license: "Licence Ouverte / Open Licence 2.0",
    licenseUrl: "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf",
    attributionRequired: true,
    redistributionAllowed: true,
    retrievedAt: "2026-10-08T00:00:00Z"
  }
};
