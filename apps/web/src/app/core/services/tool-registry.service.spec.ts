import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ToolRegistryService } from './tool-registry.service';
import { AuthService } from '../auth/auth.service';
import { ToolRegistryRecord, ToolStatus } from '@nodeangularfullstack/shared';
import { environment } from '../../../environments/environment';

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;
  let httpMock: HttpTestingController;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  const apiUrl = `${environment.apiUrl}/tools`;

  const mockTools: ToolRegistryRecord[] = [
    {
      id: '1',
      tool_id: 'form-builder',
      name: 'Form Builder',
      description: 'Build custom forms',
      version: '1.0.0',
      icon: 'pi-box',
      route: '/tools/form-builder',
      api_base: '/api/form-builder',
      permissions: ['read', 'write'],
      status: ToolStatus.ACTIVE,
      is_exported: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '2',
      tool_id: 'analytics',
      name: 'Analytics Dashboard',
      description: 'View analytics',
      version: '1.0.0',
      icon: 'pi-chart-bar',
      route: '/tools/analytics',
      api_base: '/api/analytics',
      permissions: ['read'],
      status: ToolStatus.ACTIVE,
      is_exported: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(() => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['getAccessToken', 'logout']);
    authServiceMock.getAccessToken.and.returnValue('mock-jwt-token');

    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ToolRegistryService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(ToolRegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify no outstanding HTTP requests
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllTools()', () => {
    it('should return array of tools', (done) => {
      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools.length).toBe(2);
          expect(tools[0].tool_id).toBe('form-builder');
          expect(tools[1].tool_id).toBe('analytics');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({ message: 'Success', data: mockTools });
    });

    it('should cache results on second call', (done) => {
      // First call
      service.getAllTools().subscribe();

      const req1 = httpMock.expectOne(`${apiUrl}/registry`);
      req1.flush({ message: 'Success', data: mockTools });

      // Second call (should use cache)
      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools.length).toBe(2);
          done();
        },
      });

      // Verify no second HTTP request
      httpMock.expectNone(`${apiUrl}/registry`);
    });

    it('should refetch after cache expires', fakeAsync(() => {
      // First call
      service.getAllTools().subscribe();
      const req1 = httpMock.expectOne(`${apiUrl}/registry`);
      req1.flush({ message: 'Success', data: mockTools });

      // Advance time by 6 minutes (cache expired)
      tick(6 * 60 * 1000);

      // Second call (should make new request)
      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools.length).toBe(2);
        },
      });

      const req2 = httpMock.expectOne(`${apiUrl}/registry`);
      req2.flush({ message: 'Success', data: mockTools });
    }));

    it('should handle empty array response', (done) => {
      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools).toEqual([]);
          expect(tools.length).toBe(0);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: 'Success', data: [] });
    });
  });

  describe('getToolById()', () => {
    it('should return single tool', (done) => {
      service.getToolById('form-builder').subscribe({
        next: (tool) => {
          expect(tool.tool_id).toBe('form-builder');
          expect(tool.name).toBe('Form Builder');
          expect(tool.description).toBe('Build custom forms');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry/form-builder`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');

      req.flush({ message: 'Success', data: mockTools[0] });
    });

    it('should throw error for empty toolId', (done) => {
      service.getToolById('').subscribe({
        error: (err) => {
          expect(err.message).toContain('Tool ID is required');
          done();
        },
      });
    });

    it('should throw error for whitespace-only toolId', (done) => {
      service.getToolById('   ').subscribe({
        error: (err) => {
          expect(err.message).toContain('Tool ID is required');
          done();
        },
      });
    });

    it('should handle 404 error', (done) => {
      service.getToolById('nonexistent').subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          expect(err.message).toContain('Tool not found');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry/nonexistent`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('searchTools()', () => {
    it('should return filtered tools', (done) => {
      service.searchTools('form').subscribe({
        next: (results) => {
          expect(results.length).toBe(1);
          expect(results[0].tool_id).toBe('form-builder');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/search?q=form`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe('form');

      req.flush({ message: 'Success', data: [mockTools[0]] });
    });

    it('should throw error for short query (1 character)', (done) => {
      service.searchTools('a').subscribe({
        error: (err) => {
          expect(err.message).toContain('at least 2 characters');
          done();
        },
      });
    });

    it('should throw error for empty query', (done) => {
      service.searchTools('').subscribe({
        error: (err) => {
          expect(err.message).toContain('at least 2 characters');
          done();
        },
      });
    });

    it('should trim whitespace from query', (done) => {
      service.searchTools('  analytics  ').subscribe({
        next: () => done(),
      });

      const req = httpMock.expectOne(`${apiUrl}/search?q=analytics`);
      expect(req.request.params.get('q')).toBe('analytics');
      req.flush({ message: 'Success', data: [mockTools[1]] });
    });

    it('should not cache search results', (done) => {
      // First search
      service.searchTools('analytics').subscribe();
      const req1 = httpMock.expectOne(`${apiUrl}/search?q=analytics`);
      req1.flush({ message: 'Success', data: [mockTools[1]] });

      // Second identical search (should make new request)
      service.searchTools('analytics').subscribe({
        next: () => done(),
      });

      const req2 = httpMock.expectOne(`${apiUrl}/search?q=analytics`);
      req2.flush({ message: 'Success', data: [mockTools[1]] });
    });

    it('should handle search with no results', (done) => {
      service.searchTools('xyz').subscribe({
        next: (results) => {
          expect(results).toEqual([]);
          expect(results.length).toBe(0);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/search?q=xyz`);
      req.flush({ message: 'Success', data: [] });
    });
  });

  describe('refreshCache()', () => {
    it('should clear cache and trigger refetch', (done) => {
      // Initial call (cached)
      service.getAllTools().subscribe();
      const req1 = httpMock.expectOne(`${apiUrl}/registry`);
      req1.flush({ message: 'Success', data: mockTools });

      // Refresh cache
      service.refreshCache();

      // Verify new request triggered
      const req2 = httpMock.expectOne(`${apiUrl}/registry`);
      req2.flush({ message: 'Success', data: mockTools });

      done();
    });

    it('should allow subsequent getAllTools() to fetch fresh data', (done) => {
      // Initial call
      service.getAllTools().subscribe();
      const req1 = httpMock.expectOne(`${apiUrl}/registry`);
      req1.flush({ message: 'Success', data: mockTools });

      // Refresh cache
      service.refreshCache();
      const req2 = httpMock.expectOne(`${apiUrl}/registry`);
      req2.flush({ message: 'Success', data: mockTools });

      // New call should hit API (not cached)
      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools.length).toBe(2);
          done();
        },
      });

      // No third request because req2 refreshed the cache
      httpMock.expectNone(`${apiUrl}/registry`);
    });
  });

  describe('Error Handling', () => {
    it('should handle network error', (done) => {
      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.message).toContain('Network error');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.error(new ProgressEvent('Network error'), { status: 0 });
    });

    it('should redirect on 401 unauthorized', (done) => {
      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          expect(err.message).toContain('Session expired');
          expect(authServiceMock.logout).toHaveBeenCalled();
          expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should redirect on 403 forbidden', (done) => {
      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.status).toBe(403);
          expect(err.message).toContain('Session expired');
          expect(authServiceMock.logout).toHaveBeenCalled();
          expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 500 server error', (done) => {
      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.status).toBe(500);
          expect(err.message).toContain('Server error');
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: 'Internal error' }, { status: 500, statusText: 'Server Error' });
    });

    it('should handle custom error message from API', (done) => {
      const customMessage = 'Custom API error message';

      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.message).toBe(customMessage);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: customMessage }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network error and eventually succeed', fakeAsync(() => {
      let subscriptionComplete = false;

      service.getAllTools().subscribe({
        next: (tools) => {
          expect(tools.length).toBe(2);
          subscriptionComplete = true;
        },
      });

      // First attempt fails
      const req1 = httpMock.expectOne(`${apiUrl}/registry`);
      req1.error(new ProgressEvent('Network error'));

      // Wait for retry delay
      tick(1000);

      // Second attempt fails
      const req2 = httpMock.expectOne(`${apiUrl}/registry`);
      req2.error(new ProgressEvent('Network error'));

      // Wait for retry delay
      tick(2000);

      // Third attempt succeeds
      const req3 = httpMock.expectOne(`${apiUrl}/registry`);
      req3.flush({ message: 'Success', data: mockTools });

      expect(subscriptionComplete).toBe(true);
    }));

    it('should not retry on 404 error', (done) => {
      service.getToolById('nonexistent').subscribe({
        error: (err) => {
          expect(err.status).toBe(404);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry/nonexistent`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      // Verify no retry attempted
      httpMock.expectNone(`${apiUrl}/registry/nonexistent`);
    });

    it('should not retry on 400 bad request', (done) => {
      service.getAllTools().subscribe({
        error: (err) => {
          expect(err.status).toBe(400);
          done();
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      req.flush({ message: 'Bad request' }, { status: 400, statusText: 'Bad Request' });

      // Verify no retry attempted
      httpMock.expectNone(`${apiUrl}/registry`);
    });

    it('should give up after max retries', fakeAsync(() => {
      let errorReceived = false;

      service.getAllTools().subscribe({
        error: () => {
          errorReceived = true;
        },
      });

      // Fail 4 times (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        const req = httpMock.expectOne(`${apiUrl}/registry`);
        req.error(new ProgressEvent('Network error'));
        tick(Math.pow(2, i) * 1000); // Exponential backoff delays
      }

      expect(errorReceived).toBe(true);

      // Verify no more retries
      httpMock.expectNone(`${apiUrl}/registry`);
    }));
  });

  describe('Authorization Headers', () => {
    it('should add Authorization header to all requests', () => {
      service.getAllTools().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-jwt-token');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({ message: 'Success', data: mockTools });
    });

    it('should use token from AuthService', () => {
      authServiceMock.getAccessToken.and.returnValue('custom-token-123');

      service.getToolById('form-builder').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/registry/form-builder`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer custom-token-123');
      expect(authServiceMock.getAccessToken).toHaveBeenCalled();

      req.flush({ message: 'Success', data: mockTools[0] });
    });

    it('should handle null token from AuthService', () => {
      authServiceMock.getAccessToken.and.returnValue(null);

      service.getAllTools().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/registry`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer null');

      req.flush({ message: 'Success', data: mockTools });
    });
  });
});
