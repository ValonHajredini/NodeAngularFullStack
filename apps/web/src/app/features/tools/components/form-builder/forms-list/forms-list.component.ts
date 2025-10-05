import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { Tag } from 'primeng/tag';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { FormMetadata, FormStatus, ToolConfig } from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';
import { FormSettingsComponent, FormSettings } from '../form-settings/form-settings.component';
import { ToolConfigService } from '@core/services/tool-config.service';

/**
 * Forms list component displaying all user's forms.
 * Provides pagination, delete, and edit actions.
 */
@Component({
  selector: 'app-forms-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonDirective,
    Paginator,
    Tag,
    IconField,
    InputIcon,
    InputText,
    ConfirmDialog,
    Toast,
    DatePipe,
    FormSettingsComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <!-- Breadcrumb Navigation -->
    <div class="bg-gray-100 border-b border-gray-200 px-6 py-2">
      <nav
        class="flex items-center text-sm text-gray-600"
        [class.max-w-7xl]="!isFullWidth()"
        [class.mx-auto]="!isFullWidth()"
      >
        <a
          routerLink="/app/dashboard"
          class="hover:text-blue-600 transition-colors flex items-center"
        >
          <i class="pi pi-home mr-1"></i>
          Dashboard
        </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <a routerLink="/app/tools" class="hover:text-blue-600 transition-colors"> Tools </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <span class="text-gray-900 font-medium">Form Builder</span>
      </nav>
    </div>

    <div
      class="forms-list-container px-6 py-6 bg-gray-50 min-h-screen"
      [class.w-full]="isFullWidth()"
    >
      <div [class.max-w-7xl]="!isFullWidth()" [class.mx-auto]="!isFullWidth()">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">My Forms</h1>
              <p class="text-gray-600 mt-1">Manage your form drafts and published forms</p>
            </div>
          </div>

          <!-- Search Bar and Create Button -->
          <div class="flex items-center gap-3">
            <p-iconfield iconPosition="left" class="flex-1">
              <p-inputicon styleClass="pi pi-search"></p-inputicon>
              <input
                pInputText
                [(ngModel)]="searchTerm"
                placeholder="Search forms by title or description..."
                class="w-full"
                (input)="onSearchInput($event)"
              />
            </p-iconfield>
            @if (searchTerm()) {
              <button
                pButton
                icon="pi pi-times"
                severity="secondary"
                [outlined]="true"
                (click)="clearSearch()"
                title="Clear search"
              ></button>
            }
            <button
              pButton
              label="Create New Form"
              icon="pi pi-plus"
              (click)="openCreateFormModal()"
              class="p-button-primary"
            ></button>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <i class="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && filteredForms().length === 0 && !searchTerm()) {
          <div class="bg-white rounded-lg shadow-sm p-12 text-center">
            <i class="pi pi-file-edit text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p class="text-gray-600 mb-6">Create your first form to get started</p>
            <button
              pButton
              label="Create Form"
              icon="pi pi-plus"
              (click)="openCreateFormModal()"
            ></button>
          </div>
        }

        <!-- No Search Results -->
        @if (!isLoading() && filteredForms().length === 0 && searchTerm()) {
          <div class="bg-white rounded-lg shadow-sm p-12 text-center">
            <i class="pi pi-search text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No forms found</h3>
            <p class="text-gray-600 mb-6">
              No forms match your search "{{ searchTerm() }}". Try a different search term.
            </p>
            <button
              pButton
              label="Clear Search"
              icon="pi pi-times"
              (click)="clearSearch()"
            ></button>
          </div>
        }

        <!-- Forms Grid -->
        @if (!isLoading() && filteredForms().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (form of filteredForms(); track form.id) {
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                <!-- Status Badge -->
                <div class="flex items-center justify-between mb-3">
                  <p-tag
                    [value]="form.status === FormStatus.PUBLISHED ? 'Published' : 'Draft'"
                    [severity]="form.status === FormStatus.PUBLISHED ? 'success' : 'warning'"
                  ></p-tag>
                  <span class="text-xs text-gray-500">
                    {{ form.updatedAt | date: 'MMM d, yyyy' }}
                  </span>
                </div>

                <!-- Form Title -->
                <h3 class="text-lg font-semibold text-gray-900 mb-2 truncate" [title]="form.title">
                  {{ form.title }}
                </h3>

                <!-- Form Description -->
                <p class="text-sm text-gray-600 mb-4 line-clamp-2" [title]="form.description">
                  {{ form.description || 'No description' }}
                </p>

                <!-- Form Stats -->
                <div class="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span>
                    <i class="pi pi-list mr-1"></i>
                    {{ form.schema?.fields?.length || 0 }} fields
                  </span>
                  <span>
                    <i class="pi pi-clock mr-1"></i>
                    {{ form.createdAt | date: 'short' }}
                  </span>
                </div>

                <!-- Publish URL (for published forms) -->
                @if (form.status === FormStatus.PUBLISHED && form.schema?.renderToken) {
                  <div class="mb-3">
                    <label class="block text-xs font-semibold text-gray-700 mb-1">
                      Public Form URL
                    </label>
                    <div class="flex gap-2">
                      <input
                        type="text"
                        pInputText
                        [value]="getPublishUrl(form.schema?.renderToken ?? '')"
                        readonly
                        class="w-full text-xs"
                      />
                      <button
                        pButton
                        icon="pi pi-copy"
                        size="small"
                        severity="secondary"
                        [outlined]="true"
                        (click)="copyPublishUrl(form.schema?.renderToken ?? '')"
                        title="Copy URL"
                      ></button>
                    </div>
                  </div>
                }

                <!-- Actions -->
                <div class="flex gap-2">
                  <button
                    pButton
                    label="Edit"
                    icon="pi pi-pencil"
                    size="small"
                    severity="secondary"
                    class="flex-1"
                    (click)="editForm(form.id)"
                  ></button>
                  <button
                    pButton
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    [outlined]="true"
                    (click)="confirmDelete(form)"
                    [disabled]="form.status === FormStatus.PUBLISHED"
                  ></button>
                </div>

                @if (form.status === FormStatus.PUBLISHED) {
                  <small class="text-xs text-gray-500 mt-2 block">
                    Published forms cannot be deleted
                  </small>
                }
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="mt-6">
              <p-paginator
                [rows]="pageSize()"
                [totalRecords]="totalItems()"
                [first]="(currentPage() - 1) * pageSize()"
                (onPageChange)="onPageChange($event)"
              ></p-paginator>
            </div>
          }
        }
      </div>

      <!-- Confirmation Dialog -->
      <p-confirmDialog></p-confirmDialog>

      <!-- Toast -->
      <p-toast position="top-right"></p-toast>

      <!-- Form Settings Modal for Creation -->
      <app-form-settings
        [(visible)]="showCreateModal"
        [mode]="'create'"
        [settings]="newFormSettings()"
        (settingsSaved)="onFormSettingsSaved($event)"
      ></app-form-settings>
    </div>
  `,
  styles: [
    `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class FormsListComponent implements OnInit {
  private readonly formsApiService = inject(FormsApiService);
  private readonly toolConfigService = inject(ToolConfigService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  readonly FormStatus = FormStatus;
  readonly toolConfig = signal<ToolConfig | null>(null);

  // Computed property to check if tool is in full width mode
  readonly isFullWidth = computed(() => {
    const config = this.toolConfig();
    return config?.displayMode === 'full-width';
  });

  readonly forms = signal<FormMetadata[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(9);
  readonly totalItems = signal<number>(0);
  readonly totalPages = signal<number>(0);

  // Search functionality
  readonly searchTerm = signal<string>('');
  private searchDebounceTimer: any;

  // Filtered forms computed from search
  readonly filteredForms = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) {
      return this.forms();
    }
    return this.forms().filter(
      (form) =>
        form.title.toLowerCase().includes(term) ||
        (form.description?.toLowerCase() || '').includes(term),
    );
  });

  // Modal for creating new form
  showCreateModal = signal<boolean>(false);
  readonly newFormSettings = signal<FormSettings | null>(null);

  ngOnInit(): void {
    this.loadToolConfig();
    this.loadForms();
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
        // Don't show error to user, just use default layout
        this.toolConfig.set(null);
      },
    });
  }

  /**
   * Loads forms from the API with pagination.
   */
  loadForms(): void {
    this.isLoading.set(true);
    this.formsApiService.getForms(this.currentPage(), this.pageSize()).subscribe({
      next: (response) => {
        this.forms.set(response.data || []);
        this.totalItems.set(response.pagination.totalItems);
        this.totalPages.set(response.pagination.totalPages);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load forms',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles pagination change.
   */
  onPageChange(event: any): void {
    this.currentPage.set(event.page + 1); // PrimeNG is 0-indexed
    this.loadForms();
  }

  /**
   * Opens the create form modal with default settings.
   */
  openCreateFormModal(): void {
    this.newFormSettings.set({
      title: '',
      description: '',
      columnLayout: 1,
      fieldSpacing: 'normal',
      successMessage: 'Thank you for your submission!',
      redirectUrl: '',
      allowMultipleSubmissions: true,
    });
    this.showCreateModal.set(true);
  }

  /**
   * Handles form settings saved from the modal.
   * Creates a new form and navigates to the builder.
   */
  onFormSettingsSaved(settings: FormSettings): void {
    this.formsApiService
      .createForm({
        title: settings.title,
        description: settings.description,
        status: FormStatus.DRAFT,
      })
      .subscribe({
        next: (form) => {
          this.showCreateModal.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Form Created',
            detail: 'Form created successfully. Redirecting to builder...',
            life: 2000,
          });
          setTimeout(() => {
            this.router.navigate(['/app/tools/form-builder', form.id]);
          }, 500);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: error.error?.message || 'Failed to create form',
            life: 3000,
          });
        },
      });
  }

  /**
   * Handles search input with debounce.
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    // Set new timer with 300ms debounce
    this.searchDebounceTimer = setTimeout(() => {
      this.searchTerm.set(value);
    }, 300);
  }

  /**
   * Clears the search term.
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Navigates to edit an existing form.
   */
  editForm(formId: string): void {
    this.router.navigate(['/app/tools/form-builder', formId]);
  }

  /**
   * Shows confirmation dialog before deleting a form.
   */
  confirmDelete(form: FormMetadata): void {
    if (form.status === FormStatus.PUBLISHED) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: 'Published forms cannot be deleted',
        life: 3000,
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${form.title}"? This action cannot be undone.`,
      header: 'Delete Form',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteForm(form.id);
      },
    });
  }

  /**
   * Deletes a form by ID.
   */
  private deleteForm(formId: string): void {
    this.formsApiService.deleteForm(formId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Form Deleted',
          detail: 'Form has been deleted successfully',
          life: 3000,
        });

        // Reload forms list
        this.loadForms();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.error?.message || 'Failed to delete form',
          life: 3000,
        });
      },
    });
  }

  /**
   * Gets the full publish URL for a given render token.
   */
  getPublishUrl(renderToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/forms/render/${renderToken}`;
  }

  /**
   * Copies the publish URL to clipboard.
   */
  copyPublishUrl(renderToken: string): void {
    const url = this.getPublishUrl(renderToken);
    navigator.clipboard.writeText(url).then(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'URL Copied',
          detail: 'Form URL has been copied to clipboard',
          life: 2000,
        });
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy URL to clipboard',
          life: 3000,
        });
      },
    );
  }
}
