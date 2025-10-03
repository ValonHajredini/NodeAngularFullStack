import {
  ToolsRepository,
  ToolEntity,
  CreateToolData,
} from '../../../src/repositories/tools.repository';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('ToolsRepository', () => {
  let repository: ToolsRepository;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Create mock database pool
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // Setup database service mock
    (databaseService.getPool as jest.Mock).mockReturnValue(mockPool);

    // Create repository instance
    repository = new ToolsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all tools ordered by name', async () => {
      const mockTools: ToolEntity[] = [
        {
          id: '1',
          key: 'short-link',
          name: 'Short Link Generator',
          slug: 'short-link-generator',
          description: 'Generate shortened URLs',
          active: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
        {
          id: '2',
          key: 'analytics',
          name: 'Analytics Tool',
          slug: 'analytics-tool',
          description: 'Analytics and reporting',
          active: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockTools });

      const result = await repository.findAll();

      expect(result).toEqual(mockTools);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY name ASC')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to retrieve tools from database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByKey', () => {
    it('should return tool when found', async () => {
      const mockTool: ToolEntity = {
        id: '1',
        key: 'short-link',
        name: 'Short Link Generator',
        slug: 'short-link-generator',
        description: 'Generate shortened URLs',
        active: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockClient.query.mockResolvedValue({ rows: [mockTool] });

      const result = await repository.findByKey('short-link');

      expect(result).toEqual(mockTool);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE key = $1'),
        ['short-link']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when tool not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByKey('nonexistent');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByKey('short-link')).rejects.toThrow(
        'Failed to find tool in database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update tool status successfully', async () => {
      const mockTool: ToolEntity = {
        id: '1',
        key: 'short-link',
        name: 'Short Link Generator',
        slug: 'short-link-generator',
        description: 'Generate shortened URLs',
        active: false,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockClient.query.mockResolvedValue({ rows: [mockTool] });

      const result = await repository.updateStatus('short-link', false);

      expect(result).toEqual(mockTool);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tools'),
        ['short-link', false]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when tool not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateStatus('nonexistent', true)
      ).rejects.toThrow("Tool with key 'nonexistent' not found");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.updateStatus('short-link', true)).rejects.toThrow(
        'Failed to update tool status in database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create tool successfully', async () => {
      const createData: CreateToolData = {
        key: 'new-tool',
        name: 'New Tool',
        description: 'A new tool',
        active: true,
      };

      const mockTool: ToolEntity = {
        id: '1',
        ...createData,
        slug: 'new-tool',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockClient.query.mockResolvedValue({ rows: [mockTool] });

      const result = await repository.create(createData);

      expect(result).toEqual(mockTool);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tools'),
        ['new-tool', 'New Tool', 'A new tool', true]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle duplicate key error', async () => {
      const createData: CreateToolData = {
        key: 'existing-tool',
        name: 'Existing Tool',
        description: 'Tool that already exists',
      };

      const duplicateError = new Error(
        'duplicate key value violates unique constraint'
      );
      mockClient.query.mockRejectedValue(duplicateError);

      await expect(repository.create(createData)).rejects.toThrow(
        "Tool with key 'existing-tool' already exists"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle other database errors', async () => {
      const createData: CreateToolData = {
        key: 'new-tool',
        name: 'New Tool',
        description: 'A new tool',
      };

      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(createData)).rejects.toThrow(
        'Failed to create tool in database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete tool successfully', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      await repository.delete('tool-to-delete');

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM tools WHERE key = $1',
        ['tool-to-delete']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when tool not found', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      await expect(repository.delete('nonexistent')).rejects.toThrow(
        "Tool with key 'nonexistent' not found"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.delete('tool-key')).rejects.toThrow(
        'Failed to delete tool from database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findAllActive', () => {
    it('should return only active tools', async () => {
      const mockActiveTools: ToolEntity[] = [
        {
          id: '1',
          key: 'active-tool',
          name: 'Active Tool',
          slug: 'active-tool',
          description: 'An active tool',
          active: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        },
      ];

      mockClient.query.mockResolvedValue({ rows: mockActiveTools });

      const result = await repository.findAllActive();

      expect(result).toEqual(mockActiveTools);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE active = true')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findAllActive()).rejects.toThrow(
        'Failed to retrieve active tools from database'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
