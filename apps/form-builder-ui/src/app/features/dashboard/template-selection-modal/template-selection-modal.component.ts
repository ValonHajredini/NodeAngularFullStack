import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  Input,
  Output,
  EventEmitter,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { Skeleton } from 'primeng/skeleton';
import { Message } from 'primeng/message';
import { FormTemplate, TemplateCategory, FormSchema } from '@nodeangularfullstack/shared';
import { TemplateCardComponent } from './template-card.component';
import { TemplatePreviewModalComponent } from '../template-preview-modal/template-preview-modal.component';

/**
 * Interface representing a template category with metadata for display
 */
interface CategoryData {
  /** Category enumeration value */
  category: TemplateCategory;
  /** Display name for the category */
  name: string;
  /** PrimeIcon class name for the category icon */
  icon: string;
  /** Number of templates in this category */
  count: number;
}

/**
 * Template Selection Modal Component
 *
 * A modal dialog that allows users to browse and select form templates when creating a new form.
 * Features:
 * - Categorized template browsing with 6 main categories
 * - Search and filter functionality with debouncing
 * - "Start Blank" option for creating forms from scratch
 * - Responsive grid layout adapting to different screen sizes
 * - Loading and error states with appropriate UI feedback
 * - Keyboard navigation and WCAG AA accessibility compliance
 *
 * Integration:
 * - Opens from FormsListComponent "Create New Form" button
 * - Navigates to form builder with or without template selection
 * - Uses signal-based state management for reactive updates
 *
 * @example
 * ```html
 * <app-template-selection-modal
 *   [(visible)]="showTemplateModal"
 *   (templateSelected)="handleTemplateSelection($event)"
 *   (startBlank)="handleStartBlank()"
 * />
 * ```
 */
