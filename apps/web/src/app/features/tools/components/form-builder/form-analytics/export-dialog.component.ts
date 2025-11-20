import { Component, inject, input, model, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { FormField } from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';

/**
 * Export dialog component for configuring and downloading CSV exports of form submissions.
 * Provides field selection, date range filtering, and advanced value filtering capabilities.
 */
@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    InputTextModule,
    TagModule,
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '600px' }"
      header="Export Submissions to CSV"
      (onHide)="onCancel()"
    >
      <!-- Field Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Select Fields to Export</h3>
        <div class="flex gap-2 mb-2">
          <p-button label="Select All" size="small" (click)="selectAllFields()"></p-button>
          <p-button label="Deselect All" size="small" (click)="deselectAllFields()"></p-button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          @for (field of formFields(); track field.id) {
            <div class="flex items-center">
              <p-checkbox
                [value]="field.fieldName"
                [(ngModel)]="selectedFields"
                [binary]="false"
                [disabled]="field.required"
              />
              <label class="ml-2">{{ field.label }}</label>
            </div>
          }
        </div>
      </div>

      <!-- Date Range -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Date Range (Optional)</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm mb-1">From Date</label>
            <p-datePicker
              [(ngModel)]="dateFrom"
              dateFormat="yy-mm-dd"
              [showIcon]="true"
              [showButtonBar]="true"
            />
          </div>
          <div>
            <label class="block text-sm mb-1">To Date</label>
            <p-datePicker
              [(ngModel)]="dateTo"
              dateFormat="yy-mm-dd"
              [showIcon]="true"
              [showButtonBar]="true"
            />
          </div>
        </div>
        @if (dateValidationError()) {
          <small class="text-red-500 mt-1 block">{{ dateValidationError() }}</small>
        }
      </div>

      <!-- Advanced Filters -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Advanced Filters (Optional)</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm mb-1">Filter Field</label>
            <select class="w-full p-2 border border-gray-300 rounded" [(ngModel)]="filterField">
              <option value="">-- Select Field --</option>
              @for (field of formFields(); track field.id) {
                <option [value]="field.fieldName">{{ field.label }}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-sm mb-1">Filter Value</label>
            <input
              pInputText
              [(ngModel)]="filterValue"
              placeholder="Enter value..."
              class="w-full"
              [disabled]="!filterField()"
            />
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-700">
              <strong>{{ selectedFields().length }}</strong> of {{ formFields().length }} fields
              selected
            </p>
            <p class="text-sm text-gray-700">
              Estimated rows: <strong>{{ estimatedRowCount() }}</strong>
            </p>
          </div>
          @if (estimatedRowCount() > 10000) {
            <p-tag severity="warn" value="Large Export"></p-tag>
          }
        </div>
      </div>

      <!-- Actions -->
      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()"></p-button>
        <p-button
          label="Reset"
          severity="secondary"
          [outlined]="true"
          (onClick)="resetFilters()"
        ></p-button>
        <p-button
          label="Export CSV"
          icon="pi pi-download"
          (onClick)="onExport()"
          [disabled]="selectedFields().length === 0 || !!dateValidationError()"
          [loading]="isExporting()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      ::ng-deep .p-checkbox-label {
        margin-left: 0.5rem;
      }
    `,
  ],
})
export class ExportDialogComponent implements OnInit {
  /** Controls dialog visibility */
  visible = model.required<boolean>();

  /** Form ID to export submissions from */
  formId = input.required<string>();

  /** Form fields for selection */
  formFields = input.required<FormField[]>();

  /** Total submissions count (for preview) */
  totalSubmissions = input.required<number>();

  private readonly formsApiService = inject(FormsApiService);

  /** Selected field names for export */
  selectedFields = signal<string[]>([]);

  /** Start date filter */
  dateFrom = signal<Date | null>(null);

  /** End date filter */
  dateTo = signal<Date | null>(null);

  /** Field name to filter by */
  filterField = signal<string>('');

  /** Value to match for filter field */
  filterValue = signal<string>('');

  /** Export in progress flag */
  isExporting = signal<boolean>(false);

  /**
   * Estimated row count based on filters.
   * In production, this would call an API endpoint to get accurate count.
   */
  estimatedRowCount = computed(() => {
    // For now, use total submissions as estimate
    // TODO: Implement API call to get accurate filtered count
    return this.totalSubmissions();
  });

  /**
   * Date range validation error message
   */
  dateValidationError = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();

    if (from && to && from > to) {
      return 'From date cannot be after To date';
    }

    return null;
  });

  /**
   * Initialize component with all fields selected
   */
  ngOnInit(): void {
    this.selectAllFields();
  }

  /**
   * Selects all form fields for export
   */
  selectAllFields(): void {
    this.selectedFields.set(this.formFields().map((f) => f.fieldName));
  }

  /**
   * Deselects all non-required fields
   */
  deselectAllFields(): void {
    const requiredFields = this.formFields()
      .filter((f) => f.required)
      .map((f) => f.fieldName);
    this.selectedFields.set(requiredFields);
  }

  /**
   * Resets all filters to default values
   */
  resetFilters(): void {
    this.selectAllFields();
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.filterField.set('');
    this.filterValue.set('');
  }

  /**
   * Triggers CSV export with selected filters
   */
  onExport(): void {
    if (this.dateValidationError()) {
      return;
    }

    this.isExporting.set(true);

    const params: any = {
      fields: this.selectedFields().join(','),
    };

    if (this.dateFrom()) {
      params.dateFrom = this.dateFrom()!.toISOString().split('T')[0];
    }

    if (this.dateTo()) {
      params.dateTo = this.dateTo()!.toISOString().split('T')[0];
    }

    if (this.filterField() && this.filterValue()) {
      params.filterField = this.filterField();
      params.filterValue = this.filterValue();
    }

    // Trigger download
    this.formsApiService.exportSubmissions(this.formId(), params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `form-submissions-${this.formId()}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.isExporting.set(false);
        this.visible.set(false);
      },
      error: (error) => {
        console.error('Export failed:', error);
        this.isExporting.set(false);
        // TODO: Show error toast notification
      },
    });
  }

  /**
   * Closes dialog without exporting
   */
  onCancel(): void {
    this.visible.set(false);
  }
}
