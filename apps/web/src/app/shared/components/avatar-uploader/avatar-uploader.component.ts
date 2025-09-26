import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  Input,
  Output,
  EventEmitter,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, catchError, of } from 'rxjs';

// PrimeNG Components
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ProfileService } from '../../../features/profile/profile.service';
import { AuthService, User } from '@core/auth/auth.service';

/**
 * Avatar upload component state interface
 */
export interface AvatarUploaderState {
  selectedFile: File | null;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  previewUrl: string | null;
  showModal: boolean;
}

/**
 * Avatar upload configuration interface
 */
export interface AvatarUploaderConfig {
  // Display options
  showTriggerButton?: boolean;
  triggerButtonLabel?: string;
  triggerButtonIcon?: string;
  triggerButtonClass?: string;

  // Modal options
  modalTitle?: string;
  modalWidth?: string;

  // Upload options
  maxFileSize?: number;
  acceptedFormats?: string[];

  // Behavior options
  autoUpload?: boolean;
  confirmDelete?: boolean;

  // Style options
  borderRadius?: string;
  avatarSize?: string;
}

/**
 * Shared Avatar Uploader Component
 *
 * A fully reusable avatar upload component that can be used anywhere in the application.
 * Includes modal functionality, progress indication, file validation, and error handling.
 *
 * @example
 * <app-avatar-uploader
 *   [currentAvatarUrl]="user?.avatarUrl"
 *   [config]="{ modalTitle: 'Update Profile Picture' }"
 *   (onUploadSuccess)="handleAvatarUpdate($event)"
 *   (onUploadError)="handleUploadError($event)">
 * </app-avatar-uploader>
 */
