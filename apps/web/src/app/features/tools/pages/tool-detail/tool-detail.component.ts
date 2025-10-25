import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Card } from 'primeng/card';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Button } from 'primeng/button';
import { Chip } from 'primeng/chip';
import { Tag } from 'primeng/tag';
import { Skeleton } from 'primeng/skeleton';
import { Message } from 'primeng/message';
import { Toast } from 'primeng/toast';
import { Divider } from 'primeng/divider';
import { Tooltip } from 'primeng/tooltip';
import { ToolRegistryService } from '@core/services/tool-registry.service';
import { AuthService } from '@core/auth/auth.service';
import { ToolRegistryRecord } from '@nodeangularfullstack/shared';
import { ExportProgressModalComponent } from '../../components/export-progress-modal/export-progress-modal.component';
import { ExportJob } from '../../services/export-job.service';

/**
 * Tool Detail Component (Epic 32.2.2)
 *
 * Displays comprehensive tool information with tabbed interface:
 * - Overview: Tool metadata, description, status
 * - Config: Tool configuration JSON
 * - Manifest: Tool manifest JSON with syntax highlighting
 * - Analytics: Placeholder for future analytics
 *
 * Features:
 * - Copy toolId to clipboard
 * - Color-coded permission chips
 * - Export button with permission checks (Epic 32.2.3)
 * - Breadcrumb navigation
 *
 * @example
 * ```typescript
 * // Route configuration
 * {
 *   path: 'tools/:toolId',
 *   component: ToolDetailComponent,
 *   canActivate: [toolIdGuard]
 * }
 * ```
 */
@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Button,
    Chip,
    Tag,
    Skeleton,
    Message,
    Toast,
    Divider,
    Tooltip,
    ExportProgressModalComponent,
  ],
  providers: [MessageService],
  templateUrl: './tool-detail.component.html',
  styleUrl: './tool-detail.component.scss',
})
export class ToolDetailComponent implements OnInit {
  private readonly toolRegistryService = inject(ToolRegistryService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  // Component state signals
  readonly tool = signal<ToolRegistryRecord | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly activeTabIndex = signal<string>('0');
  readonly showExportModal = signal<boolean>(false);

  // Computed signals
  readonly canExport = computed(() => {
    const currentUser = this.authService.user();
    if (!currentUser) return false;

    // Admin users can always export
    if (currentUser.role === 'admin') return true;

    // Check for explicit 'export' permission (if permissions exist in user object)
    // TODO: Verify permissions structure in User type
    return (currentUser as any).permissions?.includes('export') ?? false;
  });

  readonly exportButtonTooltip = computed(() => {
    return this.canExport()
      ? 'Export this tool as a standalone package'
      : "You don't have permission to export this tool";
  });

  readonly statusSeverity = computed(() => {
    const toolData = this.tool();
    if (!toolData) return 'secondary';

    switch (toolData.status) {
      case 'active':
        return 'success';
      case 'beta':
        return 'warning';
      case 'deprecated':
        return 'secondary';
      default:
        return 'secondary';
    }
  });

  readonly permissionChips = computed(() => {
    const toolData = this.tool();
    if (!toolData?.permissions || toolData.permissions.length === 0) {
      return [];
    }

    return toolData.permissions.map((permission) => ({
      label: permission,
      severity: this.getPermissionSeverity(permission),
    }));
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const toolId = params.get('toolId');
      if (toolId) {
        this.loadTool(toolId);
      } else {
        this.error.set('Invalid tool URL');
        this.loading.set(false);
      }
    });
  }

  /**
   * Loads tool data from the registry.
   */
  private loadTool(toolId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.toolRegistryService.getToolById(toolId).subscribe({
      next: (tool) => {
        this.tool.set(tool);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tool:', err);
        this.error.set('Failed to load tool. Please try again.');
        this.loading.set(false);

        // Redirect to 404 if tool not found
        if (err.status === 404) {
          setTimeout(() => {
            this.router.navigate(['/404']);
          }, 2000);
        }
      },
    });
  }

  /**
   * Copies tool ID to clipboard.
   */
  copyToolId(): void {
    const toolData = this.tool();
    if (!toolData) return;

    navigator.clipboard.writeText(toolData.tool_id).then(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied!',
          detail: 'Tool ID copied to clipboard',
          life: 3000,
        });
      },
      (err) => {
        console.error('Failed to copy:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy Tool ID',
          life: 3000,
        });
      },
    );
  }

  /**
   * Opens export modal (Epic 32.2.4 implementation).
   */
  openExportModal(): void {
    if (!this.canExport()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Permission Denied',
        detail: "You don't have permission to export this tool",
        life: 5000,
      });
      return;
    }

    this.showExportModal.set(true);
  }

  /**
   * Handles export completion event.
   */
  onExportCompleted(job: ExportJob): void {
    console.log('[ToolDetailComponent] Export completed:', job.jobId);
    this.messageService.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: `Tool "${this.tool()?.name}" exported successfully`,
      life: 5000,
    });
  }

  /**
   * Handles export failure event.
   */
  onExportFailed(error: string): void {
    console.error('[ToolDetailComponent] Export failed:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: error || 'Failed to export tool. Please try again.',
      life: 5000,
    });
  }

  /**
   * Navigates back to tools list.
   */
  navigateToToolsList(): void {
    this.router.navigate(['/app/tools']);
  }

  /**
   * Gets the severity color for permission chips.
   */
  private getPermissionSeverity(permission: string): 'success' | 'info' | 'warn' | 'danger' {
    if (permission.startsWith('read')) return 'info';
    if (permission.startsWith('write') || permission.startsWith('create')) return 'warn';
    if (permission.startsWith('delete') || permission.startsWith('admin')) return 'danger';
    return 'success';
  }

  /**
   * Formats JSON for display with syntax highlighting.
   */
  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}
