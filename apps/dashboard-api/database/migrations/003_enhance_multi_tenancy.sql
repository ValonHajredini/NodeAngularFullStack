-- Migration: 003_enhance_multi_tenancy.sql
-- Description: Enhance tenant table with advanced configuration and isolation settings
-- Created: 2025-09-21

-- Add enhanced columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Update existing settings JSONB structure with enhanced configuration
UPDATE tenants
SET settings = COALESCE(settings, '{}') || jsonb_build_object(
    'branding', jsonb_build_object(
        'primaryColor', '#2563eb',
        'logo', null
    ),
    'features', jsonb_build_object(
        'userManagement', true,
        'apiAccess', true,
        'customBranding', false,
        'advancedReports', false,
        'sso', false
    ),
    'isolation', jsonb_build_object(
        'level', 'row',
        'rls', true
    ),
    'limits', jsonb_build_object(
        'maxStorage', 1073741824,
        'maxApiCalls', 10000
    ),
    'security', jsonb_build_object(
        'requireMFA', false,
        'sessionTimeout', 3600,
        'ipWhitelist', null
    )
)
WHERE settings = '{}' OR settings IS NULL;

-- Add constraints for plan and status using DO block for conditional creation
DO $$
BEGIN
    -- Add valid_plan constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_plan' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT valid_plan
        CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'));
    END IF;

    -- Add valid_status constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_status' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT valid_status
        CHECK (status IN ('active', 'suspended', 'inactive', 'pending'));
    END IF;

    -- Add valid_max_users constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_max_users' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT valid_max_users
        CHECK (max_users > 0 AND max_users <= 10000);
    END IF;

    -- Add valid_settings_structure constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_settings_structure' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT valid_settings_structure
        CHECK (
            jsonb_typeof(settings) = 'object' AND
            jsonb_typeof(settings->'branding') = 'object' AND
            jsonb_typeof(settings->'features') = 'object' AND
            jsonb_typeof(settings->'isolation') = 'object' AND
            jsonb_typeof(settings->'limits') = 'object' AND
            jsonb_typeof(settings->'security') = 'object'
        );
    END IF;

    -- Add valid_isolation_level constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'valid_isolation_level' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT valid_isolation_level
        CHECK (
            settings->'isolation'->>'level' IN ('row', 'schema', 'database')
        );
    END IF;
END $$;

-- Create additional indexes for enhanced columns
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_max_users ON tenants(max_users);

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_tenants_settings_gin ON tenants USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_tenants_features ON tenants USING GIN ((settings->'features'));
CREATE INDEX IF NOT EXISTS idx_tenants_isolation ON tenants USING GIN ((settings->'isolation'));

-- Create function to validate tenant settings on update
CREATE OR REPLACE FUNCTION validate_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate branding settings
    IF NEW.settings->'branding'->>'primaryColor' IS NOT NULL THEN
        IF NOT (NEW.settings->'branding'->>'primaryColor' ~ '^#[0-9a-fA-F]{6}$') THEN
            RAISE EXCEPTION 'Invalid primary color format. Must be hex color (e.g., #2563eb)';
        END IF;
    END IF;

    -- Validate feature toggles are boolean
    IF jsonb_typeof(NEW.settings->'features') = 'object' THEN
        IF EXISTS (
            SELECT 1 FROM jsonb_each(NEW.settings->'features')
            WHERE jsonb_typeof(value) != 'boolean'
        ) THEN
            RAISE EXCEPTION 'All feature flags must be boolean values';
        END IF;
    END IF;

    -- Validate isolation settings
    IF NEW.settings->'isolation'->>'rls' IS NOT NULL THEN
        IF jsonb_typeof(NEW.settings->'isolation'->'rls') != 'boolean' THEN
            RAISE EXCEPTION 'RLS setting must be boolean';
        END IF;
    END IF;

    -- Validate limits are positive numbers
    IF NEW.settings->'limits'->>'maxStorage' IS NOT NULL THEN
        IF (NEW.settings->'limits'->>'maxStorage')::BIGINT <= 0 THEN
            RAISE EXCEPTION 'maxStorage must be positive';
        END IF;
    END IF;

    IF NEW.settings->'limits'->>'maxApiCalls' IS NOT NULL THEN
        IF (NEW.settings->'limits'->>'maxApiCalls')::INTEGER <= 0 THEN
            RAISE EXCEPTION 'maxApiCalls must be positive';
        END IF;
    END IF;

    -- Validate security settings
    IF NEW.settings->'security'->>'sessionTimeout' IS NOT NULL THEN
        IF (NEW.settings->'security'->>'sessionTimeout')::INTEGER <= 0 THEN
            RAISE EXCEPTION 'sessionTimeout must be positive';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tenant settings validation
DROP TRIGGER IF EXISTS validate_tenant_settings_trigger ON tenants;
CREATE TRIGGER validate_tenant_settings_trigger
    BEFORE INSERT OR UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION validate_tenant_settings();

-- Create function to get tenant feature flags
CREATE OR REPLACE FUNCTION get_tenant_features(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    tenant_features JSONB;
BEGIN
    SELECT settings->'features' INTO tenant_features
    FROM tenants
    WHERE id = tenant_uuid AND is_active = true;

    RETURN COALESCE(tenant_features, '{}');
END;
$$ LANGUAGE plpgsql;

-- Create function to check if tenant has feature enabled
CREATE OR REPLACE FUNCTION tenant_has_feature(tenant_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    feature_enabled BOOLEAN;
BEGIN
    SELECT (settings->'features'->>feature_name)::BOOLEAN INTO feature_enabled
    FROM tenants
    WHERE id = tenant_uuid AND is_active = true;

    RETURN COALESCE(feature_enabled, false);
END;
$$ LANGUAGE plpgsql;

-- Create function to get tenant limits
CREATE OR REPLACE FUNCTION get_tenant_limits(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    tenant_limits JSONB;
BEGIN
    SELECT settings->'limits' INTO tenant_limits
    FROM tenants
    WHERE id = tenant_uuid AND is_active = true;

    RETURN COALESCE(tenant_limits, '{}');
END;
$$ LANGUAGE plpgsql;

-- Update default tenant with enhanced settings
UPDATE tenants
SET
    plan = 'enterprise',
    max_users = 1000,
    status = 'active',
    settings = settings || jsonb_build_object(
        'features', jsonb_build_object(
            'userManagement', true,
            'apiAccess', true,
            'customBranding', true,
            'advancedReports', true,
            'sso', true
        ),
        'limits', jsonb_build_object(
            'maxStorage', 107374182400,
            'maxApiCalls', 1000000
        )
    )
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Add comments for new columns and functions
COMMENT ON COLUMN tenants.plan IS 'Subscription plan level determining feature access and limits';
COMMENT ON COLUMN tenants.max_users IS 'Maximum number of users allowed for this tenant';
COMMENT ON COLUMN tenants.status IS 'Current tenant status (active, suspended, inactive, pending)';
COMMENT ON COLUMN tenants.settings IS 'JSONB configuration for branding, features, isolation, limits, and security';

COMMENT ON FUNCTION get_tenant_features(UUID) IS 'Returns feature flags for a tenant';
COMMENT ON FUNCTION tenant_has_feature(UUID, TEXT) IS 'Checks if tenant has specific feature enabled';
COMMENT ON FUNCTION get_tenant_limits(UUID) IS 'Returns usage limits for a tenant';
COMMENT ON FUNCTION validate_tenant_settings() IS 'Validates tenant settings JSONB structure and values';

-- Migration completed successfully
SELECT 'Enhanced multi-tenancy schema created successfully' AS migration_status;