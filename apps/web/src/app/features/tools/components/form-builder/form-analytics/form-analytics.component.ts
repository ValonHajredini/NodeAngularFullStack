import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import {
  FormMetadata,
  FormSubmission,
  FormField,
  FormFieldType,
  FieldStatistics,
} from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';
import { ToolConfigService } from '@core/services/tool-config.service';
import { StatisticsEngineService } from './statistics-engine.service';
import { BarChartComponent } from './charts/bar-chart.component';
import { LineChartComponent } from './charts/line-chart.component';
import { PieChartComponent } from './charts/pie-chart.component';
import { StatCardComponent } from './charts/stat-card.component';
import { ExportDialogComponent } from './export-dialog.component';

/**
 * Form analytics component displaying all submissions for a form.
 * Provides tabular view with sorting, filtering, and pagination.
 */
@Component({
  selector: 'app-form-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonDirective,
    Toast,
    DatePipe,
    Dialog,
    Checkbox,
    BarChartComponent,
    LineChartComponent,
    PieChartComponent,
    StatCardComponent,
    ExportDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <!-- Breadcrumb -->
    <div class="bg-gray-100 border-b border-gray-200 px-6 py-2">
      <nav
        class="flex items-center text-sm text-gray-600"
        [class.max-w-7xl]="!isFullWidth()"
        [class.mx-auto]="!isFullWidth()"
      >
        <a routerLink="/app/dashboard" class="hover:text-blue-600 transition-colors">
          <i class="pi pi-home mr-1"></i>
          Dashboard
        </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <a routerLink="/app/tools" class="hover:text-blue-600 transition-colors">Tools</a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <a routerLink="/app/tools/form-builder" class="hover:text-blue-600 transition-colors">
          Form Builder
        </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <span class="text-gray-900 font-medium">Analytics</span>
      </nav>
    </div>

    <!-- Main Content -->
    <div
      class="px-6 py-6 bg-gray-50 min-h-screen"
      [class.w-full]="isFullWidth()"
      [class.max-w-7xl]="!isFullWidth()"
      [class.mx-auto]="!isFullWidth()"
    >
      <!-- Page Header -->
      <div class="mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ formTitle() }} - Analytics</h1>
            <p class="text-gray-600 mt-1">View and analyze form submissions</p>
          </div>
          <div class="flex gap-2">
            <button
              pButton
              label="Export to CSV"
              icon="pi pi-download"
              severity="success"
              [outlined]="true"
              (click)="showExportDialog()"
              [disabled]="submissions().length === 0"
            ></button>
            <button
              pButton
              label="Back to Forms"
              icon="pi pi-arrow-left"
              severity="secondary"
              [outlined]="true"
              (click)="navigateBack()"
            ></button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex justify-center items-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
        </div>
      }

      <!-- Error State -->
      @if (!isLoading() && error()) {
        <div class="bg-white rounded-lg shadow-sm p-12 text-center">
          <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
          <p class="text-gray-600 mb-6">{{ error() }}</p>
          <button
            pButton
            label="Try Again"
            icon="pi pi-refresh"
            (click)="loadFormDetails()"
          ></button>
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && !error() && submissions().length === 0) {
        <div class="bg-white rounded-lg shadow-sm p-12 text-center">
          <i class="pi pi-inbox text-6xl text-gray-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">No submissions yet</h3>
          <p class="text-gray-600 mb-6">
            Submissions will appear here once your form is published and users submit responses
          </p>
          <button
            pButton
            label="Back to Forms"
            icon="pi pi-arrow-left"
            severity="secondary"
            (click)="navigateBack()"
          ></button>
        </div>
      }

      <!-- Submissions Table -->
      @if (!isLoading() && !error() && submissions().length > 0) {
        <div class="bg-white rounded-lg shadow-sm mb-8">
          <p-table
            [value]="submissions()"
            [paginator]="true"
            [rows]="pageSize()"
            [totalRecords]="totalRecords()"
            [lazy]="true"
            [loading]="isLoadingSubmissions()"
            (onLazyLoad)="loadSubmissions($event)"
            [showCurrentPageReport]="true"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} submissions"
            [rowsPerPageOptions]="[10, 25, 50, 100]"
            styleClass="p-datatable-striped"
            [scrollable]="true"
            scrollHeight="600px"
          >
            <!-- Submission Date Column -->
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="submittedAt" style="min-width: 180px">
                  Submitted
                  <p-sortIcon field="submittedAt"></p-sortIcon>
                </th>
                <th style="min-width: 150px">IP Address</th>
                @for (field of formFields(); track field.id) {
                  <th [pSortableColumn]="'values.' + field.fieldName" style="min-width: 200px">
                    {{ field.label }}
                    <p-sortIcon [field]="'values.' + field.fieldName"></p-sortIcon>
                  </th>
                }
              </tr>
            </ng-template>

            <!-- Table Body -->
            <ng-template pTemplate="body" let-submission>
              <tr>
                <td>{{ submission.submittedAt | date: 'MMM dd, yyyy HH:mm' }}</td>
                <td>{{ maskIpAddress(submission.submitterIp) }}</td>
                @for (field of formFields(); track field.id) {
                  <td>{{ formatFieldValue(submission.values[field.fieldName]) }}</td>
                }
              </tr>
            </ng-template>

            <!-- Empty Message -->
            <ng-template pTemplate="emptymessage">
              <tr>
                <td [attr.colspan]="formFields().length + 2" class="text-center py-8">
                  <i class="pi pi-inbox text-4xl text-gray-400 mb-2"></i>
                  <p class="text-gray-600">No submissions found</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <!-- Charts Dashboard Section -->
        <div class="charts-dashboard">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Visual Analytics</h2>
            <button
              pButton
              label="Configure Fields"
              icon="pi pi-cog"
              severity="secondary"
              [outlined]="true"
              (click)="showFieldSelector.set(true)"
            ></button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            @for (stat of fieldStatistics(); track stat.field.id) {
              @if (visibleFieldIds().has(stat.field.id)) {
                <div class="bg-white rounded-lg shadow p-6">
                  @switch (stat.type) {
                    @case ('numeric') {
                      @if (stat.data) {
                        <app-stat-card
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-stat-card>
                      }
                    }
                    @case ('choice') {
                      @if (stat.data) {
                        <app-bar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-bar-chart>
                      }
                    }
                    @case ('timeseries') {
                      @if (stat.data) {
                        <app-line-chart
                          [title]="stat.field.label + ' - Timeline'"
                          [data]="$any(stat.data)"
                        ></app-line-chart>
                      }
                    }
                    @case ('toggle') {
                      @if (stat.data) {
                        <app-pie-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-pie-chart>
                      }
                    }
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    </div>

    <!-- Field Selector Dialog -->
    <p-dialog
      [(visible)]="showFieldSelector"
      header="Configure Visible Fields"
      [modal]="true"
      [style]="{ width: '500px' }"
    >
      <div class="flex flex-col gap-3">
        @for (field of inputFieldsOnly(); track field.id) {
          <div class="flex items-center gap-2">
            <p-checkbox
              [binary]="true"
              [ngModel]="visibleFieldIds().has(field.id)"
              (ngModelChange)="toggleFieldVisibility(field.id)"
              [inputId]="'field-' + field.id"
            ></p-checkbox>
            <label [for]="'field-' + field.id" class="cursor-pointer">{{ field.label }}</label>
          </div>
        }
      </div>
    </p-dialog>

    <!-- Export Dialog -->
    <app-export-dialog
      [(visible)]="exportDialogVisible"
      [formId]="formId()"
      [formFields]="formFields()"
      [totalSubmissions]="totalSubmissions()"
    ></app-export-dialog>

    <!-- Toast -->
    <p-toast position="bottom-right"></p-toast>
  `,
  styles: [
    `
      :host ::ng-deep {
        .p-datatable .p-datatable-thead > tr > th {
          background-color: #f9fafb;
          color: #374151;
          font-weight: 600;
          padding: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .p-datatable .p-datatable-tbody > tr > td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .p-datatable .p-datatable-tbody > tr:hover {
          background-color: #f9fafb;
        }

        .p-paginator {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
        }
      }
    `,
  ],
})
export class FormAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formsApiService = inject(FormsApiService);
  private readonly toolConfigService = inject(ToolConfigService);
  private readonly messageService = inject(MessageService);
  private readonly statisticsEngine = inject(StatisticsEngineService);

  readonly formId = signal<string>('');
  readonly formTitle = signal<string>('');
  readonly formFields = signal<FormField[]>([]);
  readonly submissions = signal<FormSubmission[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingSubmissions = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  private readonly DEFAULT_PAGE_SIZE = 50;
  readonly pageSize = signal<number>(this.DEFAULT_PAGE_SIZE);
  readonly totalRecords = signal<number>(0);
  readonly currentPage = signal<number>(0);

  // Tool configuration
  readonly toolConfig = signal<{ displayMode?: string } | null>(null);
  readonly isFullWidth = computed(() => {
    const config = this.toolConfig();
    return config?.displayMode === 'full-width';
  });

  // Field visibility configuration
  readonly visibleFieldIds = signal<Set<string>>(new Set());
  readonly showFieldSelector = signal<boolean>(false);

  // Export dialog
  readonly exportDialogVisible = signal<boolean>(false);

  // Total submissions for export preview
  readonly totalSubmissions = computed(() => this.totalRecords());

  // Input fields only (excludes display-only fields)
  readonly inputFieldsOnly = computed<FormField[]>(() => {
    const displayOnlyFields = [
      FormFieldType.HEADING,
      FormFieldType.IMAGE,
      FormFieldType.TEXT_BLOCK,
      FormFieldType.DIVIDER,
    ];
    return this.formFields().filter((field) => !displayOnlyFields.includes(field.type));
  });

  // Field statistics computed from submissions
  readonly fieldStatistics = computed<FieldStatistics[]>(() => {
    const submissions = this.submissions();
    const fields = this.formFields();

    if (submissions.length === 0 || fields.length === 0) {
      return [];
    }

    // Filter out display-only fields that don't collect user input
    const displayOnlyFields = [
      FormFieldType.HEADING,
      FormFieldType.IMAGE,
      FormFieldType.TEXT_BLOCK,
      FormFieldType.DIVIDER,
    ];

    return fields
      .filter((field) => !displayOnlyFields.includes(field.type))
      .map((field) => {
        const values = submissions.map((s) => s.values[field.fieldName]);

        switch (field.type) {
          case FormFieldType.NUMBER:
            return {
              field,
              type: 'numeric' as const,
              data: this.statisticsEngine.calculateNumericStats(values as number[]),
            };

          case FormFieldType.SELECT:
          case FormFieldType.RADIO:
            return {
              field,
              type: 'choice' as const,
              data: this.statisticsEngine.calculateChoiceDistribution(
                values as (string | number)[],
                field.options ?? [],
              ),
            };

          case FormFieldType.CHECKBOX:
            return {
              field,
              type: 'choice' as const,
              data: this.statisticsEngine.calculateChoiceDistribution(
                values as (string | number | string[])[],
                field.options ?? [],
              ),
            };

          case FormFieldType.DATE:
          case FormFieldType.DATETIME:
            return {
              field,
              type: 'timeseries' as const,
              data: this.statisticsEngine.generateTimeSeries(
                values.filter((v) => v != null).map((v) => new Date(v as string)),
                'day',
              ),
            };

          case FormFieldType.TOGGLE:
            return {
              field,
              type: 'toggle' as const,
              data: this.statisticsEngine.calculateToggleDistribution(values as boolean[]),
            };

          default:
            return { field, type: 'none' as const, data: null };
        }
      });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Form ID is required');
      return;
    }

    this.formId.set(id);
    this.loadToolConfig();
    this.loadFormDetails();
    this.loadVisibleFieldsPreference();
  }

  /**
   * Loads the tool configuration to determine display mode.
   */
  private loadToolConfig(): void {
    this.toolConfigService.getActiveConfig('form-builder').subscribe({
      next: (config) => {
        this.toolConfig.set(config || null);
      },
      error: (error) => {
        console.error('Failed to load tool configuration:', error);
        this.toolConfig.set(null);
      },
    });
  }

  /**
   * Loads form details including title and schema fields.
   */
  loadFormDetails(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.formsApiService.getFormById(this.formId()).subscribe({
      next: (form: FormMetadata) => {
        this.formTitle.set(form.title);
        this.formFields.set(form.schema?.fields || []);
        this.isLoading.set(false);

        // Load submissions after form details
        this.loadSubmissions({ first: 0, rows: this.pageSize() });
      },
      error: (error) => {
        this.isLoading.set(false);
        const errorMessage = error.error?.message || 'Failed to load form details';
        this.error.set(errorMessage);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: errorMessage,
          life: 3000,
        });
      },
    });
  }

  /**
   * Loads submissions with pagination support.
   * @param event - Lazy load event from PrimeNG table
   */
  loadSubmissions(event?: any): void {
    const page = event ? Math.floor(event.first / event.rows) + 1 : 1;
    const rows = event?.rows || this.pageSize();

    this.isLoadingSubmissions.set(true);
    this.currentPage.set(page - 1);

    this.formsApiService.getSubmissions(this.formId(), page, rows).subscribe({
      next: (response) => {
        this.submissions.set(response.data || []);
        this.totalRecords.set(response.pagination.totalItems);
        this.isLoadingSubmissions.set(false);
      },
      error: (error) => {
        this.isLoadingSubmissions.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load submissions',
          life: 3000,
        });
      },
    });
  }

  /**
   * Masks IP address for privacy (xxx.xxx._._ format).
   * @param ip - IP address to mask
   * @returns Masked IP address
   */
  maskIpAddress(ip: string): string {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}._._`;
    }
    return ip;
  }

  /**
   * Formats field values for display.
   * @param value - Field value to format
   * @returns Formatted string
   */
  formatFieldValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Navigates back to forms list.
   */
  navigateBack(): void {
    this.router.navigate(['/app/tools/form-builder']);
  }

  /**
   * Opens the export dialog for CSV export configuration.
   */
  showExportDialog(): void {
    this.exportDialogVisible.set(true);
  }

  /**
   * Toggles field visibility in the charts dashboard.
   * @param fieldId - Field ID to toggle
   */
  toggleFieldVisibility(fieldId: string): void {
    const visible = new Set(this.visibleFieldIds());
    if (visible.has(fieldId)) {
      visible.delete(fieldId);
    } else {
      visible.add(fieldId);
    }
    this.visibleFieldIds.set(visible);
    this.saveVisibleFieldsPreference();
  }

  /**
   * Loads visible fields preference from localStorage.
   */
  private loadVisibleFieldsPreference(): void {
    const saved = localStorage.getItem(`analytics-visible-fields-${this.formId()}`);
    if (saved) {
      try {
        const fieldIds = JSON.parse(saved);
        this.visibleFieldIds.set(new Set(fieldIds));
      } catch (error) {
        console.error('Failed to parse visible fields preference:', error);
        this.initializeDefaultVisibleFields();
      }
    } else {
      this.initializeDefaultVisibleFields();
    }
  }

  /**
   * Initializes default visible fields (all input fields only).
   */
  private initializeDefaultVisibleFields(): void {
    const inputFieldIds = this.inputFieldsOnly().map((f) => f.id);
    this.visibleFieldIds.set(new Set(inputFieldIds));
  }

  /**
   * Saves visible fields preference to localStorage.
   */
  private saveVisibleFieldsPreference(): void {
    localStorage.setItem(
      `analytics-visible-fields-${this.formId()}`,
      JSON.stringify(Array.from(this.visibleFieldIds())),
    );
  }
}
