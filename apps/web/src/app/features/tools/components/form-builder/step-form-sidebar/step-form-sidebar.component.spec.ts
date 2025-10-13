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
});
