import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
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
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    ToggleButtonModule,
    TableModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    BadgeModule,
    ChipModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="tools-settings">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">Tools Management</h2>
              <p class="mt-1 text-sm text-gray-600">
                Manage, enable, and create modular tools across the entire application.
              </p>
            </div>
            <div class="flex items-center space-x-3">
              <p-button
                label="Create New Tool"
                icon="pi pi-plus"
                [raised]="true"
                severity="success"
                (onClick)="navigateToCreateTool()"
                class="create-tool-btn"
              />
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

        <!-- Search and Filter Controls -->
        <div class="mb-6 bg-white rounded-lg shadow p-6">
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <!-- Search Input -->
            <div class="lg:col-span-2">
              <label for="search" class="block text-sm font-medium text-gray-700 mb-2"
                >Search Tools</label
              >
              <span class="p-input-icon-left w-full">
                <i class="pi pi-search"></i>
                <input
                  pInputText
                  id="search"
                  [(ngModel)]="searchQuery"
                  placeholder="Search by name, key, or description..."
                  class="w-full"
                />
              </span>
            </div>

            <!-- Status Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <div class="flex space-x-2">
                <p-button
                  label="All"
                  [text]="statusFilter() !== 'all'"
                  [raised]="statusFilter() === 'all'"
                  size="small"
                  (onClick)="statusFilter.set('all')"
                />
                <p-button
                  label="Active"
                  [text]="statusFilter() !== 'active'"
                  [raised]="statusFilter() === 'active'"
                  severity="success"
                  size="small"
                  (onClick)="statusFilter.set('active')"
                />
                <p-button
                  label="Inactive"
                  [text]="statusFilter() !== 'inactive'"
                  [raised]="statusFilter() === 'inactive'"
                  severity="secondary"
                  size="small"
                  (onClick)="statusFilter.set('inactive')"
                />
              </div>
            </div>

            <!-- Bulk Actions -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Bulk Actions</label>
              <div class="flex space-x-2">
                <p-button
                  label="Enable Selected"
                  icon="pi pi-check"
                  [text]="true"
                  [disabled]="selectedTools().length === 0"
                  (onClick)="bulkUpdateStatus(true)"
                  size="small"
                />
                <p-button
                  label="Disable Selected"
                  icon="pi pi-times"
                  [text]="true"
                  severity="secondary"
                  [disabled]="selectedTools().length === 0"
                  (onClick)="bulkUpdateStatus(false)"
                  size="small"
                />
              </div>
            </div>
          </div>

          <!-- Selection Info -->
          <div
            *ngIf="selectedTools().length > 0"
            class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-blue-700">
                {{ selectedTools().length }} tool(s) selected
              </span>
              <button
                type="button"
                class="text-blue-500 hover:text-blue-700 text-sm"
                (click)="clearSelection()"
              >
                Clear selection
              </button>
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

        <!-- Loading State -->
        <div *ngIf="toolsService.loading()" class="flex justify-center py-12">
          <p-progressSpinner styleClass="w-12 h-12" strokeWidth="4" animationDuration="1s" />
        </div>

        <!-- Tools Grid -->
        <div
          *ngIf="!toolsService.loading()"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <p-card
            *ngFor="let tool of filteredTools(); trackBy: trackByTool"
            class="tool-card cursor-pointer transition-all duration-200 hover:shadow-lg"
            [class.selected]="isToolSelected(tool.key)"
            (click)="showToolDetails(tool)"
          >
            <ng-template pTemplate="header">
              <div class="flex items-center justify-between p-4 pb-2">
                <!-- Selection Checkbox -->
                <p-checkbox
                  [binary]="true"
                  [ngModel]="isToolSelected(tool.key)"
                  (ngModelChange)="toggleToolSelection(tool.key, $event)"
                  (click)="$event.stopPropagation()"
                />

                <!-- Tool Icon -->
                <div class="flex items-center space-x-2">
                  <i [class]="getToolIcon(tool)" class="text-2xl text-blue-600"></i>
                </div>

                <!-- Status Badge -->
                <p-badge
                  [value]="tool.active ? 'Active' : 'Inactive'"
                  [severity]="tool.active ? 'success' : 'secondary'"
                />
              </div>
            </ng-template>

            <ng-template pTemplate="content">
              <div class="space-y-3">
                <!-- Tool Name & Key -->
                <div>
                  <h3 class="font-semibold text-lg text-gray-900 mb-1">{{ tool.name }}</h3>
                  <p-chip [label]="tool.key" class="text-xs" icon="pi pi-tag" />
                </div>

                <!-- Description -->
                <p class="text-sm text-gray-600 line-clamp-3 min-h-[3rem]">
                  {{ tool.description || 'No description available' }}
                </p>

                <!-- Metadata -->
                <div class="text-xs text-gray-500 space-y-1">
                  <div class="flex items-center space-x-2">
                    <i class="pi pi-calendar"></i>
                    <span>Created {{ tool.createdAt | date: 'short' }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <i class="pi pi-clock"></i>
                    <span>Updated {{ tool.updatedAt | date: 'short' }}</span>
                  </div>
                </div>
              </div>
            </ng-template>

            <ng-template pTemplate="footer">
              <div class="flex items-center justify-between pt-3">
                <!-- Status Toggle -->
                <div class="flex items-center space-x-2">
                  <p-checkbox
                    [binary]="true"
                    [ngModel]="tool.active"
                    (ngModelChange)="onToggleStatus(tool, $event)"
                    (click)="$event.stopPropagation()"
                    [disabled]="isUpdating(tool.key)"
                  />
                  <span
                    class="text-sm font-medium"
                    [class.text-green-600]="tool.active"
                    [class.text-gray-500]="!tool.active"
                  >
                    {{ tool.active ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>

                <!-- Actions -->
                <div class="flex space-x-1">
                  <p-button
                    icon="pi pi-eye"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    pTooltip="View details"
                    (onClick)="showToolDetails(tool); $event.stopPropagation()"
                  />
                  <p-button
                    icon="pi pi-cog"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    pTooltip="Configure tool"
                    (onClick)="configureTool(tool); $event.stopPropagation()"
                  />
                </div>

                <!-- Loading indicator -->
                <div
                  *ngIf="isUpdating(tool.key)"
                  class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg"
                >
                  <p-progressSpinner styleClass="w-6 h-6" strokeWidth="6" animationDuration="1s" />
                </div>
              </div>
            </ng-template>
          </p-card>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="!toolsService.loading() && filteredTools().length === 0"
          class="text-center py-12"
        >
          <div class="flex flex-col items-center">
            <i class="pi pi-inbox text-gray-400 text-6xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              {{
                toolsService.tools().length === 0 ? 'No tools found' : 'No tools match your search'
              }}
            </h3>
            <p class="text-gray-500 text-sm mb-6 max-w-md">
              {{ toolsService.tools().length === 0
                  ? 'Tools will appear here once they are registered in the system.'
                  : 'Try adjusting your search criteria or filters to find the tools you're looking for.' }}
            </p>
            <p-button
              *ngIf="toolsService.tools().length === 0"
              label="Create Your First Tool"
              icon="pi pi-plus"
              (onClick)="navigateToCreateTool()"
            />
            <p-button
              *ngIf="toolsService.tools().length > 0"
              label="Clear Filters"
              icon="pi pi-filter-slash"
              [text]="true"
              (onClick)="clearFilters()"
            />
          </div>
        </div>

        <!-- Summary Statistics -->
        <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <li>Click on any tool card to view detailed information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tool Details Modal -->
      <p-dialog
        [(visible)]="showDetailsModal"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        [dismissableMask]="true"
        styleClass="max-w-2xl"
        header="Tool Details"
      >
        <div *ngIf="selectedToolForDetails()" class="space-y-6">
          <!-- Tool Header -->
          <div class="flex items-start space-x-4">
            <i
              [class]="getToolIcon(selectedToolForDetails()!)"
              class="text-3xl text-blue-600 mt-1"
            ></i>
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-900">
                {{ selectedToolForDetails()!.name }}
              </h3>
              <div class="flex items-center space-x-3 mt-2">
                <p-chip [label]="selectedToolForDetails()!.key" icon="pi pi-tag" />
                <p-badge
                  [value]="selectedToolForDetails()!.active ? 'Active' : 'Inactive'"
                  [severity]="selectedToolForDetails()!.active ? 'success' : 'secondary'"
                />
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <h4 class="font-medium text-gray-900 mb-2">Description</h4>
            <p class="text-gray-700">
              {{
                selectedToolForDetails()!.description || 'No description available for this tool.'
              }}
            </p>
          </div>

          <!-- Metadata -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Created</h4>
              <p class="text-gray-600">{{ selectedToolForDetails()!.createdAt | date: 'full' }}</p>
            </div>
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Last Updated</h4>
              <p class="text-gray-600">{{ selectedToolForDetails()!.updatedAt | date: 'full' }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-between items-center pt-4 border-t">
            <div class="flex items-center space-x-3">
              <p-checkbox
                [binary]="true"
                [ngModel]="selectedToolForDetails()!.active"
                (ngModelChange)="onToggleStatus(selectedToolForDetails()!, $event)"
                [disabled]="isUpdating(selectedToolForDetails()!.key)"
              />
              <span class="text-sm font-medium">
                {{ selectedToolForDetails()!.active ? 'Tool is enabled' : 'Tool is disabled' }}
              </span>
            </div>
            <p-button
              label="Configure"
              icon="pi pi-cog"
              [text]="true"
              (onClick)="configureTool(selectedToolForDetails()!)"
            />
          </div>
        </div>
      </p-dialog>

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

      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Tool Card Styles */
      .tool-card {
        position: relative;
        border: 2px solid transparent;
        transition: all 0.2s ease-in-out;
      }

      .tool-card:hover {
        transform: translateY(-2px);
        border-color: #3b82f6;
      }

      .tool-card.selected {
        border-color: #10b981;
        background-color: #f0f9ff;
      }

      /* Create Tool Button */
      .create-tool-btn {
        font-weight: 600;
      }

      ::ng-deep .create-tool-btn .p-button {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: none;
        box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
      }

      ::ng-deep .create-tool-btn .p-button:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 8px -1px rgba(16, 185, 129, 0.4);
      }

      /* Toggle Switch Styling */
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

      /* Card Content Spacing */
      ::ng-deep .p-card .p-card-content {
        padding: 1rem 1.5rem;
      }

      ::ng-deep .p-card .p-card-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e7eb;
      }

      /* Badge Customization */
      ::ng-deep .p-badge.p-badge-success {
        background-color: #10b981;
        color: white;
      }

      ::ng-deep .p-badge.p-badge-secondary {
        background-color: #6b7280;
        color: white;
      }

      /* Chip Styling */
      ::ng-deep .p-chip {
        background-color: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
      }

      /* Dialog Customization */
      ::ng-deep .p-dialog .p-dialog-header {
        background-color: #f9fafb;
        border-bottom: 1px solid #e5e7eb;
      }

      ::ng-deep .p-dialog .p-dialog-content {
        padding: 2rem;
      }

      /* Input and Dropdown Styling */
      ::ng-deep .p-inputtext:focus,
      ::ng-deep .p-dropdown:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 1px #3b82f6;
      }

      /* Responsive Adjustments */
      @media (max-width: 768px) {
        .tools-settings {
          padding: 1rem 0.5rem;
        }

        ::ng-deep .p-card .p-card-content,
        ::ng-deep .p-card .p-card-footer {
          padding: 0.75rem 1rem;
        }
      }

      /* Loading overlay for cards */
      .tool-card .absolute {
        z-index: 10;
      }

      /* Animation for card loading */
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .tool-card .absolute .w-6 {
        animation: pulse 1.5s ease-in-out infinite;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsSettingsPage implements OnInit {
  protected readonly toolsService = inject(ToolsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  // Track which tools are currently being updated
  private readonly updatingTools = signal<Set<string>>(new Set());

  // Search and filter state
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Selection state
  private readonly selectedToolsKeys = signal<Set<string>>(new Set());

  // Modal state
  showDetailsModal = signal(false);
  selectedToolForDetails = signal<Tool | null>(null);

  // Computed properties
  readonly selectedTools = computed(() => {
    const keys = this.selectedToolsKeys();
    return this.toolsService.tools().filter((tool) => keys.has(tool.key));
  });

  readonly filteredTools = computed(() => {
    const tools = this.toolsService.tools();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return tools.filter((tool) => {
      // Status filter
      const statusMatch =
        status === 'all' ||
        (status === 'active' && tool.active) ||
        (status === 'inactive' && !tool.active);

      // Search filter
      const searchMatch =
        !query ||
        tool.name.toLowerCase().includes(query) ||
        tool.key.toLowerCase().includes(query) ||
        (tool.description && tool.description.toLowerCase().includes(query));

      return statusMatch && searchMatch;
    });
  });

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

  /**
   * Navigates to the tool creation wizard.
   */
  navigateToCreateTool(): void {
    this.router.navigate(['/app/admin/tools/create']);
  }

  /**
   * Gets the icon class for a tool based on its key or category.
   */
  getToolIcon(tool: Tool): string {
    // Map tool keys to specific icons, with fallback to generic tool icon
    const iconMap: Record<string, string> = {
      'short-link': 'pi pi-link',
      'url-shortener': 'pi pi-link',
      'file-manager': 'pi pi-folder',
      'text-editor': 'pi pi-file-edit',
      calculator: 'pi pi-calculator',
      'password-generator': 'pi pi-key',
      'qr-code': 'pi pi-qrcode',
      'image-editor': 'pi pi-image',
      'color-picker': 'pi pi-palette',
      'json-formatter': 'pi pi-code',
      'base64-encoder': 'pi pi-lock',
      'regex-tester': 'pi pi-search',
    };

    return iconMap[tool.key] || 'pi pi-wrench';
  }

  /**
   * Track function for ngFor performance.
   */
  trackByTool(index: number, tool: Tool): string {
    return tool.key;
  }

  /**
   * Checks if a tool is selected.
   */
  isToolSelected(toolKey: string): boolean {
    return this.selectedToolsKeys().has(toolKey);
  }

  /**
   * Toggles tool selection.
   */
  toggleToolSelection(toolKey: string, selected: boolean): void {
    const currentSelection = new Set(this.selectedToolsKeys());

    if (selected) {
      currentSelection.add(toolKey);
    } else {
      currentSelection.delete(toolKey);
    }

    this.selectedToolsKeys.set(currentSelection);
  }

  /**
   * Clears all tool selections.
   */
  clearSelection(): void {
    this.selectedToolsKeys.set(new Set());
  }

  /**
   * Performs bulk status update on selected tools.
   */
  bulkUpdateStatus(active: boolean): void {
    const selectedTools = this.selectedTools();
    if (selectedTools.length === 0) return;

    const action = active ? 'enable' : 'disable';
    const actionPast = active ? 'enabled' : 'disabled';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} ${selectedTools.length} selected tool(s)? This change will affect all users immediately.`,
      header: `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)} Tools`,
      icon: 'pi pi-question-circle',
      accept: () => {
        this.performBulkUpdate(selectedTools, active, actionPast);
      },
    });
  }

  /**
   * Performs the actual bulk update operation.
   */
  private performBulkUpdate(tools: Tool[], active: boolean, actionPast: string): void {
    let successCount = 0;
    let errorCount = 0;
    let completed = 0;
    const total = tools.length;

    tools.forEach((tool) => {
      // Add tool to updating set
      const updating = new Set(this.updatingTools());
      updating.add(tool.key);
      this.updatingTools.set(updating);

      this.toolsService.updateToolStatus(tool.key, active).subscribe({
        next: () => {
          successCount++;
          completed++;
          this.checkBulkUpdateCompletion(completed, total, successCount, errorCount, actionPast);
        },
        error: (error) => {
          errorCount++;
          completed++;
          console.error(`Failed to update ${tool.name}:`, error);
          this.checkBulkUpdateCompletion(completed, total, successCount, errorCount, actionPast);
        },
        complete: () => {
          // Remove tool from updating set
          const updating = new Set(this.updatingTools());
          updating.delete(tool.key);
          this.updatingTools.set(updating);
        },
      });
    });
  }

  /**
   * Checks if bulk update is complete and shows summary message.
   */
  private checkBulkUpdateCompletion(
    completed: number,
    total: number,
    successCount: number,
    errorCount: number,
    actionPast: string,
  ): void {
    if (completed === total) {
      // Clear selection after bulk operation
      this.clearSelection();

      if (errorCount === 0) {
        this.messageService.add({
          severity: 'success',
          summary: 'Bulk Update Complete',
          detail: `Successfully ${actionPast} ${successCount} tool(s).`,
        });
      } else if (successCount === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Bulk Update Failed',
          detail: `Failed to update ${errorCount} tool(s). Please try again.`,
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Bulk Update Partial',
          detail: `${successCount} tool(s) ${actionPast}, ${errorCount} failed. Check individual tools.`,
        });
      }
    }
  }

  /**
   * Shows detailed information for a tool in a modal.
   */
  showToolDetails(tool: Tool): void {
    this.selectedToolForDetails.set(tool);
    this.showDetailsModal.set(true);
  }

  /**
   * Opens tool configuration (placeholder for future enhancement).
   */
  configureTool(tool: Tool): void {
    // TODO: Implement tool configuration (future story)
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: `Configuration for "${tool.name}" will be available in a future update.`,
    });
  }

  /**
   * Clears all search and filter criteria.
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
  }
}
