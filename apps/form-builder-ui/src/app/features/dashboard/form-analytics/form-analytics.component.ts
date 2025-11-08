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
  ChartType,
  ChartTypeOption,
} from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';
// REMOVED: ToolConfigService not needed in form-builder-ui (tool config is for dashboard-api)
import { StatisticsEngineService } from './statistics-engine.service';
import { ChartPreferenceService } from './chart-preference.service';
import { BarChartComponent } from './charts/bar-chart.component';
import { LineChartComponent } from './charts/line-chart.component';
import { PieChartComponent } from './charts/pie-chart.component';
import { StatCardComponent } from './charts/stat-card.component';
import { PolarChartComponent } from './charts/polar-chart.component';
import { RadarChartComponent } from './charts/radar-chart.component';
import { AreaChartComponent } from './charts/area-chart.component';
import { DoughnutChartComponent } from './charts/doughnut-chart.component';
import { HorizontalBarChartComponent } from './charts/horizontal-bar-chart.component';
import { ExportDialogComponent } from './export-dialog.component';

/**
 * Chart type compatibility matrix defining which chart types work with which data types.
 * Used to filter chart type options based on field data type.
 */
const CHART_TYPE_COMPATIBILITY: Record<string, ChartType[]> = {
  numeric: ['stat', 'bar', 'line', 'area'],
  choice: ['bar', 'pie', 'doughnut', 'polar', 'radar', 'horizontal-bar'],
  timeseries: ['line', 'area', 'bar'],
  toggle: ['pie', 'doughnut', 'polar', 'bar'],
};

/**
 * Default chart types for each data type.
 * Used as fallback when no user preference exists.
 */
const DEFAULT_CHART_TYPES: Record<string, ChartType> = {
  numeric: 'stat',
  choice: 'bar',
  timeseries: 'line',
  toggle: 'pie',
};

/**
 * All available chart type options with labels and icons.
 * Used to populate chart type selector dropdown.
 */
