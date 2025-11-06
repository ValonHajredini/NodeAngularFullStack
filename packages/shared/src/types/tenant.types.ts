/**
 * Tenant types for multi-tenant functionality.
 * Used across frontend and backend for type consistency.
 */

/**
 * Tenant plan types with different feature sets and limits.
 */
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

/**
 * Tenant status types.
 */
export type TenantStatus = 'active' | 'suspended' | 'inactive' | 'pending';

/**
 * Tenant isolation levels for data security.
 */
export type TenantIsolationLevel = 'row' | 'schema' | 'database';

/**
 * Complete tenant information including settings and metadata.
 */
export interface Tenant {
  /** Unique tenant identifier (UUID) */
  id: string;
  /** Human-readable tenant name */
  name: string;
  /** URL-safe unique identifier (lowercase, hyphenated) */
  slug: string;
  /** Subscription plan determining features and limits */
  plan: TenantPlan;
  /** Current operational status */
  status: TenantStatus;
  /** Tenant-specific configuration and preferences */
  settings: TenantSettings;
  /** Whether tenant is active and can access the system */
  isActive: boolean;
  /** Tenant creation timestamp */
  createdAt: Date | string;
  /** Last modification timestamp */
  updatedAt: Date | string;
}

/**
 * Tenant settings stored as JSONB in database.
 */
export interface TenantSettings {
  /** Branding customization */
  branding?: {
    /** Primary brand color (hex code) */
    primaryColor?: string;
    /** Logo URL or base64 data URI */
    logo?: string;
    /** Favicon URL */
    favicon?: string;
  };
  /** Feature flags based on plan */
  features?: {
    /** User management capabilities */
    userManagement?: boolean;
    /** API access enabled */
    apiAccess?: boolean;
    /** Custom branding allowed */
    customBranding?: boolean;
    /** Advanced reporting features */
    advancedReports?: boolean;
    /** Single Sign-On integration */
    sso?: boolean;
    /** Custom domains */
    customDomain?: boolean;
    /** White-label mode */
    whiteLabel?: boolean;
  };
  /** Isolation and security configuration */
  isolation?: {
    /** Data isolation strategy */
    level?: TenantIsolationLevel;
    /** Row-Level Security enabled */
    rls?: boolean;
  };
  /** Resource usage limits */
  limits?: {
    /** Maximum number of users */
    maxUsers?: number;
    /** Maximum storage in bytes */
    maxStorage?: number;
    /** Maximum API calls per month */
    maxApiCalls?: number;
  };
  /** Security policies */
  security?: {
    /** Multi-factor authentication required */
    requireMFA?: boolean;
    /** Session timeout in minutes */
    sessionTimeout?: number;
    /** IP address whitelist */
    ipWhitelist?: string[];
    /** Password policy requirements */
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireLowercase?: boolean;
      requireNumbers?: boolean;
      requireSpecialChars?: boolean;
    };
  };
}

/**
 * Lightweight tenant context for request/response operations.
 * Used in JWT tokens and middleware for performance.
 */
export interface TenantContext {
  /** Tenant unique identifier */
  id: string;
  /** Tenant slug for URL routing */
  slug: string;
  /** Tenant display name */
  name: string;
  /** Current subscription plan */
  plan: TenantPlan;
  /** Array of enabled feature names */
  features: string[];
  /** Resource usage limits */
  limits: {
    /** Maximum users allowed */
    maxUsers: number;
    /** Maximum storage in bytes */
    maxStorage: number;
    /** Maximum API calls per month */
    maxApiCalls: number;
  };
  /** Current operational status */
  status: TenantStatus;
}

/**
 * Request to create a new tenant.
 */
export interface CreateTenantRequest {
  /** Tenant name (required) */
  name: string;
  /** Tenant slug (required, must be unique) */
  slug: string;
  /** Subscription plan (defaults to 'free') */
  plan?: TenantPlan;
  /** Initial tenant settings */
  settings?: Partial<TenantSettings>;
}

/**
 * Request to update existing tenant.
 */
export interface UpdateTenantRequest {
  /** Updated tenant name */
  name?: string;
  /** Updated slug (careful: affects URLs) */
  slug?: string;
  /** Updated plan */
  plan?: TenantPlan;
  /** Updated status */
  status?: TenantStatus;
  /** Updated settings (merges with existing) */
  settings?: Partial<TenantSettings>;
}

/**
 * Tenant usage metrics and statistics.
 */
export interface TenantMetrics {
  /** Tenant identifier */
  tenantId: string;
  /** Number of active users */
  userCount: number;
  /** Storage used in bytes */
  storageUsed: number;
  /** API calls this month */
  apiCallsThisMonth: number;
  /** Forms created count */
  formsCount: number;
  /** Form submissions count */
  submissionsCount: number;
  /** Last activity timestamp */
  lastActivity: Date | string;
}

/**
 * Tenant invitation for adding users to tenant.
 */
export interface TenantInvitation {
  /** Invitation unique identifier */
  id: string;
  /** Tenant being invited to */
  tenantId: string;
  /** Email address of invitee */
  email: string;
  /** Role to assign upon acceptance */
  role: 'admin' | 'user' | 'readonly';
  /** Invitation status */
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  /** Invitation token (used in accept URL) */
  token: string;
  /** User who sent invitation */
  invitedBy: string;
  /** Invitation expiration timestamp */
  expiresAt: Date | string;
  /** Creation timestamp */
  createdAt: Date | string;
}

/**
 * User's tenant membership information.
 */
export interface TenantMembership {
  /** Tenant information */
  tenant: TenantContext;
  /** User's role in this tenant */
  role: 'admin' | 'user' | 'readonly';
  /** When user joined this tenant */
  joinedAt: Date | string;
  /** Whether this is user's default/primary tenant */
  isDefault: boolean;
}

/**
 * Response containing list of tenants with pagination.
 */
export interface TenantListResponse {
  /** Array of tenants */
  data: Tenant[];
  /** Total count for pagination */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages available */
  totalPages: number;
}
