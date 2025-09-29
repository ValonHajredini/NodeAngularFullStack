import {
  ToolConfigsRepository,
  ToolConfigEntity,
  CreateToolConfigData,
  UpdateToolConfigData,
} from '../repositories/tool-configs.repository';
import { ToolsRepository } from '../repositories/tools.repository';
import {
  ToolConfig,
  CreateToolConfigRequest,
  UpdateToolConfigRequest,
  GetToolConfigResponse,
  GetToolConfigsResponse,
  SaveToolConfigResponse,
  ActivateToolConfigResponse,
  DeleteToolConfigResponse,
} from '@nodeangularfullstack/shared';

/**
 * Tool configuration service for managing tool display configurations.
 * Handles config CRUD operations with validation and business logic.
 */
export class ToolConfigService {
  private toolConfigsRepository: ToolConfigsRepository;
  private toolsRepository: ToolsRepository;

  constructor() {
    this.toolConfigsRepository = new ToolConfigsRepository();
    this.toolsRepository = new ToolsRepository();
  }

  /**
   * Converts database entity to shared interface format.
   * @param entity - Database tool config entity
   * @returns ToolConfig interface for API responses
   */
  private entityToConfig(entity: ToolConfigEntity): ToolConfig {
    return {
      id: entity.id,
      toolId: entity.toolId,
      version: entity.version,
      displayMode: entity.displayMode,
      layoutSettings: entity.layoutSettings,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Validates semantic version format.
   * @param version - Version string to validate (e.g., "1.0.0")
   * @returns boolean indicating if version is valid
   */
  private isValidVersion(version: string): boolean {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }

  /**
   * Retrieves all configurations for a specific tool.
   * @param toolKey - Tool key to fetch configs for
   * @returns Promise containing configs response
   * @throws {Error} When tool not found or database query fails
   * @example
   * const response = await toolConfigService.getToolConfigs('short-link');
   * console.log(`Found ${response.data.configs.length} configurations`);
   */
  async getToolConfigs(toolKey: string): Promise<GetToolConfigsResponse> {
    try {
      // First verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Fetch all configs for this tool
      const configEntities = await this.toolConfigsRepository.findByToolId(
        tool.id
      );
      const configs = configEntities.map((entity) =>
        this.entityToConfig(entity)
      );

      // Find the active config
      const activeConfig = configs.find((c) => c.isActive) || null;

      return {
        success: true,
        data: {
          configs,
          activeConfig,
        },
      };
    } catch (error) {
      console.error(`Error retrieving configs for tool ${toolKey}:`, error);
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to retrieve tool configurations');
    }
  }

  /**
   * Retrieves the active configuration for a specific tool.
   * @param toolKey - Tool key to fetch active config for
   * @returns Promise containing config response or null if no active config
   * @throws {Error} When tool not found or database query fails
   * @example
   * const response = await toolConfigService.getActiveConfig('short-link');
   * if (response.data.config) console.log(`Active version: ${response.data.config.version}`);
   */
  async getActiveConfig(
    toolKey: string
  ): Promise<GetToolConfigResponse | null> {
    try {
      // First verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Fetch active config
      const configEntity = await this.toolConfigsRepository.findActiveByToolId(
        tool.id
      );

      if (!configEntity) {
        return null;
      }

      return {
        success: true,
        data: {
          config: this.entityToConfig(configEntity),
        },
      };
    } catch (error) {
      console.error(
        `Error retrieving active config for tool ${toolKey}:`,
        error
      );
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to retrieve active tool configuration');
    }
  }

  /**
   * Creates a new tool configuration.
   * @param toolKey - Tool key to create config for
   * @param request - Configuration creation request
   * @returns Promise containing created config response
   * @throws {Error} When validation fails or database query fails
   * @example
   * const response = await toolConfigService.createConfig('short-link', {
   *   version: '1.1.0',
   *   displayMode: 'full-width',
   *   isActive: true
   * });
   */
  async createConfig(
    toolKey: string,
    request: CreateToolConfigRequest
  ): Promise<SaveToolConfigResponse> {
    try {
      // Validate version format
      if (!this.isValidVersion(request.version)) {
        throw new Error(
          'Invalid version format. Use semantic versioning (e.g., "1.0.0")'
        );
      }

      // Verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Check if version already exists
      const versionExists = await this.toolConfigsRepository.versionExists(
        tool.id,
        request.version
      );
      if (versionExists) {
        throw new Error(
          `Configuration version '${request.version}' already exists for this tool`
        );
      }

      // Create the config
      const createData: CreateToolConfigData = {
        toolId: tool.id,
        version: request.version,
        displayMode: request.displayMode,
        layoutSettings: request.layoutSettings || {},
        isActive: request.isActive ?? false,
      };

      const createdEntity = await this.toolConfigsRepository.create(createData);
      const config = this.entityToConfig(createdEntity);

      return {
        success: true,
        data: { config },
      };
    } catch (error) {
      console.error(`Error creating config for tool ${toolKey}:`, error);
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('Invalid version') ||
          error.message.includes('already exists')
        ) {
          throw error;
        }
      }
      throw new Error('Failed to create tool configuration');
    }
  }

