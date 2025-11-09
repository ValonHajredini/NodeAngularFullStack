/**
 * Seed script for form templates
 * Inserts 12 initial templates (2 per category) into the form_templates table
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.1 - Database Schema and Template Storage Foundation
 */

import {
  databaseService,
  DatabaseService,
} from '../../src/services/database.service';
import { FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Template category type
 */
type TemplateCategory =
  | 'ecommerce'
  | 'services'
  | 'data_collection'
  | 'events'
  | 'quiz'
  | 'polls';

/**
 * Form template structure for seeding
 */
interface FormTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  previewImageUrl: string | null;
  templateSchema: Record<string, any>;
  businessLogicConfig: Record<string, any> | null;
}

/**
 * Template data for seeding
 */
const templates: FormTemplate[] = [
  // E-COMMERCE TEMPLATES
  {
    name: 'Product Order Form',
    description:
      'Complete e-commerce product ordering form with quantity selection, shipping details, and payment information',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'product_name',
          type: FormFieldType.SELECT,
          label: 'Product',
          fieldName: 'product_name',
          required: true,
          order: 1,
          options: [
            { label: 'Select a product', value: '' },
            { label: 'Product A', value: 'product_a' },
            { label: 'Product B', value: 'product_b' },
            { label: 'Product C', value: 'product_c' },
          ],
        },
        {
          id: 'quantity',
          type: FormFieldType.NUMBER,
          label: 'Quantity',
          fieldName: 'quantity',
          required: true,
          order: 2,
          validation: { min: 1, max: 100 },
          defaultValue: 1,
        },
        {
          id: 'customer_name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          fieldName: 'customer_name',
          required: true,
          order: 3,
          validation: { minLength: 2, maxLength: 100 },
        },
        {
          id: 'customer_email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          fieldName: 'customer_email',
          required: true,
          order: 4,
        },
        {
          id: 'shipping_address',
          type: FormFieldType.TEXTAREA,
          label: 'Shipping Address',
          fieldName: 'shipping_address',
          required: true,
          order: 5,
          validation: { minLength: 10, maxLength: 500 },
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Order received! We will contact you shortly.',
          allowMultipleSubmissions: true,
          submitButtonText: 'Place Order',
        },
      },
    },
    businessLogicConfig: {
      calculations: [
        {
          field: 'total_price',
          formula: 'quantity * product_price',
          trigger: 'onChange',
        },
      ],
      notifications: [
        {
          trigger: 'onSubmit',
          recipients: ['sales@example.com'],
          template: 'order_confirmation',
        },
      ],
    },
  },
  {
    name: 'Inventory Tracking Form',
    description:
      'Track product inventory levels, restock dates, and supplier information',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'product_sku',
          type: FormFieldType.TEXT,
          label: 'Product SKU',
          fieldName: 'product_sku',
          required: true,
          order: 1,
          validation: { minLength: 3, maxLength: 50 },
        },
        {
          id: 'product_name',
          type: FormFieldType.TEXT,
          label: 'Product Name',
          fieldName: 'product_name',
          required: true,
          order: 2,
        },
        {
          id: 'current_stock',
          type: FormFieldType.NUMBER,
          label: 'Current Stock Level',
          fieldName: 'current_stock',
          required: true,
          order: 3,
          validation: { min: 0 },
        },
        {
          id: 'reorder_level',
          type: FormFieldType.NUMBER,
          label: 'Reorder Level',
          fieldName: 'reorder_level',
          required: true,
          order: 4,
          validation: { min: 0 },
        },
        {
          id: 'supplier_name',
          type: FormFieldType.TEXT,
          label: 'Supplier Name',
          fieldName: 'supplier_name',
          required: false,
          order: 5,
        },
      ],
      settings: {
        layout: { columns: 2, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Inventory updated successfully',
          allowMultipleSubmissions: true,
          submitButtonText: 'Update Inventory',
        },
      },
    },
    businessLogicConfig: {
      validations: [
        {
          rule: 'current_stock < reorder_level',
          action: 'warn',
          message: 'Stock level is below reorder threshold',
        },
      ],
    },
  },

  // SERVICES TEMPLATES
  {
    name: 'Appointment Booking Form',
    description:
      'Book appointments with date/time selection, service type, and contact details',
    category: 'services',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'service_type',
          type: FormFieldType.SELECT,
          label: 'Service Type',
          fieldName: 'service_type',
          required: true,
          order: 1,
          options: [
            { label: 'Consultation', value: 'consultation' },
            { label: 'Follow-up', value: 'followup' },
            { label: 'New Service', value: 'new_service' },
          ],
        },
        {
          id: 'preferred_date',
          type: FormFieldType.DATE,
          label: 'Preferred Date',
          fieldName: 'preferred_date',
          required: true,
          order: 2,
        },
        {
          id: 'client_name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          fieldName: 'client_name',
          required: true,
          order: 3,
        },
        {
          id: 'client_email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          fieldName: 'client_email',
          required: true,
          order: 4,
        },
        {
          id: 'special_requests',
          type: FormFieldType.TEXTAREA,
          label: 'Special Requests',
          fieldName: 'special_requests',
          required: false,
          order: 5,
          placeholder: 'Any specific requirements or questions?',
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Appointment request received! We will confirm your booking shortly.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Request Appointment',
        },
      },
    },
    businessLogicConfig: {
      notifications: [
        {
          trigger: 'onSubmit',
          recipients: ['appointments@example.com'],
          template: 'appointment_request',
        },
      ],
      automations: [
        {
          trigger: 'onSubmit',
          action: 'check_availability',
          parameters: { dateField: 'preferred_date' },
        },
      ],
    },
  },
  {
    name: 'Service Request Form',
    description:
      'General service request form with priority levels and detailed description',
    category: 'services',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'request_type',
          type: FormFieldType.SELECT,
          label: 'Request Type',
          fieldName: 'request_type',
          required: true,
          order: 1,
          options: [
            { label: 'Maintenance', value: 'maintenance' },
            { label: 'Repair', value: 'repair' },
            { label: 'Installation', value: 'installation' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          id: 'priority',
          type: FormFieldType.RADIO,
          label: 'Priority Level',
          fieldName: 'priority',
          required: true,
          order: 2,
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ],
          defaultValue: 'medium',
        },
        {
          id: 'description',
          type: FormFieldType.TEXTAREA,
          label: 'Description',
          fieldName: 'description',
          required: true,
          order: 3,
          placeholder: 'Please describe your service request in detail...',
          validation: { minLength: 20, maxLength: 1000 },
        },
        {
          id: 'contact_name',
          type: FormFieldType.TEXT,
          label: 'Contact Name',
          fieldName: 'contact_name',
          required: true,
          order: 4,
        },
        {
          id: 'contact_phone',
          type: FormFieldType.TEXT,
          label: 'Phone Number',
          fieldName: 'contact_phone',
          required: true,
          order: 5,
          validation: {
            pattern: '^[0-9]{10,15}$',
            errorMessage: 'Please enter a valid phone number',
          },
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Service request submitted successfully',
          allowMultipleSubmissions: true,
          submitButtonText: 'Submit Request',
        },
      },
    },
    businessLogicConfig: {
      routing: [
        { condition: 'priority == "urgent"', assignTo: 'emergency_team' },
        { condition: 'priority == "high"', assignTo: 'priority_team' },
        { condition: 'default', assignTo: 'general_team' },
      ],
    },
  },

  // DATA COLLECTION TEMPLATES
  {
    name: 'Customer Survey Form',
    description:
      'Comprehensive customer satisfaction survey with rating scales and feedback',
    category: 'data_collection',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'customer_name',
          type: FormFieldType.TEXT,
          label: 'Name (Optional)',
          fieldName: 'customer_name',
          required: false,
          order: 1,
        },
        {
          id: 'overall_satisfaction',
          type: FormFieldType.RADIO,
          label: 'Overall Satisfaction',
          fieldName: 'overall_satisfaction',
          required: true,
          order: 2,
          options: [
            { label: 'Very Satisfied', value: '5' },
            { label: 'Satisfied', value: '4' },
            { label: 'Neutral', value: '3' },
            { label: 'Dissatisfied', value: '2' },
            { label: 'Very Dissatisfied', value: '1' },
          ],
        },
        {
          id: 'product_quality',
          type: FormFieldType.NUMBER,
          label: 'Product Quality (1-10)',
          fieldName: 'product_quality',
          required: true,
          order: 3,
          validation: { min: 1, max: 10 },
        },
        {
          id: 'customer_service',
          type: FormFieldType.NUMBER,
          label: 'Customer Service (1-10)',
          fieldName: 'customer_service',
          required: true,
          order: 4,
          validation: { min: 1, max: 10 },
        },
        {
          id: 'feedback',
          type: FormFieldType.TEXTAREA,
          label: 'Additional Comments',
          fieldName: 'feedback',
          required: false,
          order: 5,
          placeholder: 'Please share any additional feedback...',
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you for your feedback!',
          allowMultipleSubmissions: false,
          submitButtonText: 'Submit Survey',
        },
      },
    },
    businessLogicConfig: {
      analytics: [
        {
          metric: 'average_satisfaction',
          calculation: 'AVG(overall_satisfaction)',
        },
        {
          metric: 'nps_score',
          calculation: 'NPS(overall_satisfaction)',
        },
      ],
    },
  },
  {
    name: 'Contact Form',
    description:
      'Simple contact form with name, email, subject, and message fields',
    category: 'data_collection',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'contact_name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          fieldName: 'contact_name',
          required: true,
          order: 1,
        },
        {
          id: 'contact_email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          fieldName: 'contact_email',
          required: true,
          order: 2,
        },
        {
          id: 'subject',
          type: FormFieldType.TEXT,
          label: 'Subject',
          fieldName: 'subject',
          required: true,
          order: 3,
        },
        {
          id: 'message',
          type: FormFieldType.TEXTAREA,
          label: 'Message',
          fieldName: 'message',
          required: true,
          order: 4,
          validation: { minLength: 10, maxLength: 2000 },
          placeholder: 'How can we help you?',
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Thank you for contacting us! We will get back to you soon.',
          allowMultipleSubmissions: true,
          submitButtonText: 'Send Message',
          sendEmailNotification: true,
        },
      },
    },
    businessLogicConfig: {
      notifications: [
        {
          trigger: 'onSubmit',
          recipients: ['contact@example.com'],
          template: 'contact_form_submission',
        },
      ],
    },
  },

  // EVENTS TEMPLATES
  {
    name: 'Event RSVP Form',
    description:
      'RSVP form for events with attendance confirmation and meal preferences',
    category: 'events',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'attendee_name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          fieldName: 'attendee_name',
          required: true,
          order: 1,
        },
        {
          id: 'attendee_email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          fieldName: 'attendee_email',
          required: true,
          order: 2,
        },
        {
          id: 'attendance',
          type: FormFieldType.RADIO,
          label: 'Will you attend?',
          fieldName: 'attendance',
          required: true,
          order: 3,
          options: [
            { label: 'Yes, I will attend', value: 'yes' },
            { label: 'No, I cannot attend', value: 'no' },
            { label: 'Maybe', value: 'maybe' },
          ],
        },
        {
          id: 'guest_count',
          type: FormFieldType.NUMBER,
          label: 'Number of Guests',
          fieldName: 'guest_count',
          required: false,
          order: 4,
          validation: { min: 0, max: 5 },
          defaultValue: 0,
        },
        {
          id: 'meal_preference',
          type: FormFieldType.SELECT,
          label: 'Meal Preference',
          fieldName: 'meal_preference',
          required: false,
          order: 5,
          options: [
            { label: 'Vegetarian', value: 'vegetarian' },
            { label: 'Non-Vegetarian', value: 'non_vegetarian' },
            { label: 'Vegan', value: 'vegan' },
            { label: 'No Preference', value: 'no_preference' },
          ],
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'RSVP confirmed! See you at the event.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Confirm RSVP',
        },
      },
    },
    businessLogicConfig: {
      capacity: {
        maxAttendees: 100,
        countField: 'guest_count',
        action: 'close_when_full',
      },
    },
  },
  {
    name: 'Event Registration Form',
    description:
      'Complete event registration with ticket selection and dietary requirements',
    category: 'events',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'registrant_name',
          type: FormFieldType.TEXT,
          label: 'Full Name',
          fieldName: 'registrant_name',
          required: true,
          order: 1,
        },
        {
          id: 'registrant_email',
          type: FormFieldType.EMAIL,
          label: 'Email Address',
          fieldName: 'registrant_email',
          required: true,
          order: 2,
        },
        {
          id: 'ticket_type',
          type: FormFieldType.SELECT,
          label: 'Ticket Type',
          fieldName: 'ticket_type',
          required: true,
          order: 3,
          options: [
            { label: 'General Admission - $50', value: 'general' },
            { label: 'VIP - $150', value: 'vip' },
            { label: 'Student - $25', value: 'student' },
          ],
        },
        {
          id: 'dietary_requirements',
          type: FormFieldType.TEXTAREA,
          label: 'Dietary Requirements',
          fieldName: 'dietary_requirements',
          required: false,
          order: 4,
          placeholder: 'Please list any dietary restrictions or allergies...',
        },
        {
          id: 'emergency_contact',
          type: FormFieldType.TEXT,
          label: 'Emergency Contact Phone',
          fieldName: 'emergency_contact',
          required: false,
          order: 5,
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Registration successful! Check your email for confirmation.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Complete Registration',
        },
      },
    },
    businessLogicConfig: {
      payment: {
        enabled: true,
        priceField: 'ticket_type',
        gateway: 'stripe',
      },
    },
  },

  // QUIZ TEMPLATES
  {
    name: 'Knowledge Assessment Quiz',
    description:
      'Multiple-choice quiz for knowledge assessment with scoring',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'participant_name',
          type: FormFieldType.TEXT,
          label: 'Your Name',
          fieldName: 'participant_name',
          required: true,
          order: 1,
        },
        {
          id: 'question_1',
          type: FormFieldType.RADIO,
          label: 'Question 1: What is the capital of France?',
          fieldName: 'question_1',
          required: true,
          order: 2,
          options: [
            { label: 'London', value: 'london' },
            { label: 'Paris', value: 'paris' },
            { label: 'Berlin', value: 'berlin' },
            { label: 'Madrid', value: 'madrid' },
          ],
        },
        {
          id: 'question_2',
          type: FormFieldType.RADIO,
          label: 'Question 2: What is 2 + 2?',
          fieldName: 'question_2',
          required: true,
          order: 3,
          options: [
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
          ],
        },
        {
          id: 'question_3',
          type: FormFieldType.RADIO,
          label: 'Question 3: Which planet is closest to the sun?',
          fieldName: 'question_3',
          required: true,
          order: 4,
          options: [
            { label: 'Venus', value: 'venus' },
            { label: 'Mercury', value: 'mercury' },
            { label: 'Mars', value: 'mars' },
            { label: 'Earth', value: 'earth' },
          ],
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'large' },
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Quiz submitted! Your score will be calculated automatically.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Submit Quiz',
        },
      },
    },
    businessLogicConfig: {
      scoring: {
        enabled: true,
        answers: {
          question_1: 'paris',
          question_2: '4',
          question_3: 'mercury',
        },
        totalPoints: 3,
        passingScore: 2,
      },
    },
  },
  {
    name: 'Personality Quiz',
    description:
      'Personality assessment quiz with categorical results',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'participant_name',
          type: FormFieldType.TEXT,
          label: 'Your Name',
          fieldName: 'participant_name',
          required: true,
          order: 1,
        },
        {
          id: 'q1_social',
          type: FormFieldType.RADIO,
          label: 'Do you prefer spending time alone or with others?',
          fieldName: 'q1_social',
          required: true,
          order: 2,
          options: [
            { label: 'Definitely alone', value: 'introvert_strong' },
            { label: 'Mostly alone', value: 'introvert_mild' },
            { label: 'Mostly with others', value: 'extrovert_mild' },
            { label: 'Definitely with others', value: 'extrovert_strong' },
          ],
        },
        {
          id: 'q2_planning',
          type: FormFieldType.RADIO,
          label: 'How do you approach planning?',
          fieldName: 'q2_planning',
          required: true,
          order: 3,
          options: [
            { label: 'Detailed plans always', value: 'planner_strong' },
            { label: 'Some planning', value: 'planner_mild' },
            { label: 'Go with the flow', value: 'spontaneous_mild' },
            { label: 'No plans needed', value: 'spontaneous_strong' },
          ],
        },
        {
          id: 'q3_decision',
          type: FormFieldType.RADIO,
          label: 'When making decisions, do you rely on logic or emotions?',
          fieldName: 'q3_decision',
          required: true,
          order: 4,
          options: [
            { label: 'Always logic', value: 'logical_strong' },
            { label: 'Mostly logic', value: 'logical_mild' },
            { label: 'Mostly emotions', value: 'emotional_mild' },
            { label: 'Always emotions', value: 'emotional_strong' },
          ],
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'large' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Quiz complete! Your personality type will be revealed.',
          allowMultipleSubmissions: true,
          submitButtonText: 'Get Results',
        },
      },
    },
    businessLogicConfig: {
      scoring: {
        enabled: true,
        categories: {
          extrovert: ['extrovert_strong', 'extrovert_mild'],
          introvert: ['introvert_strong', 'introvert_mild'],
          planner: ['planner_strong', 'planner_mild'],
          spontaneous: ['spontaneous_strong', 'spontaneous_mild'],
          logical: ['logical_strong', 'logical_mild'],
          emotional: ['emotional_strong', 'emotional_mild'],
        },
      },
    },
  },

  // POLLS TEMPLATES
  {
    name: 'Opinion Poll',
    description:
      'Quick opinion poll with single or multiple-choice questions',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'poll_question',
          type: FormFieldType.RADIO,
          label: 'What is your preferred work arrangement?',
          fieldName: 'poll_question',
          required: true,
          order: 1,
          options: [
            { label: 'Fully Remote', value: 'remote' },
            { label: 'Hybrid (2-3 days office)', value: 'hybrid' },
            { label: 'Fully In-Office', value: 'office' },
            { label: 'Flexible/No Preference', value: 'flexible' },
          ],
        },
        {
          id: 'reason',
          type: FormFieldType.TEXTAREA,
          label: 'Why? (Optional)',
          fieldName: 'reason',
          required: false,
          order: 2,
          placeholder: 'Share your reasoning...',
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you for participating in our poll!',
          allowMultipleSubmissions: false,
          submitButtonText: 'Submit Vote',
        },
      },
    },
    businessLogicConfig: {
      analytics: [
        {
          metric: 'vote_distribution',
          calculation: 'COUNT_BY(poll_question)',
        },
      ],
      realTime: {
        enabled: true,
        showResults: true,
      },
    },
  },
  {
    name: 'Voting Form',
    description:
      'Formal voting form with candidate selection and verification',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: {
      fields: [
        {
          id: 'voter_id',
          type: FormFieldType.TEXT,
          label: 'Voter ID',
          fieldName: 'voter_id',
          required: true,
          order: 1,
          validation: {
            pattern: '^[A-Z0-9]{8,12}$',
            errorMessage: 'Please enter a valid Voter ID',
          },
        },
        {
          id: 'candidate_selection',
          type: FormFieldType.RADIO,
          label: 'Select Your Candidate',
          fieldName: 'candidate_selection',
          required: true,
          order: 2,
          options: [
            { label: 'Candidate A', value: 'candidate_a' },
            { label: 'Candidate B', value: 'candidate_b' },
            { label: 'Candidate C', value: 'candidate_c' },
            { label: 'Abstain', value: 'abstain' },
          ],
        },
        {
          id: 'verification',
          type: FormFieldType.CHECKBOX,
          label: 'Verification',
          fieldName: 'verification',
          required: true,
          order: 3,
          options: [
            {
              label: 'I confirm that I am eligible to vote and this is my only submission',
              value: 'verified',
            },
          ],
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Your vote has been recorded securely.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Cast Vote',
        },
      },
    },
    businessLogicConfig: {
      security: {
        oneVotePerUser: true,
        verificationRequired: true,
        anonymousVoting: true,
      },
      analytics: [
        {
          metric: 'vote_count',
          calculation: 'COUNT(candidate_selection)',
        },
      ],
    },
  },
];

