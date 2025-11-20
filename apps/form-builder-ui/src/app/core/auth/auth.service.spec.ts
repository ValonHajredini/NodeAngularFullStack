import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, LoginCredentials, RegisterData, AuthResponse } from './auth.service';
import { environment } from '@env/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token'
  };

  beforeEach(() => {
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpyObj }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty state', () => {
      expect(service.user()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.loading()).toBeFalse();
      expect(service.error()).toBeNull();
    });

    it('should load existing auth data from localStorage', () => {
      // Create serializable user data (dates as ISO strings for consistent localStorage behavior)
      const serializableUser = {
        ...mockUser,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      };

      // Set up localStorage with auth data
      localStorage.setItem('user', JSON.stringify(serializableUser));
      localStorage.setItem(environment.jwt.tokenKey, 'stored-access-token');
      localStorage.setItem(environment.jwt.refreshTokenKey, 'stored-refresh-token');

      // Create new service instance using TestBed to provide injection context
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: routerSpy }
        ]
      });

      const newService = TestBed.inject(AuthService);

      // Expect the loaded user to have date strings (as they would be serialized/deserialized)
      expect(newService.user()).toEqual(jasmine.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString()
      }));
      expect(newService.isAuthenticated()).toBeTrue();
    });
  });

  describe('Login', () => {
    it('should login successfully', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password'
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(service.user()).toEqual(mockUser);
        expect(service.isAuthenticated()).toBeTrue();
        expect(service.loading()).toBeFalse();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockAuthResponse);
    });

    it('should handle login failure', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      };

      service.login(credentials).subscribe({
        error: (error) => {
          expect(service.error()).toBe('Invalid credentials');
          expect(service.loading()).toBeFalse();
          expect(service.isAuthenticated()).toBeFalse();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Register', () => {
    it('should register successfully', () => {
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User'
      };

      service.register(userData).subscribe(response => {
        expect(response).toEqual(mockAuthResponse);
        expect(service.user()).toEqual(mockUser);
        expect(service.isAuthenticated()).toBeTrue();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(userData);
      req.flush(mockAuthResponse);
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Set up authenticated state
      service['userSignal'].set(mockUser);
      service['accessTokenSignal'].set('access-token');
      service['refreshTokenSignal'].set('refresh-token');
    });

    it('should logout successfully', () => {
      service.logout().subscribe(() => {
        expect(service.user()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token' });
      req.flush({});
    });

    it('should logout even if server request fails', () => {
      service.logout().subscribe(() => {
        expect(service.user()).toBeNull();
        expect(service.isAuthenticated()).toBeFalse();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      req.flush({}, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      service['accessTokenSignal'].set('test-access-token');
      service['refreshTokenSignal'].set('test-refresh-token');
    });

    it('should return access token', () => {
      expect(service.getAccessToken()).toBe('test-access-token');
    });

    it('should return refresh token', () => {
      expect(service.getRefreshToken()).toBe('test-refresh-token');
    });

    it('should refresh access token successfully', () => {
      const tokenResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      service.refreshAccessToken().subscribe(response => {
        expect(response).toEqual(tokenResponse);
        expect(service.getAccessToken()).toBe('new-access-token');
        expect(service.getRefreshToken()).toBe('new-refresh-token');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'test-refresh-token' });
      req.flush(tokenResponse);
    });

    it('should handle refresh token failure', () => {
      service.refreshAccessToken().subscribe({
        error: () => {
          expect(service.user()).toBeNull();
          expect(service.isAuthenticated()).toBeFalse();
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush({}, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Token Expiration', () => {
    it('should detect expired token', () => {
      // Create an expired JWT token (simplified)
      const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 hour ago
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;
      service['accessTokenSignal'].set(expiredToken);

      expect(service.isTokenExpired()).toBeTrue();
    });

    it('should detect valid token', () => {
      // Create a valid JWT token (simplified)
      const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour from now
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;
      service['accessTokenSignal'].set(validToken);

      expect(service.isTokenExpired()).toBeFalse();
    });

    it('should handle malformed token', () => {
      service['accessTokenSignal'].set('malformed-token');
      expect(service.isTokenExpired()).toBeTrue();
    });
  });
});