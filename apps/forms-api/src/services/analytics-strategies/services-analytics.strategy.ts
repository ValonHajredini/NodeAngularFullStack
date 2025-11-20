/**
 * Services Analytics Strategy
 *
 * Calculates appointment booking metrics: time slot popularity, booking rates.
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.4: Product, Appointment, and Restaurant Analytics Strategies (Backend)
 * Epic 30.5: Calendar Heatmap with Dynamic Field Detection
 *
 * @since 2025-11-16
 */

import {
  AppointmentMetrics,
  AppointmentConfig,
  FormSchema,
  TemplateCategory,
} from '@nodeangularfullstack/shared';
import { IAnalyticsStrategy } from './analytics-strategy.interface';
import { FormSubmissionsRepository } from '../../repositories/form-submissions.repository';
import { FormSchemasRepository } from '../../repositories/form-schemas.repository';

/**
 * Field configuration for appointment analytics.
 * Contains detected field names and detection method.
 */
interface FieldConfig {
  dateField: string;
  timeSlotField: string;
  statusField?: string;
  detectionMethod: 'business_logic' | 'heuristic' | 'not_detected';
}

/**
 * Analytics strategy for service/appointment templates.
 *
 * Provides comprehensive appointment metrics including:
 * - Total submissions count and date range
 * - Booking counts and cancellation rates
 * - Popular time slots aggregation
 * - Calendar heatmap (date × timeslot grid)
 * - Hybrid field detection (business logic → heuristic fallback)
 *
 * @since Epic 30.5: Dynamic field detection and 2D calendar visualization
 */
export class ServicesAnalyticsStrategy implements IAnalyticsStrategy {
  readonly category = TemplateCategory.SERVICES;

  constructor(
    private readonly submissionsRepository: FormSubmissionsRepository,
    private readonly schemasRepository: FormSchemasRepository
  ) {}

  /**
   * Detects date, time slot, and status field names using hybrid approach.
   *
   * Detection Strategy (in order):
   * 1. Business Logic Config: Check schema.settings.businessLogicConfig
   * 2. Heuristic Matching: Match field names against common patterns
   * 3. Not Detected: Return defaults with 'not_detected' method
   *
   * @param schema - Form schema containing field definitions
   * @returns Field configuration with detected names and detection method
   *
   * @example
   * // Business logic config present
   * detectFields(schema) // { dateField: 'preferred_date', timeSlotField: 'time_slot', detectionMethod: 'business_logic' }
   *
   * // No config, uses heuristics
   * detectFields(schema) // { dateField: 'booking_date', timeSlotField: 'time_slot', detectionMethod: 'heuristic' }
   */
  private detectFields(schema: FormSchema): FieldConfig {
    // Check for business logic config (Epic 30.5 enhancement)
    const businessLogicConfig = (schema.settings as any)?.businessLogicConfig;

    if (
      businessLogicConfig &&
      businessLogicConfig.type === 'appointment' &&
      businessLogicConfig.dateField &&
      businessLogicConfig.timeSlotField
    ) {
      const config = businessLogicConfig as AppointmentConfig;
      return {
        dateField: config.dateField,
        timeSlotField: config.timeSlotField,
        statusField: config.statusField,
        detectionMethod: 'business_logic',
      };
    }

    // Fallback to heuristic field name matching
    const dateFieldCandidates = [
      'booking_date',
      'preferred_date',
      'service_date',
      'appointment_date',
      'date',
    ];
    const timeFieldCandidates = [
      'time_slot',
      'appointment_time',
      'service_time',
      'preferred_time',
      'time',
    ];
    const statusFieldCandidates = ['status', 'booking_status', 'appointment_status'];

    const fieldNames = schema.fields.map((field) => field.fieldName);

    const dateField =
      dateFieldCandidates.find((candidate) => fieldNames.includes(candidate)) ||
      'booking_date';
    const timeSlotField =
      timeFieldCandidates.find((candidate) => fieldNames.includes(candidate)) ||
      'time_slot';
    const statusField = statusFieldCandidates.find((candidate) =>
      fieldNames.includes(candidate)
    );

    return {
      dateField,
      timeSlotField,
      statusField,
      detectionMethod: 'heuristic',
    };
  }

  /**
   * Calculate services-specific metrics
   *
   * @param formSchemaId - Form schema UUID
   * @returns Category metrics for services
   */
  async calculateMetrics(formSchemaId: string): Promise<AppointmentMetrics> {
    // Fetch schema to access business logic config and field definitions
    const schema = await this.schemasRepository.findById(formSchemaId);
    if (!schema) {
      throw new Error(`Form schema not found: ${formSchemaId}`);
    }

    // Detect field names using hybrid approach
    const fieldConfig = this.detectFields(schema);

    // Get all submissions with JSONB data
    const submissions = await this.submissionsRepository.findByFormSchemaId(formSchemaId);
    const totalSubmissions = submissions.length;

    if (totalSubmissions === 0) {
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
        calendarHeatmap: [],
        fieldConfig: {
          dateField: fieldConfig.dateField,
          timeSlotField: fieldConfig.timeSlotField,
          statusField: fieldConfig.statusField,
          detectionMethod: fieldConfig.detectionMethod,
        },
      };
    }

