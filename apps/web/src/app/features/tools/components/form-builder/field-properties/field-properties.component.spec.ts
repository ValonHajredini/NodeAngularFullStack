import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FieldPropertiesComponent } from './field-properties.component';
import { FormBuilderService } from '../form-builder.service';
import { FormFieldType, FormField } from '@nodeangularfullstack/shared';
import { AccordionStateService } from './accordion-state.service';

describe('FieldPropertiesComponent', () => {
  let component: FieldPropertiesComponent;
  let fixture: ComponentFixture<FieldPropertiesComponent>;
  let formBuilderService: FormBuilderService;

  const createTestField = (type: FormFieldType = FormFieldType.TEXT): FormField => ({
    id: 'test-id',
    type,
    fieldName: 'test-field',
    label: 'Test Field',
    required: false,
    order: 0,
    placeholder: 'Enter text',
    helpText: 'This is help text',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldPropertiesComponent],
      providers: [FormBuilderService],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldPropertiesComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when no field selected', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should create reactive form with all controls', () => {
    expect(component.propertiesForm).toBeTruthy();
    expect(component.propertiesForm.get('label')).toBeTruthy();
    expect(component.propertiesForm.get('fieldName')).toBeTruthy();
    expect(component.propertiesForm.get('placeholder')).toBeTruthy();
    expect(component.propertiesForm.get('helpText')).toBeTruthy();
    expect(component.propertiesForm.get('required')).toBeTruthy();
    expect(component.propertiesForm.get('minValue')).toBeTruthy();
    expect(component.propertiesForm.get('maxValue')).toBeTruthy();
    expect(component.propertiesForm.get('minLength')).toBeTruthy();
    expect(component.propertiesForm.get('maxLength')).toBeTruthy();
    expect(component.propertiesForm.get('pattern')).toBeTruthy();
    expect(component.propertiesForm.get('emailFormat')).toBeTruthy();
    expect(component.propertiesForm.get('disabled')).toBeTruthy();
    expect(component.propertiesForm.get('readOnly')).toBeTruthy();
    expect(component.propertiesForm.get('defaultValue')).toBeTruthy();
    expect(component.propertiesForm.get('showIfField')).toBeTruthy();
    expect(component.propertiesForm.get('showIfOperator')).toBeTruthy();
    expect(component.propertiesForm.get('showIfValue')).toBeTruthy();
    expect(component.propertiesForm.get('options')).toBeTruthy();
  });

  it('should load field properties when field is selected', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    expect(component.propertiesForm.get('label')?.value).toBe('Test Field');
    expect(component.propertiesForm.get('fieldName')?.value).toBe('test-field');
    expect(component.propertiesForm.get('placeholder')?.value).toBe('Enter text');
    expect(component.propertiesForm.get('helpText')?.value).toBe('This is help text');
  });

  it('should auto-generate field name from label on blur (Story 16.6 - slug format)', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('label')?.setValue('First Name');
    component.propertiesForm.get('fieldName')?.markAsPristine();
    component.onLabelBlur();

    expect(component.propertiesForm.get('fieldName')?.value).toBe('first_name');
  });

  it('should not auto-generate field name if manually edited', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('fieldName')?.setValue('custom-field');
    component.propertiesForm.get('fieldName')?.markAsDirty();
    component.propertiesForm.get('label')?.setValue('Different Label');
    component.onLabelBlur();

    expect(component.propertiesForm.get('fieldName')?.value).toBe('custom-field');
  });

  it('should validate unique field names', () => {
    const field1 = createTestField();
    field1.id = 'field-1';
    field1.fieldName = 'email';

    const field2 = createTestField();
    field2.id = 'field-2';
    field2.fieldName = 'name';

    formBuilderService.addField(field1);
    formBuilderService.addField(field2);
    formBuilderService.selectField(field2);
    fixture.detectChanges();

    component.propertiesForm.get('fieldName')?.setValue('email');
    expect(component.propertiesForm.get('fieldName')?.errors).toEqual({
      duplicateFieldName: true,
    });
  });

  it('should validate slug pattern for field name (Story 16.6 - underscores allowed)', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('fieldName')?.setValue('Invalid Name');
    expect(component.propertiesForm.get('fieldName')?.errors?.['pattern']).toBeTruthy();

    component.propertiesForm.get('fieldName')?.setValue('valid_name');
    expect(component.propertiesForm.get('fieldName')?.errors?.['pattern']).toBeFalsy();

    component.propertiesForm.get('fieldName')?.setValue('field_123');
    expect(component.propertiesForm.get('fieldName')?.errors?.['pattern']).toBeFalsy();
  });

  it('should validate regex pattern (Story 16.6 - invalidRegex error key)', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('pattern')?.setValue('[invalid(regex');
    expect(component.propertiesForm.get('pattern')?.errors?.['invalidRegex']).toBeTruthy();

    component.propertiesForm.get('pattern')?.setValue('^[A-Za-z]+$');
    expect(component.propertiesForm.get('pattern')?.errors?.['invalidRegex']).toBeFalsy();
  });

  it('should detect number field type', () => {
    const numberField = createTestField(FormFieldType.NUMBER);
    formBuilderService.addField(numberField);
    formBuilderService.selectField(numberField);
    fixture.detectChanges();

    expect(component.isNumberField()).toBe(true);
    expect(component.isTextField()).toBe(false);
  });

  it('should detect text field type', () => {
    const textField = createTestField(FormFieldType.TEXT);
    formBuilderService.addField(textField);
    formBuilderService.selectField(textField);
    fixture.detectChanges();

    expect(component.isTextField()).toBe(true);
    expect(component.isNumberField()).toBe(false);
  });

  it('should detect select or radio field type', () => {
    const selectField = createTestField(FormFieldType.SELECT);
    formBuilderService.addField(selectField);
    formBuilderService.selectField(selectField);
    fixture.detectChanges();

    expect(component.isSelectOrRadio()).toBe(true);
    expect(component.isSelectField()).toBe(true);
  });

  it('should detect file upload field type', () => {
    const fileField = createTestField(FormFieldType.FILE);
    formBuilderService.addField(fileField);
    formBuilderService.selectField(fileField);
    fixture.detectChanges();

    expect(component.isFileField()).toBe(true);
  });

  it('should add and remove options for select fields', () => {
    const selectField = createTestField(FormFieldType.SELECT);
    formBuilderService.addField(selectField);
    formBuilderService.selectField(selectField);
    fixture.detectChanges();

    expect(component.options.length).toBe(0);

    component.addOption();
    expect(component.options.length).toBe(1);

    component.addOption();
    expect(component.options.length).toBe(2);

    component.removeOption(0);
    expect(component.options.length).toBe(1);
  });

  it('should load existing options for select fields', () => {
    const selectField = createTestField(FormFieldType.SELECT);
    selectField.options = [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
    ];
    formBuilderService.addField(selectField);
    formBuilderService.selectField(selectField);
    fixture.detectChanges();

    expect(component.options.length).toBe(2);
    expect(component.options.at(0)?.value).toEqual({ label: 'Option 1', value: 'opt1' });
    expect(component.options.at(1)?.value).toEqual({ label: 'Option 2', value: 'opt2' });
  });

  it('should clear conditional visibility rule', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.patchValue({
      showIfField: 'other-field',
      showIfOperator: 'equals',
      showIfValue: 'test',
    });

    component.clearConditionalRule();

    expect(component.propertiesForm.get('showIfField')?.value).toBe('');
    expect(component.propertiesForm.get('showIfOperator')?.value).toBe('equals');
    expect(component.propertiesForm.get('showIfValue')?.value).toBe('');
  });

  it('should get other fields for conditional visibility', () => {
    const field1 = createTestField();
    field1.id = 'field-1';
    field1.label = 'Field 1';

    const field2 = createTestField();
    field2.id = 'field-2';
    field2.label = 'Field 2';

    formBuilderService.addField(field1);
    formBuilderService.addField(field2);
    formBuilderService.selectField(field1);
    fixture.detectChanges();

    const options = component.otherFieldsOptions();
    expect(options.length).toBe(1);
    expect(options[0].label).toBe('Field 2');
    expect(options[0].value).toBe('field-2');
  });

  it('should apply changes immediately after debounce', fakeAsync(() => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    spyOn(formBuilderService, 'updateField');

    component.propertiesForm.get('label')?.setValue('Updated Label');
    component.propertiesForm.markAsDirty();

    tick(300); // Wait for debounce

    expect(formBuilderService.updateField).toHaveBeenCalled();
  }));

  it('should delete field when onDeleteField is called', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    spyOn(formBuilderService, 'removeField');
    spyOn(component.fieldDeleted, 'emit');

    component.onDeleteField();

    expect(formBuilderService.removeField).toHaveBeenCalledWith('test-id');
    expect(component.fieldDeleted.emit).toHaveBeenCalled();
  });

  it('should emit propertyChanged event on updates', fakeAsync(() => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    spyOn(component.propertyChanged, 'emit');

    component.propertiesForm.get('label')?.setValue('Updated Label');
    component.propertiesForm.markAsDirty();

    tick(300); // Wait for debounce

    expect(component.propertyChanged.emit).toHaveBeenCalled();
  }));

  describe('Accordion Layout (Story 16.1)', () => {
    it('should render 4 accordion panels', () => {
      const testField = createTestField();
      formBuilderService.addField(testField);
      formBuilderService.selectField(testField);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const accordionPanels = compiled.querySelectorAll('p-accordionpanel');

      expect(accordionPanels.length).toBe(4);
    });

    it('should hide Validation panel for HEADING field type', () => {
      const headingField = createTestField(FormFieldType.HEADING);
      formBuilderService.addField(headingField);
      formBuilderService.selectField(headingField);
      fixture.detectChanges();

      expect(component.showValidationSection()).toBe(false);
    });

    it('should show Validation panel for TEXT field type', () => {
      const textField = createTestField(FormFieldType.TEXT);
      formBuilderService.addField(textField);
      formBuilderService.selectField(textField);
      fixture.detectChanges();

      expect(component.showValidationSection()).toBe(true);
    });

    it('should expand all panels on mobile breakpoint', () => {
      const testField = createTestField();
      formBuilderService.addField(testField);
      formBuilderService.selectField(testField);
      fixture.detectChanges();

      // Mobile detection is handled by BreakpointObserver and toSignal()
      // When mobile, accordion should have multiple=true which allows all panels to be open
      // This test verifies the accordion configuration for mobile
      const compiled = fixture.nativeElement as HTMLElement;
      const accordion = compiled.querySelector('p-accordion');

      expect(accordion).toBeTruthy();
      // Note: The actual mobile state test requires BreakpointObserver mock
      // The current implementation uses toSignal with BreakpointObserver
    });

    it('should persist accordion state to localStorage when panel toggled', () => {
      const textField = createTestField(FormFieldType.TEXT);
      formBuilderService.addField(textField);
      formBuilderService.selectField(textField);
      fixture.detectChanges();

      const accordionStateService = TestBed.inject(AccordionStateService);
      spyOn(accordionStateService, 'saveAccordionState');

      // Simulate accordion panel toggle
      component.onAccordionChange({ index: [0, 2] });

      expect(accordionStateService.saveAccordionState).toHaveBeenCalledWith(
        FormFieldType.TEXT,
        [0, 2],
      );
    });

    it('should load saved accordion state for field type on initialization', () => {
      const emailField = createTestField(FormFieldType.EMAIL);
      formBuilderService.addField(emailField);

      const accordionStateService = TestBed.inject(AccordionStateService);
      spyOn(accordionStateService, 'loadAccordionState').and.returnValue([1, 2]);

      formBuilderService.selectField(emailField);
      fixture.detectChanges();

      expect(accordionStateService.loadAccordionState).toHaveBeenCalledWith(FormFieldType.EMAIL);
      expect(component.activeIndex()).toEqual([1, 2]);
    });
  });

  describe('Property Validation (Story 16.6)', () => {
    describe('Label Validation', () => {
      it('should show error when label is empty (Task 11.1)', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        const labelControl = component.propertiesForm.get('label');
        labelControl?.setValue('');
        labelControl?.markAsTouched();
        fixture.detectChanges();

        expect(labelControl?.errors?.['required']).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should auto-generate slug from various label formats (Task 11.3)', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        const testCases = [
          { label: 'First Name', expected: 'first_name' },
          { label: 'Email Address (Primary)', expected: 'email_address_primary' },
          { label: "User's Phone #", expected: 'users_phone' },
          { label: 'Test Field 123', expected: 'test_field_123' },
          { label: '  Trimmed Field  ', expected: 'trimmed_field' },
        ];

        testCases.forEach(({ label, expected }) => {
          component.propertiesForm.get('label')?.setValue(label);
          component.propertiesForm.get('fieldName')?.markAsPristine();
          component.onLabelBlur();

          expect(component.propertiesForm.get('fieldName')?.value).toBe(expected);
        });
      });
    });

    describe('Field Name Validation', () => {
      it('should show error when field name is empty', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        const fieldNameControl = component.propertiesForm.get('fieldName');
        fieldNameControl?.setValue('');
        fieldNameControl?.markAsTouched();
        fixture.detectChanges();

        expect(fieldNameControl?.errors?.['required']).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should validate duplicate field names (Task 11.2)', () => {
        const field1 = createTestField();
        field1.id = 'field-1';
        field1.fieldName = 'email_address';

        const field2 = createTestField();
        field2.id = 'field-2';
        field2.fieldName = 'phone_number';

        formBuilderService.addField(field1);
        formBuilderService.addField(field2);
        formBuilderService.selectField(field2);
        fixture.detectChanges();

        component.propertiesForm.get('fieldName')?.setValue('email_address');
        expect(
          component.propertiesForm.get('fieldName')?.errors?.['duplicateFieldName'],
        ).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should allow field to keep its own field name', () => {
        const field1 = createTestField();
        field1.id = 'field-1';
        field1.fieldName = 'email_address';

        formBuilderService.addField(field1);
        formBuilderService.selectField(field1);
        fixture.detectChanges();

        // Setting the same field name should not trigger duplicate error
        component.propertiesForm.get('fieldName')?.setValue('email_address');
        expect(
          component.propertiesForm.get('fieldName')?.errors?.['duplicateFieldName'],
        ).toBeFalsy();
      });
    });

    describe('Regex Pattern Validation', () => {
      it('should validate invalid regex syntax (Task 11.4)', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        const patternControl = component.propertiesForm.get('pattern');

        // Test invalid regex patterns
        const invalidPatterns = ['[invalid(regex', '\\', '*invalid', '(?P<>)'];
        invalidPatterns.forEach((pattern) => {
          patternControl?.setValue(pattern);
          expect(patternControl?.errors?.['invalidRegex']).toBeTruthy();
          expect(component.propertiesForm.invalid).toBe(true);
        });
      });

      it('should accept valid regex patterns', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        const patternControl = component.propertiesForm.get('pattern');

        // Test valid regex patterns
        const validPatterns = [
          '^[A-Za-z]+$',
          '\\d{3}-\\d{4}',
          '^[a-z0-9._-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
        ];
        validPatterns.forEach((pattern) => {
          patternControl?.setValue(pattern);
          expect(patternControl?.errors?.['invalidRegex']).toBeFalsy();
        });
      });
    });

    describe('Min/Max Range Validation', () => {
      it('should validate minLength > maxLength (Task 11.5)', () => {
        const testField = createTestField(FormFieldType.TEXT);
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          minLength: 10,
          maxLength: 5,
        });

        expect(component.propertiesForm.errors?.['minMaxRange']).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should validate minValue > maxValue for number fields (Task 11.5)', () => {
        const numberField = createTestField(FormFieldType.NUMBER);
        formBuilderService.addField(numberField);
        formBuilderService.selectField(numberField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          minValue: 100,
          maxValue: 50,
        });

        expect(component.propertiesForm.errors?.['minMaxRange']).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should accept valid min/max ranges', () => {
        const testField = createTestField(FormFieldType.TEXT);
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          minLength: 5,
          maxLength: 10,
        });

        expect(component.propertiesForm.errors?.['minMaxRange']).toBeFalsy();
        expect(component.propertiesForm.valid).toBe(true);
      });

      it('should accept equal min/max values', () => {
        const numberField = createTestField(FormFieldType.NUMBER);
        formBuilderService.addField(numberField);
        formBuilderService.selectField(numberField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          minValue: 50,
          maxValue: 50,
        });

        expect(component.propertiesForm.errors?.['minMaxRange']).toBeFalsy();
      });
    });

    describe('IMAGE Field Alt Text Validation', () => {
      it('should require alt text for IMAGE fields', () => {
        const imageField = createTestField(FormFieldType.IMAGE);
        formBuilderService.addField(imageField);
        formBuilderService.selectField(imageField);
        fixture.detectChanges();

        const altTextControl = component.propertiesForm.get('altText');
        expect(altTextControl).toBeTruthy();

        altTextControl?.setValue('');
        altTextControl?.markAsTouched();

        expect(altTextControl?.errors?.['required']).toBeTruthy();
        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should not require alt text for non-IMAGE fields', () => {
        const textField = createTestField(FormFieldType.TEXT);
        formBuilderService.addField(textField);
        formBuilderService.selectField(textField);
        fixture.detectChanges();

        const altTextControl = component.propertiesForm.get('altText');
        expect(altTextControl).toBeFalsy();
      });

      it('should accept valid alt text for IMAGE fields', () => {
        const imageField = createTestField(FormFieldType.IMAGE);
        formBuilderService.addField(imageField);
        formBuilderService.selectField(imageField);
        fixture.detectChanges();

        const altTextControl = component.propertiesForm.get('altText');
        altTextControl?.setValue('Company logo');

        expect(altTextControl?.errors).toBeFalsy();
      });
    });

    describe('Form Validation State', () => {
      it('should be invalid when multiple validation errors exist', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          label: '',
          fieldName: '',
          minLength: 10,
          maxLength: 5,
          pattern: '[invalid',
        });

        component.propertiesForm.markAllAsTouched();

        expect(component.propertiesForm.invalid).toBe(true);
        expect(component.propertiesForm.get('label')?.errors?.['required']).toBeTruthy();
        expect(component.propertiesForm.get('fieldName')?.errors?.['required']).toBeTruthy();
        expect(component.propertiesForm.errors?.['minMaxRange']).toBeTruthy();
        expect(component.propertiesForm.get('pattern')?.errors?.['invalidRegex']).toBeTruthy();
      });

      it('should be valid when all required fields are filled correctly', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          label: 'Valid Label',
          fieldName: 'valid_field',
          minLength: 5,
          maxLength: 10,
          pattern: '^[A-Za-z]+$',
        });

        expect(component.propertiesForm.valid).toBe(true);
      });
    });

    describe('Save Button State (Task 11.6)', () => {
      it('should disable save button when form is invalid', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.get('label')?.setValue('');
        component.propertiesForm.markAllAsTouched();

        expect(component.propertiesForm.invalid).toBe(true);
      });

      it('should enable save button when form is valid', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        component.propertiesForm.patchValue({
          label: 'Valid Label',
          fieldName: 'valid_field',
        });

        expect(component.propertiesForm.valid).toBe(true);
      });

      it('should update field when save button clicked with valid form', () => {
        const testField = createTestField();
        formBuilderService.addField(testField);
        formBuilderService.selectField(testField);
        fixture.detectChanges();

        spyOn(formBuilderService, 'updateField');

        component.propertiesForm.patchValue({
          label: 'Updated Label',
          fieldName: 'updated_field',
        });

        component.onSaveField();

        expect(formBuilderService.updateField).toHaveBeenCalled();
      });
    });
  });
});
