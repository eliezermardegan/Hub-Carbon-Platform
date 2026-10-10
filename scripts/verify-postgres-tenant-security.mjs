#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.PG_INTEGRATION_URL;
if (process.env.HUB_CARBON_POSTGRES_SECURITY_AUDIT_CI !== "true") {
  console.error("Refusing to run the mutating role bootstrap unless the dedicated disposable-CI guard is enabled.");
  process.exit(2);
}
if (!databaseUrl) {
  console.error("PG_INTEGRATION_URL is required.");
  process.exit(2);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("PG_INTEGRATION_URL is not a valid PostgreSQL URL.");
  process.exit(2);
}
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);
if (!allowedHosts.has(parsed.hostname) || !/(?:^|[_-])test(?:$|[_-])/i.test(databaseName)) {
  console.error("Refusing to mutate a non-local or non-test database; this runner is for disposable CI only.");
  process.exit(2);
}

function runPsql(args, purpose) {
  const result = spawnSync("psql", [
    databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", ...args
  ], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error) {
    console.error(`PostgreSQL tenant-security audit could not ${purpose}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`PostgreSQL tenant-security audit failed while it tried to ${purpose}.`);
    if (result.stderr) console.error(result.stderr.trim());
    if (result.stdout) console.error(result.stdout.trim());
    process.exit(result.status ?? 1);
  }
  if (result.stdout?.trim()) process.stdout.write(result.stdout);
}

const migrationPath = fileURLToPath(new URL("../infra/postgres/migrations/002_data_intake.sql", import.meta.url));
const auditPath = fileURLToPath(new URL("../infra/postgres/verify_tenant_security.sql", import.meta.url));

// This runner executes after npm test, so all main-suite ledger and Data Intake
// tables exist. Add the legacy carbon_* schema for complete policy inventory.
runPsql(["-f", migrationPath], "apply the disposable carbon_* schema migration");

const roleBootstrap = `
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carbon_ledger_app') THEN
    CREATE ROLE carbon_ledger_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carbon_ledger_runtime') THEN
    CREATE ROLE carbon_ledger_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$roles$;

ALTER ROLE carbon_ledger_app NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE carbon_ledger_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;


GRANT USAGE ON SCHEMA public TO carbon_ledger_app, carbon_ledger_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, carbon_ledger_app, carbon_ledger_runtime;
REVOKE carbon_ledger_app FROM carbon_ledger_runtime;
GRANT carbon_ledger_app TO carbon_ledger_runtime WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;
GRANT SELECT, INSERT ON carbon_ledger_events, carbon_ledger_audit TO carbon_ledger_app;
GRANT SELECT, INSERT, UPDATE ON carbon_ledger_tenant_heads TO carbon_ledger_app;
GRANT SELECT, INSERT, UPDATE ON data_intake_records, data_intake_activities TO carbon_ledger_app;
`;
runPsql(["-c", roleBootstrap], "configure least-privilege roles in the disposable CI database");
runPsql(["-f", auditPath], "validate effective role grants and row-level security");

console.log("\nPostgreSQL tenant-security audit passed against the disposable CI database.");
