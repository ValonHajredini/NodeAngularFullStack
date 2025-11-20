import { ToolRegistryRepository } from '../../../src/repositories/tool-registry.repository';
import {
  CreateToolInput,
  UpdateToolInput,
  ToolStatus,
} from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('ToolRegistryRepository', () => {
  let repository: ToolRegistryRepository;
  let mockClient: any;
  let mockPool: any;

  const mockToolRow = {
    id: 'uuid-123',
    tool_id: 'form-builder',
    name: 'Form Builder',
    description: 'Build custom forms',
    version: '1.0.0',
    icon: '📝',
    route: '/tools/forms',
    api_base: '/api/forms',
    permissions: ['admin', 'user'],
    status: ToolStatus.ACTIVE,
    is_exported: false,
    exported_at: null,
    service_url: null,
    database_name: null,
    manifest_json: {
      routes: { primary: '/tools/forms' },
      endpoints: { base: '/api/forms', paths: ['/list', '/create'] },
    },
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: 'user-123',
  };

  beforeEach(() => {
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
    repository = new ToolRegistryRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all tools ordered by created_at DESC', async () => {
      const mockRows = [
        mockToolRow,
        { ...mockToolRow, tool_id: 'tool-2', name: 'Tool 2' },
      ];
      mockClient.query.mockResolvedValue({ rows: mockRows });

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].tool_id).toBe('form-builder');
      expect(result[1].tool_id).toBe('tool-2');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no tools exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findAll();

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when database query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to find all tools'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return tool if found', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockToolRow] });

      const result = await repository.findById('form-builder');

      expect(result).not.toBeNull();
      expect(result?.tool_id).toBe('form-builder');
      expect(result?.name).toBe('Form Builder');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tool_id = $1'),
        ['form-builder']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null if tool not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when database query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findById('form-builder')).rejects.toThrow(
        'Failed to find tool by ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const validInput: CreateToolInput = {
      tool_id: 'inventory-tracker',
      name: 'Inventory Tracker',
      version: '1.0.0',
      route: '/tools/inventory',
      api_base: '/api/inventory',
      description: 'Track inventory',
      icon: '📦',
      permissions: ['admin'],
      status: ToolStatus.BETA,
      manifest_json: {
        routes: { primary: '/tools/inventory' },
        endpoints: { base: '/api/inventory', paths: ['/list', '/create'] },
      },
      created_by: 'user-123',
    };

    it('should insert tool and return record', async () => {
      const newToolRow = { ...mockToolRow, ...validInput };
      mockClient.query.mockResolvedValue({ rows: [newToolRow] });

      const result = await repository.create(validInput);

      expect(result.tool_id).toBe('inventory-tracker');
      expect(result.name).toBe('Inventory Tracker');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tool_registry'),
        expect.arrayContaining([
          'inventory-tracker',
          'Inventory Tracker',
          'Track inventory',
          '1.0.0',
          '📦',
          '/tools/inventory',
          '/api/inventory',
          ['admin'],
          ToolStatus.BETA,
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error for missing required fields', async () => {
      const invalidInput = {
        tool_id: 'test-tool',
        name: 'Test Tool',
        // Missing version, route, api_base
      } as CreateToolInput;

      await expect(repository.create(invalidInput)).rejects.toThrow(
        'Missing required fields'
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw error for duplicate tool_id', async () => {
      const error: any = new Error('Duplicate key');
      error.code = '23505';
      mockClient.query.mockRejectedValue(error);

      await expect(repository.create(validInput)).rejects.toThrow(
        "Tool with ID 'inventory-tracker' already exists"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply default status if not provided', async () => {
      const inputWithoutStatus = { ...validInput };
      delete inputWithoutStatus.status;
      const newToolRow = { ...mockToolRow, ...inputWithoutStatus };
      mockClient.query.mockResolvedValue({ rows: [newToolRow] });

      await repository.create(inputWithoutStatus);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([ToolStatus.BETA])
      );
    });

    it('should handle null optional fields', async () => {
      const minimalInput: CreateToolInput = {
        tool_id: 'minimal-tool',
        name: 'Minimal Tool',
        version: '1.0.0',
        route: '/tools/minimal',
        api_base: '/api/minimal',
      };
      const newToolRow = { ...mockToolRow, ...minimalInput };
      mockClient.query.mockResolvedValue({ rows: [newToolRow] });

      const result = await repository.create(minimalInput);

      expect(result.tool_id).toBe('minimal-tool');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'minimal-tool',
          'Minimal Tool',
          null, // description
          '1.0.0',
          null, // icon
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update tool and return updated record', async () => {
      const updateInput: UpdateToolInput = {
        version: '2.0.0',
        status: ToolStatus.ACTIVE,
      };
      const updatedRow = { ...mockToolRow, ...updateInput };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.version).toBe('2.0.0');
      expect(result.status).toBe(ToolStatus.ACTIVE);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tool_registry'),
        expect.arrayContaining(['2.0.0', ToolStatus.ACTIVE, 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should build dynamic SET clause for provided fields only', async () => {
      const updateInput: UpdateToolInput = {
        name: 'Updated Name',
      };
      const updatedRow = { ...mockToolRow, name: 'Updated Name' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      await repository.update('form-builder', updateInput);

      const callArgs = mockClient.query.mock.calls[0];
      expect(callArgs[0]).toContain('name = $1');
      expect(callArgs[1]).toContain('Updated Name');
      expect(callArgs[1]).toContain('form-builder');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when tool not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.update('nonexistent', { version: '2.0.0' })
      ).rejects.toThrow("Tool 'nonexistent' not found");
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when no fields provided', async () => {
      await expect(repository.update('form-builder', {})).rejects.toThrow(
        'No fields provided for update'
      );
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should update export-related fields', async () => {
      const updateInput: UpdateToolInput = {
        is_exported: true,
        exported_at: new Date('2025-01-15'),
        service_url: 'https://form-builder.example.com',
        database_name: 'form_builder_db',
      };
      const updatedRow = { ...mockToolRow, ...updateInput };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.is_exported).toBe(true);
      expect(result.service_url).toBe('https://form-builder.example.com');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('is_exported = $1'),
        expect.arrayContaining([
          true,
          updateInput.exported_at,
          'https://form-builder.example.com',
          'form_builder_db',
          'form-builder',
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update description field', async () => {
      const updateInput: UpdateToolInput = {
        description: 'Updated description',
      };
      const updatedRow = { ...mockToolRow, description: 'Updated description' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.description).toBe('Updated description');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('description = $1'),
        expect.arrayContaining(['Updated description', 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update icon field', async () => {
      const updateInput: UpdateToolInput = {
        icon: '🎨',
      };
      const updatedRow = { ...mockToolRow, icon: '🎨' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.icon).toBe('🎨');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('icon = $1'),
        expect.arrayContaining(['🎨', 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update route field', async () => {
      const updateInput: UpdateToolInput = {
        route: '/tools/new-route',
      };
      const updatedRow = { ...mockToolRow, route: '/tools/new-route' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.route).toBe('/tools/new-route');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('route = $1'),
        expect.arrayContaining(['/tools/new-route', 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update api_base field', async () => {
      const updateInput: UpdateToolInput = {
        api_base: '/api/new-base',
      };
      const updatedRow = { ...mockToolRow, api_base: '/api/new-base' };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.api_base).toBe('/api/new-base');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('api_base = $1'),
        expect.arrayContaining(['/api/new-base', 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update permissions field', async () => {
      const updateInput: UpdateToolInput = {
        permissions: ['admin', 'superuser'],
      };
      const updatedRow = {
        ...mockToolRow,
        permissions: ['admin', 'superuser'],
      };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.permissions).toEqual(['admin', 'superuser']);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('permissions = $1'),
        expect.arrayContaining([['admin', 'superuser'], 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update manifest_json field', async () => {
      const newManifest = {
        routes: { primary: '/tools/updated' },
        endpoints: { base: '/api/updated', paths: ['/new'] },
      };
      const updateInput: UpdateToolInput = {
        manifest_json: newManifest,
      };
      const updatedRow = { ...mockToolRow, manifest_json: newManifest };
      mockClient.query.mockResolvedValue({ rows: [updatedRow] });

      const result = await repository.update('form-builder', updateInput);

      expect(result.manifest_json).toEqual(newManifest);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('manifest_json = $1'),
        expect.arrayContaining([JSON.stringify(newManifest), 'form-builder'])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete tool by tool_id', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ tool_id: 'form-builder' }],
      });

      await repository.delete('form-builder');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tool_registry WHERE tool_id = $1'),
        ['form-builder']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when tool not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(repository.delete('nonexistent')).rejects.toThrow(
        "Tool 'nonexistent' not found"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when database delete fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.delete('form-builder')).rejects.toThrow(
        'Failed to delete tool'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByStatus', () => {
    it('should return tools filtered by status and ordered by name ASC', async () => {
      const activeTools = [
        mockToolRow,
        { ...mockToolRow, tool_id: 'another-tool', name: 'Another Tool' },
      ];
      mockClient.query.mockResolvedValue({ rows: activeTools });

      const result = await repository.findByStatus(ToolStatus.ACTIVE);

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1 ORDER BY name ASC'),
        [ToolStatus.ACTIVE]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no tools match status', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByStatus(ToolStatus.DEPRECATED);

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findExported', () => {
    it('should return only exported tools', async () => {
      const exportedTools = [
        { ...mockToolRow, is_exported: true, service_url: 'https://tool1.com' },
        {
          ...mockToolRow,
          tool_id: 'tool-2',
          is_exported: true,
          service_url: 'https://tool2.com',
        },
      ];
      mockClient.query.mockResolvedValue({ rows: exportedTools });

      const result = await repository.findExported();

      expect(result).toHaveLength(2);
      expect(result.every((tool) => tool.is_exported === true)).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_exported = true ORDER BY name ASC')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no exported tools exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findExported();

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findNonExported', () => {
    it('should return only non-exported tools', async () => {
      const nonExportedTools = [
        mockToolRow,
        { ...mockToolRow, tool_id: 'tool-2', is_exported: false },
      ];
      mockClient.query.mockResolvedValue({ rows: nonExportedTools });

      const result = await repository.findNonExported();

      expect(result).toHaveLength(2);
      expect(result.every((tool) => tool.is_exported === false)).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_exported = false ORDER BY name ASC')
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when all tools are exported', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findNonExported();

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search by name using ILIKE with wildcard', async () => {
      const searchResults = [mockToolRow];
      mockClient.query.mockResolvedValue({ rows: searchResults });

      const result = await repository.search('form');

      expect(result).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE $1 OR description ILIKE $1'),
        ['%form%']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should search by description using ILIKE', async () => {
      const searchResults = [mockToolRow];
      mockClient.query.mockResolvedValue({ rows: searchResults });

      const result = await repository.search('custom');

      expect(result).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name ILIKE $1 OR description ILIKE $1'),
        ['%custom%']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no matches found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.search('nonexistent');

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should be case-insensitive', async () => {
      const searchResults = [mockToolRow];
      mockClient.query.mockResolvedValue({ rows: searchResults });

      await repository.search('FORM');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%FORM%']
      );
    });

    it('should prevent SQL injection in search term', async () => {
      const maliciousInput = "'; DROP TABLE tool_registry; --";
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.search(maliciousInput);

      // Verify parameterized query is used (not string concatenation)
      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        `%${maliciousInput}%`,
      ]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null values in optional fields', async () => {
      const toolWithNulls = {
        ...mockToolRow,
        description: null,
        icon: null,
        permissions: null,
        exported_at: null,
        service_url: null,
        database_name: null,
        manifest_json: null,
        created_by: null,
      };
      mockClient.query.mockResolvedValue({ rows: [toolWithNulls] });

      const result = await repository.findById('form-builder');

      expect(result).not.toBeNull();
      expect(result?.description).toBeNull();
      expect(result?.icon).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty arrays', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const allResult = await repository.findAll();
      const statusResult = await repository.findByStatus(ToolStatus.ACTIVE);
      const searchResult = await repository.search('test');

      expect(allResult).toEqual([]);
      expect(statusResult).toEqual([]);
      expect(searchResult).toEqual([]);
    });

    it('should properly handle special characters in search', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await repository.search('%_test');

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        '%%_test%',
      ]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
