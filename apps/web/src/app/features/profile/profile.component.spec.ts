import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { ProfileService } from './profile.service';
import { AuthService, User } from '@core/auth/auth.service';
import { TokenService } from '@core/services/token.service';
import { signal } from '@angular/core';
import {
  CreateApiTokenRequest,
  CreateApiTokenResponse,
  ApiTokenListResponse,
} from '@nodeangularfullstack/shared';

/**
 * Test suite for ProfileComponent.
 * Tests profile display, form validation, updates, and error handling.
 */
describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let authService: jasmine.SpyObj<AuthService>;
  let tokenService: jasmine.SpyObj<TokenService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-15'),
  };

  const mockTokens: ApiTokenListResponse[] = [
    {
      id: 'token-1',
      name: 'Test Token 1',
      scopes: ['read', 'write'],
      expiresAt: '2025-09-25T20:00:00.000Z',
      createdAt: '2024-09-25T20:00:00.000Z',
      lastUsedAt: '2024-09-26T10:00:00.000Z',
      isActive: true,
    },
    {
      id: 'token-2',
      name: 'Test Token 2',
      scopes: ['read'],
      expiresAt: '2025-12-25T20:00:00.000Z',
      createdAt: '2024-08-15T15:30:00.000Z',
      isActive: false,
    },
  ];

  const mockCreateTokenResponse: CreateApiTokenResponse = {
    id: 'new-token',
    token: 'api_token_plaintext_value',
    name: 'New Test Token',
    scopes: ['read', 'write'],
    expiresAt: '2025-09-25T20:00:00.000Z',
  };

  beforeEach(async () => {
    const profileServiceSpy = jasmine.createSpyObj('ProfileService', [
      'getProfile',
      'updateProfile',
      'uploadAvatar',
      'deleteAvatar',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['updateUserData'], {
      user: signal(mockUser),
    });
    const tokenServiceSpy = jasmine.createSpyObj(
      'TokenService',
      [
        'getTokens',
        'createToken',
        'revokeToken',
        'updateToken',
        'getTokenById',
        'clearError',
        'refreshTokens',
      ],
      {
        tokens: signal(mockTokens),
        loading: signal(false),
        error: signal(null),
      },
    );

    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        ReactiveFormsModule,
        RouterTestingModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: ProfileService, useValue: profileServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TokenService, useValue: tokenServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    profileService = TestBed.inject(ProfileService) as jasmine.SpyObj<ProfileService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    tokenService = TestBed.inject(TokenService) as jasmine.SpyObj<TokenService>;

    // Set up default token service behavior
    tokenService.getTokens.and.returnValue(of(mockTokens));
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
      lastName: '',
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
      lastName: 'D',
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
      lastName: 'Smith',
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
      lastName: 'Smith',
    };

    profileService.updateProfile.and.returnValue(of(updatedUser));
    fixture.detectChanges();

    // Make changes and submit
    component.profileForm.patchValue({
      firstName: 'Jane',
      lastName: 'Smith',
    });
    component.onSubmit();

    expect(profileService.updateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Smith',
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
      lastName: 'Smith',
    });
    component.onSubmit();

    expect(component.error()).toBe(
      'Invalid profile data. Please check your information and try again.',
    );
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

  it('should format date strings correctly', () => {
    const testDateString = '2023-01-15T10:00:00.000Z';
    const formatted = component.formatDateString(testDateString);

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
      lastName: '',
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

  // Token Management Tests
  describe('Token Management', () => {
    it('should load tokens on initialization', () => {
      fixture.detectChanges();

      expect(tokenService.getTokens).toHaveBeenCalled();
    });

    it('should initialize token form with default values', () => {
      fixture.detectChanges();

      expect(component.tokenForm.get('name')?.value).toBe('');
      expect(component.tokenForm.get('readScope')?.value).toBe(true);
      expect(component.tokenForm.get('writeScope')?.value).toBe(false);
    });

    it('should validate token form correctly', () => {
      fixture.detectChanges();

      // Test required name validation
      component.tokenForm.patchValue({ name: '' });
      component.tokenForm.markAllAsTouched();
      expect(component.tokenForm.get('name')?.hasError('required')).toBeTruthy();

      // Test minlength validation
      component.tokenForm.patchValue({ name: 'ab' });
      expect(component.tokenForm.get('name')?.hasError('minlength')).toBeTruthy();

      // Test maxlength validation
      const longName = 'a'.repeat(101);
      component.tokenForm.patchValue({ name: longName });
      expect(component.tokenForm.get('name')?.hasError('maxlength')).toBeTruthy();

      // Test valid name
      component.tokenForm.patchValue({ name: 'Valid Token Name' });
      expect(component.tokenForm.get('name')?.hasError('required')).toBeFalsy();
      expect(component.tokenForm.get('name')?.hasError('minlength')).toBeFalsy();
      expect(component.tokenForm.get('name')?.hasError('maxlength')).toBeFalsy();
    });

    it('should validate scope selection', () => {
      fixture.detectChanges();

      // Test no scopes selected
      component.tokenForm.patchValue({
        readScope: false,
        writeScope: false,
      });
      expect(component.tokenForm.hasError('noScopes')).toBeTruthy();

      // Test at least one scope selected
      component.tokenForm.patchValue({
        readScope: true,
        writeScope: false,
      });
      expect(component.tokenForm.hasError('noScopes')).toBeFalsy();
    });

    it('should create token successfully', () => {
      tokenService.createToken.and.returnValue(of(mockCreateTokenResponse));
      fixture.detectChanges();

      // Fill form
      component.tokenForm.patchValue({
        name: 'Test Token',
        readScope: true,
        writeScope: true,
      });

      // Submit form
      component.onCreateToken();

      const expectedRequest: CreateApiTokenRequest = {
        name: 'Test Token',
        scopes: ['read', 'write'],
      };

      expect(tokenService.createToken).toHaveBeenCalledWith(expectedRequest);
      expect(component.createdToken()).toBe('api_token_plaintext_value');
      expect(component.tokenSuccessMessage()).toBe('Token created successfully!');
    });

    it('should handle token creation with only read scope', () => {
      tokenService.createToken.and.returnValue(of(mockCreateTokenResponse));
      fixture.detectChanges();

      // Fill form with only read scope
      component.tokenForm.patchValue({
        name: 'Read Only Token',
        readScope: true,
        writeScope: false,
      });

      // Submit form
      component.onCreateToken();

      const expectedRequest: CreateApiTokenRequest = {
        name: 'Read Only Token',
        scopes: ['read'],
      };

      expect(tokenService.createToken).toHaveBeenCalledWith(expectedRequest);
    });

    it('should handle token creation errors', () => {
      const error = { error: { error: { message: 'Token name already exists' } } };
      tokenService.createToken.and.returnValue(throwError(() => error));
      fixture.detectChanges();

      // Fill form
      component.tokenForm.patchValue({
        name: 'Duplicate Token',
        readScope: true,
        writeScope: false,
      });

      // Submit form
      component.onCreateToken();

      expect(tokenService.createToken).toHaveBeenCalled();
      expect(component.createdToken()).toBeNull();
      expect(component.tokenSuccessMessage()).toBeNull();
    });

    it('should not create token if form is invalid', () => {
      fixture.detectChanges();

      // Submit invalid form
      component.onCreateToken();

      expect(tokenService.createToken).not.toHaveBeenCalled();
    });

    it('should toggle create token form visibility', () => {
      fixture.detectChanges();

      expect(component.showCreateTokenForm()).toBeFalsy();

      // Show form
      component.showCreateTokenForm.set(true);
      expect(component.showCreateTokenForm()).toBeTruthy();

      // Hide form
      component.showCreateTokenForm.set(false);
      expect(component.showCreateTokenForm()).toBeFalsy();
    });

    it('should cancel token creation and reset form', () => {
      fixture.detectChanges();

      // Show form and fill it
      component.showCreateTokenForm.set(true);
      component.tokenForm.patchValue({
        name: 'Test Token',
        readScope: false,
        writeScope: true,
      });
      component.tokenSuccessMessage.set('Some success message');
      component.createdToken.set('some_token');

      // Cancel creation
      component.cancelTokenCreation();

      expect(component.showCreateTokenForm()).toBeFalsy();
      expect(component.tokenForm.get('name')?.value).toBe('');
      expect(component.tokenForm.get('readScope')?.value).toBe(true);
      expect(component.tokenForm.get('writeScope')?.value).toBe(false);
      expect(component.tokenSuccessMessage()).toBeNull();
      expect(component.createdToken()).toBeNull();
    });

    it('should confirm and revoke token', () => {
      tokenService.revokeToken.and.returnValue(of(undefined));
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();

      const tokenToRevoke = mockTokens[0];

      // Confirm revoke
      component.confirmRevokeToken(tokenToRevoke);

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to revoke the token "Test Token 1"? This action cannot be undone.',
      );
      expect(tokenService.revokeToken).toHaveBeenCalledWith('token-1');
    });

    it('should not revoke token if user cancels confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      fixture.detectChanges();

      const tokenToRevoke = mockTokens[0];

      // Cancel revoke
      component.confirmRevokeToken(tokenToRevoke);

      expect(window.confirm).toHaveBeenCalled();
      expect(tokenService.revokeToken).not.toHaveBeenCalled();
    });

    it('should handle token revocation errors', () => {
      const error = { error: { error: { message: 'Token not found' } } };
      tokenService.revokeToken.and.returnValue(throwError(() => error));
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(console, 'error');
      fixture.detectChanges();

      const tokenToRevoke = mockTokens[0];

      // Confirm revoke
      component.confirmRevokeToken(tokenToRevoke);

      expect(tokenService.revokeToken).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Token revocation failed:', error);
    });

    it('should copy token to clipboard', async () => {
      const mockClipboard = {
        writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve()),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      const testToken = 'test_token_value';

      await component.copyToClipboard(testToken);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(testToken);
    });

    it('should use fallback clipboard method if modern API fails', () => {
      // Mock navigator.clipboard to be unavailable
      Object.defineProperty(navigator, 'clipboard', { value: undefined });

      // Mock document methods for fallback
      const mockTextArea = {
        value: '',
        select: jasmine.createSpy('select'),
        remove: jasmine.createSpy('remove'),
      };
      spyOn(document, 'createElement').and.returnValue(mockTextArea as any);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(document, 'execCommand').and.returnValue(true);

      const testToken = 'test_token_value';

      component.copyToClipboard(testToken);

      expect(document.createElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe(testToken);
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should clear token success messages', () => {
      fixture.detectChanges();

      // Set success messages
      component.tokenSuccessMessage.set('Success message');
      component.createdToken.set('some_token');
      component.showCreateTokenForm.set(true);

      // Clear success
      component.clearTokenSuccess();

      expect(component.tokenSuccessMessage()).toBeNull();
      expect(component.createdToken()).toBeNull();
      expect(component.showCreateTokenForm()).toBeFalsy();
    });

    it('should clear token service errors', () => {
      fixture.detectChanges();

      // Clear error
      component.tokenService.clearError();

      expect(tokenService.clearError).toHaveBeenCalled();
    });

    it('should not interfere with existing profile functionality', () => {
      const updatedUser: User = { ...mockUser, firstName: 'Jane' };
      profileService.updateProfile.and.returnValue(of(updatedUser));
      fixture.detectChanges();

      // Test that profile update still works with token functionality present
      component.profileForm.patchValue({ firstName: 'Jane' });
      component.onSubmit();

      expect(profileService.updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe', // Original last name should be preserved
      });
      expect(component.successMessage()).toBe('Profile updated successfully!');

      // Verify token functionality is still accessible
      expect(component.tokens()).toEqual(mockTokens);
      expect(component.tokenForm).toBeDefined();
      expect(component.showCreateTokenForm()).toBeDefined();
    });
  });
});
