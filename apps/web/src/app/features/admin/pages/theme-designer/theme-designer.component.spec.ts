import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { ThemeDesignerComponent } from './theme-designer.component';
import { ThemePreviewService } from '../../../tools/components/form-builder/theme-preview.service';
import { ThemeDesignerService } from '../../services/theme-designer.service';
import { FormTheme } from '@nodeangularfullstack/shared';

// Mock services
class MockThemePreviewService {
  applyThemeCss = jasmine.createSpy('applyThemeCss');
  clearThemeCss = jasmine.createSpy('clearThemeCss');
}

class MockThemeDesignerService {
  createCustomTheme = jasmine.createSpy('createCustomTheme').and.returnValue(
    of({
      id: 'test-theme',
      name: 'Test Theme',
      description: 'Test theme description',
    } as FormTheme),
  );
}

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockMessageService {
  add = jasmine.createSpy('add');
}

describe('ThemeDesignerComponent', () => {
  let component: ThemeDesignerComponent;
  let fixture: ComponentFixture<ThemeDesignerComponent>;
  let mockThemePreviewService: MockThemePreviewService;
  let mockThemeDesignerService: MockThemeDesignerService;
  let mockRouter: MockRouter;
  let mockMessageService: MockMessageService;

  beforeEach(async () => {
    mockThemePreviewService = new MockThemePreviewService();
    mockThemeDesignerService = new MockThemeDesignerService();
    mockRouter = new MockRouter();
    mockMessageService = new MockMessageService();

    await TestBed.configureTestingModule({
      imports: [ThemeDesignerComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        FormBuilder,
        { provide: ThemePreviewService, useValue: mockThemePreviewService },
        { provide: ThemeDesignerService, useValue: mockThemeDesignerService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
      expect(component.themeForm).toBeDefined();
      expect(component.themeForm.get('name')?.value).toBe('');
      expect(component.themeForm.get('primaryColor')?.value).toBe('#3B82F6');
      expect(component.themeForm.get('fieldBorderRadius')?.value).toBe(8);
      expect(component.themeForm.get('containerOpacity')?.value).toBe(1);
    });

    it('should set default background type to solid', () => {
      expect(component.backgroundType()).toBe('solid');
    });

    it('should set default preview mode to desktop', () => {
      expect(component.previewMode()).toBe('desktop');
    });
  });

  describe('Form Validation', () => {
    it('should require theme name', () => {
      const nameControl = component.themeForm.get('name');
      expect(nameControl?.hasError('required')).toBe(true);

      nameControl?.setValue('Test Theme');
      expect(nameControl?.hasError('required')).toBe(false);
    });

    it('should validate name max length', () => {
      const nameControl = component.themeForm.get('name');
      const longName = 'a'.repeat(101); // Exceeds 100 character limit

      nameControl?.setValue(longName);
      expect(nameControl?.hasError('maxlength')).toBe(true);

      nameControl?.setValue('Valid Name');
      expect(nameControl?.hasError('maxlength')).toBe(false);
    });

    it('should validate field border radius range', () => {
      const radiusControl = component.themeForm.get('fieldBorderRadius');

      radiusControl?.setValue(-1);
      expect(radiusControl?.hasError('min')).toBe(true);

      radiusControl?.setValue(51);
      expect(radiusControl?.hasError('max')).toBe(true);

      radiusControl?.setValue(10);
      expect(radiusControl?.errors).toBeNull();
    });

    it('should validate container opacity range', () => {
      const opacityControl = component.themeForm.get('containerOpacity');

      opacityControl?.setValue(-0.1);
      expect(opacityControl?.hasError('min')).toBe(true);

      opacityControl?.setValue(1.1);
      expect(opacityControl?.hasError('max')).toBe(true);

      opacityControl?.setValue(0.8);
      expect(opacityControl?.errors).toBeNull();
    });
  });

  describe('Background Type Handling', () => {
    it('should change background type', () => {
      component.onBackgroundTypeChange('linear-gradient');
      expect(component.backgroundType()).toBe('linear-gradient');

      component.onBackgroundTypeChange('radial-gradient');
      expect(component.backgroundType()).toBe('radial-gradient');

      component.onBackgroundTypeChange('image');
      expect(component.backgroundType()).toBe('image');
    });

    it('should generate correct background value for solid color', () => {
      component.onBackgroundTypeChange('solid');
      component.themeForm.patchValue({ backgroundSolidColor: '#FF0000' });

      const theme = component.currentTheme();
      expect(theme?.themeConfig.desktop.backgroundColor).toBe('#FF0000');
    });

    it('should generate correct background value for linear gradient', () => {
      component.onBackgroundTypeChange('linear-gradient');
      component.themeForm.patchValue({
        gradientColor1: '#FF0000',
        gradientColor2: '#00FF00',
        gradientDirection: 'to bottom',
      });

      const theme = component.currentTheme();
      expect(theme?.themeConfig.desktop.backgroundColor).toBe(
        'linear-gradient(to bottom, #FF0000, #00FF00)',
      );
    });

    it('should generate correct background value for radial gradient', () => {
      component.onBackgroundTypeChange('radial-gradient');
      component.themeForm.patchValue({
        gradientColor1: '#FF0000',
        gradientColor2: '#00FF00',
      });

      const theme = component.currentTheme();
      expect(theme?.themeConfig.desktop.backgroundColor).toBe(
        'radial-gradient(circle, #FF0000, #00FF00)',
      );
    });

    it('should generate correct background value for image', () => {
      component.onBackgroundTypeChange('image');
      const imageUrl = 'https://example.com/bg.jpg';
      component.themeForm.patchValue({ backgroundImageUrl: imageUrl });

      const theme = component.currentTheme();
      expect(theme?.themeConfig.desktop.backgroundColor).toBe(`url(${imageUrl})`);
    });
  });

  describe('Preview Mode', () => {
    it('should toggle preview mode', () => {
      expect(component.previewMode()).toBe('desktop');

      component.togglePreviewMode();
      expect(component.previewMode()).toBe('mobile');

      component.togglePreviewMode();
      expect(component.previewMode()).toBe('desktop');
    });
  });

  describe('Current Theme Generation', () => {
    it('should generate current theme from form values', () => {
      component.themeForm.patchValue({
        name: 'Test Theme',
        description: 'Test description',
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        textColorPrimary: '#000000',
        textColorSecondary: '#666666',
        containerBackground: '#FFFFFF',
        containerOpacity: 0.9,
        fieldBorderRadius: 12,
        fieldSpacing: 20,
      });

      const theme = component.currentTheme();

      expect(theme).toBeTruthy();
      expect(theme!.name).toBe('Test Theme');
      expect(theme!.description).toBe('Test description');
      expect(theme!.themeConfig.desktop.primaryColor).toBe('#FF0000');
      expect(theme!.themeConfig.desktop.secondaryColor).toBe('#00FF00');
      expect(theme!.themeConfig.desktop.textColorPrimary).toBe('#000000');
      expect(theme!.themeConfig.desktop.textColorSecondary).toBe('#666666');
      expect(theme!.themeConfig.desktop.containerBackground).toBe('#FFFFFF');
      expect(theme!.themeConfig.desktop.containerOpacity).toBe(0.9);
      expect(theme!.themeConfig.desktop.fieldBorderRadius).toBe('12px');
      expect(theme!.themeConfig.desktop.fieldSpacing).toBe('20px');
    });

    it('should use default values when form is empty', () => {
      const theme = component.currentTheme();

      expect(theme).toBeTruthy();
      expect(theme!.name).toBe('Preview Theme');
      expect(theme!.themeConfig.desktop.primaryColor).toBe('#3B82F6');
      expect(theme!.themeConfig.desktop.fieldBorderRadius).toBe('8px');
      expect(theme!.themeConfig.desktop.containerOpacity).toBe(1);
    });
  });

  describe('Theme Preview Updates', () => {
    it('should apply theme to preview service when theme changes', fakeAsync(() => {
      component.themeForm.patchValue({ primaryColor: '#FF0000' });

      // Trigger change detection and wait for debounce
      fixture.detectChanges();
      tick(350); // Wait longer than 300ms debounce

      expect(mockThemePreviewService.applyThemeCss).toHaveBeenCalled();
    }));
  });

  describe('File Upload', () => {
    it('should handle image upload', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { files: [mockFile] };

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jasmine.createSpy('readAsDataURL'),
        onload: null as any,
        result: 'data:image/jpeg;base64,test-data',
      };

      spyOn(window, 'FileReader').and.returnValue(mockFileReader as any);

      component.onImageUpload(mockEvent);

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);

      // Simulate FileReader onload
      mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,test-data' } } as any);

      expect(component.themeForm.get('backgroundImageUrl')?.value).toBe(
        'data:image/jpeg;base64,test-data',
      );
    });
  });

  describe('Theme Reset', () => {
    it('should reset form and background type', () => {
      // Change some values
      component.themeForm.patchValue({ name: 'Test', primaryColor: '#FF0000' });
      component.onBackgroundTypeChange('linear-gradient');

      // Reset
      component.resetTheme();

      expect(component.themeForm.get('name')?.value).toBe('');
      expect(component.backgroundType()).toBe('solid');
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Theme Reset',
        detail: 'Theme has been reset to default values.',
      });
    });
  });

  describe('Theme Saving', () => {
    it('should save valid theme', fakeAsync(() => {
      // Make form valid
      component.themeForm.patchValue({
        name: 'Test Theme',
        primaryColor: '#FF0000',
      });

      component.saveTheme();
      tick();

      expect(mockThemeDesignerService.createCustomTheme).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Theme Saved',
        detail: 'Theme "Test Theme" has been created successfully.',
      });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/admin/themes']);
    }));

    it('should not save invalid theme', () => {
      // Leave form invalid (missing required name)
      component.saveTheme();

      expect(mockThemeDesignerService.createCustomTheme).not.toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Form Invalid',
        detail: 'Please fix the validation errors before saving.',
      });
    });

    it('should handle save error', fakeAsync(() => {
      // Make form valid
      component.themeForm.patchValue({ name: 'Test Theme' });

      // Mock error response
      mockThemeDesignerService.createCustomTheme.and.returnValue(
        throwError(() => ({ message: 'Save failed' })),
      );

      component.saveTheme();
      tick();

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Save Failed',
        detail: 'Save failed',
      });
    }));
  });

  describe('Navigation', () => {
    it('should navigate back to themes list', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app/admin/themes']);
    });
  });

  describe('Error Handling', () => {
    it('should get field error messages', () => {
      const nameControl = component.themeForm.get('name');
      nameControl?.markAsTouched();

      expect(component.getFieldError('name')).toBe('name is required');

      nameControl?.setValue('Valid Name');
      expect(component.getFieldError('name')).toBe('');
    });

    it('should check if field has errors', () => {
      const nameControl = component.themeForm.get('name');

      expect(component.hasFieldError('name')).toBe(false);

      nameControl?.markAsTouched();
      expect(component.hasFieldError('name')).toBe(true);

      nameControl?.setValue('Valid Name');
      expect(component.hasFieldError('name')).toBe(false);
    });
  });

  describe('Component Cleanup', () => {
    it('should clear theme CSS on destroy', () => {
      component.ngOnDestroy();
      expect(mockThemePreviewService.clearThemeCss).toHaveBeenCalled();
    });
  });

  describe('Font Options', () => {
    it('should provide font options', () => {
      expect(component.fontOptions).toBeDefined();
      expect(component.fontOptions.length).toBeGreaterThan(0);
      expect(component.fontOptions[0]).toEqual({
        label: 'System Default',
        value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        family: 'System',
      });
    });
  });

  describe('Background and Gradient Options', () => {
    it('should provide background type options', () => {
      expect(component.backgroundTypes).toBeDefined();
      expect(component.backgroundTypes.length).toBe(4);
      expect(component.backgroundTypes[0].value).toBe('solid');
    });

    it('should provide gradient direction options', () => {
      expect(component.gradientDirections).toBeDefined();
      expect(component.gradientDirections.length).toBeGreaterThan(0);
      expect(component.gradientDirections[0].value).toBe('to right');
    });

    it('should provide container position options', () => {
      expect(component.containerPositions).toBeDefined();
      expect(component.containerPositions.length).toBe(4);
      expect(component.containerPositions[0].value).toBe('center');
    });
  });
});
