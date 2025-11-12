/**
 * Seed Data: Appointment Booking Template
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.12 - Appointment Booking Template with Time Slot Management
 *
 * Creates a production-ready appointment booking template with:
 * - Service type selection (Consultation, Full Session, Follow-up)
 * - Date picker with validation
 * - Time slot selection (09:00-17:00 business hours)
 * - Customer contact information fields
 * - Business logic: maxBookingsPerSlot = 3, conflict detection enabled
 */

import { Pool } from 'pg';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Seed appointment booking template
 * @param pool - PostgreSQL connection pool
 */
export async function seedAppointmentTemplate(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if template already exists
    const existing = await client.query(
      `SELECT id FROM form_templates WHERE name = 'Appointment Booking'`
    );

    if (existing.rows.length > 0) {
      console.log('✓ Appointment Booking template already exists, skipping...');
      await client.query('COMMIT');
      return;
    }

    // Template schema with comprehensive field definitions
    const templateSchema = {
      id: 'appointment-template-001',
      formId: 'appointment-form-001',
      version: 1,
      isPublished: true,
      fields: [
        {
          id: 'service_type',
          type: 'SELECT',
          label: 'Service Type',
          fieldName: 'service_type',
          required: true,
          placeholder: 'Select a service',
          description: 'Choose the type of appointment you need',
          order: 1,
          options: [
            {
              label: 'Consultation (30 min)',
              value: 'consultation',
              description: 'Initial consultation session'
            },
            {
              label: 'Full Session (60 min)',
              value: 'full_session',
              description: 'Comprehensive appointment'
            },
            {
              label: 'Follow-up (15 min)',
              value: 'followup',
              description: 'Quick follow-up appointment'
            }
          ],
          validation: {
            required: true
          }
        },
        {
          id: 'appointment_date',
          type: 'DATE',
          label: 'Preferred Date',
          fieldName: 'appointment_date',
          required: true,
          placeholder: 'Select a date',
          description: 'Choose your preferred appointment date',
          order: 2,
          validation: {
            required: true,
            minDate: 'today' // Prevent past dates
          }
        },
        {
          id: 'time_slot',
          type: 'SELECT',
          label: 'Time Slot',
          fieldName: 'time_slot',
          required: true,
          placeholder: 'Select a time slot',
          description: 'Select an available time slot',
          order: 3,
          options: [
            { label: '09:00 - 10:00', value: '09:00-10:00' },
            { label: '10:00 - 11:00', value: '10:00-11:00' },
            { label: '11:00 - 12:00', value: '11:00-12:00' },
            { label: '12:00 - 13:00', value: '12:00-13:00' },
            { label: '13:00 - 14:00', value: '13:00-14:00' },
            { label: '14:00 - 15:00', value: '14:00-15:00' },
            { label: '15:00 - 16:00', value: '15:00-16:00' },
            { label: '16:00 - 17:00', value: '16:00-17:00' }
          ],
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
          order: 4,
          validation: {
            required: true,
            minLength: 2,
            maxLength: 100,
            pattern: '^[a-zA-Z\\s]+$' // Letters and spaces only
          }
        },
        {
          id: 'customer_email',
          type: 'EMAIL',
          label: 'Email Address',
          fieldName: 'customer_email',
          required: true,
          placeholder: 'your.email@example.com',
          description: 'We will send appointment confirmation to this email',
          order: 5,
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
          description: 'Contact number for appointment reminders',
          order: 6,
          validation: {
            required: true,
            pattern: '^[\\d\\s()+-]+$' // Phone number format
          }
        },
        {
          id: 'notes',
          type: 'TEXTAREA',
          label: 'Additional Notes',
          fieldName: 'notes',
          required: false,
          placeholder: 'Any specific requests or information...',
          description: 'Optional notes for your appointment',
          order: 7,
          validation: {
            maxLength: 500
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
          successMessage: 'Your appointment has been booked successfully! You will receive a confirmation email shortly.',
          allowMultipleSubmissions: true,
          redirectUrl: null
        },
        styling: {
          theme: 'default',
          customCss: null
        }
      }
    };

    // Business logic configuration
    const businessLogicConfig = {
      type: 'appointment',
      dateField: 'appointment_date',
      timeSlotField: 'time_slot',
      maxBookingsPerSlot: 3, // Allow up to 3 concurrent bookings per slot
      bookingsTable: 'appointment_bookings',
      requireConfirmation: true
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
        'Appointment Booking',
        TemplateCategory.SERVICES,
        'Professional appointment booking template with automatic conflict detection and time slot management. Ideal for service providers, consultants, healthcare practitioners, and any business requiring scheduled appointments. Features include: double-booking prevention, customer contact collection, service type selection, and customizable time slots.',
        JSON.stringify(templateSchema),
        JSON.stringify(businessLogicConfig),
        true,
        '/assets/templates/appointment-booking-preview.png' // Update with actual preview image path
      ]
    );

    const templateId = result.rows[0].id;

    console.log(`✓ Appointment Booking template created successfully (ID: ${templateId})`);
    console.log('  - Category: SERVICES');
    console.log('  - Fields: 7 (service type, date, time slot, name, email, phone, notes)');
    console.log('  - Business Logic: Conflict detection enabled (max 3 bookings per slot)');
    console.log('  - Time Slots: 09:00-17:00 (8 hourly slots)');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Error seeding appointment template:', error);
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
  console.log('\n🌱 Seeding Appointment Booking Template (032)...\n');
  await seedAppointmentTemplate(pool);
  console.log('\n✅ Appointment template seed completed\n');
}
