import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepFormSidebarComponent } from './step-form-sidebar.component';
import { FormBuilderService } from '../form-builder.service';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { FormStep } from '@nodeangularfullstack/shared';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('StepFormSidebarComponent', () => {
  let component: StepFormSidebarComponent;
  let fixture: ComponentFixture<StepFormSidebarComponent>;
  let mockFormBuilderService: jasmine.SpyObj<FormBuilderService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    // Create spy objects
    mockFormBuilderService = jasmine.createSpyObj('FormBuilderService', [
      'enableStepForm',
      'disableStepForm',
      'addStep',
      'removeStep',
      'updateStep',
      'reorderSteps',
      'getStepById',
    ]);

    // Add signal properties
    (mockFormBuilderService as any).steps = signal<FormStep[]>([]);
    (mockFormBuilderService as any).stepFormEnabled = signal<boolean>(false);
    (mockFormBuilderService as any).canAddStep = signal<boolean>(true);
    (mockFormBuilderService as any).canDeleteStep = signal<boolean>(false);

    mockMessageService = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [StepFormSidebarComponent],
      providers: [
        { provide: FormBuilderService, useValue: mockFormBuilderService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StepFormSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Step Form Toggle', () => {
    it('should show enable confirmation dialog when toggling on', () => {
      const event = { checked: true };
      component.onToggleStepForm(event);

      expect(component['showEnableDialog']()).toBe(true);
    });

    it('should show disable confirmation dialog when toggling off', () => {
      // Enable step form first
      (mockFormBuilderService as any).stepFormEnabled.set(true);
      fixture.detectChanges();

      const event = { checked: false };
      component.onToggleStepForm(event);

      expect(component['showDisableDialog']()).toBe(true);
    });

    it('should call enableStepForm on confirmation', () => {
      component.confirmEnableStepForm();

      expect(mockFormBuilderService.enableStepForm).toHaveBeenCalled();
      expect(component['showEnableDialog']()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Step Form Enabled',
        }),
      );
    });

    it('should call disableStepForm on confirmation', () => {
      component.confirmDisableStepForm();

      expect(mockFormBuilderService.disableStepForm).toHaveBeenCalled();
      expect(component['showDisableDialog']()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Step Form Disabled',
        }),
      );
    });

    it('should cancel enable step form', () => {
      component['showEnableDialog'].set(true);
      component.cancelEnableStepForm();

      expect(component['showEnableDialog']()).toBe(false);
      expect(mockFormBuilderService.enableStepForm).not.toHaveBeenCalled();
    });

    it('should cancel disable step form', () => {
      component['showDisableDialog'].set(true);
      component.cancelDisableStepForm();

      expect(component['showDisableDialog']()).toBe(false);
      expect(mockFormBuilderService.disableStepForm).not.toHaveBeenCalled();
    });
  });

  describe('Step Management', () => {
    it('should display all steps from service', () => {
      const mockSteps: FormStep[] = [
        { id: 'step1', title: 'Step 1', description: 'First step', order: 0 },
        { id: 'step2', title: 'Step 2', description: 'Second step', order: 1 },
      ];
      (mockFormBuilderService as any).steps.set(mockSteps);
      fixture.detectChanges();

      expect(component.steps().length).toBe(2);
      expect(component.steps()[0].title).toBe('Step 1');
      expect(component.steps()[1].title).toBe('Step 2');
    });

    it('should allow adding steps when count < 10', () => {
      (mockFormBuilderService as any).canAddStep.set(true);
      fixture.detectChanges();

      component.onAddStep();

      expect(mockFormBuilderService.addStep).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Step 1',
          order: 0,
        }),
      );
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Step Added',
        }),
      );
    });

    it('should not add step when count >= 10', () => {
      (mockFormBuilderService as any).canAddStep.set(false);
      fixture.detectChanges();

      component.onAddStep();

      expect(mockFormBuilderService.addStep).not.toHaveBeenCalled();
    });

    it('should open edit dialog when adding new step', () => {
      (mockFormBuilderService as any).canAddStep.set(true);
      fixture.detectChanges();

      component.onAddStep();

      expect(component['showEditDialog']()).toBe(true);
      expect(component['editingStep']()).toBeTruthy();
    });

    it('should open edit dialog on edit button click', () => {
      const mockStep: FormStep = {
        id: 'step1',
        title: 'Step 1',
        description: 'First step',
        order: 0,
      };

      component.onEditStep(mockStep);

      expect(component['showEditDialog']()).toBe(true);
      expect(component['editingStep']()).toEqual(mockStep);
      expect(component['stepForm'].value.title).toBe('Step 1');
      expect(component['stepForm'].value.description).toBe('First step');
    });

    it('should update step on save in edit dialog', () => {
      const mockStep: FormStep = {
        id: 'step1',
        title: 'Step 1',
        description: 'First step',
        order: 0,
      };

      component['editingStep'].set(mockStep);
      component['stepForm'].patchValue({
        title: 'Updated Step 1',
        description: 'Updated description',
      });
      fixture.detectChanges();

      component.onSaveStep();

      expect(mockFormBuilderService.updateStep).toHaveBeenCalledWith('step1', {
        title: 'Updated Step 1',
        description: 'Updated description',
      });
      expect(component['showEditDialog']()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Step Updated',
        }),
      );
    });

    it('should not save step if form is invalid', () => {
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };
      component['editingStep'].set(mockStep);
      component['stepForm'].patchValue({ title: '', description: '' });
      fixture.detectChanges();

      component.onSaveStep();

      expect(mockFormBuilderService.updateStep).not.toHaveBeenCalled();
    });

    it('should cancel editing step', () => {
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };
      component['editingStep'].set(mockStep);
      component['showEditDialog'].set(true);

      component.onCancelEdit();

      expect(component['showEditDialog']()).toBe(false);
      expect(component['editingStep']()).toBeNull();
    });
  });

  describe('Step Deletion', () => {
    it('should show confirmation before deleting step', () => {
      (mockFormBuilderService as any).canDeleteStep.set(true);
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };

      component.onDeleteStep(mockStep);

      expect(component['showDeleteDialog']()).toBe(true);
      expect(component['deletingStep']()).toEqual(mockStep);
    });

    it('should not delete step when only 1 step remains', () => {
      (mockFormBuilderService as any).canDeleteStep.set(false);
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };

      component.onDeleteStep(mockStep);

      expect(component['showDeleteDialog']()).toBe(false);
    });

    it('should confirm deleting step', () => {
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };
      component['deletingStep'].set(mockStep);

      component.confirmDeleteStep();

      expect(mockFormBuilderService.removeStep).toHaveBeenCalledWith('step1');
      expect(component['showDeleteDialog']()).toBe(false);
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'success',
          summary: 'Step Deleted',
        }),
      );
    });

    it('should cancel deleting step', () => {
      const mockStep: FormStep = { id: 'step1', title: 'Step 1', description: '', order: 0 };
      component['deletingStep'].set(mockStep);
      component['showDeleteDialog'].set(true);

      component.cancelDeleteStep();

      expect(component['showDeleteDialog']()).toBe(false);
      expect(component['deletingStep']()).toBeNull();
      expect(mockFormBuilderService.removeStep).not.toHaveBeenCalled();
    });
  });

  describe('Step Reordering', () => {
    it('should reorder steps on drag-drop', () => {
      const mockSteps: FormStep[] = [
        { id: 'step1', title: 'Step 1', description: '', order: 0 },
        { id: 'step2', title: 'Step 2', description: '', order: 1 },
        { id: 'step3', title: 'Step 3', description: '', order: 2 },
      ];
      (mockFormBuilderService as any).steps.set(mockSteps);
      fixture.detectChanges();

      const event = {
        previousIndex: 0,
        currentIndex: 2,
        item: {} as any,
        container: {} as any,
        previousContainer: {} as any,
        isPointerOverContainer: true,
        distance: { x: 0, y: 0 },
        dropPoint: { x: 0, y: 0 },
        event: {} as any,
      } as CdkDragDrop<FormStep[]>;

      component.onStepDrop(event);

      expect(mockFormBuilderService.reorderSteps).toHaveBeenCalled();
      expect(mockMessageService.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'info',
          summary: 'Steps Reordered',
        }),
      );
    });
  });

  describe('Computed Signals', () => {
    it('should compute correct tooltip for add step button', () => {
      (mockFormBuilderService as any).canAddStep.set(true);
      fixture.detectChanges();
      expect(component['addStepTooltip']()).toBe('Add new step');

      (mockFormBuilderService as any).canAddStep.set(false);
      fixture.detectChanges();
      expect(component['addStepTooltip']()).toBe('Maximum 10 steps reached');
    });

    it('should compute correct tooltip for delete step button', () => {
      (mockFormBuilderService as any).canDeleteStep.set(true);
      fixture.detectChanges();
      expect(component['deleteStepTooltip']()).toBe('Delete step');

      (mockFormBuilderService as any).canDeleteStep.set(false);
      fixture.detectChanges();
      expect(component['deleteStepTooltip']()).toBe('Cannot delete last step');
    });
  });

  describe('Column Width Configuration', () => {
    beforeEach(() => {
      // Add required methods to mock service
      (mockFormBuilderService as any).updateRowColumnWidths =
        jasmine.createSpy('updateRowColumnWidths');
      (mockFormBuilderService as any).getRowLayout = jasmine
        .createSpy('getRowLayout')
        .and.returnValue([{ rowId: 'row1', columnCount: 2, order: 0 }]);
      (mockFormBuilderService as any).rowLayoutEnabled = signal<boolean>(true);
      (mockFormBuilderService as any).rowConfigs = signal<any[]>([
        { rowId: 'row1', columnCount: 2, order: 0 },
      ]);
    });

    it('should update width ratio on dropdown change', () => {
      const event = { value: ['1fr', '2fr'] };
      component['onWidthRatioChange']('row1', event);

      expect(mockFormBuilderService.updateRowColumnWidths).toHaveBeenCalledWith('row1', [
        '1fr',
        '2fr',
      ]);
      expect(component['selectedWidthRatios']()['row1']).toEqual(['1fr', '2fr']);
    });

    it('should enable custom input mode when custom selected', () => {
      const event = { value: 'custom' };
      component['onWidthRatioChange']('row1', event);

      expect(component['selectedWidthRatios']()['row1']).toBe('custom');
      expect(mockFormBuilderService.updateRowColumnWidths).not.toHaveBeenCalled();
    });

    it('should validate and apply custom widths', () => {
      component['onCustomWidthsChange']('row1', '1fr, 2fr');

      expect(mockFormBuilderService.updateRowColumnWidths).toHaveBeenCalledWith('row1', [
        '1fr',
        '2fr',
      ]);
      expect(component['widthValidationErrors']()['row1']).toBeUndefined();
    });

    it('should show validation error for invalid custom widths', () => {
      component['onCustomWidthsChange']('row1', '1fr');

      expect(component['widthValidationErrors']()['row1']).toContain('exactly 2 values');
    });

    it('should get correct width ratio options for column count', () => {
      const options2 = component['getWidthRatioOptions'](2);
      const options3 = component['getWidthRatioOptions'](3);
      const options4 = component['getWidthRatioOptions'](4);

      expect(options2.length).toBe(6);
      expect(options3.length).toBe(4);
      expect(options4.length).toBe(3);
    });
  });

  describe('Sub-Column Configuration', () => {
    beforeEach(() => {
      // Add required methods to mock service
      (mockFormBuilderService as any).addSubColumn = jasmine.createSpy('addSubColumn');
      (mockFormBuilderService as any).removeSubColumn = jasmine.createSpy('removeSubColumn');
      (mockFormBuilderService as any).updateSubColumnCount =
        jasmine.createSpy('updateSubColumnCount');
      (mockFormBuilderService as any).updateSubColumnWidths =
        jasmine.createSpy('updateSubColumnWidths');
      (mockFormBuilderService as any).subColumnsByRowColumn = signal<Map<string, any>>(new Map());
    });

    it('should enable sub-columns when toggle is turned on', () => {
      component['onToggleSubColumns']('row1', 0, true);

      expect(mockFormBuilderService.addSubColumn).toHaveBeenCalledWith('row1', 0, 2);
      expect(component['subColumnToggles']()['row1-0']).toBe(true);
      expect(component['subColumnCounts']()['row1-0']).toBe(2);
    });

    it('should update sub-column count', () => {
      component['onSubColumnCountChange']('row1', 0, 3);

      expect(mockFormBuilderService.updateSubColumnCount).toHaveBeenCalledWith('row1', 0, 3);
      expect(component['subColumnCounts']()['row1-0']).toBe(3);
    });

    it('should update sub-column width ratio', () => {
      const value = ['1fr', '2fr'];
      component['onSubColumnWidthRatioChange']('row1', 0, value);

      expect(mockFormBuilderService.updateSubColumnWidths).toHaveBeenCalledWith('row1', 0, value);
      expect(component['subColumnWidthRatios']()['row1-0']).toEqual(value);
    });

    it('should check if column has sub-columns', () => {
      const mockMap = new Map();
      mockMap.set('row1-0', { subColumnCount: 2 });
      (mockFormBuilderService as any).subColumnsByRowColumn.set(mockMap);

      const result = component['hasSubColumns']('row1', 0);
      expect(result).toBe(true);
    });

    it('should get sub-column count for column', () => {
      const mockMap = new Map();
      mockMap.set('row1-0', { subColumnCount: 3 });
      (mockFormBuilderService as any).subColumnsByRowColumn.set(mockMap);

      const count = component['getSubColumnCount']('row1', 0);
      expect(count).toBe(3);
    });

    it('should get correct sub-column width options', () => {
      const options2 = component['getSubColumnWidthOptions'](2);
      const options3 = component['getSubColumnWidthOptions'](3);
      const options4 = component['getSubColumnWidthOptions'](4);

      expect(options2.length).toBe(6);
      expect(options3.length).toBe(2);
      expect(options4.length).toBe(2);
    });

    it('should get column indices array', () => {
      const indices = component['getColumnIndices'](3);
      expect(indices).toEqual([0, 1, 2]);
    });
  });
});
