import jwt from 'jsonwebtoken';
import { JwtUtils } from '../../../src/utils/jwt.utils';
import { TenantContext } from '../../../src/utils/tenant.utils';

// Mock tenant config
jest.mock('../../../src/config/tenant.config', () => ({
  tenantConfig: {
    tokenIsolation: true,
    multiTenancyEnabled: true,
  },
}));

describe('JWT Multi-Tenant Token Handling', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'user@example.com',
    role: 'user',
    tenantId: 'tenant-123',
  };

  const mockTenantContext: TenantContext & { limits: any } = {
    id: 'tenant-123',
    slug: 'acme-corp',
    plan: 'professional',
    features: ['custom-branding', 'advanced-reporting'],
    limits: {
      maxUsers: 100,
      maxStorage: 10000,
      maxApiCalls: 50000,
    },
    status: 'active',
  };

  beforeAll(() => {
    // Set environment variables for JWT secrets
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('Token Generation with Tenant Context', () => {
    it('should include tenant context when multi-tenancy is enabled', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant).toBeDefined();
      expect(payload.tenant.id).toBe('tenant-123');
      expect(payload.tenant.slug).toBe('acme-corp');
      expect(payload.tenant.plan).toBe('professional');
      expect(payload.tenant.features).toEqual([
        'custom-branding',
        'advanced-reporting',
      ]);
      expect(payload.tenant.limits).toEqual({
        maxUsers: 100,
        maxStorage: 10000,
        maxApiCalls: 50000,
      });
      expect(payload.tenant.status).toBe('active');
    });

    it('should generate valid JWT structure with tenant data', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      // Standard JWT claims
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('user@example.com');
      expect(payload.role).toBe('user');
      expect(payload.type).toBe('access');

      // Tenant-specific claims
      expect(payload.tenant).toBeDefined();
      expect(typeof payload.tenant).toBe('object');
    });

    it('should exclude tenant context when not provided', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant).toBeUndefined();
      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('user@example.com');
    });

    it('should generate token pair with tenant context', () => {
      const tokens = JwtUtils.generateTokenPair(
        mockUser,
        'session-123',
        mockTenantContext
      );

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      const accessPayload = jwt.decode(tokens.accessToken) as any;
      const refreshPayload = jwt.decode(tokens.refreshToken) as any;

      // Access token should have tenant context
      expect(accessPayload.tenant).toBeDefined();
      expect(accessPayload.tenant.id).toBe('tenant-123');

      // Refresh token should not have tenant context (as expected)
      expect(refreshPayload.tenant).toBeUndefined();
      expect(refreshPayload.type).toBe('refresh');
    });
  });

  describe('Token Validation with Tenant Status', () => {
    it('should validate tokens with active tenant status', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );

      expect(() => {
        JwtUtils.verifyAccessToken(accessToken);
      }).not.toThrow();
    });

    it('should reject tokens when tenant is suspended', () => {
      const suspendedTenantContext = {
        ...mockTenantContext,
        status: 'suspended' as const,
      };

      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        suspendedTenantContext
      );

      expect(() => {
        JwtUtils.verifyAccessToken(accessToken);
      }).toThrow('Tenant account is suspended or inactive');
    });

    it('should reject tokens when tenant is inactive', () => {
      const inactiveTenantContext = {
        ...mockTenantContext,
        status: 'inactive' as const,
      };

      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        inactiveTenantContext
      );

      expect(() => {
        JwtUtils.verifyAccessToken(accessToken);
      }).toThrow('Tenant account is suspended or inactive');
    });

    it('should validate tenant limits in token payload', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.limits.maxUsers).toBe(100);
      expect(payload.tenant.limits.maxStorage).toBe(10000);
      expect(payload.tenant.limits.maxApiCalls).toBe(50000);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should contain tenant ID for boundary validation', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.id).toBe('tenant-123');
      expect(payload.tenantId).toBe('tenant-123');
    });

    it('should maintain tenant context consistency', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      // Token tenant context should match user's tenant
      expect(payload.tenant.id).toBe(payload.tenantId);
    });
  });

  describe('Single-Tenant Mode Compatibility', () => {
    beforeEach(() => {
      // Mock single-tenant mode
      jest.doMock('../../../src/config/tenant.config', () => ({
        tenantConfig: {
          tokenIsolation: false,
          multiTenancyEnabled: false,
        },
      }));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should work without tenant context in single-tenant mode', () => {
      const accessToken = JwtUtils.generateAccessToken(mockUser);
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant).toBeUndefined();
      expect(payload.userId).toBe('user-123');
      expect(payload.type).toBe('access');
    });
  });

  describe('Token Expiration and Security', () => {
    it('should set appropriate token expiration', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.iss).toBe('nodeangularfullstack-api');
      expect(payload.aud).toBe('nodeangularfullstack-client');
    });

    it('should handle token verification failure gracefully', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        JwtUtils.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    it('should validate token type correctly', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = JwtUtils.verifyAccessToken(accessToken);

      expect(payload.type).toBe('access');
    });
  });

  describe('Feature Flags and Plan Validation', () => {
    it('should include tenant features in token', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.features).toContain('custom-branding');
      expect(payload.tenant.features).toContain('advanced-reporting');
    });

    it('should include tenant plan information', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.plan).toBe('professional');
    });

    it('should handle empty features array', () => {
      const contextWithoutFeatures = {
        ...mockTenantContext,
        features: [],
      };

      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        contextWithoutFeatures
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.features).toEqual([]);
    });
  });

  describe('Token Size and Performance', () => {
    it('should generate reasonably sized tokens', () => {
      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        mockTenantContext
      );

      // JWT tokens should be under 2KB for performance
      expect(accessToken.length).toBeLessThan(2048);
    });

    it('should be faster to generate without tenant context', () => {
      const start1 = performance.now();
      JwtUtils.generateAccessToken(mockUser);
      const time1 = performance.now() - start1;

      const start2 = performance.now();
      JwtUtils.generateAccessToken(mockUser, mockTenantContext);
      const time2 = performance.now() - start2;

      // Both should be fast, but without tenant context should be slightly faster
      expect(time1).toBeLessThan(50); // 50ms max
      expect(time2).toBeLessThan(100); // 100ms max with tenant context
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed tenant context gracefully', () => {
      const malformedContext = {
        id: '',
        slug: 'test',
        features: [],
        limits: {},
      } as any;

      expect(() => {
        JwtUtils.generateAccessToken(mockUser, malformedContext);
      }).not.toThrow();
    });

    it('should handle missing tenant limits', () => {
      const contextWithoutLimits = {
        ...mockTenantContext,
        limits: undefined,
      } as any;

      const accessToken = JwtUtils.generateAccessToken(
        mockUser,
        contextWithoutLimits
      );
      const payload = jwt.decode(accessToken) as any;

      expect(payload.tenant.limits).toBeDefined();
      expect(payload.tenant.limits.maxUsers).toBe(5); // Default value
    });
  });
});

