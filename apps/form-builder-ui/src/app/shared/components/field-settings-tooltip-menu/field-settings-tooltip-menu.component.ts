import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FormField, FormFieldType, isInputField } from '@nodeangularfullstack/shared';

export type SettingsModalType = 'basic' | 'validation' | 'conditional' | 'quiz';

/**
 * Field Settings Tooltip Menu component.
 *
 * Displays a horizontal menu bar with icon buttons for each settings category.
 * Shows only applicable settings based on field type.
 *
 * Features:
 * - Context-aware visibility (only show applicable settings)
 * - Positioned at top-right corner of field card
 * - Fade-in animation on show
 * - PrimeNG icons for consistency
 */
@Component({
  selector: 'app-field-settings-tooltip-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
  ],
  styles: [`
    .settings-menu {
      position: absolute;
      top: 8px;
      right: 48px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      padding: 4px;
      display: flex;
      gap: 4px;
      z-index: 10;
      animation: fadeIn 200ms ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .settings-menu-button {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      color: #6b7280;
    }

    .settings-menu-button:hover {
      background: #f3f4f6;
      color: #3b82f6;
    }

    .settings-menu-button:active {
      background: #e5e7eb;
      transform: scale(0.95);
    }

    .settings-menu-button i {
      font-size: 16px;
    }

    /* Color coding for different setting types */
    .settings-menu-button.basic:hover {
      color: #8b5cf6; /* Purple for basic */
    }

    .settings-menu-button.validation:hover {
      color: #10b981; /* Green for validation */
    }

    .settings-menu-button.conditional:hover {
      color: #f59e0b; /* Orange for conditional */
    }

    .settings-menu-button.quiz:hover {
      color: #ef4444; /* Red for quiz */
    }
  `],
  template: `
    <div class="settings-menu" (click)="$event.stopPropagation()">
      <!-- Basic Settings (always visible) -->
      <button
        type="button"
        class="settings-menu-button basic"
        pTooltip="Basic Settings"
        tooltipPosition="bottom"
        (click)="openModal('basic')"
      >
        <i class="pi pi-cog"></i>
      </button>

      <!-- Validation Settings (only for input fields) -->
      @if (showValidation()) {
        <button
          type="button"
          class="settings-menu-button validation"
          pTooltip="Validation"
          tooltipPosition="bottom"
          (click)="openModal('validation')"
        >
          <i class="pi pi-check-circle"></i>
        </button>
      }

      <!-- Conditional Visibility (only for input fields) -->
      @if (showConditional()) {
        <button
          type="button"
          class="settings-menu-button conditional"
          pTooltip="Conditional Visibility"
          tooltipPosition="bottom"
          (click)="openModal('conditional')"
        >
          <i class="pi pi-eye"></i>
        </button>
      }

      <!-- Quiz Settings (only when quiz mode enabled and field supports quiz) -->
      @if (showQuiz()) {
        <button
          type="button"
          class="settings-menu-button quiz"
          pTooltip="Quiz Configuration"
          tooltipPosition="bottom"
          (click)="openModal('quiz')"
        >
          <i class="pi pi-star-fill"></i>
        </button>
      }
    </div>
  `,
})
export class FieldSettingsTooltipMenuComponent {
  // Inputs
  readonly field = input.required<FormField>();
  readonly isQuizMode = input<boolean>(false);

  // Output event for opening modals
  readonly openSettingsModal = output<SettingsModalType>();

  // Computed signals for context-aware visibility
  readonly showValidation = computed(() => {
    const currentField = this.field();
    return isInputField(currentField.type);
  });

  readonly showConditional = computed(() => {
    const currentField = this.field();
    return isInputField(currentField.type);
  });

  readonly showQuiz = computed(() => {
    const currentField = this.field();
    const quizMode = this.isQuizMode();

    if (!quizMode) return false;

    const quizSupportedTypes = [
      FormFieldType.RADIO,
      FormFieldType.CHECKBOX,
      FormFieldType.SELECT,
      FormFieldType.TEXT,
    ];

    return quizSupportedTypes.includes(currentField.type);
  });

  /**
   * Open modal handler
   */
  openModal(type: SettingsModalType): void {
    this.openSettingsModal.emit(type);
  }
}
