/**
 * Default Users Seed
 *
 * Creates default users if the database is empty.
 * Safe to run multiple times - only creates users if none exist.
 *
 * Default users:
 * - Admin: admin@example.com / User123!@#
 * - User: user@example.com / User123!@#
 * - ReadOnly: readonly@example.com / User123!@#
 *
 * Usage:
 *   npm run db:seed
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'read_only';
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Check if any users exist in the database
 */
async function usersExist(pool: Pool): Promise<boolean> {
  const result = await pool.query('SELECT COUNT(*) FROM users');
  const count = parseInt(result.rows[0].count, 10);
  return count > 0;
}

/**
 * Create default users
 */
async function createDefaultUsers(pool: Pool): Promise<void> {
  const defaultPassword = 'User123!@#';
  const hashedPassword = await hashPassword(defaultPassword);

  const defaultUsers: Omit<User, 'id'>[] = [
    {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'user@example.com',
      password: hashedPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true,
    },
    {
      email: 'readonly@example.com',
      password: hashedPassword,
      firstName: 'ReadOnly',
      lastName: 'User',
      role: 'read_only',
      isActive: true,
      emailVerified: true,
    },
  ];

  console.log('📝 Creating default users...');

  for (const user of defaultUsers) {
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (
        id, email, password, first_name, last_name,
        role, is_active, email_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        userId,
        user.email,
        user.password,
        user.firstName,
        user.lastName,
        user.role,
        user.isActive,
        user.emailVerified,
      ]
    );

    console.log(`✅ Created user: ${user.email} (${user.role})`);
  }
}

/**
 * Main seed function
 */
async function seed() {
  let pool: Pool | null = null;

  try {
    // Create database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'nodeangularfullstack',
      user: process.env.DB_USER || 'dbuser',
      password: process.env.DB_PASSWORD || 'dbpassword',
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    console.log('🔍 Checking if users exist...');

    // Check if users already exist
    if (await usersExist(pool)) {
      console.log('✓ Users already exist. Skipping seed.');
      console.log('💡 To reset users, manually delete from database first.');
      return;
    }

    console.log('📦 No users found. Creating default users...');

    // Create default users
    await createDefaultUsers(pool);

    console.log('');
    console.log('✅ Default users created successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:');
    console.log('  Email:    admin@example.com');
    console.log('  Password: User123!@#');
    console.log('  Role:     admin');
    console.log('');
    console.log('Regular User:');
    console.log('  Email:    user@example.com');
    console.log('  Password: User123!@#');
    console.log('  Role:     user');
    console.log('');
    console.log('Read-Only User:');
    console.log('  Email:    readonly@example.com');
    console.log('  Password: User123!@#');
    console.log('  Role:     read_only');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Close database connection
    if (pool) {
      await pool.end();
    }
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seed;
