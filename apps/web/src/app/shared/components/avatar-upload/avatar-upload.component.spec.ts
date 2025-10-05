import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, signal } from '@angular/core';
import { of, throwError } from 'rxjs';

// PrimeNG Testing
import { ConfirmationService } from 'primeng/api';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AvatarUploadComponent } from './avatar-upload.component';
import { ProfileService } from '../../../features/profile/profile.service';
import { AuthService, User } from '@core/auth/auth.service';

/**
 * Mock user data for testing
 */
const mockUser: User = {
  id: 'test-id',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const mockUserWithoutAvatar: User = {
  ...mockUser,
  avatarUrl: undefined,
};

/**
 * Test wrapper component for testing avatar upload in isolation
 */
@Component({
  template: `
    <app-avatar-upload
      [maxFileSize]="maxFileSize"
      [acceptedTypes]="acceptedTypes"
    ></app-avatar-upload>
  `,
})
class TestWrapperComponent {
  maxFileSize = 5 * 1024 * 1024; // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif'];
}

describe('AvatarUploadComponent', () => {
  let component: AvatarUploadComponent;
  let fixture: ComponentFixture<AvatarUploadComponent>;
  let wrapperComponent: TestWrapperComponent;
  let wrapperFixture: ComponentFixture<TestWrapperComponent>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let authService: jasmine.SpyObj<AuthService>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;

  beforeEach(async () => {
    // Create spies for services
    const profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'uploadAvatar',
      'deleteAvatar',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['updateUserData'], {
      user: signal(mockUser),
    });
    const confirmationServiceSpy = jasmine.createSpyObj('ConfirmationService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        FileUploadModule,
        ButtonModule,
        ProgressBarModule,
        MessageModule,
        TooltipModule,
        ConfirmDialogModule,
        AvatarUploadComponent,
        TestWrapperComponent,
      ],
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
      ],
    }).compileComponents();

    // Set up service spies
    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    confirmationService = TestBed.inject(
      ConfirmationService,
    ) as jasmine.SpyObj<ConfirmationService>;

    // Create component fixtures
    fixture = TestBed.createComponent(AvatarUploadComponent);
    component = fixture.componentInstance;

    wrapperFixture = TestBed.createComponent(TestWrapperComponent);
    wrapperComponent = wrapperFixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default upload state', () => {
      fixture.detectChanges();

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBeNull();
      expect(uploadState.uploading).toBeFalse();
      expect(uploadState.uploadProgress).toBe(0);
      expect(uploadState.error).toBeNull();
      expect(uploadState.previewUrl).toBeNull();
    });

    it('should display current user avatar when available', () => {
      fixture.detectChanges();

      const avatarImage = fixture.nativeElement.querySelector('img[alt*="John Doe"]');
      expect(avatarImage).toBeTruthy();
      expect(avatarImage.src).toBe('https://example.com/avatar.jpg');
    });

    it('should display user initials when no avatar available', () => {
      Object.defineProperty(authService, 'user', {
        value: signal(mockUserWithoutAvatar),
        writable: true,
        configurable: true,
      });
      fixture.detectChanges();

      const initialsSpan = fixture.nativeElement.querySelector('.text-xl.font-bold.text-white');
      expect(initialsSpan).toBeTruthy();
      expect(initialsSpan.textContent.trim()).toBe('JD');
    });

    it('should display user icon when no user data available', () => {
      Object.defineProperty(authService, 'user', {
        value: signal(null),
        writable: true,
        configurable: true,
      });
      fixture.detectChanges();

      const userIcon = fixture.nativeElement.querySelector('.pi-user');
      expect(userIcon).toBeTruthy();
    });
  });

  describe('File Selection and Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should accept valid file types', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const event = { files: [file] };

      component.onFileSelect(event as any);

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBe(file);
      expect(uploadState.error).toBeNull();
      expect(uploadState.previewUrl).toBeTruthy();
    });

    it('should reject invalid file types', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const event = { files: [file] };

      component.onFileSelect(event as any);

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBeNull();
      expect(uploadState.error).toContain('Invalid file type');
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const event = { files: [largeFile] };

      component.onFileSelect(event as any);

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBeNull();
      expect(uploadState.error).toContain('File is too large');
    });

    it('should create preview URL for selected file', () => {
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const event = { files: [file] };

      component.onFileSelect(event as any);

      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      const uploadState = component['uploadState']();
      expect(uploadState.previewUrl).toBe('blob:mock-url');
    });
  });

  describe('File Upload Process', () => {
    beforeEach(() => {
      fixture.detectChanges();
      profileService.uploadAvatar.and.returnValue(of(mockUser));
    });

    it('should upload avatar successfully', fakeAsync(() => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component['uploadState'].update((state) => ({
        ...state,
        selectedFile: file,
      }));

      component.uploadAvatar();
      tick(100);

      expect(profileService.uploadAvatar).toHaveBeenCalledWith(file);

      // Complete the upload
      tick(2000);
      fixture.detectChanges();

      const uploadState = component['uploadState']();
      expect(uploadState.uploading).toBeFalse();
      expect(uploadState.uploadProgress).toBe(100);
    }));

    it('should show upload progress during upload', fakeAsync(() => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component['uploadState'].update((state) => ({
        ...state,
        selectedFile: file,
      }));

      component.uploadAvatar();

      let uploadState = component['uploadState']();
      expect(uploadState.uploading).toBeTrue();
      expect(uploadState.uploadProgress).toBe(0);

      // Advance progress
      tick(200);
      uploadState = component['uploadState']();
      expect(uploadState.uploadProgress).toBeGreaterThan(0);
      expect(uploadState.uploadProgress).toBeLessThan(100);

      tick(2000);
    }));

    it('should handle upload errors gracefully', fakeAsync(() => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component['uploadState'].update((state) => ({
        ...state,
        selectedFile: file,
      }));

      profileService.uploadAvatar.and.returnValue(
        throwError(() => ({ status: 413, error: { message: 'File too large' } })),
      );

      component.uploadAvatar();
      tick(2000);

      const uploadState = component['uploadState']();
      expect(uploadState.uploading).toBeFalse();
      expect(uploadState.error).toContain('File is too large');
      expect(uploadState.uploadProgress).toBe(0);
    }));

    it('should not upload if no file selected', () => {
      component.uploadAvatar();

      expect(profileService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('should not upload if already uploading', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component['uploadState'].update((state) => ({
        ...state,
        selectedFile: file,
        uploading: true,
      }));

      component.uploadAvatar();

      expect(profileService.uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('Avatar Removal', () => {
    beforeEach(() => {
      fixture.detectChanges();
      profileService.deleteAvatar.and.returnValue(of(mockUserWithoutAvatar));
    });

    it('should show confirmation dialog before removing avatar', () => {
      component.confirmRemoveAvatar();

      expect(confirmationService.confirm).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: 'Are you sure you want to remove your avatar?',
          header: 'Remove Avatar',
          icon: 'pi pi-exclamation-triangle',
        }),
      );
    });

    it('should remove avatar when confirmed', () => {
      confirmationService.confirm.and.callFake((options: unknown) => {
        if (options && typeof options === 'object' && 'accept' in options) {
          (options as { accept: () => void }).accept();
        }
        return confirmationService;
      });

      component.confirmRemoveAvatar();

      expect(profileService.deleteAvatar).toHaveBeenCalled();
    });

    it('should handle avatar removal errors', fakeAsync(() => {
      profileService.deleteAvatar.and.returnValue(
        throwError(() => ({ status: 500, error: { message: 'Server error' } })),
      );

      component.removeAvatar();
      tick();

      const uploadState = component['uploadState']();
      expect(uploadState.error).toBeTruthy();
      expect(uploadState.uploading).toBeFalse();
    }));

    it('should not remove avatar if already uploading', () => {
      component['uploadState'].update((state) => ({
        ...state,
        uploading: true,
      }));

      component.removeAvatar();

      expect(profileService.deleteAvatar).not.toHaveBeenCalled();
    });
  });

  describe('File Clear Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear selected file and preview URL', () => {
      spyOn(URL, 'revokeObjectURL');

      component['uploadState'].update((state) => ({
        ...state,
        selectedFile: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:mock-url',
      }));

      component.onFileClear();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBeNull();
      expect(uploadState.previewUrl).toBeNull();
      expect(uploadState.error).toBeNull();
    });

    it('should handle clear when no preview URL exists', () => {
      spyOn(URL, 'revokeObjectURL');

      component.onFileClear();

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      const uploadState = component['uploadState']();
      expect(uploadState.selectedFile).toBeNull();
      expect(uploadState.previewUrl).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should clear error messages', () => {
      component['uploadState'].update((state) => ({
        ...state,
        error: 'Test error message',
      }));

      component.clearError();

      const uploadState = component['uploadState']();
      expect(uploadState.error).toBeNull();
    });

    it('should handle image loading errors', () => {
      spyOn(authService, 'updateUserData');

      component.onImageError();

      expect(authService.updateUserData).toHaveBeenCalledWith(
        jasmine.objectContaining({
          ...mockUser,
          avatarUrl: undefined,
        }),
      );
    });

    it('should provide appropriate error messages for different HTTP status codes', () => {
      const testCases = [
        { status: 400, expectedMessage: 'Invalid file format or size' },
        { status: 401, expectedMessage: 'You are not authorized' },
        { status: 413, expectedMessage: 'File is too large' },
        { status: 422, expectedMessage: 'Invalid file format' },
        { status: 0, expectedMessage: 'Network error' },
        { status: 500, expectedMessage: 'Upload failed' },
      ];

      testCases.forEach((testCase) => {
        const errorMessage = component['getErrorMessage']({
          status: testCase.status,
          error: { message: 'Server error' },
        });

        expect(errorMessage).toContain(testCase.expectedMessage);
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should generate correct user initials', () => {
      const initials = component.getInitials('John', 'Doe');
      expect(initials).toBe('JD');

      const initials2 = component.getInitials('alice', 'smith');
      expect(initials2).toBe('AS');
    });

    it('should format file sizes correctly', () => {
      expect(component.formatFileSize(0)).toBe('0 Bytes');
      expect(component.formatFileSize(1024)).toBe('1 KB');
      expect(component.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(component.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(component.formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('Component Configuration', () => {
    it('should accept custom file size limit', () => {
      wrapperComponent.maxFileSize = 10 * 1024 * 1024; // 10MB
      wrapperFixture.detectChanges();

      const avatarUploadElement = wrapperFixture.nativeElement.querySelector('app-avatar-upload');
      expect(avatarUploadElement).toBeTruthy();

      // Access the component instance through the fixture
      const avatarComponent = wrapperFixture.debugElement.children[0].componentInstance;
      expect(avatarComponent.maxFileSize).toBe(10 * 1024 * 1024);
    });

    it('should accept custom accepted file types', () => {
      wrapperComponent.acceptedTypes = ['image/png', 'image/gif'];
      wrapperFixture.detectChanges();

      const avatarComponent = wrapperFixture.debugElement.children[0].componentInstance;
      expect(avatarComponent.acceptedTypes).toEqual(['image/png', 'image/gif']);
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have responsive CSS classes', () => {
      const container = fixture.nativeElement.querySelector('.avatar-upload-container');
      expect(container.classList).toContain('w-full');
      expect(container.classList).toContain('max-w-md');
      expect(container.classList).toContain('mx-auto');
    });

    it('should have proper mobile-friendly button sizes', () => {
      const uploadButton = fixture.nativeElement.querySelector('.absolute.-bottom-1.-right-1');
      expect(uploadButton).toBeTruthy();
      expect(uploadButton.classList).toContain('p-2');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper alt text for avatar image', () => {
      const avatarImage = fixture.nativeElement.querySelector('img[alt*="John Doe"]');
      expect(avatarImage).toBeTruthy();
      expect(avatarImage.getAttribute('alt')).toBe('John Doe');
    });

    it('should have tooltip for upload button', () => {
      const uploadButton = fixture.nativeElement.querySelector('button[pTooltip]');
      expect(uploadButton).toBeTruthy();
      expect(uploadButton.getAttribute('pTooltip')).toBe('Upload avatar');
    });

    it('should disable buttons during upload', () => {
      component['uploadState'].update((state) => ({
        ...state,
        uploading: true,
      }));
      fixture.detectChanges();

      const uploadButton = fixture.nativeElement.querySelector('button[pTooltip]');
      expect(uploadButton.disabled).toBeTruthy();
    });
  });
});
