CREATE INDEX IF NOT EXISTS ix_carbon_evidence_document ON carbon_evidence(company_id, source_document_id);
CREATE INDEX IF NOT EXISTS ix_carbon_evidence_identifier ON carbon_evidence(company_id, original_identifier);
CREATE INDEX IF NOT EXISTS ix_carbon_activity_source_record ON carbon_activity_records(company_id, source_document_id, source_record_id);
CREATE INDEX IF NOT EXISTS ix_carbon_activity_supplier ON carbon_activity_records(company_id, supplier_id);
