import {
  Component,
  ChangeDetectionStrategy,
  signal,
  WritableSignal,
  computed,
  Signal,
  output,
  OutputEmitterRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TemplateCategory } from '@nodeangularfullstack/shared';
import { TemplateWizardService } from '../services/template-wizard.service';

/**
 * Category card metadata
 * Defines icon, label, and description for each template category
 */
interface CategoryMetadata {
  /** Category enum value */
  category: TemplateCategory;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** PrimeNG icon class */
  icon: string;
  /** Badge color severity */
  severity: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
}

/**
 * Category Selection Component
 * Displays available template categories with icons, descriptions, and keyboard navigation.
 * Meets WCAG AA accessibility requirements with ARIA labels and focus management.
 *
 * @since Epic 30, Story 30.10
 *
 * @example
 * ```html
 * <app-category-selection
 *   (categorySelected)="handleCategorySelected($event)">
 * </app-category-selection>
 * ```
 */
@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  templateUrl: './category-selection.component.html',
  styleUrl: './category-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySelectionComponent {
  /**
   * Inject TemplateWizardService for category selection
   * @private
   */
  private readonly wizardService = inject(TemplateWizardService);

  /**
   * Event emitted when user selects a category
   */
  public readonly categorySelected: OutputEmitterRef<TemplateCategory> = output<TemplateCategory>();

  /**
   * Currently selected category (tracks user selection)
   */
  public readonly selectedCategory: WritableSignal<TemplateCategory | null> = signal(null);

  /**
   * Available template categories with metadata
   * Configured with icons, descriptions, and badge severities
   */
  public readonly categories: Signal<CategoryMetadata[]> = computed(() => [
    {
      category: TemplateCategory.POLLS,
      label: 'Polls',
      description:
        'Create opinion polls and voting forms with result tracking and duplicate prevention.',
      icon: 'pi pi-chart-bar',
      severity: 'primary',
    },
    {
      category: TemplateCategory.QUIZ,
      label: 'Quiz',
      description:
        'Build assessments and knowledge checks with automatic scoring and passing thresholds.',
      icon: 'pi pi-question-circle',
      severity: 'success',
    },
    {
      category: TemplateCategory.ECOMMERCE,
      label: 'E-commerce',
      description: 'Product order forms with inventory tracking, variants, and tax calculation.',
      icon: 'pi pi-shopping-cart',
      severity: 'warning',
    },
    {
      category: TemplateCategory.SERVICES,
      label: 'Services',
      description:
        'Appointment booking and time slot management with capacity control and overbooking prevention.',
      icon: 'pi pi-calendar',
      severity: 'info',
    },
    {
      category: TemplateCategory.DATA_COLLECTION,
      label: 'Data Collection',
      description: 'Surveys, registrations, and contact forms for gathering structured data.',
      icon: 'pi pi-database',
      severity: 'secondary',
    },
    {
      category: TemplateCategory.EVENTS,
      label: 'Events',
      description: 'RSVP forms, ticket sales, and event registration with guest count tracking.',
      icon: 'pi pi-ticket',
      severity: 'danger',
    },
  ]);

  /**
   * Selects a template category and updates wizard service state
   * Automatically advances to next step after category selection
   *
   * @param category - Selected template category
   */
  public selectCategory(category: TemplateCategory): void {
    this.selectedCategory.set(category);
    this.wizardService.setCategory(category);
    this.categorySelected.emit(category);

    // Auto-advance to next step after category selection
    // This ensures users can't proceed without selecting a category
    setTimeout(() => {
      this.wizardService.nextStep();
    }, 300); // Small delay for visual feedback
  }

  /**
   * Checks if a category is currently selected
   *
   * @param category - Category to check
   * @returns True if category is selected
   */
  public isSelected(category: TemplateCategory): boolean {
    return this.selectedCategory() === category;
  }

  /**
   * Handles keyboard navigation for category cards
   * Supports Enter and Space keys for selection
   *
   * @param event - Keyboard event
   * @param category - Category associated with the focused card
   */
  public handleKeyDown(event: KeyboardEvent, category: TemplateCategory): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectCategory(category);
    }
  }

  /**
   * Gets ARIA label for category card
   * Provides accessible description for screen readers
   *
   * @param metadata - Category metadata
   * @returns ARIA label string
   */
  public getAriaLabel(metadata: CategoryMetadata): string {
    const selectedText = this.isSelected(metadata.category) ? 'selected' : '';
    return `${metadata.label} template category. ${metadata.description}. ${selectedText}`;
  }
}
