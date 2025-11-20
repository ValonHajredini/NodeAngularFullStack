import { TestBed } from '@angular/core/testing';
import { ThemeDesignerModalService } from './theme-designer-modal.service';
import { FormsApiService } from '../forms-api.service';
import { of } from 'rxjs';

describe('ThemeDesignerModalService', () => {
  let service: ThemeDesignerModalService;
  let formsApiService: jasmine.SpyObj<FormsApiService>;

  beforeEach(() => {
    const formsApiSpy = jasmine.createSpyObj('FormsApiService', ['createTheme']);

    TestBed.configureTestingModule({
      providers: [ThemeDesignerModalService, { provide: FormsApiService, useValue: formsApiSpy }],
    });

    service = TestBed.inject(ThemeDesignerModalService);
    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.currentStep()).toBe(0);
    expect(service.getPrimaryColor()).toBe('#3B82F6');
    expect(service.getSecondaryColor()).toBe('#10B981');
    expect(service.getBackgroundType()).toBe('solid');
    expect(service.getBackgroundColor()).toBe('#FFFFFF');
    expect(service.getHeadingFont()).toBe('Roboto');
    expect(service.getBodyFont()).toBe('Open Sans');
    expect(service.getBorderRadius()).toBe(8);
    expect(service.getFieldPadding()).toBe(12);
    expect(service.getFieldSpacing()).toBe(8);
    expect(service.getBorderWidth()).toBe(1);
  });

  it('should advance to next step when validation passes', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    service.nextStep();

    expect(service.currentStep()).toBe(1);
  });

  it('should not advance to next step when validation fails', () => {
    service.setPrimaryColor('');
    service.setSecondaryColor('');

    service.nextStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should go to previous step', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.nextStep();
    expect(service.currentStep()).toBe(1);

    service.previousStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should not go below step 0', () => {
    expect(service.currentStep()).toBe(0);

    service.previousStep();

    expect(service.currentStep()).toBe(0);
  });

  it('should update theme values', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.setThemeName('Test Theme');

    expect(service.getPrimaryColor()).toBe('#FF0000');
    expect(service.getSecondaryColor()).toBe('#00FF00');
    expect(service.getThemeName()).toBe('Test Theme');
  });

  it('should compute currentTheme correctly', () => {
    service.setThemeName('Test Theme');
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    const theme = service.currentTheme();

    expect(theme.name).toBe('Test Theme');
    expect(theme.themeConfig.desktop.primaryColor).toBe('#FF0000');
    expect(theme.themeConfig.desktop.secondaryColor).toBe('#00FF00');
    expect(theme.themeConfig.desktop.backgroundColor).toBe('#FFFFFF');
  });

  it('should compute linear gradient background correctly', () => {
    service.setBackgroundType('linear');
    service.setGradientColor1('#FF0000');
    service.setGradientColor2('#00FF00');
    service.setGradientAngle(90);

    const theme = service.currentTheme();

    expect(theme.themeConfig.desktop.backgroundColor).toBe(
      'linear-gradient(90deg, #FF0000, #00FF00)',
    );
  });

  it('should compute radial gradient background correctly', () => {
    service.setBackgroundType('radial');
    service.setGradientColor1('#FF0000');
    service.setGradientColor2('#00FF00');
    service.setGradientPosition('top-left');

    const theme = service.currentTheme();

    expect(theme.themeConfig.desktop.backgroundColor).toBe(
      'radial-gradient(circle at top-left, #FF0000, #00FF00)',
    );
  });

  it('should use image URL for image background', () => {
    service.setBackgroundType('image');
    service.setBackgroundImageUrl('https://example.com/image.jpg');

    const theme = service.currentTheme();

    expect(theme.themeConfig.desktop.backgroundImageUrl).toBe('https://example.com/image.jpg');
  });

  it('should detect unsaved changes', () => {
    expect(service.hasUnsavedChanges()).toBe(false);

    service.setThemeName('Test Theme');

    expect(service.hasUnsavedChanges()).toBe(true);
  });

  it('should validate step 1 (colors)', () => {
    service.setPrimaryColor('');
    service.setSecondaryColor('');
    expect(service.canProceedToNextStep()).toBe(false);

    service.setPrimaryColor('#FF0000');
    expect(service.canProceedToNextStep()).toBe(false);

    service.setSecondaryColor('#00FF00');
    expect(service.canProceedToNextStep()).toBe(true);
  });

  it('should reset all values to defaults', () => {
    service.setThemeName('Test Theme');
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.setBackgroundType('linear');
    service.setHeadingFont('Arial');
    service.setBorderRadius(16);

    service.reset();

    expect(service.currentStep()).toBe(0);
    expect(service.getThemeName()).toBe('');
    expect(service.getPrimaryColor()).toBe('#3B82F6');
    expect(service.getSecondaryColor()).toBe('#10B981');
    expect(service.getBackgroundType()).toBe('solid');
    expect(service.getBackgroundColor()).toBe('#FFFFFF');
    expect(service.getHeadingFont()).toBe('Roboto');
    expect(service.getBorderRadius()).toBe(8);
  });

  it('should call FormsApiService.createTheme when saving', () => {
    const mockTheme = { id: '123', name: 'Test Theme' } as any;
    formsApiService.createTheme.and.returnValue(of(mockTheme));

    service.setThemeName('Test Theme');
    service.saveTheme().subscribe((theme) => {
      expect(theme).toEqual(mockTheme);
    });

    expect(formsApiService.createTheme).toHaveBeenCalled();
  });

  it('should validate theme name length (max 50 chars)', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');
    service.nextStep();
    service.nextStep();
    service.nextStep();
    service.nextStep(); // Navigate to step 4 (Preview & Save)

    service.setThemeName('A'.repeat(51));
    expect(service.canProceedToNextStep()).toBe(false);

    service.setThemeName('A'.repeat(50));
    expect(service.canProceedToNextStep()).toBe(true);

    service.setThemeName('Valid Theme Name');
    expect(service.canProceedToNextStep()).toBe(true);
  });

  it('should not advance past step 4', () => {
    service.setPrimaryColor('#FF0000');
    service.setSecondaryColor('#00FF00');

    for (let i = 0; i < 10; i++) {
      service.nextStep();
    }

    expect(service.currentStep()).toBe(4);
  });

  // ===== Epic 25: Container Styling Tests (Story 25.2, AC 10) =====

  describe('Container Styling - Initialization (AC 10)', () => {
    it('should initialize container styling signals with default values', () => {
      // Background properties
      expect(service.getContainerBackgroundColor()).toBe('#FFFFFF');
      expect(service.getContainerBackgroundImageUrl()).toBe('');
      expect(service.getContainerBackgroundSize()).toBe('cover');
      expect(service.getContainerBackgroundPositionX()).toBe(50);
      expect(service.getContainerBackgroundPositionY()).toBe(50);

      // Border properties
      expect(service.getContainerBorderEnabled()).toBe(false);
      expect(service.getContainerBorderWidth()).toBe(1);
      expect(service.getContainerBorderColor()).toBe('#D1D5DB');
      expect(service.getContainerBorderRadius()).toBe(8);
      expect(service.getContainerBorderStyle()).toBe('solid');

      // Shadow properties
      expect(service.getContainerShadowEnabled()).toBe(false);
      expect(service.getContainerShadowPreset()).toBe('medium');
      expect(service.getContainerShadowIntensity()).toBe(10);
      expect(service.getContainerShadowColor()).toBe('rgba(0, 0, 0, 0.1)');
      expect(service.getContainerShadowOffsetX()).toBe(0);
      expect(service.getContainerShadowOffsetY()).toBe(4);
      expect(service.getContainerShadowBlur()).toBe(6);
      expect(service.getContainerShadowSpread()).toBe(0);

      // Layout properties
      expect(service.getContainerAlignmentHorizontal()).toBe('center');
      expect(service.getContainerAlignmentVertical()).toBe('center');
      expect(service.getContainerMaxWidth()).toBe(1024);

      // Effects properties
      expect(service.getContainerOpacityValue()).toBe(100);
      expect(service.getContainerBackdropBlurEnabled()).toBe(false);
      expect(service.getContainerBackdropBlurIntensity()).toBe(0);
    });
  });

  describe('Container Styling - Setters Update Signals (AC 10)', () => {
    it('should update container background color via setter', () => {
      service.setContainerBackgroundColor('#FF5733');
      expect(service.getContainerBackgroundColor()).toBe('#FF5733');
    });

    it('should update container background image URL via setter', () => {
      const imageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
      service.setContainerBackgroundImageUrl(imageUrl);
      expect(service.getContainerBackgroundImageUrl()).toBe(imageUrl);
    });

    it('should update container background size via setter', () => {
      service.setContainerBackgroundSize('contain');
      expect(service.getContainerBackgroundSize()).toBe('contain');

      service.setContainerBackgroundSize('repeat');
      expect(service.getContainerBackgroundSize()).toBe('repeat');
    });

    it('should update container border enabled via setter', () => {
      service.setContainerBorderEnabled(true);
      expect(service.getContainerBorderEnabled()).toBe(true);

      service.setContainerBorderEnabled(false);
      expect(service.getContainerBorderEnabled()).toBe(false);
    });

    it('should update container border color via setter', () => {
      service.setContainerBorderColor('#FF0000');
      expect(service.getContainerBorderColor()).toBe('#FF0000');
    });

    it('should update container border style via setter', () => {
      service.setContainerBorderStyle('dashed');
      expect(service.getContainerBorderStyle()).toBe('dashed');

      service.setContainerBorderStyle('dotted');
      expect(service.getContainerBorderStyle()).toBe('dotted');
    });

    it('should update container shadow enabled via setter', () => {
      service.setContainerShadowEnabled(true);
      expect(service.getContainerShadowEnabled()).toBe(true);
    });

    it('should update container shadow preset via setter', () => {
      service.setContainerShadowPreset('strong');
      expect(service.getContainerShadowPreset()).toBe('strong');

      service.setContainerShadowPreset('subtle');
      expect(service.getContainerShadowPreset()).toBe('subtle');
    });

    it('should update container shadow color via setter', () => {
      service.setContainerShadowColor('rgba(255, 0, 0, 0.5)');
      expect(service.getContainerShadowColor()).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should update container alignment horizontal via setter', () => {
      service.setContainerAlignmentHorizontal('left');
      expect(service.getContainerAlignmentHorizontal()).toBe('left');

      service.setContainerAlignmentHorizontal('right');
      expect(service.getContainerAlignmentHorizontal()).toBe('right');
    });

    it('should update container alignment vertical via setter', () => {
      service.setContainerAlignmentVertical('top');
      expect(service.getContainerAlignmentVertical()).toBe('top');

      service.setContainerAlignmentVertical('bottom');
      expect(service.getContainerAlignmentVertical()).toBe('bottom');
    });

    it('should update container backdrop blur enabled via setter', () => {
      service.setContainerBackdropBlurEnabled(true);
      expect(service.getContainerBackdropBlurEnabled()).toBe(true);
    });
  });

  describe('Container Styling - Numeric Value Clamping (AC 10)', () => {
    it('should clamp container background position X to 0-100 range', () => {
      service.setContainerBackgroundPositionX(150);
      expect(service.getContainerBackgroundPositionX()).toBe(100);

      service.setContainerBackgroundPositionX(-20);
      expect(service.getContainerBackgroundPositionX()).toBe(0);

      service.setContainerBackgroundPositionX(75);
      expect(service.getContainerBackgroundPositionX()).toBe(75);
    });

    it('should clamp container background position Y to 0-100 range', () => {
      service.setContainerBackgroundPositionY(999);
      expect(service.getContainerBackgroundPositionY()).toBe(100);

      service.setContainerBackgroundPositionY(-5);
      expect(service.getContainerBackgroundPositionY()).toBe(0);

      service.setContainerBackgroundPositionY(50);
      expect(service.getContainerBackgroundPositionY()).toBe(50);
    });

    it('should clamp container border width to 0-10 range', () => {
      service.setContainerBorderWidth(999);
      expect(service.getContainerBorderWidth()).toBe(10);

      service.setContainerBorderWidth(-5);
      expect(service.getContainerBorderWidth()).toBe(0);

      service.setContainerBorderWidth(5);
      expect(service.getContainerBorderWidth()).toBe(5);
    });

    it('should clamp container border radius to 0-50 range', () => {
      service.setContainerBorderRadius(100);
      expect(service.getContainerBorderRadius()).toBe(50);

      service.setContainerBorderRadius(-10);
      expect(service.getContainerBorderRadius()).toBe(0);

      service.setContainerBorderRadius(25);
      expect(service.getContainerBorderRadius()).toBe(25);
    });

    it('should clamp container shadow intensity to 0-30 range', () => {
      service.setContainerShadowIntensity(50);
      expect(service.getContainerShadowIntensity()).toBe(30);

      service.setContainerShadowIntensity(-5);
      expect(service.getContainerShadowIntensity()).toBe(0);

      service.setContainerShadowIntensity(15);
      expect(service.getContainerShadowIntensity()).toBe(15);
    });

    it('should clamp container max width to 300-1200 range', () => {
      service.setContainerMaxWidth(2000);
      expect(service.getContainerMaxWidth()).toBe(1200);

      service.setContainerMaxWidth(100);
      expect(service.getContainerMaxWidth()).toBe(300);

      service.setContainerMaxWidth(800);
      expect(service.getContainerMaxWidth()).toBe(800);
    });

    it('should clamp container opacity to 0-100 range', () => {
      service.setContainerOpacityValue(150);
      expect(service.getContainerOpacityValue()).toBe(100);

      service.setContainerOpacityValue(-20);
      expect(service.getContainerOpacityValue()).toBe(0);

      service.setContainerOpacityValue(75);
      expect(service.getContainerOpacityValue()).toBe(75);
    });

    it('should clamp container backdrop blur intensity to 0-20 range', () => {
      service.setContainerBackdropBlurIntensity(50);
      expect(service.getContainerBackdropBlurIntensity()).toBe(20);

      service.setContainerBackdropBlurIntensity(-5);
      expect(service.getContainerBackdropBlurIntensity()).toBe(0);

      service.setContainerBackdropBlurIntensity(10);
      expect(service.getContainerBackdropBlurIntensity()).toBe(10);
    });

    it('should allow shadow offset values without clamping (can be negative)', () => {
      service.setContainerShadowOffsetX(-15);
      expect(service.getContainerShadowOffsetX()).toBe(-15);

      service.setContainerShadowOffsetX(20);
      expect(service.getContainerShadowOffsetX()).toBe(20);

      service.setContainerShadowOffsetY(-10);
      expect(service.getContainerShadowOffsetY()).toBe(-10);

      service.setContainerShadowOffsetY(15);
      expect(service.getContainerShadowOffsetY()).toBe(15);
    });

    it('should allow shadow blur and spread values without strict clamping', () => {
      service.setContainerShadowBlur(20);
      expect(service.getContainerShadowBlur()).toBe(20);

      service.setContainerShadowSpread(10);
      expect(service.getContainerShadowSpread()).toBe(10);
    });
  });

  describe('Container Styling - Computed Theme Inclusion (AC 10)', () => {
    it('should include all container styling properties in currentTheme computed signal', () => {
      // Set custom container styling values
      service.setContainerBackgroundColor('#F0F0F0');
      service.setContainerBackgroundImageUrl('https://example.com/bg.jpg');
      service.setContainerBackgroundSize('contain');
      service.setContainerBackgroundPositionX(25);
      service.setContainerBackgroundPositionY(75);
      service.setContainerBorderEnabled(true);
      service.setContainerBorderWidth(3);
      service.setContainerBorderColor('#333333');
      service.setContainerBorderRadius(12);
      service.setContainerBorderStyle('dashed');
      service.setContainerShadowEnabled(true);
      service.setContainerShadowPreset('strong');
      service.setContainerShadowIntensity(20);
      service.setContainerShadowColor('rgba(0, 0, 0, 0.3)');
      service.setContainerShadowOffsetX(5);
      service.setContainerShadowOffsetY(10);
      service.setContainerShadowBlur(15);
      service.setContainerShadowSpread(5);
      service.setContainerAlignmentHorizontal('left');
      service.setContainerAlignmentVertical('top');
      service.setContainerMaxWidth(900);
      service.setContainerOpacityValue(85);
      service.setContainerBackdropBlurEnabled(true);
      service.setContainerBackdropBlurIntensity(10);

      const theme = service.currentTheme();
      const desktop = theme.themeConfig.desktop;

      // Verify all 24 container properties are included
      expect(desktop.containerBackgroundColor).toBe('#F0F0F0');
      expect(desktop.containerBackgroundImageUrl).toBe('https://example.com/bg.jpg');
      expect(desktop.containerBackgroundSize).toBe('contain');
      expect(desktop.containerBackgroundPositionX).toBe(25);
      expect(desktop.containerBackgroundPositionY).toBe(75);
      expect(desktop.containerBorderEnabled).toBe(true);
      expect(desktop.containerBorderWidth).toBe(3);
      expect(desktop.containerBorderColor).toBe('#333333');
      expect(desktop.containerBorderRadius).toBe(12);
      expect(desktop.containerBorderStyle).toBe('dashed');
      expect(desktop.containerShadowEnabled).toBe(true);
      expect(desktop.containerShadowPreset).toBe('strong');
      expect(desktop.containerShadowIntensity).toBe(20);
      expect(desktop.containerShadowColor).toBe('rgba(0, 0, 0, 0.3)');
      expect(desktop.containerShadowOffsetX).toBe(5);
      expect(desktop.containerShadowOffsetY).toBe(10);
      expect(desktop.containerShadowBlur).toBe(15);
      expect(desktop.containerShadowSpread).toBe(5);
      expect(desktop.containerAlignmentHorizontal).toBe('left');
      expect(desktop.containerAlignmentVertical).toBe('top');
      expect(desktop.containerMaxWidth).toBe(900);
      expect(desktop.containerOpacity).toBe(85);
      expect(desktop.containerBackdropBlurEnabled).toBe(true);
      expect(desktop.containerBackdropBlurIntensity).toBe(10);
    });

    it('should set containerBackgroundImageUrl to undefined when empty string', () => {
      service.setContainerBackgroundImageUrl('');
      const theme = service.currentTheme();
      expect(theme.themeConfig.desktop.containerBackgroundImageUrl).toBeUndefined();
    });
  });

  describe('Container Styling - loadTheme Backward Compatibility (AC 10)', () => {
    it('should load container styling from existing theme', () => {
      const mockTheme = {
        id: 'test-123',
        name: 'Test Theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#FF0000',
            secondaryColor: '#00FF00',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#000000',
            textColorSecondary: '#666666',
            fontFamilyHeading: 'Arial',
            fontFamilyBody: 'Verdana',
            fieldBorderRadius: '10px',
            fieldSpacing: '20px',
            containerBackground: '#F5F5F5',
            containerPosition: 'center' as const,
            // Container styling properties
            containerBackgroundColor: '#FAFAFA',
            containerBackgroundImageUrl: 'https://example.com/container-bg.jpg',
            containerBackgroundSize: 'contain' as const,
            containerBackgroundPositionX: 30,
            containerBackgroundPositionY: 70,
            containerBorderEnabled: true,
            containerBorderWidth: 4,
            containerBorderColor: '#444444',
            containerBorderRadius: 16,
            containerBorderStyle: 'dotted' as const,
            containerShadowEnabled: true,
            containerShadowPreset: 'strong' as const,
            containerShadowIntensity: 25,
            containerShadowColor: 'rgba(0, 0, 0, 0.4)',
            containerShadowOffsetX: 8,
            containerShadowOffsetY: 12,
            containerShadowBlur: 20,
            containerShadowSpread: 6,
            containerAlignmentHorizontal: 'right' as const,
            containerAlignmentVertical: 'bottom' as const,
            containerMaxWidth: 1100,
            containerOpacity: 90,
            containerBackdropBlurEnabled: true,
            containerBackdropBlurIntensity: 15,
          },
        },
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: false,
      };

      service.loadTheme(mockTheme as any);

      // Verify all 24 container properties loaded correctly
      expect(service.getContainerBackgroundColor()).toBe('#FAFAFA');
      expect(service.getContainerBackgroundImageUrl()).toBe('https://example.com/container-bg.jpg');
      expect(service.getContainerBackgroundSize()).toBe('contain');
      expect(service.getContainerBackgroundPositionX()).toBe(30);
      expect(service.getContainerBackgroundPositionY()).toBe(70);
      expect(service.getContainerBorderEnabled()).toBe(true);
      expect(service.getContainerBorderWidth()).toBe(4);
      expect(service.getContainerBorderColor()).toBe('#444444');
      expect(service.getContainerBorderRadius()).toBe(16);
      expect(service.getContainerBorderStyle()).toBe('dotted');
      expect(service.getContainerShadowEnabled()).toBe(true);
      expect(service.getContainerShadowPreset()).toBe('strong');
      expect(service.getContainerShadowIntensity()).toBe(25);
      expect(service.getContainerShadowColor()).toBe('rgba(0, 0, 0, 0.4)');
      expect(service.getContainerShadowOffsetX()).toBe(8);
      expect(service.getContainerShadowOffsetY()).toBe(12);
      expect(service.getContainerShadowBlur()).toBe(20);
      expect(service.getContainerShadowSpread()).toBe(6);
      expect(service.getContainerAlignmentHorizontal()).toBe('right');
      expect(service.getContainerAlignmentVertical()).toBe('bottom');
      expect(service.getContainerMaxWidth()).toBe(1100);
      expect(service.getContainerOpacityValue()).toBe(90);
      expect(service.getContainerBackdropBlurEnabled()).toBe(true);
      expect(service.getContainerBackdropBlurIntensity()).toBe(15);
    });

    it('should handle missing container properties with default fallbacks (backward compatibility)', () => {
      const legacyTheme = {
        id: 'legacy-123',
        name: 'Legacy Theme',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        themeConfig: {
          desktop: {
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            backgroundColor: '#FFFFFF',
            textColorPrimary: '#1F2937',
            textColorSecondary: '#6B7280',
            fontFamilyHeading: 'Roboto',
            fontFamilyBody: 'Open Sans',
            fieldBorderRadius: '8px',
            fieldSpacing: '16px',
            containerBackground: '#FFFFFF',
            containerPosition: 'center' as const,
            // NO container styling properties (pre-Epic 25 theme)
          },
        },
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: false,
      };

      // Should not throw error when loading theme without container properties
      expect(() => service.loadTheme(legacyTheme as any)).not.toThrow();

      // Verify default values are applied via nullish coalescing
      expect(service.getContainerBackgroundColor()).toBe('#FFFFFF');
      expect(service.getContainerBackgroundImageUrl()).toBe('');
      expect(service.getContainerBackgroundSize()).toBe('cover');
      expect(service.getContainerBackgroundPositionX()).toBe(50);
      expect(service.getContainerBackgroundPositionY()).toBe(50);
      expect(service.getContainerBorderEnabled()).toBe(false);
      expect(service.getContainerBorderWidth()).toBe(1);
      expect(service.getContainerBorderColor()).toBe('#D1D5DB');
      expect(service.getContainerBorderRadius()).toBe(8);
      expect(service.getContainerBorderStyle()).toBe('solid');
      expect(service.getContainerShadowEnabled()).toBe(false);
      expect(service.getContainerShadowPreset()).toBe('medium');
      expect(service.getContainerShadowIntensity()).toBe(10);
      expect(service.getContainerShadowColor()).toBe('rgba(0, 0, 0, 0.1)');
      expect(service.getContainerShadowOffsetX()).toBe(0);
      expect(service.getContainerShadowOffsetY()).toBe(4);
      expect(service.getContainerShadowBlur()).toBe(6);
      expect(service.getContainerShadowSpread()).toBe(0);
      expect(service.getContainerAlignmentHorizontal()).toBe('center');
      expect(service.getContainerAlignmentVertical()).toBe('center');
      expect(service.getContainerMaxWidth()).toBe(1024);
      expect(service.getContainerOpacityValue()).toBe(100);
      expect(service.getContainerBackdropBlurEnabled()).toBe(false);
      expect(service.getContainerBackdropBlurIntensity()).toBe(0);
    });
  });

  describe('Container Styling - Reset Methods (AC 10)', () => {
    it('should reset all container styling signals in reset() method', () => {
      // Modify all container styling properties
      service.setContainerBackgroundColor('#000000');
      service.setContainerBackgroundImageUrl('https://example.com/test.jpg');
      service.setContainerBackgroundSize('repeat');
      service.setContainerBackgroundPositionX(80);
      service.setContainerBackgroundPositionY(20);
      service.setContainerBorderEnabled(true);
      service.setContainerBorderWidth(10);
      service.setContainerBorderColor('#FF0000');
      service.setContainerBorderRadius(50);
      service.setContainerBorderStyle('double');
      service.setContainerShadowEnabled(true);
      service.setContainerShadowPreset('custom');
      service.setContainerShadowIntensity(30);
      service.setContainerShadowColor('rgba(255, 0, 0, 1)');
      service.setContainerShadowOffsetX(20);
      service.setContainerShadowOffsetY(20);
      service.setContainerShadowBlur(30);
      service.setContainerShadowSpread(10);
      service.setContainerAlignmentHorizontal('left');
      service.setContainerAlignmentVertical('top');
      service.setContainerMaxWidth(300);
      service.setContainerOpacityValue(50);
      service.setContainerBackdropBlurEnabled(true);
      service.setContainerBackdropBlurIntensity(20);

      // Reset all wizard state
      service.reset();

      // Verify all container styling signals reset to defaults
      expect(service.getContainerBackgroundColor()).toBe('#FFFFFF');
      expect(service.getContainerBackgroundImageUrl()).toBe('');
      expect(service.getContainerBackgroundSize()).toBe('cover');
      expect(service.getContainerBackgroundPositionX()).toBe(50);
      expect(service.getContainerBackgroundPositionY()).toBe(50);
      expect(service.getContainerBorderEnabled()).toBe(false);
      expect(service.getContainerBorderWidth()).toBe(1);
      expect(service.getContainerBorderColor()).toBe('#D1D5DB');
      expect(service.getContainerBorderRadius()).toBe(8);
      expect(service.getContainerBorderStyle()).toBe('solid');
      expect(service.getContainerShadowEnabled()).toBe(false);
      expect(service.getContainerShadowPreset()).toBe('medium');
      expect(service.getContainerShadowIntensity()).toBe(10);
      expect(service.getContainerShadowColor()).toBe('rgba(0, 0, 0, 0.1)');
      expect(service.getContainerShadowOffsetX()).toBe(0);
      expect(service.getContainerShadowOffsetY()).toBe(4);
      expect(service.getContainerShadowBlur()).toBe(6);
      expect(service.getContainerShadowSpread()).toBe(0);
      expect(service.getContainerAlignmentHorizontal()).toBe('center');
      expect(service.getContainerAlignmentVertical()).toBe('center');
      expect(service.getContainerMaxWidth()).toBe(1024);
      expect(service.getContainerOpacityValue()).toBe(100);
      expect(service.getContainerBackdropBlurEnabled()).toBe(false);
      expect(service.getContainerBackdropBlurIntensity()).toBe(0);
    });

    it('should reset only container styling in clearContainerStyling() method', () => {
      // Set non-container values
      service.setThemeName('My Theme');
      service.setPrimaryColor('#FF0000');
      service.setSecondaryColor('#00FF00');

      // Set container styling values
      service.setContainerBackgroundColor('#000000');
      service.setContainerBorderEnabled(true);
      service.setContainerBorderWidth(5);
      service.setContainerShadowEnabled(true);
      service.setContainerMaxWidth(800);

      // Clear only container styling
      service.clearContainerStyling();

      // Verify non-container values are preserved
      expect(service.getThemeName()).toBe('My Theme');
      expect(service.getPrimaryColor()).toBe('#FF0000');
      expect(service.getSecondaryColor()).toBe('#00FF00');

      // Verify container styling reset to defaults
      expect(service.getContainerBackgroundColor()).toBe('#FFFFFF');
      expect(service.getContainerBorderEnabled()).toBe(false);
      expect(service.getContainerBorderWidth()).toBe(1);
      expect(service.getContainerShadowEnabled()).toBe(false);
      expect(service.getContainerMaxWidth()).toBe(1024);
    });
  });
});
