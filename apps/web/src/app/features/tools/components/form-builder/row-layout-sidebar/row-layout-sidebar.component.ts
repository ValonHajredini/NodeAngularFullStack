import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { FormBuilderService } from '../form-builder.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Collapsible right sidebar component for row-based layout configuration.
 * Allows users to enable/disable row layout mode and configure column counts per row.
 *
 * Features:
 * - Enable/disable row layout mode with toggle
 * - Add/remove rows with custom column counts (1-4 columns)
 * - Column count selector for each row
 * - Migration from global to row-based layout
 * - Collapsible sidebar with localStorage persistence
 *
 * @example
 * <app-row-layout-sidebar></app-row-layout-sidebar>
 */
@Component({
  selector: 'app-row-layout-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonModule, ToggleSwitch, ConfirmDialog],
  providers: [ConfirmationService],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('200ms 100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
    ]),
  ],
  template: `
    <!-- Confirmation dialog for destructive actions -->
    <p-confirmDialog></p-confirmDialog>

    <!-- Floating toggle button (only visible when collapsed) -->
    @if (isCollapsed()) {
      <button
        @fadeIn
        pButton
        icon="pi pi-table"
        (click)="toggleCollapse()"
        class="floating-toggle-btn"
        [attr.aria-label]="'Expand layout Step Form'"
        severity="primary"
        [rounded]="true"
      ></button>
    }

    <!-- Sidebar container (only visible when expanded) -->
    @if (!isCollapsed()) {
      <div
        @slideInOut
        class="row-layout-sidebar h-full bg-white border-l border-gray-200"
        (click)="resetInactivityTimer()"
        (scroll)="resetInactivityTimer()"
        (mousemove)="onMouseMove()"
      >
        <!-- Close button header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span class="text-sm font-semibold text-gray-700">Layout Step Form</span>
          <button
            pButton
            icon="pi pi-times"
            (click)="toggleCollapse()"
            size="small"
            [text]="true"
            [rounded]="true"
            [attr.aria-label]="'Collapse sidebar'"
          ></button>
        </div>

        <div class="sidebar-content overflow-auto h-[calc(100%-56px)] space-y-6">
          <section class="section-block border-b border-gray-200 px-4 pt-5 pb-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="section-eyebrow">Layout</p>
                <h3 class="text-lg font-semibold text-gray-800">Row Layout</h3>
                <p class="text-sm text-gray-500 mt-1">
                  Organize fields into responsive rows and columns. Toggle row layout to unlock
                  advanced positioning.
                </p>
              </div>
              <p-toggleSwitch
                [(ngModel)]="rowLayoutEnabled"
                (onChange)="onToggleRowLayout($event)"
                [attr.aria-label]="
                  rowLayoutEnabled ? 'Disable row-based layout' : 'Enable row-based layout'
                "
              ></p-toggleSwitch>
            </div>
          </section>

          @if (formBuilderService.rowLayoutEnabled()) {
            <section class="section-block px-4 pb-6">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Active Rows
                </h4>
                <span class="text-xs text-gray-500">
                  {{ formBuilderService.rowConfigs().length }}
                  {{ formBuilderService.rowConfigs().length === 1 ? 'row' : 'rows' }}
                </span>
              </div>

              <div class="row-list space-y-3">
                @for (row of formBuilderService.rowConfigs(); track row.rowId) {
                  <div class="row-item rounded-lg border border-gray-200 bg-white p-3 shadow-xs">
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <p class="text-sm font-semibold text-gray-800">Row {{ row.order + 1 }}</p>
                        <p class="text-xs text-gray-500">
                          {{ row.columnCount }}
                          {{ row.columnCount === 1 ? 'column' : 'columns' }}
                        </p>
                      </div>
                      <button
                        pButton
                        icon="pi pi-trash"
                        severity="danger"
                        size="small"
                        [outlined]="true"
                        (click)="onRemoveRow(row.rowId)"
                        [attr.aria-label]="'Remove row ' + (row.order + 1)"
                      ></button>
                    </div>

                    <div class="flex gap-2">
                      @for (count of [1, 2, 3, 4]; track count) {
                        <button
                          pButton
                          [label]="count.toString()"
                          size="small"
                          [outlined]="row.columnCount !== count"
                          [severity]="row.columnCount === count ? 'primary' : 'secondary'"
                          (click)="onUpdateColumns(row.rowId, $any(count))"
                          [attr.aria-label]="count + ' columns'"
                          [attr.aria-pressed]="row.columnCount === count"
                          class="flex-1"
                        ></button>
                      }
                    </div>
                  </div>
                }
              </div>

              <button
                pButton
                label="Add Row"
                icon="pi pi-plus"
                size="small"
                (click)="onAddRow()"
                class="w-full mt-4"
                severity="secondary"
                [outlined]="true"
              ></button>
            </section>
          } @else {
            <section class="section-block px-4 pb-6">
              <div class="text-center py-6 px-4 border border-dashed border-gray-300 rounded-lg">
                <i class="pi pi-th-large text-4xl text-gray-400 mb-3 block"></i>
                <p class="text-sm text-gray-600 mb-4">
                  Row layout is currently disabled. Enable it to arrange your fields with flexible
                  multi-column rows.
                </p>
                @if (formBuilderService.hasFields()) {
                  <button
                    pButton
                    label="Convert Existing Layout"
                    icon="pi pi-arrow-right"
                    size="small"
                    (click)="onMigrateToRowLayout()"
                    severity="info"
                    [outlined]="true"
                  ></button>
                }
              </div>
            </section>
          }

          <section class="section-block border-t border-gray-200 px-4 py-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <i class="pi pi-sitemap text-gray-500"></i>
                  Step Form Overview
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  Break long forms into smaller steps to improve completion rates.
                </p>
                <span
                  class="status-chip mt-3"
                  [class.status-enabled]="stepFormEnabled()"
                  [class.status-disabled]="!stepFormEnabled()"
                >
                  {{ stepFormEnabled() ? 'Step Form Enabled' : 'Step Form Disabled' }}
                </span>
              </div>
              <button
                pButton
                label="Manage Steps"
                icon="pi pi-external-link"
                size="small"
                (click)="onOpenStepForm()"
                severity="primary"
                [outlined]="true"
              ></button>
            </div>

            @if (stepFormEnabled()) {
              <ul class="mt-4 space-y-2 text-sm text-gray-600">
                @for (step of steps(); track step.id) {
                  <li class="flex items-center gap-2">
                    <span class="step-chip">{{ step.order + 1 }}</span>
                    <span class="truncate">{{ step.title }}</span>
                  </li>
                }
              </ul>
            } @else {
              <p class="mt-4 text-sm text-gray-500">
                Multi-step mode is off. Switch to the Step Form tab to enable it and configure your
                steps.
              </p>
            }
          </section>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .row-layout-sidebar {
        width: 320px;
        min-width: 320px;
      }

      .floating-toggle-btn {
        position: fixed;
        right: 16px;
        top: 25%;
        transform: translateY(-50%);
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        width: 48px;
        height: 48px;
      }

      .sidebar-content {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }

      .row-item {
        transition: all 0.2s ease-in-out;
      }

      .row-item:hover {
        box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
      }

      .section-block {
        background: transparent;
      }

      .section-eyebrow {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
        margin-bottom: 0.25rem;
        font-weight: 600;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border-radius: 999px;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border: 1px solid transparent;
      }

      .status-enabled {
        background: rgba(34, 197, 94, 0.12);
        color: #15803d;
        border-color: rgba(34, 197, 94, 0.4);
      }

      .status-disabled {
        background: rgba(148, 163, 184, 0.15);
        color: #475569;
        border-color: rgba(148, 163, 184, 0.45);
      }

      .step-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: #2563eb;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .shadow-xs {
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      }
    `,
  ],
})
export class RowLayoutSidebarComponent implements OnInit, OnDestroy {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly STORAGE_KEY = 'formBuilder.rowSidebarCollapsed';
  private inactivityTimer?: number;
  private timeoutStartTime?: number;
  private readonly INACTIVITY_TIMEOUT = 30000; // 30 seconds
  private readonly HOVER_GRACE_PERIOD = 5000; // 5 seconds

