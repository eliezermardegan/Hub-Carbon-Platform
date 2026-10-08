# Third-Party Notices

This document records third-party material referenced, transformed, or included by Hub Carbon Platform.

## Project code

Unless a more specific notice applies, repository source code is licensed under the MIT License. See `LICENSE`.

## European Commission CBAM worked example

The repository contains normalized numerical values from an official European Commission CBAM worked example solely for deterministic regression testing. The original source document is not redistributed.

- Publisher: European Commission
- Document: *Guidance document on CBAM implementation for installation operators outside the EU*
- Section: 7.2.2.2, Example 2
- Source URL: https://taxation-customs.ec.europa.eu/system/files/2023-12/Guidance%20document%20on%20CBAM%20implementation%20for%20installation%20operators%20outside%20the%20EU.pdf
- Repository boundary: normalized factual test values and provenance metadata only
- Limitation: these values are not asserted to be the definitive current CBAM methodology

## ADEME Base Carbone

Repository history indicates integration of material associated with ADEME Base Carbone V23.6. Redistribution and attribution terms must be verified for each exact artifact before release. The applicable source, version, legal basis, and artifact hash must be recorded in `legal/SOURCE_MATRIX.md`.

## GHG Protocol, IPCC and US EPA references

The factor registry documentation references authoritative emissions-factor sources. References do not by themselves grant redistribution rights. Any copied or transformed dataset material must be checked against the exact source license and recorded in `legal/SOURCE_MATRIX.md`.

## npm dependencies

The dependency graph is pinned by `package-lock.json`. Dependency licenses and notices are third-party publisher responsibilities and must be verified automatically as part of release governance. The repository must not assume that the project MIT license changes the license of dependency code.

## Maintenance rule

When a new third-party artifact is imported, update this file and `legal/SOURCE_MATRIX.md` in the same pull request. Preserve any notice required by the upstream license.
