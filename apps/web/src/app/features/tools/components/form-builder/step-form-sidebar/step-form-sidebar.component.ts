import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { PanelModule } from 'primeng/panel';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { FormBuilderService } from '../form-builder.service';
import { FormStep } from '@nodeangularfullstack/shared';

/**
 * Step Form Sidebar Component
 * Provides UI for enabling/disabling step form mode and managing form steps.
 * Allows users to add, edit, delete, and reorder steps in multi-step forms.
 */
@Component({
  selector: 'app-step-form-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ToggleButtonModule,
    PanelModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    DragDropModule,
    TooltipModule,
  ],
  templateUrl: './step-form-sidebar.component.html',
  styleUrls: ['./step-form-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepFormSidebarComponent {
  private readonly formBuilderService = inject(FormBuilderService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  // Expose service signals
  protected readonly steps = this.formBuilderService.steps;
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly canAddStep = this.formBuilderService.canAddStep;
  protected readonly canDeleteStep = this.formBuilderService.canDeleteStep;

  // Local toggle state (kept in sync with signal-based state)
  protected stepFormToggleValue = false;

  // Dialog states
  protected showEnableDialog = signal(false);
  protected showDisableDialog = signal(false);
  protected showEditDialog = signal(false);
  protected showDeleteDialog = signal(false);

  // Edit/delete state
  protected editingStep = signal<FormStep | null>(null);
  protected deletingStep = signal<FormStep | null>(null);

  // Step form for editing
  protected stepForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
  });

  // Computed tooltip messages
  protected addStepTooltip = computed(() =>
    this.canAddStep() ? 'Add new step' : 'Maximum 10 steps reached',
  );

  protected deleteStepTooltip = computed(() =>
    this.canDeleteStep() ? 'Delete step' : 'Cannot delete last step',
  );

  // Keep toggle state aligned with signal value
  private readonly syncToggleEffect = effect(() => {
    this.stepFormToggleValue = this.stepFormEnabled();
    this.changeDetectorRef.markForCheck();
  });

  /**
   * Handle toggle switch click for enabling step form mode.
   * Shows confirmation dialog before enabling.
   */
  onToggleStepForm(event: any): void {
    if (event.checked && !this.stepFormEnabled()) {
      // Show confirmation before enabling
      this.showEnableDialog.set(true);
    } else if (!event.checked && this.stepFormEnabled()) {
      // Show confirmation before disabling
      this.showDisableDialog.set(true);
    }

    // Revert toggle UI to current state until confirmation resolves
    this.stepFormToggleValue = this.stepFormEnabled();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Confirm enabling step form mode.
   * Creates default first step and migrates existing fields.
   */
  confirmEnableStepForm(): void {
    this.formBuilderService.enableStepForm();
    this.showEnableDialog.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Step Form Enabled',
      detail: 'All fields moved to Step 1. You can now add more steps.',
      life: 3000,
    });
  }

  /**
   * Cancel enabling step form mode.
   */
  cancelEnableStepForm(): void {
    this.showEnableDialog.set(false);
  }

  /**
   * Confirm disabling step form mode.
   * Removes step assignments from all fields.
   */
  confirmDisableStepForm(): void {
    this.formBuilderService.disableStepForm();
    this.showDisableDialog.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Step Form Disabled',
      detail: 'Form converted to single-page mode.',
      life: 3000,
    });
  }

  /**
   * Cancel disabling step form mode.
   */
  cancelDisableStepForm(): void {
    this.showDisableDialog.set(false);
  }

  /**
   * Add a new step to the form.
   * Automatically opens edit dialog for the new step.
   */
  onAddStep(): void {
    if (!this.canAddStep()) return;

    const stepCount = this.steps().length;
    const newStep: FormStep = {
      id: crypto.randomUUID(),
      title: `Step ${stepCount + 1}`,
      description: '',
      order: stepCount,
    };

    this.formBuilderService.addStep(newStep);

    // Open edit dialog for new step
    this.editingStep.set(newStep);
    this.stepForm.patchValue({
      title: newStep.title,
      description: newStep.description || '',
    });
    this.showEditDialog.set(true);

    this.messageService.add({
      severity: 'success',
      summary: 'Step Added',
      detail: `${newStep.title} has been created.`,
      life: 3000,
    });
  }

  /**
   * Open edit dialog for a step.
   * @param step - The step to edit
   */
  onEditStep(step: FormStep): void {
    this.editingStep.set(step);
    this.stepForm.patchValue({
      title: step.title,
      description: step.description || '',
    });
    this.showEditDialog.set(true);
  }

  /**
   * Save step changes from edit dialog.
   */
  onSaveStep(): void {
    if (this.stepForm.invalid) return;

    const step = this.editingStep();
    if (!step) return;

    const updates: Partial<FormStep> = {
      title: this.stepForm.value.title!,
      description: this.stepForm.value.description || '',
    };

    this.formBuilderService.updateStep(step.id, updates);
    this.showEditDialog.set(false);
    this.editingStep.set(null);
    this.stepForm.reset();

    this.messageService.add({
      severity: 'success',
      summary: 'Step Updated',
      detail: 'Step details have been saved.',
      life: 3000,
    });
  }

  /**
   * Cancel editing step.
   */
  onCancelEdit(): void {
    this.showEditDialog.set(false);
    this.editingStep.set(null);
    this.stepForm.reset();
  }

  /**
   * Open delete confirmation dialog for a step.
   * @param step - The step to delete
   */
  onDeleteStep(step: FormStep): void {
    if (!this.canDeleteStep()) return;

    this.deletingStep.set(step);
    this.showDeleteDialog.set(true);
  }

  /**
   * Confirm deleting a step.
   * Removes step and reassigns its fields to the first step.
   */
  confirmDeleteStep(): void {
    const step = this.deletingStep();
    if (!step) return;

    this.formBuilderService.removeStep(step.id);
    this.showDeleteDialog.set(false);
    this.deletingStep.set(null);

    this.messageService.add({
      severity: 'success',
      summary: 'Step Deleted',
      detail: `${step.title} has been removed. Fields moved to first step.`,
      life: 3000,
    });
  }

  /**
   * Cancel deleting a step.
   */
  cancelDeleteStep(): void {
    this.showDeleteDialog.set(false);
    this.deletingStep.set(null);
  }

  /**
   * Handle drag-drop reordering of steps.
   * @param event - CDK drag-drop event
   */
  onStepDrop(event: CdkDragDrop<FormStep[]>): void {
    const steps = [...this.steps()];
    moveItemInArray(steps, event.previousIndex, event.currentIndex);

    this.formBuilderService.reorderSteps(steps);

    this.messageService.add({
      severity: 'info',
      summary: 'Steps Reordered',
      detail: 'Step order has been updated.',
      life: 2000,
    });
  }
}
