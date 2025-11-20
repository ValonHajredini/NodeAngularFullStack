import { PoolClient } from 'pg';
import {
  ITemplateExecutor,
  ExecutorResult,
  ExecutorValidation,
} from './base-executor.interface';
import {
  FormSubmission,
  FormTemplate,
  AppointmentConfig,
} from '@nodeangularfullstack/shared';
import { AppointmentBookingRepository } from '../../repositories/appointment-booking.repository';
import { getPoolForDatabase, DatabaseType } from '../../config/multi-database.config';

/**
 * Executor for appointment booking business logic.
 *
 * Implements time slot management with double-booking prevention using PostgreSQL
 * row-level locking (SELECT FOR UPDATE). Ensures atomic operations during concurrent
 * form submissions to prevent race conditions.
 *
 * Flow:
 * 1. validate() - Checks date format, prevents past bookings, validates config (pre-validation)
 * 2. execute() - Uses transaction with row-level lock to check availability and create booking atomically
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.12: Appointment Booking Template with Time Slot Management
 *
 * @implements {ITemplateExecutor}
 *
 * @example
 * const executor = new AppointmentExecutor(appointmentBookingRepository);
 *
 * // Validate before submission
 * const validation = await executor.validate(submission, template, config);
 * if (!validation.valid) {
 *   throw new Error(validation.errors.join(', '));
 * }
 *
 * // Execute after submission created
 * const result = await executor.execute(submission, template, config);
 * console.log(`Booking confirmed for ${result.data.date} at ${result.data.time_slot}`);
 */
export class AppointmentExecutor implements ITemplateExecutor {
  private readonly pool;

  /**
   * Creates a new AppointmentExecutor instance.
   *
   * @param appointmentBookingRepository - Repository for appointment booking data access
   */
  constructor(
    private appointmentBookingRepository: AppointmentBookingRepository
  ) {
    this.pool = getPoolForDatabase(DatabaseType.FORMS);
  }

