import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { QuizResultMetadata } from '@nodeangularfullstack/shared';

/**
 * Component displays quiz results after submission
 * Shows score, pass/fail status, and detailed answer breakdown
 *
 * Epic 29: Form Template System with Business Logic
 * Story 29.13: Quiz Template with Scoring Logic
 *
 * @since Epic 29, Story 29.13
 * @source docs/architecture/frontend-architecture.md (Signal-based State)
 */
@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, ProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card class="quiz-results-card">
      <ng-template pTemplate="header">
        <div
          class="results-header"
          [class.passed]="results().passed"
          [class.failed]="!results().passed"
        >
          <i [class]="results().passed ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
          <h2>{{ results().passed ? 'Congratulations!' : 'Keep Trying!' }}</h2>
        </div>
      </ng-template>

      <div class="score-summary">
        <div class="score-display">
          <span class="score-value">{{ results().score }}%</span>
          <span class="score-label">Your Score</span>
        </div>

        <p-progressBar
          [value]="results().score"
          [showValue]="false"
          [style]="{ height: '20px', margin: '1rem 0' }"
        />

        <div class="score-breakdown">
          <div class="breakdown-item">
            <span class="label">Correct Answers:</span>
            <span class="value"
              >{{ results().correctAnswers }} / {{ results().totalQuestions }}</span
            >
          </div>

          @if (results().pointsEarned !== undefined) {
            <div class="breakdown-item">
              <span class="label">Points Earned:</span>
              <span class="value">{{ results().pointsEarned }} / {{ results().maxPoints }}</span>
            </div>
          }

          <div class="breakdown-item">
            <span class="label">Status:</span>
            <span
              class="value"
              [class.passed]="results().passed"
              [class.failed]="!results().passed"
            >
              {{ results().passed ? 'PASSED' : 'FAILED' }}
            </span>
          </div>
        </div>
      </div>

      @if (detailedResults() && detailedResults().length > 0) {
        <div class="detailed-results">
          <h3>Answer Breakdown</h3>
          @for (result of detailedResults(); track result.fieldId) {
            <div
              class="answer-item"
              [class.correct]="result.isCorrect"
              [class.incorrect]="!result.isCorrect"
            >
              <div class="answer-header">
                <i [class]="result.isCorrect ? 'pi pi-check' : 'pi pi-times'"></i>
                <span class="field-id">Question {{ $index + 1 }}</span>
                <span class="points">{{ result.points }} pt{{ result.points > 1 ? 's' : '' }}</span>
              </div>
              <div class="answer-body">
                <div class="user-answer"><strong>Your Answer:</strong> {{ result.userAnswer }}</div>
                @if (!result.isCorrect) {
                  <div class="correct-answer">
                    <strong>Correct Answer:</strong> {{ result.correctAnswer }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <ng-template pTemplate="footer">
        @if (allowRetake()) {
          <p-button
            label="Retake Quiz"
            icon="pi pi-refresh"
            (onClick)="onRetake()"
            [outlined]="true"
          />
        }
      </ng-template>
    </p-card>
  `,
  styles: [
    `
      .quiz-results-card {
        max-width: 600px;
        margin: 2rem auto;
      }

      .results-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: 6px 6px 0 0;
      }

      .results-header.passed {
        background: linear-gradient(135deg, var(--green-500), var(--green-600));
        color: white;
      }

      .results-header.failed {
        background: linear-gradient(135deg, var(--red-500), var(--red-600));
        color: white;
      }

      .results-header i {
        font-size: 3rem;
      }

      .results-header h2 {
        margin: 0;
        font-size: 1.75rem;
      }

      .score-summary {
        padding: 1.5rem 0;
      }

      .score-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 1rem;
      }

      .score-value {
        font-size: 3.5rem;
        font-weight: bold;
        color: var(--primary-color);
      }

      .score-label {
        font-size: 1rem;
        color: var(--text-color-secondary);
      }

      .score-breakdown {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }

      .breakdown-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--surface-50);
        border-radius: 6px;
      }

      .breakdown-item .label {
        font-weight: 500;
      }

      .breakdown-item .value {
        font-weight: bold;
      }

      .breakdown-item .value.passed {
        color: var(--green-600);
      }

      .breakdown-item .value.failed {
        color: var(--red-600);
      }

      .detailed-results {
        margin-top: 2rem;
        border-top: 1px solid var(--surface-border);
        padding-top: 1.5rem;
      }

      .detailed-results h3 {
        margin-bottom: 1rem;
        font-size: 1.25rem;
      }

      .answer-item {
        margin-bottom: 1rem;
        padding: 1rem;
        border-radius: 6px;
        border: 2px solid;
      }

      .answer-item.correct {
        background: var(--green-50);
        border-color: var(--green-500);
      }

      .answer-item.incorrect {
        background: var(--red-50);
        border-color: var(--red-500);
      }

      .answer-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        font-weight: 600;
      }

      .answer-header i {
        font-size: 1.25rem;
      }

      .answer-item.correct .answer-header i {
        color: var(--green-600);
      }

      .answer-item.incorrect .answer-header i {
        color: var(--red-600);
      }

      .answer-header .field-id {
        flex: 1;
      }

      .answer-header .points {
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .answer-body {
        padding-left: 1.75rem;
      }

      .user-answer,
      .correct-answer {
        margin-bottom: 0.5rem;
      }

      .correct-answer {
        color: var(--green-700);
      }
    `,
  ],
})
export class QuizResultsComponent {
  // Inputs
  readonly results = input.required<QuizResultMetadata>();
  readonly allowRetake = input<boolean>(false);

  // Computed
  readonly detailedResults = computed(() => {
    const results = this.results();
    return (results as any).detailedResults || [];
  });

  /**
   * Handle retake button click
   */
  onRetake(): void {
    window.location.reload();
  }
}
