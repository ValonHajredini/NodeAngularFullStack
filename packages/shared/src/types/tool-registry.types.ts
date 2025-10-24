/**
 * Tool Registry Type Definitions
 * Shared types for tool registration, discovery, and lifecycle management
 * Epic 30: Tool Registration and Export System
 */

/**
 * Tool lifecycle status
 * Represents the current state of a tool in the system
 */
export enum ToolStatus {
  /** Tool is in beta testing phase, may have limited features */
  BETA = 'beta',
  /** Tool is fully functional and available to users */
  ACTIVE = 'active',
  /** Tool is no longer maintained, may be removed in future */
  DEPRECATED = 'deprecated',
}

/**
 * Tool manifest structure stored in manifest_json JSONB column.
 * Contains complete tool configuration including routes, API endpoints,
 * database dependencies, and UI component references.
 *
 * This structure provides flexibility for tool-specific metadata without
 * requiring database schema changes.
 */
export interface ToolManifest {
  /** Frontend route configuration */
  routes: {
    /** Primary route path (e.g., "/tools/forms") */
    primary: string;
    /** Additional route paths */
    children?: string[];
  };

  /** API endpoint mappings */
  endpoints: {
    /** Base API path (e.g., "/api/forms") */
    base: string;
    /** List of available endpoints */
    paths: string[];
  };

  /** Database schema dependencies for tool export (Epic 33) */
  database?: {
    /** List of database tables this tool depends on */
    tables: string[];
    /** List of database functions/procedures */
    functions?: string[];
    /** List of database views */
    views?: string[];
  };

  /** UI component references */
  components?: {
    /** Main component identifier */
    main: string;
    /** Supporting component identifiers */
    supporting?: string[];
  };

  /** Tool-specific configuration */
  config?: Record<string, unknown>;
}

/**
 * Complete tool registry record matching the database schema.
 * Represents a registered tool in the system with all metadata.
 */
export interface ToolRegistryRecord {
  /** Primary key (UUID) */
  id: string;

  /** Unique tool identifier (e.g., "form-builder", "drawing-tool") */
  tool_id: string;

  /** Human-readable tool name */
  name: string;

  /** Tool description for discovery */
  description?: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Icon identifier or emoji for UI display */
  icon?: string;

  /** Frontend route path (e.g., "/tools/forms") */
  route: string;

  /** API base path (e.g., "/api/forms") */
  api_base: string;

  /** Array of required permissions (e.g., ["admin", "user"]) */
  permissions?: string[];

  /** Tool lifecycle status */
  status: ToolStatus;

  /** Whether tool has been exported as microservice (Epic 33) */
  is_exported: boolean;

  /** Timestamp when tool was exported to microservice */
  exported_at?: Date;

  /** Microservice URL after export */
  service_url?: string;

  /** Dedicated database name after export */
  database_name?: string;

  /** Complete tool manifest as structured JSONB */
  manifest_json?: ToolManifest;

  /** Tool registration timestamp */
  created_at: Date;

  /** Last modification timestamp (auto-updated by trigger) */
  updated_at: Date;

  /** User who registered the tool (NULL if user deleted) */
  created_by?: string;
}

/**
 * Input data for creating a new tool registration.
 * Omits auto-generated fields (id, timestamps, export fields).
 */
export interface CreateToolInput {
  /** Unique tool identifier (e.g., "form-builder") */
  tool_id: string;

  /** Human-readable tool name */
  name: string;

  /** Tool description for discovery */
  description?: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Icon identifier or emoji for UI display */
  icon?: string;

  /** Frontend route path (e.g., "/tools/forms") */
  route: string;

  /** API base path (e.g., "/api/forms") */
  api_base: string;

  /** Array of required permissions */
  permissions?: string[];

  /** Tool lifecycle status (defaults to 'beta' in database) */
  status?: ToolStatus;

  /** Complete tool manifest */
  manifest_json?: ToolManifest;

  /** User ID registering the tool */
  created_by?: string;
}

/**
 * Input data for updating an existing tool registration.
 * All fields are optional to support partial updates.
 */
export interface UpdateToolInput {
  /** Human-readable tool name */
  name?: string;

  /** Tool description for discovery */
  description?: string;

  /** Semantic version */
  version?: string;

  /** Icon identifier or emoji */
  icon?: string;

  /** Frontend route path */
  route?: string;

  /** API base path */
  api_base?: string;

  /** Array of required permissions */
  permissions?: string[];

  /** Tool lifecycle status */
  status?: ToolStatus;

  /** Whether tool has been exported as microservice */
  is_exported?: boolean;

  /** Timestamp when tool was exported */
  exported_at?: Date;

  /** Microservice URL after export */
  service_url?: string;

  /** Dedicated database name after export */
  database_name?: string;

  /** Complete tool manifest */
  manifest_json?: ToolManifest;
}

/**
 * Query filters for tool discovery and listing.
 * Used for filtering tool registry queries.
 */
export interface ToolRegistryFilters {
  /** Filter by tool status */
  status?: ToolStatus;

  /** Filter by export status */
  is_exported?: boolean;

  /** Filter by required permissions */
  permissions?: string[];

  /** Search by tool name or description (case-insensitive) */
  search?: string;
}
