import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { tenantInterceptor } from './tenant.interceptor';
import { TenantContextService } from '../services/tenant-context.service';
import { TenantContext } from '@nodeangularfullstack/shared';

describe('tenantInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let tenantService: TenantContextService;

  const mockTenant: TenantContext = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    plan: 'professional',
    features: ['userManagement', 'apiAccess'],
    limits: {
      maxUsers: 100,
      maxStorage: 10737418240,
      maxApiCalls: 100000
    },
    status: 'active'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantInterceptor])),
        provideHttpClientTesting(),
        TenantContextService
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tenantService = TestBed.inject(TenantContextService);

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Tenant Header Addition', () => {
    it('should add X-Tenant-Slug header to API requests when tenant is selected', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/users/me').subscribe();

      const req = httpMock.expectOne('/api/users/me');
      expect(req.request.headers.has('X-Tenant-Slug')).toBeTrue();
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should not add header when no tenant is selected', () => {
      httpClient.get('/api/users/me').subscribe();

      const req = httpMock.expectOne('/api/users/me');
      expect(req.request.headers.has('X-Tenant-Slug')).toBeFalse();

      req.flush({});
    });

    it('should not add header to non-API requests', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/assets/config.json').subscribe();

      const req = httpMock.expectOne('/assets/config.json');
      expect(req.request.headers.has('X-Tenant-Slug')).toBeFalse();

      req.flush({});
    });

    it('should add header to all API endpoint types', () => {
      tenantService.selectTenant(mockTenant);

      const endpoints = [
        '/api/forms',
        '/api/users/me',
        '/api/tenants',
        '/api/auth/login'
      ];

      endpoints.forEach(endpoint => {
        httpClient.get(endpoint).subscribe();

        const req = httpMock.expectOne(endpoint);
        expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

        req.flush({});
      });
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      tenantService.selectTenant(mockTenant);
    });

    it('should add header to GET requests', () => {
      httpClient.get('/api/forms').subscribe();

      const req = httpMock.expectOne('/api/forms');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should add header to POST requests', () => {
      httpClient.post('/api/forms', { title: 'Test' }).subscribe();

      const req = httpMock.expectOne('/api/forms');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should add header to PUT requests', () => {
      httpClient.put('/api/forms/123', { title: 'Updated' }).subscribe();

      const req = httpMock.expectOne('/api/forms/123');
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should add header to DELETE requests', () => {
      httpClient.delete('/api/forms/123').subscribe();

      const req = httpMock.expectOne('/api/forms/123');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should add header to PATCH requests', () => {
      httpClient.patch('/api/forms/123', { status: 'published' }).subscribe();

      const req = httpMock.expectOne('/api/forms/123');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });
  });

  describe('Tenant Switching', () => {
    const anotherTenant: TenantContext = {
      id: '22222222-2222-2222-2222-222222222222',
      slug: 'tech-startup',
      name: 'Tech Startup',
      plan: 'free',
      features: ['userManagement'],
      limits: {
        maxUsers: 10,
        maxStorage: 1073741824,
        maxApiCalls: 10000
      },
      status: 'active'
    };

    it('should update header when tenant switches', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/forms').subscribe();
      const req1 = httpMock.expectOne('/api/forms');
      expect(req1.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');
      req1.flush({});

      // Switch tenant
      tenantService.selectTenant(anotherTenant);

      httpClient.get('/api/forms').subscribe();
      const req2 = httpMock.expectOne('/api/forms');
      expect(req2.request.headers.get('X-Tenant-Slug')).toBe('tech-startup');
      req2.flush({});
    });

    it('should remove header when tenant is cleared', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/forms').subscribe();
      const req1 = httpMock.expectOne('/api/forms');
      expect(req1.request.headers.has('X-Tenant-Slug')).toBeTrue();
      req1.flush({});

      // Clear tenant
      tenantService.clearTenant();

      httpClient.get('/api/forms').subscribe();
      const req2 = httpMock.expectOne('/api/forms');
      expect(req2.request.headers.has('X-Tenant-Slug')).toBeFalse();
      req2.flush({});
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests with existing headers', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/forms', {
        headers: {
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/json'
        }
      }).subscribe();

      const req = httpMock.expectOne('/api/forms');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');
      expect(req.request.headers.get('Authorization')).toBe('Bearer token123');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush({});
    });

    it('should handle concurrent requests', () => {
      tenantService.selectTenant(mockTenant);

      // Make 3 concurrent requests
      httpClient.get('/api/forms').subscribe();
      httpClient.get('/api/users').subscribe();
      httpClient.get('/api/tenants').subscribe();

      const requests = [
        httpMock.expectOne('/api/forms'),
        httpMock.expectOne('/api/users'),
        httpMock.expectOne('/api/tenants')
      ];

      requests.forEach(req => {
        expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');
        req.flush({});
      });
    });

    it('should handle API URLs with query parameters', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/forms?page=1&limit=10').subscribe();

      const req = httpMock.expectOne('/api/forms?page=1&limit=10');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });

    it('should handle API URLs with hash fragments', () => {
      tenantService.selectTenant(mockTenant);

      httpClient.get('/api/forms#section').subscribe();

      const req = httpMock.expectOne('/api/forms#section');
      expect(req.request.headers.get('X-Tenant-Slug')).toBe('acme-corp');

      req.flush({});
    });
  });
});
