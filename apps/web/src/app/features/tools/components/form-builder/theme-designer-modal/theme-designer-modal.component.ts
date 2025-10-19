import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Dialog } from 'primeng/dialog';
import { StepperModule } from 'primeng/stepper';
import { ButtonDirective } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { ThemeDesignerModalService } from './theme-designer-modal.service';
import { ThemePreviewService } from '../theme-preview.service';
import { ColorStepComponent } from './steps/color-step.component';
import { BackgroundStepComponent } from './steps/background-step.component';
import { TypographyStepComponent } from './steps/typography-step.component';
import { StylingStepComponent } from './steps/styling-step.component';
import { PreviewElementsStepComponent } from './steps/preview-elements-step.component';
import { PreviewStepComponent } from './steps/preview-step.component';
import { FormTheme } from '@nodeangularfullstack/shared';

/**
 * Modal component for creating custom themes with a 7-step wizard.
 * Allows users to design themes without leaving the Form Builder workflow.
 * Integrates with ThemePreviewService for real-time CSS variable updates.
 */
@Component({
  selector: 'app-theme-designer-modal',
  standalone: true,
  imports: [
    CommonModule,
    Dialog,
    StepperModule,
    ButtonDirective,
    ConfirmDialog,
    ColorStepComponent,
    BackgroundStepComponent,
    TypographyStepComponent,
    StylingStepComponent,
    PreviewElementsStepComponent,
    PreviewStepComponent,
  ],
  providers: [ThemeDesignerModalService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Confirmation Dialog for Unsaved Changes -->
    <p-confirmDialog
      [closable]="false"
      [dismissableMask]="false"
      styleClass="theme-designer-confirm-dialog"
    ></p-confirmDialog>

    <p-dialog
      [(visible)]="visibleSignal"
      (visibleChange)="handleDialogVisibilityChange($event)"
      (onHide)="handleDialogHide()"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '900px' }"
      [breakpoints]="{ '1024px': '900px', '768px': '700px', '0px': '100vw' }"
      [header]="modalHeader()"
      styleClass="theme-designer-dialog"
    >
      <div class="theme-designer-wrapper">
        <!-- Scrollable Content Area -->
        <div class="theme-designer-content">
          <p-stepper [(value)]="activeStepIndex" [linear]="true">
            <!-- Hide default step headers with CSS -->
            <p-step-list style="display: none;">
              <p-step [value]="0"></p-step>
              <p-step [value]="1"></p-step>
              <p-step [value]="2"></p-step>
              <p-step [value]="3"></p-step>
              <p-step [value]="4"></p-step>
              <p-step [value]="5"></p-step>
              <p-step [value]="6"></p-step>
            </p-step-list>

            <p-step-panels>
              <!-- Step 1: Colors -->
              <p-step-panel [value]="0">
                <ng-template #content>
                  <app-color-step />
                </ng-template>
              </p-step-panel>

              <!-- Step 2: Background -->
              <p-step-panel [value]="1">
                <ng-template #content>
                  <app-background-step />
                </ng-template>
              </p-step-panel>

              <!-- Step 3: Typography -->
              <p-step-panel [value]="2">
                <ng-template #content>
                  <app-typography-step />
                </ng-template>
              </p-step-panel>

              <!-- Step 4: Styling -->
              <p-step-panel [value]="3">
                <ng-template #content>
                  <app-styling-step />
                </ng-template>
              </p-step-panel>

              <!-- Step 5: Preview Elements -->
              <p-step-panel [value]="4">
                <ng-template #content>
                  <app-preview-elements-step />
                </ng-template>
              </p-step-panel>

              <!-- Step 6: Visual Preview -->
              <p-step-panel [value]="5">
                <ng-template #content>
                  <app-preview-step [visualPreviewOnly]="true" />
                </ng-template>
              </p-step-panel>

              <!-- Step 7: Summary & Save -->
              <p-step-panel [value]="6">
                <ng-template #content>
                  <app-preview-step />
                </ng-template>
              </p-step-panel>
            </p-step-panels>
          </p-stepper>
        </div>

        <!-- Fixed Footer with Dots and Navigation Buttons -->
        <div class="theme-designer-footer">
          <!-- Left side: Previous button -->
          <div class="nav-left">
            @if (activeStepIndex() > 0) {
              <button
                pButton
                type="button"
                label="Previous"
                icon="pi pi-arrow-left"
                severity="secondary"
                (click)="onPrevious()"
              ></button>
            }
          </div>

          <!-- Center: Dot Indicators -->
          <div class="step-indicators">
            @for (step of [0, 1, 2, 3, 4, 5, 6]; track step) {
              <div
                class="step-dot"
                [class.active]="activeStepIndex() === step"
                [class.completed]="activeStepIndex() > step"
                (click)="goToStep(step)"
              ></div>
            }
          </div>

          <!-- Right side: Next or Save button -->
          <div class="nav-right">
            @if (activeStepIndex() < 6) {
              <button
                pButton
                type="button"
                label="Next"
                icon="pi pi-arrow-right"
                iconPos="right"
                [disabled]="!modalService.canProceedToNextStep()"
                (click)="onNext()"
              ></button>
            } @else {
              <button
                pButton
                type="button"
                label="Save Theme"
                icon="pi pi-check"
                iconPos="right"
                [disabled]="!modalService.canProceedToNextStep()"
                (click)="onSave()"
              ></button>
            }
          </div>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .theme-designer-dialog {
        .p-dialog-content {
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 600px;
        }
      }

      .theme-designer-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .theme-designer-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 1.5rem;
        min-height: 0;
      }

      .theme-designer-footer {
        flex-shrink: 0;
        border-top: 1px solid var(--surface-border, #e5e7eb);
        padding: 0.75rem 1.5rem;
        background: var(--surface-0, #ffffff);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        min-height: 60px;
      }

      .nav-left,
      .nav-right {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        min-width: 100px;
      }

      .nav-left {
        justify-content: flex-start;
      }

      .nav-right {
        justify-content: flex-end;
      }

      .step-indicators {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        flex: 0 0 auto;
      }

      .step-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--surface-300, #cbd5e1);
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;

        &:hover {
          transform: scale(1.2);
        }

        &.active {
          background-color: var(--primary-color, #0555a6);
          transform: scale(1.3);
        }

        &.completed {
          background-color: var(--primary-color, #0555a6);
        }
      }

      /* Responsive modal sizing */
      @media (max-width: 767px) {
        :host ::ng-deep .theme-designer-dialog {
          .p-dialog {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            margin: 0;
            border-radius: 0;
          }

          .p-dialog-content {
            height: calc(100vh - 60px);
          }
        }

        .theme-designer-footer {
          padding: 0.5rem 0.75rem;
          min-height: 50px;
        }

        .nav-left,
        .nav-right {
          min-width: 80px;
        }

        .step-indicators {
          gap: 0.4rem;
        }

        .step-dot {
          width: 6px;
          height: 6px;
        }
      }
    `,
  ],
})
export class ThemeDesignerModalComponent implements OnInit, OnDestroy {
  protected readonly modalService = inject(ThemeDesignerModalService);
  private readonly themePreviewService = inject(ThemePreviewService);
  private readonly confirmationService = inject(ConfirmationService);

  /** Internal signal for modal visibility */
  protected readonly visibleSignal = signal<boolean>(false);

  /** Signal for tracking active step index (0-6 for 7 steps) */
  protected readonly activeStepIndex = signal<number>(0);

  /** Computed signal for modal header text */
  protected readonly modalHeader = computed(() => {
    if (this.modalService.isEditMode()) {
      const themeName = this.modalService.getThemeName();
      return `Edit Theme: ${themeName || 'Untitled'}`;
    }
    return 'Create Custom Theme';
  });

  /** Subject for theme updates to enable debouncing */
  private readonly themeUpdate$ = new Subject<void>();

  /** Subject to manage subscriptions and cleanup */
  private readonly destroy$ = new Subject<void>();

  /** Flag to prevent confirmation dialog when programmatically closing */
  private bypassConfirmation = false;

  /**
   * Input setter for visible property to convert to signal.
   * Enables two-way binding with [(visible)] syntax.
   */
  @Input()
  set visible(value: boolean) {
    this.visibleSignal.set(value);
    if (!value) {
      // Clear theme preview when modal closes
      this.themePreviewService.clearThemeCss();
    }
  }

  /** Getter for visible property */
  get visible(): boolean {
    return this.visibleSignal();
  }

  /** Event emitted when modal visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Event emitted when a theme is successfully saved */
  @Output() themeSaved = new EventEmitter<string>();

  constructor() {
    // Track theme changes using Angular effect for reactive updates
    effect(() => {
      // Access all theme properties to register them as dependencies
      const theme = this.modalService.currentTheme();

      // Trigger debounced preview update
      if (this.visibleSignal()) {
        this.themeUpdate$.next();
      }
    });
  }

  ngOnInit(): void {
    // Set up debounced theme preview updates (300ms delay for performance)
    this.themeUpdate$
      .pipe(
        debounceTime(300), // Debounce to avoid excessive updates during rapid changes
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.applyThemePreview();
      });

    // Subscribe to theme saved events from the service
    this.modalService.themeSaved$.pipe(takeUntil(this.destroy$)).subscribe((themeId: string) => {
      // Emit the themeSaved event to parent component
      this.themeSaved.emit(themeId);

      // Close the modal and reset state
      this.closeAndReset();
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and clear theme preview
    this.destroy$.next();
    this.destroy$.complete();
    this.themePreviewService.clearThemeCss();
  }

  /**
   * Applies the current theme state to CSS variables via ThemePreviewService.
   * Builds a FormTheme object from the current wizard state.
   * @private
   */
  private applyThemePreview(): void {
    try {
      const currentTheme = this.modalService.currentTheme();
      const backgroundType = this.modalService.getBackgroundType();
      const previewBackgroundColor =
        backgroundType === 'image'
          ? currentTheme.themeConfig.desktop.backgroundColor
          : this.getBackgroundCss();
      const previewBackgroundImageUrl =
        backgroundType === 'image' ? this.modalService.getBackgroundImageUrl() : undefined;

      const desktopConfig = {
        ...currentTheme.themeConfig.desktop,
        backgroundColor: previewBackgroundColor,
        backgroundImageUrl: previewBackgroundImageUrl,
        labelColor: this.modalService.getLabelColor(),
        inputBackgroundColor: this.modalService.getInputBackgroundColor(),
        inputTextColor: this.modalService.getInputTextColor(),
      };

      // Build theme object from current state
      const theme: FormTheme = {
        id: 'preview',
        name: currentTheme.name || 'Preview',
        thumbnailUrl: currentTheme.thumbnailUrl || '',
        isCustom: true,
        usageCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        themeConfig: {
          desktop: desktopConfig,
        },
      };

      // Apply theme CSS variables to document
      this.themePreviewService.applyThemeCss(theme);
    } catch (error) {
      console.error('Failed to apply theme preview:', error);
    }
  }

  /**
   * Generates CSS background value from current background settings.
   * Supports solid colors, linear gradients, radial gradients, and images.
   * @private
   * @returns CSS background value
   */
  private getBackgroundCss(): string {
    const type = this.modalService.getBackgroundType();

    if (type === 'solid') {
      return this.modalService.getBackgroundColor();
    } else if (type === 'linear') {
      const angle = this.modalService.getGradientAngle();
      const color1 = this.modalService.getGradientColor1();
      const color2 = this.modalService.getGradientColor2();
      return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
    } else if (type === 'radial') {
      const position = this.modalService.getGradientPosition();
      const color1 = this.modalService.getGradientColor1();
      const color2 = this.modalService.getGradientColor2();
      return `radial-gradient(circle at ${position}, ${color1}, ${color2})`;
    } else if (type === 'image') {
      const imageUrl = this.modalService.getBackgroundImageUrl();
      return imageUrl || '#f3f4f6';
    }

    return '#f3f4f6'; // Fallback color
  }

  /**
   * Handles dialog visibility changes with unsaved changes confirmation.
   * Intercepts close attempts to check for unsaved changes.
   * @param value - New visibility state
   */
  protected handleDialogVisibilityChange(value: boolean): void {
    if (!value && !this.bypassConfirmation) {
      // User is trying to close the dialog - check for unsaved changes
      if (this.modalService.hasUnsavedChanges()) {
        // Prevent default close behavior
        this.visibleSignal.set(true);

        // Show confirmation dialog
        this.confirmationService.confirm({
          header: 'Unsaved Changes',
          message:
            'You have unsaved changes. Are you sure you want to close this dialog? All changes will be lost.',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Yes, Close',
          rejectLabel: 'No, Continue Editing',
          acceptButtonStyleClass: 'p-button-danger',
          rejectButtonStyleClass: 'p-button-secondary',
          accept: () => {
            // User confirmed - close and reset
            this.closeAndReset();
          },
          reject: () => {
            // User cancelled - keep dialog open
            this.visibleSignal.set(true);
          },
        });
      } else {
        // No unsaved changes - close normally
        this.closeAndReset();
      }
    } else if (value) {
      // Opening the dialog
      this.visibleSignal.set(true);
      this.visibleChange.emit(true);
      this.themeUpdate$.next();
    }
  }

  /**
   * Handles dialog hide event (called when dialog finishes closing).
   */
  protected handleDialogHide(): void {
    // Clean up after dialog is fully closed
    if (!this.visibleSignal()) {
      this.themePreviewService.clearThemeCss();
    }
  }

  /**
   * Closes the dialog and resets wizard state.
   * Bypasses confirmation dialog to avoid infinite loop.
   * @private
   */
  private closeAndReset(): void {
    // Set bypass flag to prevent confirmation dialog
    this.bypassConfirmation = true;

    // Reset wizard state
    this.modalService.reset();

    // Reset step index to first step
    this.activeStepIndex.set(0);

    // Close the dialog
    this.visibleSignal.set(false);
    this.visibleChange.emit(false);

    // Clear theme preview
    this.themePreviewService.clearThemeCss();

    // Reset bypass flag after a short delay
    setTimeout(() => {
      this.bypassConfirmation = false;
    }, 100);
  }

  /**
   * Advances to the next wizard step.
   * Updates both the stepper index and modal service state.
   */
  protected onNext(): void {
    if (this.activeStepIndex() < 6) {
      this.activeStepIndex.update((i) => i + 1);
      this.modalService.nextStep();
    }
  }

  /**
   * Returns to the previous wizard step.
   * Updates both the stepper index and modal service state.
   */
  protected onPrevious(): void {
    if (this.activeStepIndex() > 0) {
      this.activeStepIndex.update((i) => i - 1);
      this.modalService.previousStep();
    }
  }

  /**
   * Navigates to a specific step by clicking on the dot indicator.
   * Only allows navigation to completed steps or the current step.
   * @param stepIndex - Target step index (0-6)
   */
  protected goToStep(stepIndex: number): void {
    const currentStep = this.activeStepIndex();

    // Allow navigation to any previous step or current step
    if (stepIndex < currentStep) {
      // Going backward - always allowed
      this.activeStepIndex.set(stepIndex);
      this.modalService.goToStep(stepIndex);
    } else if (stepIndex === currentStep) {
      // Clicking on current step - do nothing
      return;
    } else {
      // Going forward - check if we can proceed
      // User must use Next button to proceed forward (validation required)
      return;
    }
  }

  /**
   * Handles the Save Theme button click on the final step.
   * Triggers theme save via modal service and closes modal on success.
   */
  protected onSave(): void {
    if (!this.modalService.canProceedToNextStep()) {
      return;
    }

    // Call the modal service to save the theme
    this.modalService.saveTheme().subscribe({
      next: (savedTheme) => {
        console.log('Theme saved successfully:', savedTheme);
        // Notify subscribers that theme was saved (triggers modal close)
        this.modalService.notifyThemeSaved(savedTheme.id);
      },
      error: (error) => {
        console.error('Failed to save theme:', error);
        // Error handling is done in the modal service
      },
    });
  }

  /**
   * Opens the modal in edit mode with the specified theme.
   * Loads theme data into wizard and sets edit mode flag.
   * @param theme - Theme to edit
   */
  public openInEditMode(theme: FormTheme): void {
    this.modalService.loadTheme(theme);
    this.modalService.setEditMode(theme.id);
    this.visibleSignal.set(true);
    this.visibleChange.emit(true);
    this.themeUpdate$.next();
  }

  /**
   * Checks if the modal is currently in edit mode.
   * @returns True if editing an existing theme, false if creating new theme
   */
  public isInEditMode(): boolean {
    return this.modalService.isEditMode();
  }
}
