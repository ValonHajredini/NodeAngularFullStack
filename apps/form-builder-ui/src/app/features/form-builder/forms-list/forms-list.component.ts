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
import { FormMetadata, FormStatus, PaginatedResponse } from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';
import { FormSettingsComponent, FormSettings } from '../form-settings/form-settings.component';
import { FormCardComponent, FormCardAction } from '../form-card/form-card.component';
import { QrCodeDisplayComponent } from '../../tools/components/short-link/components/qr-code-display/qr-code-display.component';
import { Dialog } from 'primeng/dialog';

/**
 * Forms list component displaying all user's forms with enhanced QR code functionality.
 *
 * Features:
 * - Grid display of form cards with metadata
 * - Pagination and search functionality
 * - Form actions: edit, analytics, delete, copy URL
 * - QR code thumbnails for published forms
 * - QR code modal with full-size display and download
 * - Responsive layout that adapts to different screen sizes
 * - Full-width display mode support
 *
 * QR Code Integration:
 * - Shows QR code thumbnails in form cards for published forms
 * - Click thumbnail to open modal with full-size QR code
 * - Download QR code images with descriptive filenames
 * - Lazy loading for optimal performance
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
    QrCodeDisplayComponent,
    Dialog,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <!-- Breadcrumb Navigation -->
    <div class="bg-gray-100 border-b border-gray-200 px-6 py-2">
      <nav class="flex items-center text-sm text-gray-600 max-w-7xl mx-auto">
        <a
          routerLink="/app/dashboard"
          class="hover:text-blue-600 transition-colors flex items-center"
        >
          <i class="pi pi-home mr-1"></i>
          Dashboard
        </a>
        <i class="pi pi-angle-right mx-2 text-gray-400"></i>
        <span class="text-gray-900 font-medium">My Forms</span>
      </nav>
    </div>

    <div class="forms-list-container px-6 py-6 bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto">
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

      <!-- QR Code Modal -->
      <p-dialog
        [(visible)]="showQrCodeModal"
        [modal]="true"
        [closable]="true"
        [resizable]="false"
        [draggable]="false"
        styleClass="qr-code-modal"
        [header]="qrCodeModalTitle()"
        [style]="{ width: '400px', maxWidth: '90vw' }"
        [breakpoints]="{ '640px': '90vw' }"
      >
        @if (qrCodeModalData()) {
          <div class="text-center">
            <app-qr-code-display
              [qrCodeUrl]="qrCodeModalData()!.qrCodeUrl"
              [label]="'QR Code for ' + qrCodeModalData()!.formTitle"
              [altText]="'QR code for form: ' + qrCodeModalData()!.formTitle"
              [helperText]="'Scan to open ' + qrCodeModalData()!.formTitle"
              [downloadTooltip]="'Download QR code for ' + qrCodeModalData()!.formTitle"
              [imageClass]="
                'w-64 h-64 sm:w-64 sm:h-64 max-w-full border border-gray-200 rounded mx-auto'
              "
              (download)="downloadQrCode()"
            />
            <div class="mt-4 text-sm text-gray-600">
              <p>Scan this QR code to quickly access your published form</p>
            </div>
          </div>
        }
      </p-dialog>
    </div>
  `,
})
export class FormsListComponent implements OnInit {
  private readonly formsApiService = inject(FormsApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  readonly FormStatus = FormStatus;

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

  // QR Code modal state
  showQrCodeModal = signal<boolean>(false);
  readonly qrCodeModalData = signal<{ qrCodeUrl: string; formTitle: string } | null>(null);
  readonly qrCodeModalTitle = computed(() => {
    const data = this.qrCodeModalData();
    return data ? `QR Code - ${data.formTitle}` : 'QR Code';
  });

  ngOnInit(): void {
    this.loadForms();
  }

  /**
   * Loads forms from the API with pagination.
   */
  loadForms(): void {
    this.isLoading.set(true);
    this.formsApiService.getForms(this.currentPage(), this.pageSize()).subscribe({
      next: (response: PaginatedResponse<FormMetadata>) => {
        this.forms.set(response.data || []);
        this.totalItems.set(response.pagination.totalItems);
        this.totalPages.set(response.pagination.totalPages);
        this.isLoading.set(false);
      },
      error: (error: any) => {
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
    // Create initial schema with background settings
    const initialSchema: any = {
      version: 1,
      fields: [],
      settings: {
        layout: {
          columns: settings.columnLayout,
          spacing: settings.fieldSpacing,
        },
        submission: {
          showSuccessMessage: true,
          successMessage: settings.successMessage || 'Thank you for your submission!',
          redirectUrl: settings.redirectUrl || '',
          allowMultipleSubmissions: settings.allowMultipleSubmissions,
        },
        // Include background settings
        background: {
          type: settings.backgroundType || 'none',
          imageUrl: settings.backgroundImageUrl || '',
          imagePosition: settings.backgroundImagePosition || 'cover',
          imageOpacity: settings.backgroundImageOpacity ?? 100,
          imageAlignment: settings.backgroundImageAlignment || 'center',
          imageBlur: settings.backgroundImageBlur ?? 0,
          customHtml: settings.backgroundCustomHtml || '',
          customCss: settings.backgroundCustomCss || '',
        },
      },
      isPublished: false,
    };

    this.formsApiService
      .createForm({
        title: settings.title,
        description: settings.description,
        status: FormStatus.DRAFT,
        schema: initialSchema as any,
      })
      .subscribe({
        next: (form: FormMetadata) => {
          this.showCreateModal.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Form Created',
            detail: 'Form created successfully. Redirecting to builder...',
            life: 2000,
          });
          setTimeout(() => {
            this.router.navigate(['/app/form-builder', form.id]);
          }, 500);
        },
        error: (error: any) => {
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
   * Handles form card actions (edit, analytics, delete, copy-url, view-qr)
   */
  handleFormAction(action: FormCardAction): void {
    switch (action.type) {
      case 'edit':
        this.router.navigate(['/app/form-builder', action.formId]);
        break;

      case 'analytics':
        this.router.navigate(['/app/form-builder', action.formId, 'analytics']);
        break;

      case 'delete':
        this.confirmDelete(action.formId);
        break;

      case 'copy-url':
        if (action.renderToken) {
          this.copyPublishUrl(action.renderToken);
        }
        break;

      case 'view-qr':
        if (action.qrCodeUrl && action.formTitle) {
          this.openQrCodeModal(action.qrCodeUrl, action.formTitle);
        }
        break;
    }
  }

  /**
   * Shows confirmation dialog before deleting a form.
   */
  public confirmDelete(formId: string): void {
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
   * Note: renderToken now contains the full URL (prefers short URL over JWT token URL)
   */
  private copyPublishUrl(url: string): void {
    // URL is already complete (either short URL or JWT token URL)
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

  /**
   * Opens the QR code modal for the specified form
   */
  openQrCodeModal(qrCodeUrl: string, formTitle: string): void {
    this.qrCodeModalData.set({ qrCodeUrl, formTitle });
    this.showQrCodeModal.set(true);
  }

  /**
   * Downloads the QR code image
   */
  downloadQrCode(): void {
    const data = this.qrCodeModalData();
    if (!data) return;

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = data.qrCodeUrl;
    link.download = `qr-code-${data.formTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'success',
      summary: 'QR Code Downloaded',
      detail: `QR code for "${data.formTitle}" has been downloaded`,
      life: 2000,
    });
  }
}
