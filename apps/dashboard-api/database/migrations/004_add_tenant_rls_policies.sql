-- Migration: 004_add_tenant_rls_policies.sql
-- Description: Implement Row-Level Security (RLS) policies for tenant data isolation
-- Created: 2025-09-21

-- Create a role for the application database user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'application_role') THEN
        CREATE ROLE application_role;
    END IF;
END
$$;

-- Grant necessary permissions to application_role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;

-- Create function to get current tenant context from session
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Try to get tenant ID from session variable
    BEGIN
        tenant_id := current_setting('app.current_tenant_id')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            -- Return NULL if no tenant context is set (for system operations)
            RETURN NULL;
    END;

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set tenant context for RLS
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Set the tenant context for the current session
    PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    -- Clear the tenant context
    PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION user_belongs_to_tenant(user_uuid UUID, tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO user_tenant_id
    FROM users
    WHERE id = user_uuid AND is_active = true;

    RETURN user_tenant_id = tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row-Level Security on tenant-aware tables

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on password_resets table
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table

-- Policy for tenant isolation on users
DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO application_role
    USING (
        -- Allow access if no tenant context is set (system operations)
        get_current_tenant_id() IS NULL
        OR
        -- Allow access if user belongs to current tenant
        tenant_id = get_current_tenant_id()
        OR
        -- Allow access if user has no tenant (single-tenant mode)
        (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
    )
    WITH CHECK (
        -- Same conditions for inserts/updates
        get_current_tenant_id() IS NULL
        OR
        tenant_id = get_current_tenant_id()
        OR
        (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
    );

-- Policy for admin users to access all tenants (with explicit permission)
DROP POLICY IF EXISTS admin_access_users ON users;
CREATE POLICY admin_access_users ON users
    FOR ALL TO application_role
    USING (
        -- Check if current user is admin in their tenant context
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = current_setting('app.current_user_id', true)::UUID
            AND admin_user.role = 'admin'
            AND admin_user.is_active = true
            AND (
                admin_user.tenant_id = get_current_tenant_id()
                OR
                admin_user.tenant_id IS NULL  -- System admin
            )
        )
    );

-- Create RLS policies for sessions table

-- Policy for session tenant isolation
DROP POLICY IF EXISTS tenant_isolation_sessions ON sessions;
CREATE POLICY tenant_isolation_sessions ON sessions
    FOR ALL TO application_role
    USING (
        -- Allow access based on user's tenant
        user_id IN (
            SELECT id FROM users
            WHERE (
                get_current_tenant_id() IS NULL
                OR
                tenant_id = get_current_tenant_id()
                OR
                (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
            )
        )
    )
    WITH CHECK (
        -- Same conditions for inserts/updates
        user_id IN (
            SELECT id FROM users
            WHERE (
                get_current_tenant_id() IS NULL
                OR
                tenant_id = get_current_tenant_id()
                OR
                (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
            )
        )
    );

-- Create RLS policies for password_resets table

-- Policy for password reset tenant isolation
DROP POLICY IF EXISTS tenant_isolation_password_resets ON password_resets;
CREATE POLICY tenant_isolation_password_resets ON password_resets
    FOR ALL TO application_role
    USING (
        -- Allow access based on user's tenant
        user_id IN (
            SELECT id FROM users
            WHERE (
                get_current_tenant_id() IS NULL
                OR
                tenant_id = get_current_tenant_id()
                OR
                (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
            )
        )
    )
    WITH CHECK (
        -- Same conditions for inserts/updates
        user_id IN (
            SELECT id FROM users
            WHERE (
                get_current_tenant_id() IS NULL
                OR
                tenant_id = get_current_tenant_id()
                OR
                (tenant_id IS NULL AND get_current_tenant_id() IS NULL)
            )
        )
    );

-- Create function to validate tenant access for external API calls
CREATE OR REPLACE FUNCTION validate_tenant_api_access(
    tenant_uuid UUID,
    user_uuid UUID,
    required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_tenant_id UUID;
    user_role TEXT;
    tenant_active BOOLEAN;
BEGIN
    -- Check if tenant is active
    SELECT is_active INTO tenant_active
    FROM tenants
    WHERE id = tenant_uuid;

    IF NOT tenant_active THEN
        RETURN FALSE;
    END IF;

    -- Get user's tenant and role
    SELECT tenant_id, role INTO user_tenant_id, user_role
    FROM users
    WHERE id = user_uuid AND is_active = true;

    -- Check if user belongs to tenant
    IF user_tenant_id != tenant_uuid THEN
        RETURN FALSE;
    END IF;

    -- Check role if required
    IF required_role IS NOT NULL AND user_role != required_role THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log tenant access for auditing
CREATE OR REPLACE FUNCTION log_tenant_access(
    tenant_uuid UUID,
    user_uuid UUID,
    action_type TEXT,
    resource_type TEXT DEFAULT NULL,
    resource_id UUID DEFAULT NULL,
    ip_address INET DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert audit log entry
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        tenant_uuid,
        user_uuid,
        action_type,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        CURRENT_TIMESTAMP
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Log errors but don't fail the main operation
        RAISE NOTICE 'Failed to log tenant access: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check tenant feature access
CREATE OR REPLACE FUNCTION check_tenant_feature_access(
    tenant_uuid UUID,
    feature_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    feature_enabled BOOLEAN;
    tenant_active BOOLEAN;
BEGIN
    -- Check if tenant is active
    SELECT is_active INTO tenant_active
    FROM tenants
    WHERE id = tenant_uuid;

    IF NOT tenant_active THEN
        RETURN FALSE;
    END IF;

    -- Check if feature is enabled for tenant
    SELECT (settings->'features'->>feature_name)::BOOLEAN INTO feature_enabled
    FROM tenants
    WHERE id = tenant_uuid;

    RETURN COALESCE(feature_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to enforce tenant limits
CREATE OR REPLACE FUNCTION check_tenant_limit(
    tenant_uuid UUID,
    limit_type TEXT,
    current_usage INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_limit INTEGER;
    tenant_plan TEXT;
BEGIN
    -- Get tenant plan and specific limit
    SELECT
        plan,
        CASE
            WHEN limit_type = 'users' THEN max_users
            WHEN limit_type = 'storage' THEN (settings->'limits'->>'maxStorage')::INTEGER
            WHEN limit_type = 'api_calls' THEN (settings->'limits'->>'maxApiCalls')::INTEGER
            ELSE NULL
        END INTO tenant_plan, tenant_limit
    FROM tenants
    WHERE id = tenant_uuid AND is_active = true;

    -- If no limit found, allow operation
    IF tenant_limit IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if current usage is within limit
    RETURN current_usage < tenant_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_current_tenant_id() TO application_role;
GRANT EXECUTE ON FUNCTION set_tenant_context(UUID) TO application_role;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO application_role;
GRANT EXECUTE ON FUNCTION user_belongs_to_tenant(UUID, UUID) TO application_role;
GRANT EXECUTE ON FUNCTION validate_tenant_api_access(UUID, UUID, TEXT) TO application_role;
GRANT EXECUTE ON FUNCTION log_tenant_access(UUID, UUID, TEXT, TEXT, UUID, INET, TEXT) TO application_role;
GRANT EXECUTE ON FUNCTION check_tenant_feature_access(UUID, TEXT) TO application_role;
GRANT EXECUTE ON FUNCTION check_tenant_limit(UUID, TEXT, INTEGER) TO application_role;

-- Create a view for tenant-aware user queries (optional optimization)
CREATE OR REPLACE VIEW tenant_users AS
SELECT
    u.id,
    u.tenant_id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.created_at,
    u.updated_at,
    u.last_login,
    u.is_active,
    u.email_verified,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.plan as tenant_plan
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.is_active = true;

-- Grant permissions on the view
GRANT SELECT ON tenant_users TO application_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_current_tenant_id() IS 'Gets the current tenant ID from session context for RLS policies';
COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Sets the tenant context for the current database session';
COMMENT ON FUNCTION clear_tenant_context() IS 'Clears the tenant context from the current session';
COMMENT ON FUNCTION user_belongs_to_tenant(UUID, UUID) IS 'Checks if a user belongs to a specific tenant';
COMMENT ON FUNCTION validate_tenant_api_access(UUID, UUID, TEXT) IS 'Validates API access for a user within a tenant context';
COMMENT ON FUNCTION log_tenant_access(UUID, UUID, TEXT, TEXT, UUID, INET, TEXT) IS 'Logs tenant access for audit purposes';
COMMENT ON FUNCTION check_tenant_feature_access(UUID, TEXT) IS 'Checks if a tenant has access to a specific feature';
COMMENT ON FUNCTION check_tenant_limit(UUID, TEXT, INTEGER) IS 'Validates tenant usage against configured limits';

-- Migration completed successfully
SELECT 'Row-Level Security policies created successfully' AS migration_status;