import { ThemesRepository } from '../../../src/repositories/themes.repository';
import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
} from '@nodeangularfullstack/shared';
import { databaseService } from '../../../src/services/database.service';

// Mock database service
jest.mock('../../../src/services/database.service', () => ({
  databaseService: {
    getPool: jest.fn(),
  },
}));

describe('ThemesRepository', () => {
  let repository: ThemesRepository;
  let mockClient: any;
  let mockPool: any;

  const mockTheme: FormTheme = {
    id: 'theme-123',
    name: 'Modern Blue',
    description: 'Clean modern theme with blue accents',
    thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
    themeConfig: {
      desktop: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        backgroundColor: '#ffffff',
        textColorPrimary: '#212529',
        textColorSecondary: '#6c757d',
        fontFamilyHeading: 'Inter, sans-serif',
        fontFamilyBody: 'Inter, sans-serif',
        fieldBorderRadius: '8px',
        fieldSpacing: '16px',
        containerBackground: '#ffffff',
        containerOpacity: 1,
        containerPosition: 'center',
      },
    },
    usageCount: 0,
    isActive: true,
    createdBy: 'user-123',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockCreateRequest: CreateThemeRequest = {
    name: 'Modern Blue',
    description: 'Clean modern theme with blue accents',
    thumbnailUrl: 'https://spaces.example.com/theme-thumb.jpg',
    themeConfig: {
      desktop: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        backgroundColor: '#ffffff',
        textColorPrimary: '#212529',
        textColorSecondary: '#6c757d',
        fontFamilyHeading: 'Inter, sans-serif',
        fontFamilyBody: 'Inter, sans-serif',
        fieldBorderRadius: '8px',
        fieldSpacing: '16px',
        containerBackground: '#ffffff',
        containerOpacity: 1,
        containerPosition: 'center',
      },
    },
    createdBy: 'user-123',
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
    repository = new ThemesRepository();
  });

  describe('findAll', () => {
    it('should return active themes sorted by usage_count DESC', async () => {
      const mockThemes = [
        {
          ...mockTheme,
          id: 'theme-1',
          name: 'Neon',
          usage_count: 100,
          is_active: true,
        },
        {
          ...mockTheme,
          id: 'theme-2',
          name: 'Desert',
          usage_count: 50,
          is_active: true,
        },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockThemes });

      const result = await repository.findAll(true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = $1'),
        [true]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count DESC'),
        expect.any(Array)
      );
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Neon');
      expect(result[1].name).toBe('Desert');
    });

    it('should return all themes including inactive when activeOnly is false', async () => {
      const mockThemes = [
        { ...mockTheme, id: 'theme-1', name: 'Active Theme', is_active: true },
        {
          ...mockTheme,
          id: 'theme-2',
          name: 'Inactive Theme',
          is_active: false,
        },
      ];
      mockClient.query.mockResolvedValueOnce({ rows: mockThemes });

      const result = await repository.findAll(false);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE is_active'),
        []
      );
      expect(result).toHaveLength(2);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      await expect(repository.findAll()).rejects.toThrow(
        'Failed to find themes: Database connection failed'
      );
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await repository.findAll(true);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        [true]
      );
    });
  });

  describe('findById', () => {
    it('should return theme by id', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      const result = await repository.findById('theme-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['theme-123']
      );
      expect(result).toEqual(mockTheme);
    });

    it('should return null if theme not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findById('theme-123')).rejects.toThrow(
        'Failed to find theme by ID: Database error'
      );
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await repository.findById("'; DROP TABLE form_themes; --");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        ["'; DROP TABLE form_themes; --"]
      );
    });
  });

  describe('create', () => {
    it('should create theme with all fields', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      const result = await repository.create(mockCreateRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_themes'),
        [
          mockCreateRequest.name,
          mockCreateRequest.description,
          mockCreateRequest.thumbnailUrl,
          JSON.stringify(mockCreateRequest.themeConfig),
          mockCreateRequest.createdBy,
        ]
      );
      expect(result).toEqual(mockTheme);
    });

    it('should create theme with minimal required fields', async () => {
      const minimalRequest: CreateThemeRequest = {
        name: 'Minimal Theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#000000',
            secondaryColor: '#ffffff',
            backgroundColor: '#ffffff',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial',
            fontFamilyBody: 'Arial',
            fieldBorderRadius: '4px',
            fieldSpacing: '8px',
            containerBackground: '#ffffff',
            containerOpacity: 1,
            containerPosition: 'center',
          },
        },
      };

      const expectedTheme = { ...mockTheme, ...minimalRequest };
      mockClient.query.mockResolvedValueOnce({ rows: [expectedTheme] });

      const result = await repository.create(minimalRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO form_themes'),
        [
          minimalRequest.name,
          null, // description
          minimalRequest.thumbnailUrl,
          JSON.stringify(minimalRequest.themeConfig),
          null, // createdBy
        ]
      );
      expect(result).toEqual(expectedTheme);
    });

    it('should handle creation failure', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        'Failed to create theme'
      );
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.create(mockCreateRequest)).rejects.toThrow(
        'Failed to create theme: Database error'
      );
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousRequest = {
        ...mockCreateRequest,
        name: "'; DROP TABLE form_themes; --",
      };
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      await repository.create(maliciousRequest);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1, $2, $3, $4, $5'),
        expect.arrayContaining([maliciousRequest.name])
      );
    });
  });

  describe('update', () => {
    it('should update only provided fields', async () => {
      const updates: UpdateThemeRequest = {
        name: 'Updated Theme Name',
        description: 'Updated description',
      };
      const updatedTheme = { ...mockTheme, ...updates };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTheme] });

      const result = await repository.update('theme-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_themes'),
        expect.arrayContaining([updates.name, updates.description, 'theme-123'])
      );
      expect(result).toEqual(updatedTheme);
    });

    it('should update theme_config when provided', async () => {
      const updates: UpdateThemeRequest = {
        themeConfig: {
          desktop: {
            primaryColor: '#ff0000',
            secondaryColor: '#00ff00',
            backgroundColor: '#ffffff',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial',
            fontFamilyBody: 'Arial',
            fieldBorderRadius: '4px',
            fieldSpacing: '8px',
            containerBackground: '#ffffff',
            containerOpacity: 1,
            containerPosition: 'center',
          },
        },
      };
      const updatedTheme = { ...mockTheme, ...updates };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTheme] });

      const result = await repository.update('theme-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_themes'),
        expect.arrayContaining([
          JSON.stringify(updates.themeConfig),
          'theme-123',
        ])
      );
      expect(result).toEqual(updatedTheme);
    });

    it('should trigger updated_at timestamp', async () => {
      const updates: UpdateThemeRequest = { name: 'Updated Name' };
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      await repository.update('theme-123', updates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(repository.update('theme-123', {})).rejects.toThrow(
        'No fields to update'
      );
    });

    it('should throw error when theme not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        repository.update('nonexistent-id', { name: 'New Name' })
      ).rejects.toThrow('Theme not found');
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        repository.update('theme-123', { name: 'New Name' })
      ).rejects.toThrow('Failed to update theme: Database error');
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousUpdates = {
        name: "'; DROP TABLE form_themes; --",
      };
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      await repository.update('theme-123', maliciousUpdates);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        expect.arrayContaining([maliciousUpdates.name, 'theme-123'])
      );
    });
  });

  describe('softDelete', () => {
    it('should set is_active to false', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await repository.softDelete('theme-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE form_themes'),
        ['theme-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when theme not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await repository.softDelete('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.softDelete('theme-123')).rejects.toThrow(
        'Failed to soft delete theme: Database error'
      );
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await repository.softDelete("'; DROP TABLE form_themes; --");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        ["'; DROP TABLE form_themes; --"]
      );
    });
  });

  describe('incrementUsageCount', () => {
    it('should atomically increment usage_count by 1', async () => {
      const updatedTheme = { ...mockTheme, usageCount: 1 };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTheme] });

      const result = await repository.incrementUsageCount('theme-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('usage_count = usage_count + 1'),
        ['theme-123']
      );
      expect(result).toEqual(updatedTheme);
    });

    it('should throw error when theme not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        repository.incrementUsageCount('nonexistent-id')
      ).rejects.toThrow('Theme not found');
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.incrementUsageCount('theme-123')).rejects.toThrow(
        'Failed to increment usage count: Database error'
      );
    });

    it('should use parameterized queries to prevent SQL injection', async () => {
      const updatedTheme = { ...mockTheme, usageCount: 1 };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTheme] });

      await repository.incrementUsageCount("'; DROP TABLE form_themes; --");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('$1'),
        ["'; DROP TABLE form_themes; --"]
      );
    });
  });

  describe('client connection management', () => {
    it('should release client connection after successful operation', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockTheme] });

      await repository.findById('theme-123');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client connection after error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.findById('theme-123')).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
