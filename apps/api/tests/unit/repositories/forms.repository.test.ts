import { FormsRepository } from '../../../src/repositories/forms.repository';
import { FormMetadata, FormStatus } from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';
import { TenantContext } from '../../../src/repositories/base.repository';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('FormsRepository', () => {
  let repository: FormsRepository;
  let mockClient: any;
  let mockPool: any;

  const tenantContext: TenantContext = {
    id: 'tenant-123',
    slug: 'test-tenant',
  };

  const mockForm: FormMetadata = {
    id: 'form-123',
    userId: 'user-123',
    tenantId: 'tenant-123',
    title: 'Test Form',
    description: 'Test description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

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
    repository = new FormsRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a form with tenant context', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockForm] });

      const formData: Partial<FormMetadata> = {
        userId: 'user-123',
        title: 'Test Form',
        description: 'Test description',
        status: FormStatus.DRAFT,
      };

      const result = await repository.create(formData, tenantContext);

      expect(result).toEqual(mockForm);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO forms'),
        expect.arrayContaining([
          'user-123',
          'Test Form',
          'Test description',
          FormStatus.DRAFT,
          'tenant-123',
        ])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create a form without tenant context', async () => {
      const formWithoutTenant = { ...mockForm, tenantId: undefined };
      mockClient.query.mockResolvedValue({ rows: [formWithoutTenant] });

      const formData: Partial<FormMetadata> = {
        userId: 'user-123',
        title: 'Test Form',
        status: FormStatus.DRAFT,
      };

      const result = await repository.create(formData);

      expect(result).toEqual(formWithoutTenant);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      const formData: Partial<FormMetadata> = {
        userId: 'user-123',
        title: 'Test Form',
      };

      await expect(repository.create(formData)).rejects.toThrow(
        'Failed to create form'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when creation returns no rows', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const formData: Partial<FormMetadata> = {
        userId: 'user-123',
        title: 'Test Form',
      };

      await expect(repository.create(formData)).rejects.toThrow(
        'Failed to create form record'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findFormById', () => {
    it('should find form by ID with tenant filtering', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockForm] });

      const result = await repository.findFormById('form-123', 'tenant-123');

      expect(result).toEqual(mockForm);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['form-123', 'tenant-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should find form by ID without tenant filtering', async () => {
      mockClient.query.mockResolvedValue({ rows: [mockForm] });

      const result = await repository.findFormById('form-123');

      expect(result).toEqual(mockForm);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['form-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null when form not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findFormById('nonexistent-id');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findFormById('form-123')).rejects.toThrow(
        'Failed to find form by ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should find forms by user ID with tenant filtering', async () => {
      const mockForms = [mockForm, { ...mockForm, id: 'form-456' }];
      mockClient.query.mockResolvedValue({ rows: mockForms });

      const result = await repository.findByUserId('user-123', 'tenant-123');

      expect(result).toEqual(mockForms);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123', 'tenant-123']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should find forms by user ID without tenant filtering', async () => {
      const mockForms = [mockForm];
      mockClient.query.mockResolvedValue({ rows: mockForms });

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual(mockForms);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        ['user-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array when no forms found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await repository.findByUserId('user-123');

      expect(result).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(repository.findByUserId('user-123')).rejects.toThrow(
        'Failed to find forms by user ID'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update form successfully', async () => {
      const updatedForm = {
        ...mockForm,
        title: 'Updated Title',
        status: FormStatus.PUBLISHED,
      };
      mockClient.query.mockResolvedValue({ rows: [updatedForm] });

      const result = await repository.update('form-123', {
        title: 'Updated Title',
        status: FormStatus.PUBLISHED,
      });

      expect(result).toEqual(updatedForm);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE forms'),
        ['Updated Title', FormStatus.PUBLISHED, 'form-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.update('form-123', {})).rejects.toThrow(
        'No fields to update'
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when form not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.update('form-123', { title: 'New Title' })
      ).rejects.toThrow('Form not found');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.update('form-123', { title: 'New Title' })
      ).rejects.toThrow('Failed to update form');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteByOwner', () => {
    it('should delete form when user is owner', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      const result = await repository.deleteByOwner('form-123', 'user-123');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM forms'),
        ['form-123', 'user-123']
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return false when user is not owner', async () => {
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      const result = await repository.deleteByOwner('form-123', 'wrong-user');

      expect(result).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.deleteByOwner('form-123', 'user-123')
      ).rejects.toThrow('Failed to delete form');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
