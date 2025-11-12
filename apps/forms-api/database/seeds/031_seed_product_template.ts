/**
 * Seed script for product template with inventory tracking
 * Inserts product template with IMAGE_GALLERY variant metadata and inventory records
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.11 - Product Template with Inventory Tracking
 * Task: 9 - Create Product Template Seed Data
 */

import {
  databaseService,
  DatabaseService,
} from '../../src/services/database.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Product template with IMAGE_GALLERY and inventory tracking
 */
const productTemplate = {
  name: 'T-Shirt Product Order',
  description:
    'E-commerce product order form with image gallery selection, inventory tracking, and automatic stock management',
  category: 'ecommerce',
  previewImageUrl: null,
  templateSchema: {
    fields: [
      {
        id: 'product_heading',
        type: FormFieldType.HEADING,
        label: 'Premium T-Shirt Collection',
        fieldName: 'product_heading',
        required: false,
        order: 1,
        metadata: {
          headingLevel: 'h2',
          alignment: 'center',
          color: '#1e40af',
          fontWeight: 'bold',
        },
      },
      {
        id: 'product_description',
        type: FormFieldType.TEXT_BLOCK,
        label: 'Product Description',
        fieldName: 'product_description',
        required: false,
        order: 2,
        metadata: {
          content:
            '<p>Select your favorite color and size from our premium T-shirt collection. Made from 100% organic cotton with eco-friendly dyes.</p>',
          alignment: 'center',
          padding: 'small',
        },
      },
      {
        id: 'product_images',
        type: FormFieldType.IMAGE_GALLERY,
        label: 'Select Product Variant',
        fieldName: 'product_images',
        required: true,
        order: 3,
        helpText: 'Click on an image to select your preferred color and size',
        metadata: {
          images: [
            {
              key: 'variant_red_m',
              url: 'https://via.placeholder.com/400x400/EF4444/FFFFFF?text=Red+Medium',
              alt: 'Red T-Shirt - Medium',
            },
            {
              key: 'variant_blue_m',
              url: 'https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=Blue+Medium',
              alt: 'Blue T-Shirt - Medium',
            },
            {
              key: 'variant_green_l',
              url: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=Green+Large',
              alt: 'Green T-Shirt - Large',
            },
          ],
          columns: 3,
          aspectRatio: 'square',
        },
        // Variant metadata for inventory tracking (Story 29.11 AC2/AC3)
        variantMetadata: [
          {
            sku: 'TSHIRT-RED-M',
            size: 'M',
            color: 'Red',
            priceModifier: 0,
            displayName: 'Red - Medium',
          },
          {
            sku: 'TSHIRT-BLUE-M',
            size: 'M',
            color: 'Blue',
            priceModifier: 100, // +$1.00
            displayName: 'Blue - Medium',
          },
          {
            sku: 'TSHIRT-GREEN-L',
            size: 'L',
            color: 'Green',
            priceModifier: 200, // +$2.00
            displayName: 'Green - Large',
          },
        ],
      },
      {
        id: 'quantity',
        type: FormFieldType.NUMBER,
        label: 'Quantity',
        fieldName: 'quantity',
        required: true,
        order: 4,
        placeholder: 'Enter quantity (1-99)',
        helpText: 'Maximum 99 units per order',
        validation: {
          min: 1,
          max: 99,
          errorMessage: 'Quantity must be between 1 and 99',
        },
        defaultValue: 1,
      },
      {
        id: 'customer_divider',
        type: FormFieldType.DIVIDER,
        label: 'Customer Information',
        fieldName: 'customer_divider',
        required: false,
        order: 5,
      },
      {
        id: 'customer_name',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        fieldName: 'customer_name',
        required: true,
        order: 6,
        placeholder: 'John Doe',
        validation: {
          minLength: 2,
          maxLength: 100,
          errorMessage: 'Name must be between 2 and 100 characters',
        },
      },
      {
        id: 'customer_email',
        type: FormFieldType.EMAIL,
        label: 'Email Address',
        fieldName: 'customer_email',
        required: true,
        order: 7,
        placeholder: 'john.doe@example.com',
        helpText: 'Order confirmation will be sent to this email',
      },
      {
        id: 'customer_phone',
        type: FormFieldType.TEXT,
        label: 'Phone Number',
        fieldName: 'customer_phone',
        required: false,
        order: 8,
        placeholder: '+1 (555) 123-4567',
        helpText: 'Optional - for delivery updates',
      },
      {
        id: 'shipping_address',
        type: FormFieldType.TEXTAREA,
        label: 'Shipping Address',
        fieldName: 'shipping_address',
        required: true,
        order: 9,
        placeholder: '123 Main Street, Apartment 4B, New York, NY 10001',
        helpText: 'Include street address, city, state, and ZIP code',
        validation: {
          minLength: 10,
          maxLength: 500,
          errorMessage: 'Address must be between 10 and 500 characters',
        },
      },
      {
        id: 'special_instructions',
        type: FormFieldType.TEXTAREA,
        label: 'Special Instructions (Optional)',
        fieldName: 'special_instructions',
        required: false,
        order: 10,
        placeholder: 'Any special delivery instructions or gift wrapping requests...',
        validation: {
          maxLength: 500,
        },
      },
    ],
    settings: {
      layout: {
        columns: 1,
        spacing: 'medium',
      },
      submission: {
        showSuccessMessage: true,
        successMessage:
          'Thank you for your order! Confirmation email sent to your inbox.',
        allowMultipleSubmissions: true,
        submitButtonText: 'Place Order',
        sendEmailNotification: true,
      },
    },
  },
  // Business logic config for inventory tracking (Story 29.11 AC4)
  businessLogicConfig: {
    type: 'inventory',
    variantField: 'product_images',
    quantityField: 'quantity',
    stockTable: 'product_inventory',
  },
};

