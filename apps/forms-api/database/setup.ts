#!/usr/bin/env ts-node

/**
 * Database setup script for initializing schema and seed data.
 * This script handles migration execution and test data creation.
 */

import { config as loadEnv } from 'dotenv';
import { databaseService, DatabaseService } from '../src/services/database.service';
import { MigrationUtils } from '../src/utils/migration.utils';
import { SeedUtils } from '../src/utils/seed.utils';
import { getConfig } from '../src/utils/config.utils';

// Load environment variables
loadEnv();

/**
 * Main setup function that initializes database and creates test data.
 */
async function setupDatabase(): Promise<void> {
  try {
    console.log('🚀 Starting database setup process...\n');

    // Initialize database connection
    console.log('📊 Connecting to database...');
    const config = getConfig();
    const dbConfig = DatabaseService.parseConnectionUrl(config.DATABASE_URL);
    await databaseService.initialize(dbConfig);

    // Test database connection
    console.log('🔍 Testing database connection...');
    await databaseService.testConnection();

    // Check if tables already exist
    console.log('🔍 Checking existing database schema...');
    const tablesExist = await MigrationUtils.checkTablesExist();

    if (!tablesExist) {
      console.log('📋 Tables not found, running migrations...');
      await MigrationUtils.setupDatabase();
    } else {
      console.log('✅ Tables already exist, skipping migrations');
    }

    // Validate schema
    console.log('🔍 Validating database schema...');
    const validation = await MigrationUtils.validateSchema();
    if (!validation.isValid) {
      console.error('❌ Schema validation failed:');
      validation.issues.forEach(issue => console.error(`   - ${issue}`));
      throw new Error('Database schema is invalid');
    }
    console.log('✅ Database schema is valid');

    // Check environment and seed data if in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🌱 Development environment detected, creating test data...');

      // Verify existing test users
      const verification = await SeedUtils.verifyTestUsers();
      if (!verification.success) {
        console.log(`📝 Creating ${verification.expectedUsers} test users...`);
        await SeedUtils.seedDatabase();

        // Verify seed data creation
        const newVerification = await SeedUtils.verifyTestUsers();
        if (newVerification.success) {
          console.log('✅ Test users verified successfully');
        } else {
          console.error('❌ Test user verification failed after seeding');
        }
      } else {
        console.log('✅ Test users already exist');
      }

      // Display test credentials
      console.log('\n📋 Test User Credentials (Development Only):');
      console.log('================================================');
      const credentials = SeedUtils.getTestCredentials();
      credentials.forEach(cred => {
        console.log(`${cred.email.padEnd(25)} | ${cred.password.padEnd(15)} | ${cred.role.padEnd(8)} | ${cred.description}`);
      });
      console.log('================================================\n');
    } else {
      console.log('🔒 Production environment, skipping test data creation');
    }

    // Final database status
    const status = databaseService.getStatus();
    console.log('📊 Database Status:');
    console.log(`   Connected: ${status.isConnected}`);
    console.log(`   Total Connections: ${status.totalConnections}`);
    console.log(`   Idle Connections: ${status.idleConnections}`);
    console.log(`   Waiting Clients: ${status.waitingClients}`);

    console.log('\n🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('\n❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await databaseService.close();
    process.exit(0);
  }
}

/**
 * Handle script execution and errors.
 */
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('💥 Unhandled error during database setup:', error);
    process.exit(1);
  });
}

export { setupDatabase };