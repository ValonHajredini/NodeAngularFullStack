import { ToolRegistryService } from '../../../src/services/tool-registry.service';
import { ToolRegistryRepository } from '../../../src/repositories/tool-registry.repository';
import {
  ToolRegistryRecord,
  CreateToolInput,
  UpdateToolInput,
  ToolStatus,
  ToolManifest,
} from '@nodeangularfullstack/shared';

// Mock the repository
jest.mock('../../../src/repositories/tool-registry.repository');

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;
  let mockRepository: jest.Mocked<ToolRegistryRepository>;

  // Sample test data
  const sampleManifest: ToolManifest = {
    routes: {
      primary: '/tools/test-tool',
    },
    endpoints: {
      base: '/api/tools/test-tool',
      paths: ['/'],
    },
  };

  const sampleTool: ToolRegistryRecord = {
    id: 'uuid-123',
    tool_id: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    version: '1.0.0',
    icon: '🔧',
    route: '/tools/test-tool',
    api_base: '/api/tools/test-tool',
    permissions: ['user'],
    status: ToolStatus.BETA,
    is_exported: false,
    manifest_json: sampleManifest,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: 'user-uuid',
  };

  beforeEach(() => {
    // Create mock repository with all methods
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findByStatus: jest.fn(),
      findExported: jest.fn(),
      findNonExported: jest.fn(),
    } as any;

    // Create service instance with mocked repository
    service = new ToolRegistryService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== getAllTools() Tests ====================
  describe('getAllTools', () => {
    it('should return all tools from repository', async () => {
      // Arrange
      const expectedTools = [sampleTool];
      mockRepository.findAll.mockResolvedValue(expectedTools);

      // Act
      const result = await service.getAllTools();

      // Assert
      expect(result).toEqual(expectedTools);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no tools exist', async () => {
      // Arrange
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getAllTools();

      // Assert
      expect(result).toEqual([]);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== getTool() Tests ====================
  describe('getTool', () => {
    it('should return tool when found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool);

      // Act
      const result = await service.getTool('test-tool');

      // Assert
      expect(result).toEqual(sampleTool);
      expect(mockRepository.findById).toHaveBeenCalledWith('test-tool');
    });

    it('should throw error when tool not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTool('nonexistent-tool')).rejects.toThrow(
        "Tool 'nonexistent-tool' not found"
      );
      expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent-tool');
    });
  });

  // ==================== searchTools() Tests ====================
  describe('searchTools', () => {
    it('should search tools with valid query', async () => {
      // Arrange
      const expectedTools = [sampleTool];
      mockRepository.search.mockResolvedValue(expectedTools);

      // Act
      const result = await service.searchTools('test');

      // Assert
      expect(result).toEqual(expectedTools);
      expect(mockRepository.search).toHaveBeenCalledWith('test');
    });

    it('should trim query before searching', async () => {
      // Arrange
      mockRepository.search.mockResolvedValue([]);

      // Act
      await service.searchTools('  test  ');

      // Assert
      expect(mockRepository.search).toHaveBeenCalledWith('test');
    });

    it('should throw error when query is too short', async () => {
      // Act & Assert
      await expect(service.searchTools('a')).rejects.toThrow(
        'Search query must be at least 2 characters long'
      );
      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should throw error when query is empty', async () => {
      // Act & Assert
      await expect(service.searchTools('')).rejects.toThrow(
        'Search query must be at least 2 characters long'
      );
      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should throw error when query is only whitespace', async () => {
      // Act & Assert
      await expect(service.searchTools('   ')).rejects.toThrow(
        'Search query must be at least 2 characters long'
      );
      expect(mockRepository.search).not.toHaveBeenCalled();
    });
  });

  // ==================== registerTool() Tests ====================
  describe('registerTool', () => {
    const validInput: CreateToolInput = {
      tool_id: 'my-tool',
      name: 'My Tool',
      version: '1.0.0',
      route: '/tools/my-tool',
      api_base: '/api/tools/my-tool',
      manifest_json: sampleManifest,
      created_by: 'user-uuid',
    };

    it('should register tool with valid data', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null); // Tool doesn't exist
      mockRepository.create.mockResolvedValue(sampleTool);

      // Act
      const result = await service.registerTool(validInput);

      // Assert
      expect(result).toEqual(sampleTool);
      expect(mockRepository.findById).toHaveBeenCalledWith('my-tool');
      expect(mockRepository.create).toHaveBeenCalledWith(validInput);
    });

    // Tool ID Format Validation Tests
    it('should reject tool ID with uppercase letters', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        tool_id: 'MyTool', // Uppercase not allowed
      };

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Tool ID 'MyTool' is invalid. Must be kebab-case"
      );
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject tool ID with underscores', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        tool_id: 'my_tool', // Underscores not allowed
      };

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Tool ID 'my_tool' is invalid. Must be kebab-case"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject tool ID starting with number', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        tool_id: '1-my-tool', // Must start with letter
      };

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Tool ID '1-my-tool' is invalid"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject tool ID with special characters', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        tool_id: 'my@tool', // Special chars not allowed
      };

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Tool ID 'my@tool' is invalid"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should accept tool ID with numbers and hyphens', async () => {
      // Arrange
      const validKebabInput: CreateToolInput = {
        ...validInput,
        tool_id: 'tool-123-test', // Valid kebab-case
      };
      mockRepository.findById.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(sampleTool);

      // Act
      await service.registerTool(validKebabInput);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(validKebabInput);
    });

    // Duplicate Tool ID Tests
    it('should reject duplicate tool ID', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // Tool exists

      // Act & Assert
      await expect(service.registerTool(validInput)).rejects.toThrow(
        "Tool with ID 'my-tool' already exists in the registry"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    // Route Format Validation Tests
    it('should reject route not starting with /tools/', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        route: '/invalid-route',
      };
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Route '/invalid-route' is invalid. Frontend route must start with /tools/"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject route starting with /api/', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        route: '/api/my-tool',
      };
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "Route '/api/my-tool' is invalid. Frontend route must start with /tools/"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    // API Base Format Validation Tests
    it('should reject API base not starting with /api/tools/', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        api_base: '/api/invalid',
      };
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "API base '/api/invalid' is invalid. Backend API base must start with /api/tools/"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should reject API base starting with /tools/', async () => {
      // Arrange
      const invalidInput: CreateToolInput = {
        ...validInput,
        api_base: '/tools/my-tool',
      };
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registerTool(invalidInput)).rejects.toThrow(
        "API base '/tools/my-tool' is invalid. Backend API base must start with /api/tools/"
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  // ==================== updateTool() Tests ====================
  describe('updateTool', () => {
    it('should update tool with valid changes', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool);
      const updates: UpdateToolInput = {
        version: '2.0.0',
        description: 'Updated description',
      };
      const updatedTool = { ...sampleTool, ...updates };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result).toEqual(updatedTool);
      expect(mockRepository.update).toHaveBeenCalledWith('test-tool', updates);
    });

    it('should throw error when tool not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      const updates: UpdateToolInput = { version: '2.0.0' };

      // Act & Assert
      await expect(service.updateTool('nonexistent', updates)).rejects.toThrow(
        "Tool 'nonexistent' not found"
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // Status Transition Tests
    it('should allow valid status transition from beta to active', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // Status: BETA
      const updates: UpdateToolInput = { status: ToolStatus.ACTIVE };
      const updatedTool = { ...sampleTool, status: ToolStatus.ACTIVE };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result.status).toBe(ToolStatus.ACTIVE);
      expect(mockRepository.update).toHaveBeenCalledWith('test-tool', updates);
    });

    it('should allow valid status transition from beta to deprecated', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // Status: BETA
      const updates: UpdateToolInput = { status: ToolStatus.DEPRECATED };
      const updatedTool = { ...sampleTool, status: ToolStatus.DEPRECATED };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result.status).toBe(ToolStatus.DEPRECATED);
    });

    it('should allow valid status transition from active to deprecated', async () => {
      // Arrange
      const activeTool = { ...sampleTool, status: ToolStatus.ACTIVE };
      mockRepository.findById.mockResolvedValue(activeTool);
      const updates: UpdateToolInput = { status: ToolStatus.DEPRECATED };
      const updatedTool = { ...activeTool, status: ToolStatus.DEPRECATED };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result.status).toBe(ToolStatus.DEPRECATED);
    });

    it('should reject invalid status transition from active to beta', async () => {
      // Arrange
      const activeTool = { ...sampleTool, status: ToolStatus.ACTIVE };
      mockRepository.findById.mockResolvedValue(activeTool);
      const updates: UpdateToolInput = { status: ToolStatus.BETA };

      // Act & Assert
      await expect(service.updateTool('test-tool', updates)).rejects.toThrow(
        "Invalid status transition from 'active' to 'beta'"
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should reject any transition from deprecated status', async () => {
      // Arrange
      const deprecatedTool = { ...sampleTool, status: ToolStatus.DEPRECATED };
      mockRepository.findById.mockResolvedValue(deprecatedTool);
      const updates: UpdateToolInput = { status: ToolStatus.ACTIVE };

      // Act & Assert
      await expect(service.updateTool('test-tool', updates)).rejects.toThrow(
        "Invalid status transition from 'deprecated' to 'active'"
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updates without status change', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool);
      const updates: UpdateToolInput = {
        version: '2.0.0',
        description: 'New description',
      };
      const updatedTool = { ...sampleTool, ...updates };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result).toEqual(updatedTool);
      expect(mockRepository.update).toHaveBeenCalledWith('test-tool', updates);
    });

    it('should allow status update to same status', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // Status: BETA
      const updates: UpdateToolInput = { status: ToolStatus.BETA };
      const updatedTool = { ...sampleTool };
      mockRepository.update.mockResolvedValue(updatedTool);

      // Act
      const result = await service.updateTool('test-tool', updates);

      // Assert
      expect(result.status).toBe(ToolStatus.BETA);
      expect(mockRepository.update).toHaveBeenCalledWith('test-tool', updates);
    });
  });

  // ==================== deleteTool() Tests ====================
  describe('deleteTool', () => {
    it('should delete non-exported tool', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // is_exported: false
      mockRepository.delete.mockResolvedValue();

      // Act
      await service.deleteTool('test-tool');

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith('test-tool');
    });

    it('should throw error when tool not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteTool('nonexistent')).rejects.toThrow(
        "Tool 'nonexistent' not found"
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should reject deletion of exported tool', async () => {
      // Arrange
      const exportedTool = { ...sampleTool, is_exported: true };
      mockRepository.findById.mockResolvedValue(exportedTool);

      // Act & Assert
      await expect(service.deleteTool('test-tool')).rejects.toThrow(
        "Cannot delete exported tool 'test-tool'. Un-export the tool first"
      );
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });

  // ==================== Status Transition Logic Tests ====================
  describe('validateStatusTransition (via updateTool)', () => {
    it('should have clear error message for terminal state', async () => {
      // Arrange
      const deprecatedTool = { ...sampleTool, status: ToolStatus.DEPRECATED };
      mockRepository.findById.mockResolvedValue(deprecatedTool);
      const updates: UpdateToolInput = { status: ToolStatus.BETA };

      // Act & Assert
      await expect(service.updateTool('test-tool', updates)).rejects.toThrow(
        'none (terminal state)'
      );
    });

    it('should list allowed transitions in error message', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(sampleTool); // Status: BETA
      const updates: UpdateToolInput = { status: 'invalid' as any };

      // Act & Assert
      try {
        await service.updateTool('test-tool', updates);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Allowed transitions from');
      }
    });
  });
});
