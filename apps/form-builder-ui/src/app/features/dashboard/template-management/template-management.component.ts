import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Toast } from 'primeng/toast';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Message } from 'primeng/message';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';
import { TemplatesApiService } from '../templates-api.service';
import { TemplateEditorDialogComponent } from '../template-editor/template-editor-dialog.component';

/**
 * Dropdown option interface for PrimeNG dropdowns
 */
interface DropdownOption {
  label: string;
  value: string;
}

/**
 * Admin page for managing form templates.
 *
 * Allows administrators to:
 * - View all form templates in a paginated, sortable data table
 * - Filter templates by category, active status, and search query
 * - Create new templates using the template editor dialog
 * - Edit existing templates
 * - Delete templates (soft delete with confirmation)
 * - Preview templates in the template preview modal
 * - Toggle template active/inactive status
 * - View usage statistics for each template
 *
 * **Access Control:**
 * - Route protected by admin auth guard
 * - Only users with 'admin' role can access this page
 *
 * **Features:**
 * - Client-side filtering via computed signals (no server-side filtering)
 * - Optimistic UI updates for toggle operations
 * - Confirmation dialogs for destructive actions (delete)
 * - Toast notifications for success/error feedback
 * - Pagination (20 rows per page default)
 * - Sorting by name, category, usage count, created date
 *
 * @example
 * ```typescript
 * // Route configuration
 * {
 *   path: 'templates',
 *   component: TemplateManagementComponent,
 *   canActivate: [authGuard, roleGuard(['admin'])]
 * }
 * ```
 */
