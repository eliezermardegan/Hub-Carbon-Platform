# Persistent carbon ledger architecture

## Transaction

Every write executes in one PostgreSQL transaction:

1. authenticate actor and resolve trusted tenant context on the server;
2. begin the transaction and set the tenant identity as a transaction-local PostgreSQL setting;
3. lock the tenant head row with `SELECT FOR UPDATE`;
4. read current head hash and next sequence;
5. validate factor identity and calculation provenance;
6. construct the immutable event with exact factor/provenance snapshot;
7. calculate the SHA-256 event hash using the documented canonical representation;
8. insert the event and its canonical idempotency-payload hash;
9. update the tenant head;
10. insert the associated audit record;
11. commit.

Any failure rolls back the event, head update, and audit record together. Concurrent writers for the same tenant serialize at the head.

## Trusted tenant isolation

The persistence adapter does not accept an untrusted request parameter as the tenant authority. It receives a server-side `TrustedTenantContextProvider`, validates that the operation identifiers match that context, and establishes the context on the same database connection and transaction used for the operation.

Tenant context is transaction-local so pooled connections cannot retain a previous tenant. Missing or invalid context must fail closed. PostgreSQL RLS remains the database boundary and is configured with `FORCE ROW LEVEL SECURITY`.

The deployment role must not own the ledger tables and must not have `BYPASSRLS`. This is environment-specific and requires an operational database permission check; the schema cannot safely assume a universal application role name.

## Append-only and corrections

Historical ledger events and audit records are protected by database triggers against update/delete. A hash chain is an integrity-detection mechanism, not proof that storage is tamper-proof.

Corrections use explicit restatement or reversal events. A restatement references `replacesEventId` and a reason. A reversal creates a compensating event referencing the event being reversed. Historical events are never silently edited.

## Idempotency

Idempotency is scoped by tenant. A repeated key returns the existing result only when its canonical semantic payload hash matches the original operation. Reuse with a different payload is rejected. The unique database index remains the final concurrency guard.

## PostgreSQL numeric handling

Ledger sequences are stored as PostgreSQL `bigint`. The adapter converts driver-returned sequence values through `BigInt` and only converts to JavaScript `number` after checking the safe-integer range. Sequence allocation is serialized by the tenant-head lock and backed by a per-tenant unique constraint.

## Auditability and integrity

The event is the accounting source of truth. The audit table records actor, action, timestamp, event and metadata around application/admin operations. The application rejects audit records whose tenant, actor, or event reference does not match the trusted operation.

Per-tenant verification checks sequence continuity, previous-hash links, event hashes, factor snapshot identity and calculation consistency.

## Test status

The real-PostgreSQL CI workflow passed on the current branch head, commit `2ab6b02`, in run [#158](https://github.com/eliezermardegan/Hub-Carbon-Platform/actions/runs/38050526544). The workflow's `npm ci`, `npm run typecheck`, and `npm test` steps all succeeded against its PostgreSQL service.

The prior follow-up failure was caused by `listAudit` using the `$1` placeholder without passing `[tenantId]` to `client.query`; PostgreSQL reported `there is no parameter $1`. The query was corrected, and the integration assertion for empty tenant audit reads remains in place. This green run validates the current integration suite on this commit; the broader P0 checklist in issue [#27](https://github.com/eliezermardegan/Hub-Carbon-Platform/issues/27) remains open until each required isolation, concurrency, rollback, role/RLS, and integrity scenario is evidenced. No production database was contacted.
