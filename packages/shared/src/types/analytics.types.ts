/**
 * Analytics Type Definitions
 * Category-specific metrics for form template analytics
 *
 * @since Epic 30, Story 30.1
 */

/**
 * Base interface for all category metrics
 * Provides common fields shared across all analytics types
 */
export interface CategoryMetricsBase {
  /** Template category discriminator for type narrowing */
  category: string;
  /** Total number of submissions for this form */
  totalSubmissions: number;
  /** ISO timestamp of first submission */
  firstSubmissionAt?: string;
  /** ISO timestamp of most recent submission */
  lastSubmissionAt?: string;
}

/**
 * Poll-specific analytics metrics
 * Tracks vote counts, percentages, and participation rates
 *
 * @since Epic 29, Story 29.14
 *
 * @example
 * ```typescript
 * const pollMetrics: PollMetrics = {
 *   category: 'polls',
 *   totalSubmissions: 150,
 *   voteCounts: { option_a: 75, option_b: 45, option_c: 30 },
 *   votePercentages: { option_a: 50, option_b: 30, option_c: 20 },
 *   uniqueVoters: 148,
 *   duplicateVoteAttempts: 12,
 *   mostPopularOption: 'option_a',
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface PollMetrics extends CategoryMetricsBase {
  /** Discriminator for poll category */
  category: 'polls';
  /** Vote count per option */
  voteCounts: Record<string, number>;
  /** Vote percentage per option (0-100) */
  votePercentages: Record<string, number>;
  /** Number of unique voters (duplicate prevention enabled) */
  uniqueVoters: number;
  /** Number of rejected duplicate vote attempts */
  duplicateVoteAttempts?: number;
  /** Option with highest vote count */
  mostPopularOption: string;
  /**
   * Field detection metadata - indicates which required fields are missing
   * When present, indicates the form doesn't contain poll fields
   */
  missingFields?: {
    /** Whether the form is missing required poll fields */
    hasRequiredFields: boolean;
    /** List of missing field names */
    missing: string[];
    /** Helpful message for the user */
    message: string;
  };
}

/**
 * Quiz-specific analytics metrics
 * Tracks score distributions, pass/fail rates, and question performance
 *
 * @since Epic 29, Story 29.13
 *
 * @example
 * ```typescript
 * const quizMetrics: QuizMetrics = {
 *   category: 'quiz',
 *   totalSubmissions: 200,
 *   averageScore: 75.5,
 *   medianScore: 80,
 *   passRate: 68.5,
 *   scoreDistribution: {
 *     '0-20': 10,
 *     '21-40': 15,
 *     '41-60': 25,
 *     '61-80': 80,
 *     '81-100': 70
 *   },
 *   questionAccuracy: {
 *     q1: 85.5,
 *     q2: 62.0,
 *     q3: 91.5
 *   },
 *   highestScore: 100,
 *   lowestScore: 15,
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface QuizMetrics extends CategoryMetricsBase {
  /** Discriminator for quiz category */
  category: 'quiz';
  /** Average score across all submissions (0-100) */
  averageScore: number;
  /** Median score across all submissions (0-100) */
  medianScore: number;
  /** Percentage of submissions that passed (0-100) */
  passRate: number;
  /** Distribution of scores by range buckets */
  scoreDistribution: Record<string, number>;
  /** Accuracy percentage per question (0-100) */
  questionAccuracy: Record<string, number>;
  /** Highest score achieved */
  highestScore: number;
  /** Lowest score achieved */
  lowestScore: number;
  /**
   * Field detection metadata - indicates which required fields are missing
   * When present, indicates the form doesn't contain quiz fields
   */
  missingFields?: {
    /** Whether the form is missing required quiz fields */
    hasRequiredFields: boolean;
    /** List of missing field names */
    missing: string[];
    /** Helpful message for the user */
    message: string;
  };
}

