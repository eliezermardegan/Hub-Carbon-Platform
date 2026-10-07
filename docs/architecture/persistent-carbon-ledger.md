# Persistent carbon ledger architecture

## Transaction

Every write executes in one PostgreSQL transaction:

1. authenticate actor and resolve trusted tenant context;
2. lock the tenant head row with SELECT FOR UPDATE;
3. read current head hash and next sequence;
4. validate factor identity and calculate emissions deterministically;
5. construct immutable event with exact factor/provenance snapshot;
6. calculate SHA-256 hash including previous hash;
7. insert event;
8. update tenant head;
9. insert audit record;
10. commit.

Concurrent writers for the same tenant serialize at the head.

## Corrections

Historical events are never edited. A restatement creates a new event referencing replacesEventId and a reason. A reversal creates a compensating event referencing the event being reversed.

## Tenant isolation

Every business table carries tenant_id. PostgreSQL RLS is the final database boundary. Tenant context is set only after authentication/authorization.

## Auditability

The event is the source of truth. The audit table records actor, action, timestamp, event and metadata around application/admin operations.

## Integrity

Per-tenant verification checks sequence continuity, previous-hash links, event hashes, factor snapshot identity and calculation consistency.
