import { ToolRegistryRepository } from '../repositories/tool-registry.repository';
import {
  ToolRegistryRecord,
  CreateToolInput,
  UpdateToolInput,
  ToolStatus,
} from '@nodeangularfullstack/shared';

/**
 * Minimum search query length to prevent overly broad searches
 */
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Service for tool registry business logic.
 * Implements business rules for tool registration, discovery, and lifecycle management.
 * Acts as the application layer between controllers and data access layer.
 *
 * Key responsibilities:
 * - Validate tool registration data (ID format, route format, API base format)
 * - Enforce business rules (status transitions, export protection)
 * - Coordinate tool lifecycle operations (register, update, delete)
 * - Provide tool discovery and search capabilities
 *
 * @example
 * const repository = new ToolRegistryRepository();
 * const service = new ToolRegistryService(repository);
 *
 * const tool = await service.registerTool({
 *   tool_id: 'my-tool',
 *   name: 'My Tool',
 *   version: '1.0.0',
 *   route: '/tools/my-tool',
 *   api_base: '/api/tools/my-tool',
 *   manifest_json: { routes: { primary: '/tools/my-tool' }, endpoints: { base: '/api/tools/my-tool', paths: [] } },
 *   created_by: 'user-uuid'
 * });
 */
export class ToolRegistryService {
  /**
   * Creates an instance of ToolRegistryService.
   * @param repository - Tool registry repository for data access
   */
  constructor(private repository: ToolRegistryRepository) {}

  /**
   * Retrieves all registered tools ordered by creation date (newest first).
   *
   * @returns Promise containing array of all tool records
   * @throws {Error} If database query fails
   *
   * @example
   * const tools = await service.getAllTools();
   * console.log(`Found ${tools.length} tools`);
   */
  async getAllTools(): Promise<ToolRegistryRecord[]> {
    return this.repository.findAll();
  }

  /**
   * Retrieves a specific tool by its unique tool ID.
   *
   * @param toolId - The tool's unique identifier (e.g., "form-builder")
   * @returns Promise containing the tool record
   * @throws {Error} When tool is not found
   *
   * @example
   * const tool = await service.getTool('form-builder');
   * console.log(`Tool: ${tool.name} v${tool.version}`);
   */
  async getTool(toolId: string): Promise<ToolRegistryRecord> {
    const tool = await this.repository.findById(toolId);

    if (!tool) {
      throw new Error(`Tool '${toolId}' not found`);
    }

    return tool;
  }

  /**
   * Searches tools by name or description using case-insensitive pattern matching.
   * Query must be at least 2 characters long to prevent overly broad searches.
   *
   * @param query - Search term to match against name and description
   * @returns Promise containing array of matching tool records
   * @throws {Error} When query is too short (< 2 characters)
   * @throws {Error} If database query fails
   *
   * @example
   * const tools = await service.searchTools('form');
   * // Returns tools with 'form' in name or description
   */
  async searchTools(query: string): Promise<ToolRegistryRecord[]> {
    // Validate query length
    if (!query || query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
      throw new Error(
        `Search query must be at least ${MIN_SEARCH_QUERY_LENGTH} characters long`
      );
    }

    return this.repository.search(query.trim());
  }

  /**
   * Registers a new tool in the registry.
   * Validates tool ID format, route format, and API base format.
   * Ensures tool ID is unique before registration.
   *
   * Business rules enforced:
   * - Tool ID must be kebab-case: lowercase letters, numbers, hyphens only
   * - Tool ID must start with a letter
   * - Tool ID must be unique across the registry
   * - Route must start with /tools/
   * - API base must start with /api/tools/
   *
   * @param input - Tool registration data
   * @returns Promise containing the registered tool record
   * @throws {Error} When tool ID format is invalid (not kebab-case)
   * @throws {Error} When tool ID already exists in registry
   * @throws {Error} When route doesn't start with /tools/
   * @throws {Error} When apiBase doesn't start with /api/tools/
   *
   * @example
   * const tool = await service.registerTool({
   *   tool_id: 'my-tool',
   *   name: 'My Tool',
   *   version: '1.0.0',
   *   route: '/tools/my-tool',
   *   api_base: '/api/tools/my-tool',
   *   manifest_json: { routes: { primary: '/tools/my-tool' }, endpoints: { base: '/api/tools/my-tool', paths: [] } },
   *   created_by: 'user-uuid'
   * });
   */
  async registerTool(input: CreateToolInput): Promise<ToolRegistryRecord> {
    // Validate tool ID format (kebab-case)
    const toolIdPattern = /^[a-z][a-z0-9-]*$/;
    if (!toolIdPattern.test(input.tool_id)) {
      throw new Error(
        `Tool ID '${input.tool_id}' is invalid. Must be kebab-case (lowercase letters, numbers, hyphens only) and start with a letter.`
      );
    }

    // Check if tool ID already exists
    const existingTool = await this.repository.findById(input.tool_id);
    if (existingTool) {
      throw new Error(
        `Tool with ID '${input.tool_id}' already exists in the registry`
      );
    }

    // Validate route format
    if (!input.route.startsWith('/tools/')) {
      throw new Error(
        `Route '${input.route}' is invalid. Frontend route must start with /tools/`
      );
    }

    // Validate API base format
    if (!input.api_base.startsWith('/api/tools/')) {
      throw new Error(
        `API base '${input.api_base}' is invalid. Backend API base must start with /api/tools/`
      );
    }

    // Create the tool
    return this.repository.create(input);
  }

