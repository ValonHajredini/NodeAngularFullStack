import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
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
import { FormCardComponent, FormCardAction } from '../form-card/form-card.component';

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
    IconField,
    InputIcon,
    InputText,
    ConfirmDialog,
    Toast,
    FormSettingsComponent,
    FormCardComponent,
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
              <app-form-card [form]="form" (action)="handleFormAction($event)" />
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
   * Handles form card actions (edit, analytics, delete, copy-url)
   */
  handleFormAction(action: FormCardAction): void {
    switch (action.type) {
      case 'edit':
        this.router.navigate(['/app/tools/form-builder', action.formId]);
        break;

      case 'analytics':
        this.router.navigate(['/app/tools/form-builder', action.formId, 'analytics']);
        break;

      case 'delete':
        this.confirmDelete(action.formId);
        break;

      case 'copy-url':
        if (action.renderToken) {
          this.copyPublishUrl(action.renderToken);
        }
        break;
    }
  }

  /**
   * Shows confirmation dialog before deleting a form.
   */
  private confirmDelete(formId: string): void {
    const form = this.forms().find((f) => f.id === formId);
    if (!form) return;

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
        this.deleteForm(formId);
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
   * Copies the publish URL to clipboard.
   */
  private copyPublishUrl(renderToken: string): void {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/forms/render/${renderToken}`;
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
