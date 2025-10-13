import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormStep } from '@nodeangularfullstack/shared';

/**
 * Step progress indicator component for multi-step forms.
 * Displays desktop stepper (horizontal) and mobile progress bar (compact).
 *
 * Desktop view: Horizontal stepper with step numbers, titles, connecting lines
 * Mobile view: Compact "Step X of Y" text with progress bar
 */
@Component({
  selector: 'app-step-progress-indicator',
  standalone: true,
  imports: [CommonModule, ProgressBarModule],
  templateUrl: './step-progress-indicator.component.html',
  styleUrls: ['./step-progress-indicator.component.scss'],
})
export class StepProgressIndicatorComponent {
  /**
   * Current active step index (0-based)
   */
  @Input() currentStepIndex: number = 0;

  /**
   * Total number of steps
   */
  @Input() totalSteps: number = 1;

  /**
   * Array of form steps with metadata
   */
  @Input() steps: FormStep[] = [];

  /**
   * Set of validated step indices
   */
  @Input() validatedSteps: Set<number> = new Set();

  /**
   * Event emitted when user clicks on a step (for navigation)
   */
  @Output() stepClicked = new EventEmitter<number>();

  /**
   * Calculate progress percentage for mobile progress bar
   */
  get progressPercentage(): number {
    if (this.totalSteps === 0) return 0;
    return ((this.currentStepIndex + 1) / this.totalSteps) * 100;
  }

  /**
   * Handle step click for navigation
   */
  onStepClick(stepIndex: number): void {
    // Only allow clicking on previous steps (for backward navigation)
    if (stepIndex < this.currentStepIndex) {
      this.stepClicked.emit(stepIndex);
    }
  }

  /**
   * Check if step is clickable (only previous steps)
   */
  isStepClickable(stepIndex: number): boolean {
    return stepIndex < this.currentStepIndex;
  }
}
