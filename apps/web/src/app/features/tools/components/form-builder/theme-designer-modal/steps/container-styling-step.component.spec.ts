import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerStylingStepComponent } from './container-styling-step.component';
import { ThemeDesignerModalService } from '../theme-designer-modal.service';
import { signal } from '@angular/core';

/**
 * Unit tests for ContainerStylingStepComponent.
 * Verifies rendering, signal bindings, and user interactions.
 */
describe('ContainerStylingStepComponent', () => {
  let component: ContainerStylingStepComponent;
  let fixture: ComponentFixture<ContainerStylingStepComponent>;
  let mockThemeService: jasmine.SpyObj<ThemeDesignerModalService>;

  beforeEach(async () => {
    // Create spy object for ThemeDesignerModalService
    mockThemeService = jasmine.createSpyObj('ThemeDesignerModalService', [
      'reset',
      'nextStep',
      'previousStep',
      'goToStep',
      'canProceedToNextStep',
      'saveTheme',
      'hasUnsavedChanges',
      'loadTheme',
      'setEditMode',
      'isEditMode',
      'notifyThemeSaved',
      'getThemeName',
      'getBackgroundType',
      'getLabelColor',
      'getInputBackgroundColor',
      'getInputTextColor',
      'getBackgroundColor',
      'getGradientAngle',
      'getGradientColor1',
      'getGradientColor2',
      'getGradientPosition',
      'getBackgroundImageUrl',
    ]);

    // Mock the currentTheme signal
    (mockThemeService as any).currentTheme = signal({
      name: 'Test Theme',
      thumbnailUrl: 'https://example.com/thumb.png',
      themeConfig: {
        desktop: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: '#FFFFFF',
          labelColor: '#374151',
          inputBackgroundColor: '#FFFFFF',
          inputTextColor: '#1F2937',
          headingFont: 'Roboto',
          bodyFont: 'Open Sans',
          headingFontSize: 24,
          bodyFontSize: 16,
          borderRadius: 8,
          fieldPadding: 12,
          fieldSpacing: 16,
          borderWidth: 1,
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ContainerStylingStepComponent],
      providers: [{ provide: ThemeDesignerModalService, useValue: mockThemeService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ContainerStylingStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all control sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Verify section headers are present
    const sectionTitles = compiled.querySelectorAll('.section-title');
    expect(sectionTitles.length).toBeGreaterThanOrEqual(5);

    // Verify key sections exist
    const containerBgSection = Array.from(sectionTitles).find((el) =>
      el.textContent?.includes('Container Background'),
    );
    expect(containerBgSection).toBeTruthy();

    const borderSection = Array.from(sectionTitles).find((el) =>
      el.textContent?.includes('Border Controls'),
    );
    expect(borderSection).toBeTruthy();

    const shadowSection = Array.from(sectionTitles).find((el) =>
      el.textContent?.includes('Box Shadow'),
    );
    expect(shadowSection).toBeTruthy();

    const layoutSection = Array.from(sectionTitles).find((el) =>
      el.textContent?.includes('Container Layout'),
    );
    expect(layoutSection).toBeTruthy();

    const transparencySection = Array.from(sectionTitles).find((el) =>
      el.textContent?.includes('Transparency & Effects'),
    );
    expect(transparencySection).toBeTruthy();
  });

  it('should disable border controls when border toggle is off', () => {
    // Initially, border is disabled (default value is false)
    component['containerBorderEnabledValue'].set(false);
    fixture.detectChanges();

    // Border controls should not be visible
    const compiled = fixture.nativeElement as HTMLElement;
    const borderWidthSlider = compiled.querySelector('#borderWidth');
    expect(borderWidthSlider).toBeFalsy();

    // Enable border
    component['containerBorderEnabledValue'].set(true);
    fixture.detectChanges();

    // Border controls should now be visible
    const borderWidthSliderAfter = compiled.querySelector('#borderWidth');
    expect(borderWidthSliderAfter).toBeTruthy();
  });

  it('should show custom shadow controls when Custom preset selected', () => {
    // Enable shadow first
    component['containerShadowEnabledValue'].set(true);
    component['containerShadowPresetValue'].set('medium');
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    let customIntensity = compiled.querySelector('#shadowIntensity');
    expect(customIntensity).toBeFalsy();

    // Switch to custom preset
    component['containerShadowPresetValue'].set('custom');
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    customIntensity = compiled.querySelector('#shadowIntensity');
    expect(customIntensity).toBeTruthy();
  });

  it('should apply preset max-width values when preset buttons clicked', () => {
    const initialWidth = component['containerMaxWidthValue']();

    // Click mobile preset
    component.setMaxWidth(480);
    expect(component['containerMaxWidthValue']()).toBe(480);

    // Click tablet preset
    component.setMaxWidth(768);
    expect(component['containerMaxWidthValue']()).toBe(768);

    // Click desktop preset
    component.setMaxWidth(1024);
    expect(component['containerMaxWidthValue']()).toBe(1024);

    // Click full width preset
    component.setMaxWidth(1200);
    expect(component['containerMaxWidthValue']()).toBe(1200);
  });

  it('should update shadow preset when setShadowPreset is called', () => {
    // Set to subtle
    component.setShadowPreset('subtle');
    expect(component['containerShadowPresetValue']()).toBe('subtle');
    expect(component['containerShadowIntensityValue']()).toBe(3);

    // Set to medium
    component.setShadowPreset('medium');
    expect(component['containerShadowPresetValue']()).toBe('medium');
    expect(component['containerShadowIntensityValue']()).toBe(10);

    // Set to strong
    component.setShadowPreset('strong');
    expect(component['containerShadowPresetValue']()).toBe('strong');
    expect(component['containerShadowIntensityValue']()).toBe(20);

    // Set to custom (should not change intensity)
    const previousIntensity = component['containerShadowIntensityValue']();
    component.setShadowPreset('custom');
    expect(component['containerShadowPresetValue']()).toBe('custom');
    expect(component['containerShadowIntensityValue']()).toBe(previousIntensity);
  });

  it('should update live preview when controls change', () => {
    // Change background color
    component['containerBackgroundColorValue'].set('#FF0000');
    fixture.detectChanges();

    const previewContainerStyles = component['previewContainerStyles']();
    expect(previewContainerStyles['background-color']).toBe('#FF0000');

    // Change border
    component['containerBorderEnabledValue'].set(true);
    component['containerBorderWidthValue'].set(5);
    component['containerBorderColorValue'].set('#00FF00');
    component['containerBorderStyleValue'].set('dashed');
    fixture.detectChanges();

    const updatedStyles = component['previewContainerStyles']();
    expect(updatedStyles['border']).toContain('5px');
    expect(updatedStyles['border']).toContain('dashed');
    expect(updatedStyles['border']).toContain('#00FF00');
  });

  it('should validate image file size on upload', () => {
    spyOn(window, 'alert');

    // Create a mock file that exceeds 5MB
    const largeMockFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large-image.jpg', {
      type: 'image/jpeg',
    });

    // Create a mock event
    const mockEvent = {
      target: {
        files: [largeMockFile],
        value: 'large-image.jpg',
      },
    } as any;

    // Call handleImageUpload
    component.handleImageUpload(mockEvent);

    // Verify alert was called
    expect(window.alert).toHaveBeenCalledWith(
      'File size exceeds 5MB. Please choose a smaller image.',
    );

    // Verify input was reset
    expect(mockEvent.target.value).toBe('');
  });

  it('should remove background image when removeBackgroundImage is called', () => {
    // Set a background image
    component['containerBackgroundImageUrlValue'].set('data:image/png;base64,abc123');
    expect(component['containerBackgroundImageUrlValue']()).toBe('data:image/png;base64,abc123');

    // Remove it
    component.removeBackgroundImage();
    expect(component['containerBackgroundImageUrlValue']()).toBe('');
  });

  it('should compute shadow CSS correctly', () => {
    // Disable shadow
    component['containerShadowEnabledValue'].set(false);
    expect(component['computedShadow']()).toBe('none');

    // Enable shadow with subtle preset
    component['containerShadowEnabledValue'].set(true);
    component['containerShadowPresetValue'].set('subtle');
    const subtleShadow = component['computedShadow']();
    expect(subtleShadow).toContain('rgba');

    // Custom shadow
    component['containerShadowPresetValue'].set('custom');
    component['containerShadowIntensityValue'].set(15);
    component['containerShadowColorValue'].set('rgba(0, 0, 0, 0.2)');
    const customShadow = component['computedShadow']();
    expect(customShadow).toContain('15px');
    expect(customShadow).toContain('rgba(0, 0, 0, 0.2)');
  });

  it('should show backdrop blur controls when enabled', () => {
    component['containerBackdropBlurEnabledValue'].set(false);
    fixture.detectChanges();

    let compiled = fixture.nativeElement as HTMLElement;
    let blurIntensity = compiled.querySelector('#blurIntensity');
    expect(blurIntensity).toBeFalsy();

    // Enable backdrop blur
    component['containerBackdropBlurEnabledValue'].set(true);
    fixture.detectChanges();

    compiled = fixture.nativeElement as HTMLElement;
    blurIntensity = compiled.querySelector('#blurIntensity');
    expect(blurIntensity).toBeTruthy();
  });

  it('should have accessible ARIA labels on form controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    // Check for aria-label attributes
    const colorPickers = compiled.querySelectorAll('p-colorPicker');
    colorPickers.forEach((picker) => {
      expect(picker.getAttribute('aria-label')).toBeTruthy();
    });

    const sliders = compiled.querySelectorAll('p-slider');
    sliders.forEach((slider) => {
      expect(slider.getAttribute('aria-label')).toBeTruthy();
    });

    const switches = compiled.querySelectorAll('p-inputSwitch');
    switches.forEach((switchEl) => {
      expect(switchEl.getAttribute('aria-label')).toBeTruthy();
    });
  });
});
