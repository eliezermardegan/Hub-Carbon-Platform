# factor-registry

Versioned emission-factor registry with provenance.

The registry deliberately separates **calculation value** from **source provenance**. A factor is not considered safe to redistribute merely because a source is public.

Each factor should identify:

- source and source URL
- source version/publication
- source document or commit when applicable
- license and redistribution permission
- attribution requirements
- retrieval date
- source-content hash when available
- geography and applicability period
- activity and factor units
- methodology/GWP basis
- data quality

The GHG Protocol describes emission factors as relationships between activity quantities and greenhouse-gas emissions and recommends selecting appropriate, preferably more specific factors when available. citeturn0search0turn0search5

Factor datasets must be evaluated individually for redistribution rights. The registry can reference externally hosted factors without copying them when redistribution is not permitted.


## Import gate — 2026-10-10

factorIsImportable now fails closed unless status is exactly verified, redistribution is explicitly allowed, and all required provenance fields pass validateFactor. Draft/deprecated/blocked factors and malformed provenance are not importable. The two repository candidate records (ADEME Base Carbone V23.6 and UK DESNZ 2026) remain blocked; their source artifact SHA-256 fields intentionally remain empty until the exact artifacts and rows are obtained and hashed. A 64-character hash format check does not prove correspondence to source bytes, and no production promotion is authorized by CI alone.