  /**
   * Updates an existing tool registration.
   * Validates status transitions to ensure valid lifecycle progression.
   * Only provided fields will be updated.
   *
   * Business rules enforced:
   * - Tool must exist
   * - Status transitions must follow valid state machine
   * - Invalid transitions are rejected with clear error messages
   *
   * @param toolId - The tool's unique identifier
   * @param input - Partial tool data to update
   * @returns Promise containing the updated tool record
   * @throws {Error} When tool is not found
   * @throws {Error} When status transition is invalid
   * @throws {Error} If database update fails
   *
   * @example
   * const tool = await service.updateTool('form-builder', {
   *   version: '2.0.0',
   *   status: ToolStatus.ACTIVE
   * });
   */
  async updateTool(
    toolId: string,
    input: UpdateToolInput
  ): Promise<ToolRegistryRecord> {
    // Get existing tool (throws if not found)
    const existingTool = await this.getTool(toolId);

    // Validate status transition if status is being updated
    if (input.status !== undefined && input.status !== existingTool.status) {
      this.validateStatusTransition(existingTool.status, input.status);
    }

    // Update the tool
    return this.repository.update(toolId, input);
  }

  /**
   * Deletes a tool registration from the registry.
   * Prevents deletion of exported tools to maintain referential integrity.
   *
   * Business rules enforced:
   * - Tool must exist
   * - Tool must not be exported (is_exported === false)
   * - Exported tools must be un-exported before deletion (Epic 33 feature)
   *
   * @param toolId - The tool's unique identifier
   * @returns Promise resolving when deletion is complete
   * @throws {Error} When tool is not found
   * @throws {Error} When tool is exported (cannot delete exported tools)
   * @throws {Error} If database delete fails
   *
   * @example
   * await service.deleteTool('old-tool');
   */
  async deleteTool(toolId: string): Promise<void> {
    // Get tool to verify existence (throws if not found)
    const tool = await this.getTool(toolId);

    // Check if tool is exported
    if (tool.is_exported) {
      throw new Error(
        `Cannot delete exported tool '${toolId}'. Un-export the tool first (Epic 33 feature).`
      );
    }

    // Safe to delete
    await this.repository.delete(toolId);
  }

  /**
   * Validates a tool status transition against allowed state machine rules.
   *
   * Valid transitions:
   * - beta → [active, deprecated]
   * - active → [deprecated]
   * - deprecated → [] (terminal state, no transitions allowed)
   *
   * @param currentStatus - Current tool status
   * @param newStatus - Desired new status
   * @throws {Error} When transition is not allowed with clear message
   * @private
   *
   * @example
   * this.validateStatusTransition(ToolStatus.BETA, ToolStatus.ACTIVE); // OK
   * this.validateStatusTransition(ToolStatus.ACTIVE, ToolStatus.BETA); // Throws error
   */
  private validateStatusTransition(
    currentStatus: ToolStatus,
    newStatus: ToolStatus
  ): void {
    // Define allowed transitions map
    const allowedTransitions: Record<ToolStatus, ToolStatus[]> = {
      [ToolStatus.BETA]: [ToolStatus.ACTIVE, ToolStatus.DEPRECATED],
      [ToolStatus.ACTIVE]: [ToolStatus.DEPRECATED],
      [ToolStatus.DEPRECATED]: [], // Terminal state
    };

    // Check if transition is allowed
    const allowed = allowedTransitions[currentStatus];
    const isValidTransition = allowed?.includes(newStatus) ?? false;

    if (!isValidTransition) {
      const allowedText =
        allowed !== undefined && allowed.length > 0
          ? allowed.join(', ')
          : 'none (terminal state)';

      throw new Error(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
          `Allowed transitions from '${currentStatus}': ${allowedText}`
      );
    }
  }
}
