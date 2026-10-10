import type { EmissionFactor } from "./index.js";

export const ademeV23_6UtilityUnder3_5tFactor: EmissionFactor = {
  id: "ademe.base-carbone.v23.6.fr.utility-under-3-5t.hydrogen-smr",
  version: "23.6",
  status: "blocked",
  name: "Utilitaire <3,5t — hydrogène SMR gaz naturel centralisé",
  scope: 3,
  category: "scope3.category4.upstream_transport_and_distribution",
  geography: "FR",
  activityUnit: "km",
  factorUnit: "kgCO2e/km",
  value: 0.235,
  method: "Reported historical value; not approved for calculations until the exact source record and artifact are verified",
  dataQuality: "low",
  provenance: {
    sourceName: "ADEME — Base Carbone",
    sourceUrl: "https://data.ademe.fr/datasets/base-carboner",
    sourceVersion: "23.6",
    sourcePublicationDate: "2025-04-24",
    sourceDocument: "Claimed source: Base_Carbone_V23.6.csv, record 28276; exact artifact not yet obtained and verified",
    license: "Licence Ouverte / Open Licence 2.0",
    legalBasis: "Blocked pending verification of the exact dataset artifact, license applicability, and source record",
    licenseUrl: "https://www.etalab.gouv.fr/wp-content/uploads/2017/04/ETALAB-Licence-Ouverte-v2.0.pdf",
    attributionRequired: true,
    redistributionAllowed: false,
    sourceContentSha256: "",
    retrievedAt: "2026-10-09T00:00:00Z",
    geography: "FR",
    originalUnit: "km",
    normalizedUnit: "km",
    transformation: "No unit conversion claimed; source record and numeric value still require verification",
    evidenceRef: "https://data.ademe.fr/datasets/base-carboner#record-28276 (record reference unverified)"
  }
};
