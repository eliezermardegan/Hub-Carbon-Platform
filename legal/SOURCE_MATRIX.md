# Source & Third-Party Material Matrix

This file is the repository's control point for third-party datasets, standards-derived material, regulatory examples, and externally sourced code or content.

## Rules

- Record the exact upstream source before importing or transforming third-party material.
- Prefer a stable upstream URL, exact version/release, retrieval date, and content hash.
- Verify the license or legal basis for the exact artifact, not only the publisher's general terms.
- Preserve required copyright and attribution notices.
- Do not copy standards, legislation, or datasets into this repository unless redistribution is explicitly permitted.
- If licensing is missing, ambiguous, or incompatible, do not import the material; reference it instead.

## Current register

| Component / material | Upstream / publisher | Exact version / document | Path in repo | License / legal basis | Copyright / attribution | Source hash | Status / notes |
|---|---|---|---|---|---|---|---|
| Project source code | Eliezer Mardegan | Repository HEAD | Repository source | MIT | Copyright 2026 Eliezer Mardegan | N/A | Confirmed by `LICENSE` |
| EU CBAM worked-example test values | European Commission | Official CBAM worked example, section 7.2.2.2, tables 7-11 to 7-14 | `tests/regulatory/eu/cbam/golden/steel-eaf/official-example.json` | Normalized factual test values; original PDF is not redistributed | European Commission | Pending exact downloaded artifact hash | Hash intentionally unset until the exact source artifact is obtained and validated |
| ADEME Base Carbone factor candidate | ADEME | Claimed Base Carbone V23.6, record 28276 (exact artifact and row not independently verified) | `packages/factor-registry/src/ademe-v23-6-utility.ts` | Exact artifact licence applicability pending verification; redistribution disabled | ADEME attribution required if later confirmed applicable | Not obtained; SHA-256 intentionally empty | **Blocked**; not available to normal factor lookups or calculations until source artifact, record, value, licence and hash are verified |
| UK DESNZ 2026 electricity factor candidate | Department for Energy Security and Net Zero | Claimed 2026 factor; exact updated flat-file artifact and row not verified | `packages/factor-registry/src/uk-2026-electricity.ts` | Exact artifact licence applicability pending verification; redistribution disabled | DESNZ attribution required if later confirmed applicable | Not obtained; SHA-256 intentionally empty | **Blocked**; official page notes the flat file was updated on 31 July 2026; verify exact file, row, value and gas breakdown before enabling |\n| GHG Protocol / IPCC / US EPA factor references | GHG Protocol / IPCC / US EPA | Versioned publications/releases as applicable | `factors/global/README.md` and related references | Reference-only unless redistribution permission is confirmed | Publisher-specific | N/A for reference-only material | Do not treat a reference as permission to redistribute source data |
| npm dependencies | npm package publishers | Locked versions in `package-lock.json` | Runtime/development dependency graph | **Verify with automated license scan** | Package publishers | Lockfile integrity fields | Release gate: dependency/license audit required |

## Change control

Any new third-party material must add or update a row here in the same pull request that introduces the material.

For factors and datasets, also record:

- publisher and dataset name;
- exact dataset release/version;
- effective date or factor vintage;
- retrieval date;
- source URL;
- license/legal basis;
- copyright/attribution requirements;
- exact source artifact SHA-256 where reproducibility depends on the artifact;
- transformation/normalization performed by this project; and
- whether the original artifact is redistributed or only referenced.