/**
 * Validates template schema structure
 */
function validateTemplateSchema(templateSchema: any): boolean {
  if (!templateSchema || typeof templateSchema !== 'object') {
    return false;
  }

  if (!Array.isArray(templateSchema.fields)) {
    console.error('Template schema must have fields array');
    return false;
  }

  if (!templateSchema.settings || typeof templateSchema.settings !== 'object') {
    console.error('Template schema must have settings object');
    return false;
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
 * Seeds form templates into the database
 */
export async function seedFormTemplates(): Promise<void> {
  try {
    await ensureDatabaseConnection();
    console.log('🌱 Starting form templates seed...');

    let successCount = 0;
    let skipCount = 0;

    for (const template of templates) {
      // Validate template schema
      if (!validateTemplateSchema(template.templateSchema)) {
        throw new Error(
          `Invalid template schema for template: ${template.name}`
        );
      }

      // Check schema size (must be < 100KB)
      const schemaSize = Buffer.byteLength(
        JSON.stringify(template.templateSchema)
      );
      if (schemaSize > 102400) {
        throw new Error(
          `Template schema for "${template.name}" exceeds 100KB limit (${schemaSize} bytes)`
        );
      }

      // Insert template with conflict handling
      const result = await databaseService.query(
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
          template.name,
          template.description,
          template.category,
          template.previewImageUrl,
          JSON.stringify(template.templateSchema),
          template.businessLogicConfig
            ? JSON.stringify(template.businessLogicConfig)
            : null,
        ]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(
          `✅ Template "${row.name}" [${row.category}] seeded successfully (ID: ${row.id})`
        );
        successCount++;
      } else {
        console.log(`⚠️  Template "${template.name}" already exists, skipped`);
        skipCount++;
      }
    }

    console.log(
      `🎉 Successfully seeded ${successCount} form templates (${skipCount} skipped)`
    );
    console.log(`📊 Templates by category:`);
    const categoryCounts = templates.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {} as Record<TemplateCategory, number>
    );
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} templates`);
    });
  } catch (error) {
    console.error('❌ Error seeding form templates:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    await seedFormTemplates();
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
