# Contributing

## Legal and provenance requirements

Before contributing third-party code, data or documentation:

1. Identify the exact upstream repository and commit.
2. Verify the applicable license for the exact material.
3. Record the source, commit, path, copyright holder and license in `legal/SOURCE_MATRIX.md`.
4. Preserve required notices and attribution.
5. Do not copy standards documents or datasets unless their license explicitly permits redistribution.
6. If the license is missing, ambiguous or incompatible, do not import the material.

## Engineering rules

- Keep carbon calculations deterministic and testable.
- Keep AI extraction separate from calculation and reporting.
- Preserve evidence and calculation lineage.
- Add tests for methodology changes.
- Never silently replace primary data with secondary estimates.

## Pull requests

Every PR that adds third-party material must include its provenance and licensing impact.
