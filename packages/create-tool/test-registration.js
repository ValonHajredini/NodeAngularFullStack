#!/usr/bin/env node

/**
 * Test script for tool registration API integration.
 * Tests authentication, registration, and error handling.
 */

const { RegistryApiClient } = require('./dist/api/registry-client');
const { saveRegistration, getRegistration } = require('./dist/utils/registration-cache');

// Test metadata
const testMetadata = {
  toolId: 'test-api-integration-tool',
  toolName: 'Test API Integration Tool',
  description: 'Testing tool registration API',
  icon: 'pi-test',
  version: '1.0.0',
  permissions: ['user', 'admin'],
  features: ['backend', 'database', 'component'],
};

async function runTests() {
  console.log('🧪 Testing Tool Registration API Integration\n');

  // Test 1: Create API client
  console.log('1️⃣  Creating API client...');
  const apiUrl = process.env.CREATE_TOOL_API_URL || 'http://localhost:3000';
  const client = new RegistryApiClient(apiUrl);
  console.log('   ✅ API client created\n');

  // Test 2: Generate manifest
  console.log('2️⃣  Generating tool manifest...');
  const manifest = client.generateManifest(testMetadata);
  console.log('   ✅ Manifest generated:', {
    id: manifest.id,
    version: manifest.version,
    features: manifest.features,
  });
  console.log();

  // Test 3: Authentication
  console.log('3️⃣  Testing authentication...');
  try {
    console.log('   Attempting login with:');
    console.log('   Email:', process.env.CREATE_TOOL_ADMIN_EMAIL || 'admin@example.com');
    console.log('   Password:', '***' + (process.env.CREATE_TOOL_ADMIN_PASSWORD || '').slice(-3));
    const token = await client.authenticate();
    console.log('   ✅ Authentication successful');
    console.log('   Token:', token.substring(0, 20) + '...\n');
  } catch (error) {
    console.error('   ❌ Authentication failed:', error.message);
    console.error('   Full error:', error);
    console.log('\n⚠️  Cannot proceed with registration test without authentication\n');
    process.exit(1);
  }

  // Test 4: Tool registration
  console.log('4️⃣  Testing tool registration...');
  try {
    const result = await client.registerTool(testMetadata);
    console.log('   ✅ Registration successful:', {
      toolId: result.toolId,
      message: result.message,
    });
    console.log();

    // Test 5: Save to cache
    console.log('5️⃣  Testing registration cache...');
    await saveRegistration(testMetadata.toolId, 'success', result);
    const cached = await getRegistration(testMetadata.toolId);
    console.log('   ✅ Cache saved and retrieved:', {
      toolId: cached?.toolId,
      status: cached?.status,
    });
    console.log();
  } catch (error) {
    console.error('   ⚠️  Registration failed:', error.message);

    // This is expected if tool already exists
    if (error.message.includes('already registered')) {
      console.log('   ℹ️  This is expected if the tool was previously registered');
      console.log('   Testing cache for failed registration...\n');

      await saveRegistration(testMetadata.toolId, 'failed', null, error.message);
      const cached = await getRegistration(testMetadata.toolId);
      console.log('   ✅ Cache saved for failed registration:', {
        toolId: cached?.toolId,
        status: cached?.status,
        error: cached?.error?.substring(0, 50) + '...',
      });
      console.log();
    } else {
      console.log('\n❌ Unexpected registration error\n');
      process.exit(1);
    }
  }

  console.log('✅ All tests passed!\n');
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
