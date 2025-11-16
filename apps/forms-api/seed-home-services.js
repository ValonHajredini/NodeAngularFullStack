const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'nodeangularfullstack_forms',
  user: 'dbuser',
  password: 'dbpassword'
});

async function seedHomeServicesTemplate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if template already exists
    const existing = await client.query(
      `SELECT id FROM form_templates WHERE name = 'Home Services Booking'`
    );

    if (existing.rows.length > 0) {
      console.log('✓ Home Services Booking template already exists');
      await client.query('COMMIT');
      return;
    }

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
          order: 1,
          options: [
            { label: 'Plumbing', value: 'plumbing' },
            { label: 'Electrical', value: 'electrical' },
            { label: 'HVAC', value: 'hvac' },
            { label: 'Cleaning', value: 'cleaning' },
            { label: 'Appliance Repair', value: 'appliance_repair' },
            { label: 'Handyman', value: 'handyman' }
          ],
          validation: { required: true }
        },
        {
          id: 'urgency_level',
          type: 'SELECT',
          label: 'Urgency Level',
          fieldName: 'urgency_level',
          required: true,
          order: 2,
          options: [
            { label: 'Emergency (Same Day)', value: 'emergency' },
            { label: 'Urgent (1-2 Days)', value: 'urgent' },
            { label: 'Normal (3-7 Days)', value: 'normal' },
            { label: 'Scheduled (Flexible)', value: 'scheduled' }
          ],
          validation: { required: true }
        },
        {
          id: 'issue_description',
          type: 'TEXTAREA',
          label: 'Service Description',
          fieldName: 'issue_description',
          required: true,
          order: 3,
          placeholder: 'Please describe the issue or service needed...',
          validation: { required: true, minLength: 20, maxLength: 1000 }
        },
        {
          id: 'service_address',
          type: 'TEXT',
          label: 'Service Address',
          fieldName: 'service_address',
          required: true,
          order: 4,
          placeholder: '123 Main St',
          validation: { required: true }
        },
        {
          id: 'preferred_date',
          type: 'DATE',
          label: 'Preferred Service Date',
          fieldName: 'preferred_date',
          required: true,
          order: 5,
          placeholder: 'Select preferred date',
          description: 'Your preferred date for the service visit',
          validation: { required: true, minDate: 'today' }
        },
        {
          id: 'time_slot',
          type: 'TIME_SLOT',
          label: 'Preferred Time Slot',
          fieldName: 'time_slot',
          required: true,
          order: 6,
          placeholder: 'Select preferred time',
          description: 'Choose your preferred time window',
          metadata: {
            interval: '3h',
            startTime: '08:00',
            endTime: '20:00',
            timeFormat: '12h',
            useGlobalDefaults: true
          },
          validation: { required: true }
        },
        {
          id: 'customer_name',
          type: 'TEXT',
          label: 'Full Name',
          fieldName: 'customer_name',
          required: true,
          order: 7,
          placeholder: 'Enter your full name',
          validation: { required: true, minLength: 2, maxLength: 100 }
        },
        {
          id: 'customer_email',
          type: 'EMAIL',
          label: 'Email Address',
          fieldName: 'customer_email',
          required: true,
          order: 8,
          placeholder: 'your.email@example.com',
          description: 'We will send service confirmation to this email',
          validation: { required: true }
        },
        {
          id: 'customer_phone',
          type: 'TEL',
          label: 'Phone Number',
          fieldName: 'customer_phone',
          required: true,
          order: 9,
          placeholder: '(555) 123-4567',
          description: 'Contact number for service coordination',
          validation: { required: true }
        },
        {
          id: 'contact_preference',
          type: 'SELECT',
          label: 'Preferred Contact Method',
          fieldName: 'contact_preference',
          required: true,
          order: 10,
          options: [
            { label: 'Phone Call', value: 'phone' },
            { label: 'Text Message (SMS)', value: 'sms' },
            { label: 'Email', value: 'email' }
          ],
          validation: { required: true }
        }
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium', labelPosition: 'top' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Your service request has been submitted successfully! We will contact you shortly.',
          allowMultipleSubmissions: true,
          redirectUrl: null
        },
        styling: { theme: 'default', customCss: null }
      }
    };

    const businessLogicConfig = {
      type: 'appointment',
      dateField: 'preferred_date',
      timeSlotField: 'time_slot',
      maxBookingsPerSlot: 5,
      bookingsTable: 'appointment_bookings',
      allowOverbook: false,
      globalTimeSlotDefaults: {
        interval: '3h',
        startTime: '08:00',
        endTime: '20:00',
        timeFormat: '12h'
      }
    };

    await client.query(
      `INSERT INTO form_templates (name, category, description, template_schema, business_logic_config, is_active)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        'Home Services Booking',
        'services',
        'Home services booking template for plumbers, electricians, and other service providers',
        JSON.stringify(templateSchema),
        JSON.stringify(businessLogicConfig),
        true
      ]
    );

    console.log('✅ Home Services Booking template created successfully!');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedHomeServicesTemplate();
