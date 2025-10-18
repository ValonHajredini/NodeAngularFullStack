-- Story 24.8 Test Theme Data
-- This SQL script inserts the three test themes required for comprehensive theme testing
-- Run this script against your local development database before executing Story 24.8 tests

-- WARNING: This script will check if themes already exist before inserting
-- If you need to update existing themes, run the cleanup script first

-- Theme 1: Story 24.8 - Light Theme
-- White background, dark text, blue primary (#3b82f6)
INSERT INTO themes (name, description, thumbnail_url, theme_config, created_at, updated_at)
SELECT
  'Story 24.8 - Light Theme',
  'Light theme for Story 24.8 testing: White background, dark text, blue primary (#3b82f6)',
  'https://nodeangularfullstack.nyc3.digitaloceanspaces.com/themes/thumbnails/story-24-8-light.webp',
  '{
    "desktop": {
      "primaryColor": "#3b82f6",
      "secondaryColor": "#60a5fa",
      "backgroundColor": "#ffffff",
      "textColorPrimary": "#1a1a1a",
      "textColorSecondary": "#4b5563",
      "fontFamilyHeading": "''Inter'', sans-serif",
      "fontFamilyBody": "''Inter'', sans-serif",
      "fieldBorderRadius": "6px",
      "fieldSpacing": "16px",
      "containerBackground": "rgba(255, 255, 255, 0.98)",
      "containerOpacity": 1.0,
      "containerPosition": "center",
      "backgroundImageUrl": null,
      "backgroundImagePosition": null
    },
    "mobile": {
      "fieldSpacing": "12px",
      "containerPosition": "top"
    }
  }'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = 'Story 24.8 - Light Theme'
);

-- Theme 2: Story 24.8 - Dark Theme
-- Dark background, light text, purple primary (#8b5cf6)
INSERT INTO themes (name, description, thumbnail_url, theme_config, created_at, updated_at)
SELECT
  'Story 24.8 - Dark Theme',
  'Dark theme for Story 24.8 testing: Dark background, light text, purple primary (#8b5cf6)',
  'https://nodeangularfullstack.nyc3.digitaloceanspaces.com/themes/thumbnails/story-24-8-dark.webp',
  '{
    "desktop": {
      "primaryColor": "#8b5cf6",
      "secondaryColor": "#a78bfa",
      "backgroundColor": "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
      "textColorPrimary": "#e0e0e0",
      "textColorSecondary": "#d1d5db",
      "fontFamilyHeading": "''Inter'', sans-serif",
      "fontFamilyBody": "''Inter'', sans-serif",
      "fieldBorderRadius": "6px",
      "fieldSpacing": "16px",
      "containerBackground": "rgba(139, 92, 246, 0.08)",
      "containerOpacity": 0.95,
      "containerPosition": "center",
      "backgroundImageUrl": null,
      "backgroundImagePosition": null
    },
    "mobile": {
      "fieldSpacing": "12px",
      "containerPosition": "top"
    }
  }'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = 'Story 24.8 - Dark Theme'
);

-- Theme 3: Story 24.8 - Custom Theme
-- Custom colors, fonts, spacing for edge case testing
INSERT INTO themes (name, description, thumbnail_url, theme_config, created_at, updated_at)
SELECT
  'Story 24.8 - Custom Theme',
  'Custom theme for Story 24.8 edge case testing: Unusual colors, fonts, and spacing',
  'https://nodeangularfullstack.nyc3.digitaloceanspaces.com/themes/thumbnails/story-24-8-custom.webp',
  '{
    "desktop": {
      "primaryColor": "#ec4899",
      "secondaryColor": "#fb923c",
      "backgroundColor": "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
      "textColorPrimary": "#451a03",
      "textColorSecondary": "#78350f",
      "fontFamilyHeading": "''Playfair Display'', serif",
      "fontFamilyBody": "''Merriweather'', serif",
      "fieldBorderRadius": "14px",
      "fieldSpacing": "20px",
      "containerBackground": "rgba(251, 146, 60, 0.12)",
      "containerOpacity": 0.92,
      "containerPosition": "center",
      "backgroundImageUrl": null,
      "backgroundImagePosition": null
    },
    "mobile": {
      "fieldSpacing": "16px",
      "containerPosition": "top"
    }
  }'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM themes WHERE name = 'Story 24.8 - Custom Theme'
);

-- Verification: List all Story 24.8 test themes
SELECT
  id,
  name,
  description,
  created_at
FROM themes
WHERE name LIKE 'Story 24.8%'
ORDER BY name;

-- Expected Output:
-- 3 rows showing:
--   - Story 24.8 - Custom Theme
--   - Story 24.8 - Dark Theme
--   - Story 24.8 - Light Theme
