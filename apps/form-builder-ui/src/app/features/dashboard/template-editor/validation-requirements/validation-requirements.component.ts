/**
 * Validation Requirements Component
 *
 * Displays category-specific field requirements with real-time validation status
 * Shows auto-fix suggestions when validation errors occur
 *
 * Epic 29, Story 29.4: Frontend Validation & UX Enhancement
 *
 * @module ValidationRequirementsComponent
 * @since 2025-11-19
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  output
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Message } from 'primeng/message';
import { ButtonDirective } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Badge } from 'primeng/badge';
import { AccordionModule } from 'primeng/accordion';
import {
  TemplateCategory,
  FormSchema,
  FieldRequirement,
  TemplateFieldValidationResult,
  TemplateFieldValidationError
} from '@nodeangularfullstack/shared';
import { TemplateValidationService } from '../services/template-validation.service';

/**
 * Requirement status for UI display
 */
export interface RequirementStatus {
  requirement: FieldRequirement;
  satisfied: boolean;
  errors: TemplateFieldValidationError[];
}

/**
 * Validation Requirements Component
 *
 * Displays category-specific field requirements and real-time validation status.
 * Provides auto-fix suggestions for validation errors.
 *
 * **Features:**
 * - Category-specific field requirements panel
 * - Real-time validation indicators (✓ satisfied, ⚠ missing/wrong type)
 * - Validation summary (e.g., "3 of 5 required fields")
 * - Auto-fix suggestion buttons with click handlers
 * - Accessible with ARIA labels and screen reader support
 * - Responsive design for mobile and desktop
 *
 * **Inputs:**
 * @Input() category - Template category (POLLS, QUIZ, etc.)
 * @Input() currentSchema - Current form schema being edited
 *
 * **Outputs:**
 * @Output() addField - Emitted when user clicks to add a required field
 * @Output() fixFieldType - Emitted when user clicks to fix field type
 *
 * @example
 * ```html
 * <app-validation-requirements
 *   [category]="selectedCategory"
 *   [currentSchema]="formSchema"
 *   (addField)="handleAddField($event)"
 *   (fixFieldType)="handleFixFieldType($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-validation-requirements',
  standalone: true,
  imports: [
    CommonModule,
    Message,
    ButtonDirective,
    CardModule,
    Badge,
    AccordionModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './validation-requirements.component.html',
  styleUrls: ['./validation-requirements.component.scss']
})
export class ValidationRequirementsComponent {
  // Injected services
  private readonly validationService = inject(TemplateValidationService);

  // Inputs
  readonly category = input<TemplateCategory | null>(null);
  readonly currentSchema = input<FormSchema | null>(null);

  // Outputs
  readonly addField = output<{ fieldName: string; fieldType: string }>();
  readonly fixFieldType = output<{ fieldName: string; targetType: string }>();

  /**
   * Debounced schema signal for performance optimization (AC 2)
   * Delays validation by 300ms to prevent excessive re-computation during rapid field changes
   */
  private readonly debouncedSchema = toSignal(
    toObservable(this.currentSchema).pipe(debounceTime(300)),
    { initialValue: null }
  );

  /**
   * Get field requirements for selected category
   */
  readonly requirements = computed(() => {
    const cat = this.category();
    if (!cat) return [];
    return this.validationService.getRequirementsForCategory(cat);
  });

  /**
   * Validate current schema against category requirements (debounced by 300ms)
   */
  readonly validationResult = computed((): TemplateFieldValidationResult | null => {
    const cat = this.category();
    const schema = this.debouncedSchema(); // Use debounced schema for performance
    if (!cat || !schema) return null;
    return this.validationService.validateCategoryFields(cat, schema);
  });

  /**
   * Get requirement status for each requirement
   */
  readonly requirementStatuses = computed((): RequirementStatus[] => {
    const reqs = this.requirements();
    const result = this.validationResult();
    if (!result) return [];

    return reqs.map(req => {
      // Find errors for this requirement
      const errors = result.errors.filter(err => {
        // Match by field name or pattern
        if (req.fieldName) {
          return err.field === req.fieldName;
        }
        if (req.fieldNamePattern) {
          return req.fieldNamePattern.test(err.field) || err.field === req.fieldNamePattern.source;
        }
        return false;
      });

      return {
        requirement: req,
        satisfied: errors.length === 0,
        errors
      };
    });
  });

  /**
   * Overall validation status summary
   */
  readonly validationSummary = computed(() => {
    const result = this.validationResult();
    if (!result) return '';

    const satisfied = result.satisfiedCount ?? 0;
    const total = result.totalCount ?? 0;

    if (satisfied === total && total > 0) {
      return `All ${total} required field${total > 1 ? 's' : ''} satisfied ✓`;
    } else {
      return `${satisfied} of ${total} required field${total > 1 ? 's' : ''} satisfied`;
    }
  });

  /**
   * Check if all requirements are satisfied
   */
  readonly allSatisfied = computed(() => {
    const result = this.validationResult();
    return result?.isValid ?? false;
  });

  /**
   * Get category label for display
   */
  readonly categoryLabel = computed(() => {
    const cat = this.category();
    if (!cat) return '';

    const labels: Record<TemplateCategory, string> = {
      [TemplateCategory.POLLS]: 'Polls',
      [TemplateCategory.QUIZ]: 'Quiz',
      [TemplateCategory.ECOMMERCE]: 'E-commerce',
      [TemplateCategory.SERVICES]: 'Services',
      [TemplateCategory.DATA_COLLECTION]: 'Data Collection',
      [TemplateCategory.EVENTS]: 'Events'
    };

    return labels[cat] || cat;
  });

  /**
   * Handle add field button click
   */
  protected handleAddField(requirement: FieldRequirement): void {
    // Emit field name and first allowed type
    const fieldName = requirement.fieldName ?? 'new_field';
    const fieldType = requirement.allowedTypes[0];
    this.addField.emit({ fieldName, fieldType });
  }

  /**
   * Handle fix field type button click
   */
  protected handleFixFieldType(error: TemplateFieldValidationError): void {
    // Extract target type from error (first expected type)
    const targetType = Array.isArray(error.expectedType)
      ? error.expectedType[0]
      : error.expectedType;

    this.fixFieldType.emit({
      fieldName: error.field,
      targetType
    });
  }

  /**
   * Format allowed types list for display
   */
  protected formatAllowedTypes(types: string[]): string {
    if (types.length === 1) {
      return types[0];
    }
    if (types.length === 2) {
      return `${types[0]} or ${types[1]}`;
    }
    const lastType = types[types.length - 1];
    const otherTypes = types.slice(0, -1).join(', ');
    return `${otherTypes}, or ${lastType}`;
  }

  /**
   * Format field name pattern for display
   */
  protected formatFieldName(requirement: FieldRequirement): string {
    if (requirement.fieldName) {
      return requirement.fieldName;
    }
    if (requirement.fieldNamePattern) {
      // Convert regex pattern to readable format
      const pattern = requirement.fieldNamePattern.source;
      // Example: ^question_\d+$ → question_1, question_2, ...
      if (pattern.includes('\\d+')) {
        return pattern.replace(/\^/, '').replace(/\$/, '').replace(/\\d\+/, '1, ...');
      }
      return pattern;
    }
    return 'Unknown field';
  }

  /**
   * Get expected type label for display in button
   */
  protected getExpectedTypeLabel(error: TemplateFieldValidationError): string {
    return Array.isArray(error.expectedType)
      ? error.expectedType[0]
      : error.expectedType;
  }
}
