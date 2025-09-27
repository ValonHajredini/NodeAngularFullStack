import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToolsService } from '../../services/tools.service';
import { Tool } from '@nodeangularfullstack/shared';

/**
 * Tools Settings page component for super admin tools management.
 * Provides interface for enabling/disabling system-wide tools.
 */
@Component({
  selector: 'app-tools-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    ToggleSwitchModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="tools-settings">
      <div class="max-w-6xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Tools Management</h2>
              <p class="mt-1 text-sm text-gray-600">
                Enable or disable modular tools across the entire application.
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <p-button
                icon="pi pi-refresh"
                [text]="true"
                [rounded]="true"
                pTooltip="Refresh tools list"
                (onClick)="refreshTools()"
                [loading]="toolsService.loading()"
              />
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div
          *ngIf="toolsService.error()"
          class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          <div class="flex items-center">
            <i class="pi pi-exclamation-triangle text-red-500 mr-2"></i>
            <span>{{ toolsService.error() }}</span>
            <button
              type="button"
              class="ml-auto text-red-500 hover:text-red-700"
              (click)="toolsService.clearError()"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <!-- Tools Table -->
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <p-table
            [value]="toolsService.tools()"
            [loading]="toolsService.loading()"
            [paginator]="false"
            [rows]="10"
            styleClass="p-datatable-sm"
            [tableStyle]="{ 'min-width': '60rem' }"
          >
            <!-- Loading Template -->
            <ng-template pTemplate="loadingicon">
              <p-progressSpinner styleClass="w-8 h-8" strokeWidth="4" animationDuration="1s" />
            </ng-template>

            <!-- Empty State -->
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="4" class="text-center py-8">
                  <div class="flex flex-col items-center">
                    <i class="pi pi-inbox text-gray-400 text-4xl mb-3"></i>
                    <p class="text-gray-500 text-lg font-medium">No tools found</p>
                    <p class="text-gray-400 text-sm">
                      Tools will appear here once they are registered in the system.
                    </p>
                  </div>
                </td>
              </tr>
            </ng-template>

            <!-- Table Header -->
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 25%">Tool Name</th>
                <th style="width: 15%">Key</th>
                <th style="width: 45%">Description</th>
                <th style="width: 15%" class="text-center">Status</th>
              </tr>
            </ng-template>

            <!-- Table Body -->
            <ng-template pTemplate="body" let-tool>
              <tr>
                <!-- Tool Name -->
                <td>
                  <div class="flex items-center">
                    <div>
                      <div class="font-medium text-gray-900">{{ tool.name }}</div>
                      <div class="text-xs text-gray-500">
                        Created {{ tool.createdAt | date: 'short' }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Tool Key -->
                <td>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {{ tool.key }}
                  </span>
                </td>

                <!-- Description -->
                <td>
                  <p class="text-sm text-gray-700 line-clamp-2">
                    {{ tool.description }}
                  </p>
                  <div class="text-xs text-gray-500 mt-1">
                    Updated {{ tool.updatedAt | date: 'short' }}
                  </div>
                </td>

                <!-- Status Toggle -->
                <td class="text-center">
                  <div class="flex items-center justify-center space-x-2">
                    <p-toggleswitch
                      [ngModel]="tool.active"
                      (ngModelChange)="onToggleStatus(tool, $event)"
                      [disabled]="isUpdating(tool.key)"
                    />
                    <span
                      class="text-xs font-medium"
                      [class.text-green-600]="tool.active"
                      [class.text-gray-500]="!tool.active"
                    >
                      {{ tool.active ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>

                  <!-- Loading indicator for individual tool -->
                  <div *ngIf="isUpdating(tool.key)" class="mt-1">
                    <p-progressSpinner
                      styleClass="w-4 h-4"
                      strokeWidth="6"
                      animationDuration="1s"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <!-- Summary Statistics -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="pi pi-check-circle text-green-500 text-xl"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-500">Active Tools</p>
                <p class="text-lg font-semibold text-gray-900">
                  {{ toolsService.activeTools().length }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="pi pi-times-circle text-red-500 text-xl"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-500">Inactive Tools</p>
                <p class="text-lg font-semibold text-gray-900">
                  {{ toolsService.inactiveTools().length }}
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="pi pi-cog text-blue-500 text-xl"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-500">Total Tools</p>
                <p class="text-lg font-semibold text-gray-900">
                  {{ toolsService.tools().length }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Information Section -->
        <div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div class="flex">
            <div class="flex-shrink-0">
              <i class="pi pi-info-circle text-blue-400 text-lg"></i>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-blue-800">Tools Management Information</h3>
              <div class="mt-2 text-sm text-blue-700">
                <ul class="list-disc pl-5 space-y-1">
                  <li>Changes take effect immediately across the entire application</li>
                  <li>Disabled tools will be hidden from all users</li>
                  <li>Only super administrators can manage tools settings</li>
                  <li>Tool status changes are logged for audit purposes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Toast messages -->
      <p-toast position="top-right" />

      <!-- Confirmation dialogs -->
      <p-confirmDialog />
    </div>
  `,
  styles: [
    `
      .tools-settings {
        padding: 2rem 1rem;
      }

      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      ::ng-deep .p-datatable .p-datatable-tbody > tr > td {
        padding: 1rem 0.75rem;
        vertical-align: top;
      }

      ::ng-deep .p-datatable .p-datatable-thead > tr > th {
        padding: 1rem 0.75rem;
        background-color: #f9fafb;
        font-weight: 600;
        border-bottom: 2px solid #e5e7eb;
      }

      ::ng-deep .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider {
        background: #10b981;
      }

      ::ng-deep .p-toggleswitch:not(.p-disabled):hover .p-toggleswitch-slider {
        background: #6b7280;
      }

      ::ng-deep
        .p-toggleswitch.p-toggleswitch-checked:not(.p-disabled):hover
        .p-toggleswitch-slider {
        background: #059669;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsSettingsPage implements OnInit {
  protected readonly toolsService = inject(ToolsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Track which tools are currently being updated
  private readonly updatingTools = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadTools();
  }

  /**
   * Loads tools data from the API.
   */
  private loadTools(): void {
    this.toolsService.getTools().subscribe({
      next: (tools) => {
        console.log(`Loaded ${tools.length} tools`);
      },
      error: (error) => {
        console.error('Failed to load tools:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tools. Please try again.',
        });
      },
    });
  }

  /**
   * Refreshes the tools list.
   */
  refreshTools(): void {
    this.toolsService.refresh().subscribe({
      next: (tools) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Refreshed',
          detail: `Loaded ${tools.length} tools`,
        });
      },
      error: (error) => {
        console.error('Failed to refresh tools:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to refresh tools. Please try again.',
        });
      },
    });
  }

  /**
   * Handles tool status toggle with confirmation.
   */
  onToggleStatus(tool: Tool, newStatus: boolean): void {
    const action = newStatus ? 'enable' : 'disable';
    const actionPast = newStatus ? 'enabled' : 'disabled';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the "${tool.name}" tool? This change will affect all users immediately.`,
      header: `${action.charAt(0).toUpperCase() + action.slice(1)} Tool`,
      icon: 'pi pi-question-circle',
      accept: () => {
        this.updateToolStatus(tool, newStatus, actionPast);
      },
      reject: () => {
        // Status will revert automatically due to the way PrimeNG InputSwitch works
      },
    });
  }

  /**
   * Updates tool status via API.
   */
  private updateToolStatus(tool: Tool, active: boolean, actionPast: string): void {
    // Add tool to updating set
    const updating = new Set(this.updatingTools());
    updating.add(tool.key);
    this.updatingTools.set(updating);

    this.toolsService.updateToolStatus(tool.key, active).subscribe({
      next: (updatedTool) => {
        // Remove tool from updating set
        const updating = new Set(this.updatingTools());
        updating.delete(tool.key);
        this.updatingTools.set(updating);

        this.messageService.add({
          severity: 'success',
          summary: 'Tool Updated',
          detail: `"${updatedTool.name}" has been ${actionPast} successfully.`,
        });
      },
      error: (error) => {
        // Remove tool from updating set
        const updating = new Set(this.updatingTools());
        updating.delete(tool.key);
        this.updatingTools.set(updating);

        console.error('Failed to update tool status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: `Failed to ${actionPast.slice(0, -1)} "${tool.name}". Please try again.`,
        });
      },
    });
  }

  /**
   * Checks if a tool is currently being updated.
   */
  isUpdating(toolKey: string): boolean {
    return this.updatingTools().has(toolKey);
  }
}
