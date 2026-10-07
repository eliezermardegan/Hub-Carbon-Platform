CREATE TABLE IF NOT EXISTS carbon_companies (
 company_id UUID PRIMARY KEY, legal_name TEXT NOT NULL, country CHAR(2) NOT NULL, reporting_currency CHAR(3) NOT NULL,
 reporting_period_start DATE NOT NULL, reporting_period_end DATE NOT NULL, organizational_boundary_method TEXT NOT NULL,
 base_timezone TEXT NOT NULL, cnpj TEXT, legal_entity_type TEXT, state TEXT, municipality TEXT, trade_name TEXT, cnae TEXT,
 industry TEXT, employee_count INTEGER, parent_company_id UUID REFERENCES carbon_companies(company_id)
);
CREATE TABLE IF NOT EXISTS carbon_reporting_periods (
 period_id TEXT NOT NULL, company_id UUID NOT NULL REFERENCES carbon_companies(company_id), start_date DATE NOT NULL,
 end_date DATE NOT NULL, reporting_year INTEGER NOT NULL, status TEXT NOT NULL, methodology_version TEXT NOT NULL,
 factor_registry_version TEXT NOT NULL, currency CHAR(3) NOT NULL, PRIMARY KEY(company_id,period_id)
);
CREATE TABLE IF NOT EXISTS carbon_sites (
 site_id UUID NOT NULL, company_id UUID NOT NULL REFERENCES carbon_companies(company_id), name TEXT NOT NULL,
 country CHAR(2) NOT NULL, state TEXT, municipality TEXT, address TEXT, active_from DATE NOT NULL, active_to DATE,
 facility_type TEXT, cost_center TEXT, erp_company_code TEXT, meter_ids JSONB NOT NULL DEFAULT '[]',
 PRIMARY KEY(company_id,site_id)
);
CREATE TABLE IF NOT EXISTS carbon_data_sources (
 source_id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES carbon_companies(company_id),
 source_type TEXT NOT NULL, system_name TEXT, external_id TEXT, ingested_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS carbon_source_documents (
 document_id UUID NOT NULL, company_id UUID NOT NULL REFERENCES carbon_companies(company_id), source_id UUID NOT NULL REFERENCES carbon_data_sources(source_id),
 source_type TEXT NOT NULL, document_type TEXT NOT NULL, original_filename TEXT, document_date DATE, reporting_period_id TEXT NOT NULL,
 content_hash TEXT NOT NULL, ingestion_timestamp TIMESTAMPTZ NOT NULL, processing_status TEXT NOT NULL, evidence_status TEXT NOT NULL,
 supplier_id TEXT, invoice_number TEXT, access_key TEXT, currency CHAR(3), total_value NUMERIC, site_id UUID, mime_type TEXT,
 extraction_model TEXT, extraction_confidence NUMERIC CHECK(extraction_confidence IS NULL OR extraction_confidence BETWEEN 0 AND 1),
 PRIMARY KEY(company_id,document_id),
 FOREIGN KEY(company_id,reporting_period_id) REFERENCES carbon_reporting_periods(company_id,period_id),
 FOREIGN KEY(company_id,site_id) REFERENCES carbon_sites(company_id,site_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_carbon_source_documents_hash ON carbon_source_documents(company_id,content_hash);
CREATE TABLE IF NOT EXISTS carbon_evidence (
 evidence_id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES carbon_companies(company_id), source_document_id UUID, source_record_id TEXT,
 source_system TEXT, original_identifier TEXT, content_hash TEXT NOT NULL, document_date DATE, locator JSONB, extracted_field TEXT,
 extracted_value JSONB, extraction_method TEXT, extraction_model_version TEXT, confidence NUMERIC CHECK(confidence IS NULL OR confidence BETWEEN 0 AND 1),
 reviewed_by TEXT, reviewed_at TIMESTAMPTZ, review_status TEXT,
 FOREIGN KEY(company_id,source_document_id) REFERENCES carbon_source_documents(company_id,document_id)
);
CREATE TABLE IF NOT EXISTS carbon_activity_records (
 activity_id UUID PRIMARY KEY, company_id UUID NOT NULL REFERENCES carbon_companies(company_id), reporting_period_id TEXT NOT NULL,
 site_id UUID, source_document_id UUID, source_record_id TEXT, supplier_id TEXT, transaction_date DATE,
 scope SMALLINT NOT NULL CHECK(scope IN(1,2,3)), scope3_category SMALLINT CHECK(scope3_category IS NULL OR scope3_category BETWEEN 1 AND 15),
 activity_type TEXT NOT NULL, quantity NUMERIC, unit TEXT, normalized_quantity NUMERIC, normalized_unit TEXT,
 financial_amount NUMERIC, currency CHAR(3), method TEXT NOT NULL, data_availability TEXT NOT NULL, data_quality JSONB NOT NULL,
 confidence JSONB NOT NULL, evidence_ids JSONB NOT NULL DEFAULT '[]', classification_status TEXT NOT NULL,
 calculation_status TEXT NOT NULL, factor_id TEXT, factor_version TEXT, idempotency_key TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(company_id,reporting_period_id) REFERENCES carbon_reporting_periods(company_id,period_id),
 FOREIGN KEY(company_id,site_id) REFERENCES carbon_sites(company_id,site_id),
 FOREIGN KEY(company_id,source_document_id) REFERENCES carbon_source_documents(company_id,document_id),
 UNIQUE(company_id,idempotency_key)
);
ALTER TABLE carbon_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_activity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_reporting_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_data_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_source_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE carbon_activity_records FORCE ROW LEVEL SECURITY;
CREATE POLICY carbon_companies_tenant ON carbon_companies USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_reporting_periods_tenant ON carbon_reporting_periods USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_sites_tenant ON carbon_sites USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_data_sources_tenant ON carbon_data_sources USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_source_documents_tenant ON carbon_source_documents USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_evidence_tenant ON carbon_evidence USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE POLICY carbon_activity_records_tenant ON carbon_activity_records USING(company_id::text=current_setting('app.tenant_id',true)) WITH CHECK(company_id::text=current_setting('app.tenant_id',true));
CREATE INDEX IF NOT EXISTS ix_carbon_activity_period ON carbon_activity_records(company_id,reporting_period_id);
CREATE INDEX IF NOT EXISTS ix_carbon_activity_scope ON carbon_activity_records(company_id,reporting_period_id,scope,scope3_category);
CREATE INDEX IF NOT EXISTS ix_carbon_documents_period ON carbon_source_documents(company_id,reporting_period_id);
