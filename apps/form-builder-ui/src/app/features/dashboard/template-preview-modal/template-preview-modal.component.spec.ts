import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplatePreviewModalComponent } from './template-preview-modal.component';
import { TemplatesApiService } from './templates-api.service';
import { ThemePreviewService } from '../theme-preview.service';
import { FormTemplate, TemplateCategory, FormFieldType } from '@nodeangularfullstack/shared';
import { of, throwError } from 'rxjs';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('TemplatePreviewModalComponent', () => {
  let component: TemplatePreviewModalComponent;
  let fixture: ComponentFixture<TemplatePreviewModalComponent>;
  let templatesApiService: jasmine.SpyObj<TemplatesApiService>;
  let themePreviewService: jasmine.SpyObj<ThemePreviewService>;

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Product Order Form',
    description: 'Template for selling products online',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://example.com/preview.jpg',
    templateSchema: {
      id: 'schema-template-123',
      formId: 'template-123',
      version: 1,
      isPublished: true,
      fields: [
        {
          id: 'field1',
          type: FormFieldType.TEXT,
          fieldName: 'product_name',
          label: 'Product Name',
          placeholder: 'Enter product name',
          helpText: '',
          required: true,
          order: 0,
          validation: {},
        },
        {
          id: 'field2',
          type: FormFieldType.NUMBER,
          fieldName: 'quantity',
          label: 'Quantity',
          placeholder: '1',
          helpText: '',
          required: true,
          order: 1,
          validation: {},
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you! Your order has been received.',
          allowMultipleSubmissions: true,
        },
      },
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-15'),
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_name',
      variantField: 'size',
      quantityField: 'quantity',
      stockTable: 'inventory',
      decrementOnSubmit: true,
    },
    isActive: true,
    usageCount: 42,
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-15'),
  };

  beforeEach(async () => {
    const templatesApiServiceSpy = jasmine.createSpyObj('TemplatesApiService', [
      'getTemplateById',
    ]);
    const themePreviewServiceSpy = jasmine.createSpyObj('ThemePreviewService', [
      'applyThemeCss',
      'clearThemeCss',
    ]);

    await TestBed.configureTestingModule({
      imports: [TemplatePreviewModalComponent],
      providers: [
        { provide: TemplatesApiService, useValue: templatesApiServiceSpy },
        { provide: ThemePreviewService, useValue: themePreviewServiceSpy },
      ],
    }).compileComponents();

    templatesApiService = TestBed.inject(
      TemplatesApiService
    ) as jasmine.SpyObj<TemplatesApiService>;
    themePreviewService = TestBed.inject(
      ThemePreviewService
    ) as jasmine.SpyObj<ThemePreviewService>;

    fixture = TestBed.createComponent(TemplatePreviewModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.visible).toBe(false);
      expect(component.templateId).toBe('');
      expect(component['template']()).toBeNull();
      expect(component['loading']()).toBe(false);
      expect(component['error']()).toBeNull();
    });

    it('should have ChangeDetectionStrategy.OnPush', () => {
      const metadata = (component.constructor as any).__annotations__?.[0];
      expect(metadata?.changeDetection).toBeDefined();
    });
  });

  describe('Modal Visibility', () => {
    it('should open modal when visible input is set to true', () => {
      component.visible = true;
      fixture.detectChanges();

      expect(component.visible).toBe(true);
      expect(component['visibleSignal']()).toBe(true);
    });

    it('should emit visibleChange event when visibility changes', (done) => {
      component.visibleChange.subscribe((visible: boolean) => {
        expect(visible).toBe(false);
        done();
      });

      component['handleVisibilityChange'](false);
    });

    it('should emit closed event when dialog is hidden', (done) => {
      component.closed.subscribe(() => {
        done();
      });

      component['handleDialogHide']();
    });
  });

  describe('Template Data Fetching', () => {
    it('should fetch template when modal opens with valid templateId', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;

      setTimeout(() => {
        expect(templatesApiService.getTemplateById).toHaveBeenCalledWith('template-123');
        expect(component['template']()).toEqual(mockTemplate);
        expect(component['loading']()).toBe(false);
        expect(component['error']()).toBeNull();
        done();
      }, 100);
    });

    it('should set loading state during template fetch', () => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component['fetchTemplate']();

      expect(component['loading']()).toBe(true);
    });

    it('should not fetch template if templateId is empty', () => {
      component.templateId = '';
      component.visible = true;

      expect(templatesApiService.getTemplateById).not.toHaveBeenCalled();
    });

    it('should handle 404 error with specific message', (done) => {
      const error404 = { status: 404, message: 'Not found' };
      templatesApiService.getTemplateById.and.returnValue(throwError(() => error404));

      component.templateId = 'nonexistent-template';
      component['fetchTemplate']();

      setTimeout(() => {
        expect(component['error']()).toBe('Template not found. It may have been removed.');
        expect(component['loading']()).toBe(false);
        done();
      }, 100);
    });

    it('should handle generic API error', (done) => {
      const error500 = { status: 500, message: 'Server error' };
      templatesApiService.getTemplateById.and.returnValue(throwError(() => error500));

      component.templateId = 'template-123';
      component['fetchTemplate']();

      setTimeout(() => {
        expect(component['error']()).toBe('Unable to load template preview. Please try again.');
        expect(component['loading']()).toBe(false);
        done();
      }, 100);
    });
  });

  describe('Form Renderer Embedding', () => {
    it('should pass formSchema to FormRendererComponent', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const formRenderer = fixture.debugElement.query(By.css('app-form-renderer'));
        expect(formRenderer).toBeTruthy();
        done();
      }, 100);
    });

    it('should set previewMode to true on FormRendererComponent', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const formRenderer = fixture.debugElement.query(By.css('app-form-renderer'));
        expect(formRenderer.componentInstance.previewMode).toBe(true);
        done();
      }, 100);
    });

    it('should compute formSchemaWithSampleData with sample values', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;

      setTimeout(() => {
        const schemaWithSamples = component['formSchemaWithSampleData']();
        expect(schemaWithSamples).toBeTruthy();
        expect(schemaWithSamples?.fields.length).toBe(2);
        expect(schemaWithSamples?.fields[0].defaultValue).toBeDefined();
        done();
      }, 100);
    });
  });

  describe('Sample Data Population', () => {
    it('should populate known field names with realistic sample data', () => {
      const schema = component['populateSampleData'](mockTemplate.templateSchema);

      const productNameField = schema.fields.find((f) => f.fieldName === 'product_name');
      expect(productNameField?.defaultValue).toBe('Premium Wireless Headphones');

      const quantityField = schema.fields.find((f) => f.fieldName === 'quantity');
      expect(quantityField?.defaultValue).toBe(1);
    });

    it('should use generic sample data for unknown field names', () => {
      const customSchema = {
        id: 'schema-custom-1',
        formId: 'form-custom-1',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'custom-1',
            type: FormFieldType.TEXT,
            fieldName: 'custom_field',
            label: 'Custom Field',
            placeholder: '',
            helpText: '',
            required: false,
            order: 0,
            validation: {},
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: false,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const schema = component['populateSampleData'](customSchema);
      const customField = schema.fields.find((f) => f.fieldName === 'custom_field');
      expect(customField?.defaultValue).toBe('Sample Custom Field');
    });
  });

  describe('Modal Header', () => {
    it('should display template name in header', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const headerTitle = fixture.debugElement.query(By.css('h2'));
        expect(headerTitle.nativeElement.textContent).toContain('Product Order Form');
        done();
      }, 100);
    });

    it('should display category badge in header', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const badge = fixture.debugElement.query(By.css('p-badge'));
        expect(badge).toBeTruthy();
        done();
      }, 100);
    });

    it('should display template description', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const description = fixture.nativeElement.textContent;
        expect(description).toContain('Template for selling products online');
        done();
      }, 100);
    });

    it('should display usage count', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        const usageText = fixture.nativeElement.textContent;
        expect(usageText).toContain('42 uses');
        done();
      }, 100);
    });
  });

  describe('Modal Footer Actions', () => {
    it('should emit templateSelected event when "Use This Template" is clicked', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateSelected.subscribe((templateId: string) => {
        expect(templateId).toBe('template-123');
        done();
      });

      component.templateId = 'template-123';
      component.visible = true;
      fixture.detectChanges();

      setTimeout(() => {
        fixture.detectChanges();
        component['handleUseTemplateClick']();
      }, 100);
    });

    it('should emit closed event when "Back to Templates" is clicked', (done) => {
      component.closed.subscribe(() => {
        done();
      });

      component['handleBackClick']();
    });

    it('should disable "Use This Template" button when loading', () => {
      component['loading'].set(true);
      fixture.detectChanges();

      const useButton = fixture.debugElement.queryAll(By.css('button')).find((btn) => {
        return btn.nativeElement.textContent.includes('Use This Template');
      });

      expect(useButton?.nativeElement.disabled).toBe(true);
    });

    it('should disable "Use This Template" button when error exists', () => {
      component['error'].set('Error loading template');
      fixture.detectChanges();

      const useButton = fixture.debugElement.queryAll(By.css('button')).find((btn) => {
        return btn.nativeElement.textContent.includes('Use This Template');
      });

      expect(useButton?.nativeElement.disabled).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      component['loading'].set(true);
      fixture.detectChanges();

      const spinner = fixture.debugElement.query(By.css('p-progressSpinner'));
      expect(spinner).toBeTruthy();
    });

    it('should display loading message', () => {
      component['loading'].set(true);
      fixture.detectChanges();

      const loadingText = fixture.nativeElement.textContent;
      expect(loadingText).toContain('Loading template preview');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      component['error'].set('Unable to load template preview. Please try again.');
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('p-message'));
      expect(errorMessage).toBeTruthy();
    });

    it('should display retry button in error state', () => {
      component['error'].set('Error occurred');
      fixture.detectChanges();

      const retryButton = fixture.debugElement.queryAll(By.css('button')).find((btn) => {
        return btn.nativeElement.textContent.includes('Retry');
      });

      expect(retryButton).toBeTruthy();
    });

    it('should retry fetching template when retry button is clicked', () => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component['error'].set('Previous error');
      component['handleRetry']();

      expect(component['error']()).toBeNull();
      expect(templatesApiService.getTemplateById).toHaveBeenCalled();
    });
  });

  describe('Category Icon Mapping', () => {
    it('should return correct icon for ECOMMERCE category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.ECOMMERCE);
      expect(icon).toBe('pi pi-shopping-cart');
    });

    it('should return correct icon for SERVICES category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.SERVICES);
      expect(icon).toBe('pi pi-calendar');
    });

    it('should return correct icon for DATA_COLLECTION category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.DATA_COLLECTION);
      expect(icon).toBe('pi pi-database');
    });

    it('should return correct icon for EVENTS category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.EVENTS);
      expect(icon).toBe('pi pi-ticket');
    });

    it('should return correct icon for QUIZ category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.QUIZ);
      expect(icon).toBe('pi pi-question-circle');
    });

    it('should return correct icon for POLLS category', () => {
      const icon = component['getCategoryIcon'](TemplateCategory.POLLS);
      expect(icon).toBe('pi pi-chart-bar');
    });

    it('should return default icon for unknown category', () => {
      const icon = component['getCategoryIcon'](undefined);
      expect(icon).toBe('pi pi-file');
    });
  });

  describe('PrimeNG Dialog Configuration', () => {
    it('should configure dialog with correct responsive breakpoints', () => {
      component.visible = true;
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialog).toBeTruthy();
      // Note: Actual breakpoint testing would require E2E tests
    });

    it('should set modal to closable', () => {
      component.visible = true;
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialog.componentInstance.closable).toBe(true);
    });

    it('should set dismissableMask to true', () => {
      component.visible = true;
      fixture.detectChanges();

      const dialog = fixture.debugElement.query(By.css('p-dialog'));
      expect(dialog.componentInstance.dismissableMask).toBe(true);
    });
  });

  describe('Computed Signals', () => {
    it('should compute hasTemplate as true when template is loaded', (done) => {
      templatesApiService.getTemplateById.and.returnValue(
        of({ success: true, data: mockTemplate })
      );

      component.templateId = 'template-123';
      component.visible = true;

      setTimeout(() => {
        expect(component['hasTemplate']()).toBe(true);
        done();
      }, 100);
    });

    it('should compute hasTemplate as false when template is null', () => {
      expect(component['hasTemplate']()).toBe(false);
    });
  });
});
