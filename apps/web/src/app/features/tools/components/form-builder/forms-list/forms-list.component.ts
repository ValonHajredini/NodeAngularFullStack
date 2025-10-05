import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { Tag } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { FormMetadata, FormStatus } from '@nodeangularfullstack/shared';
import { FormsApiService } from '../forms-api.service';

/**
 * Forms list component displaying all user's forms.
 * Provides pagination, delete, and edit actions.
 */
@Component({
  selector: 'app-forms-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonDirective, Paginator, Tag, ConfirmDialog, Toast, DatePipe],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="forms-list-container p-6 bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">My Forms</h1>
            <p class="text-gray-600 mt-1">Manage your form drafts and published forms</p>
          </div>
          <button
            pButton
            label="New Form"
            icon="pi pi-plus"
            (click)="createNewForm()"
            class="p-button-primary"
          ></button>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-12">
            <i class="pi pi-spin pi-spinner text-4xl text-blue-600"></i>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && forms().length === 0) {
          <div class="bg-white rounded-lg shadow-sm p-12 text-center">
            <i class="pi pi-file-edit text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p class="text-gray-600 mb-6">Create your first form to get started</p>
            <button
              pButton
              label="Create Form"
              icon="pi pi-plus"
              (click)="createNewForm()"
            ></button>
          </div>
        }

        <!-- Forms Grid -->
        @if (!isLoading() && forms().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (form of forms(); track form.id) {
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

  ngOnInit(): void {
    this.loadForms();
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
   * Navigates to create a new form.
   */
  createNewForm(): void {
    this.router.navigate(['/tools/form-builder']);
  }

  /**
   * Navigates to edit an existing form.
   */
  editForm(formId: string): void {
    this.router.navigate(['/tools/form-builder', formId]);
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
}
