import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

/**
 * Test suite for the auth interceptor focusing on JWT token attachment,
 * 401 error handling, and authentication flow integration.
 */
describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getAccessToken',
      'getRefreshToken',
      'refreshAccessToken',
      'logout'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpyObj },
        {
          provide: HTTP_INTERCEPTORS,
          useValue: authInterceptor,
          multi: true
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Token Attachment', () => {
    it('should add Authorization header when access token is available', () => {
      authService.getAccessToken.and.returnValue('test-access-token');

      httpClient.get('/api/users').subscribe();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-access-token');
      req.flush({ users: [] });
    });

    it('should not add Authorization header when no access token is available', () => {
      authService.getAccessToken.and.returnValue(null);

      httpClient.get('/api/users').subscribe();

      const req = httpMock.expectOne('/api/users');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({ users: [] });
    });

    it('should skip token attachment for auth endpoints', () => {
      authService.getAccessToken.and.returnValue('test-access-token');

      httpClient.post('/auth/login', { email: 'test@example.com', password: 'password' }).subscribe();

      const req = httpMock.expectOne('/auth/login');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({ user: {}, accessToken: 'token' });
    });
  });

  describe('401 Error Handling', () => {
    it('should attempt token refresh on 401 error when refresh token is available', () => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.getRefreshToken.and.returnValue('valid-refresh-token');
      authService.refreshAccessToken.and.returnValue(of({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }));

      httpClient.get('/api/users').subscribe();

      // First request with expired token
      const req1 = httpMock.expectOne('/api/users');
      expect(req1.request.headers.get('Authorization')).toBe('Bearer expired-token');
      req1.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Should trigger refresh
      expect(authService.refreshAccessToken).toHaveBeenCalled();

      // Retry request after refresh
      const req2 = httpMock.expectOne('/api/users');
      req2.flush({ users: [] });
    });

    it('should logout user when refresh token is not available', () => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.getRefreshToken.and.returnValue(null);
      authService.logout.and.returnValue(of(undefined));

      httpClient.get('/api/users').subscribe({
        error: () => {
          expect(authService.logout).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should logout user when token refresh fails', () => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.getRefreshToken.and.returnValue('invalid-refresh-token');
      authService.refreshAccessToken.and.returnValue(throwError(() => new Error('Refresh failed')));
      authService.logout.and.returnValue(of(undefined));

      httpClient.get('/api/users').subscribe({
        error: () => {
          expect(authService.logout).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });

    it('should pass through non-401 errors without attempting refresh', () => {
      authService.getAccessToken.and.returnValue('valid-token');

      httpClient.get('/api/users').subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne('/api/users');
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(authService.refreshAccessToken).not.toHaveBeenCalled();
      expect(authService.logout).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should handle multiple concurrent requests during token refresh', () => {
      authService.getAccessToken.and.returnValue('expired-token');
      authService.getRefreshToken.and.returnValue('valid-refresh-token');
      authService.refreshAccessToken.and.returnValue(of({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }));

      // Start multiple requests concurrently
      httpClient.get('/api/users').subscribe();
      httpClient.get('/api/posts').subscribe();

      // Both should get 401 initially
      const req1 = httpMock.expectOne('/api/users');
      const req2 = httpMock.expectOne('/api/posts');

      req1.flush(null, { status: 401, statusText: 'Unauthorized' });
      req2.flush(null, { status: 401, statusText: 'Unauthorized' });

      // Should only call refresh once
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);

      // Both should retry after refresh
      const retryReq1 = httpMock.expectOne('/api/users');
      const retryReq2 = httpMock.expectOne('/api/posts');

      retryReq1.flush({ users: [] });
      retryReq2.flush({ posts: [] });
    });
  });
});