import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarUploaderComponent, AvatarUploaderConfig } from './avatar-uploader.component';
import { User } from '@core/auth/auth.service';

/**
 * Example component demonstrating different usage patterns of the AvatarUploaderComponent
 *
 * This component shows various configurations and use cases for the shared avatar uploader:
 * - Simple avatar display with modal
 * - Compact avatar for lists/cards
 * - Avatar with trigger button
 * - Custom styled avatar
 * - Auto-upload configuration
 */
@Component({
  selector: 'app-avatar-uploader-examples',
  standalone: true,
  imports: [CommonModule, AvatarUploaderComponent],
  template: `
    <div class="max-w-4xl mx-auto p-6 space-y-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Avatar Uploader Examples</h1>

      <!-- Example 1: Profile Page Style -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Profile Page Style</h2>
        <p class="text-gray-600 mb-4">Large avatar for profile pages with confirmation dialogs</p>

        <div class="flex justify-center">
          <app-avatar-uploader
            [currentAvatarUrl]="profileAvatarUrl()"
            [config]="profileConfig()"
            (onUploadSuccess)="handleProfileUpload($event)"
            (onUploadError)="handleError($event)"
          >
          </app-avatar-uploader>
        </div>
      </div>

      <!-- Example 2: Compact Card Style -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Compact Card Style</h2>
        <p class="text-gray-600 mb-4">Small avatar for user cards or lists</p>

        <div class="flex items-center space-x-4">
          <app-avatar-uploader
            [currentAvatarUrl]="cardAvatarUrl()"
            [config]="compactConfig()"
            (onUploadSuccess)="handleCardUpload($event)"
            (onUploadError)="handleError($event)"
          >
          </app-avatar-uploader>

          <div>
            <h3 class="font-medium">John Doe</h3>
            <p class="text-sm text-gray-500">Software Developer</p>
          </div>
        </div>
      </div>

      <!-- Example 3: With Trigger Button -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">With Trigger Button</h2>
        <p class="text-gray-600 mb-4">Avatar with separate upload button</p>

        <div class="flex items-center space-x-6">
          <app-avatar-uploader
            [currentAvatarUrl]="buttonAvatarUrl()"
            [config]="buttonConfig()"
            (onUploadSuccess)="handleButtonUpload($event)"
            (onUploadError)="handleError($event)"
          >
          </app-avatar-uploader>
        </div>
      </div>

      <!-- Example 4: Auto-Upload Style -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Auto-Upload Style</h2>
        <p class="text-gray-600 mb-4">Automatically uploads when file is selected</p>

        <div class="flex justify-center">
          <app-avatar-uploader
            [currentAvatarUrl]="autoAvatarUrl()"
            [config]="autoUploadConfig()"
            (onUploadSuccess)="handleAutoUpload($event)"
            (onUploadError)="handleError($event)"
          >
          </app-avatar-uploader>
        </div>
      </div>

      <!-- Example 5: Custom Styled (Square) -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">Custom Styled (Square)</h2>
        <p class="text-gray-600 mb-4">Square avatar with custom styling</p>

        <div class="flex justify-center">
          <app-avatar-uploader
            [currentAvatarUrl]="squareAvatarUrl()"
            [config]="squareConfig()"
            (onUploadSuccess)="handleSquareUpload($event)"
            (onUploadError)="handleError($event)"
          >
          </app-avatar-uploader>
        </div>
      </div>

      <!-- Status Messages -->
      @if (statusMessage()) {
        <div class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {{ statusMessage() }}
        </div>
      }

      @if (errorMessage()) {
        <div class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {{ errorMessage() }}
        </div>
      }
    </div>
  `,
})
export class AvatarUploaderExamplesComponent {
  // Avatar URLs for different examples
  profileAvatarUrl = signal<string | null>(
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  );
  cardAvatarUrl = signal<string | null>(
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  );
  buttonAvatarUrl = signal<string | null>(null);
  autoAvatarUrl = signal<string | null>(
    'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  );
  squareAvatarUrl = signal<string | null>(null);

  // Status messages
  statusMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Configuration for profile page style
  profileConfig = signal<AvatarUploaderConfig>({
    modalTitle: 'Update Profile Picture',
    modalWidth: '600px',
    avatarSize: '120px',
    borderRadius: '50%',
    maxFileSize: 5242880, // 5MB
    acceptedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    confirmDelete: true,
    autoUpload: false,
  });

  // Configuration for compact card style
  compactConfig = signal<AvatarUploaderConfig>({
    modalTitle: 'Update Avatar',
    modalWidth: '500px',
    avatarSize: '60px',
    borderRadius: '50%',
    maxFileSize: 2097152, // 2MB
    acceptedFormats: ['.jpg', '.jpeg', '.png'],
    confirmDelete: false,
    autoUpload: false,
  });

  // Configuration with trigger button
  buttonConfig = signal<AvatarUploaderConfig>({
    showTriggerButton: true,
    triggerButtonLabel: 'Upload Photo',
    triggerButtonIcon: 'pi pi-upload',
    triggerButtonClass:
      'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors',
    modalTitle: 'Upload New Photo',
    modalWidth: '550px',
    avatarSize: '100px',
    borderRadius: '50%',
    maxFileSize: 3145728, // 3MB
    acceptedFormats: ['.jpg', '.jpeg', '.png'],
    confirmDelete: true,
    autoUpload: false,
  });

  // Configuration for auto-upload
  autoUploadConfig = signal<AvatarUploaderConfig>({
    modalTitle: 'Quick Upload',
    modalWidth: '500px',
    avatarSize: '100px',
    borderRadius: '50%',
    maxFileSize: 2097152, // 2MB
    acceptedFormats: ['.jpg', '.jpeg', '.png'],
    confirmDelete: false,
    autoUpload: true, // Files upload immediately when selected
  });

  // Configuration for square avatar
  squareConfig = signal<AvatarUploaderConfig>({
    modalTitle: 'Update Logo',
    modalWidth: '550px',
    avatarSize: '100px',
    borderRadius: '8px', // Square with rounded corners
    maxFileSize: 5242880, // 5MB
    acceptedFormats: ['.jpg', '.jpeg', '.png', '.svg'],
    confirmDelete: true,
    autoUpload: false,
  });

  // Event handlers
  handleProfileUpload(user: User): void {
    this.profileAvatarUrl.set(user.avatarUrl || null);
    this.showSuccess('Profile picture updated successfully!');
  }

  handleCardUpload(user: User): void {
    this.cardAvatarUrl.set(user.avatarUrl || null);
    this.showSuccess('Card avatar updated!');
  }

  handleButtonUpload(user: User): void {
    this.buttonAvatarUrl.set(user.avatarUrl || null);
    this.showSuccess('Photo uploaded successfully!');
  }

  handleAutoUpload(user: User): void {
    this.autoAvatarUrl.set(user.avatarUrl || null);
    this.showSuccess('Auto-upload completed!');
  }

  handleSquareUpload(user: User): void {
    this.squareAvatarUrl.set(user.avatarUrl || null);
    this.showSuccess('Logo updated successfully!');
  }

  handleError(error: string): void {
    this.showError(error);
  }

  private showSuccess(message: string): void {
    this.statusMessage.set(message);
    this.errorMessage.set(null);
    setTimeout(() => {
      this.statusMessage.set(null);
    }, 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.statusMessage.set(null);
    setTimeout(() => {
      this.errorMessage.set(null);
    }, 5000);
  }
}

/*
USAGE EXAMPLES:

1. Basic Usage:
<app-avatar-uploader
  [currentAvatarUrl]="user?.avatarUrl"
  (onUploadSuccess)="handleUploadSuccess($event)">
</app-avatar-uploader>

2. With Custom Configuration:
<app-avatar-uploader
  [currentAvatarUrl]="user?.avatarUrl"
  [config]="{
    modalTitle: 'Update Your Photo',
    avatarSize: '80px',
    maxFileSize: 2097152,
    autoUpload: true
  }"
  (onUploadSuccess)="handleUploadSuccess($event)"
  (onUploadError)="handleUploadError($event)">
</app-avatar-uploader>

3. With Trigger Button:
<app-avatar-uploader
  [currentAvatarUrl]="user?.avatarUrl"
  [config]="{
    showTriggerButton: true,
    triggerButtonLabel: 'Change Photo',
    triggerButtonIcon: 'pi pi-camera'
  }"
  (onUploadSuccess)="handleUploadSuccess($event)">
</app-avatar-uploader>

4. Compact for Lists:
<app-avatar-uploader
  [currentAvatarUrl]="user?.avatarUrl"
  [config]="{
    avatarSize: '40px',
    modalWidth: '400px',
    confirmDelete: false
  }"
  (onUploadSuccess)="handleUploadSuccess($event)">
</app-avatar-uploader>

5. Square Logo Upload:
<app-avatar-uploader
  [currentAvatarUrl]="company?.logoUrl"
  [config]="{
    modalTitle: 'Upload Company Logo',
    avatarSize: '120px',
    borderRadius: '8px',
    acceptedFormats: ['.jpg', '.png', '.svg']
  }"
  (onUploadSuccess)="handleLogoUpload($event)">
</app-avatar-uploader>
*/
