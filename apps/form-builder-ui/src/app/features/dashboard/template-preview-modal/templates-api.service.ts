import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FormTemplate, TemplateCategory, FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Mock Templates API Service
 *
 * Temporary mock service for template operations until Story 29.8 implements the real API.
 * Provides mock template data for development and testing.
 *
 * TODO: Replace with real API service in Story 29.8
 */
@Injectable({
  providedIn: 'root',
})
export class TemplatesApiService {
  /**
   * Mock template data
   * @private
   */
  private readonly mockTemplates: FormTemplate[] = [
    {
      id: 'template-ecommerce-001',
      name: 'Product Order Form',
      description:
        'Standard product order form with inventory tracking and quantity management',
      category: TemplateCategory.ECOMMERCE,
      previewImageUrl: '/assets/templates/product-order-preview.png',
      templateSchema: {
        id: 'schema-ecommerce-001',
        formId: 'template-ecommerce-001',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            fieldName: 'product_name',
            label: 'Product Name',
            placeholder: 'Enter product name',
            helpText: '',
            required: true,
            order: 0,
            validation: {},
          },
          {
            id: 'field-2',
            type: FormFieldType.TEXTAREA,
            fieldName: 'product_description',
            label: 'Product Description',
            placeholder: 'Describe the product',
            helpText: '',
            required: false,
            order: 1,
            validation: {},
          },
          {
            id: 'field-3',
            type: FormFieldType.NUMBER,
            fieldName: 'quantity',
            label: 'Quantity',
            placeholder: '1',
            helpText: 'Enter quantity (1-100)',
            required: true,
            validation: {
              min: 1,
              max: 100,
            },
            order: 2,
          },
          {
            id: 'field-4',
            type: FormFieldType.TEXT,
            fieldName: 'customer_name',
            label: 'Customer Name',
            placeholder: 'Enter your name',
            helpText: '',
            required: true,
            order: 3,
            validation: {},
          },
          {
            id: 'field-5',
            type: FormFieldType.EMAIL,
            fieldName: 'customer_email',
            label: 'Customer Email',
            placeholder: 'your@email.com',
            helpText: '',
            required: true,
            order: 4,
            validation: {},
          },
          {
            id: 'field-6',
            type: FormFieldType.TEXT,
            fieldName: 'customer_phone',
            label: 'Phone Number',
            placeholder: '(555) 555-5555',
            helpText: '',
            required: false,
            order: 5,
            validation: {},
          },
          {
            id: 'field-7',
            type: FormFieldType.TEXTAREA,
            fieldName: 'delivery_address',
            label: 'Delivery Address',
            placeholder: 'Enter delivery address',
            helpText: '',
            required: true,
            order: 6,
            validation: {},
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: 'Thank you! Your order has been received.',
            allowMultipleSubmissions: true,
          },
        },
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-15'),
      },
      businessLogicConfig: {
        type: 'inventory',
        stockField: 'product_name',
        variantField: 'size',
        quantityField: 'quantity',
        stockTable: 'inventory',
        decrementOnSubmit: true,
      },
      isActive: true,
      usageCount: 42,
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-15'),
    },
    {
      id: 'template-services-001',
      name: 'Appointment Booking Form',
      description: 'Schedule appointments with time slot management and availability checking',
      category: TemplateCategory.SERVICES,
      previewImageUrl: '/assets/templates/appointment-preview.png',
      templateSchema: {
        id: 'schema-services-001',
        formId: 'template-services-001',
        version: 1,
        isPublished: true,
        fields: [
          {
            id: 'field-1',
            type: FormFieldType.TEXT,
            fieldName: 'customer_name',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            helpText: '',
            required: true,
            order: 0,
            validation: {},
          },
          {
            id: 'field-2',
            type: FormFieldType.EMAIL,
            fieldName: 'customer_email',
            label: 'Email Address',
            placeholder: 'your@email.com',
            helpText: '',
            required: true,
            order: 1,
            validation: {},
          },
          {
            id: 'field-3',
            type: FormFieldType.TEXT,
            fieldName: 'customer_phone',
            label: 'Phone Number',
            placeholder: '(555) 555-5555',
            helpText: '',
            required: true,
            order: 2,
            validation: {},
          },
          {
            id: 'field-4',
            type: FormFieldType.DATE,
            fieldName: 'appointment_date',
            label: 'Preferred Date',
            placeholder: '',
            helpText: 'Select your preferred appointment date',
            required: true,
            order: 3,
            validation: {},
          },
          {
            id: 'field-5',
            type: FormFieldType.SELECT,
            fieldName: 'time_slot',
            label: 'Time Slot',
            placeholder: 'Select a time slot',
            helpText: '',
            required: true,
            options: [
              { value: '09:00-10:00', label: '9:00 AM - 10:00 AM' },
              { value: '10:00-11:00', label: '10:00 AM - 11:00 AM' },
              { value: '11:00-12:00', label: '11:00 AM - 12:00 PM' },
              { value: '14:00-15:00', label: '2:00 PM - 3:00 PM' },
              { value: '15:00-16:00', label: '3:00 PM - 4:00 PM' },
            ],
            order: 4,
            validation: {},
          },
          {
            id: 'field-6',
            type: FormFieldType.TEXTAREA,
            fieldName: 'notes',
            label: 'Additional Notes',
            placeholder: 'Any special requests or notes',
            helpText: '',
            required: false,
            order: 5,
            validation: {},
          },
        ],
        settings: {
          layout: { columns: 1, spacing: 'medium' },
          submission: {
            showSuccessMessage: true,
            successMessage: "Appointment confirmed! We'll send you a confirmation email.",
            allowMultipleSubmissions: false,
          },
        },
        createdAt: new Date('2025-01-12'),
        updatedAt: new Date('2025-01-18'),
      },
      businessLogicConfig: {
        type: 'appointment',
        timeSlotField: 'time_slot',
        dateField: 'appointment_date',
        maxBookingsPerSlot: 1,
        bookingsTable: 'appointments',
        allowOverbook: false,
      },
      isActive: true,
      usageCount: 28,
      createdAt: new Date('2025-01-12'),
      updatedAt: new Date('2025-01-18'),
    },
  ];

  /**
   * Fetches a single template by ID
   * @param id - Template ID
   * @returns Observable of API response with template data
   */
  getTemplateById(id: string): Observable<{ success: boolean; data: FormTemplate }> {
    const template = this.mockTemplates.find((t) => t.id === id);

    if (!template) {
      throw { status: 404, message: 'Template not found' };
    }

    return of({ success: true, data: template }).pipe(delay(800)); // Simulate network delay
  }

  /**
   * Lists all templates
   * @returns Observable of API response with template array
   */
  listTemplates(): Observable<{ success: boolean; data: FormTemplate[] }> {
    return of({ success: true, data: this.mockTemplates }).pipe(delay(500));
  }
}