/**
 * Product/E-commerce analytics metrics
 * Tracks sales totals, inventory levels, and product popularity
 *
 * @since Epic 29, Story 29.11
 *
 * @example
 * ```typescript
 * const productMetrics: ProductMetrics = {
 *   category: 'ecommerce',
 *   totalSubmissions: 500,
 *   totalRevenue: 15750.50,
 *   averageOrderValue: 31.50,
 *   totalItemsSold: 1250,
 *   topProducts: [
 *     { productId: 'prod_123', name: 'Widget', quantity: 450, revenue: 6750 },
 *     { productId: 'prod_456', name: 'Gadget', quantity: 350, revenue: 5250 }
 *   ],
 *   lowStockAlerts: 3,
 *   outOfStockCount: 1,
 *   inventoryValue: 45000,
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface ProductMetrics extends CategoryMetricsBase {
  /** Discriminator for ecommerce category */
  category: 'ecommerce';
  /** Total revenue generated from all orders */
  totalRevenue: number;
  /** Average order value (totalRevenue / totalSubmissions) */
  averageOrderValue: number;
  /** Total number of items sold across all orders */
  totalItemsSold: number;
  /** Top selling products with quantities and revenue */
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  /** Number of products below low stock threshold */
  lowStockAlerts: number;
  /** Number of products currently out of stock */
  outOfStockCount: number;
  /** Total value of remaining inventory */
  inventoryValue?: number;
  /**
   * Field detection metadata - indicates which required fields are missing
   * When present, indicates the form doesn't contain product/ecommerce fields
   */
  missingFields?: {
    /** Whether the form is missing required product fields */
    hasRequiredFields: boolean;
    /** List of missing field names */
    missing: string[];
    /** Helpful message for the user */
    message: string;
  };
}

/**
 * Appointment booking analytics metrics
 * Tracks booking rates, popular time slots, and capacity utilization
 *
 * @since Epic 29, Story 29.12
 *
 * @example
 * ```typescript
 * const appointmentMetrics: AppointmentMetrics = {
 *   category: 'services',
 *   totalSubmissions: 300,
 *   totalBookings: 285,
 *   cancelledBookings: 15,
 *   cancellationRate: 5.0,
 *   averageBookingsPerDay: 12.5,
 *   popularTimeSlots: [
 *     { timeSlot: '09:00-10:00', bookings: 45 },
 *     { timeSlot: '10:00-11:00', bookings: 42 }
 *   ],
 *   capacityUtilization: 85.5,
 *   peakBookingDay: 'Tuesday',
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface AppointmentMetrics extends CategoryMetricsBase {
  /** Discriminator for services/appointment category */
  category: 'services';
  /** Total confirmed bookings */
  totalBookings: number;
  /** Number of cancelled bookings */
  cancelledBookings: number;
  /** Cancellation rate percentage (0-100) */
  cancellationRate: number;
  /** Average bookings per day */
  averageBookingsPerDay: number;
  /** Most popular time slots with booking counts */
  popularTimeSlots: Array<{
    timeSlot: string;
    bookings: number;
  }>;
  /** Overall capacity utilization percentage (0-100) */
  capacityUtilization: number;
  /** Day of week with most bookings */
  peakBookingDay?: string;
  /** Calendar heatmap data - bookings by date AND time slot (2D grid) */
  calendarHeatmap?: Array<{
    /** ISO date string (YYYY-MM-DD) */
    date: string;
    /** Time slot (e.g., '09:00-10:00') */
    timeSlot: string;
    /** Total bookings for this date-time combination */
    bookings: number;
    /** Optional status breakdown */
    statusBreakdown?: {
      confirmed: number;
      cancelled: number;
      pending: number;
    };
  }>;
  /** Field configuration used for data extraction */
  fieldConfig?: {
    /** Field name used for booking date */
    dateField: string;
    /** Field name used for time slot */
    timeSlotField: string;
    /** Optional field name for booking status */
    statusField?: string;
    /** How fields were detected: business logic config, heuristics, or not detected */
    detectionMethod: 'business_logic' | 'heuristic' | 'not_detected';
  };
  /**
   * Field detection metadata - indicates which required fields are missing
   * When present, indicates the form doesn't contain appointment/booking fields
   */
  missingFields?: {
    /** Whether the form is missing required appointment fields */
    hasRequiredFields: boolean;
    /** List of missing field names */
    missing: string[];
    /** Helpful message for the user */
    message: string;
  };
}

