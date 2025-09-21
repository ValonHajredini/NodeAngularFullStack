import bcrypt from 'bcryptjs';
import { databaseService, DatabaseService } from '../services/database.service';

/**
 * Test user credentials for development environment.
 * These credentials should only be used in development mode.
 */
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'readonly';
  emailVerified: boolean;
  isActive: boolean;
  tenantId?: string;
}

/**
 * Database seeding utility for creating test data.
 * Provides methods to populate the database with test users and scenarios.
 */
export class SeedUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Ensures the database connection is initialized before running queries.
   */
  private static async ensureDatabaseConnection(): Promise<void> {
    const status = databaseService.getStatus();
    if (!status.isConnected) {
      const dbConfig = DatabaseService.parseConnectionUrl(this.getDatabaseUrl());
      await databaseService.initialize(dbConfig);
    }
  }

  private static getDatabaseUrl(): string {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
      return process.env.DATABASE_URL;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const name = process.env.DB_NAME || 'nodeangularfullstack';
    const user = process.env.DB_USER || 'dbuser';
    const password = process.env.DB_PASSWORD || 'dbpassword';

    return `postgresql://${user}:${password}@${host}:${port}/${name}`;
  }

  /**
   * Predefined test users with secure credentials.
   * Passwords are hashed with bcrypt before insertion.
   */
  private static readonly TEST_USERS: TestUser[] = [
    {
      email: 'admin@example.com',
      password: 'Admin123!@#',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      emailVerified: true,
      isActive: true
    },
    {
      email: 'user@example.com',
      password: 'User123!@#',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
      emailVerified: true,
      isActive: true
    },
    {
      email: 'readonly@example.com',
      password: 'Read123!@#',
      firstName: 'Readonly',
      lastName: 'User',
      role: 'readonly',
      emailVerified: true,
      isActive: true
    },
    {
      email: 'inactive@example.com',
      password: 'Inactive123!@#',
      firstName: 'Inactive',
      lastName: 'User',
      role: 'user',
      emailVerified: true,
      isActive: false
    },
    {
      email: 'unverified@example.com',
      password: 'Unverified123!@#',
      firstName: 'Unverified',
      lastName: 'User',
      role: 'user',
      emailVerified: false,
      isActive: true
    }
  ];

  /**
   * Creates a single test user in the database.
   * @param user - Test user data with plain text password
   * @returns Promise that resolves when user is created
   * @throws Error if user creation fails
   */
  public static async createUser(user: TestUser): Promise<void> {
    try {
      // Hash the password with bcrypt
      const passwordHash = await bcrypt.hash(user.password, this.SALT_ROUNDS);

      // Set last_login to a realistic timestamp for some users
      const lastLogin = user.role === 'admin' || user.email === 'user@example.com'
        ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
        : null;

      const query = `
        INSERT INTO users (
          tenant_id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          email_verified,
          is_active,
          last_login
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email, tenant_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          email_verified = EXCLUDED.email_verified,
          is_active = EXCLUDED.is_active,
          last_login = EXCLUDED.last_login,
          updated_at = CURRENT_TIMESTAMP
      `;

      const params = [
        user.tenantId || null,
        user.email,
        passwordHash,
        user.firstName,
        user.lastName,
        user.role,
        user.emailVerified,
        user.isActive,
        lastLogin
      ];

      await databaseService.query(query, params);
      console.log(`✅ Created test user: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`❌ Failed to create user ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Creates all predefined test users in the database.
   * Uses transaction to ensure all users are created atomically.
   * @param tenantId - Optional tenant ID for multi-tenant mode
   * @returns Promise that resolves when all users are created
   */
  public static async createTestUsers(tenantId?: string): Promise<void> {
    try {
      console.log('🌱 Creating test users...');

      const usersWithTenant = this.TEST_USERS.map(user => ({
        ...user,
        tenantId
      }));

      for (const user of usersWithTenant) {
        await this.createUser(user);
      }

      console.log(`🎉 Successfully created ${this.TEST_USERS.length} test users`);
    } catch (error) {
      console.error('❌ Failed to create test users:', error);
      throw error;
    }
  }

  /**
   * Creates test tenant data for multi-tenant scenarios.
   * @returns Promise that resolves with created tenant information
   */
  public static async createTestTenant(): Promise<{ id: string; slug: string }> {
    try {
      console.log('🏢 Creating test tenant...');

      const query = `
        INSERT INTO tenants (
          name,
          slug,
          settings,
          is_active
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          settings = EXCLUDED.settings,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, slug
      `;

      const settings = {
        branding: {
          primaryColor: '#007bff',
          logo: null
        },
        features: {
          multiUser: true,
          apiAccess: true,
          customReports: false
        }
      };

      const result = await databaseService.query(query, [
        'Test Organization',
        'test-org',
        JSON.stringify(settings),
        true
      ]);

      const tenant = result.rows[0];
      console.log(`✅ Created test tenant: ${tenant.slug} (ID: ${tenant.id})`);
      return tenant;
    } catch (error) {
      console.error('❌ Failed to create test tenant:', error);
      throw error;
    }
  }

  /**
   * Seeds the database with comprehensive test data.
   * Creates tenants (if multi-tenancy enabled) and test users.
   * @returns Promise that resolves when seeding is complete
   */
  public static async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding process...');

      await this.ensureDatabaseConnection();

      // Check if multi-tenancy is enabled
      const isMultiTenant = process.env.ENABLE_MULTI_TENANCY === 'true';

      if (isMultiTenant) {
        console.log('🏢 Multi-tenancy enabled, creating test tenant...');
        const tenant = await this.createTestTenant();
        await this.createTestUsers(tenant.id);
      } else {
        console.log('👤 Single-tenant mode, creating test users...');
        await this.createTestUsers();
      }

      console.log('🎉 Database seeding completed successfully');
      console.log('📋 Test credentials:');
      this.TEST_USERS.forEach(user => {
        console.log(`   ${user.email} / ${user.password} (${user.role})`);
      });
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Gets test user credentials for display in development mode.
   * @returns Array of test user credentials (without password hashes)
   */
  public static getTestCredentials(): Array<{
    email: string;
    password: string;
    role: string;
    description: string;
  }> {
    return this.TEST_USERS.map(user => ({
      email: user.email,
      password: user.password,
      role: user.role,
      description: `${user.firstName} ${user.lastName} - ${user.role} role${!user.isActive ? ' (inactive)' : ''}${!user.emailVerified ? ' (unverified)' : ''}`
    }));
  }

  /**
   * Clears all test data from the database.
   * WARNING: This will delete all users and related data!
   * @returns Promise that resolves when cleanup is complete
   */
  public static async clearTestData(): Promise<void> {
    try {
      console.log('🧹 Clearing test data...');

      await this.ensureDatabaseConnection();

      // Delete in order to respect foreign key constraints
      await databaseService.query('DELETE FROM password_resets');
      await databaseService.query('DELETE FROM sessions');
      await databaseService.query('DELETE FROM users');

      // Only delete test tenant, not the default one
      await databaseService.query(`DELETE FROM tenants WHERE slug = 'test-org'`);

      console.log('✅ Test data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear test data:', error);
      throw error;
    }
  }

  /**
   * Verifies that test users were created correctly.
   * @returns Promise that resolves to verification results
   */
  public static async verifyTestUsers(): Promise<{
    success: boolean;
    usersFound: number;
    expectedUsers: number;
    missingUsers: string[];
  }> {
    try {
      await this.ensureDatabaseConnection();

      const expectedEmails = this.TEST_USERS.map(u => u.email);
      const missingUsers: string[] = [];

      for (const email of expectedEmails) {
        const result = await databaseService.query(
          'SELECT email FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length === 0) {
          missingUsers.push(email);
        }
      }

      return {
        success: missingUsers.length === 0,
        usersFound: expectedEmails.length - missingUsers.length,
        expectedUsers: expectedEmails.length,
        missingUsers
      };
    } catch (error) {
      console.error('❌ Failed to verify test users:', error);
      return {
        success: false,
        usersFound: 0,
        expectedUsers: this.TEST_USERS.length,
        missingUsers: this.TEST_USERS.map(u => u.email)
      };
    }
  }
}