    // Calculate basic date range from submission timestamps
    const dates = submissions
      .map((sub) => new Date(sub.submittedAt))
      .sort((a, b) => a.getTime() - b.getTime());

    const firstSubmissionAt = dates[0]?.toISOString();
    const lastSubmissionAt = dates[dates.length - 1]?.toISOString();

    // Build calendar heatmap data (date × timeslot grid)
    const heatmapMap = new Map<string, {
      date: string;
      timeSlot: string;
      bookings: number;
      statusBreakdown?: {
        confirmed: number;
        cancelled: number;
        pending: number;
      };
    }>();

    // Aggregate submissions by date + timeslot combination
    for (const submission of submissions) {
      const valuesJson = (submission as any).valuesJson || {};
      const dateValue = valuesJson[fieldConfig.dateField];
      const timeSlotValue = valuesJson[fieldConfig.timeSlotField];
      const statusValue = fieldConfig.statusField
        ? valuesJson[fieldConfig.statusField]
        : null;

      // Skip submissions without date or timeslot values
      if (!dateValue || !timeSlotValue) {
        continue;
      }

      // Normalize date to ISO format (YYYY-MM-DD)
      const date = new Date(dateValue).toISOString().split('T')[0];
      const timeSlot = String(timeSlotValue);

      const key = `${date}|${timeSlot}`;
      const existing = heatmapMap.get(key);

      if (existing) {
        existing.bookings += 1;
        if (existing.statusBreakdown && statusValue) {
          this.updateStatusBreakdown(existing.statusBreakdown, statusValue);
        }
      } else {
        const entry: any = {
          date,
          timeSlot,
          bookings: 1,
        };

        // Add status breakdown if status field detected
        if (fieldConfig.statusField && statusValue) {
          entry.statusBreakdown = {
            confirmed: 0,
            cancelled: 0,
            pending: 0,
          };
          this.updateStatusBreakdown(entry.statusBreakdown, statusValue);
        }

        heatmapMap.set(key, entry);
      }
    }

    // Convert map to sorted array (by date, then by timeslot)
    const calendarHeatmap = Array.from(heatmapMap.values()).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    // Calculate aggregate metrics from heatmap data
    const totalBookings = calendarHeatmap.reduce((sum, entry) => sum + entry.bookings, 0);
    const cancelledBookings = calendarHeatmap.reduce(
      (sum, entry) => sum + (entry.statusBreakdown?.cancelled || 0),
      0
    );
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    // Calculate popular time slots (aggregate across all dates)
    const timeSlotMap = new Map<string, number>();
    for (const entry of calendarHeatmap) {
      const currentCount = timeSlotMap.get(entry.timeSlot) || 0;
      timeSlotMap.set(entry.timeSlot, currentCount + entry.bookings);
    }

    const popularTimeSlots = Array.from(timeSlotMap.entries())
      .map(([timeSlot, bookings]) => ({ timeSlot, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10); // Top 10 time slots

    // Calculate peak booking day (day of week with most bookings)
    const dayOfWeekMap = new Map<string, number>();
    for (const entry of calendarHeatmap) {
      const dayOfWeek = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' });
      const currentCount = dayOfWeekMap.get(dayOfWeek) || 0;
      dayOfWeekMap.set(dayOfWeek, currentCount + entry.bookings);
    }

    const peakBookingDay = Array.from(dayOfWeekMap.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Calculate average bookings per day
    const uniqueDates = new Set(calendarHeatmap.map((entry) => entry.date));
    const averageBookingsPerDay = uniqueDates.size > 0
      ? totalBookings / uniqueDates.size
      : 0;

    // Return comprehensive metrics
    return {
      category: 'services',
      totalSubmissions,
      totalBookings,
      cancelledBookings,
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      averageBookingsPerDay: parseFloat(averageBookingsPerDay.toFixed(2)),
      popularTimeSlots,
      capacityUtilization: 0, // TODO: Calculate based on max capacity config
      peakBookingDay,
      firstSubmissionAt,
      lastSubmissionAt,
      calendarHeatmap,
      fieldConfig: {
        dateField: fieldConfig.dateField,
        timeSlotField: fieldConfig.timeSlotField,
        statusField: fieldConfig.statusField,
        detectionMethod: fieldConfig.detectionMethod,
      },
    };
  }

  /**
   * Updates status breakdown counts based on status value.
   *
   * @param statusBreakdown - Status counts object to update
   * @param statusValue - Status string from submission
   */
  private updateStatusBreakdown(
    statusBreakdown: { confirmed: number; cancelled: number; pending: number },
    statusValue: string
  ): void {
    const normalizedStatus = statusValue.toLowerCase();

    if (normalizedStatus.includes('confirm') || normalizedStatus === 'approved') {
      statusBreakdown.confirmed += 1;
    } else if (normalizedStatus.includes('cancel') || normalizedStatus === 'rejected') {
      statusBreakdown.cancelled += 1;
    } else if (normalizedStatus.includes('pending') || normalizedStatus === 'waiting') {
      statusBreakdown.pending += 1;
    } else {
      // Default to confirmed if status unrecognized
      statusBreakdown.confirmed += 1;
    }
  }
}
