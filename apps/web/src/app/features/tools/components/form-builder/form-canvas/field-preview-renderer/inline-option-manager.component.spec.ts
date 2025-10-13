import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineOptionManagerComponent } from './inline-option-manager.component';
import { FormField, FormFieldType, FormFieldOption } from '@nodeangularfullstack/shared';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { SimpleChange } from '@angular/core';

describe('InlineOptionManagerComponent', () => {
  let component: InlineOptionManagerComponent;
  let fixture: ComponentFixture<InlineOptionManagerComponent>;

  const mockField: FormField = {
    id: 'test-field-1',
    type: FormFieldType.SELECT,
    label: 'Test Select',
    fieldName: 'testSelect',
    placeholder: 'Select an option',
    helpText: '',
    required: false,
    order: 0,
    options: [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineOptionManagerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InlineOptionManagerComponent);
    component = fixture.componentInstance;
    component.field = mockField;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize options from field on ngOnInit', () => {
    component.ngOnInit();
    expect(component.options.length).toBe(2);
    expect(component.options[0].label).toBe('Option 1');
    expect(component.options[1].value).toBe('opt2');
  });

  it('should handle field with no options', () => {
    component.field = { ...mockField, options: undefined };
    component.ngOnInit();
    expect(component.options).toEqual([]);
  });

  it('should add new blank option when addOption is called', () => {
    component.options = [{ label: 'Option 1', value: 'opt1' }];
    const emitSpy = spyOn(component.optionsChanged, 'emit');

    component.addOption();

    expect(component.options.length).toBe(2);
    expect(component.options[1]).toEqual({ label: '', value: '' });
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should remove option at specified index', () => {
    component.options = [
      { label: 'Option 1', value: 'opt1' },
      { label: 'Option 2', value: 'opt2' },
      { label: 'Option 3', value: 'opt3' },
    ];
    const emitSpy = spyOn(component.optionsChanged, 'emit');

    component.removeOption(1);

    expect(component.options.length).toBe(2);
    expect(component.options[0].value).toBe('opt1');
    expect(component.options[1].value).toBe('opt3');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should reorder options on drag-drop', () => {
    component.options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
      { label: 'C', value: 'c' },
    ];
    const emitSpy = spyOn(component.optionsChanged, 'emit');

    const event = {
      previousIndex: 0,
      currentIndex: 2,
    } as CdkDragDrop<FormFieldOption[]>;

    component.onOptionReordered(event);

    expect(component.options[0].value).toBe('b');
    expect(component.options[1].value).toBe('c');
    expect(component.options[2].value).toBe('a');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should detect duplicate option values', () => {
    component.options = [
      { label: 'Option 1', value: 'duplicate' },
      { label: 'Option 2', value: 'unique' },
      { label: 'Option 3', value: 'duplicate' },
    ];

    expect(component.isDuplicateValue('duplicate', 0)).toBe(true);
    expect(component.isDuplicateValue('duplicate', 2)).toBe(true);
    expect(component.isDuplicateValue('unique', 1)).toBe(false);
  });

  it('should not mark empty value as duplicate', () => {
    component.options = [
      { label: 'Option 1', value: '' },
      { label: 'Option 2', value: '' },
    ];

    expect(component.isDuplicateValue('', 0)).toBe(false);
    expect(component.isDuplicateValue('', 1)).toBe(false);
  });

  it('should auto-generate value from label when value is empty', () => {
    component.options = [
      { label: 'New Option', value: '' },
      { label: 'Another One', value: '' },
    ];
    const emitSpy = spyOn(component.optionsChanged, 'emit');

    component.onOptionChanged();

    expect(component.options[0].value).toBe('new_option');
    expect(component.options[1].value).toBe('another_one');
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should slugify special characters and spaces correctly', () => {
    component.options = [
      { label: 'Hello World!', value: '' },
      { label: 'Test@Example#', value: '' },
      { label: '  Trimmed  ', value: '' },
    ];

    component.onOptionChanged();

    expect(component.options[0].value).toBe('hello_world');
    expect(component.options[1].value).toBe('testexample');
    expect(component.options[2].value).toBe('trimmed');
  });

  it('should not auto-generate value if value is already set', () => {
    component.options = [{ label: 'New Option', value: 'existing_value' }];

    component.onOptionChanged();

    expect(component.options[0].value).toBe('existing_value');
  });

  it('should emit optionsChanged event when options are updated', () => {
    const emitSpy = spyOn(component.optionsChanged, 'emit');
    component.options = [{ label: 'Test', value: 'test' }];

    component.onOptionChanged();

    expect(emitSpy).toHaveBeenCalledWith(component.options);
  });

  it('should emit a copy of options array, not the original', () => {
    const emitSpy = spyOn(component.optionsChanged, 'emit');
    component.options = [{ label: 'Test', value: 'test' }];

    component.onOptionChanged();

    const emittedArray = (emitSpy as jasmine.Spy).calls.argsFor(0)[0];
    expect(emittedArray).not.toBe(component.options);
    expect(emittedArray).toEqual(component.options);
  });

  it('should update options when field input changes', () => {
    const newField: FormField = {
      ...mockField,
      options: [
        { label: 'New 1', value: 'new1' },
        { label: 'New 2', value: 'new2' },
        { label: 'New 3', value: 'new3' },
      ],
    };

    component.ngOnChanges({
      field: new SimpleChange(mockField, newField, false),
    });

    expect(component.options.length).toBe(3);
    expect(component.options[0].label).toBe('New 1');
  });

  it('should not update options on first change', () => {
    const originalOptions = [...component.options];

    component.ngOnChanges({
      field: new SimpleChange(null, mockField, true),
    });

    expect(component.options).toEqual(originalOptions);
  });

  describe('Template rendering', () => {
    it('should display empty state when no options', () => {
      component.field = { ...mockField, options: [] };
      component.ngOnInit();
      fixture.detectChanges();

      const emptyMessage = fixture.nativeElement.querySelector('.text-gray-500');
      expect(emptyMessage?.textContent).toContain('No options yet');
    });

    it('should render option rows when options exist', () => {
      component.ngOnInit();
      fixture.detectChanges();

      const optionRows = fixture.nativeElement.querySelectorAll('.option-row');
      expect(optionRows.length).toBe(2);
    });

    it('should show red border for duplicate values', () => {
      component.options = [
        { label: 'Option 1', value: 'duplicate' },
        { label: 'Option 2', value: 'duplicate' },
      ];
      fixture.detectChanges();

      const optionRows = fixture.nativeElement.querySelectorAll('.option-row');
      expect(optionRows[0].classList.contains('border-red-500')).toBe(true);
      expect(optionRows[1].classList.contains('border-red-500')).toBe(true);
    });

    it('should show error message for duplicate values', () => {
      component.options = [
        { label: 'Option 1', value: 'duplicate' },
        { label: 'Option 2', value: 'duplicate' },
      ];
      fixture.detectChanges();

      const errorMessages = fixture.nativeElement.querySelectorAll('.text-red-600');
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0]?.textContent).toContain('Duplicate value');
    });

    it('should show error message for empty labels', () => {
      component.options = [{ label: '', value: 'test' }];
      fixture.detectChanges();

      const errorMessages = fixture.nativeElement.querySelectorAll('.text-red-600');
      const hasLabelError = Array.from(errorMessages).some((el: any) =>
        el.textContent.includes('Label required'),
      );
      expect(hasLabelError).toBe(true);
    });

    it('should render Add Option button', () => {
      fixture.detectChanges();
      const addButton = fixture.nativeElement.querySelector('p-button[label="Add Option"]');
      expect(addButton).toBeTruthy();
    });

    it('should render help text', () => {
      fixture.detectChanges();
      const helpText = fixture.nativeElement.querySelector('.text-gray-500.text-xs');
      expect(helpText?.textContent).toContain('Label is displayed to users');
    });

    it('should render drag handles for each option', () => {
      component.ngOnInit();
      fixture.detectChanges();

      const dragHandles = fixture.nativeElement.querySelectorAll('.pi-bars');
      expect(dragHandles.length).toBe(2);
    });

    it('should render delete buttons for each option', () => {
      component.ngOnInit();
      fixture.detectChanges();

      const deleteButtons = fixture.nativeElement.querySelectorAll('p-button[icon="pi pi-times"]');
      expect(deleteButtons.length).toBe(2);
    });
  });
});
