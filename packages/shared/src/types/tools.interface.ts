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
  /** Path to the tool's source code location (e.g. "src/app/features/tools/components/short-link/") */
  codePath?: string;
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
  /** Path to the tool's source code location */
  codePath?: string;
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

// Tool Configuration Types

/**
 * Display mode options for tool rendering.
 */
export type DisplayMode = 'standard' | 'full-width' | 'compact' | 'modal' | 'embedded';

/**
 * Layout settings for tool display customization.
 */
export interface LayoutSettings {
  /** Maximum width (e.g., "1200px", "100%") */
  maxWidth?: string;
  /** Padding (e.g., "2rem", "1rem 2rem") */
  padding?: string;
  /** Margin (e.g., "0 auto", "1rem") */
  margin?: string;
  /** Background color */
  backgroundColor?: string;
  /** Border radius */
  borderRadius?: string;
  /** Custom CSS classes array */
  customClasses?: string[];
  /** Additional custom settings */
  [key: string]: any;
}

/**
 * Tool configuration entity.
 */
export interface ToolConfig {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Tool ID reference */
  toolId: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Display mode for tool rendering */
  displayMode: DisplayMode;
  /** Layout customization settings */
  layoutSettings: LayoutSettings;
  /** Whether this is the active configuration */
  isActive: boolean;
  /** Configuration creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
}

/**
 * Request payload for creating a new tool configuration.
 */
export interface CreateToolConfigRequest {
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Display mode for tool rendering */
  displayMode: DisplayMode;
  /** Layout customization settings */
  layoutSettings?: LayoutSettings;
  /** Whether to set as active configuration */
  isActive?: boolean;
}

/**
 * Request payload for updating an existing tool configuration.
 */
export interface UpdateToolConfigRequest {
  /** Semantic version (optional) */
  version?: string;
  /** Display mode (optional) */
  displayMode?: DisplayMode;
  /** Layout customization settings (optional) */
  layoutSettings?: LayoutSettings;
  /** Whether to set as active configuration (optional) */
  isActive?: boolean;
}

/**
 * Response containing a single tool configuration.
 */
export interface GetToolConfigResponse {
  /** Success status of the retrieval operation */
  success: boolean;
  /** Response data containing the configuration */
  data: {
    /** The tool configuration */
    config: ToolConfig;
  };
}

/**
 * Response containing list of tool configurations.
 */
export interface GetToolConfigsResponse {
  /** Success status of the retrieval operation */
  success: boolean;
  /** Response data containing configurations list */
  data: {
    /** Array of tool configurations */
    configs: ToolConfig[];
    /** The currently active configuration */
    activeConfig: ToolConfig | null;
  };
}

/**
 * Response after creating or updating a configuration.
 */
export interface SaveToolConfigResponse {
  /** Success status of the operation */
  success: boolean;
  /** Response data containing the saved configuration */
  data: {
    /** The saved tool configuration */
    config: ToolConfig;
  };
}

/**
 * Response after activating a configuration.
 */
export interface ActivateToolConfigResponse {
  /** Success status of the operation */
  success: boolean;
  /** Response data containing the activated configuration */
  data: {
    /** The activated tool configuration */
    config: ToolConfig;
  };
}

/**
 * Response after deleting a configuration.
 */
export interface DeleteToolConfigResponse {
  /** Success status of the operation */
  success: boolean;
  /** Response message */
  message: string;
}

// Component Detection Types

/**
 * Result of checking if a component exists in the filesystem.
 */
export interface ComponentExistenceCheck {
  /** Whether the component directory exists */
  exists: boolean;
  /** Absolute path to the component directory */
  componentPath?: string;
  /** List of files found in the component directory */
  filesFound?: string[];
  /** Timestamp of last modification */
  lastModified?: Date;
  /** Size of component files in bytes */
  totalSize?: number;
}

/**
 * Options for component generation behavior.
 */
export interface ComponentGenerationOptions {
  /** Whether to reuse existing component code */
  reuseExisting: boolean;
  /** Whether to overwrite existing component */
  overwrite: boolean;
}

/**
 * Response containing component existence check results.
 */
export interface CheckComponentResponse {
  /** Success status of the check operation */
  success: boolean;
  /** Response data containing existence check */
  data: ComponentExistenceCheck;
  /** Operation timestamp */
  timestamp: string;
}

// SVG Drawing Tool Types

/**
 * Represents a 2D point in the drawing canvas.
 * Used for shape coordinates and mouse positions.
 */
export interface Point {
  /** X coordinate in pixels */
  x: number;
  /** Y coordinate in pixels */
  y: number;
}

/**
 * Shape type enumeration for different drawable shapes.
 */
export type ShapeType =
  | 'line'
  | 'polygon'
  | 'polyline'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'rounded-rectangle'
  | 'arc'
  | 'bezier'
  | 'star'
  | 'arrow'
  | 'cylinder'
  | 'cone';

/**
 * Line style types for stroke rendering.
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

/**
 * Style properties for shapes.
 */
export interface ShapeStyle {
  /** Stroke color in hex format (e.g., "#000000") */
  color: string;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Optional fill color in hex format */
  fillColor?: string;
  /** Line style (solid, dashed, dotted) */
  lineStyle?: LineStyle;
}

/**
 * Base interface for all drawable shapes.
 * Contains common properties shared across shape types.
 */
export interface Shape {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Type of shape */
  type: ShapeType;
  /** Stroke color in hex format (e.g., "#000000") */
  color: string;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Optional fill color in hex format */
  fillColor?: string;
  /** Line style (solid, dashed, dotted) */
  lineStyle?: LineStyle;
  /** Whether the shape is visible on the canvas (default: true) */
  visible?: boolean;
  /** Group ID if this shape belongs to a group (for locked movement) */
  groupId?: string;
  /** Shape creation timestamp */
  createdAt: Date;
}

/**
 * Represents a line shape with start and end points.
 */
export interface LineShape extends Shape {
  /** Shape type discriminator */
  type: 'line';
  /** Starting point of the line */
  start: Point;
  /** Ending point of the line */
  end: Point;
  /** Whether this line has cut marks at the end points (2 darts on each side) */
  hasCutMarks?: boolean;
}

/**
 * Represents a polygon shape with multiple vertices.
 */
export interface PolygonShape extends Shape {
  /** Shape type discriminator */
  type: 'polygon';
  /** Array of polygon vertices */
  vertices: Point[];
  /** Optional fill color in hex format */
  fillColor?: string;
}

/**
 * Represents a polyline shape with multiple vertices (open path, not closed).
 */
export interface PolylineShape extends Shape {
  /** Shape type discriminator */
  type: 'polyline';
  /** Array of polyline vertices */
  vertices: Point[];
}

/**
 * Represents a rectangle shape.
 */
export interface RectangleShape extends Shape {
  /** Shape type discriminator */
  type: 'rectangle';
  /** Top-left corner point */
  topLeft: Point;
  /** Rectangle width in pixels */
  width: number;
  /** Rectangle height in pixels */
  height: number;
}

/**
 * Represents a circle shape.
 */
export interface CircleShape extends Shape {
  /** Shape type discriminator */
  type: 'circle';
  /** Center point of the circle */
  center: Point;
  /** Radius in pixels */
  radius: number;
}

/**
 * Represents an ellipse shape.
 */
export interface EllipseShape extends Shape {
  /** Shape type discriminator */
  type: 'ellipse';
  /** Center point of the ellipse */
  center: Point;
  /** Horizontal radius in pixels */
  radiusX: number;
  /** Vertical radius in pixels */
  radiusY: number;
}

/**
 * Represents a triangle shape with exactly three vertices.
 */
export interface TriangleShape extends Shape {
  /** Shape type discriminator */
  type: 'triangle';
  /** Array of exactly three vertices */
  vertices: [Point, Point, Point];
}

/**
 * Represents a rectangle with rounded corners.
 */
export interface RoundedRectangleShape extends Shape {
  /** Shape type discriminator */
  type: 'rounded-rectangle';
  /** Top-left corner point */
  topLeft: Point;
  /** Rectangle width in pixels */
  width: number;
  /** Rectangle height in pixels */
  height: number;
  /** Corner radius in pixels */
  cornerRadius: number;
}

/**
 * Represents an arc (curved line segment).
 */
export interface ArcShape extends Shape {
  /** Shape type discriminator */
  type: 'arc';
  /** Starting point of the arc */
  start: Point;
  /** Ending point of the arc */
  end: Point;
  /** Arc radius in pixels */
  radius: number;
  /** Large arc flag for SVG path */
  largeArc: boolean;
  /** Sweep direction flag for SVG path */
  sweep: boolean;
}

/**
 * Represents a cubic Bezier curve.
 */
export interface BezierShape extends Shape {
  /** Shape type discriminator */
  type: 'bezier';
  /** Starting point */
  start: Point;
  /** Ending point */
  end: Point;
  /** First control point */
  controlPoint1: Point;
  /** Second control point */
  controlPoint2: Point;
}

/**
 * Represents a star shape with configurable points.
 */
export interface StarShape extends Shape {
  /** Shape type discriminator */
  type: 'star';
  /** Center point of the star */
  center: Point;
  /** Outer radius (tip of points) */
  outerRadius: number;
  /** Inner radius (between points) */
  innerRadius: number;
  /** Number of star points */
  points: number;
  /** Rotation angle in degrees */
  rotation: number;
}

/**
 * Represents an arrow shape.
 */
export interface ArrowShape extends Shape {
  /** Shape type discriminator */
  type: 'arrow';
  /** Starting point (tail) */
  start: Point;
  /** Ending point (head) */
  end: Point;
  /** Width of the arrowhead */
  headWidth: number;
  /** Length of the arrowhead */
  headLength: number;
}

/**
 * Represents a cylinder in 2D projection.
 */
export interface CylinderShape extends Shape {
  /** Shape type discriminator */
  type: 'cylinder';
  /** Top-left corner point */
  topLeft: Point;
  /** Cylinder width in pixels */
  width: number;
  /** Cylinder height in pixels */
  height: number;
  /** Height of the ellipse caps */
  ellipseHeight: number;
}

/**
 * Represents a cone in 2D projection.
 */
export interface ConeShape extends Shape {
  /** Shape type discriminator */
  type: 'cone';
  /** Apex (tip) point of the cone */
  apex: Point;
  /** Center point of the base */
  baseCenter: Point;
  /** Width of the base ellipse */
  baseWidth: number;
  /** Height of the base ellipse */
  baseHeight: number;
}

/**
 * Drawing state interface for canvas state management.
 */
export interface DrawingState {
  /** Array of all shapes in the drawing */
  shapes: Shape[];
  /** ID of the currently selected shape */
  selectedShapeId: string | null;
  /** Currently active drawing tool */
  currentTool:
    | 'line'
    | 'polygon'
    | 'polyline'
    | 'rectangle'
    | 'circle'
    | 'ellipse'
    | 'triangle'
    | 'rounded-rectangle'
    | 'arc'
    | 'bezier'
    | 'star'
    | 'arrow'
    | 'cylinder'
    | 'cone'
    | 'select'
    | 'move'
    | 'delete'
    | 'cut';
  /** Whether drawing is in progress */
  isDrawing: boolean;
  /** Active vertices for in-progress polygon */
  activeVertices: Point[];
  /** Whether snap guides are enabled */
  snapEnabled: boolean;
  /** Snap threshold in degrees */
  snapThreshold: number;
}

/**
 * Command interface for undo/redo pattern.
 */
export interface Command {
  /** Execute the command */
  execute(): void;
  /** Undo the command */
  undo(): void;
  /** Redo the command (typically same as execute) */
  redo(): void;
}

/**
 * SVG optimization level for export operations.
 */
export type OptimizationLevel = 'none' | 'basic' | 'aggressive';

/**
 * Export options for SVG generation.
 */
export interface ExportOptions {
  /** Output filename (including .svg extension) */
  filename: string;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Optimization level for SVG output */
  optimizationLevel: OptimizationLevel;
  /** Padding around shapes in pixels */
  padding?: number;
}

/**
 * Bounding box for shapes calculation.
 */
export interface BoundingBox {
  /** Minimum X coordinate */
  x: number;
  /** Minimum Y coordinate */
  y: number;
  /** Bounding box width */
  width: number;
  /** Bounding box height */
  height: number;
}

/**
 * Stored drawing data structure for localStorage persistence.
 */
export interface StoredDrawing {
  /** Schema version for future migrations */
  version: string;
  /** Array of all shapes */
  shapes: Shape[];
  /** Drawing settings */
  settings: DrawingSettings;
  /** Background image settings (optional) */
  backgroundImage?: BackgroundImageSettings;
  /** Canvas zoom level (0.1 - 5) */
  canvasZoom?: number;
  /** Canvas pan offset */
  canvasOffset?: { x: number; y: number };
  /** Timestamp when saved */
  timestamp: Date;
}

/**
 * Drawing settings for persistence.
 */
export interface DrawingSettings {
  /** Whether snap guides are enabled */
  snapEnabled: boolean;
  /** Snap threshold in degrees */
  snapThreshold: number;
  /** Whether grid is visible */
  gridVisible: boolean;
  /** Current style settings for new shapes */
  style: DrawingStyleSettings;
}

/**
 * Style settings for drawing shapes.
 */
export interface DrawingStyleSettings {
  /** Stroke color in hex format (e.g., "#000000") */
  strokeColor: string;
  /** Stroke width in pixels (1-10) */
  strokeWidth: number;
  /** Fill color in hex format (e.g., "#cccccc") */
  fillColor: string;
  /** Whether fill is enabled */
  fillEnabled: boolean;
}

/**
 * Background image settings for tracing.
 */
export interface BackgroundImageSettings {
  /** Base64 encoded image data or null */
  data: string | null;
  /** Image opacity (0-1) */
  opacity: number;
  /** Image scale factor (0.1-5) */
  scale: number;
  /** Image position offset */
  position: { x: number; y: number };
  /** Whether image is locked from manipulation */
  locked: boolean;
}