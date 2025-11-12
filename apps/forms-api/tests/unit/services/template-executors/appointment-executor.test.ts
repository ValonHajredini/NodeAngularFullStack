/**
 * Unit tests for AppointmentExecutor
 * Epic: 29 - Form Template System with Business Logic
 * Story: 29.12 - Appointment Booking Template with Time Slot Management
 * Task: 10 - Backend unit tests for AppointmentExecutor (90%+ coverage target)
 */

import { AppointmentExecutor } from '../../../../src/services/template-executors/appointment-executor';
import { AppointmentBookingRepository } from '../../../../src/repositories/appointment-booking.repository';
import {
  FormSubmission,
  FormTemplate,
  AppointmentConfig,
  FormFieldType,
  AppointmentBooking,
  TemplateCategory,
} from '@nodeangularfullstack/shared';

// Mock dependencies
jest.mock('../../../../src/repositories/appointment-booking.repository');
jest.mock('../../../../src/config/multi-database.config', () => ({
  getPoolForDatabase: jest.fn().mockReturnValue({
    connect: jest.fn(),
    query: jest.fn(),
  }),
  DatabaseType: {
    FORMS: 'forms',
  },
}));

describe('AppointmentExecutor', () => {
  let executor: AppointmentExecutor;
  let mockClient: any;
  let mockAppointmentBookingRepository: jest.Mocked<AppointmentBookingRepository>;

  const mockTemplate: FormTemplate = {
    id: 'template-123',
    name: 'Doctor Appointment Form',
    description: 'Healthcare appointment booking template',
    category: TemplateCategory.SERVICES,
    templateSchema: {
      id: 'schema-123',
      formId: 'form-123',
      version: 1,
      isPublished: true,
      fields: [
        {
          id: 'appointment_date',
          type: FormFieldType.DATE,
          label: 'Appointment Date',
          fieldName: 'appointment_date',
          required: true,
          order: 1,
        },
        {
          id: 'time_slot',
          type: FormFieldType.SELECT,
          label: 'Time Slot',
          fieldName: 'time_slot',
          required: true,
          order: 2,
        },
        {
          id: 'patient_name',
          type: FormFieldType.TEXT,
          label: 'Patient Name',
          fieldName: 'patient_name',
          required: true,
          order: 3,
        },
      ],
      settings: {
        layout: { columns: 1, spacing: 'medium' },
        submission: { showSuccessMessage: true, allowMultipleSubmissions: true },
      },
    } as any,
    businessLogicConfig: {
      type: 'appointment',
      dateField: 'appointment_date',
      timeSlotField: 'time_slot',
      maxBookingsPerSlot: 5,
      bookingsTable: 'appointment_bookings',
    },
    isActive: true,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as FormTemplate;

  const mockAppointmentConfig: AppointmentConfig = {
    type: 'appointment',
    dateField: 'appointment_date',
    timeSlotField: 'time_slot',
    maxBookingsPerSlot: 5,
    bookingsTable: 'appointment_bookings',
  };

  const mockBooking: AppointmentBooking = {
    id: 'booking-123',
    form_id: 'form-123',
    date: '2025-12-15',
    time_slot: '09:00-10:00',
    booked_at: new Date(),
    status: 'confirmed',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as any;

    // Create mock repository
    mockAppointmentBookingRepository =
      new AppointmentBookingRepository({} as any) as jest.Mocked<AppointmentBookingRepository>;

    // Create executor instance
    executor = new AppointmentExecutor(mockAppointmentBookingRepository);

    // Mock pool.connect() to return mockClient
    const mockPool = require('../../../../src/config/multi-database.config').getPoolForDatabase();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation with valid submission data', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
      const futureDateStr = futureDate.toISOString().substring(0, 10); // YYYY-MM-DD

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: futureDateStr,
          time_slot: '09:00-10:00',
          patient_name: 'John Doe',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when date field not found in schema', async () => {
      const invalidConfig: AppointmentConfig = {
        type: 'appointment',
        dateField: 'nonexistent_date',
        timeSlotField: 'time_slot',
        maxBookingsPerSlot: 5,
        bookingsTable: 'appointment_bookings',
      };

      const submission: Partial<FormSubmission> = {
        values: {
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date field "nonexistent_date" not found in schema');
    });

    it('should fail validation when time slot field not found in schema', async () => {
      const invalidConfig: AppointmentConfig = {
        type: 'appointment',
        dateField: 'appointment_date',
        timeSlotField: 'nonexistent_time',
        maxBookingsPerSlot: 5,
        bookingsTable: 'appointment_bookings',
      };

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '2025-12-15',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Time slot field "nonexistent_time" not found in schema');
    });

    it('should fail validation when maxBookingsPerSlot is less than 1', async () => {
      const invalidConfig: AppointmentConfig = {
        type: 'appointment',
        dateField: 'appointment_date',
        timeSlotField: 'time_slot',
        maxBookingsPerSlot: 0,
        bookingsTable: 'appointment_bookings',
      };

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '2025-12-15',
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid maxBookingsPerSlot: 0. Must be between 1 and 100.');
    });

    it('should fail validation when maxBookingsPerSlot is greater than 100', async () => {
      const invalidConfig: AppointmentConfig = {
        type: 'appointment',
        dateField: 'appointment_date',
        timeSlotField: 'time_slot',
        maxBookingsPerSlot: 150,
        bookingsTable: 'appointment_bookings',
      };

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '2025-12-15',
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid maxBookingsPerSlot: 150. Must be between 1 and 100.'
      );
    });

    it('should fail validation when date is missing', async () => {
      const submission: Partial<FormSubmission> = {
        values: {
          time_slot: '09:00-10:00',
          patient_name: 'John Doe',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });

    it('should fail validation with invalid date format (not YYYY-MM-DD)', async () => {
      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '12/15/2025', // MM/DD/YYYY format
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid date format: "12/15/2025". Expected YYYY-MM-DD (ISO 8601).'
      );
    });

    it('should fail validation with invalid calendar date (e.g., 2025-02-30)', async () => {
      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '2025-02-30', // Invalid date (February doesn't have 30 days)
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Invalid date format: "2025-02-30". Expected YYYY-MM-DD (ISO 8601).'
      );
    });

    it('should fail validation when date is in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago
      const pastDateStr = pastDate.toISOString().substring(0, 10);

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: pastDateStr,
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Cannot book appointments in the past. Date "${pastDateStr}" has already passed.`
      );
    });

    it('should fail validation when time slot is missing', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: futureDateStr,
          patient_name: 'John Doe',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Time slot is required');
    });

    it('should fail validation when time slot exceeds maximum length', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const longTimeSlot = 'A'.repeat(51); // 51 characters (max is 50)

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: futureDateStr,
          time_slot: longTimeSlot,
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `Time slot "${longTimeSlot}" exceeds maximum length (50 characters).`
      );
    });

    it('should accumulate multiple validation errors', async () => {
      const invalidConfig: AppointmentConfig = {
        type: 'appointment',
        dateField: 'invalid_date',
        timeSlotField: 'invalid_time',
        maxBookingsPerSlot: 0,
        bookingsTable: 'appointment_bookings',
      };

      const submission: Partial<FormSubmission> = {
        values: {},
      };

      const result = await executor.validate(submission, mockTemplate, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors).toContain('Date field "invalid_date" not found in schema');
      expect(result.errors).toContain('Time slot field "invalid_time" not found in schema');
      expect(result.errors).toContain('Invalid maxBookingsPerSlot: 0. Must be between 1 and 100.');
    });

    it('should handle empty string date value', async () => {
      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: '',
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });

    it('should handle non-string date value', async () => {
      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: 12345, // Number instead of string
          time_slot: '09:00-10:00',
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Date is required');
    });

    it('should handle non-string time slot value', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().substring(0, 10);

      const submission: Partial<FormSubmission> = {
        values: {
          appointment_date: futureDateStr,
          time_slot: 12345, // Number instead of string
        },
      };

      const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Time slot is required');
    });
  });

  describe('execute', () => {
    const mockSubmission: FormSubmission = {
      id: 'submission-123',
      formSchemaId: 'schema-123',
      values: {
        appointment_date: '2025-12-15',
        time_slot: '09:00-10:00',
        patient_name: 'John Doe',
        patient_email: 'john@example.com',
      },
      submittedAt: new Date(),
      submitterIp: '127.0.0.1',
    };

    it('should successfully execute booking with transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(2); // 2 existing bookings
      mockAppointmentBookingRepository.createBooking = jest.fn().mockResolvedValue(mockBooking);

      const result = await executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        booking_id: 'booking-123',
        form_id: 'form-123',
        date: '2025-12-15',
        time_slot: '09:00-10:00',
        booked_at: mockBooking.booked_at,
        status: 'confirmed',
        remaining_capacity: 2, // 5 max - 2 existing - 1 new = 2 remaining
        max_capacity: 5,
      });
      expect(result.message).toBe(
        'Appointment booked successfully for 2025-12-15 at 09:00-10:00. 2 slot(s) remaining.'
      );

      // Verify transaction flow
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockAppointmentBookingRepository.getBookingCount).toHaveBeenCalledWith(
        mockClient,
        'template-123',
        '2025-12-15',
        '09:00-10:00'
      );
      expect(mockAppointmentBookingRepository.createBooking).toHaveBeenCalledWith(
        mockClient,
        'template-123',
        '2025-12-15',
        '09:00-10:00'
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and throw SLOT_FULL error when slot is at max capacity', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(5); // Slot is full (5/5)

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig)
      ).rejects.toThrow(
        'SLOT_FULL: Time slot is fully booked. 5 bookings maximum, 5 already confirmed. Available capacity: 0.'
      );

      // Verify transaction was rolled back
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();

      // Verify booking was NOT created
      expect(mockAppointmentBookingRepository.createBooking).not.toHaveBeenCalled();
    });

    it('should rollback transaction on booking creation failure', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(2);
      mockAppointmentBookingRepository.createBooking = jest
        .fn()
        .mockRejectedValue(new Error('Database connection lost'));

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig)
      ).rejects.toThrow('Appointment booking failed: Database connection lost');

      // Verify rollback
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even when transaction fails catastrophically', async () => {
      mockClient.query.mockRejectedValue(new Error('Database unreachable'));

      await expect(
        executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig)
      ).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error when date is missing from submission', async () => {
      const invalidSubmission: FormSubmission = {
        ...mockSubmission,
        values: {
          time_slot: '09:00-10:00',
          patient_name: 'John Doe',
        },
      };

      await expect(
        executor.execute(invalidSubmission, mockTemplate, mockAppointmentConfig)
      ).rejects.toThrow('Invalid submission data: missing date or time slot');

      // Should not start transaction if validation fails early
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should throw error when time slot is missing from submission', async () => {
      const invalidSubmission: FormSubmission = {
        ...mockSubmission,
        values: {
          appointment_date: '2025-12-15',
          patient_name: 'John Doe',
        },
      };

      await expect(
        executor.execute(invalidSubmission, mockTemplate, mockAppointmentConfig)
      ).rejects.toThrow('Invalid submission data: missing date or time slot');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should use provided client without creating new transaction', async () => {
      const providedClient = mockClient;

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(1);
      mockAppointmentBookingRepository.createBooking = jest.fn().mockResolvedValue(mockBooking);

      const result = await executor.execute(
        mockSubmission,
        mockTemplate,
        mockAppointmentConfig,
        providedClient
      );

      expect(result.success).toBe(true);

      // Should NOT call BEGIN or COMMIT when client is provided
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');

      // Should NOT release client when provided
      expect(mockClient.release).not.toHaveBeenCalled();

      // Should still call repository methods
      expect(mockAppointmentBookingRepository.getBookingCount).toHaveBeenCalledWith(
        providedClient,
        'template-123',
        '2025-12-15',
        '09:00-10:00'
      );
      expect(mockAppointmentBookingRepository.createBooking).toHaveBeenCalledWith(
        providedClient,
        'template-123',
        '2025-12-15',
        '09:00-10:00'
      );
    });

    it('should calculate remaining capacity correctly when slot has exactly max - 1 bookings', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(4); // 4/5 bookings
      mockAppointmentBookingRepository.createBooking = jest.fn().mockResolvedValue(mockBooking);

      const result = await executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig);

      expect(result.success).toBe(true);
      expect(result.data.remaining_capacity).toBe(0); // 5 - 4 - 1 = 0
      expect(result.message).toContain('0 slot(s) remaining');
    });

    it('should handle slot with zero existing bookings', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // COMMIT

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(0); // First booking
      mockAppointmentBookingRepository.createBooking = jest.fn().mockResolvedValue(mockBooking);

      const result = await executor.execute(mockSubmission, mockTemplate, mockAppointmentConfig);

      expect(result.success).toBe(true);
      expect(result.data.remaining_capacity).toBe(4); // 5 - 0 - 1 = 4
      expect(result.message).toContain('4 slot(s) remaining');
    });

    it('should preserve SLOT_FULL error without wrapping it', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any) // BEGIN
        .mockResolvedValueOnce({ rows: [] } as any); // ROLLBACK

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(10); // Over capacity

      const config: AppointmentConfig = {
        ...mockAppointmentConfig,
        maxBookingsPerSlot: 10,
      };

      await expect(executor.execute(mockSubmission, mockTemplate, config)).rejects.toThrow(
        /^SLOT_FULL:/
      );

      // Error message should NOT be wrapped with "Appointment booking failed:"
      try {
        await executor.execute(mockSubmission, mockTemplate, config);
      } catch (error: any) {
        expect(error.message).toMatch(/^SLOT_FULL:/);
        expect(error.message).not.toContain('Appointment booking failed:');
      }
    });

    it('should handle whitespace in date and time slot values', async () => {
      const submissionWithWhitespace: FormSubmission = {
        ...mockSubmission,
        values: {
          appointment_date: '  2025-12-15  ',
          time_slot: '  09:00-10:00  ',
          patient_name: 'John Doe',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      mockAppointmentBookingRepository.getBookingCount = jest.fn().mockResolvedValue(0);
      mockAppointmentBookingRepository.createBooking = jest.fn().mockResolvedValue(mockBooking);

      const result = await executor.execute(
        submissionWithWhitespace,
        mockTemplate,
        mockAppointmentConfig
      );

      expect(result.success).toBe(true);

      // Verify trimmed values were passed to repository (via extractDate/extractTimeSlot)
      expect(mockAppointmentBookingRepository.getBookingCount).toHaveBeenCalledWith(
        mockClient,
        'template-123',
        '2025-12-15',
        '09:00-10:00'
      );
    });
  });

  describe('private helper methods (tested indirectly)', () => {
    describe('extractDate behavior', () => {
      it('should extract date from submission with whitespace trimming', async () => {
        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: '  2025-12-20  ',
            time_slot: '10:00-11:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        // If date is properly extracted and trimmed, validation should pass (future date check)
        expect(result.valid).toBe(true);
      });

      it('should return empty string for non-string date value (via validate)', async () => {
        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: { invalid: 'object' }, // Object instead of string
            time_slot: '09:00-10:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Date is required');
      });
    });

    describe('extractTimeSlot behavior', () => {
      it('should extract time slot with whitespace trimming', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const futureDateStr = futureDate.toISOString().substring(0, 10);

        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: futureDateStr,
            time_slot: '  14:00-15:00  ',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(true);
      });

      it('should return empty string for non-string time slot value', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        const futureDateStr = futureDate.toISOString().substring(0, 10);

        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: futureDateStr,
            time_slot: ['array', 'value'], // Array instead of string
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Time slot is required');
      });
    });

    describe('isValidDateFormat behavior', () => {
      it('should reject date with invalid format patterns', async () => {
        const invalidFormats = [
          '2025/12/15', // Slashes instead of dashes
          '15-12-2025', // DD-MM-YYYY
          '2025-1-5', // Missing leading zeros
          '25-12-15', // Two-digit year
          'Dec 15, 2025', // Text format
          '2025-12-15T00:00:00', // ISO with time
        ];

        for (const invalidDate of invalidFormats) {
          const submission: Partial<FormSubmission> = {
            values: {
              appointment_date: invalidDate,
              time_slot: '09:00-10:00',
            },
          };

          const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

          expect(result.valid).toBe(false);
          expect(result.errors).toContain(
            `Invalid date format: "${invalidDate}". Expected YYYY-MM-DD (ISO 8601).`
          );
        }
      });

      it('should reject invalid calendar dates', async () => {
        const invalidDates = [
          '2025-02-30', // February doesn't have 30 days
          '2025-04-31', // April only has 30 days
          '2025-13-01', // Month 13 doesn't exist
          '2025-00-15', // Month 0 doesn't exist
          '2025-12-00', // Day 0 doesn't exist
          '2025-12-32', // December doesn't have 32 days
        ];

        for (const invalidDate of invalidDates) {
          const submission: Partial<FormSubmission> = {
            values: {
              appointment_date: invalidDate,
              time_slot: '09:00-10:00',
            },
          };

          const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

          expect(result.valid).toBe(false);
          expect(result.errors).toContain(
            `Invalid date format: "${invalidDate}". Expected YYYY-MM-DD (ISO 8601).`
          );
        }
      });

      it('should accept valid leap year date', async () => {
        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: '2024-02-29', // 2024 is a leap year
            time_slot: '09:00-10:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        // Should pass format validation (though it might fail past date check depending on test run time)
        const hasFormatError = result.errors.some((err) => err.includes('Invalid date format'));
        expect(hasFormatError).toBe(false);
      });
    });

    describe('isPastDate behavior', () => {
      it('should identify yesterday as past date', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().substring(0, 10);

        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: yesterdayStr,
            time_slot: '09:00-10:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Cannot book appointments in the past. Date "${yesterdayStr}" has already passed.`
        );
      });

      it('should accept tomorrow as future date', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().substring(0, 10);

        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: tomorrowStr,
            time_slot: '09:00-10:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(true);
      });

      it('should reject today as same-day booking not allowed', async () => {
        const today = new Date();
        const todayStr = today.toISOString().substring(0, 10);

        const submission: Partial<FormSubmission> = {
          values: {
            appointment_date: todayStr,
            time_slot: '09:00-10:00',
          },
        };

        const result = await executor.validate(submission, mockTemplate, mockAppointmentConfig);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          `Cannot book appointments in the past. Date "${todayStr}" has already passed.`
        );
      });
    });
  });
});
