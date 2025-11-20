import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AccordionModule } from 'primeng/accordion';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CheckboxModule } from 'primeng/checkbox';
import { FormBuilderService } from '../form-builder.service';
import { WidthRatioOption } from '../models/layout-options.model';

/**
 * Right sidebar component for row-based layout configuration.
 * Allows users to enable/disable row layout mode and configure column counts per row.
 *
 * Features:
 * - Enable/disable row layout mode with toggle
 * - Add/remove rows with custom column counts (1-4 columns)
 * - Column count selector for each row
 * - Migration from global to row-based layout
 *
 * @example
 * <app-row-layout-sidebar></app-row-layout-sidebar>
 */
@Component({
  selector: 'app-row-layout-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToggleSwitchModule,
    ConfirmDialogModule,
    SelectModule,
    InputTextModule,
    MessageModule,
    AccordionModule,
    ToggleButtonModule,
    CheckboxModule,
  ],
  providers: [ConfirmationService],
  template: `
    <!-- Confirmation dialog for destructive actions -->
    <p-confirmDialog></p-confirmDialog>

    <!-- Sidebar Content -->
    <div class="row-layout-sidebar-content h-full overflow-auto space-y-6 p-4">
      <!-- Row Layout Section -->
      <section class="section-block border-b border-gray-200 pb-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="section-eyebrow">Layout</p>
            <h3 class="text-lg font-semibold text-gray-800">Row Layout</h3>
            <p class="text-sm text-gray-500 mt-1">
              Organize fields into responsive rows and columns. Toggle row layout to unlock advanced
              positioning.
            </p>
          </div>
          <p-toggleSwitch
            [(ngModel)]="rowLayoutEnabled"
            (onChange)="onToggleRowLayout($event)"
            [attr.aria-label]="
              rowLayoutEnabled ? 'Disable row-based layout' : 'Enable row-based layout'
            "
          ></p-toggleSwitch>
        </div>
      </section>

      <!-- Active Rows Section (shown when row layout enabled) -->
      @if (formBuilderService.rowLayoutEnabled()) {
        <section class="section-block pb-6">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Active Rows</h4>
            <span class="text-xs text-gray-500">
              {{ formBuilderService.rowConfigs().length }}
              {{ formBuilderService.rowConfigs().length === 1 ? 'row' : 'rows' }}
            </span>
          </div>

          <!-- Batch Actions Toolbar (appears when 2+ rows selected) -->
          @if (formBuilderService.selectedRowCount() >= 2) {
            <div
              class="batch-toolbar sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 shadow-sm"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-blue-700">
                  {{ formBuilderService.selectedRowCount() }} rows selected
                </span>
                <div class="flex gap-2">
                  <button
                    pButton
                    label="Duplicate Selected"
                    icon="pi pi-copy"
                    severity="primary"
                    size="small"
                    (click)="onDuplicateSelected()"
                    [disabled]="formBuilderService.isPublished()"
                  ></button>
                  <button
                    pButton
                    label="Clear"
                    icon="pi pi-times"
                    severity="secondary"
                    size="small"
                    [text]="true"
                    (click)="onClearSelection()"
                  ></button>
                </div>
              </div>
            </div>
          }

          <div class="row-list space-y-3">
            @for (row of formBuilderService.rowConfigs(); track row.rowId) {
              <div
                class="row-item rounded-lg border p-3 shadow-xs transition-colors"
                [class.border-blue-500]="formBuilderService.isRowSelected(row.rowId)"
                [class.bg-blue-50]="formBuilderService.isRowSelected(row.rowId)"
                [class.border-gray-200]="!formBuilderService.isRowSelected(row.rowId)"
                [class.bg-white]="!formBuilderService.isRowSelected(row.rowId)"
              >
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div class="flex items-center gap-3">
                    <!-- Selection Checkbox -->
                    <p-checkbox
                      [binary]="true"
                      [(ngModel)]="rowSelectionStates[row.rowId]"
                      (onChange)="onRowCheckboxChange(row.rowId, $event.checked, $event)"
                      [disabled]="formBuilderService.isPublished()"
                      [attr.aria-label]="'Select row ' + (row.order + 1)"
                    />
                    <div>
                      <p class="text-sm font-semibold text-gray-800">Row {{ row.order + 1 }}</p>
                      <p class="text-xs text-gray-500">
                        {{ row.columnCount }}
                        {{ row.columnCount === 1 ? 'column' : 'columns' }}
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <!-- Duplicate Button -->
                    <button
                      pButton
                      icon="pi pi-copy"
                      severity="secondary"
                      size="small"
                      [outlined]="true"
                      (click)="onDuplicateRow(row.rowId)"
                      [attr.aria-label]="'Duplicate row ' + (row.order + 1)"
                      [disabled]="formBuilderService.isPublished()"
                    ></button>
                    <!-- Trash Button -->
                    <button
                      pButton
                      icon="pi pi-trash"
                      severity="danger"
                      size="small"
                      [outlined]="true"
                      (click)="onRemoveRow(row.rowId)"
                      [attr.aria-label]="'Remove row ' + (row.order + 1)"
                    ></button>
                  </div>
                </div>

                <div class="flex gap-2">
                  @for (count of [1, 2, 3, 4]; track count) {
                    <button
                      pButton
                      [label]="count.toString()"
                      size="small"
                      [outlined]="row.columnCount !== count"
                      [severity]="row.columnCount === count ? 'primary' : 'secondary'"
                      (click)="onUpdateColumns(row.rowId, $any(count))"
                      [attr.aria-label]="count + ' columns'"
                      [attr.aria-pressed]="row.columnCount === count"
                      class="flex-1"
                    ></button>
                  }
                </div>

                <!-- Column Widths Section (appears when columnCount >= 2) -->
                @if (row.columnCount >= 2) {
                  <div class="column-widths-section mt-4 pt-4 border-t border-gray-100">
                    <label
                      for="width-ratio-{{ row.rowId }}"
                      class="text-xs font-semibold text-gray-700 mb-2 block"
                    >
                      Width Ratio
                    </label>
                    <p-select
                      id="width-ratio-{{ row.rowId }}"
                      [options]="getWidthRatioOptions(row.columnCount)"
                      [(ngModel)]="selectedWidthRatios()[row.rowId]"
                      (onChange)="onWidthRatioChange(row.rowId, $event)"
                      placeholder="Select width ratio"
                      optionLabel="label"
                      optionValue="value"
                      [style]="{ width: '100%' }"
                      [styleClass]="'text-sm'"
                    />

                    @if (selectedWidthRatios()[row.rowId] === 'custom') {
                      <div class="mt-3">
                        <label
                          for="custom-widths-{{ row.rowId }}"
                          class="text-xs font-semibold text-gray-700 mb-2 block"
                        >
                          Custom Widths
                        </label>
                        <input
                          id="custom-widths-{{ row.rowId }}"
                          type="text"
                          pInputText
                          [(ngModel)]="customWidthInputs()[row.rowId]"
                          (ngModelChange)="onCustomWidthsChange(row.rowId, $event)"
                          [placeholder]="getCustomWidthsPlaceholder(row.columnCount)"
                          class="w-full text-sm"
                        />

                        @if (widthValidationErrors()[row.rowId]) {
                          <p-message
                            severity="error"
                            [text]="widthValidationErrors()[row.rowId]"
                            [styleClass]="'mt-2 text-xs'"
                          />
                        }
                      </div>
                    }
                  </div>
                }

                <!-- Sub-Columns Section (appears when columnCount > 0) -->
                @if (row.columnCount > 0) {
                  <div class="sub-columns-section mt-4 pt-4 border-t border-gray-100">
                    <h4 class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Sub-Columns
                    </h4>

                    <p-accordion [multiple]="true" [styleClass]="'text-sm'">
                      @for (columnIndex of getColumnIndices(row.columnCount); track columnIndex) {
                        <p-accordion-panel [value]="columnIndex">
                          <p-accordion-header>
                            <div class="column-header flex items-center gap-2">
                              <span class="text-sm font-medium">Column {{ columnIndex + 1 }}</span>
                              @if (hasSubColumns(row.rowId, columnIndex)) {
                                <i class="pi pi-th text-primary text-xs"></i>
                                <span
                                  class="badge bg-primary-500 text-white px-2 py-0.5 rounded-full text-xs"
                                >
                                  {{ getSubColumnCount(row.rowId, columnIndex) }}
                                </span>
                              }
                            </div>
                          </p-accordion-header>

                          <p-accordion-content>
                            <!-- Enable Sub-Columns Toggle -->
                            <div class="toggle-container flex items-center justify-between mb-4">
                              <label
                                for="sub-columns-toggle-{{ row.rowId }}-{{ columnIndex }}"
                                class="text-xs font-medium text-gray-700"
                              >
                                Enable Sub-Columns
                              </label>
                              <p-toggleButton
                                id="sub-columns-toggle-{{ row.rowId }}-{{ columnIndex }}"
                                [(ngModel)]="subColumnToggles()[row.rowId + '-' + columnIndex]"
                                (onChange)="
                                  onToggleSubColumns(row.rowId, columnIndex, $event.checked)
                                "
                                onLabel="Enabled"
                                offLabel="Disabled"
                                [onIcon]="'pi pi-check'"
                                [offIcon]="'pi pi-times'"
                                [attr.aria-label]="
                                  'Enable or disable sub-columns for column ' + (columnIndex + 1)
                                "
                                [styleClass]="'text-sm'"
                              />
                            </div>

                            <!-- Sub-column Configuration (appears when enabled) -->
                            @if (hasSubColumns(row.rowId, columnIndex)) {
                              <div class="sub-column-config space-y-3">
                                <!-- Sub-Column Count Dropdown -->
                                <div>
                                  <label
                                    for="sub-column-count-{{ row.rowId }}-{{ columnIndex }}"
                                    class="text-xs font-semibold text-gray-700 mb-2 block"
                                  >
                                    Number of Sub-Columns
                                  </label>
                                  <p-select
                                    id="sub-column-count-{{ row.rowId }}-{{ columnIndex }}"
                                    [options]="subColumnCountOptions"
                                    [(ngModel)]="subColumnCounts()[row.rowId + '-' + columnIndex]"
                                    (onChange)="
                                      onSubColumnCountChange(row.rowId, columnIndex, $event.value)
                                    "
                                    placeholder="Select count"
                                    optionLabel="label"
                                    optionValue="value"
                                    [style]="{ width: '100%' }"
                                    [styleClass]="'text-sm'"
                                  />
                                </div>

                                <!-- Sub-Column Width Ratio Dropdown -->
                                <div>
                                  <label
                                    for="sub-column-width-{{ row.rowId }}-{{ columnIndex }}"
                                    class="text-xs font-semibold text-gray-700 mb-2 block"
                                  >
                                    Sub-Column Width Ratio
                                  </label>
                                  <p-select
                                    id="sub-column-width-{{ row.rowId }}-{{ columnIndex }}"
                                    [options]="
                                      getSubColumnWidthOptions(
                                        getSubColumnCount(row.rowId, columnIndex) || 2
                                      )
                                    "
                                    [(ngModel)]="
                                      subColumnWidthRatios()[row.rowId + '-' + columnIndex]
                                    "
                                    (onChange)="
                                      onSubColumnWidthRatioChange(
                                        row.rowId,
                                        columnIndex,
                                        $event.value
                                      )
                                    "
                                    placeholder="Select ratio"
                                    optionLabel="label"
                                    optionValue="value"
                                    [style]="{ width: '100%' }"
                                    [styleClass]="'text-sm'"
                                  />
                                </div>

                                <!-- Custom Sub-Column Width Input (appears when 'custom' selected) -->
                                @if (
                                  subColumnWidthRatios()[row.rowId + '-' + columnIndex] === 'custom'
                                ) {
                                  <div>
                                    <label
                                      for="custom-sub-widths-{{ row.rowId }}-{{ columnIndex }}"
                                      class="text-xs font-semibold text-gray-700 mb-2 block"
                                    >
                                      Custom Widths
                                    </label>
                                    <input
                                      id="custom-sub-widths-{{ row.rowId }}-{{ columnIndex }}"
                                      type="text"
                                      pInputText
                                      [(ngModel)]="
                                        customSubColumnWidthInputs()[row.rowId + '-' + columnIndex]
                                      "
                                      (ngModelChange)="
                                        onCustomSubWidthsChange(row.rowId, columnIndex, $event)
                                      "
                                      [placeholder]="
                                        getSubColumnWidthPlaceholder(
                                          getSubColumnCount(row.rowId, columnIndex) || 2
                                        )
                                      "
                                      class="w-full text-sm"
                                    />

                                    @if (
                                      subColumnWidthValidationErrors()[
                                        row.rowId + '-' + columnIndex
                                      ]
                                    ) {
                                      <p-message
                                        severity="error"
                                        [text]="
                                          subColumnWidthValidationErrors()[
                                            row.rowId + '-' + columnIndex
                                          ]
                                        "
                                        [styleClass]="'mt-2 text-xs'"
                                      />
                                    }
                                  </div>
                                }
                              </div>
                            }
                          </p-accordion-content>
                        </p-accordion-panel>
                      }
                    </p-accordion>
                  </div>
                }
              </div>
            }
          </div>

          <button
            pButton
            label="Add Row"
            icon="pi pi-plus"
            size="small"
            (click)="onAddRow()"
            class="w-full mt-4"
            severity="secondary"
            [outlined]="true"
          ></button>
        </section>
      } @else {
        <!-- Migration Prompt (shown when row layout disabled) -->
        <section class="section-block pb-6">
          <div class="text-center py-6 px-4 border border-dashed border-gray-300 rounded-lg">
            <i class="pi pi-th-large text-4xl text-gray-400 mb-3 block"></i>
            <p class="text-sm text-gray-600 mb-4">
              Row layout is currently disabled. Enable it to arrange your fields with flexible
              multi-column rows.
            </p>
            @if (formBuilderService.hasFields()) {
              <button
                pButton
                label="Convert Existing Layout"
                icon="pi pi-arrow-right"
                size="small"
                (click)="onMigrateToRowLayout()"
                severity="info"
                [outlined]="true"
              ></button>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .row-item {
        transition: all 0.2s ease-in-out;
      }

      .row-item:hover {
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
      }

      .section-block {
        background: transparent;
      }

      .section-eyebrow {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        margin-bottom: 0.25rem;
        font-weight: 600;
      }

      .shadow-xs {
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      }

      /* Sub-Columns Section Styles */
      .sub-columns-section {
        background: rgba(249, 250, 251, 0.5);
        border-radius: 6px;
        padding: 0.75rem;
      }

      .column-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .column-header .badge {
        font-weight: 600;
        font-size: 0.7rem;
        line-height: 1;
      }

      .column-header i.pi-th {
        color: var(--primary-color);
      }

      /* Sub-Column Configuration Styles */
      .sub-column-config {
        padding: 0.5rem;
        background: white;
        border-radius: 4px;
      }

      .toggle-container {
        padding-bottom: 0.75rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }

      /* Ensure PrimeNG components have consistent styling */
      ::ng-deep {
        .sub-columns-section p-select,
        .sub-columns-section p-toggleButton {
          font-size: 0.875rem;
        }

        .sub-columns-section .p-accordion .p-accordion-header-link {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
        }

        .sub-columns-section .p-accordion .p-accordion-content {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class RowLayoutSidebarComponent {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly confirmationService = inject(ConfirmationService);

  /**
   * Local state for row layout toggle (two-way binding with InputSwitch).
   */
  rowLayoutEnabled = false;

  /**
   * Last selected row ID for range selection with Shift+Click.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  private readonly lastSelectedRowId = signal<string | null>(null);

  /**
   * Checkbox states for each row (rowId => checked boolean).
   * Used for two-way binding with p-checkbox components.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  readonly rowSelectionStates: Record<string, boolean> = {};

  /**
   * Constructor initializes checkbox state sync with service selection.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  constructor() {
    // Sync checkbox states with service selection
    effect(() => {
      const selectedIds = this.formBuilderService.selectedRowIds();
      this.formBuilderService.rowConfigs().forEach((row) => {
        this.rowSelectionStates[row.rowId] = selectedIds.includes(row.rowId);
      });
    });
  }

  /**
   * Expose step form state for quick status preview.
   */
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly steps = this.formBuilderService.steps;

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
   * Handles row layout enable/disable toggle.
   * Shows confirmation dialog when disabling to prevent accidental data loss.
   */
  onToggleRowLayout(event: any): void {
    if (event.checked) {
      this.formBuilderService.enableRowLayout();
    } else {
      this.confirmationService.confirm({
        message:
          'Disable row layout? Fields will revert to global column layout and row configuration will be lost.',
        header: 'Disable Row Layout',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.formBuilderService.disableRowLayout();
        },
        reject: () => {
          // Revert toggle state
          this.rowLayoutEnabled = true;
        },
      });
    }
  }

  /**
   * Adds a new row with default 2-column layout.
   * Service automatically assigns stepId when step mode is enabled.
   */
  onAddRow(): void {
    this.formBuilderService.addRow(2);
  }

  /**
   * Removes a row after confirmation.
   * Fields in the removed row are moved to the first available row.
   */
  onRemoveRow(rowId: string): void {
    this.confirmationService.confirm({
      message: 'Remove this row? Fields in this row will be moved to another row.',
      header: 'Remove Row',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.formBuilderService.removeRow(rowId);
      },
    });
  }

  /**
   * Duplicates an existing row with all fields and configuration.
   * Story 28.1: Single Row Duplication with Field Preservation
   *
   * @param rowId - ID of the row to duplicate
   */
  onDuplicateRow(rowId: string): void {
    const newRowId = this.formBuilderService.duplicateRow(rowId);
    if (newRowId) {
      console.log('Row duplicated successfully. New row ID:', newRowId);
    } else {
      console.error('Failed to duplicate row:', rowId);
    }
  }

  /**
   * Handles row checkbox change with keyboard modifier support.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   *
   * - Ctrl/Cmd+Click: Toggle individual row selection (add/remove)
   * - Shift+Click: Select range from last selected row to clicked row
   * - Click without modifiers: Single-select (deselects others, selects clicked row)
   *
   * @param rowId - ID of the row whose checkbox changed
   * @param checked - New checkbox state (true = checked, false = unchecked)
   * @param event - PrimeNG onChange event containing originalEvent (MouseEvent)
   */
  onRowCheckboxChange(rowId: string, checked: boolean, event: any): void {
    const nativeEvent = event.originalEvent as MouseEvent;

    if (nativeEvent.shiftKey && this.lastSelectedRowId()) {
      // Shift+Click: Select range
      this.formBuilderService.selectRowRange(this.lastSelectedRowId()!, rowId);
    } else if (nativeEvent.ctrlKey || nativeEvent.metaKey) {
      // Ctrl/Cmd+Click: Toggle selection
      this.formBuilderService.selectRow(rowId);
    } else {
      // Regular click: Single-select (clear others)
      this.formBuilderService.clearSelection();
      if (checked) {
        this.formBuilderService.selectRow(rowId);
      }
    }

    this.lastSelectedRowId.set(rowId);
  }

  /**
   * Duplicates all selected rows as a batch.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  onDuplicateSelected(): void {
    const selectedIds = this.formBuilderService.selectedRowIds();
    const newRowIds = this.formBuilderService.duplicateRows(selectedIds);
    console.log(`${newRowIds.length} rows duplicated successfully`);
  }

  /**
   * Clears all row selections.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  onClearSelection(): void {
    this.formBuilderService.clearSelection();
    this.lastSelectedRowId.set(null);
  }

  /**
   * Updates the column count for a row.
   */
  onUpdateColumns(rowId: string, columnCount: 1 | 2 | 3 | 4): void {
    this.formBuilderService.updateRowColumns(rowId, columnCount);
  }

  /**
   * Migrates from global column layout to row-based layout.
   * Creates rows based on current global column setting.
   */
  onMigrateToRowLayout(): void {
    this.confirmationService.confirm({
      message:
        'Convert form to row-based layout? This will reorganize your fields into rows based on the current column layout.',
      header: 'Convert to Row Layout',
      icon: 'pi pi-question-circle',
      acceptButtonStyleClass: 'p-button-info',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        // Default to 2 columns for migration
        // TODO: Get actual global column setting from form settings
        const globalColumns = 2;
        this.formBuilderService.migrateToRowLayout(globalColumns);
        this.rowLayoutEnabled = true;
      },
    });
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
   * Story 27.8: Field Preservation When Changing Sub-Column Count
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