@Component({
  selector: 'app-template-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonDirective,
    ToggleSwitch,
    Select,
    InputText,
    IconField,
    InputIcon,
    Toast,
    ConfirmDialog,
    ProgressSpinner,
    Message,
    Tooltip,
    TemplateEditorDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-management.component.html',
  styleUrls: ['./template-management.component.scss'],
})
export class TemplateManagementComponent implements OnInit {
  private readonly templatesApiService = inject(TemplatesApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // State
  protected readonly templates = signal<FormTemplate[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  // Filters
  protected selectedCategory = signal<string>('all');
  protected selectedStatus = signal<string>('all');
  protected searchQuery = signal<string>('');

  // UI state for editor and preview modals
  // Note: Template editor and preview modal components to be integrated in Story 29.10 and 29.7
  protected readonly showEditor = signal(false);
  protected readonly editorMode = signal<'create' | 'edit'>('create');
  protected readonly selectedTemplateId = signal<string | null>(null);
  protected readonly showPreview = signal(false);
  protected readonly previewTemplateId = signal<string | null>(null);

  // Dropdown options
  protected readonly categoryOptions: DropdownOption[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'E-commerce', value: TemplateCategory.ECOMMERCE },
    { label: 'Services', value: TemplateCategory.SERVICES },
    { label: 'Data Collection', value: TemplateCategory.DATA_COLLECTION },
    { label: 'Events', value: TemplateCategory.EVENTS },
    { label: 'Quiz', value: TemplateCategory.QUIZ },
    { label: 'Polls', value: TemplateCategory.POLLS },
  ];

  protected readonly statusOptions: DropdownOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  /**
   * Computed signal that filters templates based on category, status, and search query.
   * Filters are applied client-side for better performance with small-to-medium datasets.
   *
   * @returns Filtered array of FormTemplate objects
   */
  protected readonly filteredTemplates = computed(() => {
    let filtered = this.templates();

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter((t) => t.category === this.selectedCategory());
    }

    // Filter by status
    if (this.selectedStatus() === 'active') {
      filtered = filtered.filter((t) => t.isActive);
    } else if (this.selectedStatus() === 'inactive') {
      filtered = filtered.filter((t) => !t.isActive);
    }

    // Filter by search query (case-insensitive, searches name and description)
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query),
      );
    }

    return filtered;
  });

  /**
   * Initialize component and fetch templates on load.
   */
  ngOnInit(): void {
    this.fetchTemplates();
  }

  /**
   * Fetch all templates from the API.
   * Updates loading, error, and templates signals.
   *
   * @private
   */
  private fetchTemplates(): void {
    this.loading.set(true);
    this.error.set(null);

    this.templatesApiService.getAllTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load templates');
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load templates. Please try again.',
          life: 5000,
        });
      },
    });
  }

  /**
   * Handle "Create Template" button click.
   * Opens the template editor dialog in create mode.
   */
  protected handleCreateTemplate(): void {
    this.editorMode.set('create');
    this.selectedTemplateId.set(null);
    this.showEditor.set(true);
  }

  /**
   * Handle "Edit" button click for a specific template.
   * Opens the template editor dialog in edit mode with template data.
   *
   * @param template - The template to edit
   */
  protected handleEdit(template: FormTemplate): void {
    this.editorMode.set('edit');
    this.selectedTemplateId.set(template.id);
    this.showEditor.set(true);
  }

  /**
   * Handle "Delete" button click for a specific template.
   * Shows confirmation dialog before deleting.
   * Soft deletes the template (sets isActive to false).
   *
   * @param template - The template to delete
   */
  protected handleDelete(template: FormTemplate): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteTemplate(template.id);
      },
    });
  }

  /**
   * Delete a template by ID.
   * Removes template from list and shows success/error toast.
   *
   * @param id - Template UUID
   * @private
   */
  private deleteTemplate(id: string): void {
    this.templatesApiService.deleteTemplate(id).subscribe({
      next: () => {
        // Remove from list
        this.templates.update((list) => list.filter((t) => t.id !== id));

        // Show success toast
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Template deleted successfully',
          life: 3000,
        });
      },
      error: (_error: Error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete template. Please try again.',
          life: 5000,
        });
      },
    });
  }

  /**
   * Handle active/inactive toggle change for a template.
   * Uses optimistic UI update - immediately changes UI, then calls API.
   * Reverts on error.
   *
   * @param template - The template to toggle
   */
  protected handleToggleActive(template: FormTemplate): void {
    const previousState = template.isActive;

    // Optimistic update (immediate UI change)
    template.isActive = !previousState;

    // Call API
    this.templatesApiService
      .updateTemplate(template.id, { isActive: template.isActive })
      .subscribe({
        next: () => {
          // Success - already updated in UI
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Template ${template.isActive ? 'activated' : 'deactivated'}`,
            life: 2000,
          });
        },
        error: (_error: Error) => {
          // Revert on error
          template.isActive = previousState;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update template status',
            life: 5000,
          });
        },
      });
  }

  /**
   * Handle "Preview" button click for a specific template.
   * Opens the template preview modal.
   *
   * @param template - The template to preview
   *
   * Note: Template preview modal component to be integrated (reused from Story 29.7).
   */
  protected handlePreview(template: FormTemplate): void {
    // TODO: Integrate with TemplatePreviewModal component (Story 29.7)
    this.previewTemplateId.set(template.id);
    this.showPreview.set(true);
    // Temporary message until preview modal is integrated
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'Template preview will be integrated from Story 29.7',
      life: 3000,
    });
  }

  /**
   * Handle editor save event.
   * Refreshes the templates list after save.
   *
   * Called when template editor emits save event.
   */
  protected handleEditorSave(): void {
    this.showEditor.set(false);
    this.fetchTemplates();
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Template ${this.editorMode() === 'create' ? 'created' : 'updated'} successfully`,
      life: 3000,
    });
  }

  /**
   * Handle retry button click when error occurs.
   * Re-fetches templates from API.
   */
  protected handleRetry(): void {
    this.fetchTemplates();
  }

  /**
   * Format usage count with thousand separators.
   *
   * @param count - Usage count number
   * @returns Formatted string (e.g., "1,234")
   */
  protected formatUsageCount(count: number): string {
    return count.toLocaleString();
  }

  /**
   * Get display label for template category.
   *
   * @param category - Template category enum value
   * @returns Human-readable category label
   */
  protected getCategoryLabel(category: TemplateCategory): string {
    const option = this.categoryOptions.find((opt) => opt.value === category);
    return option ? option.label : category;
  }

  /**
   * Truncate description text for table display.
   *
   * @param description - Full description text
   * @param maxLength - Maximum length before truncation (default: 100)
   * @returns Truncated description with ellipsis if needed
   */
  protected truncateDescription(description: string | undefined, maxLength = 100): string {
    if (description === undefined || description === null || description === '') {
      return '';
    }
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }
}
