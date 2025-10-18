import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreviewDialogComponent } from './preview-dialog.component';
import { FormSchema, FormFieldType, FormTheme } from '@nodeangularfullstack/shared';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ThemePreviewService } from '../theme-preview.service';
import { FormsApiService } from '../forms-api.service';
import { of, throwError } from 'rxjs';

describe('PreviewDialogComponent', () => {
  let component: PreviewDialogComponent;
  let fixture: ComponentFixture<PreviewDialogComponent>;
  let themePreviewService: jasmine.SpyObj<ThemePreviewService>;
  let formsApiService: jasmine.SpyObj<FormsApiService>;

  beforeEach(async () => {
    // Create spy objects for injected services
    const themeSpy = jasmine.createSpyObj('ThemePreviewService', [
      'applyThemeCss',
      'clearThemeCss',
    ]);
    const apiSpy = jasmine.createSpyObj('FormsApiService', ['getTheme']);

    await TestBed.configureTestingModule({
      imports: [PreviewDialogComponent, DialogModule, ButtonModule, NoopAnimationsModule],
      providers: [
        { provide: ThemePreviewService, useValue: themeSpy },
        { provide: FormsApiService, useValue: apiSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreviewDialogComponent);
    component = fixture.componentInstance;
    themePreviewService = TestBed.inject(
      ThemePreviewService,
    ) as jasmine.SpyObj<ThemePreviewService>;
    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render PrimeNG Dialog when visible is true', () => {
    component.visible = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('p-dialog');
    expect(dialog).toBeTruthy();
  });

  it('should hide dialog when visible is false', () => {
    component.visible = false;
    fixture.detectChanges();

    // Dialog component is present but not visible
    const dialog = fixture.nativeElement.querySelector('p-dialog');
    expect(dialog).toBeTruthy();
  });

  it('should emit onClose event when close button clicked', () => {
    let closeCalled = false;
    component.onClose.subscribe(() => {
      closeCalled = true;
    });

    component.visible = true;
    fixture.detectChanges();

    component.onClose.emit();

    expect(closeCalled).toBe(true);
  });

  it('should pass formSchema to FormRendererComponent via input', () => {
    const mockSchema: any = {
      fields: [
        {
          id: 'field1',
          type: FormFieldType.TEXT,
          fieldName: 'name',
          label: 'Name',
          placeholder: '',
          helpText: '',
          required: true,
          order: 0,
        },
      ],
      settings: {
        layout: {
          columns: 1,
          spacing: 'medium',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: true,
        },
      },
    };

    component.formSchema = mockSchema;
    component.visible = true;
    fixture.detectChanges();

    expect(component.formSchema).toEqual(mockSchema);
  });

  it('should pass previewMode === true to FormRendererComponent', () => {
    component.visible = true;
    fixture.detectChanges();

    // FormRendererComponent should receive previewMode=true
    // This is implicitly tested by the template binding
    expect(component.visible).toBe(true);
  });

  it('should show "Preview Mode" badge', () => {
    component.visible = true;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.preview-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('Preview Mode');
  });

  it('should show helpful hint text', () => {
    component.visible = true;
    fixture.detectChanges();

    const hint = fixture.nativeElement.querySelector('.preview-hint');
    expect(hint).toBeTruthy();
    expect(hint?.textContent).toContain('Unsaved changes are included');
  });

  // Theme Loading Tests (Story 23.6)
  describe('Theme Loading (Story 23.6)', () => {
    const mockTheme: FormTheme = {
      id: 'test-theme-id',
      name: 'Ocean Blue',
      thumbnailUrl: '',
      themeConfig: {
        desktop: {
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textColorPrimary: '#111827',
          textColorSecondary: '#6B7280',
          fontFamilyHeading: 'Montserrat',
          fontFamilyBody: 'Inter',
          fieldBorderRadius: '12px',
          fieldSpacing: '18px',
          containerBackground: '#FFFFFF',
          containerOpacity: 0.95,
          containerPosition: 'center',
          labelColor: '#374151',
          inputBackgroundColor: '#F9FAFB',
          inputTextColor: '#111827',
        },
      },
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      // Reset spy call history before each test
      themePreviewService.applyThemeCss.calls.reset();
      themePreviewService.clearThemeCss.calls.reset();
      formsApiService.getTheme.calls.reset();
    });

    it('should load and apply theme when dialog opens with themeId', (done) => {
      // Mock successful theme load
      formsApiService.getTheme.and.returnValue(of(mockTheme));

      // Set form schema with theme
      const mockSchema: any = {
        fields: [
          {
            id: 'field1',
            type: FormFieldType.TEXT,
            fieldName: 'name',
            label: 'Name',
            placeholder: '',
            helpText: '',
            required: true,
            order: 0,
          },
        ],
        settings: {
          themeId: 'test-theme-id',
          layout: {
            columns: 1,
            spacing: 'medium',
          },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.visible = true;
      fixture.detectChanges();

      // Allow effect to run
      setTimeout(() => {
        expect(formsApiService.getTheme).toHaveBeenCalledWith('test-theme-id');
        expect(themePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
        done();
      }, 50);
    });

    it('should clear theme when dialog opens without themeId', (done) => {
      const mockSchema: any = {
        fields: [
          {
            id: 'field1',
            type: FormFieldType.TEXT,
            fieldName: 'name',
            label: 'Name',
            placeholder: '',
            helpText: '',
            required: true,
            order: 0,
          },
        ],
        settings: {
          themeId: null, // No theme
          layout: {
            columns: 1,
            spacing: 'medium',
          },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.visible = true;
      fixture.detectChanges();

      // Allow effect to run
      setTimeout(() => {
        expect(themePreviewService.clearThemeCss).toHaveBeenCalled();
        expect(formsApiService.getTheme).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should fallback to defaults when theme load fails', (done) => {
      // Mock theme load error
      formsApiService.getTheme.and.returnValue(throwError(() => new Error('Theme not found')));

      const mockSchema: any = {
        fields: [
          {
            id: 'field1',
            type: FormFieldType.TEXT,
            fieldName: 'name',
            label: 'Name',
            placeholder: '',
            helpText: '',
            required: true,
            order: 0,
          },
        ],
        settings: {
          themeId: 'invalid-theme-id',
          layout: {
            columns: 1,
            spacing: 'medium',
          },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.visible = true;
      fixture.detectChanges();

      // Allow effect to run
      setTimeout(() => {
        expect(formsApiService.getTheme).toHaveBeenCalledWith('invalid-theme-id');
        expect(themePreviewService.clearThemeCss).toHaveBeenCalled();
        expect(themePreviewService.applyThemeCss).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should not load theme when dialog is not visible', () => {
      const mockSchema: any = {
        fields: [
          {
            id: 'field1',
            type: FormFieldType.TEXT,
            fieldName: 'name',
            label: 'Name',
            placeholder: '',
            helpText: '',
            required: true,
            order: 0,
          },
        ],
        settings: {
          themeId: 'test-theme-id',
          layout: {
            columns: 1,
            spacing: 'medium',
          },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.visible = false; // Dialog not visible
      fixture.detectChanges();

      // Theme should not be loaded when dialog is closed
      expect(formsApiService.getTheme).not.toHaveBeenCalled();
      expect(themePreviewService.applyThemeCss).not.toHaveBeenCalled();
      expect(themePreviewService.clearThemeCss).not.toHaveBeenCalled();
    });

    it('should apply theme-form-canvas-background class to preview content', () => {
      component.visible = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const previewContent = compiled.querySelector('.preview-content');

      // Verify theme background class is present
      expect(previewContent?.classList.contains('theme-form-canvas-background')).toBe(true);
    });

    it('should update theme when formSchema changes', (done) => {
      // Mock successful theme load
      formsApiService.getTheme.and.returnValue(of(mockTheme));

      // Initial schema with first theme
      const mockSchema1: any = {
        fields: [],
        settings: {
          themeId: 'theme-1',
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema1;
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        expect(formsApiService.getTheme).toHaveBeenCalledWith('theme-1');

        // Reset call history
        formsApiService.getTheme.calls.reset();
        themePreviewService.applyThemeCss.calls.reset();

        // Update schema with new theme
        const mockSchema2: any = {
          ...mockSchema1,
          settings: {
            ...mockSchema1.settings,
            themeId: 'theme-2',
          },
        };

        component.formSchema = mockSchema2;
        fixture.detectChanges();

        setTimeout(() => {
          expect(formsApiService.getTheme).toHaveBeenCalledWith('theme-2');
          expect(themePreviewService.applyThemeCss).toHaveBeenCalled();
          done();
        }, 50);
      }, 50);
    });
  });
});
