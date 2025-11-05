import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { ToolsService } from '../../../../core/services';
import { Tool } from '@nodeangularfullstack/shared';

/**
 * Dashboard tools container component.
 * Displays available tools in a grid layout similar to Quick Actions.
 */
@Component({
  selector: 'app-dashboard-tools-container',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, SkeletonModule, MessageModule],
  template: `
    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (skeleton of skeletonItems; track skeleton) {
          <div class="tool-card">
            <p-skeleton height="1.5rem" styleClass="mb-2"></p-skeleton>
            <p-skeleton height="3rem" styleClass="mb-3"></p-skeleton>
            <p-skeleton height="2rem" width="60%"></p-skeleton>
          </div>
        }
      </div>
    } @else if (error()) {
      <p-message
        severity="warn"
        text="Unable to load tools at the moment."
        [closable]="false"
      ></p-message>
    } @else if (tools().length === 0) {
      <div class="text-center py-8 text-gray-500">
        <i class="pi pi-wrench text-3xl mb-3 block"></i>
        <p>No tools are currently available.</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (tool of tools(); track tool.id) {
          <div class="tool-card group cursor-pointer" [routerLink]="['/app/tools', tool.slug]">
            <div class="tool-header">
              <div class="tool-icon-wrapper">
                <i [class]="getToolIcon(tool.key)" class="tool-icon"></i>
              </div>
              <div class="tool-status">
                <span
                  class="status-badge"
                  [class]="tool.active ? 'status-badge-active' : 'status-badge-inactive'"
                >
                  {{ tool.active ? 'Available' : 'Unavailable' }}
                </span>
              </div>
            </div>
            <div class="tool-content">
              <h4 class="tool-title">{{ tool.name }}</h4>
              <p class="tool-description">{{ tool.description }}</p>
            </div>
            <div class="tool-footer">
              <span class="tool-action-text">
                <i class="pi pi-arrow-right text-xs mr-1"></i>
                Open Tool
              </span>
            </div>
          </div>
        }
      </div>

      @if (tools().length > 6) {
        <div class="text-center mt-6">
          <p-button
            label="View All Tools"
            icon="pi pi-external-link"
            severity="secondary"
            size="small"
            [routerLink]="['/app/tools']"
          ></p-button>
        </div>
      }
    }
  `,
  styles: [
    `
      .tool-card {
        @apply bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-300;
      }

      .tool-card:hover {
        transform: translateY(-1px);
      }

      .tool-header {
        @apply flex items-start justify-between mb-3;
      }

      .tool-icon-wrapper {
        @apply w-10 h-10 rounded-lg flex items-center justify-center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .tool-icon {
        @apply text-white text-lg;
      }

      .tool-status {
        @apply flex-shrink-0;
      }

      .status-badge {
        @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium;
      }

      .status-badge-active {
        @apply bg-green-100 text-green-800;
      }

      .status-badge-inactive {
        @apply bg-gray-100 text-gray-600;
      }

      .tool-content {
        @apply mb-4;
      }

      .tool-title {
        @apply text-lg font-semibold text-gray-900 mb-1;
      }

      .tool-description {
        @apply text-sm text-gray-600 line-clamp-2;
      }

      .tool-footer {
        @apply flex items-center justify-between;
      }

      .tool-action-text {
        @apply text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors duration-200;
      }

      /* Line clamp utility */
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `,
  ],
})
export class ToolsContainerComponent implements OnInit {
  private readonly toolsService = inject(ToolsService);

  // Component state
  readonly tools = signal<Tool[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Skeleton items for loading state
  readonly skeletonItems = Array(6).fill(0);

  ngOnInit(): void {
    this.loadTools();
  }

  /**
   * Loads available tools from the service.
   * Only shows first 6 tools on dashboard for clean layout.
   */
  private async loadTools(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Try to use cached data first
      const cachedTools = this.toolsService.getCachedTools();
      if (cachedTools.length > 0 && this.toolsService.hasFreshCache()) {
        this.tools.set(
          cachedTools.filter((tool) => tool.active).slice(0, 6), // Limit to 6 tools for dashboard
        );
        this.loading.set(false);
        return;
      }

      // Fetch fresh data if no cache
      const tools = await this.toolsService.refreshAllTools().toPromise();

      if (tools) {
        this.tools.set(
          tools.filter((tool) => tool.active).slice(0, 6), // Limit to 6 tools for dashboard
        );
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.error.set('Unable to load tools');

      // Try to use any cached data as fallback
      const cachedTools = this.toolsService.getCachedTools();
      if (cachedTools.length > 0) {
        this.tools.set(cachedTools.filter((tool) => tool.active).slice(0, 6));
      }
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Gets the appropriate icon for a tool based on its key.
   */
  getToolIcon(toolKey: string): string {
    const iconMap: Record<string, string> = {
      'short-link': 'pi pi-link',
      'qr-generator': 'pi pi-qrcode',
      analytics: 'pi pi-chart-line',
      'file-converter': 'pi pi-file-export',
      'text-editor': 'pi pi-file-edit',
      'image-tools': 'pi pi-image',
      'url-checker': 'pi pi-search',
      'password-generator': 'pi pi-shield',
    };

    return iconMap[toolKey] || 'pi pi-wrench';
  }
}