@Component({
  selector: 'app-avatar-uploader',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FileUploadModule,
    ButtonModule,
    ProgressBarModule,
    MessageModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
  ],
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Trigger Button (optional) -->
    @if (_config().showTriggerButton) {
      <button
        type="button"
        (click)="openModal()"
        [class]="
          _config().triggerButtonClass ||
          'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors'
        "
        [disabled]="uploadState().uploading"
      >
        @if (_config().triggerButtonIcon) {
          <i [class]="_config().triggerButtonIcon + ' mr-2'"></i>
        }
        {{ _config().triggerButtonLabel || 'Upload Avatar' }}
      </button>
    }

    <!-- Avatar Display -->
    <div class="relative inline-block">
      <div
        class="relative overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
        [style.width]="_config().avatarSize || '80px'"
        [style.height]="_config().avatarSize || '80px'"
        [style.border-radius]="_config().borderRadius || '50%'"
        (click)="openModal()"
      >
        @if (_currentAvatarUrl() || uploadState().previewUrl) {
          <img
            [src]="uploadState().previewUrl || _currentAvatarUrl()"
            [alt]="'Avatar'"
            class="w-full h-full object-cover"
            (error)="onImageError()"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center bg-gray-300">
            <i class="pi pi-user text-gray-500 text-2xl"></i>
          </div>
        }

        <!-- Upload overlay -->
        <div
          class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        >
          <i class="pi pi-camera text-white text-xl"></i>
        </div>

        <!-- Upload progress overlay -->
        @if (uploadState().uploading) {
          <div class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
            <div class="text-center text-white">
              <div
                class="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"
              ></div>
              <div class="text-xs">{{ uploadState().uploadProgress }}%</div>
            </div>
          </div>
        }
      </div>

      <!-- Delete button -->
      @if (_currentAvatarUrl() && !uploadState().uploading) {
        <button
          type="button"
          (click)="confirmDeleteAvatar($event)"
          class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
          pTooltip="Remove avatar"
          tooltipPosition="top"
        >
          <i class="pi pi-times"></i>
        </button>
      }
    </div>

    <!-- Upload Modal -->
    <p-dialog
      [header]="_config().modalTitle || 'Upload Avatar'"
      [modal]="true"
      [visible]="uploadState().showModal"
      (onHide)="closeModal()"
      [style]="{ width: _config().modalWidth || '540px' }"
      [draggable]="false"
      [resizable]="false"
      styleClass="avatar-modal"
    >
      <div class="space-y-6">
        <!-- Current Avatar Preview -->
        @if (uploadState().previewUrl || _currentAvatarUrl()) {
          <div class="text-center">
            <div class="mx-auto w-32 h-32 rounded-full overflow-hidden bg-gray-100 shadow-lg">
              <img
                [src]="uploadState().previewUrl || _currentAvatarUrl()"
                alt="Avatar preview"
                class="w-full h-full object-cover"
                (error)="onImageError()"
              />
            </div>
            @if (uploadState().previewUrl) {
              <p class="mt-2 text-sm text-gray-600">Preview of new avatar</p>
            }
          </div>
        }

        <!-- Error Message -->
        @if (uploadState().error) {
          <p-message
            severity="error"
            [text]="uploadState().error || ''"
            [closable]="true"
            (onClose)="clearError()"
          ></p-message>
        }

        <!-- File Upload Area -->
        <div class="space-y-4">
          <p-fileUpload
            #fileUpload
            [multiple]="false"
            [accept]="acceptedFormatsString()"
            [maxFileSize]="_config().maxFileSize || 5242880"
            [auto]="false"
            cancelLabel=""
            [showUploadButton]="false"
            [showCancelButton]="false"
            [customUpload]="true"
            (onSelect)="onFileSelect($event)"
            (onError)="onFileError($event)"
            (onClear)="onFileClear()"
          >
            <ng-template pTemplate="content">
              @if (!uploadState().selectedFile) {
                <div
                  class="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-primary-50 hover:border-primary-400 transition-all duration-200 cursor-pointer group"
                  (click)="fileUpload.choose()"
                >
                  <div class="flex flex-col items-center">
                    <div
                      class="mb-4 p-3 bg-primary-100 rounded-full group-hover:bg-primary-200 transition-colors"
                    >
                      <i class="pi pi-cloud-upload text-2xl text-primary-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Choose Avatar</h3>
                    <p class="text-sm text-gray-600 mb-1">
                      <span class="font-semibold text-primary-600 group-hover:text-primary-700">
                        Click here to select
                      </span>
                      or drag and drop your image
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ acceptedFormatsDisplay() }} up to {{ maxFileSizeDisplay() }}
                    </p>
                  </div>
                </div>
              } @else {
                <div class="text-center py-8">
                  <div class="mb-4">
                    <i class="pi pi-file-image text-4xl text-green-600"></i>
                  </div>
                  <h3 class="text-lg font-medium text-gray-900 mb-1">File Selected</h3>
                  <p class="text-sm text-gray-600 mb-4">{{ uploadState().selectedFile?.name }}</p>
                  <button
                    type="button"
                    (click)="fileUpload.clear()"
                    class="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Choose different file
                  </button>
                </div>
              }
            </ng-template>
          </p-fileUpload>

          <!-- Upload Progress -->
          @if (uploadState().uploading) {
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Uploading...</span>
                <span class="text-gray-900 font-medium">{{ uploadState().uploadProgress }}%</span>
              </div>
              <p-progressBar
                [value]="uploadState().uploadProgress"
                [showValue]="false"
              ></p-progressBar>
            </div>
          }
        </div>

        <!-- Modal Actions -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          @if (uploadState().selectedFile && !uploadState().uploading) {
            <button
              type="button"
              (click)="uploadAvatar()"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              <i class="pi pi-upload mr-2"></i>
              Upload Avatar
            </button>
          }

          @if (uploadState().uploading) {
            <button
              type="button"
              disabled
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 opacity-50 cursor-not-allowed shadow-sm"
            >
              <div
                class="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              ></div>
              Uploading...
            </button>
          }

          <button
            type="button"
            (click)="closeModal()"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </p-dialog>

    <!-- Confirmation Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      /* Hide the default choose button */
      ::ng-deep .p-fileupload .p-fileupload-buttonbar .p-fileupload-choose {
        display: none !important;
      }

      ::ng-deep .p-fileupload .p-fileupload-choose {
        display: none !important;
      }

      ::ng-deep .p-fileupload-choose {
        display: none !important;
      }

      /* Enhanced file upload styling */
      ::ng-deep .p-fileupload-dragdrop {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
      }

      ::ng-deep .p-fileupload-content {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
      }

      /* Modal styling */
      ::ng-deep .avatar-modal .p-dialog-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px 8px 0 0;
      }

      ::ng-deep .avatar-modal .p-dialog-content {
        padding: 1.5rem;
      }

      /* Progress bar styling */
      ::ng-deep .p-progressbar {
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }

      ::ng-deep .p-progressbar .p-progressbar-value {
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        border-radius: 3px;
      }

      /* Message styling */
      ::ng-deep .p-message.p-message-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        border-radius: 6px;
      }
    `,
  ],
})
export class AvatarUploaderComponent {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  // Input properties
  @Input() set currentAvatarUrl(value: string | null | undefined) {
    this._currentAvatarUrl.set(value || null);
  }
  get currentAvatarUrl() {
    return this._currentAvatarUrl();
  }
  protected _currentAvatarUrl = signal<string | null>(null);

  @Input() set config(value: AvatarUploaderConfig) {
    this._config.set(value || {});
  }
  get config() {
    return this._config();
  }
  protected _config = signal<AvatarUploaderConfig>({});

  // Output events
  @Output() onUploadSuccess = new EventEmitter<User>();
  @Output() onUploadError = new EventEmitter<string>();
  @Output() onDeleteSuccess = new EventEmitter<User>();
  @Output() onDeleteError = new EventEmitter<string>();

  // Component state
  uploadState = signal<AvatarUploaderState>({
    selectedFile: null,
    uploading: false,
    uploadProgress: 0,
    error: null,
    previewUrl: null,
    showModal: false,
  });

  // Computed properties
  acceptedFormatsString = computed(() => {
    const formats = this._config().acceptedFormats || ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return formats.join(',');
  });

  acceptedFormatsDisplay = computed(() => {
    const formats = this._config().acceptedFormats || ['JPG', 'PNG', 'GIF', 'WebP'];
    return formats.join(', ');
  });

  maxFileSizeDisplay = computed(() => {
    const size = this._config().maxFileSize || 5242880; // 5MB default
    return this.formatFileSize(size);
  });

  // Modal methods
  openModal(): void {
    if (this.uploadState().uploading) return;

    this.uploadState.update((state) => ({
      ...state,
      showModal: true,
      error: null,
    }));
  }

  closeModal(): void {
    this.uploadState.update((state) => ({
      ...state,
      showModal: false,
      selectedFile: null,
      previewUrl: null,
      error: null,
      uploadProgress: 0,
    }));
  }

  // File handling methods
  onFileSelect(event: FileSelectEvent): void {
    const file = event.files[0];
    if (!file) return;

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      this.uploadState.update((state) => ({
        ...state,
        error: validation.error || 'Invalid file',
        selectedFile: null,
        previewUrl: null,
      }));
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    this.uploadState.update((state) => ({
      ...state,
      selectedFile: file,
      previewUrl,
      error: null,
    }));

    // Auto upload if enabled
    if (this._config().autoUpload) {
      this.uploadAvatar();
    }
  }

  onFileError(event: any): void {
    this.uploadState.update((state) => ({
      ...state,
      error: 'File upload error occurred',
      selectedFile: null,
      previewUrl: null,
    }));
  }

  onFileClear(): void {
    this.uploadState.update((state) => ({
      ...state,
      selectedFile: null,
      previewUrl: null,
      error: null,
    }));
  }

  onImageError(): void {
    // Handle image load errors gracefully
    console.warn('Failed to load avatar image');
  }

  // Upload methods
  uploadAvatar(): void {
    const file = this.uploadState().selectedFile;
    if (!file) return;

    this.uploadState.update((state) => ({
      ...state,
      uploading: true,
      uploadProgress: 0,
      error: null,
    }));

    // Simulate progress (you can replace this with actual progress tracking)
    const progressInterval = setInterval(() => {
      this.uploadState.update((state) => ({
        ...state,
        uploadProgress: Math.min(state.uploadProgress + 10, 90),
      }));
    }, 100);

    this.profileService
      .uploadAvatar(file)
      .pipe(
        finalize(() => {
          clearInterval(progressInterval);
          this.uploadState.update((state) => ({
            ...state,
            uploading: false,
            uploadProgress: 100,
          }));
        }),
        catchError((error) => {
          const errorMessage = error?.error?.message || 'Upload failed. Please try again.';
          this.uploadState.update((state) => ({
            ...state,
            error: errorMessage,
          }));
          this.onUploadError.emit(errorMessage);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this.uploadState.update((state) => ({
              ...state,
              uploadProgress: 100,
            }));

            // Update current avatar URL
            this._currentAvatarUrl.set(user.avatarUrl || null);

            // Close modal after short delay
            setTimeout(() => {
              this.closeModal();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Avatar updated successfully',
              });
            }, 500);

            this.onUploadSuccess.emit(user);
          }
        },
      });
  }

  // Delete methods
  confirmDeleteAvatar(event: Event): void {
    event.stopPropagation();

    if (!this._config().confirmDelete) {
      this.deleteAvatar();
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to remove your avatar?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.deleteAvatar(),
    });
  }

  deleteAvatar(): void {
    this.profileService
      .deleteAvatar()
      .pipe(
        catchError((error) => {
          const errorMessage = error?.error?.message || 'Delete failed. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
          this.onDeleteError.emit(errorMessage);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this._currentAvatarUrl.set(null);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Avatar removed successfully',
            });
            this.onDeleteSuccess.emit(user);
          }
        },
      });
  }

  // Utility methods
  clearError(): void {
    this.uploadState.update((state) => ({
      ...state,
      error: null,
    }));
  }

  private validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = this._config().maxFileSize || 5242880; // 5MB default
    const allowedFormats = this._config().acceptedFormats || [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
    ];

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than ${this.formatFileSize(maxSize)}`,
      };
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFormats.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File type not allowed. Accepted formats: ${allowedFormats.join(', ')}`,
      };
    }

    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'Please select a valid image file',
      };
    }

    return { isValid: true };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
