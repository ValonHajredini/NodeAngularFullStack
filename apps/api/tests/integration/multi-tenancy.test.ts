import { Pool } from 'pg';
import { databaseService } from '../../src/services/database.service';
import { tenantRepository, CreateTenantData } from '../../src/repositories/tenant.repository';
import { usersRepository, CreateUserData } from '../../src/repositories/users.repository';
import { BaseRepository, TenantContext } from '../../src/repositories/base.repository';
import { isMultiTenancyEnabled, getDefaultTenantId } from '../../src/utils/tenant.utils';

describe('Multi-Tenancy Integration Tests', () => {
  let pool: Pool;
  let testTenant1Id: string;
  let testTenant2Id: string;
  let testUser1Id: string;

  beforeAll(async () => {
    pool = databaseService.getPool();

    // Run migrations if needed
    await pool.query('SELECT 1'); // Test connection
  });

  beforeEach(async () => {
    // Clear tenant context first
    await pool.query('SELECT clear_tenant_context()');

    // Clean up test data with broader patterns to catch all test data
    await pool.query('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3 OR email LIKE $4)', ['%test-tenant%', '%example.com%', '%rls%', '%perf%']);
    await pool.query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2 OR email LIKE $3 OR email LIKE $4', ['%test-tenant%', '%example.com%', '%rls%', '%perf%']);
    await pool.query('DELETE FROM tenants WHERE slug LIKE $1 OR slug LIKE $2 OR slug LIKE $3 OR slug LIKE $4 OR slug LIKE $5', ['test-tenant%', '%test%', 'rls-%', 'performance-%', 'integrity-%']);

    // Reset test variables
    testTenant1Id = '';
    testTenant2Id = '';
    testUser1Id = '';
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Tenant Creation and Management', () => {
    it('should create tenant with default settings', async () => {
      const tenantData: CreateTenantData = {
        name: 'Test Company 1',
        slug: 'test-tenant-1',
        plan: 'professional'
      };

      const tenant = await tenantRepository.create(tenantData);

      expect(tenant).toBeDefined();
      expect(tenant.name).toBe(tenantData.name);
      expect(tenant.slug).toBe(tenantData.slug);
      expect(tenant.plan).toBe(tenantData.plan);
      expect(tenant.settings).toBeDefined();
      expect(tenant.settings.features).toBeDefined();
      expect(tenant.settings.isolation.level).toBe('row');
      expect(tenant.settings.isolation.rls).toBe(true);

      testTenant1Id = tenant.id;
    });

    it('should reject duplicate tenant slugs', async () => {
      const tenantData: CreateTenantData = {
        name: 'Test Company 1',
        slug: 'test-tenant-duplicate',
        plan: 'free'
      };

      await tenantRepository.create(tenantData);

      await expect(tenantRepository.create(tenantData)).rejects.toThrow('Tenant slug already exists');
    });

    it('should update tenant settings', async () => {
      const tenant = await tenantRepository.create({
        name: 'Test Company Update',
        slug: 'test-tenant-update'
      });

      const updatedTenant = await tenantRepository.updateSettings(tenant.id, {
        branding: {
          primaryColor: '#ff0000'
        },
        features: {
          customBranding: true,
          advancedReports: true
        }
      });

      expect(updatedTenant.settings.branding?.primaryColor).toBe('#ff0000');
      expect(updatedTenant.settings.features.customBranding).toBe(true);
      expect(updatedTenant.settings.features.advancedReports).toBe(true);
    });

    it('should validate tenant feature access', async () => {
      const tenant = await tenantRepository.create({
        name: 'Feature Test Company',
        slug: 'test-tenant-features',
        plan: 'enterprise'
      });

      const hasSSO = await tenantRepository.hasFeature(tenant.id, 'sso');
      const hasBasicFeature = await tenantRepository.hasFeature(tenant.id, 'userManagement');

      expect(hasSSO).toBe(true); // Enterprise plan includes SSO
      expect(hasBasicFeature).toBe(true); // All plans include user management
    });
  });

  describe('Tenant Isolation in Database Operations', () => {
    beforeEach(async () => {
      // Create test tenants
      const tenant1 = await tenantRepository.create({
        name: 'Tenant 1',
        slug: 'test-tenant-1',
        plan: 'professional'
      });
      testTenant1Id = tenant1.id;

      const tenant2 = await tenantRepository.create({
        name: 'Tenant 2',
        slug: 'test-tenant-2',
        plan: 'starter'
      });
      testTenant2Id = tenant2.id;

      // Create test users for each tenant
      const user1Data: CreateUserData = {
        email: 'user1@test-tenant-1.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'User',
        lastName: 'One',
        tenantId: testTenant1Id
      };
      const user1 = await usersRepository.create(user1Data);
      testUser1Id = user1.id;

      const user2Data: CreateUserData = {
        email: 'user2@test-tenant-2.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'User',
        lastName: 'Two',
        tenantId: testTenant2Id
      };
      await usersRepository.create(user2Data);
    });

    it('should isolate users by tenant in findByEmail', async () => {
      const user1InTenant1 = await usersRepository.findByEmail(
        'user1@test-tenant-1.com',
        testTenant1Id
      );
      expect(user1InTenant1).toBeDefined();
      expect(user1InTenant1?.id).toBe(testUser1Id);

      const user1InTenant2 = await usersRepository.findByEmail(
        'user1@test-tenant-1.com',
        testTenant2Id
      );
      expect(user1InTenant2).toBeNull();
    });

    it('should prevent cross-tenant access using BaseRepository', async () => {
      class TestUsersRepository extends BaseRepository<any> {
        constructor() {
          super('users');
        }
      }

      const testRepo = new TestUsersRepository();
      const tenant1Context: TenantContext = {
        id: testTenant1Id,
        slug: 'test-tenant-1'
      };

      const tenant2Context: TenantContext = {
        id: testTenant2Id,
        slug: 'test-tenant-2'
      };

      // User 1 should be accessible with tenant 1 context
      const user1WithTenant1 = await testRepo.findById(testUser1Id, tenant1Context);
      expect(user1WithTenant1).toBeDefined();

      // User 1 should NOT be accessible with tenant 2 context
      const user1WithTenant2 = await testRepo.findById(testUser1Id, tenant2Context);
      expect(user1WithTenant2).toBeNull();
    });

    it('should validate tenant access for updates', async () => {
      class TestUsersRepository extends BaseRepository<any> {
        constructor() {
          super('users');
        }
      }

      const testRepo = new TestUsersRepository();
      const tenant1Context: TenantContext = {
        id: testTenant1Id,
        slug: 'test-tenant-1'
      };

      const tenant2Context: TenantContext = {
        id: testTenant2Id,
        slug: 'test-tenant-2'
      };

      // Should be able to update user with correct tenant context
      const updatedUser = await testRepo.update(
        testUser1Id,
        { first_name: 'Updated' },
        tenant1Context
      );
      expect(updatedUser.first_name).toBe('Updated');

      // Should not be able to update user with wrong tenant context
      await expect(
        testRepo.update(testUser1Id, { first_name: 'Hacked' }, tenant2Context)
      ).rejects.toThrow('not found or access denied');
    });

    it('should count users correctly per tenant', async () => {
      const tenant1UserCount = await usersRepository.countByTenant(testTenant1Id);
      const tenant2UserCount = await usersRepository.countByTenant(testTenant2Id);

      expect(tenant1UserCount).toBe(1);
      expect(tenant2UserCount).toBe(1);
    });

    it('should find users with pagination per tenant', async () => {
      const tenant1Users = await usersRepository.findWithPagination({
        tenantId: testTenant1Id,
        limit: 10
      });

      const tenant2Users = await usersRepository.findWithPagination({
        tenantId: testTenant2Id,
        limit: 10
      });

      expect(tenant1Users.users).toHaveLength(1);
      expect(tenant1Users.users[0].email).toBe('user1@test-tenant-1.com');

      expect(tenant2Users.users).toHaveLength(1);
      expect(tenant2Users.users[0].email).toBe('user2@test-tenant-2.com');
    });
  });

  describe('Single-Tenant Mode Optimization', () => {
    const originalEnv = process.env.ENABLE_MULTI_TENANCY;

    beforeAll(() => {
      // Temporarily disable multi-tenancy for these tests
      process.env.ENABLE_MULTI_TENANCY = 'false';
    });

    afterAll(() => {
      // Restore original environment
      process.env.ENABLE_MULTI_TENANCY = originalEnv;
    });

    it('should operate without tenant filtering in single-tenant mode', async () => {
      expect(isMultiTenancyEnabled()).toBe(false);

      const userData: CreateUserData = {
        email: 'single-tenant-user@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'Single',
        lastName: 'Tenant',
        tenantId: undefined
      };

      const user = await usersRepository.create(userData);
      expect(user).toBeDefined();
      expect(user.tenantId).toBeNull();

      // Should find user without tenant context
      const foundUser = await usersRepository.findByEmail('single-tenant-user@example.com');
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
    });

    it('should use default tenant ID in single-tenant mode', async () => {
      const defaultTenantId = getDefaultTenantId();
      expect(defaultTenantId).toBe('00000000-0000-0000-0000-000000000000');
    });
  });

  describe('Row-Level Security Policies', () => {
    beforeEach(async () => {
      // Ensure we have test tenants and users
      if (!testTenant1Id) {
        const tenant1 = await tenantRepository.create({
          name: 'RLS Test Tenant 1',
          slug: 'rls-tenant-1'
        });
        testTenant1Id = tenant1.id;
      }

      if (!testTenant2Id) {
        const tenant2 = await tenantRepository.create({
          name: 'RLS Test Tenant 2',
          slug: 'rls-tenant-2'
        });
        testTenant2Id = tenant2.id;
      }
    });

    it('should set and clear tenant context for RLS', async () => {
      // Set tenant context
      await pool.query('SELECT set_tenant_context($1)', [testTenant1Id]);

      // Verify context is set
      const contextResult = await pool.query('SELECT get_current_tenant_id()');
      expect(contextResult.rows[0].get_current_tenant_id).toBe(testTenant1Id);

      // Clear context
      await pool.query('SELECT clear_tenant_context()');

      // Verify context is cleared
      const clearedResult = await pool.query('SELECT get_current_tenant_id()');
      expect(clearedResult.rows[0].get_current_tenant_id).toBeNull();
    });

    it('should validate tenant API access', async () => {
      // Ensure we have a valid tenant
      if (!testTenant1Id) {
        const tenant = await tenantRepository.create({
          name: 'RLS API Test Tenant',
          slug: 'rls-api-test-tenant'
        });
        testTenant1Id = tenant.id;
      }

      // Create a test user
      const userData: CreateUserData = {
        email: 'rls-test@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'RLS',
        lastName: 'Test',
        tenantId: testTenant1Id
      };
      const user = await usersRepository.create(userData);

      // Test valid tenant access
      const validAccess = await pool.query(
        'SELECT validate_tenant_api_access($1, $2)',
        [testTenant1Id, user.id]
      );
      expect(validAccess.rows[0].validate_tenant_api_access).toBe(true);

      // Test invalid tenant access
      const invalidAccess = await pool.query(
        'SELECT validate_tenant_api_access($1, $2)',
        [testTenant2Id, user.id]
      );
      expect(invalidAccess.rows[0].validate_tenant_api_access).toBe(false);
    });

    it('should check tenant feature access via database function', async () => {
      const timestamp = Date.now();
      const tenant = await tenantRepository.create({
        name: 'Feature Test',
        slug: `feature-test-rls-${timestamp}`,
        plan: 'enterprise'
      });

      // Test feature that should be enabled
      const ssoAccess = await pool.query(
        'SELECT check_tenant_feature_access($1, $2)',
        [tenant.id, 'sso']
      );
      expect(ssoAccess.rows[0].check_tenant_feature_access).toBe(true);

      // Test feature that should be disabled
      const fakeFeature = await pool.query(
        'SELECT check_tenant_feature_access($1, $2)',
        [tenant.id, 'nonexistent_feature']
      );
      expect(fakeFeature.rows[0].check_tenant_feature_access).toBe(false);
    });

    it('should enforce tenant limits via database function', async () => {
      // Get the actual tenant limit
      const tenantInfo = await pool.query(
        'SELECT max_users FROM tenants WHERE id = $1',
        [testTenant1Id]
      );
      const actualLimit = tenantInfo.rows[0].max_users;

      // Test user limit enforcement - usage within limit
      const withinLimit = await pool.query(
        'SELECT check_tenant_limit($1, $2, $3)',
        [testTenant1Id, 'users', actualLimit - 1] // Within limit
      );
      expect(withinLimit.rows[0].check_tenant_limit).toBe(true);

      // Test exactly at limit
      const atLimit = await pool.query(
        'SELECT check_tenant_limit($1, $2, $3)',
        [testTenant1Id, 'users', actualLimit] // At limit (should pass)
      );
      expect(atLimit.rows[0].check_tenant_limit).toBe(false); // >= limit should be false

      // Test exceeding the limit
      const exceedsLimit = await pool.query(
        'SELECT check_tenant_limit($1, $2, $3)',
        [testTenant1Id, 'users', actualLimit + 1] // Exceeds limit
      );
      expect(exceedsLimit.rows[0].check_tenant_limit).toBe(false);
    });
  });

  describe('Performance Comparison', () => {
    it('should measure query performance in single vs multi-tenant mode', async () => {
      // Create test data
      const timestamp = Date.now();
      const tenant = await tenantRepository.create({
        name: 'Performance Test',
        slug: `performance-test-${timestamp}`
      });

      // Create multiple users
      const users = [];
      for (let i = 0; i < 10; i++) {
        const user = await usersRepository.create({
          email: `perf-user-${i}@example.com`,
          passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
          firstName: 'Perf',
          lastName: `User${i}`,
          tenantId: tenant.id
        });
        users.push(user);
      }

      // Measure query performance with tenant filtering
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        await usersRepository.findByTenant(tenant.id, 10);
      }
      const endTime = Date.now();

      const avgResponseTime = (endTime - startTime) / 100;
      console.log(`Average tenant query time: ${avgResponseTime}ms`);

      // Performance should be reasonable (less than 50ms per query)
      expect(avgResponseTime).toBeLessThan(50);
    });
  });

  describe('Data Integrity and Security', () => {
    it('should maintain data integrity during tenant operations', async () => {
      const timestamp = Date.now();
      const tenant = await tenantRepository.create({
        name: 'Integrity Test',
        slug: `integrity-test-${timestamp}`
      });

      // Create user
      const user = await usersRepository.create({
        email: 'integrity@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'Integrity',
        lastName: 'Test',
        tenantId: tenant.id
      });

      // Verify user is associated with tenant
      const foundUser = await usersRepository.findById(user.id);
      expect(foundUser?.tenantId).toBe(tenant.id);

      // Delete tenant (soft delete)
      await tenantRepository.delete(tenant.id);

      // Verify tenant is marked inactive
      const deletedTenant = await tenantRepository.findById(tenant.id);
      expect(deletedTenant?.isActive).toBe(false);

      // User should still exist but tenant should be inactive
      const userAfterTenantDelete = await usersRepository.findById(user.id);
      expect(userAfterTenantDelete).toBeDefined();
    });

    it('should prevent unauthorized cross-tenant data access', async () => {
      // This test verifies that even with direct database access,
      // users cannot access data from other tenants when proper
      // tenant context is set

      const timestamp = Date.now();
      const tenant1 = await tenantRepository.create({
        name: 'Security Test 1',
        slug: `security-test-1-${timestamp}`
      });

      const tenant2 = await tenantRepository.create({
        name: 'Security Test 2',
        slug: `security-test-2-${timestamp}`
      });

      await usersRepository.create({
        email: 'security1@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'Security',
        lastName: 'User1',
        tenantId: tenant1.id
      });

      await usersRepository.create({
        email: 'security2@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVLKvRRJmHb2bDPK',
        firstName: 'Security',
        lastName: 'User2',
        tenantId: tenant2.id
      });

      // Set tenant 1 context
      await pool.query('SELECT set_tenant_context($1)', [tenant1.id]);

      // Query should only return tenant 1 users
      const tenant1Users = await pool.query('SELECT * FROM users WHERE is_active = true');
      const tenant1UserEmails = tenant1Users.rows.map(row => row.email);

      expect(tenant1UserEmails).toContain('security1@example.com');
      expect(tenant1UserEmails).not.toContain('security2@example.com');

      // Set tenant 2 context
      await pool.query('SELECT set_tenant_context($1)', [tenant2.id]);

      // Query should only return tenant 2 users
      const tenant2Users = await pool.query('SELECT * FROM users WHERE is_active = true');
      const tenant2UserEmails = tenant2Users.rows.map(row => row.email);

      expect(tenant2UserEmails).toContain('security2@example.com');
      expect(tenant2UserEmails).not.toContain('security1@example.com');

      // Clear context
      await pool.query('SELECT clear_tenant_context()');
    });
  });
});