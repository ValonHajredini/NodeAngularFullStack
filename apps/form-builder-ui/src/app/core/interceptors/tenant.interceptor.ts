import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantContextService } from '../services/tenant-context.service';

/**
 * Tenant HTTP Interceptor (Functional Interceptor for Angular 20+)
 *
 * Automatically adds the X-Tenant-Slug header to all API requests.
 * This enables the backend to identify which tenant the request belongs to
 * and apply appropriate data filtering and access controls.
 *
 * Features:
 * - Only adds header to API requests (starts with '/api/')
 * - Uses reactive signals from TenantContextService
 * - Skips header if no tenant is selected (single-tenant mode)
 * - Logs tenant context in development mode
 *
 * Backend Middleware Flow:
 * 1. Request arrives with X-Tenant-Slug header
 * 2. TenantMiddleware extracts tenant from header
 * 3. Database session context set to tenant ID
 * 4. RLS policies automatically filter queries
 *
 * Usage:
 * This interceptor is automatically registered in app.config.ts and requires no
 * additional configuration. It will start adding headers once a tenant is selected
 * via TenantContextService.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([tenantInterceptor])
 *     )
 *   ]
 * };
 * ```
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantContextService);

  // Get current tenant slug from service (reactive signal)
  const tenantSlug = tenantService.tenantSlug();

  // Only add header to API requests and when tenant is selected
  if (tenantSlug && req.url.startsWith('/api/')) {
    // Clone request and add tenant header
    const clonedReq = req.clone({
      setHeaders: {
        'X-Tenant-Slug': tenantSlug
      }
    });

    // Log in development mode
    if (isDevMode()) {
      console.log(`[TenantInterceptor] Adding tenant header: ${tenantSlug} for ${req.method} ${req.url}`);
    }

    return next(clonedReq);
  }

  // Pass through without modification
  return next(req);
};

/**
 * Check if running in development mode.
 * @private
 */
function isDevMode(): boolean {
  return !!(typeof ngDevMode !== 'undefined' && ngDevMode);
}

/**
 * Tenant Subdomain Interceptor (Optional)
 *
 * Alternative interceptor that uses subdomain-based tenant routing.
 * Useful for production environments with custom domains per tenant.
 *
 * Example: acme.app.example.com → extracts 'acme' as tenant slug
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([tenantSubdomainInterceptor])
 *     )
 *   ]
 * };
 * ```
 */
export const tenantSubdomainInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantContextService);

  // Extract tenant from subdomain (first part of hostname)
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // If subdomain exists (e.g., acme.app.example.com)
  if (parts.length > 2 && req.url.startsWith('/api/')) {
    const subdomain = parts[0];

    // Ignore common subdomains
    const ignoredSubdomains = ['www', 'api', 'admin', 'app'];
    if (!ignoredSubdomains.includes(subdomain)) {
      // Try to select tenant by subdomain
      const selected = tenantService.selectTenantBySlug(subdomain);

      if (selected) {
        const clonedReq = req.clone({
          setHeaders: {
            'X-Tenant-Slug': subdomain
          }
        });

        return next(clonedReq);
      }
    }
  }

  // Fallback to regular tenant interceptor behavior
  return tenantInterceptor(req, next);
};

/**
 * Multi-Tenant Routing Interceptor (Advanced)
 *
 * Combines multiple tenant identification strategies:
 * 1. Explicit tenant slug in service
 * 2. Subdomain extraction
 * 3. URL path parameter (e.g., /api/v1/t/:slug/)
 *
 * Priority:
 * - Service tenant slug (highest)
 * - Subdomain
 * - URL path (lowest)
 *
 * This provides the most flexible tenant routing for complex deployments.
 */
export const multiTenantRoutingInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantService = inject(TenantContextService);

  let tenantSlug: string | null = null;

  // Strategy 1: Use explicit tenant from service (highest priority)
  tenantSlug = tenantService.tenantSlug();

  // Strategy 2: Extract from subdomain if not set
  if (!tenantSlug) {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const subdomain = parts[0];
      const ignoredSubdomains = ['www', 'api', 'admin', 'app', 'localhost'];
      if (!ignoredSubdomains.includes(subdomain)) {
        tenantSlug = subdomain;
      }
    }
  }

  // Strategy 3: Extract from URL path pattern /api/v1/t/:slug/
  if (!tenantSlug && req.url.includes('/api/v1/t/')) {
    const match = req.url.match(/\/api\/v1\/t\/([^/]+)/);
    if (match) {
      tenantSlug = match[1];
    }
  }

  // Add header if tenant identified
  if (tenantSlug && req.url.startsWith('/api/')) {
    const clonedReq = req.clone({
      setHeaders: {
        'X-Tenant-Slug': tenantSlug
      }
    });

    if (isDevMode()) {
      console.log(`[MultiTenantInterceptor] Tenant: ${tenantSlug} for ${req.method} ${req.url}`);
    }

    return next(clonedReq);
  }

  return next(req);
};
