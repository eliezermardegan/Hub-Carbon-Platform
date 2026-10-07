# carbon-ledger

Audit-oriented carbon ledger connecting activities, versioned emission factors, deterministic calculations and evidence.

## Persistence boundary

The production adapter must store events in PostgreSQL inside a transaction, allocate a per-tenant sequence while locking the tenant head, verify the previous hash, append the event and audit record atomically, and never update or delete historical events.

Corrections use explicit restatement or reversal events. PostgreSQL Row Level Security (RLS) provides the database tenant-isolation boundary.

## Event model

- entry: original accounting event.
- restatement: new calculation correcting a prior event without changing history.
- reversal: compensating event referencing a prior event.

Every event keeps the factor snapshot, methodology version and evidence references needed to reconstruct the calculation.

## Production requirements

Before invoices, ERP or NF-e integrations, add a real PostgreSQL adapter with migrations, transaction-level concurrency control, pooling, secrets management, backups/PITR, monitoring, retention and scheduled integrity verification.
