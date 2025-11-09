import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from 'primeng/card';
import { ButtonDirective } from 'primeng/button';
import { FormTemplate } from '@nodeangularfullstack/shared';

/**
 * Template Card Component
 *
 * Displays a single form template with preview image, name, description, and action buttons.
 * Used within the TemplateSelectionModalComponent to render individual templates.
 *
 * Features:
 * - Thumbnail image with lazy loading and fallback placeholder
 * - Text truncation for description (2 lines max)
 * - Hover effects for visual feedback
 * - "Preview" and "Use Template" action buttons
 * - WCAG AA compliant touch targets (44x44px minimum)
 *
 * @example
 * ```html
 * <app-template-card
 *   [template]="myTemplate"
 *   (preview)="handlePreview($event)"
 *   (useTemplate)="handleUseTemplate($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-template-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, Card, ButtonDirective],
  template: `
    <div
      class="template-card-wrapper h-full transition-transform duration-200 hover:scale-105 hover:shadow-lg"
    >
      <p-card styleClass="h-full flex flex-col">
        <!-- Template Preview Image -->
        <ng-template #header>
          <div class="template-image-container relative overflow-hidden bg-gray-100">
            @if (template.previewImageUrl) {
              <img
                [src]="template.previewImageUrl"
                [alt]="'Preview of ' + template.name + ' template'"
                class="w-full h-48 object-cover"
                loading="lazy"
                (error)="handleImageError($event)"
              />
            } @else {
              <div
                class="w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
              >
                <i class="pi pi-image text-5xl text-gray-400"></i>
              </div>
            }
          </div>
        </ng-template>

        <!-- Template Content -->
        <div class="template-card-content flex flex-col flex-grow">
          <!-- Template Name -->
          <h5 class="text-lg font-semibold text-gray-900 mb-2">
            {{ template.name }}
          </h5>

          <!-- Template Description (truncated to 2 lines) -->
          @if (template.description) {
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">
              {{ template.description }}
            </p>
          } @else {
            <p class="text-sm text-gray-400 mb-4 italic">No description available</p>
          }

          <!-- Usage Count Badge -->
          <div class="mb-4">
            <span
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              <i class="pi pi-users text-xs mr-1"></i>
              {{ template.usageCount }} use{{ template.usageCount !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 mt-auto">
            <button
              pButton
              label="Preview"
              icon="pi pi-eye"
              severity="secondary"
              [outlined]="true"
              (click)="onPreview()"
              class="flex-1"
              [attr.aria-label]="'Preview ' + template.name + ' template'"
            ></button>
            <button
              pButton
              label="Use Template"
              icon="pi pi-check"
              (click)="onUseTemplate()"
              class="flex-1"
              [attr.aria-label]="'Use ' + template.name + ' template'"
            ></button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      .template-card-wrapper {
        cursor: pointer;
      }

      .template-image-container {
        border-bottom: 1px solid #e5e7eb;
      }

      .template-card-content {
        padding: 1rem;
      }

      /* Line clamp for description (2 lines) */
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Ensure buttons meet 44x44px minimum touch target (WCAG AA) */
      button {
        min-height: 44px;
      }

      /* Card hover state */
      :host ::ng-deep .p-card {
        border: 1px solid #e5e7eb;
        transition: border-color 0.2s;
      }

      :host:hover ::ng-deep .p-card {
        border-color: #3b82f6;
      }
    `,
  ],
})
export class TemplateCardComponent {
  /** Template data to display */
  @Input({ required: true }) template!: FormTemplate;

  /** Event emitted when preview button is clicked */
  @Output() preview = new EventEmitter<FormTemplate>();

  /** Event emitted when use template button is clicked */
  @Output() useTemplate = new EventEmitter<FormTemplate>();

  /**
   * Handles preview button click
   */
  protected onPreview(): void {
    this.preview.emit(this.template);
  }

  /**
   * Handles use template button click
   */
  protected onUseTemplate(): void {
    this.useTemplate.emit(this.template);
  }

  /**
   * Handles image loading error by replacing with placeholder
   * @param event - Error event from img element
   */
  protected handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Remove the broken image and let the @else block render the placeholder
    img.style.display = 'none';
  }
}