/**
 * Restaurant/Menu order analytics metrics
 * Tracks order totals, popular menu items, and revenue breakdown
 * Maps to DATA_COLLECTION category for general data collection forms
 *
 * @since Epic 29, Story 29.15
 *
 * @example
 * ```typescript
 * const restaurantMetrics: RestaurantMetrics = {
 *   category: 'data_collection',
 *   totalSubmissions: 450,
 *   totalRevenue: 12500.75,
 *   averageOrderValue: 27.78,
 *   totalItemsOrdered: 1850,
 *   popularItems: [
 *     { itemName: 'Burger', quantity: 350, revenue: 3500 },
 *     { itemName: 'Fries', quantity: 425, revenue: 1275 }
 *   ],
 *   peakOrderTime: '12:00-13:00',
 *   averageOrderSize: 4.1,
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface RestaurantMetrics extends CategoryMetricsBase {
  /** Discriminator for data collection category (restaurant/menu forms) */
  category: 'data_collection';
  /** Total revenue from all orders */
  totalRevenue: number;
  /** Average order value (totalRevenue / totalSubmissions) */
  averageOrderValue: number;
  /** Total number of items ordered */
  totalItemsOrdered: number;
  /** Most popular menu items with quantities and revenue */
  popularItems: Array<{
    itemName: string;
    quantity: number;
    revenue: number;
  }>;
  /** Time slot with most orders */
  peakOrderTime?: string;
  /** Average number of items per order */
  averageOrderSize: number;
  /**
   * Field detection metadata - indicates which required fields are missing
   * When present, indicates the form doesn't contain restaurant order fields
   */
  missingFields?: {
    /** Whether the form is missing required restaurant fields */
    hasRequiredFields: boolean;
    /** List of missing field names */
    missing: string[];
    /** Helpful message for the user */
    message: string;
  };
}

/**
 * Events analytics metrics
 * Tracks RSVP responses, ticket sales, and event registration data
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * const eventsMetrics: EventsMetrics = {
 *   category: 'events',
 *   totalSubmissions: 250,
 *   confirmedAttendees: 220,
 *   declinedRSVPs: 30,
 *   attendanceRate: 88.0,
 *   ticketsSold: 220,
 *   totalRevenue: 5500.00,
 *   popularTicketTypes: [
 *     { ticketType: 'VIP', quantity: 50, revenue: 2500 },
 *     { ticketType: 'General', quantity: 170, revenue: 3000 }
 *   ],
 *   registrationDeadline: '2025-12-31',
 *   firstSubmissionAt: '2025-01-01T00:00:00Z',
 *   lastSubmissionAt: '2025-01-15T12:30:00Z'
 * };
 * ```
 */
export interface EventsMetrics extends CategoryMetricsBase {
  /** Discriminator for events category */
  category: 'events';
  /** Number of confirmed attendees (RSVP yes) */
  confirmedAttendees: number;
  /** Number of declined RSVPs */
  declinedRSVPs: number;
  /** Attendance rate percentage (confirmed / total * 100) */
  attendanceRate: number;
  /** Total number of tickets sold */
  ticketsSold: number;
  /** Total revenue from ticket sales */
  totalRevenue?: number;
  /** Popular ticket types with sales data */
  popularTicketTypes?: Array<{
    ticketType: string;
    quantity: number;
    revenue: number;
  }>;
  /** Optional registration deadline */
  registrationDeadline?: string;
}

/**
 * Discriminated union of all category-specific analytics metrics
 * Use the `category` property for type narrowing
 * Maps to the 6 template categories: polls, quiz, ecommerce, services, data_collection, events
 *
 * @since Epic 30, Story 30.1
 *
 * @example
 * ```typescript
 * function renderAnalytics(metrics: CategoryMetrics) {
 *   switch (metrics.category) {
 *     case 'polls':
 *       return renderPollChart(metrics); // TypeScript knows this is PollMetrics
 *     case 'quiz':
 *       return renderQuizChart(metrics); // TypeScript knows this is QuizMetrics
 *     case 'ecommerce':
 *       return renderProductChart(metrics); // TypeScript knows this is ProductMetrics
 *     case 'services':
 *       return renderAppointmentChart(metrics); // TypeScript knows this is AppointmentMetrics
 *     case 'data_collection':
 *       return renderDataCollectionChart(metrics); // TypeScript knows this is RestaurantMetrics
 *     case 'events':
 *       return renderEventsChart(metrics); // TypeScript knows this is EventsMetrics
 *   }
 * }
 * ```
 */
export type CategoryMetrics =
  | PollMetrics
  | QuizMetrics
  | ProductMetrics
  | AppointmentMetrics
  | RestaurantMetrics
  | EventsMetrics;

/**
 * Analytics query parameters
 * Used to filter and aggregate analytics data
 *
 * @example
 * ```typescript
 * const params: AnalyticsQueryParams = {
 *   formId: '123e4567-e89b-12d3-a456-426614174000',
 *   startDate: '2025-01-01',
 *   endDate: '2025-01-31',
 *   category: 'polls'
 * };
 * ```
 */
export interface AnalyticsQueryParams {
  /** Form UUID to query analytics for */
  formId: string;
  /** Optional start date for time range (ISO format YYYY-MM-DD) */
  startDate?: string;
  /** Optional end date for time range (ISO format YYYY-MM-DD) */
  endDate?: string;
  /** Optional category filter */
  category?: string;
}
