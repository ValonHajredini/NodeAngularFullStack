import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  Input,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

// PrimeNG Components
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService } from 'primeng/api';

import { ProfileService } from '../../../features/profile/profile.service';
import { AuthService, User } from '@core/auth/auth.service';

/**
 * Avatar upload component state interface
 */
export interface AvatarUploadState {
  selectedFile: File | null;
  uploading: boolean;
  uploadProgress: number;
  error: string | null;
  previewUrl: string | null;
  showModal: boolean;
}

/**
 * Avatar upload component following Angular 20+ standalone architecture.
 * Provides drag-and-drop file upload with progress indicator and preview.
 * Integrates with existing user state management and profile service.
 */
@Component({
  selector: 'app-avatar-upload',
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
  providers: [ConfirmationService],
  template: `
    <div class="avatar-upload-container w-full max-w-md mx-auto">
      <!-- Simple Avatar Display with Modal Trigger -->
      <div class="flex flex-col items-center">
        <div class="relative">
          @if (currentAvatarUrl()) {
            <img
              [src]="currentAvatarUrl()"
              [alt]="currentUser()?.firstName + ' ' + currentUser()?.lastName"
              class="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-gray-200"
              (error)="onImageError()"
            />
          } @else {
            <div
              class="h-24 w-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-4 border-white shadow-lg ring-2 ring-gray-200"
            >
              @if (currentUser()?.firstName && currentUser()?.lastName) {
                <span class="text-xl font-bold text-white">
                  {{ getInitials(currentUser()!.firstName, currentUser()!.lastName) }}
                </span>
              } @else {
                <i class="pi pi-user text-xl text-white"></i>
              }
            </div>
          }

          <!-- Camera Button - Opens Modal -->
          <button
            type="button"
            class="absolute -bottom-1 -right-1 bg-primary-600 hover:bg-primary-700 rounded-full p-2.5 shadow-lg border-3 border-white transition-all duration-200 hover:scale-105"
            pTooltip="Change avatar"
            tooltipPosition="top"
            (click)="openModal()"
            [disabled]="uploadState().uploading"
          >
            <i class="pi pi-camera text-white text-sm"></i>
          </button>
        </div>

        @if (currentUser()) {
          <h3 class="mt-4 text-lg font-semibold text-gray-900">
            {{ currentUser()!.firstName }} {{ currentUser()!.lastName }}
          </h3>
        }

        @if (currentUser()?.role) {
          <div class="flex items-center mt-1">
            <i class="pi pi-shield text-primary-600 text-sm mr-1"></i>
            <span class="text-sm text-gray-600 capitalize">{{ currentUser()!.role }}</span>
          </div>
        }
      </div>

      <!-- Avatar Upload Modal -->
      <p-dialog
        header="Change Avatar"
        [modal]="true"
        [visible]="uploadState().showModal"
        (onHide)="closeModal()"
        [style]="{ width: '540px' }"
        [draggable]="false"
        [resizable]="false"
        styleClass="avatar-modal"
      >
        <div class="space-y-6">
          <!-- Current Avatar Preview -->
          <div class="flex justify-center">
            <div class="relative">
              @if (uploadState().previewUrl) {
                <img
                  [src]="uploadState().previewUrl"
                  alt="Preview"
                  class="h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                />
              } @else if (currentAvatarUrl()) {
                <img
                  [src]="currentAvatarUrl()"
                  [alt]="currentUser()?.firstName + ' ' + currentUser()?.lastName"
                  class="h-20 w-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                  (error)="onImageError()"
                />
              } @else {
                <div
                  class="h-20 w-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-2 border-gray-200 shadow-sm"
                >
                  @if (currentUser()?.firstName && currentUser()?.lastName) {
                    <span class="text-lg font-bold text-white">
                      {{ getInitials(currentUser()!.firstName, currentUser()!.lastName) }}
                    </span>
                  } @else {
                    <i class="pi pi-user text-lg text-white"></i>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Upload Progress -->
          @if (uploadState().uploading) {
            <div class="space-y-3 bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700">Uploading avatar...</span>
                <span class="text-sm text-gray-500">{{ uploadState().uploadProgress }}%</span>
              </div>
              <p-progressBar
                [value]="uploadState().uploadProgress"
                styleClass="h-2"
              ></p-progressBar>
            </div>
          }

          <!-- Error Message -->
          @if (uploadState().error) {
            <p-message
              severity="error"
              [text]="uploadState().error || undefined"
              [closable]="true"
              (onClose)="clearError()"
            ></p-message>
          }

          <!-- File Upload Section -->
          <div class="space-y-4">
            <p-fileUpload
              #fileUpload
              mode="advanced"
              accept="image/jpeg,image/png,image/gif"
              [maxFileSize]="maxFileSize"
              [auto]="true"
              chooseLabel=""
              uploadLabel=""
              cancelLabel=""
              [showUploadButton]="false"
              [showCancelButton]="false"
              [customUpload]="true"
              (onSelect)="onFileSelect($event)"
              (onError)="onFileError($event)"
              (onClear)="onFileClear()"
              [disabled]="uploadState().uploading"
              class="w-full"
            >
              <ng-template pTemplate="content" let-files>
                @if (files && files.length > 0) {
                  <div class="space-y-3">
                    @for (file of files; track file.name) {
                      <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <i class="pi pi-file text-primary-600"></i>
                        <div class="flex-1">
                          <div class="text-sm font-medium text-gray-900">{{ file.name }}</div>
                          <div class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
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
                        JPG, PNG or GIF (max {{ formatFileSize(maxFileSize) }})
                      </p>
                    </div>
                  </div>
                }
              </ng-template>
            </p-fileUpload>
          </div>
        </div>

        <!-- Modal Footer -->
        <ng-template pTemplate="footer">
          <div class="flex justify-between w-full">
            <!-- Left side - Remove Avatar button -->
            @if (currentAvatarUrl() && !uploadState().uploading) {
              <button
                type="button"
                (click)="confirmRemoveAvatar()"
                class="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors"
              >
                <i class="pi pi-trash mr-2"></i>
                Remove Avatar
              </button>
            } @else {
              <div></div>
            }

            <!-- Right side - Upload and Close buttons -->
            <div class="flex space-x-3">
              @if (uploadState().selectedFile && !uploadState().uploading) {
                <button
                  type="button"
                  (click)="uploadAvatar()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-sm"
                >
                  <i class="pi pi-upload mr-2"></i>
                  Upload
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
                Close
              </button>
            </div>
          </div>
        </ng-template>
      </p-dialog>

      <!-- Confirmation Dialog -->
      <p-confirmDialog></p-confirmDialog>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .avatar-upload-container {
        font-family: inherit;
      }

      /* Enhanced unified container styling */
      .bg-white {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        backdrop-filter: blur(10px);
      }

      /* Hide the choose button */
      ::ng-deep .p-fileupload .p-fileupload-buttonbar .p-fileupload-choose {
        display: none !important;
      }

      ::ng-deep .p-fileupload .p-fileupload-choose {
        display: none !important;
      }

      ::ng-deep .p-fileupload-choose {
        display: none !important;
      }

      /* Enhanced unified file upload styling */
      ::ng-deep .p-fileupload-dragdrop {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
      }

      ::ng-deep .p-fileupload-dragdrop:hover {
        background: transparent !important;
        border: none !important;
        transform: none !important;
        box-shadow: none !important;
      }

      ::ng-deep .p-fileupload-dragdrop.p-fileupload-dragover {
        border: none !important;
        background: transparent !important;
        transform: none !important;
        box-shadow: none !important;
      }

      /* Custom drag-over styling */
      ::ng-deep .p-fileupload-dragdrop.p-fileupload-dragover .text-center {
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
        border-color: #2563eb !important;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.25);
      }

      /* Enhanced progress bar */
      ::ng-deep .p-progressbar {
        height: 8px;
        background: #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      ::ng-deep .p-progressbar .p-progressbar-value {
        background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
        background-size: 200% 100%;
        animation: gradient-shift 2s ease-in-out infinite;
        transition: width 0.3s ease-in-out;
        border-radius: 6px;
      }

      @keyframes gradient-shift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      /* Enhanced button hover effects */
      .hover\\:scale-105:hover {
        transform: scale(1.05);
      }

      /* Smooth transitions for all interactive elements */
      button,
      .cursor-pointer {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Enhanced shadow effects */
      .shadow-lg {
        box-shadow:
          0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }

      .hover\\:shadow-lg:hover {
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }

      /* Enhanced ring effects for avatar */
      .ring-2 {
        box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.5);
      }

      /* Custom border width for camera button */
      .border-3 {
        border-width: 3px;
      }

      /* Enhanced message styling */
      ::ng-deep .p-message {
        border-radius: 8px;
        border-left-width: 4px;
      }

      /* Modal specific styling */
      ::ng-deep .avatar-modal .p-dialog-content {
        padding: 1.5rem;
      }

      ::ng-deep .avatar-modal .p-dialog-header {
        padding: 1.5rem 1.5rem 0 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      ::ng-deep .avatar-modal .p-dialog-footer {
        padding: 1rem 1.5rem 1.5rem 1.5rem;
        border-top: 1px solid #e5e7eb;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarUploadComponent {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  // Component inputs
  @Input() maxFileSize: number = 5 * 1024 * 1024; // 5MB default
  @Input() acceptedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif'];

  // Reactive state signals
  protected readonly uploadState = signal<AvatarUploadState>({
    selectedFile: null,
    uploading: false,
    uploadProgress: 0,
    error: null,
    previewUrl: null,
    showModal: false,
  });

  // Computed properties
  protected readonly currentUser = this.authService.user;
  protected readonly currentAvatarUrl = computed(() => {
    const user = this.currentUser();
    return user?.avatarUrl || null;
  });

  /**
   * Handles file selection from the file upload component.
   */
  onFileSelect(event: FileSelectEvent): void {
    const file = event.files[0];
    if (!file) return;

    // Validate file
    if (!this.validateFile(file)) {
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Update state
    this.uploadState.update((state) => ({
      ...state,
      selectedFile: file,
      previewUrl,
      error: null,
    }));
  }

  /**
   * Handles file upload errors.
   */
  onFileError(event: any): void {
    this.uploadState.update((state) => ({
      ...state,
      error: 'File upload failed. Please try again.',
    }));
  }

  /**
   * Handles file clear event.
   */
  onFileClear(): void {
    const currentPreviewUrl = this.uploadState().previewUrl;
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
    }

    this.uploadState.update((state) => ({
      ...state,
      selectedFile: null,
      previewUrl: null,
      error: null,
    }));
  }

  /**
   * Uploads the selected avatar file.
   */
  uploadAvatar(): void {
    const file = this.uploadState().selectedFile;
    if (!file || this.uploadState().uploading) return;

    // Start upload process
    this.uploadState.update((state) => ({
      ...state,
      uploading: true,
      uploadProgress: 0,
      error: null,
    }));

    // Simulate progress for better UX (since HTTP upload progress is limited)
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
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser: User) => {
          // Success - clear the upload state and close modal
          this.onFileClear();
          this.uploadState.update((state) => ({
            ...state,
            uploadProgress: 100,
          }));

          // Close modal and reset progress after short delay
          setTimeout(() => {
            this.uploadState.update((state) => ({
              ...state,
              uploadProgress: 0,
              showModal: false,
            }));
          }, 1000);
        },
        error: (error: any) => {
          this.uploadState.update((state) => ({
            ...state,
            error: this.getErrorMessage(error),
            uploadProgress: 0,
          }));
        },
      });
  }

  /**
   * Shows confirmation dialog before removing avatar.
   */
  confirmRemoveAvatar(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to remove your avatar?',
      header: 'Remove Avatar',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.removeAvatar();
      },
    });
  }

  /**
   * Removes the current user avatar.
   */
  removeAvatar(): void {
    if (this.uploadState().uploading) return;

    this.uploadState.update((state) => ({
      ...state,
      uploading: true,
      error: null,
    }));

    this.profileService
      .deleteAvatar()
      .pipe(
        finalize(() => {
          this.uploadState.update((state) => ({
            ...state,
            uploading: false,
          }));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedUser: User) => {
          // Avatar removed successfully
          console.log('Avatar removed successfully');
        },
        error: (error: any) => {
          this.uploadState.update((state) => ({
            ...state,
            error: this.getErrorMessage(error),
          }));
        },
      });
  }

  /**
   * Handles image loading errors.
   */
  onImageError(): void {
    // Update user to remove broken avatar URL
    const currentUser = this.currentUser();
    if (currentUser?.avatarUrl) {
      const updatedUser = { ...currentUser, avatarUrl: undefined };
      this.authService.updateUserData(updatedUser);
    }
  }

  /**
   * Clears the current error message.
   */
  clearError(): void {
    this.uploadState.update((state) => ({
      ...state,
      error: null,
    }));
  }

  /**
   * Gets user initials for avatar placeholder.
   */
  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }

  /**
   * Formats file size for display.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validates the selected file.
   */
  private validateFile(file: File): boolean {
    // Check file type
    if (!this.acceptedTypes.includes(file.type)) {
      this.uploadState.update((state) => ({
        ...state,
        error: `Invalid file type. Please select a JPG, PNG, or GIF image.`,
      }));
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      this.uploadState.update((state) => ({
        ...state,
        error: `File is too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}.`,
      }));
      return false;
    }

    return true;
  }

  /**
   * Opens the avatar upload modal.
   */
  openModal(): void {
    this.uploadState.update((state) => ({
      ...state,
      showModal: true,
      error: null,
    }));
  }

  /**
   * Closes the avatar upload modal.
   */
  closeModal(): void {
    // Clear any selected file and preview when closing
    this.onFileClear();

    this.uploadState.update((state) => ({
      ...state,
      showModal: false,
      error: null,
    }));
  }

  /**
   * Gets user-friendly error message from HTTP error.
   */
  private getErrorMessage(error: any): string {
    if (error.status === 400) {
      return 'Invalid file format or size. Please check your image and try again.';
    } else if (error.status === 401) {
      return 'You are not authorized to upload an avatar.';
    } else if (error.status === 413) {
      return 'File is too large. Maximum size is 5MB.';
    } else if (error.status === 422) {
      return 'Invalid file format. Please use JPG, PNG, or GIF images.';
    } else if (error.status === 0) {
      return 'Network error. Please check your connection and try again.';
    } else {
      return 'Upload failed. Please try again later.';
    }
  }
}
