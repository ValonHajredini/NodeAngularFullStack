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
import { ToolConfigService } from '../../../../core/services/tool-config.service';
import {
  ToolConfig,
  DisplayMode,
  CreateToolConfigRequest,
  UpdateToolConfigRequest,
  ComponentExistenceCheck,
} from '@nodeangularfullstack/shared';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Tools Settings page component for super admin tools management.
 * Provides interface for enabling/disabling system-wide tools and managing configurations.
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
    SelectButtonModule,
    DividerModule,
    TooltipModule,
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
  protected readonly toolConfigService = inject(ToolConfigService);
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

  // Delete modal state
  showDeleteModal = signal(false);
  selectedToolForDelete = signal<Tool | null>(null);
  deleteConfirmationText = signal('');
  private readonly deletingTool = signal(false);

  // Filters expansion state
  filtersExpanded = signal(false);

  // Configuration modal state
  showConfigModal = signal(false);
  selectedToolForConfig = signal<Tool | null>(null);
  toolConfigs = signal<ToolConfig[]>([]);
  activeConfig = signal<ToolConfig | null>(null);
  configFormData = signal<CreateToolConfigRequest>({
    version: '1.0.0',
    displayMode: 'standard',
    layoutSettings: {
      maxWidth: '1200px',
      padding: '2rem',
    },
    isActive: false,
  });
  editingConfig = signal<ToolConfig | null>(null);
  savingConfig = signal(false);

  // Component existence dialog state
  showComponentExistsDialog = signal(false);
  componentExistenceData = signal<ComponentExistenceCheck | null>(null);
  processingComponentDecision = signal(false);
  pendingToolData: any = null;

  // Display mode options
  displayModeOptions = [
    { label: 'Standard', value: 'standard', icon: 'pi pi-window-maximize' },
    { label: 'Full Width', value: 'full-width', icon: 'pi pi-arrows-h' },
    { label: 'Compact', value: 'compact', icon: 'pi pi-window-minimize' },
    { label: 'Modal', value: 'modal', icon: 'pi pi-external-link' },
    { label: 'Embedded', value: 'embedded', icon: 'pi pi-box' },
  ];

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
   * Handles component decision from the existence dialog.
   * @param decision - User's choice: 'reuse', 'overwrite', or 'cancel'
   */
  handleComponentDecision(decision: 'reuse' | 'overwrite' | 'cancel'): void {
    if (decision === 'cancel') {
      this.showComponentExistsDialog.set(false);
      this.componentExistenceData.set(null);
      this.pendingToolData = null;
      return;
    }

    // Store the decision and proceed with tool creation
    const componentOptions = {
      reuseExisting: decision === 'reuse',
      overwrite: decision === 'overwrite',
    };

    this.showComponentExistsDialog.set(false);

    // Navigate to create tool wizard with component options in state
    this.router.navigate(['/app/admin/tools/create'], {
      state: {
        componentOptions,
        existingComponentData: this.componentExistenceData(),
      },
    });

    // Reset state
    this.componentExistenceData.set(null);
    this.pendingToolData = null;
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
   * Opens tool configuration modal.
   */
  configureTool(tool: Tool): void {
    this.selectedToolForConfig.set(tool);
    this.editingConfig.set(null);
    this.loadToolConfigs(tool.key);
    this.showConfigModal.set(true);
  }

  /**
   * Loads configurations for a tool.
   */
  private loadToolConfigs(toolKey: string): void {
    this.toolConfigService.getToolConfigs(toolKey).subscribe({
      next: (response) => {
        this.toolConfigs.set(response.data.configs);
        this.activeConfig.set(response.data.activeConfig);

        // Initialize form with active config or defaults
        if (response.data.activeConfig) {
          const nextVersion = this.getNextVersion(response.data.activeConfig.version);
          this.configFormData.set({
            version: nextVersion,
            displayMode: response.data.activeConfig.displayMode,
            layoutSettings: { ...response.data.activeConfig.layoutSettings },
            isActive: false,
          });
        } else {
          this.resetConfigForm();
        }
      },
      error: (error) => {
        console.error('Failed to load tool configs:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load tool configurations. Please try again.',
        });
      },
    });
  }

  /**
   * Gets the next semantic version number.
   */
  private getNextVersion(currentVersion: string): string {
    const parts = currentVersion.split('.').map(Number);
    parts[2]++; // Increment patch version
    return parts.join('.');
  }

  /**
   * Resets the configuration form to defaults.
   */
  private resetConfigForm(): void {
    const defaultFormData = {
      version: '1.0.0',
      displayMode: 'standard' as const,
      layoutSettings: {
        maxWidth: '1200px',
        padding: '2rem',
      },
      isActive: false,
    };
    console.log('[ToolsSettingsPage] Resetting config form to:', defaultFormData);
    this.configFormData.set(defaultFormData);
  }

  /**
   * Closes the configuration modal.
   */
  closeConfigModal(): void {
    this.showConfigModal.set(false);
    this.selectedToolForConfig.set(null);
    this.editingConfig.set(null);
    this.toolConfigs.set([]);
    this.activeConfig.set(null);
    this.resetConfigForm();
  }

  /**
   * Saves a new or updated configuration.
   */
  saveConfiguration(): void {
    const tool = this.selectedToolForConfig();
    if (!tool) {
      console.error('[ToolsSettingsPage] No tool selected for config');
      return;
    }

    const formData = this.configFormData();
    const editingConfig = this.editingConfig();

    console.log('[ToolsSettingsPage] Saving configuration:', {
      tool: tool.key,
      formData,
      editing: !!editingConfig,
    });

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(formData.version)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Version',
        detail: 'Version must be in format X.Y.Z (e.g., 1.0.0)',
      });
      return;
    }

    // Ensure layoutSettings has default values if empty
    const requestData: CreateToolConfigRequest = {
      version: formData.version,
      displayMode: formData.displayMode,
      layoutSettings:
        formData.layoutSettings && Object.keys(formData.layoutSettings).length > 0
          ? formData.layoutSettings
          : { maxWidth: '1200px', padding: '2rem' },
      isActive: formData.isActive ?? false,
    };

    console.log('[ToolsSettingsPage] Request payload:', requestData);

    this.savingConfig.set(true);

    if (editingConfig) {
      // Update existing config
      const updateRequest: UpdateToolConfigRequest = {
        version: formData.version !== editingConfig.version ? formData.version : undefined,
        displayMode:
          formData.displayMode !== editingConfig.displayMode ? formData.displayMode : undefined,
        layoutSettings: formData.layoutSettings,
        isActive: formData.isActive,
      };

      this.toolConfigService.updateConfig(tool.key, editingConfig.id, updateRequest).subscribe({
        next: () => {
          this.savingConfig.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Configuration Updated',
            detail: `Configuration for "${tool.name}" has been updated successfully.`,
          });
          this.loadToolConfigs(tool.key);
          this.editingConfig.set(null);
          this.resetConfigForm();
        },
        error: (error) => {
          this.savingConfig.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Update Failed',
            detail: error.message || 'Failed to update configuration. Please try again.',
          });
        },
      });
    } else {
      // Create new config
      this.toolConfigService.createConfig(tool.key, requestData).subscribe({
        next: () => {
          this.savingConfig.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Configuration Created',
            detail: `New configuration for "${tool.name}" has been created successfully.`,
          });
          this.loadToolConfigs(tool.key);
          this.resetConfigForm();
        },
        error: (error) => {
          this.savingConfig.set(false);
          console.error('[ToolsSettingsPage] Failed to create config:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Creation Failed',
            detail: error.message || 'Failed to create configuration. Please try again.',
          });
        },
      });
    }
  }

  /**
   * Activates a configuration.
   */
  activateConfiguration(config: ToolConfig): void {
    const tool = this.selectedToolForConfig();
    if (!tool) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to activate version ${config.version}? This will deactivate the current active configuration.`,
      header: 'Activate Configuration',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.toolConfigService.activateConfig(tool.key, config.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Configuration Activated',
              detail: `Version ${config.version} is now active for "${tool.name}".`,
            });
            this.loadToolConfigs(tool.key);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Activation Failed',
              detail: error.message || 'Failed to activate configuration. Please try again.',
            });
          },
        });
      },
    });
  }

  /**
   * Edits an existing configuration.
   */
  editConfiguration(config: ToolConfig): void {
    this.editingConfig.set(config);
    this.configFormData.set({
      version: config.version,
      displayMode: config.displayMode,
      layoutSettings: { ...config.layoutSettings },
      isActive: config.isActive,
    });
  }

  /**
   * Cancels editing a configuration.
   */
  cancelEditConfiguration(): void {
    this.editingConfig.set(null);
    this.resetConfigForm();
  }

  /**
   * Deletes a configuration.
   */
  deleteConfiguration(config: ToolConfig): void {
    const tool = this.selectedToolForConfig();
    if (!tool) return;

    if (config.isActive) {
      this.messageService.add({
        severity: 'error',
        summary: 'Cannot Delete',
        detail: 'Cannot delete the active configuration. Activate another configuration first.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete version ${config.version}? This action cannot be undone.`,
      header: 'Delete Configuration',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.toolConfigService.deleteConfig(tool.key, config.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Configuration Deleted',
              detail: `Version ${config.version} has been deleted successfully.`,
            });
            this.loadToolConfigs(tool.key);
          },
          error: (error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Deletion Failed',
              detail: error.message || 'Failed to delete configuration. Please try again.',
            });
          },
        });
      },
    });
  }

  /**
   * Gets display mode label.
   */
  getDisplayModeLabel(mode: DisplayMode): string {
    const option = this.displayModeOptions.find((o) => o.value === mode);
    return option?.label || mode;
  }

  /**
   * Gets display mode icon.
   */
  getDisplayModeIcon(mode: DisplayMode): string {
    const option = this.displayModeOptions.find((o) => o.value === mode);
    return option?.icon || 'pi pi-cog';
  }

  /**
   * Updates layout setting in form.
   */
  updateLayoutSetting(key: string, value: any): void {
    const currentSettings = this.configFormData().layoutSettings || {};
    const updatedSettings = { ...currentSettings, [key]: value };
    this.configFormData.update((data) => ({
      ...data,
      layoutSettings: updatedSettings,
    }));
  }

  /**
   * Updates the version field in config form.
   */
  updateConfigVersion(version: string): void {
    this.configFormData.update((data) => ({ ...data, version }));
  }

  /**
   * Updates the display mode field in config form.
   */
  updateConfigDisplayMode(displayMode: any): void {
    this.configFormData.update((data) => ({ ...data, displayMode }));
  }

  /**
   * Updates the isActive field in config form.
   */
  updateConfigIsActive(isActive: boolean): void {
    this.configFormData.update((data) => ({ ...data, isActive }));
  }

  /**
   * Shows delete confirmation modal for a tool.
   */
  showDeleteConfirmation(tool: Tool): void {
    this.selectedToolForDelete.set(tool);
    this.deleteConfirmationText.set('');
    this.showDeleteModal.set(true);
  }

  /**
   * Cancels the delete operation and closes the modal.
   */
  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.selectedToolForDelete.set(null);
    this.deleteConfirmationText.set('');
  }

  /**
   * Confirms and executes the tool deletion.
   */
  confirmDeleteTool(): void {
    const tool = this.selectedToolForDelete();
    if (!tool || this.deleteConfirmationText() !== tool.name) {
      return;
    }

    this.deletingTool.set(true);

    this.toolsService.deleteTool(tool.key).subscribe({
      next: () => {
        this.deletingTool.set(false);
        this.showDeleteModal.set(false);
        this.selectedToolForDelete.set(null);
        this.deleteConfirmationText.set('');

        this.messageService.add({
          severity: 'success',
          summary: 'Tool Deleted',
          detail: `"${tool.name}" has been permanently deleted from the system.`,
        });
      },
      error: (error) => {
        this.deletingTool.set(false);

        console.error('Failed to delete tool:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: `Failed to delete "${tool.name}". Please try again.`,
        });
      },
    });
  }

  /**
   * Checks if a tool is currently being deleted.
   */
  isDeletingTool(): boolean {
    return this.deletingTool();
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
