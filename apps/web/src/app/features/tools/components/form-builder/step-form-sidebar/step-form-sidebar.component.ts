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
import { MessageService, ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { AccordionModule } from 'primeng/accordion';
import { FormBuilderService } from '../form-builder.service';
import { FormStep, RowLayoutConfig } from '@nodeangularfullstack/shared';

/** Width ratio option for dropdown UI */
interface WidthRatioOption {
  label: string;
  value: string | string[];
}

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
    ConfirmDialog,
    SelectModule,
    MessageModule,
    AccordionModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './step-form-sidebar.component.html',
  styleUrls: ['./step-form-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepFormSidebarComponent {
  private readonly formBuilderService = inject(FormBuilderService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  // Expose service signals
  protected readonly steps = this.formBuilderService.steps;
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly canAddStep = this.formBuilderService.canAddStep;
  protected readonly canDeleteStep = this.formBuilderService.canDeleteStep;
  protected readonly rowLayoutEnabled = this.formBuilderService.rowLayoutEnabled;
  protected readonly rowConfigs = this.formBuilderService.rowConfigs;
  protected readonly activeStepId = this.formBuilderService.activeStepId;

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

  // Step expansion state (Map<stepId, boolean>)
  protected stepExpansionState = signal<Map<string, boolean>>(new Map());

  /**
   * Selected width ratio for each row (rowId => selected value).
   * Value can be a preset array (e.g., ['1fr', '2fr']) or 'custom' string.
   */
  protected readonly selectedWidthRatios = signal<Record<string, string | string[]>>({});

  /**
   * Custom width input values for each row (rowId => input string).
   */
  protected readonly customWidthInputs = signal<Record<string, string>>({});

  /**
   * Validation errors for custom width inputs (rowId => error message).
   */
  protected readonly widthValidationErrors = signal<Record<string, string>>({});

  /**
   * Sub-column toggle states (rowId-columnIndex => boolean).
   * Used for two-way binding with ToggleButton components.
   */
  protected readonly subColumnToggles = signal<Record<string, boolean>>({});

  /**
   * Sub-column count selections (rowId-columnIndex => count).
   * Tracks the selected number of sub-columns for each column.
   */
  protected readonly subColumnCounts = signal<Record<string, number>>({});

  /**
   * Options for sub-column count dropdown (2, 3, or 4 sub-columns).
   */
  protected readonly subColumnCountOptions = [
    { label: '2 Sub-Columns', value: 2 as const },
    { label: '3 Sub-Columns', value: 3 as const },
    { label: '4 Sub-Columns', value: 4 as const },
  ];

  /**
   * Selected width ratio for each sub-column (rowId-columnIndex => selected value).
   * Value can be a preset array (e.g., ['1fr', '2fr']) or 'custom' string.
   */
  protected readonly subColumnWidthRatios = signal<Record<string, string | string[]>>({});

  /**
   * Custom width input values for sub-columns (rowId-columnIndex => input string).
   */
  protected readonly customSubColumnWidthInputs = signal<Record<string, string>>({});

  /**
   * Validation errors for custom sub-column width inputs (rowId-columnIndex => error message).
   */
  protected readonly subColumnWidthValidationErrors = signal<Record<string, string>>({});

  // Initialize all steps collapsed by default; do not auto-expand first
  private readonly initExpansionEffect = effect(() => {
    const steps = this.steps();
    const current = this.stepExpansionState();
    if (steps.length > 0 && current.size === 0) {
      const initial = new Map<string, boolean>();
      steps.forEach((s) => initial.set(s.id, false));
      this.stepExpansionState.set(initial);
    }
  });

  // Computed: rows grouped by step ID
  protected rowsByStep = computed(() => {
    const rows = this.rowConfigs();
    const grouped = new Map<string, any[]>();

    rows.forEach((row) => {
      if (row.stepId) {
        if (!grouped.has(row.stepId)) {
          grouped.set(row.stepId, []);
        }
        grouped.get(row.stepId)!.push(row);
      }
    });

    return grouped;
  });

  // Computed: row count per step
  protected getRowCountForStep = (stepId: string): number => {
    return this.rowsByStep().get(stepId)?.length || 0;
  };

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

  // When active step changes (e.g., clicking tabs on the canvas), expand that group only
  private readonly syncActiveStepExpansion = effect(() => {
    const activeId = this.activeStepId();
    const enabled = this.stepFormEnabled();
    if (!enabled || !activeId) return;

    const steps = this.steps();
    if (steps.length === 0) return;

    const next = new Map<string, boolean>();
    steps.forEach((s) => next.set(s.id, s.id === activeId));
    this.stepExpansionState.set(next);
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

  /**
   * Toggle step expansion state
   * @param stepId - ID of the step to toggle
   */
  toggleStepExpansion(stepId: string): void {
    // Accordion behavior: opening one closes others
    const currentMap = this.stepExpansionState();
    const isCurrentlyOpen = currentMap.get(stepId) ?? false;

    if (isCurrentlyOpen) {
      // Close the current step
      const closed = new Map(currentMap);
      closed.set(stepId, false);
      this.stepExpansionState.set(closed);
      return;
    }

    // Open the requested step and close all others
    const next = new Map<string, boolean>();
    this.steps().forEach((s) => next.set(s.id, s.id === stepId));
    this.stepExpansionState.set(next);
  }

  /**
   * Check if step is expanded
   * @param stepId - ID of the step to check
   * @returns true if expanded, false if collapsed
   */
  isStepExpanded(stepId: string): boolean {
    return this.stepExpansionState().get(stepId) ?? false; // Default to collapsed
  }

  /**
   * Get rows for a specific step
   * @param stepId - ID of the step
   * @returns Array of row configurations for the step
   */
  getRowsForStep(stepId: string): any[] {
    return this.rowsByStep().get(stepId) || [];
  }

  /**
   * Add row to a specific step
   * @param stepId - ID of the step to add row to
   */
  onAddRowToStep(stepId: string): void {
    const rowId = this.formBuilderService.addRowToStep(2, stepId); // Default: 2 columns
    if (rowId) {
      this.messageService.add({
        severity: 'success',
        summary: 'Row Added',
        detail: 'New row has been added to the step.',
        life: 3000,
      });
      // Ensure step is expanded to show new row
      // Ensure only this step is expanded (accordion behavior)
      const next = new Map<string, boolean>();
      this.steps().forEach((s) => next.set(s.id, s.id === stepId));
      this.stepExpansionState.set(next);
    }
  }

  /**
   * Remove row from step
   * @param rowId - ID of the row to remove
   */
  onRemoveRowFromStep(rowId: string): void {
    this.confirmationService.confirm({
      message: 'Remove this row? Fields in this row will be moved to another row.',
      header: 'Remove Row',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.formBuilderService.removeRow(rowId);
        this.messageService.add({
          severity: 'info',
          summary: 'Row Removed',
          detail: 'Row has been removed.',
          life: 2000,
        });
      },
    });
  }

  /**
   * Update row column count
   * @param rowId - ID of the row to update
   * @param columnCount - New column count (1-4)
   */
  onUpdateRowColumns(rowId: string, columnCount: 1 | 2 | 3 | 4): void {
    this.formBuilderService.updateRowColumns(rowId, columnCount);
  }

  /**
   * Set active step (for canvas navigation)
   * @param stepId - ID of the step to activate
   */
  onSetActiveStep(stepId: string): void {
    this.formBuilderService.setActiveStep(stepId);
  }

  /**
   * Generates width ratio options based on column count.
   * Options adapt to the number of columns (2-4).
   */
  getWidthRatioOptions(columnCount: number): WidthRatioOption[] {
    if (columnCount === 2) {
      return [
        { label: 'Equal (50-50)', value: ['1fr', '1fr'] },
        { label: 'Narrow-Wide (33-67)', value: ['1fr', '2fr'] },
        { label: 'Narrow-Wider (25-75)', value: ['1fr', '3fr'] },
        { label: 'Wide-Narrow (67-33)', value: ['2fr', '1fr'] },
        { label: 'Wider-Narrow (75-25)', value: ['3fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    } else if (columnCount === 3) {
      return [
        { label: 'Equal (33-33-33)', value: ['1fr', '1fr', '1fr'] },
        { label: 'Narrow-Wide-Narrow (25-50-25)', value: ['1fr', '2fr', '1fr'] },
        { label: 'Wide-Narrow-Narrow (50-25-25)', value: ['2fr', '1fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    } else if (columnCount === 4) {
      return [
        { label: 'Equal (25-25-25-25)', value: ['1fr', '1fr', '1fr', '1fr'] },
        { label: 'Wide-Narrow-Narrow-Narrow (40-20-20-20)', value: ['2fr', '1fr', '1fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    }
    return [];
  }

  /**
   * Generates placeholder text for custom width input based on column count.
   */
  getCustomWidthsPlaceholder(columnCount: number): string {
    const examples: Record<number, string> = {
      2: 'e.g., 1fr, 2fr',
      3: 'e.g., 1fr, 2fr, 1fr',
      4: 'e.g., 1fr, 2fr, 1fr, 2fr',
    };
    return examples[columnCount] || 'e.g., 1fr, 2fr';
  }

  /**
   * Returns an array of column indices for iteration in the template.
   * Used to generate accordion tabs for each column.
   *
   * @example
   * getColumnIndices(3) => [0, 1, 2]
   */
  getColumnIndices(columnCount: number): number[] {
    return Array.from({ length: columnCount }, (_, i) => i);
  }

  /**
   * Checks if a specific column has sub-columns configured.
   * Uses the FormBuilderService subColumnsByRowColumn map for efficient lookup.
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @returns True if sub-columns are configured for this column
   */
  hasSubColumns(rowId: string, columnIndex: number): boolean {
    const key = `${rowId}-${columnIndex}`;
    return this.formBuilderService.subColumnsByRowColumn().has(key);
  }

  /**
   * Gets the number of sub-columns configured for a specific column.
   * Returns null if no sub-columns are configured.
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @returns The sub-column count (1-4) or null
   */
  getSubColumnCount(rowId: string, columnIndex: number): number | null {
    const key = `${rowId}-${columnIndex}`;
    const config = this.formBuilderService.subColumnsByRowColumn().get(key);
    return config?.subColumnCount ?? null;
  }

  /**
   * Gets sub-column width ratio options based on sub-column count.
   * Options adapt to the number of sub-columns (2-4).
   *
   * @param count - The number of sub-columns
   * @returns Array of width ratio options
   */
  getSubColumnWidthOptions(count: number): WidthRatioOption[] {
    if (count === 2) {
      return [
        { label: 'Equal (50-50)', value: ['1fr', '1fr'] },
        { label: 'Narrow-Wide (33-67)', value: ['1fr', '2fr'] },
        { label: 'Narrow-Wider (25-75)', value: ['1fr', '3fr'] },
        { label: 'Wide-Narrow (67-33)', value: ['2fr', '1fr'] },
        { label: 'Wider-Narrow (75-25)', value: ['3fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    } else if (count === 3) {
      return [
        { label: 'Equal (33-33-33)', value: ['1fr', '1fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    } else if (count === 4) {
      return [
        { label: 'Equal (25-25-25-25)', value: ['1fr', '1fr', '1fr', '1fr'] },
        { label: 'Custom...', value: 'custom' },
      ];
    }
    return [];
  }

  /**
   * Gets placeholder text for custom sub-column width input based on count.
   *
   * @param count - The number of sub-columns
   * @returns Placeholder text
   */
  getSubColumnWidthPlaceholder(count: number): string {
    const placeholders: Record<number, string> = {
      2: 'e.g., 1fr, 2fr',
      3: 'e.g., 1fr, 2fr, 1fr',
      4: 'e.g., 1fr, 1fr, 2fr, 1fr',
    };
    return placeholders[count] || 'e.g., 1fr, 2fr';
  }

  /**
   * Handles width ratio dropdown change.
   * Applies preset widths or enables custom input mode.
   */
  onWidthRatioChange(rowId: string, event: any): void {
    const value = event.value;

    if (value === 'custom') {
      // Enable custom input mode - don't update service yet
      this.selectedWidthRatios.update((ratios) => ({ ...ratios, [rowId]: 'custom' }));
    } else if (Array.isArray(value)) {
      // Apply preset width ratio
      try {
        this.formBuilderService.updateRowColumnWidths(rowId, value);
        this.selectedWidthRatios.update((ratios) => ({ ...ratios, [rowId]: value }));
        // Clear any validation errors
        this.widthValidationErrors.update((errors) => {
          const updated = { ...errors };
          delete updated[rowId];
          return updated;
        });
      } catch (error: any) {
        console.error('Failed to update column widths:', error);
      }
    }
  }

  /**
   * Handles custom width input change with debounced validation.
   * Validates syntax and applies widths if valid.
   */
  onCustomWidthsChange(rowId: string, value: string): void {
    // Update input value
    this.customWidthInputs.update((inputs) => ({ ...inputs, [rowId]: value }));

    if (!value || value.trim() === '') {
      this.widthValidationErrors.update((errors) => {
        const updated = { ...errors };
        delete updated[rowId];
        return updated;
      });
      return;
    }

    // Validate and parse input
    const validation = this.validateWidthInput(value, rowId);

    if (!validation.valid) {
      this.widthValidationErrors.update((errors) => ({
        ...errors,
        [rowId]: validation.error || 'Invalid width syntax',
      }));
    } else if (validation.widths) {
      // Valid input - apply widths
      try {
        this.formBuilderService.updateRowColumnWidths(rowId, validation.widths);
        this.widthValidationErrors.update((errors) => {
          const updated = { ...errors };
          delete updated[rowId];
          return updated;
        });
      } catch (error: any) {
        this.widthValidationErrors.update((errors) => ({
          ...errors,
          [rowId]: error.message || 'Failed to apply widths',
        }));
      }
    }
  }

  /**
   * Validates custom width input string.
   * Returns validation result with parsed widths array if valid.
   */
  private validateWidthInput(
    input: string,
    rowId: string,
  ): { valid: boolean; error?: string; widths?: string[] } {
    const row = this.formBuilderService.getRowLayout().find((r) => r.rowId === rowId);
    if (!row) {
      return { valid: false, error: 'Row not found' };
    }

    // Parse comma-separated values
    const widths = input
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    // Validate count
    if (widths.length !== row.columnCount) {
      return {
        valid: false,
        error: `Must provide exactly ${row.columnCount} values`,
      };
    }

    // Validate fractional unit syntax
    const fractionalUnitPattern = /^\d+fr$/;
    const invalidWidths = widths.filter((w) => !fractionalUnitPattern.test(w));
    if (invalidWidths.length > 0) {
      return {
        valid: false,
        error: "Invalid syntax. Use format like '1fr, 2fr'",
      };
    }

    return { valid: true, widths };
  }

  /**
   * Handles toggle button state change for sub-columns.
   * When enabling, adds sub-columns with default count of 2.
   * When disabling, shows confirmation dialog (fields may be affected).
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @param enabled - True if enabling sub-columns, false if disabling
   */
  onToggleSubColumns(rowId: string, columnIndex: number, enabled: boolean): void {
    const key = `${rowId}-${columnIndex}`;

    if (enabled) {
      // Enable sub-columns with default 2 columns
      this.formBuilderService.addSubColumn(rowId, columnIndex, 2);
      // Update toggle state
      this.subColumnToggles.update((toggles) => ({ ...toggles, [key]: true }));
      // Initialize count state
      this.subColumnCounts.update((counts) => ({ ...counts, [key]: 2 }));
    } else {
      // Show confirmation dialog before disabling
      this.confirmationService.confirm({
        message: 'This will move all fields in sub-columns back to the parent column. Continue?',
        header: 'Disable Sub-Columns?',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          // User confirmed - remove sub-columns
          this.formBuilderService.removeSubColumn(rowId, columnIndex);
          // Update toggle state
          this.subColumnToggles.update((toggles) => ({ ...toggles, [key]: false }));
          // Clear count state
          this.subColumnCounts.update((counts) => {
            const { [key]: _, ...updated } = counts;
            return updated;
          });
        },
        reject: () => {
          // User cancelled - revert toggle state
          this.subColumnToggles.update((toggles) => ({ ...toggles, [key]: true }));
        },
      });
    }
  }

  /**
   * Handles sub-column count dropdown change.
   * Updates count while preserving field positions.
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @param count - The new sub-column count (2, 3, or 4)
   */
  onSubColumnCountChange(rowId: string, columnIndex: number, count: number): void {
    const key = `${rowId}-${columnIndex}`;

    // Update sub-column count (preserves fields)
    this.formBuilderService.updateSubColumnCount(rowId, columnIndex, count as 1 | 2 | 3 | 4);

    // Update count state
    this.subColumnCounts.update((counts) => ({ ...counts, [key]: count }));
  }

  /**
   * Handles sub-column width ratio dropdown change.
   * Applies preset widths or enables custom input mode.
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @param value - The selected value (preset array or 'custom' string)
   */
  onSubColumnWidthRatioChange(rowId: string, columnIndex: number, value: string | string[]): void {
    const key = `${rowId}-${columnIndex}`;

    if (value === 'custom') {
      // Enable custom input mode - don't update service yet
      this.subColumnWidthRatios.update((ratios) => ({ ...ratios, [key]: 'custom' }));
    } else if (Array.isArray(value)) {
      // Apply preset width ratio
      try {
        this.formBuilderService.updateSubColumnWidths(rowId, columnIndex, value);
        this.subColumnWidthRatios.update((ratios) => ({ ...ratios, [key]: value }));
        // Clear any validation errors
        this.subColumnWidthValidationErrors.update((errors) => {
          const { [key]: _, ...updated } = errors;
          return updated;
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update sub-column widths';
        console.error(errorMessage, error);
      }
    }
  }

  /**
   * Handles custom sub-column width input change with validation.
   * Validates syntax and applies widths if valid.
   *
   * @param rowId - The row identifier
   * @param columnIndex - The column index (0-based)
   * @param value - The custom width input string
   */
  onCustomSubWidthsChange(rowId: string, columnIndex: number, value: string): void {
    const key = `${rowId}-${columnIndex}`;

    // Update input value
    this.customSubColumnWidthInputs.update((inputs) => ({ ...inputs, [key]: value }));

    if (!value || value.trim() === '') {
      this.subColumnWidthValidationErrors.update((errors) => {
        const { [key]: _, ...updated } = errors;
        return updated;
      });
      return;
    }

    // Get expected count
    const expectedCount = this.getSubColumnCount(rowId, columnIndex);
    if (!expectedCount) {
      return;
    }

    // Validate and parse input
    const validation = this.validateSubColumnWidthInput(value, expectedCount);

    if (!validation.valid) {
      this.subColumnWidthValidationErrors.update((errors) => ({
        ...errors,
        [key]: validation.error || 'Invalid width syntax',
      }));
    } else if (validation.widths) {
      // Valid input - apply widths
      try {
        this.formBuilderService.updateSubColumnWidths(rowId, columnIndex, validation.widths);
        this.subColumnWidthValidationErrors.update((errors) => {
          const { [key]: _, ...updated } = errors;
          return updated;
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to apply widths';
        this.subColumnWidthValidationErrors.update((errors) => ({
          ...errors,
          [key]: errorMessage,
        }));
      }
    }
  }

  /**
   * Validates custom sub-column width input string.
   * Returns validation result with parsed widths array if valid.
   *
   * @param input - The custom width input string
   * @param expectedCount - The expected number of width values
   * @returns Validation result with widths if valid
   */
  private validateSubColumnWidthInput(
    input: string,
    expectedCount: number,
  ): { valid: boolean; error?: string; widths?: string[] } {
    // Parse comma-separated values
    const widths = input
      .split(',')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    // Validate count
    if (widths.length !== expectedCount) {
      return {
        valid: false,
        error: `Must provide exactly ${expectedCount} values`,
      };
    }

    // Validate fractional unit syntax
    const fractionalUnitPattern = /^\d+fr$/;
    const invalidWidths = widths.filter((w) => !fractionalUnitPattern.test(w));
    if (invalidWidths.length > 0) {
      return {
        valid: false,
        error: "Invalid syntax. Use format like '1fr, 2fr'",
      };
    }

    return { valid: true, widths };
  }
}