  @Output() openStepForm = new EventEmitter<void>();

  /**
   * Signal tracking the collapsed state of the sidebar.
   */
  readonly isCollapsed = signal<boolean>(false);

  /**
   * Local state for row layout toggle (two-way binding with InputSwitch).
   */
  rowLayoutEnabled = false;

  /**
   * Expose step form state for quick status preview.
   */
  protected readonly stepFormEnabled = this.formBuilderService.stepFormEnabled;
  protected readonly steps = this.formBuilderService.steps;

  /**
   * Lifecycle hook that initializes the component.
   * Restores collapse state from localStorage and syncs row layout toggle.
   */
  ngOnInit(): void {
    this.restoreCollapseState();
    this.rowLayoutEnabled = this.formBuilderService.rowLayoutEnabled();
  }

  /**
   * Lifecycle hook for cleanup.
   * Clears inactivity timer to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.clearInactivityTimer();
  }

  /**
   * Toggles the sidebar collapse state and persists it to localStorage.
   * Manages inactivity timer: starts when opening, clears when closing.
   */
  toggleCollapse(): void {
    const wasCollapsed = this.isCollapsed();
    this.isCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem(this.STORAGE_KEY, String(this.isCollapsed()));

    if (wasCollapsed) {
      // Opening sidebar - start inactivity timer
      this.startInactivityTimer();
    } else {
      // Closing sidebar - clear timer
      this.clearInactivityTimer();
    }
  }

