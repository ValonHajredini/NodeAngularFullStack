import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FieldPropertiesComponent } from './field-properties.component';
import { FormBuilderService } from '../form-builder.service';
import { FormFieldType, FormField } from '@nodeangularfullstack/shared';

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

  it('should auto-generate field name from label on blur', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('label')?.setValue('First Name');
    component.propertiesForm.get('fieldName')?.markAsPristine();
    component.onLabelBlur();

    expect(component.propertiesForm.get('fieldName')?.value).toBe('first-name');
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

  it('should validate kebab-case pattern for field name', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('fieldName')?.setValue('Invalid Name');
    expect(component.propertiesForm.get('fieldName')?.errors?.['pattern']).toBeTruthy();

    component.propertiesForm.get('fieldName')?.setValue('valid-name');
    expect(component.propertiesForm.get('fieldName')?.errors?.['pattern']).toBeFalsy();
  });

  it('should validate regex pattern', () => {
    const testField = createTestField();
    formBuilderService.addField(testField);
    formBuilderService.selectField(testField);
    fixture.detectChanges();

    component.propertiesForm.get('pattern')?.setValue('[invalid(regex');
    expect(component.propertiesForm.get('pattern')?.errors?.['invalidPattern']).toBeTruthy();

    component.propertiesForm.get('pattern')?.setValue('^[A-Za-z]+$');
    expect(component.propertiesForm.get('pattern')?.errors?.['invalidPattern']).toBeFalsy();
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
});
