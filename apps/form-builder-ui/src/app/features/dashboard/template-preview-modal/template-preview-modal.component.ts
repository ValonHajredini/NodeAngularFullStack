import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { BadgeModule } from 'primeng/badge';
import { FormSchema, FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';
import { FormRendererComponent } from '../../public/form-renderer/form-renderer.component';
import { ThemePreviewService } from '../theme-preview.service';
import { TemplatesApiService } from './templates-api.service';

/**
 * Template Preview Modal Component
 *
 * Displays a preview of a form template using the existing FormRendererComponent.
 * Shows template structure, sample data, and metadata before user selects it.
 *
 * Features:
 * - Fetches template data from API by template ID
 * - Embeds FormRendererComponent in preview mode (disables submission)
 * - Shows template metadata: name, category, description, usage count
 * - Pre-populates fields with sample data for demonstration
 * - Applies theme if template has themeId
 * - Provides "Use This Template" and "Back to Templates" actions
 *
 * @example
 * ```html
 * <app-template-preview-modal
 *   [visible]="showPreview()"
 *   [templateId]="selectedTemplateId()"
 *   (visibleChange)="showPreview.set($event)"
 *   (templateSelected)="handleTemplateSelected($event)"
 *   (closed)="handlePreviewClosed()"
 * />
 * ```
 */
@Component({
  selector: 'app-template-preview-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    MessageModule,
    BadgeModule,
    FormRendererComponent,
  ],
  templateUrl: './template-preview-modal.component.html',
  styleUrls: ['./template-preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatePreviewModalComponent {
  private readonly templatesApiService = inject(TemplatesApiService);
  private readonly themePreviewService = inject(ThemePreviewService);

  // ========== Inputs ==========

  /**
   * Controls dialog visibility (two-way binding supported)
   */
  protected readonly visibleSignal = signal(false);

  @Input()
  set visible(value: boolean) {
    this.visibleSignal.set(value);
    if (value && this.templateIdSignal()) {
      this.fetchTemplate();
    }
  }

  get visible(): boolean {
    return this.visibleSignal();
  }

  /**
   * Template ID to fetch and display
   */
  private readonly templateIdSignal = signal<string>('');

  @Input()
  set templateId(value: string) {
    this.templateIdSignal.set(value);
  }

  get templateId(): string {
    return this.templateIdSignal();
  }

  // ========== Outputs ==========

  /**
   * Emitted when dialog visibility changes (for two-way binding)
   */
  @Output() visibleChange = new EventEmitter<boolean>();

  /**
   * Emitted when user clicks "Use This Template" button
   */
  @Output() templateSelected = new EventEmitter<string>();

  /**
   * Emitted when user closes the preview modal
   */
  @Output() closed = new EventEmitter<void>();

  // ========== Signals ==========

  /**
   * Currently loaded template data
   */
  protected readonly template = signal<FormTemplate | null>(null);

  /**
   * Loading state during template fetch
   */
  protected readonly loading = signal(false);

  /**
   * Error message if template fetch fails
   */
  protected readonly error = signal<string | null>(null);

  // ========== Computed Signals ==========

  /**
   * Whether template data is loaded and ready
   */
  protected readonly hasTemplate = computed(() => !!this.template());

  /**
   * Form schema with sample data populated
   */
  protected readonly formSchemaWithSampleData = computed(() => {
    const tmpl = this.template();
    if (!tmpl) return null;
    return this.populateSampleData(tmpl.templateSchema);
  });

  constructor() {
    // Watch for theme changes and apply when template loads
    effect(() => {
      const tmpl = this.template();
      const themeId = tmpl?.templateSchema?.settings?.themeId;

      if (this.visibleSignal() && themeId) {
        this.loadAndApplyTheme(themeId);
      } else if (this.visibleSignal() && !themeId) {
        // No theme selected - clear theme CSS to use defaults
        this.themePreviewService.clearThemeCss();
      }
    });
  }

  // ========== Methods ==========

  /**
   * Fetches template data from API
   * @private
   */
  private fetchTemplate(): void {
    const id = this.templateIdSignal();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.templatesApiService.getTemplateById(id).subscribe({
      next: (response) => {
        this.template.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load template:', err);
        const errorMessage =
          err.status === 404
            ? 'Template not found. It may have been removed.'
            : 'Unable to load template preview. Please try again.';
        this.error.set(errorMessage);
        this.loading.set(false);
      },
    });
  }

  /**
   * Loads theme from API and applies CSS variables
   * @param themeId - The ID of the theme to load
   * @private
   */
  private loadAndApplyTheme(themeId: string): void {
    // Note: This assumes ThemePreviewService has applyThemeById method
    // For now, we'll skip theme loading if not implemented
    // TODO: Implement theme loading when ThemePreviewService is ready
    console.log('Theme loading skipped for now:', themeId);
  }

  /**
   * Populates form schema with sample/placeholder data
   * @param schema - Original form schema
   * @returns Schema with sample data in defaultValue fields
   * @private
   */
  private populateSampleData(schema: FormSchema): FormSchema {
    // Sample data mapping for common field names
    const sampleDataMap: Record<string, any> = {
      product_name: 'Premium Wireless Headphones',
      product_description: 'High-quality wireless headphones with noise cancellation',
      quantity: 1,
      customer_name: 'John Doe',
      customer_email: 'john.doe@example.com',
      customer_phone: '(555) 123-4567',
      delivery_address: '123 Main Street, City, State 12345',
      appointment_date: new Date().toISOString().split('T')[0],
      time_slot: '10:00 AM - 11:00 AM',
      quiz_question_1: 'Option A',
      poll_option: 'Option 1',
      event_name: 'Annual Conference 2025',
      event_date: '2025-02-15',
      attendees: 2,
      meal_preference: 'Vegetarian',
    };

    return {
      ...schema,
      fields: schema.fields.map((field) => ({
        ...field,
        defaultValue: sampleDataMap[field.fieldName] || `Sample ${field.label}`,
      })),
    };
  }

  /**
   * Returns category icon class based on template category
   * @param category - Template category
   * @returns PrimeIcons class name
   */
  protected getCategoryIcon(category?: TemplateCategory): string {
    switch (category) {
      case TemplateCategory.ECOMMERCE:
        return 'pi pi-shopping-cart';
      case TemplateCategory.SERVICES:
        return 'pi pi-calendar';
      case TemplateCategory.DATA_COLLECTION:
        return 'pi pi-database';
      case TemplateCategory.EVENTS:
        return 'pi pi-ticket';
      case TemplateCategory.QUIZ:
        return 'pi pi-question-circle';
      case TemplateCategory.POLLS:
        return 'pi pi-chart-bar';
      default:
        return 'pi pi-file';
    }
  }

  /**
   * Handles retry button click in error state
   */
  protected handleRetry(): void {
    this.error.set(null);
    this.fetchTemplate();
  }

  /**
   * Handles "Use This Template" button click
   */
  protected handleUseTemplateClick(): void {
    const id = this.templateIdSignal();
    if (id) {
      this.templateSelected.emit(id);
      this.handleVisibilityChange(false);
    }
  }

  /**
   * Handles "Back to Templates" button click
   */
  protected handleBackClick(): void {
    this.closed.emit();
    this.handleVisibilityChange(false);
  }

  /**
   * Handles dialog visibility changes
   */
  protected handleVisibilityChange(visible: boolean): void {
    this.visibleSignal.set(visible);
    this.visibleChange.emit(visible);
  }

  /**
   * Handles dialog hide event (backdrop click or ESC key)
   */
  protected handleDialogHide(): void {
    this.closed.emit();
  }
}
