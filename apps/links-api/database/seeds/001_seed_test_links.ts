import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5435'),
  database: process.env.DB_NAME || 'links_db',
  user: process.env.DB_USER || 'dbuser',
  password: process.env.DB_PASSWORD || 'dbpassword',
});

async function seedTestLinks(): Promise<void> {
  console.log('🌱 Seeding test short links...');

  try {
    // Use the same test user IDs from the main database
    const testUserId = '8941f3c2-a64d-4eb0-b22b-58caedcc4697'; // Admin user from main DB
    const testFormId = '397a514c-19b6-4b3a-87e3-24b281b2457d'; // Test form ID

    // Clear existing test data
    await pool.query('TRUNCATE TABLE click_analytics CASCADE');
    await pool.query('TRUNCATE TABLE short_links CASCADE');

    // Seed short links
    const links = [
      {
        userId: testUserId,
        resourceType: 'form',
        resourceId: testFormId,
        originalUrl: `http://localhost:4200/public/form/${testFormId}`,
        shortCode: nanoid(8),
        token: null,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
      {
        userId: testUserId,
        resourceType: 'generic',
        resourceId: null,
        originalUrl: 'https://example.com/long-url-example',
        shortCode: nanoid(8),
        token: null,
        expiresAt: null, // Never expires
      },
      {
        userId: testUserId,
        resourceType: 'svg',
        resourceId: null,
        originalUrl: 'http://localhost:4200/tools/svg-drawing/viewer/123',
        shortCode: nanoid(8),
        token: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    ];

    for (const link of links) {
      const result = await pool.query(
        `INSERT INTO short_links
        (user_id, resource_type, resource_id, original_url, short_code, token, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          link.userId,
          link.resourceType,
          link.resourceId,
          link.originalUrl,
          link.shortCode,
          link.token,
          link.expiresAt,
        ]
      );

      console.log(`✅ Created short link: ${link.shortCode} -> ${link.originalUrl}`);

      // Add some test analytics for the first link
      if (link.resourceType === 'form') {
        await pool.query(
          `INSERT INTO click_analytics
          (short_link_id, ip_address, user_agent, device_type, browser, os)
          VALUES
          ($1, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'desktop', 'Chrome', 'Windows'),
          ($1, '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)', 'mobile', 'Safari', 'iOS'),
          ($1, '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'desktop', 'Firefox', 'macOS')`,
          [result.rows[0].id]
        );

        console.log(`📊 Added 3 test analytics entries for ${link.shortCode}`);
      }
    }

    console.log('🎉 Seeding completed successfully!');
    console.log(`\n📋 Test Short Links:`);
    links.forEach((link) => {
      console.log(`   ${link.shortCode}: ${link.originalUrl}`);
    });
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seeding
seedTestLinks().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