  /**
   * Updates an existing tool configuration.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to update
   * @param request - Configuration update request
   * @returns Promise containing updated config response
   * @throws {Error} When config not found or validation fails
   * @example
   * const response = await toolConfigService.updateConfig('short-link', 'config-uuid', {
   *   displayMode: 'full-width'
   * });
   */
  async updateConfig(
    toolKey: string,
    configId: string,
    request: UpdateToolConfigRequest
  ): Promise<SaveToolConfigResponse> {
    try {
      // Verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Verify the config exists and belongs to this tool
      const existingConfig =
        await this.toolConfigsRepository.findById(configId);
      if (!existingConfig) {
        throw new Error(`Configuration with id '${configId}' not found`);
      }
      if (existingConfig.toolId !== tool.id) {
        throw new Error('Configuration does not belong to this tool');
      }

      // Validate version if provided
      if (request.version && !this.isValidVersion(request.version)) {
        throw new Error(
          'Invalid version format. Use semantic versioning (e.g., "1.0.0")'
        );
      }

      // Check if new version already exists (if version is being changed)
      if (request.version && request.version !== existingConfig.version) {
        const versionExists = await this.toolConfigsRepository.versionExists(
          tool.id,
          request.version
        );
        if (versionExists) {
          throw new Error(
            `Configuration version '${request.version}' already exists for this tool`
          );
        }
      }

      // Update the config
      const updateData: UpdateToolConfigData = {
        version: request.version,
        displayMode: request.displayMode,
        layoutSettings: request.layoutSettings,
        isActive: request.isActive,
      };

      const updatedEntity = await this.toolConfigsRepository.update(
        configId,
        updateData
      );
      const config = this.entityToConfig(updatedEntity);

      return {
        success: true,
        data: { config },
      };
    } catch (error) {
      console.error(
        `Error updating config ${configId} for tool ${toolKey}:`,
        error
      );
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('Invalid version') ||
          error.message.includes('already exists') ||
          error.message.includes('does not belong')
        ) {
          throw error;
        }
      }
      throw new Error('Failed to update tool configuration');
    }
  }

  /**
   * Sets a configuration as active.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to activate
   * @returns Promise containing activated config response
   * @throws {Error} When config not found
   * @example
   * const response = await toolConfigService.activateConfig('short-link', 'config-uuid');
   * console.log(`Activated version: ${response.data.config.version}`);
   */
  async activateConfig(
    toolKey: string,
    configId: string
  ): Promise<ActivateToolConfigResponse> {
    try {
      // Verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Verify the config exists and belongs to this tool
      const existingConfig =
        await this.toolConfigsRepository.findById(configId);
      if (!existingConfig) {
        throw new Error(`Configuration with id '${configId}' not found`);
      }
      if (existingConfig.toolId !== tool.id) {
        throw new Error('Configuration does not belong to this tool');
      }

      // Set as active (repository handles deactivating others)
      const activatedEntity =
        await this.toolConfigsRepository.setActive(configId);
      const config = this.entityToConfig(activatedEntity);

      return {
        success: true,
        data: { config },
      };
    } catch (error) {
      console.error(
        `Error activating config ${configId} for tool ${toolKey}:`,
        error
      );
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('does not belong')
        ) {
          throw error;
        }
      }
      throw new Error('Failed to activate tool configuration');
    }
  }

  /**
   * Deletes a tool configuration.
   * @param toolKey - Tool key
   * @param configId - Configuration ID to delete
   * @returns Promise containing delete response
   * @throws {Error} When config not found or is active
   * @example
   * await toolConfigService.deleteConfig('short-link', 'config-uuid');
   */
  async deleteConfig(
    toolKey: string,
    configId: string
  ): Promise<DeleteToolConfigResponse> {
    try {
      // Verify the tool exists
      const tool = await this.toolsRepository.findByKey(toolKey);
      if (!tool) {
        throw new Error(`Tool with key '${toolKey}' not found`);
      }

      // Verify the config exists and belongs to this tool
      const existingConfig =
        await this.toolConfigsRepository.findById(configId);
      if (!existingConfig) {
        throw new Error(`Configuration with id '${configId}' not found`);
      }
      if (existingConfig.toolId !== tool.id) {
        throw new Error('Configuration does not belong to this tool');
      }

      // Prevent deletion of active config
      if (existingConfig.isActive) {
        throw new Error(
          'Cannot delete the active configuration. Activate another config first.'
        );
      }

      // Delete the config
      const deleted = await this.toolConfigsRepository.delete(configId);

      if (!deleted) {
        throw new Error(`Configuration with id '${configId}' not found`);
      }

      return {
        success: true,
        message: 'Configuration deleted successfully',
      };
    } catch (error) {
      console.error(
        `Error deleting config ${configId} for tool ${toolKey}:`,
        error
      );
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('does not belong') ||
          error.message.includes('Cannot delete')
        ) {
          throw error;
        }
      }
      throw new Error('Failed to delete tool configuration');
    }
  }
}

// Export singleton instance
export const toolConfigService = new ToolConfigService();
