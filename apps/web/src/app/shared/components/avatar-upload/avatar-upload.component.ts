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
  ],
  providers: [ConfirmationService],
  template: `
    <div class="avatar-upload-container w-full max-w-md mx-auto">
      <!-- Current Avatar Display -->
      <div class="flex flex-col items-center mb-6">
        <div class="relative">
          @if (currentAvatarUrl()) {
            <img
              [src]="currentAvatarUrl()"
              [alt]="currentUser()?.firstName + ' ' + currentUser()?.lastName"
              class="h-24 w-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
              (error)="onImageError()"
            />
          } @else {
            <!-- Default Avatar Placeholder -->
            <div
              class="h-24 w-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center border-2 border-gray-200 shadow-sm"
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

          <!-- Avatar Upload Button Overlay -->
          <button
            type="button"
            class="absolute -bottom-1 -right-1 bg-primary-600 hover:bg-primary-700 rounded-full p-2 shadow-lg border-2 border-white transition-colors duration-200"
            pTooltip="Upload avatar"
            tooltipPosition="top"
            (click)="fileUpload.choose()"
            [disabled]="uploadState().uploading"
          >
            <i class="pi pi-camera text-white text-sm"></i>
          </button>
        </div>

        @if (currentUser()) {
          <h3 class="mt-3 text-lg font-medium text-gray-900">
            {{ currentUser()!.firstName }} {{ currentUser()!.lastName }}
          </h3>
        }
      </div>

      <!-- File Upload Section -->
      <div class="space-y-4">
        <!-- Upload Progress -->
        @if (uploadState().uploading) {
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">Uploading avatar...</span>
              <span class="text-sm text-gray-500">{{ uploadState().uploadProgress }}%</span>
            </div>
            <p-progressBar [value]="uploadState().uploadProgress" styleClass="h-2"></p-progressBar>
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

        <!-- File Upload Component -->
        <p-fileUpload
          #fileUpload
          mode="advanced"
          accept="image/jpeg,image/png,image/gif"
          [maxFileSize]="maxFileSize"
          [auto]="true"
          chooseLabel="Choose Avatar"
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
                    @if (uploadState().previewUrl) {
                      <img
                        [src]="uploadState().previewUrl"
                        alt="Preview"
                        class="h-12 w-12 rounded-full object-cover border border-gray-200"
                      />
                    }
                    <div class="flex-1">
                      <div class="text-sm font-medium text-gray-900">{{ file.name }}</div>
                      <div class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</div>
                    </div>
                    <button
                      type="button"
                      (click)="uploadAvatar()"
                      [disabled]="uploadState().uploading"
                      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      @if (uploadState().uploading) {
                        <div class="flex items-center">
                          <div
                            class="animate-spin -ml-1 mr-2 h-3 w-3 border border-white border-t-transparent rounded-full"
                          ></div>
                          Uploading...
                        </div>
                      } @else {
                        <i class="pi pi-upload mr-1"></i>
                        Upload
                      }
                    </button>
                  </div>
                }
              </div>
            } @else {
              <!-- Drop Zone -->
              <div
                class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
              >
                <i class="pi pi-cloud-upload text-3xl text-gray-400 mb-3"></i>
                <p class="text-sm text-gray-600 mb-1">
                  <span
                    class="font-semibold text-primary-600 hover:text-primary-500 cursor-pointer"
                  >
                    Click to upload
                  </span>
                  or drag and drop
                </p>
                <p class="text-xs text-gray-500">
                  JPG, PNG or GIF (max {{ formatFileSize(maxFileSize) }})
                </p>
              </div>
            }
          </ng-template>
        </p-fileUpload>

        <!-- Remove Avatar Button -->
        @if (currentAvatarUrl() && !uploadState().uploading) {
          <div class="pt-4 border-t border-gray-200">
            <button
              type="button"
              (click)="confirmRemoveAvatar()"
              class="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              <i class="pi pi-trash mr-2"></i>
              Remove Avatar
            </button>
          </div>
        }
      </div>

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

      ::ng-deep .p-fileupload-dragdrop {
        border: 2px dashed #d1d5db !important;
        background: #f9fafb !important;
        transition: all 0.2s ease-in-out;
      }

      ::ng-deep .p-fileupload-dragdrop:hover {
        background: #f3f4f6 !important;
        border-color: #9ca3af !important;
      }

      ::ng-deep .p-fileupload-dragdrop.p-fileupload-dragover {
        border-color: #3b82f6 !important;
        background: #eff6ff !important;
      }

      ::ng-deep .p-progressbar {
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
      }

      ::ng-deep .p-progressbar .p-progressbar-value {
        background: linear-gradient(to right, #3b82f6, #1d4ed8);
        transition: width 0.3s ease-in-out;
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

    (this.profileService as any)
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
          // Success - clear the upload state
          this.onFileClear();
          this.uploadState.update((state) => ({
            ...state,
            uploadProgress: 100,
          }));

          // Reset progress after short delay
          setTimeout(() => {
            this.uploadState.update((state) => ({
              ...state,
              uploadProgress: 0,
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

    (this.profileService as any)
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
