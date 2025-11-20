import { FormTheme, ResponsiveThemeConfig, ThemeProperties, FormSettings, FormSchema } from '../forms.types';

describe('Theme Type Tests', () => {
  it('FormTheme should have all required properties', () => {
    const validTheme: FormTheme = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Theme',
      description: 'A test theme for validation',
      thumbnailUrl: 'https://spaces.example.com/theme-thumb.png',
      themeConfig: {
        desktop: {
          primaryColor: '#FF00FF',
          secondaryColor: '#00FFFF',
          backgroundColor: '#000000',
          textColorPrimary: '#FFFFFF',
          textColorSecondary: '#CCCCCC',
          fontFamilyHeading: 'Roboto',
          fontFamilyBody: 'Open Sans',
          fieldBorderRadius: '8px',
          fieldSpacing: '16px',
          containerBackground: '#1A1A1A',
          containerOpacity: 0.9,
          containerPosition: 'center',
          backgroundImageUrl: 'https://spaces.example.com/bg.jpg',
          backgroundImagePosition: 'cover',
        },
      },
      usageCount: 42,
      isActive: true,
      isCustom: false,
      createdBy: 'admin-user-id',
      createdAt: new Date('2025-01-15T10:00:00.000Z'),
      updatedAt: new Date('2025-01-15T10:00:00.000Z'),
    };

    expect(validTheme).toBeDefined();
    expect(validTheme.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(validTheme.name).toBe('Test Theme');
    expect(validTheme.themeConfig.desktop.primaryColor).toBe('#FF00FF');
    expect(validTheme.usageCount).toBe(42);
    expect(validTheme.isActive).toBe(true);
  });

  it('ResponsiveThemeConfig mobile should accept partial ThemeProperties', () => {
    const config: ResponsiveThemeConfig = {
      desktop: {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        backgroundColor: '#ffffff',
        textColorPrimary: '#212529',
        textColorSecondary: '#6c757d',
        fontFamilyHeading: 'Roboto',
        fontFamilyBody: 'Open Sans',
        fieldBorderRadius: '4px',
        fieldSpacing: '12px',
        containerBackground: '#f8f9fa',
        containerOpacity: 1.0,
        containerPosition: 'center',
      },
      mobile: { 
        primaryColor: '#FF0000', // Only override primary color on mobile
        fieldSpacing: '8px', // Override field spacing too
      },
    };
    
    expect(config).toBeDefined();
    expect(config.desktop.primaryColor).toBe('#007bff');
    expect(config.mobile?.primaryColor).toBe('#FF0000');
    expect(config.mobile?.fieldSpacing).toBe('8px');
    expect(config.mobile?.secondaryColor).toBeUndefined(); // Should be undefined since not overridden
  });

  it('FormSettings themeId should be optional (backward compatibility)', () => {
    const settingsWithoutTheme: FormSettings = {
      layout: {
        columns: 1,
        spacing: 'medium',
      },
      submission: {
        showSuccessMessage: true,
        allowMultipleSubmissions: false,
      },
      // No themeId - should still be valid
    };
    
    const settingsWithTheme: FormSettings = {
      layout: {
        columns: 2,
        spacing: 'large',
      },
      submission: {
        showSuccessMessage: true,
        allowMultipleSubmissions: true,
      },
      themeId: 'theme-uuid-here',
    };
    
    expect(settingsWithoutTheme).toBeDefined();
    expect(settingsWithoutTheme.themeId).toBeUndefined();
    expect(settingsWithTheme).toBeDefined();
    expect(settingsWithTheme.themeId).toBe('theme-uuid-here');
  });

  it('FormSchema theme property should be optional', () => {
    const schemaWithoutTheme: FormSchema = {
      id: 'schema-123',
      formId: 'form-456',
      version: 1,
      fields: [],
      settings: {
        layout: {
          columns: 1,
          spacing: 'medium',
        },
        submission: {
          showSuccessMessage: true,
          allowMultipleSubmissions: false,
        },
      },
      isPublished: false,
      createdAt: new Date('2025-01-15T10:00:00.000Z'),
      updatedAt: new Date('2025-01-15T10:00:00.000Z'),
    };

    const theme: FormTheme = {
      id: 'theme-789',
      name: 'Test Theme',
      thumbnailUrl: 'https://example.com/thumb.png',
      themeConfig: {
        desktop: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          backgroundColor: '#ffffff',
          textColorPrimary: '#212529',
          textColorSecondary: '#6c757d',
          fontFamilyHeading: 'Roboto',
          fontFamilyBody: 'Open Sans',
          fieldBorderRadius: '4px',
          fieldSpacing: '12px',
          containerBackground: '#f8f9fa',
          containerOpacity: 1.0,
          containerPosition: 'center',
        },
      },
      usageCount: 0,
      isActive: true,
      isCustom: false,
      createdAt: new Date('2025-01-15T10:00:00.000Z'),
      updatedAt: new Date('2025-01-15T10:00:00.000Z'),
    };

    const schemaWithTheme: FormSchema = {
      ...schemaWithoutTheme,
      theme: theme,
    };

    expect(schemaWithoutTheme).toBeDefined();
    expect(schemaWithoutTheme.theme).toBeUndefined();
    expect(schemaWithTheme).toBeDefined();
    expect(schemaWithTheme.theme).toBeDefined();
    expect(schemaWithTheme.theme?.id).toBe('theme-789');
    expect(schemaWithTheme.theme?.name).toBe('Test Theme');
  });

  it('ThemeProperties should validate all required fields', () => {
    const validProperties: ThemeProperties = {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      backgroundColor: '#ffffff',
      textColorPrimary: '#212529',
      textColorSecondary: '#6c757d',
      fontFamilyHeading: 'Roboto',
      fontFamilyBody: 'Open Sans',
      fieldBorderRadius: '4px',
      fieldSpacing: '12px',
      containerBackground: '#f8f9fa',
      containerOpacity: 1.0,
      containerPosition: 'center',
      backgroundImageUrl: 'https://example.com/bg.jpg',
      backgroundImagePosition: 'cover',
    };

    expect(validProperties).toBeDefined();
    expect(validProperties.primaryColor).toBe('#007bff');
    expect(validProperties.containerOpacity).toBe(1.0);
    expect(validProperties.containerPosition).toBe('center');
    expect(validProperties.backgroundImagePosition).toBe('cover');
  });

  it('FormTheme should handle optional fields correctly', () => {
    const minimalTheme: FormTheme = {
      id: 'minimal-theme',
      name: 'Minimal Theme',
      thumbnailUrl: 'https://example.com/minimal.png',
      themeConfig: {
        desktop: {
          primaryColor: '#000000',
          secondaryColor: '#ffffff',
          backgroundColor: '#ffffff',
          textColorPrimary: '#000000',
          textColorSecondary: '#666666',
          fontFamilyHeading: 'Arial',
          fontFamilyBody: 'Arial',
          fieldBorderRadius: '0px',
          fieldSpacing: '10px',
          containerBackground: '#ffffff',
          containerOpacity: 1.0,
          containerPosition: 'center',
        },
      },
      usageCount: 0,
      isActive: true,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Optional fields not provided
    };

    expect(minimalTheme).toBeDefined();
    expect(minimalTheme.description).toBeUndefined();
    expect(minimalTheme.createdBy).toBeUndefined();
    expect(minimalTheme.themeConfig.mobile).toBeUndefined();
  });
});
