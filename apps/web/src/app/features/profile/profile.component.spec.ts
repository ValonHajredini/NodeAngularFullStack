import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { ProfileService } from './profile.service';
import { AuthService, User } from '@core/auth/auth.service';
import { signal } from '@angular/core';

/**
 * Test suite for ProfileComponent.
 * Tests profile display, form validation, updates, and error handling.
 */
describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-15')
  };

  beforeEach(async () => {
    const profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'getProfile',
      'updateProfile',
      'uploadAvatar',
      'deleteAvatar'
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['updateUserData'], {
      user: signal(mockUser)
    });

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with user data', () => {
    fixture.detectChanges();

    expect(component.profileForm.get('firstName')?.value).toBe(mockUser.firstName);
    expect(component.profileForm.get('lastName')?.value).toBe(mockUser.lastName);
    expect(component.profileForm.get('email')?.value).toBe(mockUser.email);
  });

  it('should validate required fields', () => {
    fixture.detectChanges();

    // Clear required fields
    component.profileForm.patchValue({
      firstName: '',
      lastName: ''
    });
    component.profileForm.markAllAsTouched();

    expect(component.profileForm.get('firstName')?.hasError('required')).toBeTruthy();
    expect(component.profileForm.get('lastName')?.hasError('required')).toBeTruthy();
  });

  it('should validate minimum length for names', () => {
    fixture.detectChanges();

    // Set values that are too short
    component.profileForm.patchValue({
      firstName: 'J',
      lastName: 'D'
    });
    component.profileForm.markAllAsTouched();

    expect(component.profileForm.get('firstName')?.hasError('minlength')).toBeTruthy();
    expect(component.profileForm.get('lastName')?.hasError('minlength')).toBeTruthy();
  });

  it('should detect form changes correctly', () => {
    fixture.detectChanges();

    // Initially no changes
    expect(component.hasChanges()).toBeFalsy();

    // Make a change
    component.profileForm.patchValue({ firstName: 'Jane' });
    expect(component.hasChanges()).toBeTruthy();
  });

  it('should reset form to original values', () => {
    fixture.detectChanges();

    // Make changes
    component.profileForm.patchValue({
      firstName: 'Jane',
      lastName: 'Smith'
    });

    // Reset form
    component.resetForm();

    expect(component.profileForm.get('firstName')?.value).toBe(mockUser.firstName);
    expect(component.profileForm.get('lastName')?.value).toBe(mockUser.lastName);
    expect(component.hasChanges()).toBeFalsy();
  });

  it('should update profile successfully', () => {
    const updatedUser: User = {
      ...mockUser,
      firstName: 'Jane',
      lastName: 'Smith'
    };

    profileService.updateProfile.and.returnValue(of(updatedUser));
    fixture.detectChanges();

    // Make changes and submit
    component.profileForm.patchValue({
      firstName: 'Jane',
      lastName: 'Smith'
    });
    component.onSubmit();

    expect(profileService.updateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Smith'
    });
    expect(component.successMessage()).toBe('Profile updated successfully!');
    expect(component.error()).toBeNull();
  });

  it('should handle profile update errors', () => {
    const error = { status: 400, error: { message: 'Invalid data' } };
    profileService.updateProfile.and.returnValue(throwError(() => error));
    fixture.detectChanges();

    // Make changes and submit
    component.profileForm.patchValue({
      firstName: 'Jane',
      lastName: 'Smith'
    });
    component.onSubmit();

    expect(component.error()).toBe('Invalid profile data. Please check your information and try again.');
    expect(component.successMessage()).toBeNull();
  });

  it('should generate correct user initials', () => {
    expect(component.getInitials('John', 'Doe')).toBe('JD');
    expect(component.getInitials('jane', 'smith')).toBe('JS');
  });

  it('should return correct role display names', () => {
    expect(component.getRoleDisplayName('admin')).toBe('Administrator');
    expect(component.getRoleDisplayName('user')).toBe('User');
    expect(component.getRoleDisplayName('readonly')).toBe('Read Only');
    expect(component.getRoleDisplayName('custom')).toBe('custom');
  });

  it('should format dates correctly', () => {
    const testDate = new Date('2023-01-15');
    const formatted = component.formatDate(testDate);

    // The exact format may vary by locale, but should contain year, month, day
    expect(formatted).toContain('2023');
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('15');
  });

  it('should not submit form if invalid', () => {
    fixture.detectChanges();

    // Make form invalid
    component.profileForm.patchValue({
      firstName: '',
      lastName: ''
    });

    component.onSubmit();

    expect(profileService.updateProfile).not.toHaveBeenCalled();
  });

  it('should not submit form if no changes', () => {
    fixture.detectChanges();

    // Form is valid but unchanged
    component.onSubmit();

    expect(profileService.updateProfile).not.toHaveBeenCalled();
  });

  it('should clear success message after timeout', (done) => {
    const updatedUser: User = { ...mockUser, firstName: 'Jane' };
    profileService.updateProfile.and.returnValue(of(updatedUser));
    fixture.detectChanges();

    // Make changes and submit
    component.profileForm.patchValue({ firstName: 'Jane' });
    component.onSubmit();

    expect(component.successMessage()).toBe('Profile updated successfully!');

    // Check that message is cleared after timeout (reduced for testing)
    setTimeout(() => {
      expect(component.successMessage()).toBeNull();
      done();
    }, 100);
  });
});