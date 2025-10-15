import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { FormBuilderService } from '../form-builder.service';

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
  imports: [CommonModule, FormsModule, ButtonModule, ToggleSwitch, ConfirmDialog],
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

          <div class="row-list space-y-3">
            @for (row of formBuilderService.rowConfigs(); track row.rowId) {
              <div class="row-item rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-800">Row {{ row.order + 1 }}</p>
                    <p class="text-xs text-gray-500">
                      {{ row.columnCount }}
                      {{ row.columnCount === 1 ? 'column' : 'columns' }}
                    </p>
                  </div>
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
   * Expose step form state for quick status preview.
   */
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly steps = this.formBuilderService.steps;

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
}
