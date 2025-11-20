/**
 * Seed script for form templates
 * Deletes all existing templates and creates fresh templates with category fields
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.1 - Database Schema and Template Storage Foundation
 * Updated: Added category fields to schemas for analytics detection
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
 * Helper function to create template schema with category fields
 */
function createTemplateSchema(
  category: TemplateCategory,
  fields: any[],
  settingsOverride: any = {}
): Record<string, any> {
  return {
    category, // Root-level category for analytics detection
    fields,
    settings: {
      layout: { columns: 1, spacing: 'medium' },
      submission: {
        showSuccessMessage: true,
        successMessage: 'Thank you for your submission!',
        allowMultipleSubmissions: true,
      },
      ...settingsOverride,
      templateCategory: category, // Settings-level category for analytics detection
    },
  };
}

/**
 * Template data for seeding - 3-4 templates per category
 */
const templates: FormTemplate[] = [
  // ==================== E-COMMERCE TEMPLATES (4) ====================
  {
    name: 'Product Order Form',
    description:
      'Complete e-commerce product ordering form with quantity selection, shipping details, and payment information',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'ecommerce',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage: 'Order received! We will contact you shortly.',
          allowMultipleSubmissions: true,
          submitButtonText: 'Place Order',
        },
      }
    ),
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_name',
      quantityField: 'quantity',
    },
  },
  {
    name: 'Inventory Tracking Form',
    description:
      'Track product inventory levels, restock dates, and supplier information',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('ecommerce', [
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
    ]),
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_sku',
      quantityField: 'current_stock',
    },
  },
  {
    name: 'Product Catalog Entry',
    description: 'Add new products to catalog with pricing and specifications',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('ecommerce', [
      {
        id: 'product_name',
        type: FormFieldType.TEXT,
        label: 'Product Name',
        fieldName: 'product_name',
        required: true,
        order: 1,
      },
      {
        id: 'category',
        type: FormFieldType.SELECT,
        label: 'Category',
        fieldName: 'category',
        required: true,
        order: 2,
        options: [
          { label: 'Electronics', value: 'electronics' },
          { label: 'Clothing', value: 'clothing' },
          { label: 'Books', value: 'books' },
          { label: 'Home & Garden', value: 'home_garden' },
        ],
      },
      {
        id: 'price',
        type: FormFieldType.NUMBER,
        label: 'Price ($)',
        fieldName: 'price',
        required: true,
        order: 3,
        validation: { min: 0 },
      },
      {
        id: 'description',
        type: FormFieldType.TEXTAREA,
        label: 'Product Description',
        fieldName: 'description',
        required: true,
        order: 4,
        validation: { minLength: 20, maxLength: 500 },
      },
    ]),
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_name',
      quantityField: 'stock_quantity',
    },
  },
  {
    name: 'Wholesale Order Form',
    description: 'Bulk ordering form for wholesale customers',
    category: 'ecommerce',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('ecommerce', [
      {
        id: 'company_name',
        type: FormFieldType.TEXT,
        label: 'Company Name',
        fieldName: 'company_name',
        required: true,
        order: 1,
      },
      {
        id: 'product_selection',
        type: FormFieldType.SELECT,
        label: 'Product',
        fieldName: 'product_selection',
        required: true,
        order: 2,
        options: [
          { label: 'Bulk Product A (100 units)', value: 'bulk_a' },
          { label: 'Bulk Product B (100 units)', value: 'bulk_b' },
          { label: 'Bulk Product C (100 units)', value: 'bulk_c' },
        ],
      },
      {
        id: 'quantity_units',
        type: FormFieldType.NUMBER,
        label: 'Number of Units (min 100)',
        fieldName: 'quantity_units',
        required: true,
        order: 3,
        validation: { min: 100 },
      },
      {
        id: 'delivery_date',
        type: FormFieldType.DATE,
        label: 'Preferred Delivery Date',
        fieldName: 'delivery_date',
        required: true,
        order: 4,
      },
    ]),
    businessLogicConfig: {
      type: 'inventory',
      stockField: 'product_selection',
      quantityField: 'quantity_units',
    },
  },

  // ==================== SERVICES TEMPLATES (4) ====================
  {
    name: 'Appointment Booking Form',
    description:
      'Book appointments with date/time selection, service type, and contact details',
    category: 'services',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'services',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Appointment request received! We will confirm your booking shortly.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Request Appointment',
        },
      }
    ),
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'preferred_time',
      dateField: 'preferred_date',
      maxBookingsPerSlot: 1,
    },
  },
  {
    name: 'Service Request Form',
    description:
      'General service request form with priority levels and detailed description',
    category: 'services',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('services', [
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
    ]),
    businessLogicConfig: null,
  },
  {
    name: 'Consultation Booking',
    description: 'Schedule professional consultations with availability check',
    category: 'services',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('services', [
      {
        id: 'consultation_type',
        type: FormFieldType.SELECT,
        label: 'Consultation Type',
        fieldName: 'consultation_type',
        required: true,
        order: 1,
        options: [
          { label: 'Legal Consultation', value: 'legal' },
          { label: 'Financial Advisory', value: 'financial' },
          { label: 'Career Counseling', value: 'career' },
          { label: 'Medical Consultation', value: 'medical' },
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
        id: 'time_slot',
        type: FormFieldType.SELECT,
        label: 'Preferred Time',
        fieldName: 'time_slot',
        required: true,
        order: 3,
        options: [
          { label: '9:00 AM - 10:00 AM', value: '09:00' },
          { label: '10:00 AM - 11:00 AM', value: '10:00' },
          { label: '2:00 PM - 3:00 PM', value: '14:00' },
          { label: '3:00 PM - 4:00 PM', value: '15:00' },
        ],
      },
      {
        id: 'client_name',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        fieldName: 'client_name',
        required: true,
        order: 4,
      },
      {
        id: 'client_email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        fieldName: 'client_email',
        required: true,
        order: 5,
      },
    ]),
    businessLogicConfig: {
      type: 'appointment',
      timeSlotField: 'time_slot',
      dateField: 'preferred_date',
      maxBookingsPerSlot: 3,
    },
  },
  {
    name: 'Equipment Rental Form',
    description: 'Rent equipment with date selection and pricing',
    category: 'services',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('services', [
      {
        id: 'equipment_type',
        type: FormFieldType.SELECT,
        label: 'Equipment Type',
        fieldName: 'equipment_type',
        required: true,
        order: 1,
        options: [
          { label: 'Projector ($50/day)', value: 'projector' },
          { label: 'Sound System ($100/day)', value: 'sound_system' },
          { label: 'Camera ($75/day)', value: 'camera' },
        ],
      },
      {
        id: 'rental_start_date',
        type: FormFieldType.DATE,
        label: 'Rental Start Date',
        fieldName: 'rental_start_date',
        required: true,
        order: 2,
      },
      {
        id: 'rental_end_date',
        type: FormFieldType.DATE,
        label: 'Rental End Date',
        fieldName: 'rental_end_date',
        required: true,
        order: 3,
      },
      {
        id: 'renter_name',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        fieldName: 'renter_name',
        required: true,
        order: 4,
      },
    ]),
    businessLogicConfig: null,
  },

  // ==================== DATA COLLECTION TEMPLATES (3) ====================
  {
    name: 'Customer Survey Form',
    description:
      'Comprehensive customer satisfaction survey with rating scales and feedback',
    category: 'data_collection',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('data_collection', [
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
    ]),
    businessLogicConfig: null,
  },
  {
    name: 'Contact Form',
    description:
      'Simple contact form with name, email, subject, and message fields',
    category: 'data_collection',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('data_collection', [
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
    ]),
    businessLogicConfig: null,
  },
  {
    name: 'Registration Form',
    description: 'User registration with profile information',
    category: 'data_collection',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('data_collection', [
      {
        id: 'full_name',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        fieldName: 'full_name',
        required: true,
        order: 1,
      },
      {
        id: 'email',
        type: FormFieldType.EMAIL,
        label: 'Email Address',
        fieldName: 'email',
        required: true,
        order: 2,
      },
      {
        id: 'phone',
        type: FormFieldType.TEXT,
        label: 'Phone Number',
        fieldName: 'phone',
        required: true,
        order: 3,
      },
      {
        id: 'country',
        type: FormFieldType.SELECT,
        label: 'Country',
        fieldName: 'country',
        required: true,
        order: 4,
        options: [
          { label: 'United States', value: 'us' },
          { label: 'Canada', value: 'ca' },
          { label: 'United Kingdom', value: 'uk' },
          { label: 'Australia', value: 'au' },
        ],
      },
    ]),
    businessLogicConfig: null,
  },

  // ==================== EVENTS TEMPLATES (3) ====================
  {
    name: 'Event RSVP Form',
    description:
      'RSVP form for events with attendance confirmation and meal preferences',
    category: 'events',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'events',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage: 'RSVP confirmed! See you at the event.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Confirm RSVP',
        },
      }
    ),
    businessLogicConfig: null,
  },
  {
    name: 'Event Registration Form',
    description:
      'Complete event registration with ticket selection and date/time',
    category: 'events',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('events', [
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
        id: 'event_date',
        type: FormFieldType.DATE,
        label: 'Event Date',
        fieldName: 'event_date',
        required: true,
        order: 3,
      },
      {
        id: 'ticket_type',
        type: FormFieldType.SELECT,
        label: 'Ticket Type',
        fieldName: 'ticket_type',
        required: true,
        order: 4,
        options: [
          { label: 'General Admission - $50', value: 'general' },
          { label: 'VIP - $150', value: 'vip' },
          { label: 'Student - $25', value: 'student' },
        ],
      },
    ]),
    businessLogicConfig: null,
  },
  {
    name: 'Conference Workshop Registration',
    description: 'Register for conference workshops with session selection',
    category: 'events',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('events', [
      {
        id: 'participant_name',
        type: FormFieldType.TEXT,
        label: 'Full Name',
        fieldName: 'participant_name',
        required: true,
        order: 1,
      },
      {
        id: 'participant_email',
        type: FormFieldType.EMAIL,
        label: 'Email',
        fieldName: 'participant_email',
        required: true,
        order: 2,
      },
      {
        id: 'workshop_session',
        type: FormFieldType.SELECT,
        label: 'Workshop Session',
        fieldName: 'workshop_session',
        required: true,
        order: 3,
        options: [
          { label: 'Session 1: AI and Machine Learning', value: 'session_1' },
          { label: 'Session 2: Web Development', value: 'session_2' },
          { label: 'Session 3: Cloud Computing', value: 'session_3' },
        ],
      },
      {
        id: 'experience_level',
        type: FormFieldType.RADIO,
        label: 'Experience Level',
        fieldName: 'experience_level',
        required: true,
        order: 4,
        options: [
          { label: 'Beginner', value: 'beginner' },
          { label: 'Intermediate', value: 'intermediate' },
          { label: 'Advanced', value: 'advanced' },
        ],
      },
    ]),
    businessLogicConfig: null,
  },

  // ==================== QUIZ TEMPLATES (4) ====================
  {
    name: 'Knowledge Assessment Quiz',
    description: 'Multiple-choice quiz for knowledge assessment with scoring',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'quiz',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage:
            'Quiz submitted! Your score will be calculated automatically.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Submit Quiz',
        },
      }
    ),
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'question_1', correctAnswer: 'paris', points: 1 },
        { fieldId: 'question_2', correctAnswer: '4', points: 1 },
        { fieldId: 'question_3', correctAnswer: 'mercury', points: 1 },
      ],
      passingScore: 60,
      showResults: true,
    },
  },
  {
    name: 'Personality Quiz',
    description: 'Personality assessment quiz with categorical results',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'quiz',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage: 'Quiz complete! Your personality type will be revealed.',
          allowMultipleSubmissions: true,
          submitButtonText: 'Get Results',
        },
      }
    ),
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'q1_social', correctAnswer: 'extrovert_strong', points: 1 },
        { fieldId: 'q2_planning', correctAnswer: 'planner_strong', points: 1 },
        { fieldId: 'q3_decision', correctAnswer: 'logical_strong', points: 1 },
      ],
      passingScore: 50,
      showResults: true,
    },
  },
  {
    name: 'Trivia Quiz',
    description: 'Fun trivia quiz with multiple categories',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('quiz', [
      {
        id: 'player_name',
        type: FormFieldType.TEXT,
        label: 'Player Name',
        fieldName: 'player_name',
        required: true,
        order: 1,
      },
      {
        id: 'q1_history',
        type: FormFieldType.RADIO,
        label: 'History: Who was the first president of the United States?',
        fieldName: 'q1_history',
        required: true,
        order: 2,
        options: [
          { label: 'Thomas Jefferson', value: 'jefferson' },
          { label: 'George Washington', value: 'washington' },
          { label: 'John Adams', value: 'adams' },
          { label: 'Benjamin Franklin', value: 'franklin' },
        ],
      },
      {
        id: 'q2_science',
        type: FormFieldType.RADIO,
        label: 'Science: What is the chemical symbol for water?',
        fieldName: 'q2_science',
        required: true,
        order: 3,
        options: [
          { label: 'H2O', value: 'h2o' },
          { label: 'CO2', value: 'co2' },
          { label: 'O2', value: 'o2' },
          { label: 'H2', value: 'h2' },
        ],
      },
      {
        id: 'q3_geography',
        type: FormFieldType.RADIO,
        label: 'Geography: What is the largest ocean on Earth?',
        fieldName: 'q3_geography',
        required: true,
        order: 4,
        options: [
          { label: 'Atlantic Ocean', value: 'atlantic' },
          { label: 'Indian Ocean', value: 'indian' },
          { label: 'Pacific Ocean', value: 'pacific' },
          { label: 'Arctic Ocean', value: 'arctic' },
        ],
      },
    ]),
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'q1_history', correctAnswer: 'washington', points: 1 },
        { fieldId: 'q2_science', correctAnswer: 'h2o', points: 1 },
        { fieldId: 'q3_geography', correctAnswer: 'pacific', points: 1 },
      ],
      passingScore: 67,
      showResults: true,
    },
  },
  {
    name: 'Math Skills Assessment',
    description: 'Evaluate math skills with progressive difficulty',
    category: 'quiz',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('quiz', [
      {
        id: 'student_name',
        type: FormFieldType.TEXT,
        label: 'Student Name',
        fieldName: 'student_name',
        required: true,
        order: 1,
      },
      {
        id: 'q1_basic',
        type: FormFieldType.RADIO,
        label: 'Basic: What is 5 + 7?',
        fieldName: 'q1_basic',
        required: true,
        order: 2,
        options: [
          { label: '10', value: '10' },
          { label: '11', value: '11' },
          { label: '12', value: '12' },
          { label: '13', value: '13' },
        ],
      },
      {
        id: 'q2_intermediate',
        type: FormFieldType.RADIO,
        label: 'Intermediate: What is 15 × 3?',
        fieldName: 'q2_intermediate',
        required: true,
        order: 3,
        options: [
          { label: '35', value: '35' },
          { label: '40', value: '40' },
          { label: '45', value: '45' },
          { label: '50', value: '50' },
        ],
      },
      {
        id: 'q3_advanced',
        type: FormFieldType.RADIO,
        label: 'Advanced: What is the square root of 144?',
        fieldName: 'q3_advanced',
        required: true,
        order: 4,
        options: [
          { label: '10', value: '10' },
          { label: '11', value: '11' },
          { label: '12', value: '12' },
          { label: '14', value: '14' },
        ],
      },
    ]),
    businessLogicConfig: {
      type: 'quiz',
      scoringRules: [
        { fieldId: 'q1_basic', correctAnswer: '12', points: 1 },
        { fieldId: 'q2_intermediate', correctAnswer: '45', points: 2 },
        { fieldId: 'q3_advanced', correctAnswer: '12', points: 3 },
      ],
      passingScore: 70,
      showResults: true,
    },
  },

  // ==================== POLLS TEMPLATES (4) ====================
  {
    name: 'Opinion Poll',
    description: 'Quick opinion poll with single or multiple-choice questions',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'polls',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you for participating in our poll!',
          allowMultipleSubmissions: false,
          submitButtonText: 'Submit Vote',
        },
      }
    ),
    businessLogicConfig: {
      type: 'poll',
      voteField: 'poll_question',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
    },
  },
  {
    name: 'Voting Form',
    description: 'Formal voting form with candidate selection and verification',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: createTemplateSchema(
      'polls',
      [
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
      {
        submission: {
          showSuccessMessage: true,
          successMessage: 'Your vote has been recorded securely.',
          allowMultipleSubmissions: false,
          submitButtonText: 'Cast Vote',
        },
      }
    ),
    businessLogicConfig: {
      type: 'poll',
      voteField: 'candidate_selection',
      preventDuplicates: true,
      showResultsAfterVote: false,
      trackingMethod: 'session',
    },
  },
  {
    name: 'Product Feedback Poll',
    description: 'Quick poll to gather product feedback',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('polls', [
      {
        id: 'satisfaction',
        type: FormFieldType.RADIO,
        label: 'How satisfied are you with our product?',
        fieldName: 'satisfaction',
        required: true,
        order: 1,
        options: [
          { label: 'Very Satisfied', value: 'very_satisfied' },
          { label: 'Satisfied', value: 'satisfied' },
          { label: 'Neutral', value: 'neutral' },
          { label: 'Dissatisfied', value: 'dissatisfied' },
          { label: 'Very Dissatisfied', value: 'very_dissatisfied' },
        ],
      },
      {
        id: 'recommend',
        type: FormFieldType.RADIO,
        label: 'Would you recommend this product to others?',
        fieldName: 'recommend',
        required: true,
        order: 2,
        options: [
          { label: 'Definitely Yes', value: 'definitely_yes' },
          { label: 'Probably Yes', value: 'probably_yes' },
          { label: 'Maybe', value: 'maybe' },
          { label: 'Probably No', value: 'probably_no' },
          { label: 'Definitely No', value: 'definitely_no' },
        ],
      },
    ]),
    businessLogicConfig: {
      type: 'poll',
      voteField: 'satisfaction',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
    },
  },
  {
    name: 'Feature Priority Poll',
    description: 'Vote on which features should be prioritized',
    category: 'polls',
    previewImageUrl: null,
    templateSchema: createTemplateSchema('polls', [
      {
        id: 'top_priority',
        type: FormFieldType.RADIO,
        label: 'Which feature should we prioritize?',
        fieldName: 'top_priority',
        required: true,
        order: 1,
        options: [
          { label: 'Dark Mode', value: 'dark_mode' },
          { label: 'Mobile App', value: 'mobile_app' },
          { label: 'API Access', value: 'api_access' },
          { label: 'Advanced Analytics', value: 'analytics' },
          { label: 'Team Collaboration', value: 'collaboration' },
        ],
      },
      {
        id: 'importance',
        type: FormFieldType.RADIO,
        label: 'How important is this feature to you?',
        fieldName: 'importance',
        required: true,
        order: 2,
        options: [
          { label: 'Critical', value: 'critical' },
          { label: 'Very Important', value: 'very_important' },
          { label: 'Somewhat Important', value: 'somewhat_important' },
          { label: 'Nice to Have', value: 'nice_to_have' },
        ],
      },
    ]),
    businessLogicConfig: {
      type: 'poll',
      voteField: 'top_priority',
      preventDuplicates: true,
      showResultsAfterVote: true,
      trackingMethod: 'session',
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

  // Validate category fields are present
  if (!templateSchema.category) {
    console.error('Template schema must have category field');
    return false;
  }

  if (!templateSchema.settings.templateCategory) {
    console.error('Template schema settings must have templateCategory field');
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
 * Deletes all existing templates from the database
 */
async function deleteAllTemplates(): Promise<void> {
  try {
    console.log('🗑️  Deleting all existing templates...');
    const result = await databaseService.query(
      'DELETE FROM form_templates RETURNING id'
    );
    console.log(`✅ Deleted ${result.rows.length} existing templates`);
  } catch (error) {
    console.error('❌ Error deleting templates:', error);
    throw error;
  }
}

/**
 * Seeds form templates into the database
 */
export async function seedFormTemplates(): Promise<void> {
  try {
    await ensureDatabaseConnection();
    console.log('🌱 Starting form templates seed...');

    // Step 1: Delete all existing templates
    await deleteAllTemplates();

    // Step 2: Insert new templates
    let successCount = 0;

    for (const template of templates) {
      // Validate template schema
      if (!validateTemplateSchema(template.templateSchema)) {
        throw new Error(`Invalid template schema for template: ${template.name}`);
      }

      // Check schema size (must be < 100KB)
      const schemaSize = Buffer.byteLength(JSON.stringify(template.templateSchema));
      if (schemaSize > 102400) {
        throw new Error(
          `Template schema for "${template.name}" exceeds 100KB limit (${schemaSize} bytes)`
        );
      }

      // Insert template
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
        RETURNING id, name, category`,
        [
          template.name,
          template.description,
          template.category,
          template.previewImageUrl,
          JSON.stringify(template.templateSchema),
          template.businessLogicConfig ? JSON.stringify(template.businessLogicConfig) : null,
        ]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(
          `✅ Template "${row.name}" [${row.category}] created (ID: ${row.id})`
        );
        successCount++;
      }
    }

    console.log(`🎉 Successfully created ${successCount} form templates`);
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
