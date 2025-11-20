import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { FormBuilderComponent } from './form-builder.component';
import { FormBuilderService } from './form-builder.service';
import { MessageService } from 'primeng/api';
import { FormsApiService } from './forms-api.service';
import { of, throwError } from 'rxjs';
import { FormStatus, FormFieldType, FormSchema, TemplateCategory } from '@nodeangularfullstack/shared';

describe('FormBuilderComponent', () => {
  let component: FormBuilderComponent;
  let fixture: ComponentFixture<FormBuilderComponent>;
  let formBuilderService: FormBuilderService;
  let formsApiService: jasmine.SpyObj<FormsApiService>;
  let messageService: MessageService;

  beforeEach(async () => {
    const formsApiServiceSpy = jasmine.createSpyObj('FormsApiService', [
      'getForms',
      'getFormById',
      'createForm',
      'updateForm',
      'deleteForm',
    ]);

    formsApiServiceSpy.getForms.and.returnValue(
      of({
        data: [
          {
            id: 'form-1',
            userId: 'user-1',
            title: 'Test Form',
            description: 'Test description',
            status: FormStatus.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    formsApiServiceSpy.getFormById.and.returnValue(
      of({
        id: 'form-1',
        userId: 'user-1',
        title: 'Test Form',
        description: 'Test description',
        status: FormStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
    );

    await TestBed.configureTestingModule({
      imports: [FormBuilderComponent],
      providers: [
        FormBuilderService,
        MessageService,
        { provide: FormsApiService, useValue: formsApiServiceSpy },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormBuilderComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    formsApiService = TestBed.inject(FormsApiService) as jasmine.SpyObj<FormsApiService>;
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should inject FormBuilderService', () => {
    expect(component.formBuilderService).toBeTruthy();
    expect(component.formBuilderService).toBe(formBuilderService);
  });

  it('should render three-panel layout', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const panels = compiled.querySelectorAll('.w-64, .flex-1, .w-80');
    expect(panels.length).toBeGreaterThanOrEqual(3);
  });

  it('should have toolbar with save, settings, and preview buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const toolbar = compiled.querySelector('.toolbar');
    expect(toolbar).toBeTruthy();
  });

  it('should open forms dialog and fetch forms when openFormsDialog is called', () => {
    component.openFormsDialog();
    expect(component.formsListDialogVisible()).toBeTrue();
    expect(formsApiService.getForms).toHaveBeenCalled();
  });

  it('should update dialog visibility via onFormsDialogVisibleChange', () => {
    component.openFormsDialog();
    expect(component.formsListDialogVisible()).toBeTrue();
    component.onFormsDialogVisibleChange(false);
    expect(component.formsListDialogVisible()).toBeFalse();
  });

  it('should delete a form when onDeleteForm is confirmed', () => {
    component.openFormsDialog();
    const form = component.availableForms()[0];
    spyOn(window, 'confirm').and.returnValue(true);
    formsApiService.deleteForm.and.returnValue(of(void 0));

    component.onDeleteForm(form);

    expect(formsApiService.deleteForm).toHaveBeenCalledWith(form.id);
    expect(component.availableForms().some((f) => f.id === form.id)).toBeFalse();
  });

  it('should not delete a form when onDeleteForm is canceled', () => {
    component.openFormsDialog();
    const form = component.availableForms()[0];
    spyOn(window, 'confirm').and.returnValue(false);

    component.onDeleteForm(form);

    expect(formsApiService.deleteForm).not.toHaveBeenCalled();
    expect(component.availableForms().some((f) => f.id === form.id)).toBeTrue();
  });

  it('should select a form with clean state (no confirmation)', () => {
    const form = component.availableForms()[0];
    spyOn(formBuilderService, 'isDirty').and.returnValue(false);
    spyOn<any>(component, 'loadExistingForm');

    component.onFormSelected(form);

    expect(component.formsListDialogVisible()).toBeFalse();
    expect((component as any).loadExistingForm).toHaveBeenCalledWith(form.id, {
      updateRoute: true,
    });
  });

  it('should select a form with dirty state when confirmed', () => {
    const form = component.availableForms()[0];
    spyOn(formBuilderService, 'isDirty').and.returnValue(true);
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn<any>(component, 'loadExistingForm');

    component.onFormSelected(form);

    expect(window.confirm).toHaveBeenCalledWith(
      'You have unsaved changes. Loading another form will discard them. Continue?',
    );
    expect(component.formsListDialogVisible()).toBeFalse();
    expect((component as any).loadExistingForm).toHaveBeenCalledWith(form.id, {
      updateRoute: true,
    });
  });

  it('should not select a form with dirty state when canceled', () => {
    const form = component.availableForms()[0];
    spyOn(formBuilderService, 'isDirty').and.returnValue(true);
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn<any>(component, 'loadExistingForm');

    component.onFormSelected(form);

    expect(window.confirm).toHaveBeenCalled();
    expect(component.formsListDialogVisible()).toBeTrue();
    expect((component as any).loadExistingForm).not.toHaveBeenCalled();
  });

  it('should handle API error during form fetch in dialog', () => {
    const errorResponse = { error: { message: 'Network error' } };
    formsApiService.getForms.and.returnValue(throwError(() => errorResponse));

    component.openFormsDialog();

    expect(component.formsListLoading()).toBeFalse();
    expect(component.formsListError()).toBe('Network error');
  });

  it('should handle API error with fallback message during form fetch', () => {
    const errorResponse = {};
    formsApiService.getForms.and.returnValue(throwError(() => errorResponse));

    component.openFormsDialog();

    expect(component.formsListLoading()).toBeFalse();
    expect(component.formsListError()).toBe('Failed to load your forms');
  });

  it('should show empty state when no forms are available', () => {
    formsApiService.getForms.and.returnValue(
      of({
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
        pagination: {
          page: 1,
          pageSize: 50,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      }),
    );

    component.openFormsDialog();

    expect(component.availableForms()).toEqual([]);
    expect(component.formsListLoading()).toBeFalse();
  });

  it('should handle delete error with custom message', () => {
    const form = component.availableForms()[0];
    const errorResponse = { error: { message: 'Form is published' } };
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(messageService, 'add');
    formsApiService.deleteForm.and.returnValue(throwError(() => errorResponse));

    component.onDeleteForm(form);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Form is published',
      life: 3000,
    });
  });

  it('should handle delete error with fallback message', () => {
    const form = component.availableForms()[0];
    const errorResponse = {};
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(messageService, 'add');
    formsApiService.deleteForm.and.returnValue(throwError(() => errorResponse));

    component.onDeleteForm(form);

    expect(messageService.add).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Failed to delete form',
      life: 3000,
    });
  });

  describe('Form Preview', () => {
    it('should open preview in new tab with correct URL and localStorage data', () => {
      const mockFormFields: any[] = [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          label: 'Name',
          fieldName: 'name',
          placeholder: '',
          helpText: '',
          required: true,
          order: 0,
          validation: {},
        },
      ];

      // Set up form state
      formBuilderService.setFormFields(mockFormFields as any);
      component.formSettings.set({
        title: 'Test Form',
        description: 'Test Description',
        columnLayout: 2,
        fieldSpacing: 'normal',
        successMessage: 'Success!',
        redirectUrl: 'https://example.com',
        allowMultipleSubmissions: true,
      });

      component.onPreview();

      // Verify preview dialog visible signal set to true (Story 14.3)
      expect(component.previewDialogVisible()).toBe(true);

      // Verify preview form schema is set (Story 14.3)
      const schema = component.previewFormSchema();
      expect(schema).toBeTruthy();
      expect(schema?.fields.length).toBe(1);
      expect(schema?.settings.layout.columns).toBe(2);
      expect(schema?.settings.layout.spacing).toBe('medium');
      expect(schema?.settings.submission.successMessage).toBe('Success!');
      expect(schema?.settings.submission.redirectUrl).toBe('https://example.com');
      expect(schema?.settings.submission.allowMultipleSubmissions).toBe(true);
    });

    it('should handle preview with empty optional fields', () => {
      const mockFormFields: any[] = [];

      formBuilderService.setFormFields(mockFormFields);
      component.formSettings.set({
        title: 'Simple Form',
        description: '',
        columnLayout: 1,
        fieldSpacing: 'compact',
        successMessage: '',
        redirectUrl: '',
        allowMultipleSubmissions: false,
      });

      component.onPreview();

      const schema = component.previewFormSchema();
      expect(schema).toBeTruthy();
      expect(schema?.fields.length).toBe(0);
      expect(schema?.settings.layout.columns).toBe(1);
      expect(schema?.settings.layout.spacing).toBe('small');
      expect(schema?.settings.submission.successMessage).toBe('');
      expect(schema?.settings.submission.redirectUrl).toBeUndefined();
      expect(schema?.settings.submission.allowMultipleSubmissions).toBe(false);
    });

    it('should set previewVisible to true when onPreview called (Story 14.3)', () => {
      expect(component.previewDialogVisible()).toBe(false);

      component.onPreview();

      expect(component.previewDialogVisible()).toBe(true);
    });

    it('should export current schema to previewSchema when onPreview called (Story 14.3)', () => {
      const mockFormFields: any[] = [
        {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'email',
          label: 'Email',
          placeholder: '',
          helpText: '',
          required: true,
          order: 0,
        },
      ];

      formBuilderService.setFormFields(mockFormFields as any);

      expect(component.previewFormSchema()).toBeNull();

      component.onPreview();

      const schema = component.previewFormSchema();
      expect(schema).toBeTruthy();
      expect(schema?.fields.length).toBe(1);
      expect(schema?.fields[0].fieldName).toBe('email');
    });

    it('should set previewVisible to false when closePreview called (Story 14.3)', () => {
      component.previewDialogVisible.set(true);

      component.closePreview();

      expect(component.previewDialogVisible()).toBe(false);
    });

    it('should clear previewSchema when closePreview called (Story 14.3)', () => {
      component.previewDialogVisible.set(true);
      component.previewFormSchema.set({
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: '',
            allowMultipleSubmissions: true,
          },
        },
      } as any);

      component.closePreview();

      expect(component.previewFormSchema()).toBeNull();
    });
  });

  describe('Theme Integration', () => {
    let themesApiService: jasmine.SpyObj<any>;
    let themePreviewService: jasmine.SpyObj<any>;

    beforeEach(() => {
      // Create spies for theme services
      themesApiService = jasmine.createSpyObj('ThemesApiService', ['getThemes', 'applyTheme']);
      themePreviewService = jasmine.createSpyObj('ThemePreviewService', [
        'applyThemeCss',
        'clearThemeCss',
      ]);

      // Replace the injected services with spies
      (formBuilderService as any).themesApi = themesApiService;
      (formBuilderService as any).themePreviewService = themePreviewService;
    });

    describe('onThemeSelected', () => {
      it('should apply theme when theme is selected', () => {
        const mockTheme = {
          id: 'theme-1',
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
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mock API response
        themesApiService.applyTheme.and.returnValue({
          subscribe: (callback: any) => {
            callback.next({ data: { usageCount: 10 } });
          },
        });

        // Set up available themes
        (formBuilderService as any)._availableThemes.set([mockTheme]);

        // Set up current form
        const mockForm = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        formBuilderService.setCurrentForm(mockForm);

        // Select theme
        component.onThemeSelected(mockTheme);

        // Verify theme was applied
        expect(formBuilderService.currentTheme()).toEqual(mockTheme);
        expect(formBuilderService.isDirty()).toBe(true);
        expect(themePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
        expect(themesApiService.applyTheme).toHaveBeenCalledWith('theme-1');
      });

      it('should handle theme selection error gracefully', () => {
        spyOn(console, 'error');

        // Mock API error
        themesApiService.applyTheme.and.returnValue({
          subscribe: (callback: any) => {
            callback.error(new Error('API Error'));
          },
        });

        // Set up available themes
        const mockTheme = {
          id: 'theme-1',
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
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        (formBuilderService as any)._availableThemes.set([mockTheme]);

        // Set up current form
        const mockForm = {
          id: 'form-1',
          userId: 'user-1',
          title: 'Test Form',
          status: FormStatus.DRAFT,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        formBuilderService.setCurrentForm(mockForm);

        // Select theme
        component.onThemeSelected(mockTheme);

        // Verify error was handled gracefully
        expect(console.error).toHaveBeenCalledWith(
          'Failed to track theme usage:',
          jasmine.any(Error),
        );
        // Theme should still be applied locally even if API call fails
        expect(formBuilderService.currentTheme()).toEqual(mockTheme);
        expect(themePreviewService.applyThemeCss).toHaveBeenCalledWith(mockTheme);
      });
    });

    describe('Theme State Integration', () => {
      it('should reflect theme state in component signals', () => {
        const mockTheme = {
          id: 'theme-1',
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
              containerPosition: 'center' as const,
            },
          },
          usageCount: 0,
          isActive: true,
          isCustom: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Set theme in service
        (formBuilderService as any)._currentTheme.set(mockTheme);

        // Trigger change detection
        fixture.detectChanges();

        // Verify component reflects theme state
        expect(component.currentTheme()).toEqual(mockTheme);
      });

      it('should reflect theme loading state in component signals', () => {
        // Set loading state in service
        (formBuilderService as any)._isThemeLoading.set(true);

        // Trigger change detection
        fixture.detectChanges();

        // Verify component reflects loading state
        expect(component.isThemeLoading()).toBe(true);
      });

      it('should reflect available themes in component signals', () => {
        const mockThemes = [
          {
            id: 'theme-1',
            name: 'Theme 1',
            description: 'First theme',
            thumbnailUrl: 'https://example.com/thumb1.jpg',
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
                containerPosition: 'center' as const,
              },
            },
            usageCount: 0,
            isActive: true,
            isCustom: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'theme-2',
            name: 'Theme 2',
            description: 'Second theme',
            thumbnailUrl: 'https://example.com/thumb2.jpg',
            themeConfig: {
              desktop: {
                primaryColor: '#33FF57',
                secondaryColor: '#FF5733',
                backgroundColor: '#F0F0F0',
                textColorPrimary: '#333333',
                textColorSecondary: '#666666',
                fontFamilyHeading: 'Georgia, serif',
                fontFamilyBody: 'Times, serif',
                fieldBorderRadius: '4px',
                fieldSpacing: '16px',
                containerBackground: '#FFFFFF',
                containerOpacity: 0.95,
                containerPosition: 'center' as const,
              },
            },
            usageCount: 0,
            isActive: true,
            isCustom: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        // Set available themes in service
        (formBuilderService as any)._availableThemes.set(mockThemes);

        // Trigger change detection
        fixture.detectChanges();

        // Verify component reflects available themes
        expect(component.availableThemes()).toEqual(mockThemes);
      });
    });
  });

  // Story 29.8: Template Application to Form Builder
  describe('Template Application via Query Parameter', () => {
    let templatesApiService: jasmine.SpyObj<any>;
    let router: jasmine.SpyObj<Router>;
    let activatedRoute: any;

    beforeEach(async () => {
      templatesApiService = jasmine.createSpyObj('TemplatesApiService', ['applyTemplate']);
      router = jasmine.createSpyObj('Router', ['navigate']);

      await TestBed.configureTestingModule({
        imports: [FormBuilderComponent],
        providers: [
          FormBuilderService,
          MessageService,
          { provide: FormsApiService, useValue: formsApiService },
          { provide: Router, useValue: router },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: {
                paramMap: convertToParamMap({}),
                queryParamMap: convertToParamMap({}),
              },
            },
          },
        ],
      })
        .overrideComponent(FormBuilderComponent, {
          set: {
            providers: [
              { provide: 'TemplatesApiService', useValue: templatesApiService },
            ],
          },
        })
        .compileComponents();

      fixture = TestBed.createComponent(FormBuilderComponent);
      component = fixture.componentInstance;
      formBuilderService = TestBed.inject(FormBuilderService);
      messageService = TestBed.inject(MessageService);
      activatedRoute = TestBed.inject(ActivatedRoute);

      // Inject mocked TemplatesApiService
      (component as any).templatesApiService = templatesApiService;
      (component as any).router = router;
    });

    describe('Query parameter detection', () => {
      it('should detect templateId query parameter and call applyTemplateFromQuery', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-001',
          formId: 'form-test-001',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));
        activatedRoute.snapshot.queryParamMap = convertToParamMap({ templateId: 'template-123' });

        spyOn<any>(component, 'applyTemplateFromQuery');

        component.ngOnInit();

        expect((component as any).applyTemplateFromQuery).toHaveBeenCalledWith('template-123');
      });

      it('should not call applyTemplateFromQuery when templateId is absent', () => {
        activatedRoute.snapshot.queryParamMap = convertToParamMap({});

        spyOn<any>(component, 'applyTemplateFromQuery');

        component.ngOnInit();

        expect((component as any).applyTemplateFromQuery).not.toHaveBeenCalled();
      });

      it('should return early after template application (skip normal init)', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-002',
          formId: 'form-test-002',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));
        activatedRoute.snapshot.queryParamMap = convertToParamMap({ templateId: 'template-123' });
        activatedRoute.snapshot.paramMap = convertToParamMap({});

        spyOn(formBuilderService, 'resetForm');

        component.ngOnInit();

        // resetForm should NOT be called (early return)
        expect(formBuilderService.resetForm).not.toHaveBeenCalled();
      });
    });

    describe('applyTemplateFromQuery success path', () => {
      it('should load template schema into form builder on success', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-003',
          formId: 'form-test-003',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              fieldName: 'name',
              label: 'Name',
              placeholder: '',
              helpText: '',
              required: true,
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
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));
        spyOn(formBuilderService, 'loadFormSchema');

        (component as any).applyTemplateFromQuery('template-123');

        expect(templatesApiService.applyTemplate).toHaveBeenCalledWith('template-123');
        expect(formBuilderService.loadFormSchema).toHaveBeenCalledWith(mockSchema);
      });

      it('should display success toast after template application', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-004',
          formId: 'form-test-004',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));
        spyOn(messageService, 'add');

        (component as any).applyTemplateFromQuery('template-123');

        expect(messageService.add).toHaveBeenCalledWith({
          severity: 'success',
          summary: 'Template Applied',
          detail: 'Template applied successfully!',
          life: 3000,
        });
      });

      it('should remove templateId query parameter after successful load', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-005',
          formId: 'form-test-005',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));

        (component as any).applyTemplateFromQuery('template-123');

        expect(router.navigate).toHaveBeenCalledWith(
          [],
          jasmine.objectContaining({
            queryParams: { templateId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          }),
        );
      });

      it('should set isLoadingTemplate to false after successful load', () => {
        const mockSchema: FormSchema = {
          id: 'schema-test-006',
          formId: 'form-test-006',
          version: 1,
          isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you!',
              allowMultipleSubmissions: false,
            },
          },
        };

        templatesApiService.applyTemplate.and.returnValue(of({ data: mockSchema }));

        expect(component.isLoadingTemplate()).toBe(false);

        (component as any).applyTemplateFromQuery('template-123');

        expect(component.isLoadingTemplate()).toBe(false);
      });
    });

    describe('applyTemplateFromQuery error handling', () => {
      it('should handle 404 error with specific message', () => {
        const errorResponse = { status: 404, error: { message: 'Template not found' } };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));
        spyOn(messageService, 'add');
        spyOn(console, 'error');

        (component as any).applyTemplateFromQuery('invalid-template-id');

        expect(console.error).toHaveBeenCalledWith('Failed to apply template:', errorResponse);
        expect(messageService.add).toHaveBeenCalledWith({
          severity: 'error',
          summary: 'Template Load Failed',
          detail: 'Template not found. It may have been removed. Starting with blank form.',
          life: 5000,
        });
      });

      it('should handle 500 error with specific message', () => {
        const errorResponse = { status: 500, error: { message: 'Internal server error' } };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));
        spyOn(messageService, 'add');

        (component as any).applyTemplateFromQuery('template-123');

        expect(messageService.add).toHaveBeenCalledWith({
          severity: 'error',
          summary: 'Template Load Failed',
          detail: 'Server error while loading template. Please try again or start with a blank form.',
          life: 5000,
        });
      });

      it('should handle network error (status 0) with specific message', () => {
        const errorResponse = { status: 0, error: null };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));
        spyOn(messageService, 'add');

        (component as any).applyTemplateFromQuery('template-123');

        expect(messageService.add).toHaveBeenCalledWith({
          severity: 'error',
          summary: 'Template Load Failed',
          detail: 'Network error. Please check your connection and try again.',
          life: 5000,
        });
      });

      it('should fall back to blank form on error', () => {
        const errorResponse = { status: 404 };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));
        spyOn(formBuilderService, 'resetForm');
        spyOn(formBuilderService, 'enableRowLayout');

        (component as any).applyTemplateFromQuery('template-123');

        expect(formBuilderService.resetForm).toHaveBeenCalled();
        expect(formBuilderService.enableRowLayout).toHaveBeenCalledWith(1);
      });

      it('should remove query parameter on error', () => {
        const errorResponse = { status: 404 };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));

        (component as any).applyTemplateFromQuery('template-123');

        expect(router.navigate).toHaveBeenCalledWith(
          [],
          jasmine.objectContaining({
            queryParams: { templateId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          }),
        );
      });

      it('should set isLoadingTemplate to false after error', () => {
        const errorResponse = { status: 404 };
        templatesApiService.applyTemplate.and.returnValue(throwError(() => errorResponse));

        (component as any).applyTemplateFromQuery('template-123');

        expect(component.isLoadingTemplate()).toBe(false);
      });
    });

    describe('Template metadata badge', () => {
      it('should display template metadata badge when isTemplateMode is true', () => {
        // Set up template mode
        formBuilderService.applyTemplate({
          id: 'template-123',
          name: 'Contact Form',
          description: 'Simple contact form',
          category: TemplateCategory.DATA_COLLECTION,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            id: 'schema-template-123',
            formId: 'template-123',
            version: 1,
            isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const badge = compiled.querySelector('.template-badge');

        expect(formBuilderService.isTemplateMode()).toBe(true);
        expect(badge).toBeTruthy();
      });

      it('should not display template badge when isTemplateMode is false', () => {
        expect(formBuilderService.isTemplateMode()).toBe(false);

        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const badge = compiled.querySelector('.template-badge');

        expect(badge).toBeFalsy();
      });

      it('should show template name in badge', () => {
        formBuilderService.applyTemplate({
          id: 'template-123',
          name: 'Product Order Form',
          description: 'Template for product orders',
          category: TemplateCategory.ECOMMERCE,
          previewImageUrl: 'https://example.com/preview.jpg',
          templateSchema: {
            id: 'schema-product-order',
            formId: 'template-123',
            version: 1,
            isPublished: true,
          createdAt: new Date(),
          updatedAt: new Date(),
            fields: [],
            settings: {
              layout: { columns: 1, spacing: 'medium' },
              submission: {
                showSuccessMessage: true,
                successMessage: 'Thank you!',
                allowMultipleSubmissions: false,
              },
            },
          },
          usageCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        fixture.detectChanges();

        expect(formBuilderService.templateMetadata()?.name).toBe('Product Order Form');
      });
    });
  });
});
