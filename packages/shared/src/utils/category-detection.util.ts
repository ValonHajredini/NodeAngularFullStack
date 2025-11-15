/**
 * Category Detection Utility
 * Provides pure functions for detecting template categories from form schemas
 *
 * @since Epic 30, Story 30.1
 */

import { FormSchema } from '../types/forms.types';
import {
  TemplateCategory,
  TemplateBusinessLogicConfig,
} from '../types/templates.types';

/**
 * Detects the template category from a form schema
 * Inspects metadata, business logic config, template references, and field quiz metadata
 *
 * @param formSchema - Form schema to inspect
 * @returns Template category enum value or null if not detectable
 *
 * @example
 * ```typescript
 * const schema: FormSchema = {
 *   settings: {
 *     templateId: 'poll-template-id'
 *   },
 *   // ... other fields
 * };
 * const category = detectTemplateCategory(schema); // Returns TemplateCategory.POLLS or null
 * ```
 */
export function detectTemplateCategory(
  formSchema: FormSchema
): TemplateCategory | null {
  // Strategy 1: Check for explicit category in schema settings
  const explicitCategory = formSchema.settings?.templateCategory;
  if (explicitCategory && isValidTemplateCategory(explicitCategory)) {
    return explicitCategory as TemplateCategory;
  }

  // Strategy 2: Detect from embedded template metadata if present
  const embeddedTemplate = formSchema.template;
  if (embeddedTemplate?.category) {
    return embeddedTemplate.category;
  }

  // Strategy 3: Infer from business logic config type if present
  const businessLogic = formSchema.businessLogicConfig;
  if (businessLogic) {
    return inferCategoryFromBusinessLogic(businessLogic);
  }

  // Strategy 4: Check metadata hints (for forms with metadata field)
  const metadataCategory = formSchema.metadata?.templateCategory;
  if (metadataCategory && isValidTemplateCategory(metadataCategory)) {
    return metadataCategory as TemplateCategory;
  }

  // Strategy 5: Detect quiz forms by checking if any field has quiz metadata (correctAnswer)
  // This handles legacy quiz forms that don't have explicit category or businessLogicConfig
  const fields = formSchema.fields || [];
  const hasQuizFields = fields.some((field) => {
    const metadata = field.metadata as any;
    return metadata?.correctAnswer !== undefined;
  });
  if (hasQuizFields) {
    return TemplateCategory.QUIZ;
  }

  // Cannot determine category - return null for generic handling
  return null;
}

/**
 * Validates if a string is a valid TemplateCategory enum value
 *
 * @param value - String value to check
 * @returns True if value is a valid TemplateCategory
 *
 * @example
 * ```typescript
 * isValidTemplateCategory('polls'); // true
 * isValidTemplateCategory('invalid'); // false
 * ```
 */
export function isValidTemplateCategory(value: string): boolean {
  return Object.values(TemplateCategory).includes(value as TemplateCategory);
}

/**
 * Infers template category from business logic configuration type
 * Maps business logic types to their corresponding template categories
 *
 * @param config - Business logic configuration object
 * @returns Inferred template category
 *
 * @example
 * ```typescript
 * const config: PollLogicConfig = { type: 'poll', voteField: 'q1', ... };
 * const category = inferCategoryFromBusinessLogic(config); // Returns TemplateCategory.POLLS
 * ```
 */
export function inferCategoryFromBusinessLogic(
  config: TemplateBusinessLogicConfig
): TemplateCategory {
  switch (config.type) {
    case 'poll':
      return TemplateCategory.POLLS;
    case 'quiz':
      return TemplateCategory.QUIZ;
    case 'inventory':
      return TemplateCategory.ECOMMERCE;
    case 'appointment':
      return TemplateCategory.SERVICES;
    case 'order':
      // Restaurant/menu orders use DATA_COLLECTION category
      return TemplateCategory.DATA_COLLECTION;
    default:
      // Fallback to DATA_COLLECTION for unknown types
      return TemplateCategory.DATA_COLLECTION;
  }
}

/**
 * Type guard: Checks if form schema has poll category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is a poll template
 *
 * @example
 * ```typescript
 * if (isPollCategory(schema)) {
 *   // TypeScript knows this is a poll form
 *   renderPollAnalytics(schema);
 * }
 * ```
 */
export function isPollCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.POLLS;
}

/**
 * Type guard: Checks if form schema has quiz category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is a quiz template
 *
 * @example
 * ```typescript
 * if (isQuizCategory(schema)) {
 *   // TypeScript knows this is a quiz form
 *   renderQuizAnalytics(schema);
 * }
 * ```
 */
export function isQuizCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.QUIZ;
}

