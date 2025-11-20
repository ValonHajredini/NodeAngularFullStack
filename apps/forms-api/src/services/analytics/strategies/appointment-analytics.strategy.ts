/**
 * Appointment Analytics Strategy
 *
 * Computes appointment booking metrics: time slot popularity, booking rates, heatmaps.
 * Implements IAnalyticsStrategy for SERVICES category.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 *
 * @since 2025-01-27
 */

import { AppointmentMetrics } from '@nodeangularfullstack/shared';
import { AnalyticsRepository } from '../../../repositories/analytics.repository';
import { IAnalyticsStrategy } from './analytics-strategy.interface';

/**
 * Analytics strategy for appointment/services templates.
 *
 * Computes:
 * - Total bookings and cancellation rates
 * - Popular time slots ranked by booking count
 * - Peak booking day of week
 * - Capacity utilization percentage
 * - Average bookings per day
 *
 * Data Requirements:
 * - Submission JSONB must contain: time_slot, booking_date, status (optional)
 * - Status values: 'confirmed', 'cancelled', 'pending'
 * - Time slots format: 'HH:MM-HH:MM' (e.g., '09:00-10:00')
 *
 * Performance:
 * - Uses GIN indexes on JSONB columns
 * - Aggregates time slots with GROUP BY for heatmap data
 * - Target: <300ms for datasets with 10,000+ submissions
 *
 * @example
 * ```typescript
 * const strategy = new AppointmentAnalyticsStrategy(analyticsRepository);
 * const metrics = await strategy.buildMetrics(formSchemaId, tenantId);
 * console.log(`Peak day: ${metrics.peakBookingDay}`);
 * console.log(`Top slot: ${metrics.popularTimeSlots[0].timeSlot}`);
 * ```
 */
export class AppointmentAnalyticsStrategy implements IAnalyticsStrategy {
  constructor(private readonly repository: AnalyticsRepository) {}

  /**
   * Checks if this strategy supports the given category.
   *
   * @param category - Template category to check
   * @returns True if category is 'services' or 'SERVICES'
   */
  supports(category: string | null): boolean {
    return category?.toLowerCase() === 'services';
  }