const ALL_CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  { value: 'bar', label: 'Bar Chart', icon: 'pi pi-chart-bar' },
  { value: 'line', label: 'Line Chart', icon: 'pi pi-chart-line' },
  { value: 'pie', label: 'Pie Chart', icon: 'pi pi-chart-pie' },
  { value: 'polar', label: 'Polar Chart', icon: 'pi pi-circle' },
  { value: 'radar', label: 'Radar Chart', icon: 'pi pi-star' },
  { value: 'area', label: 'Area Chart', icon: 'pi pi-wave' },
  { value: 'doughnut', label: 'Doughnut Chart', icon: 'pi pi-circle-off' },
  { value: 'horizontal-bar', label: 'Horizontal Bar', icon: 'pi pi-align-left' },
  { value: 'stat', label: 'Stat Card', icon: 'pi pi-calculator' },
];

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
    PolarChartComponent,
    RadarChartComponent,
    AreaChartComponent,
    DoughnutChartComponent,
    HorizontalBarChartComponent,
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
        <a routerLink="/app/dashboard" class="hover:text-blue-600 transition-colors flex items-center">
          <i class="pi pi-home mr-1"></i>
          Dashboard
        </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <a [routerLink]="['/app/dashboard/forms']" class="hover:text-blue-600 transition-colors">
          My Forms
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
                @for (field of inputFieldsOnly(); track field.id) {
                  @if (field.type === FormFieldType.IMAGE_GALLERY) {
                    <!-- IMAGE_GALLERY: Two separate columns -->
                    <th [pSortableColumn]="'values.' + field.fieldName" style="min-width: 120px">
                      {{ field.label }} (Value)
                      <p-sortIcon [field]="'values.' + field.fieldName"></p-sortIcon>
                    </th>
                    <th style="min-width: 120px">{{ field.label }} (Image)</th>
                  } @else {
                    <!-- Other field types: Single column -->
                    <th [pSortableColumn]="'values.' + field.fieldName" style="min-width: 200px">
                      {{ field.label }}
                      <p-sortIcon [field]="'values.' + field.fieldName"></p-sortIcon>
                    </th>
                  }
                }
              </tr>
            </ng-template>

            <!-- Table Body -->
            <ng-template pTemplate="body" let-submission>
              <tr>
                <td>{{ submission.submittedAt | date: 'MMM dd, yyyy HH:mm' }}</td>
                <td>{{ maskIpAddress(submission.submitterIp) }}</td>
                @for (field of inputFieldsOnly(); track field.id) {
                  @if (field.type === FormFieldType.IMAGE_GALLERY) {
                    <!-- IMAGE_GALLERY: Value column -->
                    <td class="text-center">
                      @if (submission.values[field.fieldName]) {
                        <span class="font-semibold text-gray-700 text-lg">{{
                          submission.values[field.fieldName]
                        }}</span>
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                    <!-- IMAGE_GALLERY: Image column -->
                    <td class="text-center">
                      @if (getImageThumbnailUrl(field, submission.values[field.fieldName])) {
                        <img
                          [src]="getImageThumbnailUrl(field, submission.values[field.fieldName])"
                          [alt]="'Selected image ' + submission.values[field.fieldName]"
                          class="w-16 h-16 object-cover rounded border border-gray-300 mx-auto"
                          loading="lazy"
                        />
                      } @else {
                        <span class="text-gray-400">-</span>
                      }
                    </td>
                  } @else {
                    <!-- Other field types: Standard text formatting -->
                    <td>
                      {{ formatFieldValue(submission.values[field.fieldName]) }}
                    </td>
                  }
                }
              </tr>
            </ng-template>

            <!-- Empty Message -->
            <ng-template pTemplate="emptymessage">
              <tr>
                <td [attr.colspan]="getTotalColumnCount()" class="text-center py-8">
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
                  <!-- Field card header with chart type selector -->
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">{{ stat.field.label }}</h3>
                    <select
                      [ngModel]="stat.chartType"
                      (ngModelChange)="onChartTypeChange(stat.field.id, $event)"
                      [attr.aria-label]="'Select chart type for ' + stat.field.label"
                      class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      @for (option of getAvailableChartTypes(stat); track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  </div>

                  <!-- Dynamic chart rendering based on selected chart type -->
                  @if (stat.data) {
                    @switch (stat.chartType) {
                      @case ('bar') {
                        <app-bar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-bar-chart>
                      }
                      @case ('line') {
                        <app-line-chart
                          [title]="stat.field.label + ' - Timeline'"
                          [data]="$any(stat.data)"
                        ></app-line-chart>
                      }
                      @case ('pie') {
                        <app-pie-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-pie-chart>
                      }
                      @case ('polar') {
                        <app-polar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-polar-chart>
                      }
                      @case ('radar') {
                        <app-radar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-radar-chart>
                      }
                      @case ('area') {
                        <app-area-chart
                          [title]="stat.field.label + ' - Timeline'"
                          [data]="$any(stat.data)"
                        ></app-area-chart>
                      }
                      @case ('doughnut') {
                        <app-doughnut-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-doughnut-chart>
                      }
                      @case ('horizontal-bar') {
                        <app-horizontal-bar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-horizontal-bar-chart>
                      }
                      @case ('stat') {
                        <app-stat-card
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-stat-card>
                      }
                      @default {
                        <!-- Fallback to bar chart for unknown types -->
                        <app-bar-chart
                          [title]="stat.field.label"
                          [data]="$any(stat.data)"
                        ></app-bar-chart>
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
      [formFields]="inputFieldsOnly()"
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
  // REMOVED: toolConfigService not needed in form-builder-ui
  private readonly messageService = inject(MessageService);
  private readonly statisticsEngine = inject(StatisticsEngineService);
  private readonly chartPreferenceService = inject(ChartPreferenceService);

  // Expose FormFieldType enum to template
  protected readonly FormFieldType = FormFieldType;

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

  // REMOVED: toolConfig signal - not needed in form-builder-ui
  // Form-builder-ui always uses standard layout (not full-width)
  readonly isFullWidth = computed(() => false);

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
    const formId = this.formId();

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
        let type: 'numeric' | 'choice' | 'timeseries' | 'toggle' | 'none';
        let data: any;

        // Determine data type and calculate statistics
        switch (field.type) {
          case FormFieldType.NUMBER:
            type = 'numeric';
            data = this.statisticsEngine.calculateNumericStats(values as number[]);
            break;

          case FormFieldType.SELECT:
          case FormFieldType.RADIO:
            type = 'choice';
            data = this.statisticsEngine.calculateChoiceDistribution(
              values as (string | number)[],
              field.options ?? [],
            );
            break;

          case FormFieldType.CHECKBOX:
            type = 'choice';
            data = this.statisticsEngine.calculateChoiceDistribution(
              values as (string | number | string[])[],
              field.options ?? [],
            );
            break;

          case FormFieldType.IMAGE_GALLERY:
            type = 'choice';
            // Generate options dynamically from metadata images
            const metadata = field.metadata as any;
            const imageOptions =
              metadata?.images?.map((img: any, index: number) => ({
                value: (index + 1).toString(), // 1-based index
                label: img.alt || `Image ${index + 1}`,
              })) || [];
            data = this.statisticsEngine.calculateChoiceDistribution(
              values as (string | number)[],
              imageOptions,
            );
            break;

          case FormFieldType.DATE:
          case FormFieldType.DATETIME:
            type = 'timeseries';
            data = this.statisticsEngine.generateTimeSeries(
              values.filter((v) => v != null).map((v) => new Date(v as string)),
              'day',
            );
            break;

          case FormFieldType.TOGGLE:
            type = 'toggle';
            data = this.statisticsEngine.calculateToggleDistribution(values as boolean[]);
            break;

          default:
            type = 'none';
            data = null;
        }

        // Determine chart type based on preference or default
        let chartType: ChartType;
        const savedPreference = this.chartPreferenceService.getChartType(formId, field.id);

        if (savedPreference && this.isCompatibleChartType(type, savedPreference)) {
          // Use saved preference if compatible
          chartType = savedPreference;
        } else {
          // Fall back to default chart type for data type
          chartType = DEFAULT_CHART_TYPES[type] || 'bar';
        }

        return { field, type, data, chartType };
      });
  });

  /**
   * Check if a chart type is compatible with a data type.
   * @param dataType - Field data type (numeric, choice, timeseries, toggle, none)
   * @param chartType - Chart type to validate
   * @returns True if compatible, false otherwise
   */
  private isCompatibleChartType(dataType: string, chartType: ChartType): boolean {
    return CHART_TYPE_COMPATIBILITY[dataType]?.includes(chartType) ?? false;
  }

  /**
   * Get available chart types for a field based on its data type.
   * Filters ALL_CHART_TYPE_OPTIONS to show only compatible types.
   * @param stat - Field statistics containing data type
   * @returns Array of compatible chart type options
   */
  getAvailableChartTypes(stat: FieldStatistics): ChartTypeOption[] {
    const compatibleTypes = CHART_TYPE_COMPATIBILITY[stat.type] || [];
    return ALL_CHART_TYPE_OPTIONS.filter((option) => compatibleTypes.includes(option.value));
  }

  /**
   * Handles chart type selection change for a field.
   * Saves preference to localStorage and triggers fieldStatistics re-computation.
   * @param fieldId - Field identifier
   * @param chartType - New chart type selection
   */
  onChartTypeChange(fieldId: string, chartType: ChartType): void {
    try {
      this.chartPreferenceService.setChartType(this.formId(), fieldId, chartType);
      // Trigger re-computation of fieldStatistics by updating submissions signal
      // This forces the computed signal to re-evaluate and pick up new preference
      const currentSubmissions = this.submissions();
      this.submissions.set([...currentSubmissions]);
    } catch (error) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Preference Not Saved',
        detail:
          'Unable to save chart preference. Your browser storage may be full. The chart will still update for this session.',
        life: 5000,
      });
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Form ID is required');
      return;
    }

    this.formId.set(id);
    // REMOVED: loadToolConfig() - not needed in form-builder-ui
    this.loadFormDetails();
    this.loadVisibleFieldsPreference();
  }

  // REMOVED: loadToolConfig() method - form-builder-ui doesn't need dynamic display mode config

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
   * Gets thumbnail URL for IMAGE_GALLERY field based on stored index.
   * @param field - FormField with IMAGE_GALLERY type
   * @param indexValue - Stored 1-based index as string (e.g., "1", "2", "3")
   * @returns Image URL or null if not found
   */
  getImageThumbnailUrl(field: FormField, indexValue: string): string | null {
    if (!indexValue || field.type !== FormFieldType.IMAGE_GALLERY) {
      return null;
    }

    const metadata = field.metadata as any;
    if (!metadata?.images || metadata.images.length === 0) {
      return null;
    }

    // Convert 1-based index to 0-based array index
    const arrayIndex = parseInt(indexValue, 10) - 1;

    if (arrayIndex >= 0 && arrayIndex < metadata.images.length) {
      return metadata.images[arrayIndex].url;
    }

    return null;
  }

  /**
   * Calculates total number of table columns for colspan.
   * IMAGE_GALLERY fields use 2 columns (value + image), other fields use 1 column.
   * Always adds 2 for Submitted and IP Address columns.
   * @returns Total column count
   */
  getTotalColumnCount(): number {
    const fields = this.inputFieldsOnly();
    let count = 2; // Submitted + IP Address

    fields.forEach((field) => {
      if (field.type === FormFieldType.IMAGE_GALLERY) {
        count += 2; // Value + Image columns
      } else {
        count += 1; // Single column
      }
    });

    return count;
  }

  /**
   * Navigates back to forms list.
   */
  navigateBack(): void {
    this.router.navigate(['/app/dashboard']);
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
