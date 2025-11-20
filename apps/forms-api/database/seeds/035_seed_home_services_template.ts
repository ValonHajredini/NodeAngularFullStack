/**
 * Seed Data: Home Services Booking Template
 * Epic: 29 - Form Template System with Business Logic
 * Category: SERVICES - Professional Home Service Provider Template
 *
 * Creates a production-ready home services booking template with:
 * - Service type selection (Plumbing, Electrical, Cleaning, Repair, etc.)
 * - Service location (customer address)
 * - Issue/service description with urgency level
 * - Preferred date and time slot with flexible scheduling
 * - Customer contact information
 * - Photo upload option for issue documentation
 * - Business logic: maxBookingsPerSlot = 5, conflict detection enabled
 *
 * Use Cases:
 * - Plumbing services
 * - Electrical repairs
 * - HVAC maintenance
 * - Cleaning services
 * - Handyman services
 * - Appliance repair
 * - Pest control
 * - Landscaping
 */

import { Pool } from 'pg';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Seed home services booking template
 * @param pool - PostgreSQL connection pool
 */
export async function seedHomeServicesTemplate(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if template already exists
    const existing = await client.query(
      `SELECT id FROM form_templates WHERE name = 'Home Services Booking'`
    );

    if (existing.rows.length > 0) {
      console.log('✓ Home Services Booking template already exists, skipping...');
      await client.query('COMMIT');
      return;
    }

    // Template schema with comprehensive field definitions
    const templateSchema = {
      id: 'home-services-template-001',
      formId: 'home-services-form-001',
      version: 1,
      isPublished: true,
      fields: [
        {
          id: 'service_category',
          type: 'SELECT',
          label: 'Service Type',
          fieldName: 'service_category',
          required: true,
          placeholder: 'Select service type',
          description: 'Choose the type of service you need',
          order: 1,
          options: [
            {
              label: 'Plumbing',
              value: 'plumbing',
              description: 'Pipes, drains, fixtures, water heaters'
            },
            {
              label: 'Electrical',
              value: 'electrical',
              description: 'Wiring, outlets, lighting, circuit breakers'
            },
            {
              label: 'HVAC',
              value: 'hvac',
              description: 'Heating, cooling, ventilation systems'
            },
            {
              label: 'Cleaning',
              value: 'cleaning',
              description: 'Deep cleaning, maintenance cleaning'
            },
            {
              label: 'Appliance Repair',
              value: 'appliance_repair',
              description: 'Refrigerator, washer, dryer, dishwasher'
            },
            {
              label: 'Handyman',
              value: 'handyman',
              description: 'General repairs and installations'
            },
            {
              label: 'Pest Control',
              value: 'pest_control',
              description: 'Insects, rodents, wildlife removal'
            },
            {
              label: 'Landscaping',
              value: 'landscaping',
              description: 'Lawn care, tree trimming, yard work'
            },
            {
              label: 'Locksmith',
              value: 'locksmith',
              description: 'Lock installation, key duplication, lockouts'
            },
            {
              label: 'Other',
              value: 'other',
              description: 'Other service not listed'
            }
          ],
          validation: {
            required: true
          }
        },
        {
          id: 'urgency_level',
          type: 'SELECT',
          label: 'Urgency Level',
          fieldName: 'urgency_level',
          required: true,
          placeholder: 'How urgent is this service?',
          description: 'Helps us prioritize your service request',
          order: 2,
          options: [
            {
              label: 'Emergency (Same Day)',
              value: 'emergency',
              description: 'Critical issue requiring immediate attention'
            },
            {
              label: 'Urgent (1-2 Days)',
              value: 'urgent',
              description: 'Important issue needing prompt service'
            },
            {
              label: 'Normal (3-7 Days)',
              value: 'normal',
              description: 'Standard service request'
            },
            {
              label: 'Scheduled (Flexible)',
              value: 'scheduled',
              description: 'Non-urgent, flexible timing'
            }
          ],
          validation: {
            required: true
          }
        },
        {
          id: 'issue_description',
          type: 'TEXTAREA',
          label: 'Service Description',
          fieldName: 'issue_description',
          required: true,
          placeholder: 'Please describe the issue or service needed in detail...',
          description: 'Provide as much detail as possible to help us prepare',
          order: 3,
          validation: {
            required: true,
            minLength: 20,
            maxLength: 1000
          }
        },
        {
          id: 'service_address',
          type: 'TEXT',
          label: 'Service Address',
          fieldName: 'service_address',
          required: true,
          placeholder: '123 Main St',
          description: 'Street address where service is needed',
          order: 4,
          validation: {
            required: true,
            minLength: 5,
            maxLength: 200
          }
        },
        {
          id: 'service_city',
          type: 'TEXT',
          label: 'City',
          fieldName: 'service_city',
          required: true,
          placeholder: 'Enter city',
          description: 'City name',
          order: 5,
          validation: {
            required: true,
            minLength: 2,
            maxLength: 100
          }
        },
        {
          id: 'service_state',
          type: 'TEXT',
          label: 'State/Province',
          fieldName: 'service_state',
          required: true,
          placeholder: 'Enter state or province',
          description: 'State or province',
          order: 6,
          validation: {
            required: true,
            minLength: 2,
            maxLength: 50
          }
        },
        {
          id: 'service_zipcode',
          type: 'TEXT',
          label: 'ZIP/Postal Code',
          fieldName: 'service_zipcode',
          required: true,
          placeholder: '12345',
          description: 'ZIP or postal code',
          order: 7,
          validation: {
            required: true,
            pattern: '^[0-9]{5}(-[0-9]{4})?$|^[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$'
          }
        },
        {
          id: 'preferred_date',
          type: 'DATE',
          label: 'Preferred Service Date',
          fieldName: 'preferred_date',
          required: true,
          placeholder: 'Select preferred date',
          description: 'Your preferred date for the service visit',
          order: 8,
          validation: {
            required: true,
            minDate: 'today'
          }
        },
        {
          id: 'time_slot',
          type: 'TIME_SLOT',
          label: 'Preferred Time Slot',
          fieldName: 'time_slot',
          required: true,
          placeholder: 'Select preferred time',
          description: 'Choose your preferred time window',
          order: 9,
          metadata: {
            interval: '3h', // 3-hour windows
            startTime: '08:00',
            endTime: '20:00',
            timeFormat: '12h',
            useGlobalDefaults: true
          },
          validation: {
            required: true
          }
        },
        {
          id: 'customer_name',
          type: 'TEXT',
          label: 'Full Name',
          fieldName: 'customer_name',
          required: true,
          placeholder: 'Enter your full name',
          description: 'Your first and last name',
          order: 10,
          validation: {
            required: true,
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s]+$'
          }
        },
        {
          id: 'customer_email',
          type: 'EMAIL',
          label: 'Email Address',
          fieldName: 'customer_email',
          required: true,
          placeholder: 'your.email@example.com',
          description: 'We will send service confirmation to this email',
          order: 11,
          validation: {
            required: true,
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          }
        },
        {
          id: 'customer_phone',
          type: 'TEL',
          label: 'Phone Number',
          fieldName: 'customer_phone',
          required: true,
          placeholder: '(555) 123-4567',
          description: 'Contact number for service coordination',
          order: 12,
          validation: {
            required: true,
            pattern: '^[\\d\\s()+-]+$'
          }
        },
        {
          id: 'alternate_phone',
          type: 'TEL',
          label: 'Alternate Phone (Optional)',
          fieldName: 'alternate_phone',
          required: false,
          placeholder: '(555) 987-6543',
          description: 'Backup contact number',
          order: 13,
          validation: {
            pattern: '^[\\d\\s()+-]+$'
          }
        },
        {
          id: 'property_access',
          type: 'TEXTAREA',
          label: 'Property Access Instructions',
          fieldName: 'property_access',
          required: false,
          placeholder: 'Gate code, parking instructions, pet information, etc.',
          description: 'Any special instructions for accessing the property',
          order: 14,
          validation: {
            maxLength: 500
          }
        },
        {
          id: 'photo_upload',
          type: 'FILE',
          label: 'Upload Photo of Issue (Optional)',
          fieldName: 'photo_upload',
          required: false,
          placeholder: 'Upload image',
          description: 'Photo can help us better understand and prepare for the service',
          order: 15,
          validation: {
            accept: 'image/*',
            maxSize: 5242880 // 5MB in bytes
          }
        },
        {
          id: 'additional_notes',
          type: 'TEXTAREA',
          label: 'Additional Notes',
          fieldName: 'additional_notes',
          required: false,
          placeholder: 'Any other information we should know...',
          description: 'Optional additional details',
          order: 16,
          validation: {
            maxLength: 500
          }
        },
        {
          id: 'contact_preference',
          type: 'SELECT',
          label: 'Preferred Contact Method',
          fieldName: 'contact_preference',
          required: true,
          placeholder: 'How should we contact you?',
          description: 'Your preferred method for service confirmation and updates',
          order: 17,
          options: [
            { label: 'Phone Call', value: 'phone' },
            { label: 'Text Message (SMS)', value: 'sms' },
            { label: 'Email', value: 'email' }
          ],
          validation: {
            required: true
          }
        }
      ],
      settings: {
        layout: {
          columns: 1,
          spacing: 'medium',
          labelPosition: 'top'
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Your service request has been submitted successfully! We will contact you shortly to confirm the appointment and provide an estimated arrival time.',
          allowMultipleSubmissions: true,
          redirectUrl: null
        },
        styling: {
          theme: 'default',
          customCss: null
        }
      }
    };

    // Business logic configuration for appointment scheduling
    const businessLogicConfig = {
      type: 'appointment',
      dateField: 'preferred_date',
      timeSlotField: 'time_slot',
      maxBookingsPerSlot: 5, // Allow up to 5 concurrent service appointments per 3-hour window
      bookingsTable: 'appointment_bookings',
      allowOverbook: false,
      globalTimeSlotDefaults: {
        interval: '3h' as const, // 3-hour service windows
        startTime: '08:00',
        endTime: '20:00',
        timeFormat: '12h' as const
      }
    };

    // Insert template
    const result = await client.query(
      `
      INSERT INTO form_templates (
        name,
        category,
        description,
        template_schema,
        business_logic_config,
        is_active,
        preview_image_url
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
      RETURNING id
    `,
      [
        'Home Services Booking',
        TemplateCategory.SERVICES,
        'Comprehensive home services booking template for professional service providers (plumbing, electrical, HVAC, cleaning, repairs, etc.). Features include: service type categorization, urgency level tracking, detailed service location capture, flexible time slot scheduling with 3-hour windows, photo upload for issue documentation, property access instructions, and preferred contact method selection. Prevents double-booking with conflict detection (max 5 concurrent bookings per time window). Ideal for home service businesses, contractors, maintenance companies, and on-site service providers.',
        JSON.stringify(templateSchema),
        JSON.stringify(businessLogicConfig),
        true,
        '/assets/templates/home-services-booking-preview.png'
      ]
    );

    const templateId = result.rows[0].id;

    console.log(`✓ Home Services Booking template created successfully (ID: ${templateId})`);
    console.log('  - Category: SERVICES');
    console.log('  - Fields: 17 (service type, urgency, description, address, date, time slot, contact info, photo, notes)');
    console.log('  - Business Logic: Conflict detection enabled (max 5 bookings per 3-hour window)');
    console.log('  - Time Slots: 08:00-20:00 (4 three-hour windows: 8-11, 11-14, 14-17, 17-20)');
    console.log('  - Service Types: 10 (Plumbing, Electrical, HVAC, Cleaning, Appliance, Handyman, Pest, Landscaping, Locksmith, Other)');
    console.log('  - Urgency Levels: 4 (Emergency, Urgent, Normal, Scheduled)');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Error seeding home services template:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main execution function
 * Called by the seed script runner
 */
export async function run(pool: Pool): Promise<void> {
  console.log('\n🌱 Seeding Home Services Booking Template (035)...\n');
  await seedHomeServicesTemplate(pool);
  console.log('\n✅ Home services template seed completed\n');
}