/**
 * Initial inventory records for product variants
 */
const inventoryRecords = [
  {
    sku: 'TSHIRT-RED-M',
    stockQuantity: 50,
    reservedQuantity: 0,
    description: 'Red T-Shirt - Medium',
  },
  {
    sku: 'TSHIRT-BLUE-M',
    stockQuantity: 30,
    reservedQuantity: 0,
    description: 'Blue T-Shirt - Medium',
  },
  {
    sku: 'TSHIRT-GREEN-L',
    stockQuantity: 20,
    reservedQuantity: 0,
    description: 'Green T-Shirt - Large',
  },
];

/**
 * Validates template schema structure
 */
function validateTemplateSchema(schema: Record<string, any>): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (!Array.isArray(schema.fields)) return false;
  if (!schema.settings || typeof schema.settings !== 'object') return false;
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

/**
 * Gets database URL from environment variables
 */
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
 * Seeds the product template with inventory tracking
 */
async function seedProductTemplate(): Promise<void> {
  try {
    await ensureDatabaseConnection();
    console.log('🌱 Seeding product template with inventory tracking...');

    // Validate template schema
    if (!validateTemplateSchema(productTemplate.templateSchema)) {
      throw new Error(
        `Invalid template schema for template: ${productTemplate.name}`
      );
    }

    // Check schema size (must be < 100KB)
    const schemaSize = Buffer.byteLength(
      JSON.stringify(productTemplate.templateSchema)
    );
    if (schemaSize > 102400) {
      throw new Error(
        `Template schema for "${productTemplate.name}" exceeds 100KB limit (${schemaSize} bytes)`
      );
    }

    // Insert product template
    const templateResult = await databaseService.query(
      `INSERT INTO form_templates (
        name,
        description,
        category,
        preview_image_url,
        template_schema,
        business_logic_config,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        preview_image_url = EXCLUDED.preview_image_url,
        template_schema = EXCLUDED.template_schema,
        business_logic_config = EXCLUDED.business_logic_config,
        updated_at = NOW()
      RETURNING id, name, category`,
      [
        productTemplate.name,
        productTemplate.description,
        productTemplate.category,
        productTemplate.previewImageUrl,
        JSON.stringify(productTemplate.templateSchema),
        JSON.stringify(productTemplate.businessLogicConfig),
      ]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Failed to insert product template');
    }

    const template = templateResult.rows[0];
    console.log(
      `✅ Template "${template.name}" [${template.category}] seeded successfully (ID: ${template.id})`
    );

    // Create a demo form for inventory association
    // Note: Forms don't have template_id column, so this is a standalone demo form
    // In production, users would create forms from this template
    const formResult = await databaseService.query(
      `INSERT INTO forms (
        user_id,
        title,
        description,
        status,
        created_at,
        updated_at
      )
      VALUES (
        (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
        'Demo: T-Shirt Product Order',
        'Demo product order form with inventory tracking (created from Product Template)',
        'draft',
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id`
    );

    let formId: string;
    if (formResult.rows.length > 0) {
      formId = formResult.rows[0].id;
      console.log(`✅ Created inventory form (ID: ${formId})`);
    } else {
      // Form already exists, fetch it
      const existingForm = await databaseService.query(
        `SELECT id FROM forms WHERE title = 'Demo: T-Shirt Product Order' LIMIT 1`
      );
      if (existingForm.rows.length === 0) {
        throw new Error('Failed to create or retrieve demo form');
      }
      formId = existingForm.rows[0].id;
      console.log(`ℹ️  Using existing demo form (ID: ${formId})`);
    }

    // Seed inventory records
    console.log('📦 Seeding inventory records...');
    let inventoryCount = 0;

    for (const record of inventoryRecords) {
      const inventoryResult = await databaseService.query(
        `INSERT INTO product_inventory (
          form_id,
          sku,
          stock_quantity,
          reserved_quantity,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (sku) DO UPDATE SET
          form_id = EXCLUDED.form_id,
          stock_quantity = EXCLUDED.stock_quantity,
          reserved_quantity = EXCLUDED.reserved_quantity,
          updated_at = NOW()
        RETURNING id, sku, stock_quantity`,
        [formId, record.sku, record.stockQuantity, record.reservedQuantity]
      );

      if (inventoryResult.rows.length > 0) {
        const inv = inventoryResult.rows[0];
        console.log(
          `  ✅ ${record.sku}: ${inv.stock_quantity} units (ID: ${inv.id})`
        );
        inventoryCount++;
      }
    }

    console.log(
      `🎉 Successfully seeded product template with ${inventoryCount} inventory records`
    );
    console.log(`📊 Inventory Summary:`);
    console.log(`   - Total SKUs: ${inventoryCount}`);
    console.log(
      `   - Total Stock: ${inventoryRecords.reduce((sum, r) => sum + r.stockQuantity, 0)} units`
    );
  } catch (error) {
    console.error('❌ Error seeding product template:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await seedProductTemplate();
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
