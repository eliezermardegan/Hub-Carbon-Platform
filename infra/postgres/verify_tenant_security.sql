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
  v_normalized_qual text;
  v_normalized_check text;
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
     v_runtime.rolcreaterole OR v_runtime.rolreplication OR v_runtime.rolbypassrls OR v_runtime.rolinherit THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime must be LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS';
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
      AND NOT inherit_option AND set_option AND NOT admin_option
  ) THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime must not inherit app privileges directly, but must be able to SET ROLE without admin option';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE member = v_runtime.oid AND roleid <> v_app.oid
  ) THEN
    RAISE EXCEPTION 'security audit failed: carbon_ledger_runtime has unexpected memberships beyond carbon_ledger_app';
  END IF;

  FOR v_object IN
    SELECT * FROM (VALUES
      ('carbon_ledger_events', 'carbon_ledger_events_tenant_isolation', 'tenant_id', $exp$tenant_id=nullif(current_setting('app.tenant_id'::text,true),''::text)::uuid$exp$),
      ('carbon_ledger_audit', 'carbon_ledger_audit_tenant_isolation', 'tenant_id', $exp$tenant_id=nullif(current_setting('app.tenant_id'::text,true),''::text)::uuid$exp$),
      ('carbon_ledger_tenant_heads', 'carbon_ledger_heads_tenant_isolation', 'tenant_id', $exp$tenant_id=nullif(current_setting('app.tenant_id'::text,true),''::text)::uuid$exp$),
      ('data_intake_records', 'data_intake_records_tenant_isolation', 'tenant_id', $exp$tenant_id=nullif(current_setting('app.tenant_id'::text,true),''::text)$exp$),
      ('data_intake_activities', 'data_intake_activities_tenant_isolation', 'tenant_id', $exp$tenant_id=nullif(current_setting('app.tenant_id'::text,true),''::text)$exp$),
      ('carbon_companies', 'carbon_companies_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_reporting_periods', 'carbon_reporting_periods_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_sites', 'carbon_sites_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_data_sources', 'carbon_data_sources_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_source_documents', 'carbon_source_documents_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_evidence', 'carbon_evidence_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$),
      ('carbon_activity_records', 'carbon_activity_records_tenant', 'company_id', $exp$company_id::text=current_setting('app.tenant_id'::text,true)$exp$)
    ) AS expected(table_name, policy_name, tenant_column, expected_expression)
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
    v_normalized_qual := regexp_replace(lower(coalesce(v_policy_qual, '')), '[[:space:]()]', '', 'g');
    v_normalized_check := regexp_replace(lower(coalesce(v_policy_check, '')), '[[:space:]()]', '', 'g');
    IF NOT FOUND OR v_policy_qual IS NULL OR v_policy_check IS NULL OR
       v_normalized_qual IS DISTINCT FROM v_object.expected_expression OR
       v_normalized_check IS DISTINCT FROM v_object.expected_expression THEN
      RAISE EXCEPTION 'security audit failed: policy % on public.% does not exactly match the expected tenant equality in both USING and WITH CHECK (USING %, CHECK %)', v_object.policy_name, v_object.table_name, v_normalized_qual, v_normalized_check;
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
    FOREACH v_role_name IN ARRAY ARRAY['carbon_ledger_app']
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

  -- The login principal must have no direct/effective data-table privileges.
  -- Runtime code must SET ROLE carbon_ledger_app before accessing protected tables.
  FOR v_object IN
    SELECT table_name FROM (VALUES
      ('carbon_ledger_events'), ('carbon_ledger_audit'), ('carbon_ledger_tenant_heads'),
      ('data_intake_records'), ('data_intake_activities'),
      ('carbon_companies'), ('carbon_reporting_periods'), ('carbon_sites'),
      ('carbon_data_sources'), ('carbon_source_documents'), ('carbon_evidence'),
      ('carbon_activity_records')
    ) AS protected(table_name)
  LOOP
    IF has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'SELECT')
       OR has_any_column_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'SELECT')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'INSERT')
       OR has_any_column_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'INSERT')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'UPDATE')
       OR has_any_column_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'UPDATE')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'DELETE')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'TRUNCATE')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'REFERENCES')
       OR has_any_column_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'REFERENCES')
       OR has_table_privilege('carbon_ledger_runtime', 'public.' || v_object.table_name, 'TRIGGER') THEN
      RAISE EXCEPTION 'security audit failed: login role carbon_ledger_runtime has direct/effective privileges on public.% before SET ROLE', v_object.table_name;
    END IF;
  END LOOP;

  -- These legacy carbon_* tables have no executable adapter in this branch yet.
  -- Until a reviewed adapter and explicit grant contract exist, neither app nor
  -- runtime principal should be able to access them.
  FOR v_object IN
    SELECT table_name FROM (VALUES
      ('carbon_companies'), ('carbon_reporting_periods'), ('carbon_sites'),
      ('carbon_data_sources'), ('carbon_source_documents'), ('carbon_evidence'),
      ('carbon_activity_records')
    ) AS legacy(table_name)
  LOOP
    IF has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'SELECT')
       OR has_any_column_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'SELECT')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'INSERT')
       OR has_any_column_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'INSERT')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'UPDATE')
       OR has_any_column_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'UPDATE')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'DELETE')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'TRUNCATE')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'REFERENCES')
       OR has_any_column_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'REFERENCES')
       OR has_table_privilege('carbon_ledger_app', 'public.' || v_object.table_name, 'TRIGGER') THEN
      RAISE EXCEPTION 'security audit failed: carbon_ledger_app has privileges on unimplemented legacy table public.%', v_object.table_name;
    END IF;
  END LOOP;

  -- Unexpected DEFAULT TABLE PRIVILEGES can silently widen access after future migrations.
  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
    WHERE d.defaclobjtype = 'r'
      AND (d.defaclnamespace = 0 OR d.defaclnamespace = 'public'::regnamespace)
      AND acl.grantee IN (0, v_app.oid, v_runtime.oid)
      AND acl.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
  ) THEN
    RAISE EXCEPTION 'security audit failed: PUBLIC or application roles have unexpected default table privileges';
  END IF;
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

SELECT c.relname AS table_name,
       COALESCE(grantee.rolname, 'PUBLIC') AS grantee,
       acl.privilege_type, acl.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) acl
LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  AND c.relname IN (
    'carbon_ledger_events','carbon_ledger_audit','carbon_ledger_tenant_heads',
    'data_intake_records','data_intake_activities','carbon_companies',
    'carbon_reporting_periods','carbon_sites','carbon_data_sources',
    'carbon_source_documents','carbon_evidence','carbon_activity_records'
  )
  AND (acl.grantee = 0 OR acl.grantee IN (
    (SELECT oid FROM pg_roles WHERE rolname = 'carbon_ledger_app'),
    (SELECT oid FROM pg_roles WHERE rolname = 'carbon_ledger_runtime')
  ))
ORDER BY c.relname, grantee.rolname, acl.privilege_type;

SELECT pg_get_userbyid(m.member) AS login_role,
       pg_get_userbyid(m.roleid) AS granted_role,
       m.admin_option, m.inherit_option, m.set_option
FROM pg_auth_members m
WHERE m.roleid = (SELECT oid FROM pg_roles WHERE rolname = 'carbon_ledger_app')
ORDER BY login_role;
