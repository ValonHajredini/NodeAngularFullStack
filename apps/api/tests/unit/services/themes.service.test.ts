import { themesService } from '../../../src/services/themes.service';
import { themesRepository } from '../../../src/repositories/themes.repository';
import {
  FormTheme,
  CreateThemeRequest,
  UpdateThemeRequest,
} from '@nodeangularfullstack/shared';

// Mock the themes repository
jest.mock('../../../src/repositories/themes.repository', () => ({
  themesRepository: {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    incrementUsageCount: jest.fn(),
  },
}));

const mockThemesRepository = themesRepository as jest.Mocked<
  typeof themesRepository
>;

describe('ThemesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all themes when activeOnly is false', async () => {
      const mockThemes: FormTheme[] = [
        {
          id: '1',
          name: 'Theme 1',
          description: 'Description 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#007bff',
              secondaryColor: '#6c757d',
              backgroundColor: '#ffffff',
              textColorPrimary: '#212529',
              textColorSecondary: '#6c757d',
              fontFamilyHeading: 'Roboto',
              fontFamilyBody: 'Open Sans',
              fieldBorderRadius: '8px',
              fieldSpacing: '16px',
              containerBackground: '#f8f9fa',
              containerOpacity: 0.95,
              containerPosition: 'center',
            },
          },
          usageCount: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Theme 2',
          description: 'Description 2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#28a745',
              secondaryColor: '#6c757d',
              backgroundColor: '#ffffff',
              textColorPrimary: '#212529',
              textColorSecondary: '#6c757d',
              fontFamilyHeading: 'Roboto',
              fontFamilyBody: 'Open Sans',
              fieldBorderRadius: '8px',
              fieldSpacing: '16px',
              containerBackground: '#f8f9fa',
              containerOpacity: 0.95,
              containerPosition: 'center',
            },
          },
          usageCount: 5,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockThemesRepository.findAll.mockResolvedValue(mockThemes);

      const result = await themesService.findAll(false);

      expect(mockThemesRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual(mockThemes);
    });

    it('should return only active themes when activeOnly is true', async () => {
      const mockActiveThemes: FormTheme[] = [
        {
          id: '1',
          name: 'Active Theme',
          description: 'Active description',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          themeConfig: {
            desktop: {
              primaryColor: '#007bff',
              secondaryColor: '#6c757d',
              backgroundColor: '#ffffff',
              textColorPrimary: '#212529',
              textColorSecondary: '#6c757d',
              fontFamilyHeading: 'Roboto',
              fontFamilyBody: 'Open Sans',
              fieldBorderRadius: '8px',
              fieldSpacing: '16px',
              containerBackground: '#f8f9fa',
              containerOpacity: 0.95,
              containerPosition: 'center',
            },
          },
          usageCount: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockThemesRepository.findAll.mockResolvedValue(mockActiveThemes);

      const result = await themesService.findAll(true);

      expect(mockThemesRepository.findAll).toHaveBeenCalledWith(true);
      expect(result).toEqual(mockActiveThemes);
    });

    it('should default to activeOnly true when no parameter provided', async () => {
      const mockThemes: FormTheme[] = [];
      mockThemesRepository.findAll.mockResolvedValue(mockThemes);

      await themesService.findAll();

      expect(mockThemesRepository.findAll).toHaveBeenCalledWith(true);
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Database connection failed');
      mockThemesRepository.findAll.mockRejectedValue(error);

      await expect(themesService.findAll()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('findById', () => {
    it('should return theme when found', async () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'Test description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
        usageCount: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockThemesRepository.findById.mockResolvedValue(mockTheme);

      const result = await themesService.findById('1');

      expect(mockThemesRepository.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockTheme);
    });

    it('should return null when theme not found', async () => {
      mockThemesRepository.findById.mockResolvedValue(null);

      const result = await themesService.findById('nonexistent');

      expect(mockThemesRepository.findById).toHaveBeenCalledWith('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Database error');
      mockThemesRepository.findById.mockRejectedValue(error);

      await expect(themesService.findById('1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('create', () => {
    it('should create theme with valid data', async () => {
      const createRequest: CreateThemeRequest = {
        name: 'New Theme',
        description: 'New theme description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
      };

      const createdTheme: FormTheme = {
        id: 'new-id',
        ...createRequest,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockThemesRepository.create.mockResolvedValue(createdTheme);

      const result = await themesService.create(createRequest);

      expect(mockThemesRepository.create).toHaveBeenCalledWith(createRequest);
      expect(result).toEqual(createdTheme);
    });

    it('should throw error when repository fails', async () => {
      const createRequest: CreateThemeRequest = {
        name: 'New Theme',
        description: 'New theme description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
      };

      const error = new Error('Creation failed');
      mockThemesRepository.create.mockRejectedValue(error);

      await expect(themesService.create(createRequest)).rejects.toThrow(
        'Creation failed'
      );
    });
  });

  describe('update', () => {
    it('should update theme with valid data', async () => {
      const updateRequest: UpdateThemeRequest = {
        name: 'Updated Theme',
        description: 'Updated description',
      };

      const updatedTheme: FormTheme = {
        id: '1',
        name: 'Updated Theme',
        description: 'Updated description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
        usageCount: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockThemesRepository.update.mockResolvedValue(updatedTheme);

      const result = await themesService.update('1', updateRequest);

      expect(mockThemesRepository.update).toHaveBeenCalledWith(
        '1',
        updateRequest
      );
      expect(result).toEqual(updatedTheme);
    });

    it('should throw error when repository fails', async () => {
      const updateRequest: UpdateThemeRequest = {
        name: 'Updated Theme',
      };

      const error = new Error('Update failed');
      mockThemesRepository.update.mockRejectedValue(error);

      await expect(themesService.update('1', updateRequest)).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete theme', async () => {
      mockThemesRepository.softDelete.mockResolvedValue(true);

      await themesService.softDelete('1');

      expect(mockThemesRepository.softDelete).toHaveBeenCalledWith('1');
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Delete failed');
      mockThemesRepository.softDelete.mockRejectedValue(error);

      await expect(themesService.softDelete('1')).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count and return updated theme', async () => {
      const updatedTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'Test description',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColorPrimary: '#212529',
            textColorSecondary: '#6c757d',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#f8f9fa',
            containerOpacity: 0.95,
            containerPosition: 'center',
          },
        },
        usageCount: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockThemesRepository.incrementUsageCount.mockResolvedValue(updatedTheme);

      const result = await themesService.incrementUsage('1');

      expect(mockThemesRepository.incrementUsageCount).toHaveBeenCalledWith(
        '1'
      );
      expect(result).toEqual(updatedTheme);
    });

    it('should throw error when repository fails', async () => {
      const error = new Error('Increment failed');
      mockThemesRepository.incrementUsageCount.mockRejectedValue(error);

      await expect(themesService.incrementUsage('1')).rejects.toThrow(
        'Increment failed'
      );
    });
  });
});