  /**
   * Validates appointment booking data before submission.
   *
   * Performs early validation checks:
   * - Config references existing fields in template schema
   * - Date field is present and in valid format (YYYY-MM-DD)
   * - Date is not in the past (no same-day bookings allowed)
   * - Time slot field is present
   * - maxBookingsPerSlot is within bounds (1-100)
   *
   * **Note**: Availability is NOT checked during validation (non-blocking).
   * The execute() method performs a locked availability check for guaranteed atomicity.
   *
   * @param submission - Form submission data (not yet persisted)
   * @param template - Template configuration with schema
   * @param config - Appointment configuration
   * @returns Promise containing validation result
   */
  async validate(
    submission: Partial<FormSubmission>,
    template: FormTemplate,
    config: AppointmentConfig
  ): Promise<ExecutorValidation> {
    const errors: string[] = [];

    // Validate config references exist in template schema
    const dateFieldExists = template.templateSchema.fields.some(
      (f) => f.fieldName === config.dateField
    );
    const timeSlotFieldExists = template.templateSchema.fields.some(
      (f) => f.fieldName === config.timeSlotField
    );

    if (!dateFieldExists) {
      errors.push(`Date field "${config.dateField}" not found in schema`);
    }
    if (!timeSlotFieldExists) {
      errors.push(`Time slot field "${config.timeSlotField}" not found in schema`);
    }

    // Validate maxBookingsPerSlot bounds (1-100)
    if (config.maxBookingsPerSlot < 1 || config.maxBookingsPerSlot > 100) {
      errors.push(
        `Invalid maxBookingsPerSlot: ${config.maxBookingsPerSlot}. Must be between 1 and 100.`
      );
    }

    // Extract date and time slot from submission data
    const date = this.extractDate(submission.values || {}, config);
    const timeSlot = this.extractTimeSlot(submission.values || {}, config);

    // Validate date format and value
    if (!date) {
      errors.push('Date is required');
    } else {
      // Validate date format (YYYY-MM-DD)
      const dateFormatValid = this.isValidDateFormat(date);
      if (!dateFormatValid) {
        errors.push(
          `Invalid date format: "${date}". Expected YYYY-MM-DD (ISO 8601).`
        );
      } else {
        // Validate date is not in the past
        const isPast = this.isPastDate(date);
        if (isPast) {
          errors.push(
            `Cannot book appointments in the past. Date "${date}" has already passed.`
          );
        }
      }
    }

    // Validate time slot
    if (!timeSlot) {
      errors.push('Time slot is required');
    } else if (timeSlot.length < 1 || timeSlot.length > 50) {
      errors.push(
        `Time slot "${timeSlot}" exceeds maximum length (50 characters).`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Executes appointment booking with transaction locking.
   *
   * Uses PostgreSQL transaction with row-level locking (SELECT FOR UPDATE) to
   * ensure atomic booking creation. This prevents race conditions when multiple
   * users attempt to book the same time slot simultaneously.
   *
   * Transaction Flow:
   * 1. Begin transaction
   * 2. Lock booking records for form/date/slot (SELECT FOR UPDATE)
   * 3. Count existing confirmed bookings (with lock held)
   * 4. Check if slot is full (count >= maxBookingsPerSlot)
   * 5. If available: Create booking record
   * 6. Commit transaction
   * 7. On error: Rollback transaction
   *
   * @param submission - Created form submission record (persisted)
   * @param template - Template configuration
   * @param config - Appointment configuration
   * @param client - Optional transaction client (if not provided, creates new transaction)
   * @returns Promise containing execution result with booking details
   * @throws {Error} When slot is full (HTTP 409 Conflict) or execution fails
   */
  async execute(
    submission: FormSubmission,
    template: FormTemplate,
    config: AppointmentConfig,
    client?: PoolClient
  ): Promise<ExecutorResult> {
    const date = this.extractDate(submission.values, config);
    const timeSlot = this.extractTimeSlot(submission.values, config);

    if (!date || !timeSlot) {
      throw new Error('Invalid submission data: missing date or time slot');
    }

    // Use provided client or create new connection
    const shouldReleaseClient = !client;
    const txClient: PoolClient = client || (await this.pool.connect());

    try {
      // Begin transaction if we created the client
      if (shouldReleaseClient) {
        await txClient.query('BEGIN');
      }

      // Get booking count with row-level lock (SELECT FOR UPDATE)
      // This prevents concurrent bookings from creating race conditions
      const bookingCount = await this.appointmentBookingRepository.getBookingCount(
        txClient,
        template.id,
        date,
        timeSlot
      );

      // Check if slot is full
      if (bookingCount >= config.maxBookingsPerSlot) {
        const availableCapacity = config.maxBookingsPerSlot - bookingCount;
        throw new Error(
          `SLOT_FULL: Time slot is fully booked. ${config.maxBookingsPerSlot} bookings maximum, ${bookingCount} already confirmed. Available capacity: ${availableCapacity}.`
        );
      }

      // Create booking record
      const booking = await this.appointmentBookingRepository.createBooking(
        txClient,
        template.id,
        date,
        timeSlot
      );

      // Commit transaction if we created the client
      if (shouldReleaseClient) {
        await txClient.query('COMMIT');
      }

      return {
        success: true,
        data: {
          booking_id: booking.id,
          form_id: booking.form_id,
          date: booking.date,
          time_slot: booking.time_slot,
          booked_at: booking.booked_at,
          status: booking.status,
          remaining_capacity: config.maxBookingsPerSlot - bookingCount - 1,
          max_capacity: config.maxBookingsPerSlot,
        },
        message: `Appointment booked successfully for ${date} at ${timeSlot}. ${
          config.maxBookingsPerSlot - bookingCount - 1
        } slot(s) remaining.`,
      };
    } catch (error: any) {
      // Rollback on error if we created the client
      if (shouldReleaseClient) {
        await txClient.query('ROLLBACK');
      }

      // Re-throw with context (preserve SLOT_FULL error code for HTTP 409 Conflict)
      if (error.message.startsWith('SLOT_FULL:')) {
        throw error; // Preserve original error message for HTTP 409 mapping
      }

      throw new Error(`Appointment booking failed: ${error.message}`);
    } finally {
      // Release client only if we created it
      if (shouldReleaseClient) {
        txClient.release();
      }
    }
  }

  /**
   * Extracts date from submission data with format validation.
   *
   * **Security Note**: Date format validation prevents injection attacks and ensures
   * data integrity. Only ISO 8601 date format (YYYY-MM-DD) is allowed.
   *
   * @param data - Submission data
   * @param config - Appointment configuration
   * @returns Date string in YYYY-MM-DD format or empty string if not found
   * @private
   */
  private extractDate(
    data: Record<string, any>,
    config: AppointmentConfig
  ): string {
    const dateValue = data[config.dateField];

    if (!dateValue) {
      return '';
    }

    // Ensure date is string type
    if (typeof dateValue !== 'string') {
      return '';
    }

    return dateValue.trim();
  }

  /**
   * Extracts time slot from submission data.
   *
   * **Security Note**: Time slot length validation (max 50 characters) prevents
   * abuse and ensures reasonable slot identifiers.
   *
   * @param data - Submission data
   * @param config - Appointment configuration
   * @returns Time slot string or empty string if not found
   * @private
   */
  private extractTimeSlot(
    data: Record<string, any>,
    config: AppointmentConfig
  ): string {
    const timeSlotValue = data[config.timeSlotField];

    if (!timeSlotValue) {
      return '';
    }

    // Ensure time slot is string type
    if (typeof timeSlotValue !== 'string') {
      return '';
    }

    return timeSlotValue.trim();
  }

  /**
   * Validates date format against ISO 8601 (YYYY-MM-DD) pattern.
   *
   * Also validates that the date is a real calendar date (e.g., rejects 2025-02-30).
   *
   * @param date - Date string to validate
   * @returns True if date format is valid and represents a real date
   * @private
   */
  private isValidDateFormat(date: string): boolean {
    // ISO 8601 date format: YYYY-MM-DD
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    if (!DATE_REGEX.test(date)) {
      return false;
    }

    // Validate it's a real calendar date (not 2025-13-01 or 2025-02-30)
    try {
      const parsedDate = new Date(date + 'T00:00:00.000Z'); // Parse as UTC midnight

      // Check if date is invalid (NaN)
      if (isNaN(parsedDate.getTime())) {
        return false;
      }

      const isoString = parsedDate.toISOString().substring(0, 10);

      // Compare ISO string (YYYY-MM-DD) with input to catch invalid dates
      return isoString === date;
    } catch (error) {
      // Handle edge cases where toISOString() throws (e.g., invalid dates)
      return false;
    }
  }

  /**
   * Checks if a date is in the past or today (same-day bookings not allowed).
   *
   * Uses UTC date comparison to avoid timezone issues. Dates are compared
   * at midnight UTC to ensure consistent behavior across timezones.
   *
   * @param date - Date string in YYYY-MM-DD format
   * @returns True if date is in the past or is today (same-day booking not allowed)
   * @private
   */
  private isPastDate(date: string): boolean {
    // Parse date as UTC midnight to avoid timezone issues
    const appointmentDate = new Date(date + 'T00:00:00.000Z');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for comparison

    // Reject appointments today or in the past (use <= instead of <)
    return appointmentDate <= today;
  }
}
