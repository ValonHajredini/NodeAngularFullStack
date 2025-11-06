import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TenantSelectorComponent } from './tenant-selector.component';
import { TenantContextService } from '../../../core/services/tenant-context.service';
import { TenantContext, TenantMembership } from '@nodeangularfullstack/shared';

describe('TenantSelectorComponent', () => {
  let component: TenantSelectorComponent;
  let fixture: ComponentFixture<TenantSelectorComponent>;
  let tenantService: TenantContextService;

  const mockTenant1: TenantContext = {
    id: '11111111-1111-1111-1111-111111111111',
    slug: 'acme-corp',
    name: 'Acme Corporation',
    plan: 'professional',
    features: ['userManagement', 'apiAccess', 'customBranding'],
    limits: {
      maxUsers: 100,
      maxStorage: 10737418240,
      maxApiCalls: 100000,
    },
    status: 'active',
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
      maxApiCalls: 10000,
    },
    status: 'active',
  };

  const mockMemberships: TenantMembership[] = [
    {
      tenant: mockTenant1,
      role: 'admin',
      joinedAt: new Date('2025-01-01'),
      isDefault: true,
    },
    {
      tenant: mockTenant2,
      role: 'user',
      joinedAt: new Date('2025-01-15'),
      isDefault: false,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantSelectorComponent, HttpClientTestingModule],
      providers: [TenantContextService],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantSelectorComponent);
    component = fixture.componentInstance;
    tenantService = TestBed.inject(TenantContextService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading skeleton while fetching tenants', () => {
    tenantService['loadingSignal'].set(true);
    fixture.detectChanges();

    const skeleton = fixture.nativeElement.querySelector('p-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should show error state when tenant fetch fails', () => {
    tenantService['loadingSignal'].set(false);
    tenantService['errorSignal'].set('Failed to load tenants');
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('.error-state');
    expect(errorState).toBeTruthy();
    expect(errorState.textContent).toContain('Failed to load tenants');
  });

  it('should display dropdown when user has multiple tenants', () => {
    tenantService['availableTenantsSignal'].set(mockMemberships);
    tenantService['currentTenantSignal'].set(mockTenant1);
    tenantService['loadingSignal'].set(false);
    fixture.detectChanges();

    const dropdown = fixture.nativeElement.querySelector('p-dropdown');
    expect(dropdown).toBeTruthy();
  });

  it('should display single tenant badge when user has one tenant', () => {
    tenantService['availableTenantsSignal'].set([mockMemberships[0]]);
    tenantService['currentTenantSignal'].set(mockTenant1);
    tenantService['loadingSignal'].set(false);
    fixture.detectChanges();

    const singleTenant = fixture.nativeElement.querySelector('.single-tenant-display');
    expect(singleTenant).toBeTruthy();
    expect(singleTenant.textContent).toContain('Acme Corporation');
  });

  describe('Plan Badge', () => {
    it('should return correct plan labels', () => {
      expect(component.getPlanLabel('free')).toBe('Free');
      expect(component.getPlanLabel('starter')).toBe('Starter');
      expect(component.getPlanLabel('professional')).toBe('Pro');
      expect(component.getPlanLabel('enterprise')).toBe('Enterprise');
    });

    it('should return correct plan severities', () => {
      expect(component.getPlanSeverity('free')).toBe('secondary');
      expect(component.getPlanSeverity('starter')).toBe('info');
      expect(component.getPlanSeverity('professional')).toBe('success');
      expect(component.getPlanSeverity('enterprise')).toBe('warn');
    });
  });

  describe('Tenant Switching', () => {
    beforeEach(() => {
      tenantService['availableTenantsSignal'].set(mockMemberships);
      tenantService['currentTenantSignal'].set(mockTenant1);
      component.selectedTenant.set(mockMemberships[0]);
      tenantService['loadingSignal'].set(false);
      fixture.detectChanges();
    });

    it('should call selectTenant when tenant changes', () => {
      spyOn(tenantService, 'selectTenant');
      spyOn(window.location, 'reload');

      component.onTenantChange({ value: mockMemberships[1] });

      expect(tenantService.selectTenant).toHaveBeenCalledWith(mockTenant2);
    });

    it('should reload page after tenant change', (done) => {
      spyOn(window.location, 'reload');

      component.onTenantChange({ value: mockMemberships[1] });

      setTimeout(() => {
        expect(window.location.reload).toHaveBeenCalled();
        done();
      }, 350);
    });

    it('should handle null tenant change gracefully', () => {
      spyOn(tenantService, 'selectTenant');

      component.onTenantChange({ value: null });

      expect(tenantService.selectTenant).not.toHaveBeenCalled();
    });
  });

  describe('Initialization', () => {
    it('should fetch user tenants on init', async () => {
      spyOn(tenantService, 'fetchUserTenants').and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(tenantService.fetchUserTenants).toHaveBeenCalled();
    });

    it('should set selected tenant to current tenant on init', async () => {
      tenantService['availableTenantsSignal'].set(mockMemberships);
      tenantService['currentTenantSignal'].set(mockTenant1);
      spyOn(tenantService, 'fetchUserTenants').and.returnValue(Promise.resolve());

      await component.ngOnInit();

      expect(component.selectedTenant()).toEqual(mockMemberships[0]);
    });

    it('should handle fetch errors during init', async () => {
      spyOn(tenantService, 'fetchUserTenants').and.returnValue(
        Promise.reject(new Error('Network error')),
      );
      spyOn(console, 'error');

      await component.ngOnInit();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Computed Signals', () => {
    it('should compute hasMultipleTenants correctly', () => {
      tenantService['availableTenantsSignal'].set([mockMemberships[0]]);
      expect(component.hasMultipleTenants()).toBeFalse();

      tenantService['availableTenantsSignal'].set(mockMemberships);
      expect(component.hasMultipleTenants()).toBeTrue();
    });
  });
});
