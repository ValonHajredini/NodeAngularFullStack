import { TestBed } from '@angular/core/testing';
import { ThemePreviewService } from './theme-preview.service';
import { FormTheme, ResponsiveThemeConfig, ThemeProperties } from '@nodeangularfullstack/shared';

describe('ThemePreviewService', () => {
  let service: ThemePreviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemePreviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyThemeCss', () => {
    it('should set CSS variables on document root', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
            inputBackgroundColor: '#FAFAFA',
            inputTextColor: '#222222',
            labelColor: '#444444',
          },
        },
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary-color')).toBe('#FF5733');
      expect(root.style.getPropertyValue('--theme-secondary-color')).toBe('#33FF57');
      expect(root.style.getPropertyValue('--theme-bg-color')).toBe('#FFFFFF');
      expect(root.style.getPropertyValue('--theme-text-primary')).toBe('#000000');
      expect(root.style.getPropertyValue('--theme-text-secondary')).toBe('#666666');
      expect(root.style.getPropertyValue('--theme-font-heading')).toBe('Arial, sans-serif');
      expect(root.style.getPropertyValue('--theme-font-body')).toBe('Helvetica, sans-serif');
      expect(root.style.getPropertyValue('--theme-field-radius')).toBe('8px');
      expect(root.style.getPropertyValue('--theme-field-spacing')).toBe('12px');
      expect(root.style.getPropertyValue('--theme-container-bg')).toBe('#F5F5F5');
      expect(root.style.getPropertyValue('--theme-container-opacity')).toBe('0.9');
      expect(root.style.getPropertyValue('--theme-input-background')).toBe('#FAFAFA');
      expect(root.style.getPropertyValue('--theme-input-text-color')).toBe('#222222');
      expect(root.style.getPropertyValue('--theme-label-color')).toBe('#444444');
      expect(root.style.getPropertyValue('--theme-background-image')).toBe('none');
    });

    it('should apply mobile overrides when mobile config exists', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
          mobile: {
            primaryColor: '#FF0000',
            secondaryColor: '#00FF00',
            fieldBorderRadius: '4px',
            fieldSpacing: '8px',
            inputBackgroundColor: '#EFEFEF',
            inputTextColor: '#123456',
            labelColor: '#654321',
          },
        },
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      // Check that mobile style element was created
      const mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeTruthy();
      expect(mobileStyle?.textContent).toContain('@media (max-width: 767px)');
      expect(mobileStyle?.textContent).toContain('--theme-primary-color: #FF0000');
      expect(mobileStyle?.textContent).toContain('--theme-secondary-color: #00FF00');
      expect(mobileStyle?.textContent).toContain('--theme-field-radius: 4px');
      expect(mobileStyle?.textContent).toContain('--theme-field-spacing: 8px');
      expect(mobileStyle?.textContent).toContain('--theme-input-background: #EFEFEF');
      expect(mobileStyle?.textContent).toContain('--theme-input-text-color: #123456');
      expect(mobileStyle?.textContent).toContain('--theme-label-color: #654321');
    });

    it('should not create mobile style element when mobile config is undefined', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
        },
        usageCount: 0,
        isActive: true,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      // Check that no mobile style element was created
      const mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeFalsy();
    });

    it('should apply background image when provided', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Image Theme',
        description: 'Theme with background image',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            backgroundImageUrl: 'https://example.com/bg.jpg',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
        },
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-background-image')).toBe(
        'url(https://example.com/bg.jpg)',
      );
    });
  });

  describe('clearThemeCss', () => {
    it('should remove all CSS variables', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
        },
        usageCount: 0,
        isActive: true,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply theme first
      service.applyThemeCss(mockTheme);

      // Verify variables are set
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary-color')).toBe('#FF5733');

      // Clear theme
      service.clearThemeCss();

      // Verify variables are removed
      expect(root.style.getPropertyValue('--theme-primary-color')).toBe('');
      expect(root.style.getPropertyValue('--theme-secondary-color')).toBe('');
      expect(root.style.getPropertyValue('--theme-bg-color')).toBe('');
      expect(root.style.getPropertyValue('--theme-text-primary')).toBe('');
      expect(root.style.getPropertyValue('--theme-text-secondary')).toBe('');
      expect(root.style.getPropertyValue('--theme-font-heading')).toBe('');
      expect(root.style.getPropertyValue('--theme-font-body')).toBe('');
      expect(root.style.getPropertyValue('--theme-field-radius')).toBe('');
      expect(root.style.getPropertyValue('--theme-field-spacing')).toBe('');
      expect(root.style.getPropertyValue('--theme-container-bg')).toBe('');
      expect(root.style.getPropertyValue('--theme-container-opacity')).toBe('');
    });

    it('should remove mobile overrides style element', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
          mobile: {
            primaryColor: '#FF0000',
            fieldBorderRadius: '4px',
          },
        },
        usageCount: 0,
        isActive: true,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply theme with mobile overrides
      service.applyThemeCss(mockTheme);

      // Verify mobile style element exists
      let mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeTruthy();

      // Clear theme
      service.clearThemeCss();

      // Verify mobile style element is removed
      mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeFalsy();
    });
  });

  describe('mobile overrides handling', () => {
    it('should handle partial mobile properties', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
          mobile: {
            primaryColor: '#FF0000',
            // Only override primary color, leave others as desktop defaults
          },
        },
        usageCount: 0,
        isActive: true,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      const mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeTruthy();
      expect(mobileStyle?.textContent).toContain('--theme-primary-color: #FF0000');
      // Should not contain other properties that weren't overridden
      expect(mobileStyle?.textContent).not.toContain('--theme-secondary-color:');
    });

    it('should handle empty mobile properties object', () => {
      const mockTheme: FormTheme = {
        id: '1',
        name: 'Test Theme',
        description: 'A test theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF5733',
            secondaryColor: '#33FF57',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial, sans-serif',
            fontFamilyBody: 'Helvetica, sans-serif',
            fieldBorderRadius: '8px',
            fieldSpacing: '12px',
            containerBackground: '#F5F5F5',
            containerOpacity: 0.9,
            containerPosition: 'center',
          },
          mobile: {},
        },
        usageCount: 0,
        isActive: true,
        isCustom: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.applyThemeCss(mockTheme);

      // Should not create mobile style element for empty mobile config
      const mobileStyle = document.getElementById('theme-mobile-overrides');
      expect(mobileStyle).toBeFalsy();
    });
  });

  afterEach(() => {
    // Clean up any style elements created during tests
    const mobileStyle = document.getElementById('theme-mobile-overrides');
    if (mobileStyle) {
      mobileStyle.remove();
    }

    // Clear any CSS variables set during tests
    const root = document.documentElement;
    const themeVars = [
      '--theme-primary-color',
      '--theme-secondary-color',
      '--theme-bg-color',
      '--theme-text-primary',
      '--theme-text-secondary',
      '--theme-font-heading',
      '--theme-font-body',
      '--theme-field-radius',
      '--theme-field-spacing',
      '--theme-container-bg',
      '--theme-container-opacity',
    ];
    themeVars.forEach((varName) => {
      root.style.removeProperty(varName);
    });
  });
});
