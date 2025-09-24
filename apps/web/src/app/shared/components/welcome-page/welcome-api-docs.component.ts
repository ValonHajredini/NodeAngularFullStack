import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WelcomeCTAButtonComponent } from './welcome-cta-button.component';
import { WelcomeApiDocsConfig, WelcomeCTAButton } from './welcome-page.interface';

/**
 * Welcome API Documentation Component
 *
 * A reusable API documentation section component with:
 * - Theme-aware styling for light/dark modes
 * - Configurable title, description, and documentation details
 * - Call-to-action button for accessing API docs
 * - Card-based layout with hover effects
 * - External link handling with security attributes
 * - Responsive design
 * - Accessibility features
 *
 * @example
 * ```html
 * <app-welcome-api-docs
 *   [config]="{
 *     title: 'API Documentation',
 *     description: 'Explore our comprehensive API docs',
 *     docTitle: 'Swagger API Docs',
 *     docDescription: 'Interactive documentation with live testing',
 *     docUrl: 'http://localhost:3000/api-docs',
 *     docButtonLabel: 'View API Docs',
 *     docButtonIcon: 'pi pi-external-link'
 *   }"
 * />
 * ```
 */
@Component({
  selector: 'app-welcome-api-docs',
  standalone: true,
  imports: [CommonModule, WelcomeCTAButtonComponent],
  template: `
    <section class="api-docs-section" [attr.aria-labelledby]="sectionId">
      <div class="api-docs-container">
        <!-- Section Header -->
        <div class="api-docs-header">
          <h2 [id]="sectionId" class="api-docs-title">
            {{ config().title }}
          </h2>
          @if (config().description) {
            <p class="api-docs-description">
              {{ config().description }}
            </p>
          }
        </div>

        <!-- API Documentation Card -->
        <div
          class="api-docs-card"
          role="article"
          [attr.aria-label]="'API documentation: ' + config().docTitle"
        >
          <div class="card-content">
            <div class="doc-info">
              <h3 class="doc-title">{{ config().docTitle }}</h3>
              <p class="doc-description">{{ config().docDescription }}</p>

              <!-- Additional Features List -->
              <ul class="doc-features" role="list" aria-label="API documentation features">
                <li class="feature-item">
                  <i class="pi pi-check feature-icon" aria-hidden="true"></i>
                  <span>Interactive API exploration</span>
                </li>
                <li class="feature-item">
                  <i class="pi pi-check feature-icon" aria-hidden="true"></i>
                  <span>Live request testing</span>
                </li>
                <li class="feature-item">
                  <i class="pi pi-check feature-icon" aria-hidden="true"></i>
                  <span>Comprehensive endpoint documentation</span>
                </li>
                <li class="feature-item">
                  <i class="pi pi-check feature-icon" aria-hidden="true"></i>
                  <span>Code examples and schemas</span>
                </li>
              </ul>
            </div>

            <div class="doc-action">
              <app-welcome-cta-button
                [config]="docButtonConfig()"
                (clicked)="onDocButtonClick($event)"
              />
            </div>
          </div>

          <!-- Visual Enhancement -->
          <div class="card-decoration" aria-hidden="true">
            <div class="decoration-circle circle-1"></div>
            <div class="decoration-circle circle-2"></div>
            <div class="decoration-circle circle-3"></div>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="security-notice" role="note">
          <i class="pi pi-shield security-icon" aria-hidden="true"></i>
          <span class="security-text"> API documentation opens in a new tab for security </span>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      /* Section Container */
      .api-docs-section {
        padding: var(--spacing-section-lg) 0;
        background-color: var(--color-surface);
        border-top: var(--border-width-1) solid var(--color-border-light);
        transition: var(--transition-colors);
      }

      .api-docs-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 var(--spacing-4);
      }

      /* Section Header */
      .api-docs-header {
        text-align: center;
        margin-bottom: var(--spacing-12);
      }

      .api-docs-title {
        font-size: clamp(2rem, 4vw, 3rem);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        line-height: var(--line-height-tight);
        margin-bottom: var(--spacing-4);
      }

      .api-docs-description {
        font-size: var(--font-size-xl);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin: 0;
        max-width: 42rem;
        margin-left: auto;
        margin-right: auto;
      }

      /* API Documentation Card */
      .api-docs-card {
        position: relative;
        background-color: var(--color-background);
        border: var(--border-width-1) solid var(--color-border-light);
        border-radius: var(--border-radius-xl);
        padding: var(--spacing-8);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        transition:
          var(--transition-colors),
          box-shadow var(--transition-duration-300) var(--transition-timing-in-out),
          transform var(--transition-duration-300) var(--transition-timing-in-out);
      }

      .api-docs-card:hover {
        box-shadow: var(--shadow-2xl);
        transform: translateY(-4px);
      }

      .card-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-8);
      }

      /* Documentation Info */
      .doc-info {
        flex-grow: 1;
      }

      .doc-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-3);
      }

      .doc-description {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        line-height: var(--line-height-relaxed);
        margin-bottom: var(--spacing-6);
      }

      /* Features List */
      .doc-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: var(--spacing-3);
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-3);
        color: var(--color-text-secondary);
        font-size: var(--font-size-base);
      }

      .feature-icon {
        color: var(--color-success-600);
        font-size: var(--font-size-sm);
        flex-shrink: 0;
      }

      /* Doc Action */
      .doc-action {
        display: flex;
        justify-content: center;
      }

      /* Card Decoration */
      .card-decoration {
        position: absolute;
        top: 0;
        right: 0;
        width: 200px;
        height: 200px;
        opacity: 0.1;
        pointer-events: none;
        z-index: 1;
      }

      .decoration-circle {
        position: absolute;
        border-radius: 50%;
        background: linear-gradient(45deg, var(--color-primary-500), var(--color-info-500));
      }

      .circle-1 {
        width: 120px;
        height: 120px;
        top: -60px;
        right: -60px;
      }

      .circle-2 {
        width: 80px;
        height: 80px;
        top: 40px;
        right: 20px;
        opacity: 0.6;
      }

      .circle-3 {
        width: 40px;
        height: 40px;
        top: 100px;
        right: 80px;
        opacity: 0.4;
      }

      /* Security Notice */
      .security-notice {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2);
        margin-top: var(--spacing-6);
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
      }

      .security-icon {
        color: var(--color-info-600);
      }

      .security-text {
        font-style: italic;
      }

      /* Responsive Design */
      @media (min-width: 768px) {
        .card-content {
          flex-direction: row;
          align-items: center;
        }

        .doc-info {
          max-width: 60%;
        }

        .doc-action {
          justify-content: flex-end;
        }

        .doc-features {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 768px) {
        .api-docs-section {
          padding: var(--spacing-section-md) 0;
        }

        .api-docs-container {
          padding: 0 var(--spacing-4);
        }

        .api-docs-card {
          padding: var(--spacing-6);
        }

        .api-docs-header {
          margin-bottom: var(--spacing-8);
        }

        .card-decoration {
          width: 150px;
          height: 150px;
        }

        .circle-1 {
          width: 80px;
          height: 80px;
          top: -40px;
          right: -40px;
        }

        .circle-2 {
          width: 60px;
          height: 60px;
          top: 30px;
          right: 10px;
        }

        .circle-3 {
          width: 30px;
          height: 30px;
          top: 70px;
          right: 50px;
        }
      }

      @media (max-width: 480px) {
        .api-docs-container {
          padding: 0 var(--spacing-3);
        }

        .api-docs-card {
          padding: var(--spacing-5);
        }

        .doc-title {
          font-size: var(--font-size-xl);
        }

        .doc-description {
          font-size: var(--font-size-base);
        }

        .card-decoration {
          display: none;
        }
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .api-docs-section {
        background-color: var(--color-gray-800);
        border-top-color: var(--color-border);
      }

      [data-theme='dark'] .api-docs-card {
        background-color: var(--color-surface);
      }

      [data-theme='dark'] .feature-icon {
        color: var(--color-success-500);
      }

      [data-theme='dark'] .security-icon {
        color: var(--color-info-500);
      }

      [data-theme='dark'] .card-decoration {
        opacity: 0.05;
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .api-docs-card {
          transition: var(--transition-colors);
        }

        .api-docs-card:hover {
          transform: none;
        }
      }

      @media (prefers-contrast: high) {
        .api-docs-card {
          border-width: 2px;
        }

        .card-decoration {
          display: none;
        }
      }

      /* Focus management */
      .api-docs-card:focus-within {
        outline: 2px solid var(--color-focus-ring);
        outline-offset: 4px;
      }
    `,
  ],
})
export class WelcomeApiDocsComponent {
  /**
   * API docs configuration
   */
  config = input.required<WelcomeApiDocsConfig>();

  /**
   * Button click event emitter
   */
  buttonClicked = output<WelcomeCTAButton>();

  /**
   * Unique section ID for accessibility
   */
  sectionId = `api-docs-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Generate button configuration for the API docs button
   */
  docButtonConfig(): WelcomeCTAButton {
    const config = this.config();
    return {
      label: config.docButtonLabel,
      href: config.docUrl,
      target: '_blank',
      variant: 'success',
      size: 'lg',
      icon: config.docButtonIcon || 'pi pi-external-link',
      ariaLabel: `Open ${config.docTitle} in new tab`,
    };
  }

  /**
   * Handle documentation button click
   */
  onDocButtonClick(button: WelcomeCTAButton): void {
    this.buttonClicked.emit(button);
  }
}
