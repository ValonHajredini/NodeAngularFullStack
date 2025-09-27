import { ToolsService } from '../../../src/services/tools.service';
import {
  ToolsRepository,
  ToolEntity,
} from '../../../src/repositories/tools.repository';
import {
  Tool,
  UpdateToolStatusRequest,
  CreateToolRequest,
} from '@nodeangularfullstack/shared';

// Mock the tools repository
jest.mock('../../../src/repositories/tools.repository');

describe('ToolsService', () => {
  let service: ToolsService;
  let mockRepository: jest.Mocked<ToolsRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create service instance
    service = new ToolsService();

    // Get the mocked repository instance
    mockRepository = jest.mocked(service['toolsRepository']);

    // Clear cache before each test
    service.refreshCache();
  });

  const mockToolEntity: ToolEntity = {
    id: '1',
    key: 'short-link',
    name: 'Short Link Generator',
    slug: 'short-link-generator',
    description: 'Generate shortened URLs',
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockTool: Tool = {
    id: '1',
    key: 'short-link',
    name: 'Short Link Generator',
    slug: 'short-link-generator',
    description: 'Generate shortened URLs',
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  describe('getTools', () => {
    it('should return tools with ETag', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);

      const result = await service.getTools();

      expect(result.success).toBe(true);
      expect(result.data.tools).toHaveLength(1);
      expect(result.data.tools[0]).toEqual(mockTool);
      expect(result.etag).toBeDefined();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should use cache when valid', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);

      // First call
      await service.getTools();
      // Second call (should use cache)
      await service.getTools();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when requested', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);

      // First call
      await service.getTools();
      // Second call with skipCache = true
      await service.getTools(true);

      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should handle repository errors', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database error'));

      await expect(service.getTools()).rejects.toThrow(
        'Failed to retrieve tools'
      );
    });
  });

  describe('getActiveTools', () => {
    it('should return only active tools', async () => {
      mockRepository.findAllActive.mockResolvedValue([mockToolEntity]);

      const result = await service.getActiveTools();

      expect(result.success).toBe(true);
      expect(result.data.tools).toHaveLength(1);
      expect(result.data.tools[0]).toEqual(mockTool);
      expect(mockRepository.findAllActive).toHaveBeenCalledTimes(1);
    });

    it('should handle repository errors', async () => {
      mockRepository.findAllActive.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.getActiveTools()).rejects.toThrow(
        'Failed to retrieve active tools'
      );
    });
  });

  describe('getToolByKey', () => {
    it('should return tool when found', async () => {
      mockRepository.findByKey.mockResolvedValue(mockToolEntity);

      const result = await service.getToolByKey('short-link');

      expect(result).toEqual(mockTool);
      expect(mockRepository.findByKey).toHaveBeenCalledWith('short-link');
    });

    it('should return null when tool not found', async () => {
      mockRepository.findByKey.mockResolvedValue(null);

      const result = await service.getToolByKey('nonexistent');

      expect(result).toBeNull();
      expect(mockRepository.findByKey).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle repository errors', async () => {
      mockRepository.findByKey.mockRejectedValue(new Error('Database error'));

      await expect(service.getToolByKey('short-link')).rejects.toThrow(
        'Failed to find tool'
      );
    });
  });

  describe('updateToolStatus', () => {
    it('should update tool status and invalidate cache', async () => {
      const request: UpdateToolStatusRequest = { active: false };
      const updatedEntity: ToolEntity = { ...mockToolEntity, active: false };

      mockRepository.updateStatus.mockResolvedValue(updatedEntity);

      const result = await service.updateToolStatus('short-link', request);

      expect(result.success).toBe(true);
      expect(result.data.tool.active).toBe(false);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'short-link',
        false
      );
    });

    it('should validate input', async () => {
      const invalidRequest = { active: 'not-boolean' } as any;

      await expect(
        service.updateToolStatus('short-link', invalidRequest)
      ).rejects.toThrow('Active status must be a boolean value');
    });

    it('should handle tool not found', async () => {
      const request: UpdateToolStatusRequest = { active: true };
      mockRepository.updateStatus.mockRejectedValue(
        new Error("Tool with key 'nonexistent' not found")
      );

      await expect(
        service.updateToolStatus('nonexistent', request)
      ).rejects.toThrow("Tool with key 'nonexistent' not found");
    });

    it('should handle repository errors', async () => {
      const request: UpdateToolStatusRequest = { active: true };
      mockRepository.updateStatus.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.updateToolStatus('short-link', request)
      ).rejects.toThrow('Failed to update tool status');
    });
  });

  describe('createTool', () => {
    it('should create tool successfully', async () => {
      const request: CreateToolRequest = {
        key: 'new-tool',
        name: 'New Tool',
        description: 'A new tool for the system',
        active: true,
      };

      const createdEntity: ToolEntity = {
        id: '2',
        key: request.key,
        name: request.name,
        slug: request.slug || 'new-tool',
        description: request.description,
        active: request.active ?? true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockRepository.create.mockResolvedValue(createdEntity);

      const result = await service.createTool(request);

      expect(result.success).toBe(true);
      expect(result.data.tool.key).toBe('new-tool');
      expect(mockRepository.create).toHaveBeenCalledWith({
        key: 'new-tool',
        name: 'New Tool',
        description: 'A new tool for the system',
        active: true,
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        key: '',
        name: 'Tool',
        description: 'Description',
      } as CreateToolRequest;

      await expect(service.createTool(invalidRequest)).rejects.toThrow(
        'Key, name, and description are required'
      );
    });

    it('should validate kebab-case key format', async () => {
      const invalidRequest: CreateToolRequest = {
        key: 'InvalidKey',
        name: 'Tool',
        description: 'Description',
      };

      await expect(service.createTool(invalidRequest)).rejects.toThrow(
        'Tool key must be in kebab-case format'
      );
    });

    it('should handle duplicate key error', async () => {
      const request: CreateToolRequest = {
        key: 'existing-tool',
        name: 'Existing Tool',
        description: 'Tool that already exists',
      };

      mockRepository.create.mockRejectedValue(
        new Error("Tool with key 'existing-tool' already exists")
      );

      await expect(service.createTool(request)).rejects.toThrow(
        "Tool with key 'existing-tool' already exists"
      );
    });
  });

  describe('deleteTool', () => {
    it('should delete tool successfully', async () => {
      mockRepository.delete.mockResolvedValue(true);

      await service.deleteTool('tool-to-delete');

      expect(mockRepository.delete).toHaveBeenCalledWith('tool-to-delete');
    });

    it('should handle tool not found', async () => {
      mockRepository.delete.mockRejectedValue(
        new Error("Tool with key 'nonexistent' not found")
      );

      await expect(service.deleteTool('nonexistent')).rejects.toThrow(
        "Tool with key 'nonexistent' not found"
      );
    });

    it('should handle repository errors', async () => {
      mockRepository.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteTool('tool-key')).rejects.toThrow(
        'Failed to delete tool'
      );
    });
  });

  describe('caching', () => {
    it('should generate different ETags for different data', async () => {
      const tool1: ToolEntity = { ...mockToolEntity, id: '1' };
      const tool2: ToolEntity = { ...mockToolEntity, id: '2' };

      mockRepository.findAll.mockResolvedValueOnce([tool1]);
      const result1 = await service.getTools();

      service.refreshCache();
      mockRepository.findAll.mockResolvedValueOnce([tool2]);
      const result2 = await service.getTools();

      expect(result1.etag).not.toBe(result2.etag);
    });

    it('should invalidate cache after modifications', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);
      mockRepository.updateStatus.mockResolvedValue({
        ...mockToolEntity,
        active: false,
      });

      // Load initial data
      await service.getTools();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);

      // Update tool (should invalidate cache)
      await service.updateToolStatus('short-link', { active: false });

      // Next getTools call should fetch fresh data
      await service.getTools();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should allow manual cache refresh', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);

      await service.getTools();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);

      service.refreshCache();
      await service.getTools();
      expect(mockRepository.findAll).toHaveBeenCalledTimes(2);
    });

    it('should return current ETag', async () => {
      mockRepository.findAll.mockResolvedValue([mockToolEntity]);

      const result = await service.getTools();
      const currentETag = service.getCurrentETag();

      expect(currentETag).toBe(result.etag);
    });

    it('should return null ETag when no cache', () => {
      const etag = service.getCurrentETag();
      expect(etag).toBeNull();
    });
  });
});
