import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { SimpleChange } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { FieldSettingsModalComponent } from './field-settings-modal.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('FieldSettingsModalComponent', () => {
  let component: FieldSettingsModalComponent;
  let fixture: ComponentFixture<FieldSettingsModalComponent>;

  const mockField: FormField = {
    id: 'test-field-id',
    type: FormFieldType.TEXT,
    label: 'Test Label',
    fieldName: 'test_field',
    placeholder: 'Test placeholder',
    helpText: 'Test help text',
    required: false,
    order: 0,
    validation: {
      minLength: 5,
      maxLength: 100,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FieldSettingsModalComponent,
        ReactiveFormsModule,
        DialogModule,
        InputTextModule,
        TextareaModule,
        ToggleSwitchModule,
        InputNumberModule,
        ButtonModule,
        BrowserAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldSettingsModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build form when field input changes', () => {
    component.field = mockField;
    component.ngOnChanges({
      field: new SimpleChange(null, mockField, true),
    });

    expect(component.settingsForm).toBeDefined();
    expect(component.settingsForm.value.label).toBe('Test Label');
    expect(component.settingsForm.value.fieldName).toBe('test_field');
  });

  it('should pre-fill form with field data', () => {
    component.field = mockField;
    component.buildForm();

    expect(component.settingsForm.value).toEqual({
      label: 'Test Label',
      fieldName: 'test_field',
      placeholder: 'Test placeholder',
      helpText: 'Test help text',
      required: false,
      defaultValue: '',
      minLength: 5,
      maxLength: 100,
      min: null,
      max: null,
      pattern: '',
      errorMessage: '',
    });
  });

  it('should mark label as required', () => {
    component.field = mockField;
    component.buildForm();

    const labelControl = component.settingsForm.get('label');
    expect(labelControl?.hasError('required')).toBe(false);

    labelControl?.setValue('');
    expect(labelControl?.hasError('required')).toBe(true);
  });

  it('should validate fieldName format', () => {
    component.field = mockField;
    component.buildForm();

    const fieldNameControl = component.settingsForm.get('fieldName');

    // Valid formats
    fieldNameControl?.setValue('valid_field_name');
    expect(fieldNameControl?.valid).toBe(true);

    fieldNameControl?.setValue('fieldName123');
    expect(fieldNameControl?.valid).toBe(true);

    // Invalid formats
    fieldNameControl?.setValue('invalid name');
    expect(fieldNameControl?.hasError('pattern')).toBe(true);

    fieldNameControl?.setValue('field-name');
    expect(fieldNameControl?.hasError('pattern')).toBe(true);

    fieldNameControl?.setValue('');
    expect(fieldNameControl?.hasError('required')).toBe(true);
  });

  it('should disable Save button when form is invalid', () => {
    component.field = mockField;
    component.buildForm();
    component.displayModal = true;
    fixture.detectChanges();

    component.settingsForm.get('label')?.setValue('');
    fixture.detectChanges();

    expect(component.settingsForm.invalid).toBe(true);
  });

  it('should emit settingsSaved event on save with valid form', () => {
    component.field = mockField;
    component.buildForm();

    const settingsSavedSpy = spyOn(component.settingsSaved, 'emit');

    component.settingsForm.patchValue({
      label: 'Updated Label',
      fieldName: 'updated_field',
    });

    component.onSave();

    expect(settingsSavedSpy).toHaveBeenCalled();
    const emittedValue = (settingsSavedSpy.calls.mostRecent().args as any)[0];
    expect(emittedValue.label).toBe('Updated Label');
    expect(emittedValue.fieldName).toBe('updated_field');
  });

  it('should not save when form is invalid', () => {
    component.field = mockField;
    component.buildForm();

    const settingsSavedSpy = spyOn(component.settingsSaved, 'emit');

    component.settingsForm.patchValue({
      label: '', // Invalid - required
    });

    component.onSave();

    expect(settingsSavedSpy).not.toHaveBeenCalled();
  });

  it('should close modal on cancel', () => {
    component.displayModalInternal = true;
    const displayModalChangeSpy = spyOn(component.displayModalChange, 'emit');

    component.onCancel();

    expect(component.displayModalInternal).toBe(false);
    expect(displayModalChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should close modal after successful save', () => {
    component.field = mockField;
    component.buildForm();
    component.displayModalInternal = true;

    const displayModalChangeSpy = spyOn(component.displayModalChange, 'emit');

    component.onSave();

    expect(component.displayModalInternal).toBe(false);
    expect(displayModalChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should show text validation fields for TEXT field type', () => {
    component.field = { ...mockField, type: FormFieldType.TEXT };
    expect(component.showTextValidation()).toBe(true);
  });

  it('should show text validation fields for EMAIL field type', () => {
    component.field = { ...mockField, type: FormFieldType.EMAIL };
    expect(component.showTextValidation()).toBe(true);
  });

  it('should show text validation fields for TEXTAREA field type', () => {
    component.field = { ...mockField, type: FormFieldType.TEXTAREA };
    expect(component.showTextValidation()).toBe(true);
  });

  it('should not show text validation fields for NUMBER field type', () => {
    component.field = { ...mockField, type: FormFieldType.NUMBER };
    expect(component.showTextValidation()).toBe(false);
  });

  it('should show number validation fields for NUMBER field type', () => {
    component.field = { ...mockField, type: FormFieldType.NUMBER };
    expect(component.showNumberValidation()).toBe(true);
  });

  it('should not show number validation fields for TEXT field type', () => {
    component.field = { ...mockField, type: FormFieldType.TEXT };
    expect(component.showNumberValidation()).toBe(false);
  });

  it('should show pattern validation for TEXT and EMAIL fields', () => {
    component.field = { ...mockField, type: FormFieldType.TEXT };
    expect(component.showPatternValidation()).toBe(true);

    component.field = { ...mockField, type: FormFieldType.EMAIL };
    expect(component.showPatternValidation()).toBe(true);
  });

  it('should not show pattern validation for other field types', () => {
    component.field = { ...mockField, type: FormFieldType.NUMBER };
    expect(component.showPatternValidation()).toBe(false);

    component.field = { ...mockField, type: FormFieldType.SELECT };
    expect(component.showPatternValidation()).toBe(false);
  });

  it('should include validation object in saved updates', () => {
    component.field = mockField;
    component.buildForm();

    const settingsSavedSpy = spyOn(component.settingsSaved, 'emit');

    component.settingsForm.patchValue({
      minLength: 10,
      maxLength: 200,
      pattern: '^[A-Z]',
      errorMessage: 'Custom error',
    });

    component.onSave();

    const emittedValue = (settingsSavedSpy.calls.mostRecent().args as any)[0];
    expect(emittedValue.validation).toEqual({
      minLength: 10,
      maxLength: 200,
      min: null,
      max: null,
      pattern: '^[A-Z]',
      errorMessage: 'Custom error',
    });
  });

  it('should handle displayModal input changes', () => {
    component.displayModal = true;
    component.ngOnChanges({
      displayModal: new SimpleChange(false, true, false),
    });

    expect(component.displayModalInternal).toBe(true);
  });

  it('should sync displayModalInternal with displayModal prop', () => {
    const displayModalChangeSpy = spyOn(component.displayModalChange, 'emit');

    component.onVisibleChange(true);
    expect(component.displayModalInternal).toBe(true);
    expect(displayModalChangeSpy).toHaveBeenCalledWith(true);

    component.onVisibleChange(false);
    expect(component.displayModalInternal).toBe(false);
    expect(displayModalChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should have labelControl getter', () => {
    component.field = mockField;
    component.buildForm();

    const labelControl = component.labelControl;
    expect(labelControl).toBe(component.settingsForm.get('label'));
  });

  it('should have fieldNameControl getter', () => {
    component.field = mockField;
    component.buildForm();

    const fieldNameControl = component.fieldNameControl;
    expect(fieldNameControl).toBe(component.settingsForm.get('fieldName'));
  });

  it('should initialize with empty validation if field has no validation', () => {
    const fieldWithoutValidation: FormField = {
      ...mockField,
      validation: undefined,
    };
    component.field = fieldWithoutValidation;
    component.buildForm();

    expect(component.settingsForm.value.minLength).toBeNull();
    expect(component.settingsForm.value.maxLength).toBeNull();
    expect(component.settingsForm.value.pattern).toBe('');
  });
});
