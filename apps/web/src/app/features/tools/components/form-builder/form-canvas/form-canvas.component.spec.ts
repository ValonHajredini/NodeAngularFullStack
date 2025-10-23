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

    it('should allow drop into occupied column (multi-field column support)', () => {
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

      // Try to drop different field into same column (should succeed with multi-field support)
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
      expect(canDrop).toBe(true); // Multi-field column support allows multiple fields per column
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

      const _originalPosition = field.position;

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

  describe('Step Navigation', () => {
    beforeEach(() => {
      // Enable step form mode and add steps
      formBuilderService.enableStepForm();
      formBuilderService.addStep({
        id: 'step-2',
        title: 'Step 2',
        description: 'Second step',
        order: 1,
      });
      fixture.detectChanges();
    });

    it('should display step tabs when step mode enabled', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const stepTabs = compiled.querySelectorAll('.step-tab');

      expect(stepTabs.length).toBe(2);
      expect(stepTabs[0].textContent).toContain('Step 1');
      expect(stepTabs[1].textContent).toContain('Step 2');
    });

    it('should highlight active step tab', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const stepTabs = compiled.querySelectorAll('.step-tab');

      // First step should be active initially
      expect(stepTabs[0].classList.contains('active')).toBe(true);
      expect(stepTabs[1].classList.contains('active')).toBe(false);
    });

    it('should switch active step on tab click', () => {
      const step2Id = formBuilderService.steps()[1].id;

      component.onStepTabClick(step2Id);
      fixture.detectChanges();

      expect(formBuilderService.activeStepId()).toBe(step2Id);

      const compiled = fixture.nativeElement as HTMLElement;
      const stepTabs = compiled.querySelectorAll('.step-tab');
      expect(stepTabs[0].classList.contains('active')).toBe(false);
      expect(stepTabs[1].classList.contains('active')).toBe(true);
    });

    it('should filter fields by active step', () => {
      const step1Id = formBuilderService.steps()[0].id;
      const step2Id = formBuilderService.steps()[1].id;

      // Add field to step 1
      const field1 = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { stepId: step1Id, rowId: 'row-1', columnIndex: 0 },
      };

      // Add field to step 2
      const field2 = {
        id: 'field-2',
        type: FormFieldType.EMAIL,
        fieldName: 'field2',
        label: 'Field 2',
        required: false,
        order: 1,
        placeholder: '',
        helpText: '',
        position: { stepId: step2Id, rowId: 'row-1', columnIndex: 0 },
      };

      formBuilderService.addField(field1);
      formBuilderService.addField(field2);
      fixture.detectChanges();

      // Step 1 should show only field1
      const visibleFields1 = component.visibleFields();
      expect(visibleFields1.length).toBe(1);
      expect(visibleFields1[0].id).toBe('field-1');

      // Switch to step 2
      component.onStepTabClick(step2Id);
      fixture.detectChanges();

      // Step 2 should show only field2
      const visibleFields2 = component.visibleFields();
      expect(visibleFields2.length).toBe(1);
      expect(visibleFields2[0].id).toBe('field-2');
    });

    it('should show empty placeholder when step has no fields', () => {
      // Step 1 has no fields initially
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const emptyState = compiled.querySelector('.empty-step-state');

      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No fields in this step yet');
    });

    it('should assign stepId when dropping field from palette', () => {
      formBuilderService.enableRowLayout();
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;
      const activeStepId = formBuilderService.activeStepId();

      const mockEvent = {
        container: { data: { rowId, columnIndex: 0 } },
        item: { data: { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text' } },
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const fields = formBuilderService.getAllFields();
      const newField = fields.find((f) => f.type === FormFieldType.TEXT);

      expect(newField).toBeTruthy();
      expect(newField?.position?.stepId).toBe(activeStepId);
    });

    it('should prevent dragging fields between steps', () => {
      const step1Id = formBuilderService.steps()[0].id;
      const step2Id = formBuilderService.steps()[1].id;

      // Add field to step 1
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { stepId: step1Id, rowId: 'row-1', columnIndex: 0 },
      };
      formBuilderService.addField(field);

      // Switch to step 2
      component.onStepTabClick(step2Id);
      fixture.detectChanges();

      // Try to drop field from step 1 into step 2
      const mockEvent = {
        container: { data: { rowId: 'row-1', columnIndex: 1 } },
        item: { data: field },
      };

      spyOn(console, 'error');
      component.onFieldDroppedInRow(mockEvent as any);

      // Field should remain in step 1
      expect(field.position?.stepId).toBe(step1Id);
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Cannot move fields between steps'),
      );
    });

    it('should show only active step rows in row layout sidebar', () => {
      formBuilderService.enableRowLayout();
      const step1Id = formBuilderService.steps()[0].id;
      const step2Id = formBuilderService.steps()[1].id;

      // Enable row layout creates a row with stepId automatically assigned to active step (step 1)
      const rows = formBuilderService.rowConfigs();
      const step1RowId = rows[0].rowId;

      // Switch to step 2 and add a new row (will auto-assign stepId to step 2)
      formBuilderService.setActiveStep(step2Id);
      const step2RowId = formBuilderService.addRow(3);
      fixture.detectChanges();

      // Verify step 2 has 1 row
      const visibleRows2 = component.visibleRows();
      expect(visibleRows2.length).toBe(1);
      expect(visibleRows2[0].rowId).toBe(step2RowId);
      expect(visibleRows2[0].stepId).toBe(step2Id);

      // Switch to step 1
      component.onStepTabClick(step1Id);
      fixture.detectChanges();

      // Verify step 1 has 1 row
      const visibleRows1 = component.visibleRows();
      expect(visibleRows1.length).toBe(1);
      expect(visibleRows1[0].rowId).toBe(step1RowId);
      expect(visibleRows1[0].stepId).toBe(step1Id);
    });

    it('should delete field from correct step', () => {
      const step1Id = formBuilderService.steps()[0].id;

      // Add field to step 1
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { stepId: step1Id, rowId: 'row-1', columnIndex: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      expect(formBuilderService.formFields().length).toBe(1);

      // Delete field
      formBuilderService.removeField('field-1');
      fixture.detectChanges();

      expect(formBuilderService.formFields().length).toBe(0);
    });
  });

  describe('Theme Loading (Story 23.6)', () => {
    let themePreviewService: jasmine.SpyObj<any>;
    let formsApiService: jasmine.SpyObj<any>;

    beforeEach(() => {
      // Get injected spy services
      themePreviewService = (component as any).themePreviewService;
      formsApiService = (component as any).formsApiService;

      // Spy on service methods
      spyOn(themePreviewService, 'applyThemeCss');
      spyOn(themePreviewService, 'clearThemeCss');
      spyOn(formsApiService, 'getTheme').and.returnValue({
        subscribe: (callbacks: any) => {
          callbacks.next({
            id: 'test-theme',
            name: 'Ocean Blue',
            themeConfig: {
              desktop: { primaryColor: '#3B82F6', secondaryColor: '#10B981' },
            },
          });
        },
      });
    });

    it('should apply theme-form-canvas-background class to canvas', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const canvas = compiled.querySelector('.form-canvas');

      expect(canvas?.classList.contains('theme-form-canvas-background')).toBe(true);
    });

    it('should load and apply theme when themeId changes', () => {
      // Set themeId in formSettingsSignal
      formBuilderService.formSettingsSignal.set({ themeId: 'test-theme-id' });
      fixture.detectChanges();

      // Verify theme was loaded and applied
      expect(formsApiService.getTheme).toHaveBeenCalledWith('test-theme-id');
      expect(themePreviewService.applyThemeCss).toHaveBeenCalled();
    });

    it('should clear theme CSS when themeId is null', () => {
      // Set themeId to null (no theme)
      formBuilderService.formSettingsSignal.set({ themeId: null });
      fixture.detectChanges();

      // Verify theme was cleared
      expect(themePreviewService.clearThemeCss).toHaveBeenCalled();
    });

    it('should fallback to defaults on theme load error', () => {
      // Mock theme load error
      (formsApiService.getTheme as jasmine.Spy).and.returnValue({
        subscribe: (callbacks: any) => {
          callbacks.error(new Error('Theme not found'));
        },
      });

      // Set themeId to trigger load
      formBuilderService.formSettingsSignal.set({ themeId: 'invalid-theme-id' });
      fixture.detectChanges();

      // Verify theme was cleared on error
      expect(formsApiService.getTheme).toHaveBeenCalledWith('invalid-theme-id');
      expect(themePreviewService.clearThemeCss).toHaveBeenCalled();
    });

    it('should apply theme utility classes to row containers', () => {
      formBuilderService.enableRowLayout();
      formBuilderService.addRow(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const rowGrid = compiled.querySelector('.row-grid');

      expect(rowGrid?.classList.contains('theme-row-container')).toBe(true);
    });

    it('should apply theme utility classes to column containers', () => {
      formBuilderService.enableRowLayout();
      formBuilderService.addRow(2);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const columnDropZone = compiled.querySelector('.column-drop-zone');

      expect(columnDropZone?.classList.contains('theme-column-container')).toBe(true);
    });
  });

  describe('Sub-Column Drag-Drop (Story 27.5)', () => {
    beforeEach(() => {
      formBuilderService.enableRowLayout();
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;
      // Enable sub-columns: 2 sub-columns in column 0
      formBuilderService.addSubColumn(rowId, 0, 2);
      fixture.detectChanges();
    });

    it('should render sub-column drop zones when subColumnConfigs defined', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subColumnZones = compiled.querySelectorAll('.sub-column-drop-zone');

      expect(subColumnZones.length).toBeGreaterThan(0);
      expect(subColumnZones[0].getAttribute('id')).toContain('subColumn-');
    });

    it('should apply drag-over class during drag operations', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subColumnZone = compiled.querySelector('.sub-column-drop-zone') as HTMLElement;

      expect(subColumnZone).toBeTruthy();
      // CDK adds cdk-drop-list-dragging class during drag
      subColumnZone.classList.add('cdk-drop-list-dragging');

      expect(subColumnZone.classList.contains('cdk-drop-list-dragging')).toBe(true);
    });

    it('should create field with correct subColumnIndex when dropping from palette', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      const mockEvent = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: 1 } },
        item: { data: { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text' } },
        currentIndex: 0,
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const fields = formBuilderService.formFields();
      const newField = fields.find((f) => f.type === FormFieldType.TEXT);

      expect(newField).toBeTruthy();
      expect(newField?.position?.subColumnIndex).toBe(1);
      expect(newField?.position?.rowId).toBe(rowId);
      expect(newField?.position?.columnIndex).toBe(0);
    });

    it('should update field position correctly when moving to sub-column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      // Create field in parent column (no subColumnIndex)
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 1, subColumnIndex: undefined },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      // Move to sub-column
      const mockEvent = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: 0 } },
        item: { data: field },
        currentIndex: 0,
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const updatedField = formBuilderService.formFields().find((f) => f.id === 'field-1');
      expect(updatedField?.position?.subColumnIndex).toBe(0);
      expect(updatedField?.position?.columnIndex).toBe(0);
    });

    it('should calculate correct orderInColumn for multi-field stacking in sub-column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      // Add first field to sub-column 0
      const mockEvent1 = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: 0 } },
        item: { data: { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text' } },
        currentIndex: 0,
      };
      component.onFieldDroppedInRow(mockEvent1 as any);

      // Add second field to same sub-column
      const mockEvent2 = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: 0 } },
        item: { data: { type: FormFieldType.EMAIL, icon: 'pi-envelope', label: 'Email' } },
        currentIndex: 1,
      };
      component.onFieldDroppedInRow(mockEvent2 as any);
      fixture.detectChanges();

      const fieldsInSubColumn = component.fieldsInSubColumn(rowId, 0, 0);
      expect(fieldsInSubColumn.length).toBe(2);
      expect(fieldsInSubColumn[0].position?.orderInColumn).toBe(0);
      expect(fieldsInSubColumn[1].position?.orderInColumn).toBe(1);
    });

    it('should clear subColumnIndex when moving field to parent column', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      // Create field in sub-column
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 0, subColumnIndex: 1 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      // Move to parent column (subColumnIndex: undefined)
      const mockEvent = {
        container: { data: { rowId, columnIndex: 1, subColumnIndex: undefined } },
        item: { data: field },
        currentIndex: 0,
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const updatedField = formBuilderService.formFields().find((f) => f.id === 'field-1');
      expect(updatedField?.position?.subColumnIndex).toBeUndefined();
      expect(updatedField?.position?.columnIndex).toBe(1);
    });

    it('should maintain backward compatibility with non-nested columns', () => {
      // Reset to row layout without sub-columns
      formBuilderService.disableRowLayout();
      formBuilderService.enableRowLayout();
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;
      fixture.detectChanges();

      // Drop field in regular parent column (no sub-columns)
      const mockEvent = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: undefined } },
        item: { data: { type: FormFieldType.TEXT, icon: 'pi-pencil', label: 'Text' } },
        currentIndex: 0,
      };

      component.onFieldDroppedInRow(mockEvent as any);
      fixture.detectChanges();

      const fields = formBuilderService.formFields();
      const newField = fields.find((f) => f.type === FormFieldType.TEXT);

      expect(newField).toBeTruthy();
      expect(newField?.position?.subColumnIndex).toBeUndefined();
      expect(newField?.position?.columnIndex).toBe(0);
    });

    it('should handle no-op drops when dropping field in same position', () => {
      const rows = formBuilderService.rowConfigs();
      const rowId = rows[0].rowId;

      // Create field in sub-column
      const field = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'field1',
        label: 'Field 1',
        required: false,
        order: 0,
        placeholder: '',
        helpText: '',
        position: { rowId, columnIndex: 0, subColumnIndex: 0, orderInColumn: 0 },
      };
      formBuilderService.addField(field);
      fixture.detectChanges();

      const _originalPosition = { ...field.position };

      // Drop in same position (should be no-op)
      const mockEvent = {
        container: { data: { rowId, columnIndex: 0, subColumnIndex: 0 } },
        item: { data: field },
        currentIndex: 0,
      };

      spyOn(formBuilderService, 'setFieldPosition');
      component.onFieldDroppedInRow(mockEvent as any);

      // setFieldPosition should not be called for no-op drops
      expect(formBuilderService.setFieldPosition).not.toHaveBeenCalled();
    });
  });
});