/**
 * Type guard: Checks if form schema has ecommerce/product category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is an ecommerce template
 *
 * @example
 * ```typescript
 * if (isEcommerceCategory(schema)) {
 *   // TypeScript knows this is a product/inventory form
 *   renderProductAnalytics(schema);
 * }
 * ```
 */
export function isEcommerceCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.ECOMMERCE;
}

/**
 * Type guard: Checks if form schema has services category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is a services/appointment template
 *
 * @example
 * ```typescript
 * if (isServicesCategory(schema)) {
 *   // TypeScript knows this is a services/appointment form
 *   renderAppointmentAnalytics(schema);
 * }
 * ```
 */
export function isServicesCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.SERVICES;
}

/**
 * Type guard: Checks if form schema has data collection category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is a data collection template
 *
 * @example
 * ```typescript
 * if (isDataCollectionCategory(schema)) {
 *   // TypeScript knows this is a data collection form (surveys, registrations, etc.)
 *   renderGenericAnalytics(schema);
 * }
 * ```
 */
export function isDataCollectionCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.DATA_COLLECTION;
}

/**
 * Type guard: Checks if form schema has events category
 *
 * @param formSchema - Form schema to check
 * @returns True if schema is an events template
 *
 * @example
 * ```typescript
 * if (isEventsCategory(schema)) {
 *   // TypeScript knows this is an events form (RSVP, ticket sales, etc.)
 *   renderEventsAnalytics(schema);
 * }
 * ```
 */
export function isEventsCategory(formSchema: FormSchema): boolean {
  return detectTemplateCategory(formSchema) === TemplateCategory.EVENTS;
}

/**
 * Gets human-readable category label
 * Converts category enum to display-friendly string
 *
 * @param category - Template category enum value
 * @returns Human-readable category label
 *
 * @example
 * ```typescript
 * getCategoryLabel(TemplateCategory.POLLS); // Returns "Polls"
 * getCategoryLabel(TemplateCategory.ECOMMERCE); // Returns "E-Commerce"
 * getCategoryLabel(null); // Returns "General"
 * ```
 */
export function getCategoryLabel(category: TemplateCategory | null): string {
  if (!category) {
    return 'General';
  }

  const labels: Record<TemplateCategory, string> = {
    [TemplateCategory.POLLS]: 'Polls',
    [TemplateCategory.QUIZ]: 'Quiz',
    [TemplateCategory.ECOMMERCE]: 'E-Commerce',
    [TemplateCategory.SERVICES]: 'Services',
    [TemplateCategory.DATA_COLLECTION]: 'Data Collection',
    [TemplateCategory.EVENTS]: 'Events',
  };

  return labels[category] || 'Unknown';
}

/**
 * Gets category icon identifier for UI rendering
 * Returns icon name/identifier for displaying category icons
 *
 * @param category - Template category enum value
 * @returns Icon identifier string (compatible with PrimeNG icons or custom icon sets)
 *
 * @example
 * ```typescript
 * getCategoryIcon(TemplateCategory.POLLS); // Returns "pi-chart-bar"
 * getCategoryIcon(TemplateCategory.QUIZ); // Returns "pi-question-circle"
 * ```
 */
export function getCategoryIcon(category: TemplateCategory | null): string {
  if (!category) {
    return 'pi-file';
  }

  const icons: Record<TemplateCategory, string> = {
    [TemplateCategory.POLLS]: 'pi-chart-bar',
    [TemplateCategory.QUIZ]: 'pi-question-circle',
    [TemplateCategory.ECOMMERCE]: 'pi-shopping-cart',
    [TemplateCategory.SERVICES]: 'pi-calendar',
    [TemplateCategory.DATA_COLLECTION]: 'pi-database',
    [TemplateCategory.EVENTS]: 'pi-ticket',
  };

  return icons[category] || 'pi-file';
}

/**
 * Checks if a form schema requires category-specific analytics
 * Determines if specialized analytics should be rendered vs generic charts
 *
 * @param formSchema - Form schema to check
 * @returns True if category-specific analytics are available
 *
 * @example
 * ```typescript
 * const schema = getFormSchema();
 * if (requiresCategoryAnalytics(schema)) {
 *   renderCategorySpecificCharts(schema);
 * } else {
 *   renderGenericCharts(schema);
 * }
 * ```
 */
export function requiresCategoryAnalytics(formSchema: FormSchema): boolean {
  const category = detectTemplateCategory(formSchema);

  // Only specific categories have specialized analytics
  const categoriesWithAnalytics = [
    TemplateCategory.POLLS,
    TemplateCategory.QUIZ,
    TemplateCategory.ECOMMERCE,
    TemplateCategory.SERVICES,
  ];

  return category !== null && categoriesWithAnalytics.includes(category);
}
