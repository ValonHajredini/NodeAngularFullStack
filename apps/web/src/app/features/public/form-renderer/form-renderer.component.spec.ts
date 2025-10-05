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
        of({ schema: conditionalSchema, settings: mockSettings }),
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
        of({ schema: conditionalSchema, settings: mockSettings }),
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
        of({ schema: schemaWithRadio, settings: mockSettings }),
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
        of({ schema: schemaWithToggle, settings: mockSettings }),
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
        of({ schema: schemaWithDate, settings: mockSettings }),
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
        of({ schema: schemaWithDateTime, settings: mockSettings }),
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
        of({ schema: schemaWithDivider, settings: mockSettings }),
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
});
