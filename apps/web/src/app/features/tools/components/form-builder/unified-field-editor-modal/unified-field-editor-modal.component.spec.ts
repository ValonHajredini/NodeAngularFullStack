import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { UnifiedFieldEditorModalComponent } from './unified-field-editor-modal.component';
import { FormBuilderService } from '../form-builder.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { signal } from '@angular/core';

describe('UnifiedFieldEditorModalComponent', () => {
  let component: UnifiedFieldEditorModalComponent;
  let fixture: ComponentFixture<UnifiedFieldEditorModalComponent>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;

  const mockTextField: FormField = {
    id: 'field-1',
    type: FormFieldType.TEXT,
    label: 'Test Field',
    fieldName: 'test-field',
    placeholder: 'Enter text',
    helpText: 'This is help text',
    required: false,
    order: 0,
  };

  const mockSelectField: FormField = {
    id: 'field-2',
    type: FormFieldType.SELECT,
    label: 'Select Field',
    fieldName: 'select-field',
    required: false,
    order: 1,
    options: [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
    ],
  };

  const mockFileField: FormField = {
    id: 'field-3',
    type: FormFieldType.FILE,
    label: 'File Upload',
    fieldName: 'file-upload',
    required: false,
    order: 2,
  };

  const mockHeadingField: FormField = {
    id: 'field-4',
    type: FormFieldType.HEADING,
    label: 'Heading',
    fieldName: 'heading',
    required: false,
    order: 3,
  };

  beforeEach(async () => {
    const formBuilderServiceSpy = jasmine.createSpyObj('FormBuilderService', [
      'selectField',
      'updateFieldProperties',
      'removeField',
    ]);
    formBuilderServiceSpy.formFields = signal([mockTextField, mockSelectField, mockFileField]);

    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['add']);
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [UnifiedFieldEditorModalComponent, ReactiveFormsModule],
      providers: [
        { provide: FormBuilderService, useValue: formBuilderServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
      ],
    }).compileComponents();

    confirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;

    fixture = TestBed.createComponent(UnifiedFieldEditorModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Modal Visibility Tests
  describe('Modal Visibility', () => {
    it('should open modal when visible input is true', () => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();

      expect(component.visible).toBe(true);
    });

    it('should close modal when visible input is false', () => {
      component.visible = false;
      fixture.detectChanges();

      expect(component.visible).toBe(false);
    });

    it('should emit visibleChange when modal closes', () => {
      spyOn(component.visibleChange, 'emit');
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();

      component.onCancel();

      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    });
  });

  // Tab Navigation Tests
  describe('Tab Navigation', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should display Basic tab by default (activeTabIndex = 0)', () => {
      expect(component.activeTabIndex).toBe(0);
    });

    it('should switch tabs when activeTabIndex changes', () => {
      component.activeTabIndex = 1;
      fixture.detectChanges();

      expect(component.activeTabIndex).toBe(1);
    });

    it('should show Options tab only for SELECT/RADIO/CHECKBOX fields', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      expect(component.isSelectOrRadioOrCheckbox()).toBe(true);
    });

    it('should show File Upload tab only for FILE fields', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      expect(component.isFileField()).toBe(true);
    });

    it('should hide Validation tab for display fields (HEADING)', () => {
      component.field = mockHeadingField;
      fixture.detectChanges();

      expect(component.isDisplayField()).toBe(true);
    });
  });

  // Form State Tests
  describe('Form State', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should load field properties into form on modal open', () => {
      expect(component.propertiesForm.get('label')?.value).toBe(mockTextField.label);
      expect(component.propertiesForm.get('fieldName')?.value).toBe(mockTextField.fieldName);
      expect(component.propertiesForm.get('placeholder')?.value).toBe(mockTextField.placeholder);
    });

    it('should track dirty state when form values change', () => {
      component.propertiesForm.patchValue({ label: 'Updated Label' });
      fixture.detectChanges();

      expect(component.isDirty()).toBe(true);
    });

    it('should reset dirty state after save', () => {
      component.propertiesForm.patchValue({ label: 'Updated Label' });
      fixture.detectChanges();
      expect(component.isDirty()).toBe(true);

      spyOn(component.save, 'emit');
      component.onSave();

      expect(component.isDirty()).toBe(false);
    });
  });

  // Keyboard Shortcuts Tests
  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should save and close modal on Ctrl+S', () => {
      spyOn(component, 'saveProperties');
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });

      component.handleKeyboardShortcut(event);

      expect(component.saveProperties).toHaveBeenCalled();
    });

    it('should show unsaved changes confirmation on ESC when dirty', () => {
      component.propertiesForm.patchValue({ label: 'Updated Label' });
      fixture.detectChanges();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.handleKeyboardShortcut(event);

      expect(confirmationService.confirm).toHaveBeenCalled();
    });

    it('should close modal immediately on ESC when clean', () => {
      spyOn(component.visibleChange, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.handleKeyboardShortcut(event);

      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    });
  });

  // Save/Cancel/Delete Tests
  describe('Save/Cancel/Delete', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should emit save event with updated field on Save button click', () => {
      spyOn(component.save, 'emit');
      component.propertiesForm.patchValue({ label: 'Updated Label' });
      fixture.detectChanges();

      component.onSave();

      expect(component.save.emit).toHaveBeenCalled();
      const emittedField = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedField.label).toBe('Updated Label');
    });

    it('should emit cancel event on Cancel button click', () => {
      spyOn(component.cancel, 'emit');
      component.onCancel();

      // Since form is clean, it should close immediately
      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
    });

    it('should emit fieldDeleted event on Delete button click after confirmation', () => {
      spyOn(component.fieldDeleted, 'emit');
      confirmationService.confirm.and.callFake((config: any) => {
        config.accept();
      });

      component.onDeleteField();

      expect(confirmationService.confirm).toHaveBeenCalled();
      expect(component.fieldDeleted.emit).toHaveBeenCalled();
    });

    it('should disable Save button when form is invalid', () => {
      component.propertiesForm.patchValue({ label: '' }); // Invalid - required field
      fixture.detectChanges();

      expect(component.propertiesForm.invalid).toBe(true);
    });
  });

  // Field Type Specific Tests
  describe('Field Type Specific', () => {
    it('should show correct property sections for TEXT field', () => {
      component.field = mockTextField;
      fixture.detectChanges();

      expect(component.isTextField()).toBe(true);
      expect(component.isNumberField()).toBe(false);
      expect(component.isSelectOrRadioOrCheckbox()).toBe(false);
      expect(component.isFileField()).toBe(false);
      expect(component.isDisplayField()).toBe(false);
    });

    it('should show correct property sections for SELECT field', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      expect(component.isSelectOrRadioOrCheckbox()).toBe(true);
      expect(component.isSelectField()).toBe(true);
      expect(component.isTextField()).toBe(false);
    });

    it('should show correct property sections for FILE field', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      expect(component.isFileField()).toBe(true);
      expect(component.isTextField()).toBe(false);
      expect(component.isSelectOrRadioOrCheckbox()).toBe(false);
    });

    it('should show correct property sections for HEADING field', () => {
      component.field = mockHeadingField;
      fixture.detectChanges();

      expect(component.isDisplayField()).toBe(true);
      expect(component.isTextField()).toBe(false);
      expect(component.isNumberField()).toBe(false);
    });
  });

  // Options Management Tests (for SELECT/RADIO fields)
  describe('Options Management', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockSelectField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should load existing options into form array', () => {
      expect(component.options.length).toBe(2);
      expect(component.options.at(0).get('label')?.value).toBe('Option 1');
      expect(component.options.at(1).get('label')?.value).toBe('Option 2');
    });

    it('should add new option to form array', () => {
      component.addOption();
      expect(component.options.length).toBe(3);
    });

    it('should remove option from form array', () => {
      component.removeOption(0);
      expect(component.options.length).toBe(1);
    });

    it('should reorder options via drag and drop', () => {
      const dropEvent: any = {
        previousIndex: 0,
        currentIndex: 1,
        container: { data: component.options.controls },
      };

      component.onOptionsReorder(dropEvent);

      expect(component.options.at(0).get('label')?.value).toBe('Option 2');
      expect(component.options.at(1).get('label')?.value).toBe('Option 1');
    });
  });

  // Conditional Visibility Tests
  describe('Conditional Visibility', () => {
    beforeEach(() => {
      component.visible = true;
      component.field = mockTextField;
      fixture.detectChanges();
      component.onDialogShow();
    });

    it('should clear conditional visibility rule', () => {
      component.propertiesForm.patchValue({
        showIfField: 'field-2',
        showIfOperator: 'equals',
        showIfValue: 'test',
      });

      component.clearConditionalRule();

      expect(component.propertiesForm.get('showIfField')?.value).toBe('');
      expect(component.propertiesForm.get('showIfOperator')?.value).toBe('equals');
      expect(component.propertiesForm.get('showIfValue')?.value).toBe('');
    });

    it('should get list of other fields for conditional visibility', () => {
      const otherFields = component.otherFieldsOptions();

      expect(otherFields.length).toBe(2); // Excludes current field
      expect(otherFields[0].value).toBe(mockSelectField.id);
      expect(otherFields[1].value).toBe(mockFileField.id);
    });
  });
});