  /**
   * Handles row layout enable/disable toggle.
   * Shows confirmation dialog when disabling to prevent accidental data loss.
   */
  onToggleRowLayout(event: any): void {
    if (event.checked) {
      this.formBuilderService.enableRowLayout();
    } else {
      this.confirmationService.confirm({
        message:
          'Disable row layout? Fields will revert to global column layout and row configuration will be lost.',
        header: 'Disable Row Layout',
        icon: 'pi pi-exclamation-triangle',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.formBuilderService.disableRowLayout();
        },
        reject: () => {
          // Revert toggle state
          this.rowLayoutEnabled = true;
        },
      });
    }
  }

  /**
   * Adds a new row with default 2-column layout.
   * Service automatically assigns stepId when step mode is enabled.
   */
  onAddRow(): void {
    this.formBuilderService.addRow(2);
  }

  /**
   * Emits event to open Step Form tab in parent container.
   */
  onOpenStepForm(): void {
    this.openStepForm.emit();
    this.startInactivityTimer(); // keep sidebar active when jumping tabs
  }

  /**
   * Removes a row after confirmation.
   * Fields in the removed row are moved to the first available row.
   */
  onRemoveRow(rowId: string): void {
    this.confirmationService.confirm({
      message: 'Remove this row? Fields in this row will be moved to another row.',
      header: 'Remove Row',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.formBuilderService.removeRow(rowId);
      },
    });
  }

  /**
   * Updates the column count for a row.
   */
  onUpdateColumns(rowId: string, columnCount: 1 | 2 | 3 | 4): void {
    this.formBuilderService.updateRowColumns(rowId, columnCount);
  }

  /**
   * Migrates from global column layout to row-based layout.
   * Creates rows based on current global column setting.
   */
  onMigrateToRowLayout(): void {
    this.confirmationService.confirm({
      message:
        'Convert form to row-based layout? This will reorganize your fields into rows based on the current column layout.',
      header: 'Convert to Row Layout',
      icon: 'pi pi-question-circle',
      acceptButtonStyleClass: 'p-button-info',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        // Default to 2 columns for migration
        // TODO: Get actual global column setting from form settings
        const globalColumns = 2;
        this.formBuilderService.migrateToRowLayout(globalColumns);
        this.rowLayoutEnabled = true;
      },
    });
  }

  /**
   * Restores the sidebar collapse state from localStorage.
   */
  private restoreCollapseState(): void {
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    if (savedState !== null) {
      this.isCollapsed.set(savedState === 'true');
    } else {
      // Default to collapsed on small screens
      this.isCollapsed.set(window.innerWidth < 1024);
    }
  }

  /**
   * Handles mouse move events.
   * Only resets timer if less than 5 seconds remaining (grace period).
   */
  onMouseMove(): void {
    const remainingTime = this.getRemainingTime();
    if (remainingTime !== null && remainingTime < this.HOVER_GRACE_PERIOD) {
      this.resetInactivityTimer();
    }
  }

  /**
   * Starts the inactivity timer.
   * After timeout, automatically closes the sidebar.
   */
  private startInactivityTimer(): void {
    this.clearInactivityTimer();
    this.timeoutStartTime = Date.now();
    this.inactivityTimer = window.setTimeout(() => {
      this.isCollapsed.set(true);
      localStorage.setItem(this.STORAGE_KEY, 'true');
      this.clearInactivityTimer();
    }, this.INACTIVITY_TIMEOUT);
  }

  /**
   * Resets the inactivity timer.
   * Called on user interactions (click, scroll, drag).
   */
  resetInactivityTimer(): void {
    if (!this.isCollapsed()) {
      this.startInactivityTimer();
    }
  }

  /**
   * Clears the inactivity timer.
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      window.clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
      this.timeoutStartTime = undefined;
    }
  }

  /**
   * Calculates remaining time on the inactivity timer.
   * @returns Milliseconds remaining, or null if no timer active
   */
  private getRemainingTime(): number | null {
    if (!this.timeoutStartTime || !this.inactivityTimer) {
      return null;
    }
    const elapsed = Date.now() - this.timeoutStartTime;
    return Math.max(0, this.INACTIVITY_TIMEOUT - elapsed);
  }
}
