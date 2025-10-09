import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormCanvasComponent } from './form-canvas.component';
import { FormBuilderService } from '../form-builder.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

describe('FormCanvasComponent', () => {
  let component: FormCanvasComponent;
  let fixture: ComponentFixture<FormCanvasComponent>;
  let formBuilderService: FormBuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCanvasComponent],
      providers: [FormBuilderService],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCanvasComponent);
    component = fixture.componentInstance;
    formBuilderService = TestBed.inject(FormBuilderService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty state when no fields', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
  });

  it('should display fields when formFields has items', () => {
    // Add a test field
    formBuilderService.addField({
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fieldCards = compiled.querySelectorAll('.field-card');
    expect(fieldCards.length).toBe(1);
  });

  it('should select field when clicked', () => {
    // Add a test field
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);
    fixture.detectChanges();

    component.onFieldClicked(testField);

    expect(formBuilderService.selectedField()).toEqual(testField);
  });

  it('should handle keyboard Enter key to select field', () => {
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, testField, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(formBuilderService.selectedField()).toEqual(testField);
  });

  it('should handle keyboard Delete key to remove field', () => {
    const testField = {
      id: 'test-id',
      type: FormFieldType.TEXT,
      fieldName: 'testField',
      label: 'Test Field',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(testField);
    expect(formBuilderService.formFields().length).toBe(1);

    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, testField, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(formBuilderService.formFields().length).toBe(0);
  });

  it('should handle keyboard ArrowDown to move field down', () => {
    const field1 = {
      id: 'field-1',
      type: FormFieldType.TEXT,
      fieldName: 'field1',
      label: 'Field 1',
      required: false,
      order: 0,
      placeholder: '',
      helpText: '',
    };
    const field2 = {
      id: 'field-2',
      type: FormFieldType.EMAIL,
      fieldName: 'field2',
      label: 'Field 2',
      required: false,
      order: 1,
      placeholder: '',
      helpText: '',
    };
    formBuilderService.addField(field1);
    formBuilderService.addField(field2);

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    spyOn(event, 'preventDefault');

    component.handleKeyboard(event, field1, 0);

    expect(event.preventDefault).toHaveBeenCalled();
    const fields = formBuilderService.formFields();
    expect(fields[0].id).toBe('field-2');
    expect(fields[1].id).toBe('field-1');
  });

  describe('Row Layout Drag-Drop', () => {
    beforeEach(() => {
      // Enable row layout and add rows
      formBuilderService.enableRowLayout();
      formBuilderService.addRow(2); // Row 1 with 2 columns
      formBuilderService.addRow(3); // Row 2 with 3 columns
      fixture.detectChanges();
    });

    it('should return column indices array for row', () => {
      const indices = component.getColumnIndices(3);
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should find field at specific row-column position', () => {
      const testField = {
        id: 'test-field',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId: 'row-1', columnIndex: 1 },
      };
      formBuilderService.addField(testField);
      fixture.detectChanges();

      const found = component.getFieldAtPosition('row-1', 1);
      expect(found).toBeTruthy();
      expect(found?.id).toBe('test-field');
    });

    it('should return null when no field at position', () => {
      const found = component.getFieldAtPosition('row-1', 0);
      expect(found).toBeNull();
    });

    it('should allow drop into empty column', () => {
      const mockField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
      };

      const drag = { data: mockField } as any;
      const drop = { data: { rowId: 'row-1', columnIndex: 0 } } as any;

      const canDrop = component.canDropIntoColumn(drag, drop);
      expect(canDrop).toBe(true);
    });

    it('should reject drop into occupied column', () => {
      // Add field to column 0
      const existingField = {
        id: 'existing-field',
        type: FormFieldType.TEXT,
        fieldName: 'existing',
        label: 'Existing Field',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId: 'row-1', columnIndex: 0 },
      };
      formBuilderService.addField(existingField);
      fixture.detectChanges();

      // Try to drop different field into same column
      const newField = {
        id: 'new-field',
        type: FormFieldType.EMAIL,
        fieldName: 'newField',
        label: 'New Field',
        required: false,
        order: 1,
        placeholder: '',
        helpText: '',
      };

      const drag = { data: newField } as any;
      const drop = { data: { rowId: 'row-1', columnIndex: 0 } } as any;

      const canDrop = component.canDropIntoColumn(drag, drop);
      expect(canDrop).toBe(false);
    });

    it('should allow drop into same position (no-op)', () => {
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId: 'row-1', columnIndex: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      const drag = { data: field } as any;
      const drop = { data: { rowId: 'row-1', columnIndex: 0 } } as any;

      const canDrop = component.canDropIntoColumn(drag, drop);
      expect(canDrop).toBe(true);
    });

    it('should handle field type drop from palette into empty column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      const mockEvent = {
        container: { data: { rowId, columnIndex: 0 } },
        item: { data: { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text' } },
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const field = component.getFieldAtPosition(rowId, 0);
      expect(field).toBeTruthy();
      expect(field?.type).toBe(FormFieldType.TEXT);
    });

    it('should move existing field to new row-column position', () => {
      const rows = formBuilderService.rowConfigs();
      const row1Id = rows[0].rowId;
      const row2Id = rows[1].rowId;

      // Create field in row 1, column 0
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId: row1Id, columnIndex: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      // Move to row 2, column 1
      const mockEvent = {
        container: { data: { rowId: row2Id, columnIndex: 1 } },
        item: { data: field },
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      // Verify field moved
      expect(component.getFieldAtPosition(row1Id, 0)).toBeNull();
      const movedField = component.getFieldAtPosition(row2Id, 1);
      expect(movedField).toBeTruthy();
      expect(movedField?.id).toBe('field-1');
    });

    it('should show error when dropping into occupied column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      // Add field to column 0
      const existingField = {
        id: 'existing-field',
        type: FormFieldType.TEXT,
        fieldName: 'existing',
        label: 'Existing Field',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 0 },
      };
      formBuilderService.addField(existingField);
      fixture.detectChanges();

      // Try to drop different field into same column
      const newField = {
        id: 'new-field',
        type: FormFieldType.EMAIL,
        fieldName: 'newField',
        label: 'New Field',
        required: false,
        order: 1,
        placeholder: '',
        helpText: '',
      };

      const mockEvent = {
        container: { data: { rowId, columnIndex: 0 } },
        item: { data: newField },
      };

      spyOn(console, 'error');
      component.onFieldDroppedInRow(mockEvent as any);

      expect(console.error).toHaveBeenCalledWith('Column already occupied');
    });

    it('should not update position when dropping into same position', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      const originalPosition = field.position;

      const mockEvent = {
        container: { data: { rowId, columnIndex: 0 } },
        item: { data: field },
      };

      spyOn(formBuilderService, 'setFieldPosition');
      component.onFieldDroppedInRow(mockEvent as any);

      expect(formBuilderService.setFieldPosition).not.toHaveBeenCalled();
    });

    it('should render row layout when enabled', () => {
      formBuilderService.enableRowLayout();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowLayout = compiled.querySelector('.row-layout-container');
      expect(rowLayout).toBeTruthy();
    });

    it('should render global layout when row layout disabled', () => {
      formBuilderService.disableRowLayout();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const globalLayout = compiled.querySelector('.form-fields-grid');
      expect(globalLayout).toBeTruthy();
    });

    it('should render correct number of column drop zones', () => {
      formBuilderService.enableRowLayout();
      formBuilderService.addRow(3);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const dropZones = compiled.querySelectorAll('.column-drop-zone');
      // Should have at least 3 drop zones for the row with 3 columns
      expect(dropZones.length).toBeGreaterThanOrEqual(3);
    });

    it('should display empty placeholder in empty columns', () => {
      formBuilderService.enableRowLayout();
      formBuilderService.addRow(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const placeholder = compiled.querySelector('.empty-column-placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder?.textContent).toContain('Drop field here');
    });

    it('should render field in occupied column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const fieldWrapper = compiled.querySelector('.field-wrapper');
      expect(fieldWrapper).toBeTruthy();
    });
  });
});
