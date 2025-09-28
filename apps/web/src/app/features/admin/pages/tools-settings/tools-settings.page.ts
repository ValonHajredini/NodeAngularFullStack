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
import { StatsCardComponent, ToolCardComponent } from '../../../../shared/components';

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
    StatsCardComponent,
    ToolCardComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tools-settings.page.html',
  styleUrl: './tools-settings.page.scss',
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

  // Filters expansion state
  filtersExpanded = signal(false);

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
   * Toggles the filters section expansion state.
   */
  toggleFiltersExpanded(): void {
    this.filtersExpanded.set(!this.filtersExpanded());
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
  trackByTool(_index: number, tool: Tool): string {
    return tool.key;
  }

  /**
   * Checks if a tool is selected.
   */
  isToolSelected(toolKey: string): boolean {
    return this.selectedToolsKeys().has(toolKey);
  }

  /**
   * Gets count of active selected tools.
   */
  getActiveSelectedCount(): number {
    return this.selectedTools().filter((tool) => tool.active).length;
  }

  /**
   * Gets count of inactive selected tools.
   */
  getInactiveSelectedCount(): number {
    return this.selectedTools().filter((tool) => !tool.active).length;
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

  /**
   * Handles status filter toggle button changes.
   */
  onStatusFilterChange(filter: 'all' | 'active' | 'inactive', event: any): void {
    if (event.checked) {
      this.statusFilter.set(filter);
    } else {
      // If unchecking, default to 'all'
      this.statusFilter.set('all');
    }
  }
}
