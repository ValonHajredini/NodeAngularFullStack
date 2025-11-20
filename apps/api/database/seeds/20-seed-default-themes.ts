/**
 * Seed script for default form themes
 * Inserts 8 pre-designed themes into the form_themes table
 */

import {
  databaseService,
  DatabaseService,
} from '../../src/services/database.service';
import themes from './default-themes.json';
import { ResponsiveThemeConfig } from '@nodeangularfullstack/shared';

/**
 * Validates theme configuration against ResponsiveThemeConfig interface
 */
function validateThemeConfig(
  themeConfig: any
): themeConfig is ResponsiveThemeConfig {
  if (!themeConfig || typeof themeConfig !== 'object') {
    return false;
  }

  if (!themeConfig.desktop || typeof themeConfig.desktop !== 'object') {
    return false;
  }

  const requiredDesktopProps = [
    'primaryColor',
    'secondaryColor',
    'backgroundColor',
    'textColorPrimary',
    'textColorSecondary',
    'fontFamilyHeading',
    'fontFamilyBody',
    'fieldBorderRadius',
    'fieldSpacing',
    'containerBackground',
    'containerOpacity',
    'containerPosition',
  ];

  for (const prop of requiredDesktopProps) {
    if (!(prop in themeConfig.desktop)) {
      console.error(`Missing required desktop property: ${prop}`);
      return false;
    }
  }

  return true;
}

/**
 * Ensures the database connection is initialized before running queries.
 */
async function ensureDatabaseConnection(): Promise<void> {
  const status = databaseService.getStatus();
  if (!status.isConnected) {
    const dbConfig = DatabaseService.parseConnectionUrl(getDatabaseUrl());
    await databaseService.initialize(dbConfig);
  }
}

function getDatabaseUrl(): string {
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
 * Seeds default themes into the database
 */
export async function seedDefaultThemes(): Promise<void> {
  try {
    await ensureDatabaseConnection();
    console.log('🌱 Starting default themes seed...');

    for (const theme of themes) {
      // Validate theme configuration
      if (!validateThemeConfig(theme.themeConfig)) {
        throw new Error(`Invalid theme configuration for theme: ${theme.name}`);
      }

      // Insert theme with conflict handling
      const result = await databaseService.query(
        `INSERT INTO form_themes (name, description, thumbnail_url, theme_config, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           thumbnail_url = EXCLUDED.thumbnail_url,
           theme_config = EXCLUDED.theme_config,
           updated_at = NOW()
         RETURNING id, name`,
        [
          theme.name,
          theme.description,
          theme.thumbnailUrl,
          JSON.stringify(theme.themeConfig),
        ]
      );

      if (result.rows.length > 0) {
        console.log(
          `✅ Theme "${theme.name}" seeded successfully (ID: ${result.rows[0].id})`
        );
      } else {
        console.log(`⚠️  Theme "${theme.name}" already exists, skipped`);
      }
    }

    console.log('🎉 Successfully seeded 8 default themes');
  } catch (error) {
    console.error('❌ Error seeding default themes:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await seedDefaultThemes();
    process.exit(0);
  } catch (error) {
    console.error('Seed script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
