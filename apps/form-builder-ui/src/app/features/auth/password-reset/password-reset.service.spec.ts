import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '@core/auth/auth.service';
import { ApiClientService } from '@core/api/api-client.service';

/**
 * Test suite for password reset functionality in AuthService.
 * Tests the integration between password reset components and API.
 */
describe('AuthService - Password Reset', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let apiClient: ApiClientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, ApiClientService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    apiClient = TestBed.inject(ApiClientService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('requestPasswordReset', () => {
    it('should send password reset request successfully', () => {
      const email = 'test@example.com';

      service.requestPasswordReset(email).subscribe({
        next: () => expect(true).toBeTruthy(),
        error: () => fail('Request should succeed')
      });

      const req = httpMock.expectOne('/auth/password-reset-request');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });

      req.flush({});
    });

    it('should handle password reset request errors', () => {
      const email = 'nonexistent@example.com';

      service.requestPasswordReset(email).subscribe({
        next: () => fail('Request should fail'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toBe('User not found');
        }
      });

      const req = httpMock.expectOne('/auth/password-reset-request');
      req.flush({ message: 'User not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate reset token successfully', () => {
      const token = 'valid-reset-token';

      service.validatePasswordResetToken(token).subscribe({
        next: () => expect(true).toBeTruthy(),
        error: () => fail('Validation should succeed')
      });

      const req = httpMock.expectOne('/auth/password-reset-validate');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token });

      req.flush({});
    });

    it('should handle invalid reset token', () => {
      const token = 'invalid-token';

      service.validatePasswordResetToken(token).subscribe({
        next: () => fail('Validation should fail'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Invalid or expired token');
        }
      });

      const req = httpMock.expectOne('/auth/password-reset-validate');
      req.flush({ message: 'Invalid or expired token' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('confirmPasswordReset', () => {
    it('should confirm password reset successfully', () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123!';

      service.confirmPasswordReset(token, newPassword).subscribe({
        next: () => expect(true).toBeTruthy(),
        error: () => fail('Password reset should succeed')
      });

      const req = httpMock.expectOne('/auth/password-reset-confirm');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token, newPassword });

      req.flush({});
    });

    it('should handle password reset confirmation errors', () => {
      const token = 'expired-token';
      const newPassword = 'NewPassword123!';

      service.confirmPasswordReset(token, newPassword).subscribe({
        next: () => fail('Password reset should fail'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toBe('Token expired');
        }
      });

      const req = httpMock.expectOne('/auth/password-reset-confirm');
      req.flush({ message: 'Token expired' }, { status: 400, statusText: 'Bad Request' });
    });
  });
});