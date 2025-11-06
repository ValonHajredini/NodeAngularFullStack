import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TenantContextService } from './tenant-context.service';
import { TenantContext, TenantMembership } from '@nodeangularfullstack/shared';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let httpMock: HttpTestingController;

  const mockTenant1: TenantContext = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    plan: 'professional',
    features: ['userManagement', 'apiAccess', 'customBranding', 'advancedReports'],
    limits: {
      maxUsers: 100,
      maxStorage: 10737418240,
      maxApiCalls: 100000
    },
    status: 'active'
  };

  const mockTenant2: TenantContext = {
    id: '22222222-2222-2222-2222-222222222222',
    slug: 'tech-startup',
    name: 'Tech Startup Inc',
    plan: 'free',
    features: ['userManagement', 'apiAccess'],
    limits: {
      maxUsers: 10,
      maxStorage: 1073741824,
      maxApiCalls: 10000
    },
    status: 'active'
  };

  const mockMemberships: TenantMembership[] = [
    {
      tenant: mockTenant1,
      role: 'admin',
      joinedAt: new Date('2025-01-01'),
      isDefault: true
    },
    {
      tenant: mockTenant2,
      role: 'user',
      joinedAt: new Date('2025-01-15'),
      isDefault: false
    }
  ];

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TenantContextService]
    });

    service = TestBed.inject(TenantContextService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no tenant selected', () => {
      expect(service.currentTenant()).toBeNull();
      expect(service.hasTenant()).toBeFalse();
    });

    it('should load tenant from localStorage if available', () => {
      localStorage.setItem('current_tenant', JSON.stringify(mockTenant1));

      // Create new service instance
      const newService = new TenantContextService(TestBed.inject(HttpClientTestingModule) as any);

      expect(newService.currentTenant()).toEqual(mockTenant1);
      expect(newService.hasTenant()).toBeTrue();
    });
  });

  describe('fetchUserTenants', () => {
    it('should fetch and set available tenants', async () => {
      const promise = service.fetchUserTenants();

      const req = httpMock.expectOne('/api/v1/users/me/tenants');
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockMemberships });

      await promise;

      expect(service.availableTenants()).toEqual(mockMemberships);
      expect(service.tenantCount()).toBe(2);
    });

    it('should auto-select default tenant after fetch', async () => {
      const promise = service.fetchUserTenants();

      const req = httpMock.expectOne('/api/v1/users/me/tenants');
      req.flush({ success: true, data: mockMemberships });

      await promise;

      expect(service.currentTenant()).toEqual(mockTenant1); // Default tenant
      expect(service.isDefaultTenant()).toBeTrue();
    });

    it('should handle fetch errors gracefully', async () => {
      const promise = service.fetchUserTenants();

      const req = httpMock.expectOne('/api/v1/users/me/tenants');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      await expectAsync(promise).toBeRejected();
      expect(service.error()).toContain('Failed to fetch tenants');
    });
  });

  describe('Tenant Selection', () => {
    beforeEach(() => {
      service['availableTenantsSignal'].set(mockMemberships);
    });

    it('should select tenant and update state', () => {
      service.selectTenant(mockTenant1);

      expect(service.currentTenant()).toEqual(mockTenant1);
      expect(service.tenantId()).toBe(mockTenant1.id);
      expect(service.tenantSlug()).toBe(mockTenant1.slug);
      expect(service.tenantName()).toBe(mockTenant1.name);
      expect(service.tenantPlan()).toBe('professional');
    });

    it('should select tenant by slug', () => {
      const result = service.selectTenantBySlug('tech-startup');

      expect(result).toBeTrue();
      expect(service.currentTenant()).toEqual(mockTenant2);
    });

    it('should return false when selecting non-existent slug', () => {
      const result = service.selectTenantBySlug('non-existent');

      expect(result).toBeFalse();
      expect(service.currentTenant()).toBeNull();
    });

    it('should select tenant by ID', () => {
      const result = service.selectTenantById('22222222-2222-2222-2222-222222222222');

      expect(result).toBeTrue();
      expect(service.currentTenant()).toEqual(mockTenant2);
    });

    it('should persist tenant selection to localStorage', () => {
      service.selectTenant(mockTenant1);

      const stored = localStorage.getItem('current_tenant');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockTenant1);
    });

    it('should clear tenant selection', () => {
      service.selectTenant(mockTenant1);
      service.clearTenant();

      expect(service.currentTenant()).toBeNull();
      expect(localStorage.getItem('current_tenant')).toBeNull();
    });
  });

  describe('Feature Access', () => {
    beforeEach(() => {
      service.selectTenant(mockTenant1); // Professional plan
    });

    it('should correctly identify available features', () => {
      expect(service.features().length).toBe(4);
      expect(service.hasUserManagement()).toBeTrue();
      expect(service.hasApiAccess()).toBeTrue();
      expect(service.hasCustomBranding()).toBeTrue();
      expect(service.hasAdvancedReports()).toBeTrue();
      expect(service.hasSso()).toBeFalse();
    });

    it('should check specific features', () => {
      expect(service.hasFeature('userManagement')).toBeTrue();
      expect(service.hasFeature('sso')).toBeFalse();
    });

    it('should create reactive feature signals', () => {
      const brandingSignal = service.createFeatureSignal('customBranding');
      expect(brandingSignal()).toBeTrue();

      // Switch to free plan tenant
      service.selectTenant(mockTenant2);
      expect(brandingSignal()).toBeFalse();
    });

    it('should reflect feature changes on tenant switch', () => {
      expect(service.hasCustomBranding()).toBeTrue();

      // Switch to free plan (no custom branding)
      service.selectTenant(mockTenant2);

      expect(service.hasCustomBranding()).toBeFalse();
    });
  });

  describe('Usage Limits', () => {
    it('should expose usage limits for professional plan', () => {
      service.selectTenant(mockTenant1);

      expect(service.maxUsers()).toBe(100);
      expect(service.maxStorage()).toBe(10737418240);
      expect(service.maxApiCalls()).toBe(100000);
    });

    it('should expose usage limits for free plan', () => {
      service.selectTenant(mockTenant2);

      expect(service.maxUsers()).toBe(10);
      expect(service.maxStorage()).toBe(1073741824);
      expect(service.maxApiCalls()).toBe(10000);
    });

    it('should return zero limits when no tenant selected', () => {
      expect(service.maxUsers()).toBe(0);
      expect(service.maxStorage()).toBe(0);
      expect(service.maxApiCalls()).toBe(0);
    });
  });

  describe('Role Management', () => {
    beforeEach(() => {
      service['availableTenantsSignal'].set(mockMemberships);
      service.selectTenant(mockTenant1);
    });

    it('should get current tenant role', () => {
      expect(service.getCurrentTenantRole()).toBe('admin');

      service.selectTenant(mockTenant2);
      expect(service.getCurrentTenantRole()).toBe('user');
    });

    it('should check role hierarchy correctly', () => {
      // Admin has all permissions
      expect(service.hasRole('admin')).toBeTrue();
      expect(service.hasRole('user')).toBeTrue();
      expect(service.hasRole('readonly')).toBeTrue();

      // User role
      service.selectTenant(mockTenant2);
      expect(service.hasRole('admin')).toBeFalse();
      expect(service.hasRole('user')).toBeTrue();
      expect(service.hasRole('readonly')).toBeTrue();
    });
  });

  describe('Multi-Tenant Helpers', () => {
    beforeEach(() => {
      service['availableTenantsSignal'].set(mockMemberships);
    });

    it('should detect multiple tenants', () => {
      expect(service.hasMultipleTenants()).toBeTrue();
      expect(service.tenantCount()).toBe(2);
    });

    it('should identify default tenant', () => {
      service.selectTenant(mockTenant1);
      expect(service.isDefaultTenant()).toBeTrue();

      service.selectTenant(mockTenant2);
      expect(service.isDefaultTenant()).toBeFalse();
    });
  });

  describe('refreshCurrentTenant', () => {
    it('should refresh tenant data from API', async () => {
      service.selectTenant(mockTenant1);

      const updatedTenant = { ...mockTenant1, name: 'Updated Name' };
      const promise = service.refreshCurrentTenant();

      const req = httpMock.expectOne(`/api/v1/tenants/${mockTenant1.id}`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: updatedTenant });

      await promise;

      expect(service.currentTenant()?.name).toBe('Updated Name');
    });

    it('should handle refresh errors', async () => {
      service.selectTenant(mockTenant1);

      const promise = service.refreshCurrentTenant();

      const req = httpMock.expectOne(`/api/v1/tenants/${mockTenant1.id}`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getTenantContext', () => {
    it('should return current tenant context', () => {
      service.selectTenant(mockTenant1);

      const context = service.getTenantContext();
      expect(context).toEqual(mockTenant1);
    });

    it('should return null when no tenant selected', () => {
      expect(service.getTenantContext()).toBeNull();
    });
  });
});
