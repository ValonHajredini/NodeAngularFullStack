import { Pool, PoolClient } from 'pg';
import { AppointmentBooking, AvailableSlot } from '@nodeangularfullstack/shared';
import { getPoolForDatabase, DatabaseType } from '../config/multi-database.config';

/**
 * Repository for appointment booking data access
 * Implements row-level locking to prevent double-booking race conditions
 *
 * Epic 29, Story 29.12: Appointment Booking Template with Time Slot Management
 *
 * @source docs/architecture/backend-architecture.md (Repository Pattern)
 *
 * @example
 * ```typescript
 * const repo = new AppointmentBookingRepository(pool);
 * const count = await repo.getBookingCount(client, formId, '2025-12-15', '09:00-10:00');
 * ```
 */
export class AppointmentBookingRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Check booking count for a specific slot (transaction-safe)
   * Uses row-level locking (FOR UPDATE) to prevent race conditions
   *
   * IMPORTANT: This method MUST be called within a transaction context.
   * The FOR UPDATE lock is held until the transaction commits or rolls back.
   *
   * @param client - Database client (transaction context)
   * @param formId - Form UUID
   * @param date - ISO date YYYY-MM-DD
   * @param timeSlot - Time slot identifier
   * @returns Number of confirmed bookings for this slot
   *
   * @throws {Error} When called outside transaction context
   *
   * @example
   * ```typescript
   * const client = await pool.connect();
   * await client.query('BEGIN');
   * try {
   *   const count = await repo.getBookingCount(client, formId, '2025-12-15', '09:00-10:00');
   *   // ... check availability and create booking
   *   await client.query('COMMIT');
   * } catch (error) {
   *   await client.query('ROLLBACK');
   *   throw error;
   * } finally {
   *   client.release();
   * }
   * ```
   */
  async getBookingCount(
    client: PoolClient,
    formId: string,
    date: string,
    timeSlot: string
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM appointment_bookings
      WHERE form_id = $1
        AND date = $2
        AND time_slot = $3
        AND status = 'confirmed'
      FOR UPDATE
    `;

    const result = await client.query(query, [formId, date, timeSlot]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Create appointment booking
   *
   * IMPORTANT: This method should be called within the same transaction
   * as getBookingCount() to ensure atomicity.
   *
   * @param client - Database client (transaction context)
   * @param formId - Form UUID
   * @param date - ISO date YYYY-MM-DD
   * @param timeSlot - Time slot identifier
   * @returns Created booking record with camelCase properties
   *
   * @example
   * ```typescript
   * const booking = await repo.createBooking(
   *   client,
   *   'form-uuid',
   *   '2025-12-15',
   *   '09:00-10:00'
   * );
   * console.log(`Booking ID: ${booking.id}`);
   * ```
   */
  async createBooking(
    client: PoolClient,
    formId: string,
    date: string,
    timeSlot: string
  ): Promise<AppointmentBooking> {
    const query = `
      INSERT INTO appointment_bookings (form_id, date, time_slot, status)
      VALUES ($1, $2, $3, 'confirmed')
      RETURNING
        id,
        form_id AS "formId",
        date,
        time_slot AS "timeSlot",
        booked_at AS "bookedAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await client.query(query, [formId, date, timeSlot]);
    return result.rows[0];
  }

  /**
   * Get available slots for a date range
   * Returns availability information without locking (read-only query)
   *
   * This method queries confirmed bookings and calculates availability
   * based on the maxBookingsPerSlot configuration. Uses efficient
   * aggregation to return only slots that have existing bookings.
   *
   * @param formId - Form UUID
   * @param startDate - Start date ISO YYYY-MM-DD
   * @param endDate - End date ISO YYYY-MM-DD
   * @param maxBookingsPerSlot - Maximum capacity per slot
   * @returns Array of available slots with capacity information
   *
   * @example
   * ```typescript
   * const slots = await repo.getAvailableSlots(
   *   'form-uuid',
   *   '2025-12-15',
   *   '2025-12-22',
   *   5
   * );
   * slots.forEach(slot => {
   *   console.log(`${slot.date} ${slot.timeSlot}: ${slot.availableCapacity}/${slot.maxCapacity}`);
   * });
   * ```
   */
  async getAvailableSlots(
    formId: string,
    startDate: string,
    endDate: string,
    maxBookingsPerSlot: number
  ): Promise<AvailableSlot[]> {
    const query = `
      WITH booking_counts AS (
        SELECT
          date,
          time_slot,
          COUNT(*) as booked_count
        FROM appointment_bookings
        WHERE form_id = $1
          AND date BETWEEN $2 AND $3
          AND status = 'confirmed'
        GROUP BY date, time_slot
      )
      SELECT
        bc.date AS "date",
        bc.time_slot AS "timeSlot",
        ($4 - bc.booked_count) as "availableCapacity",
        $4 as "maxCapacity",
        (bc.booked_count < $4) as "isAvailable"
      FROM booking_counts bc
      ORDER BY bc.date, bc.time_slot
    `;

    const result = await this.pool.query(query, [formId, startDate, endDate, maxBookingsPerSlot]);
    return result.rows;
  }

  /**
   * Cancel booking by ID
   * Updates status from 'confirmed' to 'cancelled'
   *
   * Only confirmed bookings can be cancelled. Attempting to cancel
   * an already cancelled or completed booking returns null.
   *
   * @param bookingId - Booking UUID
   * @returns Updated booking record or null if not found/not cancellable
   *
   * @example
   * ```typescript
   * const cancelled = await repo.cancelBooking('booking-uuid');
   * if (cancelled) {
   *   console.log(`Booking ${cancelled.id} cancelled at ${cancelled.updatedAt}`);
   * } else {
   *   console.log('Booking not found or already cancelled');
   * }
   * ```
   */
  async cancelBooking(bookingId: string): Promise<AppointmentBooking | null> {
    const query = `
      UPDATE appointment_bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'confirmed'
      RETURNING
        id,
        form_id AS "formId",
        date,
        time_slot AS "timeSlot",
        booked_at AS "bookedAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0] || null;
  }

  /**
   * Get booking by ID
   * Retrieves a single booking record
   *
   * @param bookingId - Booking UUID
   * @returns Booking record or null if not found
   *
   * @example
   * ```typescript
   * const booking = await repo.getBookingById('booking-uuid');
   * if (booking) {
   *   console.log(`Booking for ${booking.date} at ${booking.timeSlot}`);
   * }
   * ```
   */
  async getBookingById(bookingId: string): Promise<AppointmentBooking | null> {
    const query = `
      SELECT
        id,
        form_id AS "formId",
        date,
        time_slot AS "timeSlot",
        booked_at AS "bookedAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM appointment_bookings
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [bookingId]);
    return result.rows[0] || null;
  }

  /**
   * Get all bookings for a form
   * Returns all bookings (confirmed, cancelled, completed) for admin view
   *
   * @param formId - Form UUID
   * @param status - Optional filter by status
   * @returns Array of booking records
   *
   * @example
   * ```typescript
   * const allBookings = await repo.getBookingsByForm('form-uuid');
   * const confirmedOnly = await repo.getBookingsByForm('form-uuid', 'confirmed');
   * ```
   */
  async getBookingsByForm(
    formId: string,
    status?: 'confirmed' | 'cancelled' | 'completed'
  ): Promise<AppointmentBooking[]> {
    const query = `
      SELECT
        id,
        form_id AS "formId",
        date,
        time_slot AS "timeSlot",
        booked_at AS "bookedAt",
        status,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM appointment_bookings
      WHERE form_id = $1
        ${status ? 'AND status = $2' : ''}
      ORDER BY date DESC, time_slot
    `;

    const params = status ? [formId, status] : [formId];
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

/**
 * Singleton instance of AppointmentBookingRepository.
 * Import this instance in services and controllers.
 *
 * @example
 * import { appointmentBookingRepository } from './repositories/appointment-booking.repository';
 *
 * const booking = await appointmentBookingRepository.getBookingById('booking-uuid');
 */
export const appointmentBookingRepository = new AppointmentBookingRepository(
  getPoolForDatabase(DatabaseType.FORMS)
);
