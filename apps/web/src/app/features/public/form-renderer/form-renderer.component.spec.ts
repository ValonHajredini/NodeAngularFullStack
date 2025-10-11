import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { FormRendererComponent } from './form-renderer.component';
import { FormRendererService, FormRenderError, FormRenderErrorType } from './form-renderer.service';
import { FormFieldType, FormSchema, FormSettings } from '@nodeangularfullstack/shared';

describe('FormRendererComponent', () => {
  let component: FormRendererComponent;
  let fixture: ComponentFixture<FormRendererComponent>;
  let formRendererService: jasmine.SpyObj<FormRendererService>;
  let activatedRoute: any;

  const mockSchema: FormSchema = {
    id: 'schema-1',
    formId: 'form-1',
    version: 1,
    isPublished: true,
    fields: [
      {
        id: 'field-1',
        type: FormFieldType.TEXT,
        label: 'Name',
        fieldName: 'name',
        required: true,
        order: 1,
      },
      {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        label: 'Email',
        fieldName: 'email',
        required: true,
        order: 2,
      },
      {
        id: 'field-3',
        type: FormFieldType.NUMBER,
        label: 'Age',
        fieldName: 'age',
        required: false,
        order: 3,
        validation: {
          min: 18,
          max: 100,
        },
      },
      {
        id: 'field-4',
        type: FormFieldType.SELECT,
        label: 'Country',
        fieldName: 'country',
        required: true,
        order: 4,
        options: [
          { label: 'USA', value: 'us' },
          { label: 'Canada', value: 'ca' },
        ],
      },
      {
        id: 'field-5',
        type: FormFieldType.CHECKBOX,
        label: 'Accept Terms',
        fieldName: 'accept-terms',
        required: true,
        order: 5,
      },
      {
        id: 'field-6',
        type: FormFieldType.TEXTAREA,
        label: 'Comments',
        fieldName: 'comments',
        required: false,
        order: 6,
        validation: {
          maxLength: 500,
        },
      },
    ],
    settings: {
      layout: {
        columns: 2,
        spacing: 'medium',
      },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Thank you!',
        allowMultipleSubmissions: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings: FormSettings = {
    layout: {
      columns: 2,
      spacing: 'medium',
    },
    submission: {
      showSuccessMessage: true,
      successMessage: 'Thank you!',
      allowMultipleSubmissions: false,
    },
  };

  beforeEach(async () => {
    const formRendererServiceSpy = jasmine.createSpyObj('FormRendererService', ['getFormSchema']);
    const activatedRouteStub = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('valid-token'),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [FormRendererComponent, HttpClientTestingModule],
      providers: [
        { provide: FormRendererService, useValue: formRendererServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    }).compileComponents();

    formRendererService = TestBed.inject(
      FormRendererService,
    ) as jasmine.SpyObj<FormRendererService>;
    activatedRoute = TestBed.inject(ActivatedRoute);

    formRendererService.getFormSchema.and.returnValue(
      of({ schema: mockSchema, settings: mockSettings }),
    );

    fixture = TestBed.createComponent(FormRendererComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load form schema on init with valid token', () => {
      fixture.detectChanges();

      expect(formRendererService.getFormSchema).toHaveBeenCalledWith('valid-token');
      expect(component.schema).toEqual(mockSchema);
      expect(component.settings).toEqual(mockSettings);
      expect(component.state.loading).toBe(false);
      expect(component.state.error).toBeNull();
    });

    it('should show error if no token provided', () => {
      activatedRoute.snapshot.paramMap.get.and.returnValue(null);
      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      newFixture.detectChanges();

      expect(newComponent.state.error).toBe('No form token provided');
      expect(newComponent.state.errorType).toBe(FormRenderErrorType.INVALID_TOKEN);
    });

    it('should handle form not found error', () => {
      const error = new FormRenderError(FormRenderErrorType.NOT_FOUND, 'Form not found', 404);
      formRendererService.getFormSchema.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.state.error).toBe('Form not found');
      expect(component.state.errorType).toBe(FormRenderErrorType.NOT_FOUND);
      expect(component.state.loading).toBe(false);
    });

    it('should handle expired token error', () => {
      const error = new FormRenderError(FormRenderErrorType.EXPIRED, 'This form has expired', 410);
      formRendererService.getFormSchema.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.state.error).toBe('This form has expired');
      expect(component.state.errorType).toBe(FormRenderErrorType.EXPIRED);
    });

    it('should handle rate limit error', () => {
      const error = new FormRenderError(FormRenderErrorType.RATE_LIMITED, 'Too many requests', 429);
      formRendererService.getFormSchema.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.state.error).toBe('Too many requests');
      expect(component.state.errorType).toBe(FormRenderErrorType.RATE_LIMITED);
    });
  });

  describe('Dynamic FormGroup Generation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create FormGroup with all fields from schema', () => {
      expect(component.formGroup).toBeTruthy();
      expect(component.formGroup?.get('name')).toBeTruthy();
      expect(component.formGroup?.get('email')).toBeTruthy();
      expect(component.formGroup?.get('age')).toBeTruthy();
      expect(component.formGroup?.get('country')).toBeTruthy();
      expect(component.formGroup?.get('accept-terms')).toBeTruthy();
      expect(component.formGroup?.get('comments')).toBeTruthy();
    });

    it('should apply required validators from schema', () => {
      const nameControl = component.formGroup?.get('name');
      const emailControl = component.formGroup?.get('email');
      const ageControl = component.formGroup?.get('age');

      expect(nameControl?.hasError('required')).toBe(true);
      expect(emailControl?.hasError('required')).toBe(true);
      expect(ageControl?.hasError('required')).toBe(false);
    });

    it('should apply email validator for email fields', () => {
      const emailControl = component.formGroup?.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@example.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should apply min/max validators for number fields', () => {
      const ageControl = component.formGroup?.get('age');

      ageControl?.setValue(17);
      expect(ageControl?.hasError('min')).toBe(true);

      ageControl?.setValue(101);
      expect(ageControl?.hasError('max')).toBe(true);

      ageControl?.setValue(25);
      expect(ageControl?.valid).toBe(true);
    });

    it('should apply maxLength validator for textarea fields', () => {
      const commentsControl = component.formGroup?.get('comments');

      const longText = 'a'.repeat(501);
      commentsControl?.setValue(longText);
      expect(commentsControl?.hasError('maxlength')).toBe(true);

      commentsControl?.setValue('Valid comment');
      expect(commentsControl?.valid).toBe(true);
    });

    it('should set default values for checkbox and toggle fields', () => {
      const checkboxControl = component.formGroup?.get('accept-terms');
      expect(checkboxControl?.value).toBe(false);
    });
  });

  describe('Conditional Visibility', () => {
    it('should show field when conditional rule is met', () => {
      const conditionalSchema: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.SELECT,
            label: 'Has Pet',
            fieldName: 'has-pet',
            required: true,
            order: 1,
            options: [
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ],
          },
          {
            id: 'field-2',
            type: FormFieldType.TEXT,
            label: 'Pet Name',
            fieldName: 'pet-name',
            required: false,
            order: 2,
            conditional: {
              watchFieldId: 'field-1',
              operator: 'equals',
              value: 'yes',
            },
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: conditionalSchema, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      const field1 = conditionalSchema.fields[0];
      const field2 = conditionalSchema.fields[1];

      // Initially, pet name should be hidden
      expect(newComponent.isFieldVisible(field2)).toBe(false);

      // Set has-pet to 'yes'
      newComponent.formGroup?.get('has-pet')?.setValue('yes');
      expect(newComponent.isFieldVisible(field2)).toBe(true);

      // Set has-pet to 'no'
      newComponent.formGroup?.get('has-pet')?.setValue('no');
      expect(newComponent.isFieldVisible(field2)).toBe(false);
    });

    it('should clear hidden field values automatically', () => {
      const conditionalSchema: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.CHECKBOX,
            label: 'Show Optional Field',
            fieldName: 'show-optional',
            required: false,
            order: 1,
          },
          {
            id: 'field-2',
            type: FormFieldType.TEXT,
            label: 'Optional Field',
            fieldName: 'optional-field',
            required: false,
            order: 2,
            conditional: {
              watchFieldId: 'field-1',
              operator: 'equals',
              value: true,
            },
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: conditionalSchema, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      // Show the field and set a value
      newComponent.formGroup?.get('show-optional')?.setValue(true);
      newComponent.formGroup?.get('optional-field')?.setValue('test value');

      expect(newComponent.formGroup?.get('optional-field')?.value).toBe('test value');

      // Hide the field - value should be cleared
      newComponent.formGroup?.get('show-optional')?.setValue(false);
      newFixture.detectChanges();

      expect(newComponent.formGroup?.get('optional-field')?.value).toBeNull();
    });
  });

  describe('Field Visibility and Rendering', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return sorted fields by order', () => {
      const sortedFields = component.getSortedFields();
      expect(sortedFields[0].fieldName).toBe('name');
      expect(sortedFields[1].fieldName).toBe('email');
      expect(sortedFields[2].fieldName).toBe('age');
    });

    it('should show error messages only when field is touched and invalid', () => {
      const nameControl = component.formGroup?.get('name');

      // Initially untouched
      expect(component.shouldShowError('name')).toBe(false);

      // Mark as touched
      nameControl?.markAsTouched();
      expect(component.shouldShowError('name')).toBe(true);

      // Set valid value
      nameControl?.setValue('John Doe');
      expect(component.shouldShowError('name')).toBe(false);
    });

    it('should generate correct error messages', () => {
      const nameField = mockSchema.fields[0];
      const emailField = mockSchema.fields[1];
      const ageField = mockSchema.fields[2];

      // Required error
      component.formGroup?.get('name')?.setErrors({ required: true });
      expect(component.getErrorMessage(nameField)).toBe('This field is required');

      // Email error
      component.formGroup?.get('email')?.setErrors({ email: true });
      expect(component.getErrorMessage(emailField)).toBe('Invalid email address');

      // Min error
      component.formGroup?.get('age')?.setErrors({ min: { min: 18, actual: 17 } });
      expect(component.getErrorMessage(ageField)).toBe('Value must be at least 18');

      // Max error
      component.formGroup?.get('age')?.setErrors({ max: { max: 100, actual: 101 } });
      expect(component.getErrorMessage(ageField)).toBe('Value must be at most 100');
    });
  });

  describe('Layout and Styling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should generate correct grid class based on column layout', () => {
      expect(component.getGridClass()).toBe('grid-cols-2');

      component.settings = {
        ...mockSettings,
        layout: { ...mockSettings.layout, columns: 3 },
      };
      expect(component.getGridClass()).toBe('grid-cols-3');
    });

    it('should generate correct spacing class', () => {
      expect(component.getFieldSpacingClass()).toBe('spacing-medium');

      component.settings = {
        ...mockSettings,
        layout: { ...mockSettings.layout, spacing: 'large' },
      };
      expect(component.getFieldSpacingClass()).toBe('spacing-large');
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should disable submit when form is invalid', () => {
      expect(component.formGroup?.invalid).toBe(true);
      component.onSubmit();
      expect(component.state.submitting).toBe(false);
    });

    it('should enable submit when form is valid', () => {
      // Fill all required fields
      component.formGroup?.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        country: 'us',
        'accept-terms': true,
      });

      expect(component.formGroup?.valid).toBe(true);
    });

    it('should set submitting state on submit', () => {
      component.formGroup?.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        country: 'us',
        'accept-terms': true,
      });

      component.onSubmit();
      expect(component.state.submitting).toBe(true);
    });
  });

  describe('All Field Types Rendering', () => {
    it('should handle TEXT field type', () => {
      fixture.detectChanges();
      expect(component.formGroup?.get('name')).toBeTruthy();
    });

    it('should handle EMAIL field type', () => {
      fixture.detectChanges();
      expect(component.formGroup?.get('email')).toBeTruthy();
      component.formGroup?.get('email')?.setValue('test@example.com');
      expect(component.formGroup?.get('email')?.valid).toBe(true);
    });

    it('should handle NUMBER field type', () => {
      fixture.detectChanges();
      expect(component.formGroup?.get('age')).toBeTruthy();
      component.formGroup?.get('age')?.setValue(25);
      expect(component.formGroup?.get('age')?.valid).toBe(true);
    });

    it('should handle SELECT field type', () => {
      fixture.detectChanges();
      expect(component.formGroup?.get('country')).toBeTruthy();
      expect(mockSchema.fields[3].options?.length).toBe(2);
    });

    it('should handle CHECKBOX field type', () => {
      fixture.detectChanges();
      const checkboxControl = component.formGroup?.get('accept-terms');
      expect(checkboxControl).toBeTruthy();
      expect(checkboxControl?.value).toBe(false);
    });

    it('should handle TEXTAREA field type', () => {
      fixture.detectChanges();
      expect(component.formGroup?.get('comments')).toBeTruthy();
    });

    it('should handle RADIO field type', () => {
      const schemaWithRadio: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-radio',
            type: FormFieldType.RADIO,
            label: 'Gender',
            fieldName: 'gender',
            required: true,
            order: 1,
            options: [
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
            ],
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: schemaWithRadio, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      newFixture.detectChanges();
      const newComponent = newFixture.componentInstance;

      expect(newComponent.formGroup?.get('gender')).toBeTruthy();
    });

    it('should handle TOGGLE field type', () => {
      const schemaWithToggle: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-toggle',
            type: FormFieldType.TOGGLE,
            label: 'Enable Notifications',
            fieldName: 'enable-notifications',
            required: false,
            order: 1,
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: schemaWithToggle, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      newFixture.detectChanges();
      const newComponent = newFixture.componentInstance;

      expect(newComponent.formGroup?.get('enable-notifications')).toBeTruthy();
      expect(newComponent.formGroup?.get('enable-notifications')?.value).toBe(false);
    });

    it('should handle DATE field type', () => {
      const schemaWithDate: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-date',
            type: FormFieldType.DATE,
            label: 'Birth Date',
            fieldName: 'birth-date',
            required: true,
            order: 1,
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: schemaWithDate, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      newFixture.detectChanges();
      const newComponent = newFixture.componentInstance;

      expect(newComponent.formGroup?.get('birth-date')).toBeTruthy();
    });

    it('should handle DATETIME field type', () => {
      const schemaWithDateTime: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-datetime',
            type: FormFieldType.DATETIME,
            label: 'Appointment',
            fieldName: 'appointment',
            required: true,
            order: 1,
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: schemaWithDateTime, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      newFixture.detectChanges();
      const newComponent = newFixture.componentInstance;

      expect(newComponent.formGroup?.get('appointment')).toBeTruthy();
    });

    it('should skip DIVIDER field type in FormGroup', () => {
      const schemaWithDivider: FormSchema = {
        ...mockSchema,
        fields: [
          {
            id: 'field-divider',
            type: FormFieldType.DIVIDER,
            label: '',
            fieldName: 'divider-1',
            required: false,
            order: 1,
          },
          {
            id: 'field-text',
            type: FormFieldType.TEXT,
            label: 'Name',
            fieldName: 'name',
            required: true,
            order: 2,
          },
        ],
      };

      formRendererService.getFormSchema.and.returnValue(
        of({ schema: schemaWithDivider, settings: mockSettings as FormSettings }),
      );

      const newFixture = TestBed.createComponent(FormRendererComponent);
      newFixture.detectChanges();
      const newComponent = newFixture.componentInstance;

      expect(newComponent.formGroup?.get('divider-1')).toBeFalsy();
      expect(newComponent.formGroup?.get('name')).toBeTruthy();
    });
  });

  describe('Preview Mode', () => {
    it('should load preview data from sessionStorage when on preview route', () => {
      const previewId = 'test-preview-123';
      const previewData = {
        schema: {
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'Preview Field',
              fieldName: 'preview-field',
              required: true,
              order: 1,
            },
          ],
          version: '1.0.0',
        },
        settings: {
          layout: {
            columns: 1 as 1 | 2 | 3 | 4,
            spacing: 'medium' as 'small' | 'medium' | 'large',
          },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: false,
          },
        },
        isPreview: true,
      };

      // Set up preview route
      const urlSubject = new Subject<any>();
      const previewRouteStub = {
        snapshot: {
          paramMap: {
            get: jasmine.createSpy('get').and.returnValue(previewId),
          },
        },
        url: urlSubject.asObservable(),
      };

      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(previewData));

      TestBed.overrideProvider(ActivatedRoute, { useValue: previewRouteStub });

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      // Emit preview route URL segments
      urlSubject.next([{ path: 'forms' }, { path: 'preview' }, { path: previewId }]);
      newFixture.detectChanges();

      expect(localStorage.getItem).toHaveBeenCalledWith(`form-preview-${previewId}`);
      expect(newComponent.isPreview).toBe(true);
      expect(newComponent.schema?.fields.length).toBe(1);
      expect(newComponent.settings?.layout.columns).toBe(1);
      expect(newComponent.state.loading).toBe(false);
    });

    it('should show error when preview data not found in localStorage', () => {
      const previewId = 'missing-preview';
      const urlSubject = new Subject<any>();
      const previewRouteStub = {
        snapshot: {
          paramMap: {
            get: jasmine.createSpy('get').and.returnValue(previewId),
          },
        },
        url: urlSubject.asObservable(),
      };

      spyOn(localStorage, 'getItem').and.returnValue(null);

      TestBed.overrideProvider(ActivatedRoute, { useValue: previewRouteStub });

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      urlSubject.next([{ path: 'forms' }, { path: 'preview' }, { path: previewId }]);
      newFixture.detectChanges();

      expect(newComponent.state.error).toBe(
        'Preview data not found. Please generate a new preview.',
      );
      expect(newComponent.state.errorType).toBe(FormRenderErrorType.FORM_NOT_FOUND);
    });

    it('should show error when preview data is invalid JSON', () => {
      const previewId = 'invalid-preview';
      const urlSubject = new Subject<any>();
      const previewRouteStub = {
        snapshot: {
          paramMap: {
            get: jasmine.createSpy('get').and.returnValue(previewId),
          },
        },
        url: urlSubject.asObservable(),
      };

      spyOn(localStorage, 'getItem').and.returnValue('invalid-json{');

      TestBed.overrideProvider(ActivatedRoute, { useValue: previewRouteStub });

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      urlSubject.next([{ path: 'forms' }, { path: 'preview' }, { path: previewId }]);
      newFixture.detectChanges();

      expect(newComponent.state.error).toBe('Failed to load preview data');
      expect(newComponent.state.errorType).toBe(FormRenderErrorType.PARSE_ERROR);
    });

    it('should disable submit button in preview mode', () => {
      const previewData = {
        schema: mockSchema,
        settings: mockSettings,
        isPreview: true,
      };

      const previewId = 'test-preview-submit';
      const urlSubject = new Subject<any>();
      const previewRouteStub = {
        snapshot: {
          paramMap: {
            get: jasmine.createSpy('get').and.returnValue(previewId),
          },
        },
        url: urlSubject.asObservable(),
      };

      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(previewData));

      TestBed.overrideProvider(ActivatedRoute, { useValue: previewRouteStub });

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      urlSubject.next([{ path: 'forms' }, { path: 'preview' }, { path: previewId }]);
      newFixture.detectChanges();

      expect(newComponent.isPreview).toBe(true);
      expect(newComponent.canSubmit).toBe(false);

      // Even with valid form, canSubmit should be false in preview
      newComponent.formGroup?.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        country: 'us',
        'accept-terms': true,
      });
      newFixture.detectChanges();

      expect(newComponent.formGroup?.valid).toBe(true);
      expect(newComponent.canSubmit).toBe(false);
    });

    it('should not call submit service in preview mode', () => {
      const previewData = {
        schema: mockSchema,
        settings: mockSettings,
        isPreview: true,
      };

      const previewId = 'test-preview-no-submit';
      const urlSubject = new Subject<any>();
      const previewRouteStub = {
        snapshot: {
          paramMap: {
            get: jasmine.createSpy('get').and.returnValue(previewId),
          },
        },
        url: urlSubject.asObservable(),
      };

      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(previewData));

      TestBed.overrideProvider(ActivatedRoute, { useValue: previewRouteStub });

      const newFixture = TestBed.createComponent(FormRendererComponent);
      const newComponent = newFixture.componentInstance;

      urlSubject.next([{ path: 'forms' }, { path: 'preview' }, { path: previewId }]);
      newFixture.detectChanges();

      // Fill form with valid data
      newComponent.formGroup?.patchValue({
        name: 'John Doe',
        email: 'john@example.com',
        country: 'us',
        'accept-terms': true,
      });

      // Spy on submitForm service
      spyOn(formRendererService, 'submitForm').and.returnValue(
        of({ submissionId: 'test-submission-id', message: 'Success' }),
      );

      // Attempt to submit
      newComponent.onSubmit();

      // Service should not be called in preview mode
      expect(formRendererService.submitForm).not.toHaveBeenCalled();
      expect(newComponent.state.submitting).toBe(false);
    });
  });

  describe('Row Layout Support (Story 14.2)', () => {
    describe('Layout Mode Detection', () => {
      it('should detect row layout when enabled is true', () => {
        const rowLayoutSettings: FormSettings = {
          ...mockSettings,
          rowLayout: {
            enabled: true,
            rows: [
              { rowId: 'row-1', columnCount: 2, order: 0 },
              { rowId: 'row-2', columnCount: 3, order: 1 },
            ],
          },
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mockSchema, settings: rowLayoutSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        expect(newComponent.isRowLayoutEnabled()).toBe(true);
      });

      it('should return false when row layout is disabled', () => {
        const rowLayoutSettings: FormSettings = {
          ...mockSettings,
          rowLayout: {
            enabled: false,
            rows: [],
          },
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mockSchema, settings: rowLayoutSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        expect(newComponent.isRowLayoutEnabled()).toBe(false);
      });

      it('should return false when row layout is undefined (backward compatibility)', () => {
        const settingsWithoutRowLayout: FormSettings = {
          ...mockSettings,
          rowLayout: undefined,
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mockSchema, settings: settingsWithoutRowLayout as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        expect(newComponent.isRowLayoutEnabled()).toBe(false);
      });
    });

    describe('Row Configuration', () => {
      it('should return sorted rows by order (ascending)', () => {
        const rowLayoutSettings: FormSettings = {
          ...mockSettings,
          rowLayout: {
            enabled: true,
            rows: [
              { rowId: 'row-3', columnCount: 4, order: 2 },
              { rowId: 'row-1', columnCount: 2, order: 0 },
              { rowId: 'row-2', columnCount: 3, order: 1 },
            ],
          },
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mockSchema, settings: rowLayoutSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const rows = newComponent.getRowConfigs();
        expect(rows.length).toBe(3);
        expect(rows[0].rowId).toBe('row-1');
        expect(rows[1].rowId).toBe('row-2');
        expect(rows[2].rowId).toBe('row-3');
      });

      it('should return empty array when row layout is disabled', () => {
        fixture.detectChanges();
        const rows = component.getRowConfigs();
        expect(rows).toEqual([]);
      });
    });

    describe('Field Filtering and Sorting', () => {
      it('should return fields in column sorted by orderInColumn', () => {
        const schemaWithPositions: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'Field 1',
              fieldName: 'field-1',
              required: true,
              order: 1,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 2 },
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT,
              label: 'Field 2',
              fieldName: 'field-2',
              required: true,
              order: 2,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 0 },
            },
            {
              id: 'field-3',
              type: FormFieldType.TEXT,
              label: 'Field 3',
              fieldName: 'field-3',
              required: true,
              order: 3,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 1 },
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithPositions, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const fields = newComponent.getFieldsInColumn('row-1', 0);
        expect(fields.length).toBe(3);
        expect(fields[0].fieldName).toBe('field-2'); // orderInColumn: 0
        expect(fields[1].fieldName).toBe('field-3'); // orderInColumn: 1
        expect(fields[2].fieldName).toBe('field-1'); // orderInColumn: 2
      });

      it('should return empty array for non-existent row-column', () => {
        fixture.detectChanges();
        const fields = component.getFieldsInColumn('non-existent-row', 0);
        expect(fields).toEqual([]);
      });

      it('should filter fields by both rowId and columnIndex', () => {
        const schemaWithMultiplePositions: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'Field 1',
              fieldName: 'field-1',
              required: true,
              order: 1,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 0 },
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT,
              label: 'Field 2',
              fieldName: 'field-2',
              required: true,
              order: 2,
              position: { rowId: 'row-1', columnIndex: 1, orderInColumn: 0 },
            },
            {
              id: 'field-3',
              type: FormFieldType.TEXT,
              label: 'Field 3',
              fieldName: 'field-3',
              required: true,
              order: 3,
              position: { rowId: 'row-2', columnIndex: 0, orderInColumn: 0 },
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithMultiplePositions, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const row1Col0 = newComponent.getFieldsInColumn('row-1', 0);
        const row1Col1 = newComponent.getFieldsInColumn('row-1', 1);
        const row2Col0 = newComponent.getFieldsInColumn('row-2', 0);

        expect(row1Col0.length).toBe(1);
        expect(row1Col0[0].fieldName).toBe('field-1');

        expect(row1Col1.length).toBe(1);
        expect(row1Col1[0].fieldName).toBe('field-2');

        expect(row2Col0.length).toBe(1);
        expect(row2Col0[0].fieldName).toBe('field-3');
      });

      it('should handle fields without orderInColumn (defaults to 0)', () => {
        const schemaWithMissingOrderInColumn: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'Field 1',
              fieldName: 'field-1',
              required: true,
              order: 1,
              position: { rowId: 'row-1', columnIndex: 0 }, // orderInColumn omitted
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT,
              label: 'Field 2',
              fieldName: 'field-2',
              required: true,
              order: 2,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 1 },
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithMissingOrderInColumn, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const fields = newComponent.getFieldsInColumn('row-1', 0);
        expect(fields.length).toBe(2);
        expect(fields[0].fieldName).toBe('field-1'); // orderInColumn defaults to 0
        expect(fields[1].fieldName).toBe('field-2'); // orderInColumn: 1
      });
    });

    describe('Grid Column Calculations', () => {
      it('should return correct CSS Grid columns for different column counts', () => {
        fixture.detectChanges();

        expect(component.getGridColumns(1)).toBe('repeat(1, 1fr)');
        expect(component.getGridColumns(2)).toBe('repeat(2, 1fr)');
        expect(component.getGridColumns(3)).toBe('repeat(3, 1fr)');
        expect(component.getGridColumns(4)).toBe('repeat(4, 1fr)');
      });

      it('should return global grid columns for backward compatibility', () => {
        component.settings = {
          ...mockSettings,
          layout: { ...mockSettings.layout, columns: 3 },
        };
        fixture.detectChanges();

        expect(component.getGlobalGridColumns()).toBe('repeat(3, 1fr)');
      });

      it('should default to 1 column when layout columns is undefined', () => {
        component.settings = {
          ...mockSettings,
          layout: { ...mockSettings.layout, columns: undefined as any },
        };
        fixture.detectChanges();

        expect(component.getGlobalGridColumns()).toBe('repeat(1, 1fr)');
      });
    });

    describe('Backward Compatibility', () => {
      it('should render fields without position using global layout', () => {
        const schemaWithoutPositions: FormSchema = {
          ...mockSchema,
          fields: mockSchema.fields.map((f) => ({ ...f, position: undefined })),
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithoutPositions, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const fieldsWithoutPosition = newComponent.getFieldsWithoutPosition();
        expect(fieldsWithoutPosition.length).toBe(mockSchema.fields.length);
        expect(newComponent.isRowLayoutEnabled()).toBe(false);
      });

      it('should handle mixed fields (with and without position)', () => {
        const mixedSchema: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'field-1',
              type: FormFieldType.TEXT,
              label: 'With Position',
              fieldName: 'with-position',
              required: true,
              order: 1,
              position: { rowId: 'row-1', columnIndex: 0, orderInColumn: 0 },
            },
            {
              id: 'field-2',
              type: FormFieldType.TEXT,
              label: 'Without Position',
              fieldName: 'without-position',
              required: true,
              order: 2,
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mixedSchema, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        const withPosition = newComponent.getFieldsInColumn('row-1', 0);
        const withoutPosition = newComponent.getFieldsWithoutPosition();

        expect(withPosition.length).toBe(1);
        expect(withPosition[0].fieldName).toBe('with-position');

        expect(withoutPosition.length).toBe(1);
        expect(withoutPosition[0].fieldName).toBe('without-position');
      });
    });

    describe('Column Indices Helper', () => {
      it('should generate correct column indices array', () => {
        fixture.detectChanges();

        expect(component.getColumnIndices(1)).toEqual([0]);
        expect(component.getColumnIndices(2)).toEqual([0, 1]);
        expect(component.getColumnIndices(3)).toEqual([0, 1, 2]);
        expect(component.getColumnIndices(4)).toEqual([0, 1, 2, 3]);
      });

      it('should handle zero columns gracefully', () => {
        fixture.detectChanges();
        expect(component.getColumnIndices(0)).toEqual([]);
      });
    });
  });

  describe('Preview Mode (Story 14.3)', () => {
    it('should use provided formSchema when previewMode is true', () => {
      const mockSchema: any = {
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
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.previewMode = true;

      component.ngOnInit();

      expect(component.schema).toEqual(mockSchema);
      expect(component.settings).toEqual(mockSchema.settings);
      expect(component.isPreview).toBe(true);
      expect(component.state.loading).toBe(false);
      expect(component.formGroup).toBeTruthy();
    });

    it('should skip API fetch when previewMode is true', () => {
      spyOn(formRendererService, 'getFormSchema');

      const mockSchema: any = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: '',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.previewMode = true;

      component.ngOnInit();

      expect(formRendererService.getFormSchema).not.toHaveBeenCalled();
    });

    it('should disable form submission when previewMode is true', () => {
      const mockSchema: any = {
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            fieldName: 'name',
            label: 'Name',
            placeholder: '',
            helpText: '',
            required: false,
            order: 0,
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you!',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.previewMode = true;
      component.ngOnInit();

      spyOn(formRendererService, 'submitForm');

      component.onSubmit();

      expect(formRendererService.submitForm).not.toHaveBeenCalled();
    });

    it('should set canSubmit to false when previewMode is true', () => {
      const mockSchema: any = {
        fields: [],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: '',
            allowMultipleSubmissions: true,
          },
        },
      };

      component.formSchema = mockSchema;
      component.previewMode = true;
      component.ngOnInit();

      expect(component.canSubmit).toBe(false);
    });

    it('should load schema from API when previewMode is false', () => {
      spyOn(formRendererService, 'getFormSchema').and.returnValue(
        of({
          schema: { fields: [], settings: {} as any },
          settings: {} as any,
        }),
      );

      component.previewMode = false;
      component.formSchema = null;

      component.ngOnInit();

      expect(formRendererService.getFormSchema).toHaveBeenCalled();
    });
  });

  describe('TEXT_BLOCK Field Type (Story 15.3)', () => {
    let htmlSanitizer: any;
    let domSanitizer: any;

    beforeEach(() => {
      fixture.detectChanges();
      htmlSanitizer = (component as any).htmlSanitizer;
      domSanitizer = (component as any).domSanitizer;
    });

    describe('getSanitizedContent', () => {
      it('should sanitize TEXT_BLOCK content using HtmlSanitizerService', () => {
        const textBlockField: any = {
          id: 'text-block-1',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Instructions',
          fieldName: 'text-block-1',
          required: false,
          order: 1,
          metadata: {
            content:
              '<p><strong>Important</strong> instructions with <script>alert("XSS")</script></p>',
            alignment: 'left',
            padding: 'medium',
          },
        };

        spyOn(htmlSanitizer, 'sanitize').and.returnValue(
          '<p><strong>Important</strong> instructions with </p>',
        );
        spyOn(domSanitizer, 'bypassSecurityTrustHtml').and.callThrough();

        component.getSanitizedContent(textBlockField);

        expect(htmlSanitizer.sanitize).toHaveBeenCalledWith(
          '<p><strong>Important</strong> instructions with <script>alert("XSS")</script></p>',
        );
        expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
      });

      it('should handle empty content gracefully', () => {
        const textBlockField: any = {
          id: 'text-block-empty',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Empty',
          fieldName: 'text-block-empty',
          required: false,
          order: 1,
          metadata: {
            content: '',
            alignment: 'left',
            padding: 'medium',
          },
        };

        spyOn(htmlSanitizer, 'sanitize').and.returnValue('');

        const result = component.getSanitizedContent(textBlockField);

        expect(htmlSanitizer.sanitize).toHaveBeenCalledWith('');
        expect(result).toBeTruthy(); // SafeHtml object is always truthy
      });

      it('should handle null/undefined metadata content', () => {
        const textBlockField: any = {
          id: 'text-block-null',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Null Content',
          fieldName: 'text-block-null',
          required: false,
          order: 1,
          metadata: {
            content: null,
          },
        };

        spyOn(htmlSanitizer, 'sanitize').and.returnValue('');

        component.getSanitizedContent(textBlockField);

        expect(htmlSanitizer.sanitize).toHaveBeenCalledWith('');
      });
    });

    describe('isTextBlockLong', () => {
      it('should return true when content exceeds 500 words', () => {
        const longContent = '<p>' + 'word '.repeat(600) + '</p>'; // 600 words
        const textBlockField: any = {
          id: 'text-block-long',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Long Block',
          fieldName: 'text-block-long',
          required: false,
          order: 1,
          metadata: {
            content: longContent,
            alignment: 'left',
            padding: 'medium',
          },
        };

        spyOn(htmlSanitizer, 'isContentLong').and.returnValue(true);

        const result = component.isTextBlockLong(textBlockField);

        expect(htmlSanitizer.isContentLong).toHaveBeenCalledWith(longContent, 500);
        expect(result).toBe(true);
      });

      it('should return false when content is 500 words or less', () => {
        const shortContent = '<p>' + 'word '.repeat(400) + '</p>'; // 400 words
        const textBlockField: any = {
          id: 'text-block-short',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Short Block',
          fieldName: 'text-block-short',
          required: false,
          order: 1,
          metadata: {
            content: shortContent,
            alignment: 'left',
            padding: 'medium',
          },
        };

        spyOn(htmlSanitizer, 'isContentLong').and.returnValue(false);

        const result = component.isTextBlockLong(textBlockField);

        expect(htmlSanitizer.isContentLong).toHaveBeenCalledWith(shortContent, 500);
        expect(result).toBe(false);
      });

      it('should handle empty content', () => {
        const textBlockField: any = {
          id: 'text-block-empty',
          type: FormFieldType.TEXT_BLOCK,
          label: 'Empty',
          fieldName: 'text-block-empty',
          required: false,
          order: 1,
          metadata: {
            content: '',
            alignment: 'left',
            padding: 'medium',
          },
        };

        spyOn(htmlSanitizer, 'isContentLong').and.returnValue(false);

        const result = component.isTextBlockLong(textBlockField);

        expect(result).toBe(false);
      });
    });

    describe('Collapse/Expand Functionality', () => {
      describe('isTextBlockCollapsed', () => {
        it('should return true when field is in collapsed set', () => {
          (component as any).collapsedTextBlocks.add('text-block-1');

          expect(component.isTextBlockCollapsed('text-block-1')).toBe(true);
        });

        it('should return false when field is not in collapsed set', () => {
          expect(component.isTextBlockCollapsed('text-block-999')).toBe(false);
        });

        it('should handle empty collapsed set', () => {
          (component as any).collapsedTextBlocks.clear();

          expect(component.isTextBlockCollapsed('any-id')).toBe(false);
        });
      });

      describe('toggleTextBlockCollapse', () => {
        it('should add field to collapsed set when not already collapsed', () => {
          const fieldId = 'text-block-1';
          expect(component.isTextBlockCollapsed(fieldId)).toBe(false);

          component.toggleTextBlockCollapse(fieldId);

          expect(component.isTextBlockCollapsed(fieldId)).toBe(true);
        });

        it('should remove field from collapsed set when already collapsed', () => {
          const fieldId = 'text-block-2';
          (component as any).collapsedTextBlocks.add(fieldId);
          expect(component.isTextBlockCollapsed(fieldId)).toBe(true);

          component.toggleTextBlockCollapse(fieldId);

          expect(component.isTextBlockCollapsed(fieldId)).toBe(false);
        });

        it('should toggle field state multiple times correctly', () => {
          const fieldId = 'text-block-3';

          // Start expanded
          expect(component.isTextBlockCollapsed(fieldId)).toBe(false);

          // First toggle: collapse
          component.toggleTextBlockCollapse(fieldId);
          expect(component.isTextBlockCollapsed(fieldId)).toBe(true);

          // Second toggle: expand
          component.toggleTextBlockCollapse(fieldId);
          expect(component.isTextBlockCollapsed(fieldId)).toBe(false);

          // Third toggle: collapse again
          component.toggleTextBlockCollapse(fieldId);
          expect(component.isTextBlockCollapsed(fieldId)).toBe(true);
        });

        it('should handle multiple TEXT_BLOCK fields independently', () => {
          const field1 = 'text-block-1';
          const field2 = 'text-block-2';
          const field3 = 'text-block-3';

          // Collapse field1
          component.toggleTextBlockCollapse(field1);
          expect(component.isTextBlockCollapsed(field1)).toBe(true);
          expect(component.isTextBlockCollapsed(field2)).toBe(false);
          expect(component.isTextBlockCollapsed(field3)).toBe(false);

          // Collapse field3
          component.toggleTextBlockCollapse(field3);
          expect(component.isTextBlockCollapsed(field1)).toBe(true);
          expect(component.isTextBlockCollapsed(field2)).toBe(false);
          expect(component.isTextBlockCollapsed(field3)).toBe(true);

          // Expand field1
          component.toggleTextBlockCollapse(field1);
          expect(component.isTextBlockCollapsed(field1)).toBe(false);
          expect(component.isTextBlockCollapsed(field2)).toBe(false);
          expect(component.isTextBlockCollapsed(field3)).toBe(true);
        });
      });
    });

    describe('TEXT_BLOCK Exclusion from FormGroup', () => {
      it('should not create FormControl for TEXT_BLOCK fields', () => {
        const schemaWithTextBlock: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'text-block-1',
              type: FormFieldType.TEXT_BLOCK,
              label: 'Instructions',
              fieldName: 'text-block-instructions',
              required: false,
              order: 1,
              metadata: {
                content: '<p>Follow these instructions...</p>',
              },
            },
            {
              id: 'field-text',
              type: FormFieldType.TEXT,
              label: 'Name',
              fieldName: 'name',
              required: true,
              order: 2,
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithTextBlock, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        // TEXT_BLOCK should NOT create a FormControl
        expect(newComponent.formGroup?.get('text-block-instructions')).toBeFalsy();

        // Regular input field SHOULD create a FormControl
        expect(newComponent.formGroup?.get('name')).toBeTruthy();
      });

      it('should exclude HEADING fields from FormGroup (same pattern)', () => {
        const schemaWithHeading: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'heading-1',
              type: FormFieldType.HEADING,
              label: 'Section Title',
              fieldName: 'heading-section',
              required: false,
              order: 1,
              metadata: {
                level: 'h3',
                text: 'Section Title',
              },
            },
            {
              id: 'field-email',
              type: FormFieldType.EMAIL,
              label: 'Email',
              fieldName: 'email',
              required: true,
              order: 2,
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithHeading, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        // HEADING should NOT create a FormControl
        expect(newComponent.formGroup?.get('heading-section')).toBeFalsy();

        // Regular input field SHOULD create a FormControl
        expect(newComponent.formGroup?.get('email')).toBeTruthy();
      });

      it('should exclude IMAGE fields from FormGroup (same pattern)', () => {
        const schemaWithImage: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'image-1',
              type: FormFieldType.IMAGE,
              label: 'Logo',
              fieldName: 'image-logo',
              required: false,
              order: 1,
              metadata: {
                imageUrl: 'https://example.com/logo.png',
                altText: 'Company Logo',
                size: 'medium',
              },
            },
            {
              id: 'field-number',
              type: FormFieldType.NUMBER,
              label: 'Age',
              fieldName: 'age',
              required: true,
              order: 2,
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: schemaWithImage, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        // IMAGE should NOT create a FormControl
        expect(newComponent.formGroup?.get('image-logo')).toBeFalsy();

        // Regular input field SHOULD create a FormControl
        expect(newComponent.formGroup?.get('age')).toBeTruthy();
      });

      it('should handle mixed input and display fields correctly', () => {
        const mixedSchema: FormSchema = {
          ...mockSchema,
          fields: [
            {
              id: 'heading-1',
              type: FormFieldType.HEADING,
              label: 'Form Title',
              fieldName: 'heading-title',
              required: false,
              order: 1,
              metadata: { level: 'h2', text: 'Registration Form' },
            },
            {
              id: 'text-block-1',
              type: FormFieldType.TEXT_BLOCK,
              label: 'Instructions',
              fieldName: 'text-block-instructions',
              required: false,
              order: 2,
              metadata: { content: '<p>Please fill out...</p>' },
            },
            {
              id: 'field-name',
              type: FormFieldType.TEXT,
              label: 'Name',
              fieldName: 'name',
              required: true,
              order: 3,
            },
            {
              id: 'image-1',
              type: FormFieldType.IMAGE,
              label: 'Photo',
              fieldName: 'image-photo',
              required: false,
              order: 4,
              metadata: { imageUrl: 'photo.jpg', altText: 'Photo' },
            },
            {
              id: 'field-email',
              type: FormFieldType.EMAIL,
              label: 'Email',
              fieldName: 'email',
              required: true,
              order: 5,
            },
            {
              id: 'divider-1',
              type: FormFieldType.DIVIDER,
              label: '',
              fieldName: 'divider-1',
              required: false,
              order: 6,
            },
          ],
        };

        formRendererService.getFormSchema.and.returnValue(
          of({ schema: mixedSchema, settings: mockSettings as FormSettings }),
        );

        const newFixture = TestBed.createComponent(FormRendererComponent);
        const newComponent = newFixture.componentInstance;
        newFixture.detectChanges();

        // Display fields should NOT create FormControls
        expect(newComponent.formGroup?.get('heading-title')).toBeFalsy();
        expect(newComponent.formGroup?.get('text-block-instructions')).toBeFalsy();
        expect(newComponent.formGroup?.get('image-photo')).toBeFalsy();
        expect(newComponent.formGroup?.get('divider-1')).toBeFalsy();

        // Input fields SHOULD create FormControls
        expect(newComponent.formGroup?.get('name')).toBeTruthy();
        expect(newComponent.formGroup?.get('email')).toBeTruthy();

        // FormGroup should only have 2 controls
        expect(Object.keys(newComponent.formGroup?.controls || {}).length).toBe(2);
      });
    });
  });
});
