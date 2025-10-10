import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { OptionsPropertiesPanelComponent } from './options-properties-panel.component';
import { FormField, FormFieldType, FormFieldOption } from '@nodeangularfullstack/shared';

describe('OptionsPropertiesPanelComponent', () => {
  let component: OptionsPropertiesPanelComponent;
  let fixture: ComponentFixture<OptionsPropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OptionsPropertiesPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OptionsPropertiesPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty options array when no options exist', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Color Select',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['options']()).toEqual([]);
    });

    it('should load existing options from field', () => {
      // Arrange
      const options: FormFieldOption[] = [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Color Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['options']()).toEqual(options);
      expect(component['options']().length).toBe(3);
    });
  });

  describe('Add Option', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Color Select',
        required: false,
        order: 0,
        options: [],
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should open dialog in add mode when showAddOptionDialog is called', () => {
      // Act
      component['showAddOptionDialog']();

      // Assert
      expect(component['showOptionDialog']).toBe(true);
      expect(component['isEditMode']()).toBe(false);
      expect(component['currentOption']).toEqual({ label: '', value: '' });
    });

    it('should add new option when saveOption is called in add mode', () => {
      // Arrange
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Yellow', value: 'yellow' };

      // Act
      component['saveOption']();

      // Assert
      expect(component['options']().length).toBe(1);
      expect(component['options']()[0]).toEqual({ label: 'Yellow', value: 'yellow' });
      expect(component['showOptionDialog']).toBe(false);
    });

    it('should emit fieldChange when adding new option', (done) => {
      // Arrange
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Purple', value: 'purple' };

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.options?.length).toBe(1);
        expect(updatedField.options?.[0]).toEqual({ label: 'Purple', value: 'purple' });
        done();
      });

      // Act
      component['saveOption']();
    });

    it('should not add option when label is empty', () => {
      // Arrange
      component['showAddOptionDialog']();
      component['currentOption'] = { label: '', value: 'test' };
      const initialLength = component['options']().length;

      // Act
      component['saveOption']();

      // Assert
      expect(component['options']().length).toBe(initialLength);
    });

    it('should not add option when value is empty', () => {
      // Arrange
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Test', value: '' };
      const initialLength = component['options']().length;

      // Act
      component['saveOption']();

      // Assert
      expect(component['options']().length).toBe(initialLength);
    });
  });

  describe('Edit Option', () => {
    beforeEach(() => {
      const options: FormFieldOption[] = [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
      ];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Color Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should open dialog in edit mode when editOption is called', () => {
      // Arrange
      const optionToEdit = component['options']()[0];

      // Act
      component['editOption'](optionToEdit, 0);

      // Assert
      expect(component['showOptionDialog']).toBe(true);
      expect(component['isEditMode']()).toBe(true);
      expect(component['editIndex']).toBe(0);
      expect(component['currentOption']).toEqual({ label: 'Red', value: 'red' });
    });

    it('should update existing option when saveOption is called in edit mode', () => {
      // Arrange
      const optionToEdit = component['options']()[0];
      component['editOption'](optionToEdit, 0);
      component['currentOption'] = { label: 'Dark Red', value: 'dark-red' };

      // Act
      component['saveOption']();

      // Assert
      expect(component['options']()[0]).toEqual({ label: 'Dark Red', value: 'dark-red' });
      expect(component['options']().length).toBe(2); // Should not add new option
      expect(component['showOptionDialog']).toBe(false);
    });

    it('should emit fieldChange when editing option', (done) => {
      // Arrange
      const optionToEdit = component['options']()[1];
      component['editOption'](optionToEdit, 1);
      component['currentOption'] = { label: 'Light Blue', value: 'light-blue' };

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.options?.[1]).toEqual({ label: 'Light Blue', value: 'light-blue' });
        done();
      });

      // Act
      component['saveOption']();
    });
  });

  describe('Remove Option', () => {
    beforeEach(() => {
      const options: FormFieldOption[] = [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
      ];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Color Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should remove option at specified index', () => {
      // Arrange
      const initialLength = component['options']().length;

      // Act
      component['removeOption'](1); // Remove 'Blue'

      // Assert
      expect(component['options']().length).toBe(initialLength - 1);
      expect(component['options']()).toEqual([
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green' },
      ]);
    });

    it('should emit fieldChange when removing option', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.options?.length).toBe(2);
        expect(updatedField.options?.find((o) => o.value === 'blue')).toBeUndefined();
        done();
      });

      // Act
      component['removeOption'](1);
    });

    it('should remove first option correctly', () => {
      // Act
      component['removeOption'](0);

      // Assert
      expect(component['options']().length).toBe(2);
      expect(component['options']()[0].value).toBe('blue');
    });

    it('should remove last option correctly', () => {
      // Act
      component['removeOption'](2);

      // Assert
      expect(component['options']().length).toBe(2);
      expect(component['options']()[1].value).toBe('blue');
    });
  });

  describe('Reorder Options', () => {
    beforeEach(() => {
      const options: FormFieldOption[] = [
        { label: 'First', value: '1' },
        { label: 'Second', value: '2' },
        { label: 'Third', value: '3' },
      ];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Number Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should reorder options when onReorder is called', () => {
      // Arrange
      const event = {
        previousIndex: 0,
        currentIndex: 2,
      } as CdkDragDrop<FormFieldOption[]>;

      // Act
      component['onReorder'](event);

      // Assert
      expect(component['options']()[0].label).toBe('Second');
      expect(component['options']()[1].label).toBe('Third');
      expect(component['options']()[2].label).toBe('First');
    });

    it('should emit fieldChange when reordering options', (done) => {
      // Arrange
      const event = {
        previousIndex: 2,
        currentIndex: 0,
      } as CdkDragDrop<FormFieldOption[]>;

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.options?.[0].label).toBe('Third');
        expect(updatedField.options?.[1].label).toBe('First');
        expect(updatedField.options?.[2].label).toBe('Second');
        done();
      });

      // Act
      component['onReorder'](event);
    });

    it('should handle reorder to same position', () => {
      // Arrange
      const event = {
        previousIndex: 1,
        currentIndex: 1,
      } as CdkDragDrop<FormFieldOption[]>;
      const originalOptions = [...component['options']()];

      // Act
      component['onReorder'](event);

      // Assert
      expect(component['options']()).toEqual(originalOptions);
    });
  });

  describe('Close Dialog', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Select',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should reset dialog state when closeOptionDialog is called', () => {
      // Arrange
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Test', value: 'test' };

      // Act
      component['closeOptionDialog']();

      // Assert
      expect(component['showOptionDialog']).toBe(false);
      expect(component['currentOption']).toEqual({ label: '', value: '' });
      expect(component['editIndex']).toBe(-1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field with undefined options', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Select',
        required: false,
        order: 0,
        // options is undefined
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['options']()).toEqual([]);
    });

    it('should handle rapid add/remove operations', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Select',
        required: false,
        order: 0,
        options: [],
      };
      component.field = field;
      component.ngOnInit();

      // Act - add 3 options
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Opt 1', value: '1' };
      component['saveOption']();

      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Opt 2', value: '2' };
      component['saveOption']();

      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'Opt 3', value: '3' };
      component['saveOption']();

      // Remove middle option
      component['removeOption'](1);

      // Assert
      expect(component['options']().length).toBe(2);
      expect(component['options']()[0].label).toBe('Opt 1');
      expect(component['options']()[1].label).toBe('Opt 3');
    });

    it('should maintain option immutability when editing', () => {
      // Arrange
      const options: FormFieldOption[] = [{ label: 'Original', value: 'orig' }];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;
      component.ngOnInit();

      // Act
      component['editOption'](component['options']()[0], 0);
      component['currentOption'].label = 'Modified';

      // Assert - original option should not be modified until saveOption is called
      expect(component['options']()[0].label).toBe('Original');
    });
  });

  describe('Field Change Emission Format', () => {
    it('should emit field with updated options array', (done) => {
      // Arrange
      const options: FormFieldOption[] = [{ label: 'Initial', value: 'init' }];
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'options',
        label: 'Select',
        required: false,
        order: 0,
        options,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.id).toBe('field-1');
        expect(updatedField.type).toBe(FormFieldType.SELECT);
        expect(updatedField.options).toBeInstanceOf(Array);
        expect(updatedField.options?.length).toBe(2);
        done();
      });

      // Act
      component['showAddOptionDialog']();
      component['currentOption'] = { label: 'New', value: 'new' };
      component['saveOption']();
    });
  });
});
