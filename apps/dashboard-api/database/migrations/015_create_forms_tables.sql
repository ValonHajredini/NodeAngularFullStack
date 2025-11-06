-- Migration: 015_create_forms_tables.sql
-- Description: Creates forms, form_schemas, and form_submissions tables for Form Builder feature
-- Created: 2025-01-04

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create forms table for form metadata
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tenant_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_forms_user_id FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    -- Status constraint
    CONSTRAINT check_forms_status CHECK (status IN ('draft', 'published'))
);

-- Add tenant_id foreign key constraint conditionally (will be enforced by application logic)
-- Note: This constraint is added separately to support multi-tenancy enablement
-- When ENABLE_MULTI_TENANCY=true, tenant_id should reference tenants(id)
-- Application layer enforces this constraint based on environment configuration

-- Create indexes for forms table
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forms_status ON forms(status);

-- Create trigger for automatic updated_at updates on forms
DROP TRIGGER IF EXISTS trigger_forms_updated_at ON forms;
CREATE TRIGGER trigger_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for forms table
COMMENT ON TABLE forms IS 'Form metadata and configuration';
COMMENT ON COLUMN forms.id IS 'Primary key (UUID)';
COMMENT ON COLUMN forms.user_id IS 'Form creator user ID';
COMMENT ON COLUMN forms.tenant_id IS 'Optional tenant ID for multi-tenancy';
COMMENT ON COLUMN forms.title IS 'Form title';
COMMENT ON COLUMN forms.description IS 'Form description';
COMMENT ON COLUMN forms.status IS 'Form status: draft or published';
COMMENT ON COLUMN forms.created_at IS 'Form creation timestamp';
COMMENT ON COLUMN forms.updated_at IS 'Last modification timestamp (auto-updated)';

-- Create form_schemas table for versioned form schemas
CREATE TABLE IF NOT EXISTS form_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL,
    schema_version INTEGER NOT NULL DEFAULT 1,
    schema_json JSONB NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    render_token VARCHAR(512),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraints
    CONSTRAINT fk_form_schemas_form_id FOREIGN KEY (form_id)
        REFERENCES forms(id) ON DELETE CASCADE,

    -- Unique constraints
    CONSTRAINT uq_form_schemas_render_token UNIQUE (render_token)
);

-- Create indexes for form_schemas table
CREATE INDEX IF NOT EXISTS idx_form_schemas_form_id ON form_schemas(form_id);
CREATE INDEX IF NOT EXISTS idx_form_schemas_render_token ON form_schemas(render_token) WHERE render_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_schemas_expires_at ON form_schemas(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_schemas_is_published ON form_schemas(is_published);

-- Create trigger for automatic updated_at updates on form_schemas
DROP TRIGGER IF EXISTS trigger_form_schemas_updated_at ON form_schemas;
CREATE TRIGGER trigger_form_schemas_updated_at
    BEFORE UPDATE ON form_schemas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for form_schemas table
COMMENT ON TABLE form_schemas IS 'Versioned form schemas with JSONB storage';
COMMENT ON COLUMN form_schemas.id IS 'Primary key (UUID)';
COMMENT ON COLUMN form_schemas.form_id IS 'Parent form ID';
COMMENT ON COLUMN form_schemas.schema_version IS 'Schema version number';
COMMENT ON COLUMN form_schemas.schema_json IS 'Form schema as JSONB';
COMMENT ON COLUMN form_schemas.is_published IS 'Whether this schema version is published';
COMMENT ON COLUMN form_schemas.render_token IS 'Optional JWT token for public form access';
COMMENT ON COLUMN form_schemas.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN form_schemas.created_at IS 'Schema creation timestamp';
COMMENT ON COLUMN form_schemas.updated_at IS 'Last modification timestamp (auto-updated)';

-- Create form_submissions table for storing submitted form data
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_schema_id UUID NOT NULL,
    values_json JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitter_ip INET NOT NULL,
    user_id UUID,
    metadata JSONB,

    -- Foreign key constraints
    CONSTRAINT fk_form_submissions_form_schema_id FOREIGN KEY (form_schema_id)
        REFERENCES form_schemas(id) ON DELETE CASCADE,
    CONSTRAINT fk_form_submissions_user_id FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for form_submissions table
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_schema_id ON form_submissions(form_schema_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);

-- Add comments for form_submissions table
COMMENT ON TABLE form_submissions IS 'Form submission data with JSONB values';
COMMENT ON COLUMN form_submissions.id IS 'Primary key (UUID)';
COMMENT ON COLUMN form_submissions.form_schema_id IS 'Form schema this submission belongs to';
COMMENT ON COLUMN form_submissions.values_json IS 'Submitted field values as JSONB';
COMMENT ON COLUMN form_submissions.submitted_at IS 'Submission timestamp';
COMMENT ON COLUMN form_submissions.submitter_ip IS 'IP address of submitter';
COMMENT ON COLUMN form_submissions.user_id IS 'Optional user ID for authenticated submissions';
COMMENT ON COLUMN form_submissions.metadata IS 'Additional metadata as JSONB';

-- Migration completed successfully
SELECT 'Forms tables created successfully' AS migration_status;