  /**
   * Detects if the form has required appointment booking fields.
   *
   * Checks a sample submission for the presence of required fields:
   * - time_slot: Time slot for the appointment
   * - booking_date: Date of the appointment
   * - status (optional): Booking status (confirmed, cancelled, pending)
   *
   * @param formSchemaId - UUID of the form schema to check
   * @param tenantId - Optional tenant ID for isolation
   * @returns Object with detection results and missing field information
   * @private
   */
  private async detectRequiredFields(
    formSchemaId: string,
    tenantId: string | null
  ): Promise<{ hasRequiredFields: boolean; missing: string[] }> {
    const requiredFields = ['time_slot', 'booking_date'];
    const submissions = await this.repository.getAllSubmissionValues(formSchemaId, tenantId);

    if (submissions.length === 0) {
      return { hasRequiredFields: false, missing: [] };
    }

    // Check first submission for required fields
    const sampleSubmission = submissions[0];
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!(field in sampleSubmission) || sampleSubmission[field] === null || sampleSubmission[field] === undefined) {
        missing.push(field);
      }
    }

    return {
      hasRequiredFields: missing.length === 0,
      missing
    };
  }

  /**
   * Builds appointment analytics metrics from form submissions.
   *
   * Process:
   * 1. Fetch submission counts and time range
   * 2. Detect if form has required appointment booking fields
   * 3. If missing fields, return empty metrics with helpful message
   * 4. Get all submission values to count confirmed vs cancelled
   * 5. Fetch time slot aggregation for heatmap
   * 6. Calculate booking statistics (averages, rates, peaks)
   * 7. Determine capacity utilization (placeholder - requires capacity config)
   *
   * @param formSchemaId - UUID of the form schema to analyze
   * @param tenantId - Optional tenant ID for isolation
   * @returns Promise containing strongly-typed AppointmentMetrics
   * @throws {Error} When database queries fail
   */
  async buildMetrics(formSchemaId: string, tenantId: string | null): Promise<AppointmentMetrics> {
    try {
      // Fetch base submission counts
      const counts = await this.repository.getSubmissionCounts(formSchemaId, tenantId);

      // Handle zero submissions case
      if (counts.totalSubmissions === 0) {
        return {
          category: 'services',
          totalSubmissions: 0,
          totalBookings: 0,
          cancelledBookings: 0,
          cancellationRate: 0,
          averageBookingsPerDay: 0,
          popularTimeSlots: [],
          capacityUtilization: 0,
          peakBookingDay: undefined,
        };
      }

      // Detect if form has required appointment booking fields
      const fieldDetection = await this.detectRequiredFields(formSchemaId, tenantId);

      // If form doesn't have appointment fields, return empty metrics with helpful message
      if (!fieldDetection.hasRequiredFields) {
        return {
          category: 'services',
          totalSubmissions: counts.totalSubmissions,
          totalBookings: 0,
          cancelledBookings: 0,
          cancellationRate: 0,
          averageBookingsPerDay: 0,
          popularTimeSlots: [],
          capacityUtilization: 0,
          peakBookingDay: undefined,
          firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
          lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
          missingFields: {
            hasRequiredFields: false,
            missing: fieldDetection.missing,
            message: `This form does not contain appointment booking fields (${fieldDetection.missing.join(', ')}). Appointment analytics require forms with time_slot and booking_date fields. Consider using a different template category for this type of data collection.`
          }
        };
      }

      // Fetch all submissions to count status breakdown
      const submissions = await this.repository.getAllSubmissionValues(formSchemaId, tenantId);

      let totalBookings = 0;
      let cancelledBookings = 0;

      submissions.forEach((sub) => {
        const status = sub.status?.toLowerCase();
        if (status === 'confirmed' || status === 'pending' || !status) {
          totalBookings++;
        } else if (status === 'cancelled') {
          cancelledBookings++;
        }
      });

      // Calculate cancellation rate
      const cancellationRate =
        counts.totalSubmissions > 0
          ? Math.round((cancelledBookings / counts.totalSubmissions) * 100 * 100) / 100
          : 0;

      // Fetch time slot popularity
      const timeSlots = await this.repository.getAppointmentTimeSlots(formSchemaId, tenantId);

      // Aggregate by time slot (sum across all days of week)
      const slotMap = new Map<string, number>();
      timeSlots.forEach(({ timeSlot, bookings }) => {
        const existing = slotMap.get(timeSlot) || 0;
        slotMap.set(timeSlot, existing + bookings);
      });

      const popularTimeSlots = Array.from(slotMap.entries())
        .map(([timeSlot, bookings]) => ({ timeSlot, bookings }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 10);

      // Determine peak booking day (day with most bookings)
      const dayMap = new Map<string, number>();
      timeSlots.forEach(({ dayOfWeek, bookings }) => {
        const existing = dayMap.get(dayOfWeek) || 0;
        dayMap.set(dayOfWeek, existing + bookings);
      });

      let peakBookingDay: string | undefined;
      let maxDayBookings = 0;
      dayMap.forEach((bookings, day) => {
        if (bookings > maxDayBookings) {
          maxDayBookings = bookings;
          peakBookingDay = day;
        }
      });

      // Calculate average bookings per day
      const daysBetween = this.calculateDaysBetween(
        counts.firstSubmissionAt,
        counts.lastSubmissionAt
      );
      const averageBookingsPerDay =
        daysBetween > 0 ? Math.round((totalBookings / daysBetween) * 100) / 100 : totalBookings;

      // Capacity utilization (placeholder - would require capacity config per time slot)
      // For now, estimate as percentage of confirmed bookings vs total slots available
      // Assuming 10 time slots per day * daysBetween as max capacity
      const estimatedMaxCapacity = daysBetween * 10;
      const capacityUtilization =
        estimatedMaxCapacity > 0
          ? Math.round((totalBookings / estimatedMaxCapacity) * 100 * 100) / 100
          : 0;

      // Return strongly-typed AppointmentMetrics
      const metrics: AppointmentMetrics = {
        category: 'services',
        totalSubmissions: counts.totalSubmissions,
        totalBookings,
        cancelledBookings,
        cancellationRate,
        averageBookingsPerDay,
        popularTimeSlots,
        capacityUtilization: Math.min(capacityUtilization, 100), // Cap at 100%
        peakBookingDay,
        firstSubmissionAt: counts.firstSubmissionAt ?? undefined,
        lastSubmissionAt: counts.lastSubmissionAt ?? undefined,
      };

      return metrics;
    } catch (error: any) {
      throw new Error(
        `[AppointmentAnalyticsStrategy] Failed to build metrics for form ${formSchemaId}: ${error.message}`
      );
    }
  }

  /**
   * Calculates number of days between two ISO date strings.
   * Used for average bookings per day calculation.
   *
   * @param start - ISO start date string
   * @param end - ISO end date string
   * @returns Number of days (minimum 1)
   * @private
   */
  private calculateDaysBetween(start: string | null, end: string | null): number {
    if (!start || !end) return 1;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(diffDays, 1); // Minimum 1 day
  }
}