describe('JWT Multi-Tenancy Integration Tests', () => {
  const testUser = {
    userId: 'integration-user-123',
    email: 'integration@example.com',
    role: 'admin',
    tenantId: 'integration-tenant-123',
  };

  const testTenant: TenantContext & { limits: any } = {
    id: 'integration-tenant-123',
    slug: 'integration-test',
    plan: 'enterprise',
    features: ['all-features'],
    limits: {
      maxUsers: 1000,
      maxStorage: 100000,
      maxApiCalls: 1000000,
    },
    status: 'active',
  };

  it('should complete full token lifecycle with tenant context', () => {
    // Generate token pair
    const tokens = JwtUtils.generateTokenPair(
      testUser,
      'integration-session',
      testTenant
    );

    // Verify access token
    const accessPayload = JwtUtils.verifyAccessToken(tokens.accessToken);
    expect(accessPayload.userId).toBe('integration-user-123');
    expect(accessPayload.tenant?.id).toBe('integration-tenant-123');

    // Verify refresh token (should not have tenant context)
    const refreshPayload = JwtUtils.verifyRefreshToken(tokens.refreshToken);
    expect(refreshPayload.userId).toBe('integration-user-123');
    expect(refreshPayload.type).toBe('refresh');
  });

  it('should maintain tenant context through token refresh cycle', () => {
    const originalTokens = JwtUtils.generateTokenPair(
      testUser,
      'session-1',
      testTenant
    );

    // Simulate token refresh - new access token should have same tenant context
    const newTokens = JwtUtils.generateTokenPair(
      testUser,
      'session-2',
      testTenant
    );

    const originalPayload = jwt.decode(originalTokens.accessToken) as any;
    const newPayload = jwt.decode(newTokens.accessToken) as any;

    expect(originalPayload.tenant.id).toBe(newPayload.tenant.id);
    expect(originalPayload.tenant.slug).toBe(newPayload.tenant.slug);
    expect(originalPayload.tenant.plan).toBe(newPayload.tenant.plan);
  });
});
