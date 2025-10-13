import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
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
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ToggleSwitch,
    ConfirmDialog,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
  ],
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

        <div class="sidebar-content overflow-auto h-[calc(100%-56px)]">
          <!-- Tabbed interface -->
          <p-tabs value="0" styleClass="sidebar-tabs">
            <p-tablist>
              <p-tab value="0">Row Layout</p-tab>
              <p-tab value="1">Step Form</p-tab>
            </p-tablist>
            <p-tabpanels>
              <!-- Row Layout Tab Panel -->
              <p-tabpanel value="0">
                <div>
                  <!-- Header with enable/disable toggle -->
                  <div class="flex items-center justify-between mb-4 px-2 pt-4">
                    <h3 class="text-base font-semibold">Row Layout</h3>
                    <p-toggleSwitch
                      [(ngModel)]="rowLayoutEnabled"
                      (onChange)="onToggleRowLayout($event)"
                      [attr.aria-label]="
                        rowLayoutEnabled ? 'Disable row-based layout' : 'Enable row-based layout'
                      "
                    ></p-toggleSwitch>
                  </div>

                  @if (formBuilderService.rowLayoutEnabled()) {
                    <!-- Row list with column configuration -->
                    <div class="row-list space-y-3 mb-4 px-2">
                      @for (row of formBuilderService.rowConfigs(); track row.rowId) {
                        <div class="row-item p-3 border border-gray-200 rounded bg-gray-50">
                          <!-- Row header with column count and delete button -->
                          <div class="flex items-center justify-between mb-3">
                            <span class="font-medium text-sm">
                              Row {{ row.order + 1 }}
                              <span class="text-gray-500 font-normal"
                                >| {{ row.columnCount }}
                                {{ row.columnCount === 1 ? 'column' : 'columns' }}</span
                              >
                            </span>
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

                          <!-- Column count selector -->
                          <div class="flex gap-1">
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

                    <!-- Add row button -->
                    <div class="px-2 pb-4">
                      <button
                        pButton
                        label="Add Row"
                        icon="pi pi-plus"
                        size="small"
                        (click)="onAddRow()"
                        class="w-full"
                        severity="secondary"
                        [outlined]="true"
                      ></button>
                    </div>
                  } @else {
                    <!-- Migration UI when row layout is disabled -->
                    <div class="text-center py-6 px-4">
                      <i class="pi pi-th-large text-4xl text-gray-400 mb-3 block"></i>
                      <p class="text-sm text-gray-600 mb-4">
                        Row layout is disabled. Enable to configure columns per row for more
                        flexible form layouts.
                      </p>
                      @if (formBuilderService.hasFields()) {
                        <button
                          pButton
                          label="Convert to Row Layout"
                          icon="pi pi-arrow-right"
                          size="small"
                          (click)="onMigrateToRowLayout()"
                          severity="info"
                          [outlined]="true"
                        ></button>
                      }
                    </div>
                  }
                </div>
              </p-tabpanel>

              <!-- Step Form Tab Panel -->
              <p-tabpanel value="1">
                <div class="py-4 px-4">
                  <h3 class="text-base font-semibold mb-4">Step Form</h3>
                  <p class="text-sm text-gray-600">Step Form will be available here.</p>
                </div>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
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
        background-color: #e5e7eb;
      }

      /* Tab styles */
      ::ng-deep .sidebar-tabs {
        width: 100%;
        display: block;

        p-tabs {
          width: 100%;
          display: block;
        }

        .p-tabs {
          width: 100%;
          display: block;
        }

        .p-tablist {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          width: 100%;
          display: flex !important;
          flex-wrap: nowrap;
        }

        .p-tab {
          flex: 1 1 50%;
          min-width: 0;
          max-width: 50%;
          overflow: hidden;
        }

        .p-tab button {
          width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          justify-content: center;
          display: flex;
          align-items: center;
        }

        .p-tabpanels {
          padding: 0;
          background: transparent;
        }

        .p-tabpanel {
          background: transparent;
        }
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

  /**
   * Signal tracking the collapsed state of the sidebar.
   */
  readonly isCollapsed = signal<boolean>(false);

  /**
   * Local state for row layout toggle (two-way binding with InputSwitch).
   */
  rowLayoutEnabled = false;

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
