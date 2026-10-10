-- Read-only deployment audit for the Hub Carbon PostgreSQL tenant boundary.
-- Run as a trusted audit principal with visibility into role memberships:
--   psql "$PG_AUDIT_URL" -X -v ON_ERROR_STOP=1 -f infra/postgres/verify_tenant_security.sql
-- This file must not create roles, change grants, or mutate application data.

DO $verify_tenant_security$
DECLARE
  v_app record;
  v_runtime record;
  v_object record;
  v_privilege record;
  v_role_name text;
  v_owner text;
  v_rls boolean;
  v_force_rls boolean;
  v_policy_count integer;
  v_policy_qual text;
  v_policy_check text;
BEGIN
  SELECT * INTO v_app FROM pg_roles WHERE rolname = 'carbon_ledger_app';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'security audit failed: required role carbon_ledger_app is missing';
  END IF;

  SELECT * INTO v_runtime FROM pg_roles WHERE rolname = 'carbon_ledger_runtime';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'security audit failed: required login role carbon_ledger_runtime is missing';
  END IF;

  IF v_app.rolcanlogin OR v_app.rolsuper OR v_app.rolcreatedb OR
     v_app.rolcreaterole OR v_app.rolreplication OR v_app.rolbypassrls OR v_app.rolinherit THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_app must be NOLOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS';
  END IF;

  IF NOT v_runtime.rolcanlogin OR v_runtime.rolsuper OR v_runtime.rolcreatedb OR
     v_runtime.rolcreaterole OR v_runtime.rolreplication OR v_runtime.rolbypassrls OR NOT v_runtime.rolinherit THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime must be LOGIN, INHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS';
  END IF;

  IF NOT has_schema_privilege('carbon_ledger_app', 'public', 'USAGE') OR
     has_schema_privilege('carbon_ledger_app', 'public', 'CREATE') OR
     NOT has_schema_privilege('carbon_ledger_runtime', 'public', 'USAGE') OR
     has_schema_privilege('carbon_ledger_runtime', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'security audit failed: application roles need public schema USAGE and must not have CREATE';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = v_app.oid) THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_app must not inherit privileges from another role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE roleid = v_app.oid AND member = v_runtime.oid
      AND inherit_option AND set_option AND NOT admin_option
  ) THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime must inherit and be able to SET ROLE to carbon_ledger_app without admin option';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE member = v_runtime.oid AND roleid <> v_app.oid
  ) THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime has unexpected memberships beyond carbon_ledger_app';
  END IF;

  FOR v_object IN
    SELECT * FROM (VALUES
      ('carbon_ledger_events', 'carbon_ledger_events_tenant_isolation', 'tenant_id'),
      ('carbon_ledger_audit', 'carbon_ledger_audit_tenant_isolation', 'tenant_id'),
      ('carbon_ledger_tenant_heads', 'carbon_ledger_heads_tenant_isolation', 'tenant_id'),
      ('data_intake_records', 'data_intake_records_tenant_isolation', 'tenant_id'),
      ('data_intake_activities', 'data_intake_activities_tenant_isolation', 'tenant_id'),
      ('carbon_companies', 'carbon_companies_tenant', 'company_id'),
      ('carbon_reporting_periods', 'carbon_reporting_periods_tenant', 'company_id'),
      ('carbon_sites', 'carbon_sites_tenant', 'company_id'),
      ('carbon_data_sources', 'carbon_data_sources_tenant', 'company_id'),
      ('carbon_source_documents', 'carbon_source_documents_tenant', 'company_id'),
      ('carbon_evidence', 'carbon_evidence_tenant', 'company_id'),
      ('carbon_activity_records', 'carbon_activity_records_tenant', 'company_id')
    ) AS expected(table_name, policy_name, tenant_column)
  LOOP
    SELECT c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner)
      INTO v_rls, v_force_rls, v_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_object.table_name AND c.relkind IN ('r','p');

    IF NOT FOUND THEN
      RAISE EXCEPTION 'security audit failed: required table public.% is missing', v_object.table_name;
    END IF;
    IF NOT v_rls OR NOT v_force_rls THEN
      RAISE EXCEPTION 'security audit failed: public.% must have both ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY', v_object.table_name;
    END IF;
    IF v_owner IN ('carbon_ledger_app', 'carbon_ledger_runtime') THEN
      RAISE EXCEPTION 'security audit failed: application role must not own public.%', v_object.table_name;
    END IF;

    SELECT count(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_object.table_name;
    IF v_policy_count <> 1 THEN
      RAISE EXCEPTION 'security audit failed: public.% must have exactly one tenant policy (found %); extra permissive policies can broaden access', v_object.table_name, v_policy_count;
    END IF;

    SELECT qual, with_check INTO v_policy_qual, v_policy_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = v_object.table_name
      AND policyname = v_object.policy_name;
    IF NOT FOUND OR v_policy_qual IS NULL OR v_policy_check IS NULL OR
       position('current_setting' IN v_policy_qual) = 0 OR
       position('app.tenant_id' IN v_policy_qual) = 0 OR
       position(v_object.tenant_column IN v_policy_qual) = 0 OR
       position('current_setting' IN v_policy_check) = 0 OR
       position('app.tenant_id' IN v_policy_check) = 0 OR
       position(v_object.tenant_column IN v_policy_check) = 0 THEN
      RAISE EXCEPTION 'security audit failed: policy % on public.% must check the tenant column in both USING and WITH CHECK', v_object.policy_name, v_object.table_name;
    END IF;
  END LOOP;

  FOR v_privilege IN
    SELECT * FROM (VALUES
      ('carbon_ledger_events',       true, true, false, false, false, false, false),
      ('carbon_ledger_audit',        true, true, false, false, false, false, false),
      ('carbon_ledger_tenant_heads', true, true, true,  false, false, false, false),
      ('data_intake_records',        true, true, true,  false, false, false, false),
      ('data_intake_activities',     true, true, true,  false, false, false, false)
    ) AS expected(table_name, can_select, can_insert, can_update, can_delete, can_truncate, can_reference, can_trigger)
  LOOP
    FOREACH v_role_name IN ARRAY ARRAY['carbon_ledger_app','carbon_ledger_runtime']
    LOOP
      IF has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'SELECT') IS DISTINCT FROM v_privilege.can_select OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'INSERT') IS DISTINCT FROM v_privilege.can_insert OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'UPDATE') IS DISTINCT FROM v_privilege.can_update OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'DELETE') IS DISTINCT FROM v_privilege.can_delete OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'TRUNCATE') IS DISTINCT FROM v_privilege.can_truncate OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'REFERENCES') IS DISTINCT FROM v_privilege.can_reference OR
         has_table_privilege(v_role_name, 'public.' || v_privilege.table_name, 'TRIGGER') IS DISTINCT FROM v_privilege.can_trigger THEN
        RAISE EXCEPTION 'security audit failed: unexpected effective table privileges for role % on public.%', v_role_name, v_privilege.table_name;
      END IF;
    END LOOP;
  END LOOP;
END
$verify_tenant_security$;

-- Human-readable evidence emitted only after all assertions pass.
SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname IN ('carbon_ledger_app','carbon_ledger_runtime')
ORDER BY rolname;

SELECT c.relname AS table_name, pg_get_userbyid(c.relowner) AS table_owner,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls,
       p.policyname, p.qual AS using_expression, p.with_check AS check_expression
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
WHERE n.nspname = 'public'
  AND c.relname IN (
    'carbon_ledger_events','carbon_ledger_audit','carbon_ledger_tenant_heads',
    'data_intake_records','data_intake_activities','carbon_companies',
    'carbon_reporting_periods','carbon_sites','carbon_data_sources',
    'carbon_source_documents','carbon_evidence','carbon_activity_records'
  )
ORDER BY c.relname;

SELECT pg_get_userbyid(m.member) AS login_role,
       pg_get_userbyid(m.roleid) AS granted_role,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_auth_members m
WHERE m.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'carbon_ledger_app')
ORDER BY login_role;
