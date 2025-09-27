/**
 * Tool category enumeration for consistent categorization.
 */
export type ToolCategory = 'productivity' | 'utility' | 'communication' | 'data';

/**
 * Represents a tool in the system registry.
 * Used across frontend and backend for type consistency.
 */
export interface Tool {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Unique key for the tool (kebab-case, e.g. "short-link") */
  key: string;
  /** Human-readable tool name */
  name: string;
  /** URL-friendly slug generated from tool name (e.g. "short-link-generator") */
  slug: string;
  /** Description of tool functionality */
  description: string;
  /** Icon class for UI display (e.g. "pi pi-link") */
  icon?: string;
  /** Tool category for organization */
  category?: ToolCategory;
  /** Whether tool is currently enabled/disabled */
  active: boolean;
  /** Tool registration timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Request payload for updating a tool's status.
 */
export interface UpdateToolStatusRequest {
  /** Whether tool should be active/enabled */
  active: boolean;
}

/**
 * Response containing updated tool data after status change.
 */
export interface UpdateToolStatusResponse {
  /** Success status of the update operation */
  success: boolean;
  /** Response data containing the updated tool */
  data: {
    /** The updated tool object */
    tool: Tool;
  };
}

/**
 * Response containing list of all tools.
 */
export interface GetToolsResponse {
  /** Success status of the retrieval operation */
  success: boolean;
  /** Response data containing tools list */
  data: {
    /** Array of all registered tools */
    tools: Tool[];
  };
}

/**
 * Tool creation payload for seeding/setup.
 */
export interface CreateToolRequest {
  /** Unique key for the tool (kebab-case) */
  key: string;
  /** Human-readable tool name */
  name: string;
  /** URL-friendly slug (optional, auto-generated from name if not provided) */
  slug?: string;
  /** Description of tool functionality */
  description: string;
  /** Icon class for UI display (e.g. "pi pi-link") */
  icon?: string;
  /** Tool category for organization */
  category?: ToolCategory;
  /** Initial active status (defaults to true) */
  active?: boolean;
}

/**
 * Client-side tool cache entry with TTL information.
 */
export interface ToolCacheEntry {
  /** The cached tool data */
  tool: Tool;
  /** Timestamp when this entry was cached */
  cachedAt: number;
  /** TTL in milliseconds for this cache entry */
  ttl: number;
}

/**
 * Tool status change event for real-time updates.
 */
export interface ToolStatusChangeEvent {
  /** The tool key that changed */
  toolKey: string;
  /** New active status */
  active: boolean;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Public interface for tool availability information.
 * Contains only public fields needed for feature gating.
 */
export interface PublicTool {
  /** Tool key identifier */
  key: string;
  /** Human-readable name */
  name: string;
  /** URL-friendly slug */
  slug: string;
  /** Brief description */
  description: string;
  /** Whether tool is enabled */
  active: boolean;
}

// Short Link Tool Types

/**
 * Represents a shortened URL in the system.
 * Used across frontend and backend for type consistency.
 */
export interface ShortLink {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Unique short code (6-8 alphanumeric characters) */
  code: string;
  /** Original URL to redirect to */
  originalUrl: string;
  /** The complete short URL (computed from base domain + code) */
  shortUrl?: string;
  /** Optional expiration timestamp */
  expiresAt?: Date | null;
  /** User who created the short link (nullable) */
  createdBy?: string | null;
  /** Number of times this link has been accessed */
  clickCount: number;
  /** Timestamp of last access */
  lastAccessedAt?: Date | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Request payload for creating a new short link.
 */
export interface CreateShortLinkRequest {
  /** Original URL to shorten (max 2048 characters) */
  originalUrl: string;
  /** Optional expiration date/time */
  expiresAt?: Date | null;
}

/**
 * Data structure for creating short links in the repository layer.
 */
export interface CreateShortLinkData {
  /** Unique short code */
  code: string;
  /** Original URL to shorten */
  originalUrl: string;
  /** Optional expiration date/time */
  expiresAt?: Date | null;
  /** User who created the short link */
  createdBy?: string | null;
}

/**
 * Response containing created short link data.
 */
export interface CreateShortLinkResponse {
  /** Success status of the creation operation */
  success: boolean;
  /** Response data containing the created short link */
  data: {
    /** The created short link object */
    shortLink: ShortLink;
    /** Full shortened URL with domain */
    shortUrl: string;
  };
}

/**
 * Response for resolving a short link by code.
 */
export interface ResolveShortLinkResponse {
  /** Success status of the resolution */
  success: boolean;
  /** Response data containing resolution info */
  data: {
    /** The resolved short link object */
    shortLink: ShortLink;
    /** The original URL to redirect to */
    originalUrl: string;
  };
}

/**
 * Error response for expired short links.
 */
export interface ExpiredShortLinkError {
  /** Error status (false) */
  success: false;
  /** Error message */
  message: string;
  /** Error code for client handling */
  code: 'LINK_EXPIRED';
  /** Additional error details */
  details: {
    /** The expired short code */
    code: string;
    /** When the link expired */
    expiredAt: Date;
  };
}

/**
 * Error response for invalid/not found short links.
 */
export interface NotFoundShortLinkError {
  /** Error status (false) */
  success: false;
  /** Error message */
  message: string;
  /** Error code for client handling */
  code: 'LINK_NOT_FOUND';
  /** Additional error details */
  details: {
    /** The invalid short code */
    code: string;
  };
}

// Component Generation Types

/**
 * Request payload for generating a tool component.
 */
export interface ComponentGenerationRequest {
  /** Tool key for component identification */
  toolKey: string;
  /** Display name for component */
  toolName: string;
  /** URL slug for routing */
  slug: string;
  /** Description for component documentation */
  description: string;
  /** Optional icon class for component */
  icon?: string;
  /** Optional category for organization */
  category?: ToolCategory;
}

/**
 * Result of component generation operation.
 */
export interface ComponentGenerationResult {
  /** Success status of generation */
  success: boolean;
  /** List of files created during generation */
  filesCreated: string[];
  /** Any errors encountered during generation */
  errors?: string[];
  /** Path to the main component file */
  componentPath?: string;
  /** Whether routing was successfully updated */
  routingUpdated?: boolean;
}

/**
 * Response containing component generation results.
 */
export interface ComponentGenerationResponse {
  /** Success status of the generation operation */
  success: boolean;
  /** Response data containing generation results */
  data: ComponentGenerationResult;
  /** Operation timestamp */
  timestamp: string;
}