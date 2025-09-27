import crypto from 'crypto';
import {
  ToolsRepository,
  ToolEntity,
  CreateToolData,
  UpdateToolData,
} from '../repositories/tools.repository';
import {
  Tool,
  GetToolsResponse,
  UpdateToolStatusRequest,
  UpdateToolStatusResponse,
  CreateToolRequest,
} from '@nodeangularfullstack/shared';

/**
 * Cache entry interface for tools data.
 */
interface ToolsCacheEntry {
  data: ToolEntity[];
  etag: string;
  timestamp: number;
}

/**
 * Tools service for managing tools registry.
 * Handles tools CRUD operations with caching and ETag support for efficiency.
 */
export class ToolsService {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private toolsRepository: ToolsRepository;
  private cache: ToolsCacheEntry | null = null;

  constructor() {
    this.toolsRepository = new ToolsRepository();
  }

  /**
   * Generates an ETag for tools data based on content and timestamp.
   * @param tools - Array of tools to generate ETag for
   * @returns ETag string for cache validation
   * @example
   * const etag = this.generateETag(tools);
   * // Returns: "W/\"abc123-1634567890\""
   */
  private generateETag(tools: ToolEntity[]): string {
    const content = JSON.stringify(
      tools.map((tool) => ({
        id: tool.id,
        key: tool.key,
        active: tool.active,
        updatedAt: tool.updatedAt,
      }))
    );

    const hash = crypto.createHash('md5').update(content).digest('hex');
    const timestamp = Date.now();

    return `W/"${hash}-${timestamp}"`;
  }

  /**
   * Checks if cached data is still valid.
   * @returns boolean indicating if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = Date.now();
    return now - this.cache.timestamp < ToolsService.CACHE_TTL;
  }

  /**
   * Invalidates the tools cache.
   * Called when tools data is modified.
   */
  private invalidateCache(): void {
    this.cache = null;
  }

