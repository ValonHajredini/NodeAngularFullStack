import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TenantContext, TenantMembership } from '@nodeangularfullstack/shared';

/**
 * TenantContextService manages tenant state using Angular 20 signals.
 *
 * This service provides:
 * - Reactive tenant state with signals
 * - Automatic persistence to localStorage
 * - Feature gating based on tenant plan
 * - Multi-tenant context switching
 *
 * Usage:
 * ```typescript
 * constructor(private tenantService: TenantContextService) {
 *   // Access current tenant reactively
 *   effect(() => {
 *     console.log('Current tenant:', this.tenantService.currentTenant());
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class TenantContextService {
  // Private writable signals
  private readonly currentTenantSignal = signal<TenantContext | null>(null);
  private readonly availableTenantsSignal = signal<TenantMembership[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly currentTenant = this.currentTenantSignal.asReadonly();
  readonly availableTenants = this.availableTenantsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals for derived state
  readonly hasTenant = computed(() => this.currentTenantSignal() !== null);
  readonly tenantId = computed(() => this.currentTenantSignal()?.id ?? null);
  readonly tenantSlug = computed(() => this.currentTenantSignal()?.slug ?? null);
  readonly tenantName = computed(() => this.currentTenantSignal()?.name ?? 'No tenant');
  readonly tenantPlan = computed(() => this.currentTenantSignal()?.plan ?? 'free');
  readonly tenantStatus = computed(() => this.currentTenantSignal()?.status ?? 'inactive');

  // Feature access computed signals
  readonly features = computed(() => this.currentTenantSignal()?.features ?? []);
  readonly hasUserManagement = computed(() => this.features().includes('userManagement'));
  readonly hasApiAccess = computed(() => this.features().includes('apiAccess'));
  readonly hasCustomBranding = computed(() => this.features().includes('customBranding'));
  readonly hasAdvancedReports = computed(() => this.features().includes('advancedReports'));
  readonly hasSso = computed(() => this.features().includes('sso'));

  // Usage limits computed signals
  readonly limits = computed(
    () =>
      this.currentTenantSignal()?.limits ?? {
        maxUsers: 0,
        maxStorage: 0,
        maxApiCalls: 0,
      },
  );
  readonly maxUsers = computed(() => this.limits().maxUsers);
  readonly maxStorage = computed(() => this.limits().maxStorage);
  readonly maxApiCalls = computed(() => this.limits().maxApiCalls);

  // Multi-tenant helpers
  readonly tenantCount = computed(() => this.availableTenantsSignal().length);
  readonly hasMultipleTenants = computed(() => this.tenantCount() > 1);
  readonly isDefaultTenant = computed(() => {
    const current = this.currentTenantSignal();
    const tenants = this.availableTenantsSignal();
    if (!current) return false;
    const membership = tenants.find((t) => t.tenant.id === current.id);
    return membership?.isDefault ?? false;
  });

  constructor(private http: HttpClient) {
    // Load tenant from localStorage on service initialization
    this.loadStoredTenant();

    // Auto-save to localStorage when tenant changes
    effect(() => {
      const tenant = this.currentTenantSignal();
      if (tenant) {
        localStorage.setItem('current_tenant', JSON.stringify(tenant));
      } else {
        localStorage.removeItem('current_tenant');
      }
    });

    // Log tenant changes in development
    if (this.isDevMode()) {
      effect(() => {
        const tenant = this.currentTenantSignal();
        if (tenant) {
          console.log('[TenantContext] Switched to tenant:', {
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
          });
        }
      });
    }
  }

  /**
   * Fetch all tenants that the current user belongs to.
   * Automatically selects the first tenant if none is currently selected.
   */
  async fetchUserTenants(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: TenantMembership[] }>('/api/v1/users/me/tenants'),
      );

      const memberships = response.data;
      this.availableTenantsSignal.set(memberships);

      // Auto-select tenant if none selected
      if (!this.currentTenantSignal() && memberships.length > 0) {
        // Prefer default tenant, otherwise first tenant
        const defaultMembership = memberships.find((m) => m.isDefault);
        const tenantToSelect = defaultMembership || memberships[0];
        this.selectTenant(tenantToSelect.tenant);
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || 'Failed to fetch tenants';
      this.errorSignal.set(errorMessage);
      console.error('[TenantContext] Error fetching tenants:', error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Select a tenant as the current active tenant.
   * This will update localStorage and trigger all dependent computed signals.
   *
   * @param tenant - The tenant context to select
   */
  selectTenant(tenant: TenantContext): void {
    this.currentTenantSignal.set(tenant);
    this.errorSignal.set(null);
  }

  /**
   * Select tenant by slug (URL-safe identifier).
   * Useful for routing and URL parameters.
   *
   * @param slug - Tenant slug to select
   * @returns true if tenant was found and selected, false otherwise
   */
  selectTenantBySlug(slug: string): boolean {
    const membership = this.availableTenantsSignal().find((m) => m.tenant.slug === slug);
    if (membership) {
      this.selectTenant(membership.tenant);
      return true;
    }
    return false;
  }

  /**
   * Select tenant by ID.
   *
   * @param id - Tenant UUID to select
   * @returns true if tenant was found and selected, false otherwise
   */
  selectTenantById(id: string): boolean {
    const membership = this.availableTenantsSignal().find((m) => m.tenant.id === id);
    if (membership) {
      this.selectTenant(membership.tenant);
      return true;
    }
    return false;
  }

  /**
   * Clear the current tenant selection.
   * This will remove tenant from localStorage.
   */
  clearTenant(): void {
    this.currentTenantSignal.set(null);
    this.errorSignal.set(null);
  }

  /**
   * Get the current tenant role for the authenticated user.
   *
   * @returns User's role in current tenant or null
   */
  getCurrentTenantRole(): 'admin' | 'user' | 'readonly' | null {
    const current = this.currentTenantSignal();
    if (!current) return null;

    const membership = this.availableTenantsSignal().find((m) => m.tenant.id === current.id);
    return membership?.role ?? null;
  }

  /**
   * Check if user has a specific role in current tenant.
   *
   * @param requiredRole - Role to check against
   * @returns true if user has required role or higher privilege
   */
  hasRole(requiredRole: 'admin' | 'user' | 'readonly'): boolean {
    const currentRole = this.getCurrentTenantRole();
    if (!currentRole) return false;

    const roleHierarchy: Record<string, number> = {
      readonly: 1,
      user: 2,
      admin: 3,
    };

    return roleHierarchy[currentRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Check if current tenant has access to a specific feature.
   *
   * @param featureName - Name of feature to check
   * @returns true if feature is enabled for current tenant
   */
  hasFeature(featureName: string): boolean {
    return this.features().includes(featureName);
  }

  /**
   * Create a computed signal for a specific feature check.
   * Useful for reactive templates.
   *
   * @param featureName - Feature to check
   * @returns Computed signal that tracks feature availability
   */
  createFeatureSignal(featureName: string) {
    return computed(() => this.features().includes(featureName));
  }

  /**
   * Refresh current tenant data from API.
   * Useful after tenant settings changes.
   */
  async refreshCurrentTenant(): Promise<void> {
    const currentId = this.tenantId();
    if (!currentId) return;

    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: TenantContext }>(`/api/v1/tenants/${currentId}`),
      );

      this.selectTenant(response.data);
    } catch (error) {
      console.error('[TenantContext] Error refreshing tenant:', error);
      throw error;
    }
  }

  /**
   * Load tenant from localStorage on initialization.
   * @private
   */
  private loadStoredTenant(): void {
    try {
      const stored = localStorage.getItem('current_tenant');
      if (stored) {
        const tenant = JSON.parse(stored) as TenantContext;
        // Validate tenant structure before setting
        if (tenant.id && tenant.slug && tenant.name) {
          this.currentTenantSignal.set(tenant);
        } else {
          console.warn('[TenantContext] Invalid tenant data in localStorage');
          localStorage.removeItem('current_tenant');
        }
      }
    } catch (error) {
      console.error('[TenantContext] Error loading stored tenant:', error);
      localStorage.removeItem('current_tenant');
    }
  }

  /**
   * Check if running in development mode.
   * @private
   */
  private isDevMode(): boolean {
    return !!(typeof ngDevMode !== 'undefined' && ngDevMode);
  }

  /**
   * Get tenant context for API requests (if needed manually).
   * Usually handled automatically by HTTP interceptor.
   *
   * @returns Current tenant context or null
   */
  getTenantContext(): TenantContext | null {
    return this.currentTenantSignal();
  }
}