@Component({
  selector: 'app-template-selection-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    Dialog,
    ButtonDirective,
    InputText,
    IconField,
    InputIcon,
    Skeleton,
    Message,
    TemplateCardComponent,
    TemplatePreviewModalComponent,
  ],
  template: `
    <p-dialog
      [(visible)]="visibleSignal"
      (visibleChange)="handleVisibilityChange($event)"
      (onHide)="handleDialogHide()"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '90vw', maxWidth: '1200px' }"
      [breakpoints]="{ '1024px': '90vw', '768px': '100vw', '0px': '100vw' }"
      [header]="'Choose a Template'"
      styleClass="template-selection-dialog"
    >
      <div class="template-selection-container">
        <!-- Search Bar -->
        <div class="mb-6">
          <p-iconfield iconPosition="left" class="w-full">
            <p-inputicon styleClass="pi pi-search"></p-inputicon>
            <input
              pInputText
              [(ngModel)]="searchQueryModel"
              placeholder="Search templates by name..."
              class="w-full"
              (input)="onSearchInput($event)"
              [attr.aria-label]="'Search templates'"
            />
          </p-iconfield>
          @if (searchQuery()) {
            <button
              pButton
              icon="pi pi-times"
              severity="secondary"
              [outlined]="true"
              (click)="clearSearch()"
              class="mt-2"
              [attr.aria-label]="'Clear search'"
            >
              Clear Search
            </button>
          }
        </div>

        <!-- Error State -->
        @if (error()) {
          <div class="mb-6">
            <p-message severity="error" [text]="error()!" styleClass="w-full" />
            <button
              pButton
              label="Retry"
              icon="pi pi-refresh"
              (click)="retryLoadTemplates()"
              class="mt-3"
            ></button>
          </div>
        }

        <!-- Start Blank Option (Always visible) -->
        <div class="mb-6">
          <div
            class="start-blank-card p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer"
            (click)="handleStartBlank()"
            (keydown.enter)="handleStartBlank()"
            tabindex="0"
            role="button"
            [attr.aria-label]="'Start with a blank form'"
          >
            <div class="flex items-center justify-center">
              <i class="pi pi-plus-circle text-5xl text-gray-400 mr-4"></i>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-1">Start Blank</h3>
                <p class="text-gray-600">Create a form from scratch without a template</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (loading()) {
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Browse Templates</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (item of [1, 2, 3, 4, 5, 6]; track item) {
                <div class="p-4 border border-gray-200 rounded-lg">
                  <p-skeleton width="100%" height="150px" styleClass="mb-3" />
                  <p-skeleton width="70%" height="1.5rem" styleClass="mb-2" />
                  <p-skeleton width="100%" height="1rem" styleClass="mb-2" />
                  <p-skeleton width="100%" height="1rem" />
                </div>
              }
            </div>
          </div>
        }

        <!-- Categories and Templates (when not loading and no error) -->
        @if (!loading() && !error()) {
          <div class="space-y-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h3>

            <!-- No Search Results -->
            @if (searchQuery() && filteredCategories().length === 0) {
              <div class="text-center py-12">
                <i class="pi pi-search text-6xl text-gray-400 mb-4"></i>
                <h4 class="text-xl font-semibold text-gray-900 mb-2">No templates found</h4>
                <p class="text-gray-600">
                  No templates match your search "{{ searchQuery() }}". Try a different search term.
                </p>
              </div>
            }

            <!-- Category Grid -->
            @if (filteredCategories().length > 0) {
              <div class="space-y-6">
                @for (categoryData of filteredCategories(); track categoryData.category) {
                  <div class="category-section">
                    <!-- Category Header Card -->
                    <div
                      class="category-card p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer"
                      (click)="toggleCategory(categoryData.category)"
                      (keydown.enter)="toggleCategory(categoryData.category)"
                      tabindex="0"
                      role="button"
                      [attr.aria-expanded]="selectedCategory() === categoryData.category"
                      [attr.aria-label]="'Browse ' + categoryData.name + ' templates'"
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center">
                          <i [class]="'pi ' + categoryData.icon + ' text-3xl text-blue-600 mr-4'"></i>
                          <div>
                            <h4 class="text-lg font-semibold text-gray-900">
                              {{ categoryData.name }}
                            </h4>
                            <p class="text-sm text-gray-600">
                              {{ categoryData.count }} template{{
                                categoryData.count !== 1 ? 's' : ''
                              }}
                            </p>
                          </div>
                        </div>
                        <i
                          [class]="
                            selectedCategory() === categoryData.category
                              ? 'pi pi-chevron-up'
                              : 'pi pi-chevron-down'
                          "
                          class="text-gray-400"
                        ></i>
                      </div>
                    </div>

                    <!-- Template Grid (Expanded when category selected) -->
                    @if (selectedCategory() === categoryData.category) {
                      <div class="template-grid mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        @for (
                          template of getTemplatesByCategory(categoryData.category);
                          track template.id
                        ) {
                          <app-template-card
                            [template]="template"
                            (preview)="handlePreviewTemplate(template)"
                            (useTemplate)="handleUseTemplate(template)"
                          />
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </p-dialog>

    <!-- Template Preview Modal -->
    <app-template-preview-modal
      [(visible)]="showPreviewSignal"
      [templateId]="selectedTemplateIdForPreview()"
      (templateSelected)="handleTemplateSelectedFromPreview($event)"
      (closed)="handlePreviewClosed()"
    />
  `,
  styles: [
    `
      .template-selection-container {
        min-height: 400px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .start-blank-card {
        min-height: 120px;
      }

      .category-card {
        user-select: none;
      }

      .template-grid {
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Focus indicators for accessibility */
      .start-blank-card:focus,
      .category-card:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Ensure touch targets are 44x44px minimum (WCAG AA) */
      button,
      .category-card,
      .start-blank-card {
        min-height: 44px;
      }
    `,
  ],
})
export class TemplateSelectionModalComponent implements OnInit {
  private readonly router = inject(Router);

  /** Input/Output for dialog visibility */
  @Input() set visible(value: boolean) {
    this.visibleSignal.set(value);
  }
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Event emitted when user selects a template */
  @Output() templateSelected = new EventEmitter<FormTemplate>();

