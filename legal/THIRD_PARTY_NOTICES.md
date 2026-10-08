# Third-Party Notices

This file records third-party material and the legal boundary for redistribution.

## Project source code

Project-authored source code is licensed under the MIT License unless a more specific notice applies.

## European Commission CBAM worked example

The repository contains normalized numerical values derived from an official European Commission CBAM worked example for regression testing. The original PDF is not redistributed by this repository.

- Source: European Commission, CBAM transitional-period guidance, section 7.2.2.2, tables 7-11 to 7-14.
- Use: mathematical/regression test provenance only.
- Legal boundary: the presence of a reference or normalized factual value does not grant a general right to redistribute the source publication.
- Source artifact hash: pending exact downloaded artifact.

## ADEME Base Carbone

Historical repository commits indicate integration of ADEME Base Carbone V23.6 material. Redistribution and attribution terms must be verified against the exact artifact before release.

Each redistributed artifact must be registered in `legal/SOURCE_MATRIX.md` with source, version, legal basis, copyright/attribution, transformation, and SHA256 where reproducibility depends on the artifact.

## Standards and reference datasets

References to GHG Protocol, IPCC, US EPA, or other authorities do not by themselves grant redistribution rights. Any copied, transformed, or embedded third-party data must be reviewed and registered before release.

## npm dependencies

Runtime and development dependencies are pinned through `package-lock.json`. Dependency licenses remain attributable to their respective publishers; the project's MIT license does not relicense dependency code.

The CI pipeline performs dependency review and rejects high-severity dependency findings and selected strong copyleft licenses (`GPL-3.0-only`, `GPL-3.0-or-later`, `AGPL-3.0-only`, `AGPL-3.0-or-later`) unless this policy is explicitly revised.

The CI pipeline also generates a CycloneDX SBOM for the npm dependency graph on pull requests.

## Maintenance rule

When a new third-party artifact is introduced, update `legal/SOURCE_MATRIX.md` and this file in the same pull request. Do not invent licenses, source hashes, or redistribution permissions.
