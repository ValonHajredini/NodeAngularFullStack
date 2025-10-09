import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { FormBuilderService } from '../form-builder.service';

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
  template: `
    <!-- Confirmation dialog for destructive actions -->
    <p-confirmDialog></p-confirmDialog>

    <!-- Sidebar container -->
    <div
      class="row-layout-sidebar h-full bg-white border-l border-gray-200 transition-all duration-300"
      [class.collapsed]="isCollapsed()"
    >
      <!-- Toggle button -->
      <button
        pButton
        [icon]="isCollapsed() ? 'pi pi-angle-left' : 'pi pi-angle-right'"
        (click)="toggleCollapse()"
        class="toggle-btn w-full"
        [attr.aria-label]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        [attr.aria-expanded]="!isCollapsed()"
      ></button>

      <!-- Sidebar content (only visible when expanded) -->
      @if (!isCollapsed()) {
        <div class="sidebar-content overflow-auto h-[calc(100%-56px)]">
          <!-- Tabbed interface -->
          <p-tabs value="0" styleClass="sidebar-tabs">
            <p-tablist>
              <p-tab value="0">Row Layout</p-tab>
              <p-tab value="1">Settings</p-tab>
            </p-tablist>
            <p-tabpanels>
              <!-- Row Layout Tab Panel -->
              <p-tabpanel value="0">
                <div class="p-4">
                  <!-- Header with enable/disable toggle -->
                  <div class="flex items-center justify-between mb-4">
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
                    <div class="row-list space-y-3 mb-4">
                      @for (row of formBuilderService.rowConfigs(); track row.rowId) {
                        <div class="row-item p-3 border border-gray-200 rounded bg-gray-50">
                          <!-- Row header with delete button -->
                          <div class="flex items-center justify-between mb-3">
                            <span class="font-medium text-sm">Row {{ row.order + 1 }}</span>
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

                          <div class="text-xs text-gray-500 mt-2 text-center">
                            {{ row.columnCount }} {{ row.columnCount === 1 ? 'column' : 'columns' }}
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Add row button -->
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
                  } @else {
                    <!-- Migration UI when row layout is disabled -->
                    <div class="text-center py-6 px-2">
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

              <!-- Settings Tab Panel -->
              <p-tabpanel value="1">
                <div class="p-4">
                  <h3 class="text-base font-semibold mb-4">Form Settings</h3>
                  <p class="text-sm text-gray-600">Form-level settings will be available here.</p>
                </div>
              </p-tabpanel>
            </p-tabpanels>
          </p-tabs>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .row-layout-sidebar {
        width: 320px;
        min-width: 320px;
      }

      .row-layout-sidebar.collapsed {
        width: 48px;
        min-width: 48px;
      }

      .toggle-btn {
        margin: 8px;
        width: calc(100% - 16px);
      }

      .sidebar-content {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }

      .row-layout-sidebar.collapsed .sidebar-content {
        opacity: 0;
        pointer-events: none;
      }

      .row-item {
        transition: all 0.2s ease-in-out;
      }

      .row-item:hover {
        background-color: #e5e7eb;
      }

      /* Tab styles */
      ::ng-deep .sidebar-tabs {
        .p-tablist {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
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
export class RowLayoutSidebarComponent implements OnInit {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly STORAGE_KEY = 'formBuilder.rowSidebarCollapsed';

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
   * Toggles the sidebar collapse state and persists it to localStorage.
   */
  toggleCollapse(): void {
    this.isCollapsed.update((collapsed) => !collapsed);
    localStorage.setItem(this.STORAGE_KEY, String(this.isCollapsed()));
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
}
