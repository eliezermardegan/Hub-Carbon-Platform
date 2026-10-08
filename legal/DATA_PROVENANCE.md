# Data Provenance Policy

## Purpose

This document defines the minimum provenance record for emission factors, datasets, regulatory examples, and other external data used by Hub Carbon Platform.

## Required provenance fields

Every externally sourced factor or dataset record should contain, directly or through an authoritative registry entry:

- `factor_id` or stable dataset identifier;
- publisher;
- dataset/source name;
- exact version, release, or document identifier;
- source URL;
- retrieval date;
- license or legal basis;
- copyright/attribution requirements;
- effective-from and effective-to dates where applicable;
- geography and methodology where applicable;
- original unit and normalized unit;
- transformation/normalization description;
- source artifact SHA-256 when reproducibility depends on a concrete artifact;
- provenance/evidence reference.

## Factor vintage

A new value from the same publisher is not an overwrite of the old value. Factor vintages must remain distinguishable so historical calculations can be reproduced.

The registry should therefore treat dataset version and effective period as first-class data, not comments.

## Source hashing

Use SHA-256 for the exact source artifact when the source is downloaded or otherwise materialized locally for verification. Do not invent a hash when the exact artifact is unavailable.

A missing hash must be represented explicitly as pending, not replaced with a hash of a different copy or an inferred value.

## Redistribution boundary

A source may be authoritative without being redistributable. The repository may reference a source without copying its contents.

Before committing external values, verify:

1. the exact source artifact;
2. the exact license or permission;
3. whether redistribution is allowed;
4. required attribution/notice language;
5. whether transformations create additional legal obligations.

## Regulatory source provenance

Regulatory inputs require the same discipline plus:

- jurisdiction;
- regulation identifier;
- rule/document version;
- effective date;
- retrieval date;
- source authority;
- content hash when available;
- implementation status (draft, guidance, adopted, effective, superseded).

A regulatory implementation must never rely on an undated or silently mutable source.