  /**
   * Converts database entity to shared interface format.
   * @param entity - Database tool entity
   * @returns Tool interface for API responses
   */
  private entityToTool(entity: ToolEntity): Tool {
    return {
      id: entity.id,
      key: entity.key,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      active: entity.active,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Retrieves all tools with caching support.
   * @param skipCache - Optional flag to bypass cache
   * @returns Promise containing tools response with ETag
   * @throws {Error} When database query fails
   * @example
   * const response = await toolsService.getTools();
   * console.log(`Found ${response.data.tools.length} tools`);
   * console.log(`ETag: ${response.etag}`);
   */
  async getTools(
    skipCache = false
  ): Promise<GetToolsResponse & { etag: string }> {
    try {
      // Check cache first if not skipping
      if (!skipCache && this.isCacheValid()) {
        return {
          success: true,
          data: {
            tools: this.cache!.data.map((entity) => this.entityToTool(entity)),
          },
          etag: this.cache!.etag,
        };
      }

      // Fetch from database
      const toolEntities = await this.toolsRepository.findAll();
      const etag = this.generateETag(toolEntities);

      // Update cache
      this.cache = {
        data: toolEntities,
        etag,
        timestamp: Date.now(),
      };

      const tools = toolEntities.map((entity) => this.entityToTool(entity));

      return {
        success: true,
        data: { tools },
        etag,
      };
    } catch (error) {
      console.error('Error retrieving tools:', error);
      throw new Error('Failed to retrieve tools');
    }
  }

  /**
   * Retrieves only active tools.
   * @returns Promise containing active tools response
   * @throws {Error} When database query fails
   * @example
   * const response = await toolsService.getActiveTools();
   * console.log(`Found ${response.data.tools.length} active tools`);
   */
  async getActiveTools(): Promise<GetToolsResponse> {
    try {
      const toolEntities = await this.toolsRepository.findAllActive();
      const tools = toolEntities.map((entity) => this.entityToTool(entity));

      return {
        success: true,
        data: { tools },
      };
    } catch (error) {
      console.error('Error retrieving active tools:', error);
      throw new Error('Failed to retrieve active tools');
    }
  }

  /**
   * Finds a tool by its unique slug.
   * @param slug - Tool slug to search for (e.g., 'short-link-generator')
   * @returns Promise containing the tool or null if not found
   * @throws {Error} When database query fails
   * @example
   * const tool = await toolsService.getToolBySlug('short-link-generator');
   * if (tool) console.log(`Tool found: ${tool.name}`);
   */
  async getToolBySlug(slug: string): Promise<Tool | null> {
    try {
      const entity = await this.toolsRepository.findBySlug(slug);
      return entity ? this.entityToTool(entity) : null;
    } catch (error) {
      console.error(`Error finding tool by slug ${slug}:`, error);
      throw new Error('Failed to find tool');
    }
  }

  /**
   * Finds a tool by its unique key.
   * @param key - Tool key to search for
   * @returns Promise containing the tool or null if not found
   * @throws {Error} When database query fails
   * @example
   * const tool = await toolsService.getToolByKey('short-link');
   * if (tool) console.log(`Tool found: ${tool.name}`);
   */
  async getToolByKey(key: string): Promise<Tool | null> {
    try {
      const entity = await this.toolsRepository.findByKey(key);
      return entity ? this.entityToTool(entity) : null;
    } catch (error) {
      console.error(`Error finding tool by key ${key}:`, error);
      throw new Error('Failed to find tool');
    }
  }

  /**
   * Updates a tool's status (active/inactive).
   * @param key - Tool key to update
   * @param request - Update request containing new status
   * @returns Promise containing updated tool response
   * @throws {Error} When tool not found or database query fails
   * @example
   * const response = await toolsService.updateToolStatus('short-link', { active: false });
   * console.log(`Tool ${response.data.tool.name} is now disabled`);
   */
  async updateToolStatus(
    key: string,
    request: UpdateToolStatusRequest
  ): Promise<UpdateToolStatusResponse> {
    try {
      // Validate input
      if (typeof request.active !== 'boolean') {
        throw new Error('Active status must be a boolean value');
      }

      // Update in database
      const updatedEntity = await this.toolsRepository.updateStatus(
        key,
        request.active
      );

      // Invalidate cache since data changed
      this.invalidateCache();

      const tool = this.entityToTool(updatedEntity);

      return {
        success: true,
        data: { tool },
      };
    } catch (error) {
      console.error(`Error updating tool status for key ${key}:`, error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error(`Tool with key '${key}' not found`);
        }
        if (error.message.includes('boolean value')) {
          throw error; // Re-throw validation errors as-is
        }
      }
      throw new Error('Failed to update tool status');
    }
  }

  /**
   * Creates a new tool in the registry.
   * @param request - Tool creation request
   * @returns Promise containing created tool response
   * @throws {Error} When tool creation fails or key already exists
   * @example
   * const response = await toolsService.createTool({
   *   key: 'new-tool',
   *   name: 'New Tool',
   *   description: 'A new tool for the system',
   *   active: true
   * });
   */
  async createTool(
    request: CreateToolRequest
  ): Promise<UpdateToolStatusResponse> {
    try {
      // Validate input
      if (!request.key || !request.name || !request.description) {
        throw new Error('Key, name, and description are required');
      }

      // Validate key format (should be kebab-case)
      const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!kebabCaseRegex.test(request.key)) {
        throw new Error(
          'Tool key must be in kebab-case format (e.g., "short-link")'
        );
      }

      const createData: CreateToolData = {
        key: request.key,
        name: request.name,
        slug: request.slug,
        description: request.description,
        active: request.active ?? true,
      };

      // Create in database
      const createdEntity = await this.toolsRepository.create(createData);

      // Invalidate cache since data changed
      this.invalidateCache();

      const tool = this.entityToTool(createdEntity);

      return {
        success: true,
        data: { tool },
      };
    } catch (error) {
      console.error('Error creating tool:', error);
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          throw new Error(`Tool with key '${request.key}' already exists`);
        }
        if (
          error.message.includes('required') ||
          error.message.includes('kebab-case')
        ) {
          throw error; // Re-throw validation errors as-is
        }
      }
      throw new Error('Failed to create tool');
    }
  }

  /**
   * Updates tool information (name, description, status).
   * @param key - Tool key to update
   * @param updateData - Data to update
   * @returns Promise containing updated tool response
   * @throws {Error} When tool not found or database query fails
   * @example
   * const response = await toolsService.updateTool('short-link', {
   *   name: 'Updated Short Link Tool',
   *   description: 'Updated description'
   * });
   */
  async updateTool(
    key: string,
    updateData: UpdateToolData
  ): Promise<UpdateToolStatusResponse> {
    try {
      // Validate that at least one field is provided
      if (
        !updateData.name &&
        !updateData.description &&
        updateData.active === undefined
      ) {
        throw new Error('At least one field must be provided for update');
      }

      // Update in database
      const updatedEntity = await this.toolsRepository.update(key, updateData);

      // Invalidate cache since data changed
      this.invalidateCache();

      const tool = this.entityToTool(updatedEntity);

      return {
        success: true,
        data: { tool },
      };
    } catch (error) {
      console.error(`Error updating tool ${key}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error(`Tool with key '${key}' not found`);
      }
      throw new Error('Failed to update tool');
    }
  }

  /**
   * Deletes a tool from the registry.
   * @param key - Tool key to delete
   * @returns Promise that resolves when tool is deleted
   * @throws {Error} When tool not found or database query fails
   * @example
   * await toolsService.deleteTool('obsolete-tool');
   * console.log('Tool deleted successfully');
   */
  async deleteTool(key: string): Promise<void> {
    try {
      const deleted = await this.toolsRepository.delete(key);

      if (!deleted) {
        throw new Error(`Tool with key '${key}' not found`);
      }

      // Invalidate cache since data changed
      this.invalidateCache();
    } catch (error) {
      console.error(`Error deleting tool ${key}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to delete tool');
    }
  }

  /**
   * Gets the current ETag for tools data without fetching the tools.
   * Useful for cache validation.
   * @returns Current ETag or null if no cached data
   */
  getCurrentETag(): string | null {
    return this.cache?.etag || null;
  }

  /**
   * Forces cache refresh on next getTools() call.
   * Useful for testing or when you know data has changed externally.
   */
  refreshCache(): void {
    this.invalidateCache();
  }
}

// Export singleton instance
export const toolsService = new ToolsService();
