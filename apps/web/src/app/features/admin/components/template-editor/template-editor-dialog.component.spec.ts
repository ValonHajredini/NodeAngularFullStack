import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { TemplateEditorDialogComponent } from './template-editor-dialog.component';
import { TemplatesApiService } from '@core/services/templates-api.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('TemplateEditorDialogComponent', () => {
  let component: TemplateEditorDialogComponent;
  let fixture: ComponentFixture<TemplateEditorDialogComponent>;
  let templatesApiService: jasmine.SpyObj<TemplatesApiService>;
  let messageService: jasmine.SpyObj<MessageService>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;

  const mockTemplate: FormTemplate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Template',
    description: 'Test template description',
    category: TemplateCategory.ECOMMERCE,
    previewImageUrl: 'https://example.com/preview.png',
    templateSchema: {
      fields: [
        {
          id: 'field1',
          type: 'text',
          name: 'testField',
          label: 'Test Field',
          required: false,
          order: 0,
        },
      ],
      settings: {},
    },
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_id',
      variantField: 'size',
      quantityField: 'quantity',
      stockTable: 'inventory',
      decrementOnSubmit: true,
    },
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('TemplatesApiService', [
      'getTemplateById',
      'createTemplate',
      'updateTemplate',
    ]);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [TemplateEditorDialogComponent, ReactiveFormsModule, FormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TemplatesApiService, useValue: apiServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateEditorDialogComponent);
    component = fixture.componentInstance;
    templatesApiService = TestBed.inject(
      TemplatesApiService,
    ) as jasmine.SpyObj<TemplatesApiService>;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
    confirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;

    // Set required inputs
    fixture.componentRef.setInput('visible', false);
    fixture.componentRef.setInput('mode', 'create');
    fixture.componentRef.setInput('templateId', null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize in create mode with empty form', () => {
      expect(component.mode()).toBe('create');
      expect(component.templateForm.get('name')?.value).toBe('');
      expect(component.templateForm.get('description')?.value).toBe('');
      expect(component.templateForm.get('category')?.value).toBe('');
    });

    it('should load template data in edit mode', () => {
      templatesApiService.getTemplateById.and.returnValue(of(mockTemplate));

      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('templateId', mockTemplate.id);
      fixture.detectChanges();

      expect(templatesApiService.getTemplateById).toHaveBeenCalledWith(mockTemplate.id);
      expect(component.loading()).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('should require name field', () => {
      const nameControl = component.templateForm.get('name');
      expect(nameControl?.valid).toBe(false);

      nameControl?.setValue('Test Template');
      expect(nameControl?.valid).toBe(true);
    });

    it('should enforce maxlength on name field', () => {
      const nameControl = component.templateForm.get('name');
      const longName = 'a'.repeat(256);
      nameControl?.setValue(longName);

      expect(nameControl?.hasError('maxlength')).toBe(true);
    });

    it('should require description field', () => {
      const descControl = component.templateForm.get('description');
      expect(descControl?.valid).toBe(false);

      descControl?.setValue('Test description');
      expect(descControl?.valid).toBe(true);
    });

    it('should require category field', () => {
      const categoryControl = component.templateForm.get('category');
      expect(categoryControl?.valid).toBe(false);

      categoryControl?.setValue(TemplateCategory.ECOMMERCE);
      expect(categoryControl?.valid).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should detect invalid JSON syntax', () => {
      component.schemaJson.set('invalid json');
      component.validateSchema();

      expect(component.schemaErrors().length).toBeGreaterThan(0);
      expect(component.schemaErrors()[0]).toBe('Invalid JSON syntax');
    });

    it('should validate schema has fields array', () => {
      component.schemaJson.set('{"settings": {}}');
      component.validateSchema();

      expect(component.schemaErrors()).toContain('Schema must have a "fields" array');
    });

    it('should validate field required properties', () => {
      component.schemaJson.set('{"fields": [{"id": "1"}]}');
      component.validateSchema();

      expect(component.schemaErrors().some((e) => e.includes('missing "type"'))).toBe(true);
      expect(component.schemaErrors().some((e) => e.includes('missing "name"'))).toBe(true);
      expect(component.schemaErrors().some((e) => e.includes('missing "label"'))).toBe(true);
    });

    it('should validate schema size limit', () => {
      const largeSchema = JSON.stringify({
        fields: Array.from({ length: 1000 }, (_, i) => ({
          id: `field${i}`,
          type: 'text',
          name: `field${i}`,
          label: `Field ${i} with some extra text to increase size`,
        })),
        settings: {},
      });

      component.schemaJson.set(largeSchema);
      component.validateSchema();

      const sizeError = component.schemaErrors().find((e) => e.includes('exceeds 100KB limit'));
      expect(sizeError).toBeDefined();
    });

    it('should pass validation with valid schema', () => {
      const validSchema = JSON.stringify({
        fields: [
          {
            id: 'field1',
            type: 'text',
            name: 'testField',
            label: 'Test Field',
          },
        ],
        settings: {},
      });

      component.schemaJson.set(validSchema);
      component.validateSchema();

      expect(component.schemaErrors().length).toBe(0);
    });
  });

  describe('Save Template', () => {
    beforeEach(() => {
      component.templateForm.patchValue({
        name: 'Test Template',
        description: 'Test description',
        category: TemplateCategory.ECOMMERCE,
      });

      const validSchema = JSON.stringify({
        fields: [
          {
            id: 'field1',
            type: 'text',
            name: 'testField',
            label: 'Test Field',
          },
        ],
        settings: {},
      });
      component.schemaJson.set(validSchema);
    });

    it('should create template in create mode', () => {
      templatesApiService.createTemplate.and.returnValue(of(mockTemplate));

      fixture.componentRef.setInput('mode', 'create');
      component.handleSave();

      expect(templatesApiService.createTemplate).toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Success',
        }),
      );
    });

    it('should update template in edit mode', () => {
      templatesApiService.updateTemplate.and.returnValue(of(mockTemplate));

      fixture.componentRef.setInput('mode', 'edit');
      fixture.componentRef.setInput('templateId', mockTemplate.id);
      component.handleSave();

      expect(templatesApiService.updateTemplate).toHaveBeenCalledWith(
        mockTemplate.id,
        jasmine.any(Object),
      );
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Success',
        }),
      );
    });

    it('should show error if form is invalid', () => {
      component.templateForm.patchValue({ name: '' });
      component.handleSave();

      expect(templatesApiService.createTemplate).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          detail: 'Please fill in all required fields',
        }),
      );
    });

    it('should show error if schema is invalid', () => {
      component.schemaJson.set('invalid json');
      component.handleSave();

      expect(templatesApiService.createTemplate).not.toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          detail: 'Please fix schema errors before saving',
        }),
      );
    });

    it('should handle save error', () => {
      templatesApiService.createTemplate.and.returnValue(
        throwError(() => new Error('Save failed')),
      );

      fixture.componentRef.setInput('mode', 'create');
      component.handleSave();

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Error',
        }),
      );
    });
  });

  describe('Cancel/Close Actions', () => {
    it('should close dialog without confirmation if form is pristine', () => {
      component.handleCancel();

      expect(confirmationService.confirm).not.toHaveBeenCalled();
      expect(component.visibleSignal()).toBe(false);
    });

    it('should show confirmation if form is dirty', () => {
      component.templateForm.markAsDirty();
      component.handleCancel();

      expect(confirmationService.confirm).toHaveBeenCalled();
    });

    it('should show confirmation if schema changed', () => {
      component.schemaJson.set('{"fields": [], "settings": {}}');
      component.handleCancel();

      expect(confirmationService.confirm).toHaveBeenCalled();
    });
  });

  describe('Dynamic Business Logic Form', () => {
    it('should show inventory config for ecommerce category', () => {
      component.templateForm.patchValue({ category: TemplateCategory.ECOMMERCE });
      fixture.detectChanges();

      expect(component.categoryControl.value).toBe(TemplateCategory.ECOMMERCE);
    });

    it('should show appointment config for services category', () => {
      component.templateForm.patchValue({ category: TemplateCategory.SERVICES });
      fixture.detectChanges();

      expect(component.categoryControl.value).toBe(TemplateCategory.SERVICES);
    });

    it('should show quiz config for quiz category', () => {
      component.templateForm.patchValue({ category: TemplateCategory.QUIZ });
      fixture.detectChanges();

      expect(component.categoryControl.value).toBe(TemplateCategory.QUIZ);
    });

    it('should show poll config for polls category', () => {
      component.templateForm.patchValue({ category: TemplateCategory.POLLS });
      fixture.detectChanges();

      expect(component.categoryControl.value).toBe(TemplateCategory.POLLS);
    });
  });

  describe('File Upload', () => {
    it('should validate file size (5MB max)', () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const event = { files: [largeFile] };

      component.onFileSelect(event);

      expect(messageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          detail: 'File size exceeds 5MB limit',
        }),
      );
      expect(component.selectedImage()).toBeNull();
    });

    it('should accept valid image file', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const event = { files: [validFile] };

      component.onFileSelect(event);

      expect(component.selectedImage()).toBe(validFile);
    });

    it('should remove selected image', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component.selectedImage.set(validFile);

      component.removeImage();

      expect(component.selectedImage()).toBeNull();
      expect(component.templateForm.get('preview_image_url')?.value).toBe('');
    });
  });
});