  /** Event emitted when user chooses to start with a blank form */
  @Output() startBlank = new EventEmitter<void>();

  /** Internal signal for dialog visibility */
  protected readonly visibleSignal = signal<boolean>(false);

  /** Signal for loading state */
  protected readonly loading = signal<boolean>(false);

  /** Signal for error messages */
  protected readonly error = signal<string | null>(null);

  /** Signal for search query */
  protected readonly searchQuery = signal<string>('');

  /** NgModel for search input (required for two-way binding) */
  protected searchQueryModel = '';

  /** Signal for currently selected/expanded category */
  protected readonly selectedCategory = signal<TemplateCategory | null>(null);

  /** Signal containing all templates (mock data for now) */
  protected readonly templates = signal<FormTemplate[]>([]);

  /** Signal for preview modal visibility */
  protected readonly showPreviewSignal = signal<boolean>(false);

  /** Signal for template ID being previewed */
  protected readonly selectedTemplateIdForPreview = signal<string>('');

  /** Computed signal for filtered templates based on search */
  protected readonly filteredTemplates = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.templates();
    }
    return this.templates().filter((template) =>
      template.name.toLowerCase().includes(query)
    );
  });

  /** Computed signal for category data with counts */
  protected readonly categories = computed<CategoryData[]>(() => {
    const templates = this.filteredTemplates();
    return [
      {
        category: TemplateCategory.ECOMMERCE,
        name: 'E-commerce',
        icon: 'pi-shopping-cart',
        count: templates.filter((t) => t.category === TemplateCategory.ECOMMERCE).length,
      },
      {
        category: TemplateCategory.SERVICES,
        name: 'Services',
        icon: 'pi-briefcase',
        count: templates.filter((t) => t.category === TemplateCategory.SERVICES).length,
      },
      {
        category: TemplateCategory.DATA_COLLECTION,
        name: 'Data Collection',
        icon: 'pi-database',
        count: templates.filter((t) => t.category === TemplateCategory.DATA_COLLECTION).length,
      },
      {
        category: TemplateCategory.EVENTS,
        name: 'Events',
        icon: 'pi-calendar',
        count: templates.filter((t) => t.category === TemplateCategory.EVENTS).length,
      },
      {
        category: TemplateCategory.QUIZ,
        name: 'Quiz',
        icon: 'pi-book',
        count: templates.filter((t) => t.category === TemplateCategory.QUIZ).length,
      },
      {
        category: TemplateCategory.POLLS,
        name: 'Polls',
        icon: 'pi-chart-bar',
        count: templates.filter((t) => t.category === TemplateCategory.POLLS).length,
      },
    ];
  });

  /** Computed signal for filtered categories (those with templates matching search) */
  protected readonly filteredCategories = computed<CategoryData[]>(() => {
    return this.categories().filter((cat) => cat.count > 0);
  });

  /** Debounce timer for search input */
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    // TODO: Load templates from API service (Story 29.8)
    // For now, using mock data
    this.loadTemplatesMock();
  }

  /**
   * Creates mock template data for development
   * @returns Array of mock form templates
   * @private
   */
  private createMockTemplates(): FormTemplate[] {
    const mockApiDelayMs = 500;
    const emptySchema = {} as FormSchema;

    return [
      {
        id: '1',
        name: 'Product Order Form',
        description: 'Standard product order form with inventory tracking',
        category: TemplateCategory.ECOMMERCE,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=Product+Order',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Appointment Booking',
        description: 'Schedule appointments with time slot management',
        category: TemplateCategory.SERVICES,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=Appointments',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 35,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: 'Customer Feedback Survey',
        description: 'Collect customer feedback and ratings',
        category: TemplateCategory.DATA_COLLECTION,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=Survey',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 28,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '4',
        name: 'Event RSVP',
        description: 'Manage event registrations and RSVPs',
        category: TemplateCategory.EVENTS,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=RSVP',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 22,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '5',
        name: 'Knowledge Quiz',
        description: 'Create quizzes with automatic scoring',
        category: TemplateCategory.QUIZ,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=Quiz',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 18,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '6',
        name: 'Opinion Poll',
        description: 'Gather opinions with vote aggregation',
        category: TemplateCategory.POLLS,
        previewImageUrl: 'https://via.placeholder.com/300x200?text=Poll',
        templateSchema: emptySchema,
        isActive: true,
        usageCount: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Loads mock template data for development
   * TODO: Replace with actual API call in Story 29.8
   */
  private loadTemplatesMock(): void {
    const mockApiDelayMs = 500;
    this.loading.set(true);
    this.error.set(null);

    // Simulate API delay
    setTimeout(() => {
      const mockTemplates = this.createMockTemplates();
      this.templates.set(mockTemplates);
      this.loading.set(false);
    }, mockApiDelayMs);
  }

  /**
   * Retries loading templates after an error
   */
  protected retryLoadTemplates(): void {
    this.loadTemplatesMock();
  }

  /**
   * Handles search input with debounce
   * @param event - Input event from search field
   */
  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer with 300ms debounce
    this.searchDebounceTimer = setTimeout(() => {
      this.searchQuery.set(value);
    }, 300);
  }

  /**
   * Clears the search query
   */
  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchQueryModel = '';
  }

  /**
   * Toggles category expansion (accordion behavior)
   * @param category - Category to toggle
   */
  protected toggleCategory(category: TemplateCategory): void {
    if (this.selectedCategory() === category) {
      this.selectedCategory.set(null);
    } else {
      this.selectedCategory.set(category);
    }
  }

  /**
   * Gets templates for a specific category
   * @param category - Category to filter by
   * @returns Filtered array of templates
   */
  protected getTemplatesByCategory(category: TemplateCategory): FormTemplate[] {
    return this.filteredTemplates().filter((t) => t.category === category);
  }

  /**
   * Handles template preview action
   * Opens the template preview modal with the selected template
   * @param template - Template to preview
   */
  protected handlePreviewTemplate(template: FormTemplate): void {
    this.selectedTemplateIdForPreview.set(template.id);
    this.showPreviewSignal.set(true);
  }

  /**
   * Handles use template action
   * @param template - Template to use
   */
  protected handleUseTemplate(template: FormTemplate): void {
    this.templateSelected.emit(template);
    this.closeDialog();

    // Navigate to form builder with template ID
    this.router.navigate(['/app/form-builder'], {
      queryParams: { templateId: template.id },
    });
  }

  /**
   * Handles start blank action
   */
  protected handleStartBlank(): void {
    this.startBlank.emit();
    this.closeDialog();

    // Navigate to form builder without template
    this.router.navigate(['/app/form-builder']);
  }

  /**
   * Handles dialog visibility change
   * @param visible - New visibility state
   */
  protected handleVisibilityChange(visible: boolean): void {
    this.visibleSignal.set(visible);
    this.visibleChange.emit(visible);
  }

  /**
   * Handles dialog hide event
   */
  protected handleDialogHide(): void {
    // Reset state when dialog closes
    this.selectedCategory.set(null);
    this.clearSearch();
  }

  /**
   * Closes the dialog
   */
  private closeDialog(): void {
    this.visibleSignal.set(false);
    this.visibleChange.emit(false);
  }

  /**
   * Handles template selection from preview modal
   * User clicked "Use This Template" in preview modal
   * @param templateId - ID of selected template
   */
  protected handleTemplateSelectedFromPreview(templateId: string): void {
    const template = this.templates().find((t) => t.id === templateId);
    if (template) {
      this.handleUseTemplate(template);
    }
  }

  /**
   * Handles preview modal closed event
   * User clicked "Back to Templates" or closed preview modal
   */
  protected handlePreviewClosed(): void {
    this.showPreviewSignal.set(false);
    // Selection modal remains open, allowing user to browse other templates
  }
}
