import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TemplateManagementPage } from './template-management.page';
import { TemplatesApiService } from '@core/services/templates-api.service';
import { ConfirmationService, MessageService, Confirmation } from 'primeng/api';
import { FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('TemplateManagementPage', () => {
  let component: TemplateManagementPage;
  let fixture: ComponentFixture<TemplateManagementPage>;
  let templatesApiService: jasmine.SpyObj<TemplatesApiService>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;
  let messageService: jasmine.SpyObj<MessageService>;

  const mockTemplates: FormTemplate[] = [
    {
      id: 'template-1',
      name: 'Product Order Form',
      description: 'Template for selling products',
      category: TemplateCategory.ECOMMERCE,
      previewImageUrl: 'https://example.com/preview1.jpg',
      templateSchema: { fields: [], settings: {} } as any,
      businessLogicConfig: { type: 'inventory' } as any,
      isActive: true,
      usageCount: 42,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'template-2',
      name: 'Appointment Booking',
      description: 'Book appointments with time slots',
      category: TemplateCategory.SERVICES,
      previewImageUrl: 'https://example.com/preview2.jpg',
      templateSchema: { fields: [], settings: {} } as any,
      businessLogicConfig: { type: 'appointment' } as any,
      isActive: false,
      usageCount: 15,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
    {
      id: 'template-3',
      name: 'Customer Survey',
      description: 'Collect customer feedback and opinions',
      category: TemplateCategory.DATA_COLLECTION,
      isActive: true,
      usageCount: 8,
      templateSchema: { fields: [], settings: {} } as any,
      createdAt: new Date('2025-01-03'),
      updatedAt: new Date('2025-01-03'),
    },
  ];

  beforeEach(async () => {
    const templatesApiServiceSpy = jasmine.createSpyObj('TemplatesApiService', [
      'getAllTemplates',
      'getTemplateById',
      'createTemplate',
      'updateTemplate',
      'deleteTemplate',
      'refreshCache',
    ]);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [TemplateManagementPage, HttpClientTestingModule],
      providers: [
        { provide: TemplatesApiService, useValue: templatesApiServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    templatesApiService = TestBed.inject(
      TemplatesApiService,
    ) as jasmine.SpyObj<TemplatesApiService>;
    confirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;

    // Setup default spy returns
    templatesApiService.getAllTemplates.and.returnValue(of(mockTemplates));

    fixture = TestBed.createComponent(TemplateManagementPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should fetch templates on initialization', () => {
      fixture.detectChanges(); // triggers ngOnInit

      expect(templatesApiService.getAllTemplates).toHaveBeenCalled();
      expect(component['templates']()).toEqual(mockTemplates);
      expect(component['loading']()).toBe(false);
    });

    it('should set loading state during fetch', () => {
      expect(component['loading']()).toBe(false);

      fixture.detectChanges();

      // Loading state is set to true, then false after fetch
      expect(component['loading']()).toBe(false);
    });

    it('should handle fetch error', () => {
      const errorMessage = 'Failed to fetch templates';
      templatesApiService.getAllTemplates.and.returnValue(
        throwError(() => new Error(errorMessage)),
      );

      fixture.detectChanges();

      expect(component['error']()).toBe(errorMessage);
      expect(component['loading']()).toBe(false);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load templates. Please try again.',
        life: 5000,
      });
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should filter templates by category', () => {
      component['selectedCategory'].set(TemplateCategory.ECOMMERCE);

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe(TemplateCategory.ECOMMERCE);
    });

    it('should filter templates by active status', () => {
      component['selectedStatus'].set('active');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.isActive)).toBe(true);
    });

    it('should filter templates by inactive status', () => {
      component['selectedStatus'].set('inactive');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(1);
      expect(filtered.every((t) => !t.isActive)).toBe(true);
    });

    it('should filter templates by search query (name)', () => {
      component['searchQuery'].set('appointment');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toContain('Appointment');
    });

    it('should filter templates by search query (description)', () => {
      component['searchQuery'].set('customer feedback');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(1);
      expect(filtered[0].description).toContain('customer feedback');
    });

    it('should apply multiple filters simultaneously', () => {
      component['selectedCategory'].set(TemplateCategory.ECOMMERCE);
      component['selectedStatus'].set('active');
      component['searchQuery'].set('product');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('template-1');
    });

    it('should return all templates when no filters applied', () => {
      component['selectedCategory'].set('all');
      component['selectedStatus'].set('all');
      component['searchQuery'].set('');

      const filtered = component['filteredTemplates']();

      expect(filtered.length).toBe(3);
    });
  });

  describe('Create Template Action', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open editor in create mode', () => {
      component['handleCreateTemplate']();

      expect(component['editorMode']()).toBe('create');
      expect(component['selectedTemplateId']()).toBeNull();
      expect(component['showEditor']()).toBe(true);
    });

    it('should show info message until editor is integrated', () => {
      component['handleCreateTemplate']();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Coming Soon',
        detail: 'Template editor will be integrated in Story 29.10',
        life: 3000,
      });
    });
  });

  describe('Edit Template Action', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open editor in edit mode with template ID', () => {
      const template = mockTemplates[0];

      component['handleEdit'](template);

      expect(component['editorMode']()).toBe('edit');
      expect(component['selectedTemplateId']()).toBe(template.id);
      expect(component['showEditor']()).toBe(true);
    });

    it('should show info message until editor is integrated', () => {
      const template = mockTemplates[0];

      component['handleEdit'](template);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Coming Soon',
        detail: 'Template editor will be integrated in Story 29.10',
        life: 3000,
      });
    });
  });

  describe('Delete Template Action', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should show confirmation dialog before delete', () => {
      const template = mockTemplates[0];

      component['handleDelete'](template);

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
          header: 'Confirm Deletion',
          icon: 'pi pi-exclamation-triangle',
        }),
      );
    });

    it('should delete template on confirmation', () => {
      const template = mockTemplates[0];
      templatesApiService.deleteTemplate.and.returnValue(of(undefined));

      // Mock confirmation accept callback
      confirmationService.confirm.and.callFake((config: Confirmation) => {
        if (config.accept) {
          config.accept();
        }
        return confirmationService;
      });

      component['handleDelete'](template);

      expect(templatesApiService.deleteTemplate).toHaveBeenCalledWith(template.id);
    });

    it('should remove template from list after successful delete', () => {
      const template = mockTemplates[0];
      templatesApiService.deleteTemplate.and.returnValue(of(undefined));

      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
        return confirmationService;
      });

      component['handleDelete'](template);

      expect(component['templates']().length).toBe(2);
      expect(component['templates']().find((t) => t.id === template.id)).toBeUndefined();
    });

    it('should show success message after delete', () => {
      const template = mockTemplates[0];
      templatesApiService.deleteTemplate.and.returnValue(of(undefined));

      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
        return confirmationService;
      });

      component['handleDelete'](template);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Template deleted successfully',
        life: 3000,
      });
    });

    it('should show error message on delete failure', () => {
      const template = mockTemplates[0];
      const errorMessage = 'Delete failed';
      templatesApiService.deleteTemplate.and.returnValue(throwError(() => new Error(errorMessage)));

      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
        return confirmationService;
      });

      component['handleDelete'](template);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete template. Please try again.',
        life: 5000,
      });
    });
  });

  describe('Toggle Active Status', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should optimistically update template status', () => {
      const template = mockTemplates[0];
      const previousState = template.isActive;
      templatesApiService.updateTemplate.and.returnValue(
        of({ ...template, isActive: !previousState }),
      );

      component['handleToggleActive'](template);

      expect(template.isActive).toBe(!previousState);
      expect(templatesApiService.updateTemplate).toHaveBeenCalledWith(template.id, {
        isActive: !previousState,
      });
    });

    it('should show success message on successful toggle', () => {
      const template = mockTemplates[0];
      const previousState = template.isActive;
      templatesApiService.updateTemplate.and.returnValue(
        of({ ...template, isActive: !previousState }),
      );

      component['handleToggleActive'](template);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: `Template ${!previousState ? 'activated' : 'deactivated'}`,
        life: 2000,
      });
    });

    it('should revert status on error', () => {
      const template = mockTemplates[0];
      const previousState = template.isActive;
      templatesApiService.updateTemplate.and.returnValue(
        throwError(() => new Error('Update failed')),
      );

      component['handleToggleActive'](template);

      expect(template.isActive).toBe(previousState);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update template status',
        life: 5000,
      });
    });
  });

  describe('Preview Template Action', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open preview modal with template ID', () => {
      const template = mockTemplates[0];

      component['handlePreview'](template);

      expect(component['previewTemplateId']()).toBe(template.id);
      expect(component['showPreview']()).toBe(true);
    });

    it('should show info message until preview is integrated', () => {
      const template = mockTemplates[0];

      component['handlePreview'](template);

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Coming Soon',
        detail: 'Template preview will be integrated from Story 29.7',
        life: 3000,
      });
    });
  });

  describe('Editor Save Handler', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should close editor and refresh templates on save', () => {
      component['showEditor'].set(true);
      component['editorMode'].set('create');

      component['handleEditorSave']();

      expect(component['showEditor']()).toBe(false);
      expect(templatesApiService.getAllTemplates).toHaveBeenCalled();
    });

    it('should show success message for created template', () => {
      component['editorMode'].set('create');

      component['handleEditorSave']();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Template created successfully',
        life: 3000,
      });
    });

    it('should show success message for updated template', () => {
      component['editorMode'].set('edit');

      component['handleEditorSave']();

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Success',
        detail: 'Template updated successfully',
        life: 3000,
      });
    });
  });

  describe('Retry Handler', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should re-fetch templates on retry', () => {
      templatesApiService.getAllTemplates.calls.reset();

      component['handleRetry']();

      expect(templatesApiService.getAllTemplates).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should format usage count with thousand separators', () => {
      expect(component['formatUsageCount'](1234)).toBe('1,234');
      expect(component['formatUsageCount'](42)).toBe('42');
      expect(component['formatUsageCount'](1000000)).toBe('1,000,000');
    });

    it('should get category label', () => {
      expect(component['getCategoryLabel'](TemplateCategory.ECOMMERCE)).toBe('E-commerce');
      expect(component['getCategoryLabel'](TemplateCategory.SERVICES)).toBe('Services');
      expect(component['getCategoryLabel'](TemplateCategory.DATA_COLLECTION)).toBe(
        'Data Collection',
      );
    });

    it('should truncate long descriptions', () => {
      const longDesc = 'a'.repeat(150);
      const truncated = component['truncateDescription'](longDesc, 100);

      expect(truncated.length).toBe(103); // 100 + '...'
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate short descriptions', () => {
      const shortDesc = 'Short description';
      const result = component['truncateDescription'](shortDesc, 100);

      expect(result).toBe(shortDesc);
    });

    it('should handle undefined description', () => {
      const result = component['truncateDescription'](undefined);

      expect(result).toBe('');
    });
  });

  describe('Dropdown Options', () => {
    it('should have correct category options', () => {
      expect(component['categoryOptions'].length).toBe(7); // All + 6 categories
      expect(component['categoryOptions'][0].label).toBe('All Categories');
      expect(component['categoryOptions'][0].value).toBe('all');
    });

    it('should have correct status options', () => {
      expect(component['statusOptions'].length).toBe(3); // All, Active, Inactive
      expect(component['statusOptions'][0].label).toBe('All Statuses');
      expect(component['statusOptions'][1].label).toBe('Active');
      expect(component['statusOptions'][2].label).toBe('Inactive');
    });
  });
});
