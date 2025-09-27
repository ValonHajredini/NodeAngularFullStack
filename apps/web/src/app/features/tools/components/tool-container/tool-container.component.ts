import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { ToolsService } from '../../../../core/services';
import { Tool } from '@nodeangularfullstack/shared';
import { ShortLinkComponent } from '../short-link/short-link.component';

/**
 * Tool container component that dynamically loads tools based on slug.
 * Serves as a wrapper for individual tool components.
 */
@Component({
  selector: 'app-tool-container',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    SkeletonModule,
    MessageModule,
    BreadcrumbModule,
    ShortLinkComponent,
  ],
  template: `
    <div class="tool-container">
      <div class="mb-6">
        <p-breadcrumb [model]="breadcrumbItems()" [home]="homeItem"></p-breadcrumb>
      </div>

      @if (loading()) {
        <p-card>
          <ng-template pTemplate="header">
            <p-skeleton height="2rem" styleClass="m-4"></p-skeleton>
          </ng-template>
          <p-skeleton height="10rem" styleClass="mb-4"></p-skeleton>
          <p-skeleton height="2.5rem" width="30%"></p-skeleton>
        </p-card>
      } @else if (error()) {
        <p-message severity="error" [text]="error() || ''" [closable]="false"></p-message>
        <div class="mt-4">
          <p-button
            label="Back to Tools"
            icon="pi pi-arrow-left"
            (click)="navigateToTools()"
          ></p-button>
        </div>
      } @else if (tool()) {
        <div class="tool-header mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ tool()!.name }}</h1>
              <p class="text-gray-600">{{ tool()!.description }}</p>
            </div>
            <div class="flex gap-2">
              <p-button
                label="Back to Tools"
                icon="pi pi-arrow-left"
                severity="secondary"
                size="small"
                (click)="navigateToTools()"
              ></p-button>
            </div>
          </div>
        </div>

        <div class="tool-content">
          @switch (tool()!.key) {
            @case ('short-link') {
              <app-short-link></app-short-link>
            }
            @default {
              <p-card>
                <div class="text-center py-8">
                  <i class="pi pi-wrench text-4xl text-gray-400 mb-4"></i>
                  <h3 class="text-xl font-semibold text-gray-900 mb-2">Tool Implementation</h3>
                  <p class="text-gray-600 mb-4">
                    The {{ tool()!.name }} tool is available but not yet implemented.
                  </p>
                  <p class="text-sm text-gray-500">
                    Tool Key: {{ tool()!.key }} | Slug: {{ tool()!.slug }}
                  </p>
                </div>
              </p-card>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tool-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .tool-header {
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 1.5rem;
      }

      :host ::ng-deep .p-breadcrumb {
        background: transparent;
        border: none;
        padding: 0;
      }

      :host ::ng-deep .p-breadcrumb ol {
        background: transparent;
        padding: 0.5rem 0;
      }
    `,
  ],
})
export class ToolContainerComponent implements OnInit {
  private readonly toolsService = inject(ToolsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Component state
  readonly tool = signal<Tool | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly breadcrumbItems = signal<MenuItem[]>([]);

  // Breadcrumb home item
  readonly homeItem: MenuItem = {
    icon: 'pi pi-home',
    routerLink: '/app/dashboard',
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.loadTool(slug);
      } else {
        this.error.set('Invalid tool URL');
        this.loading.set(false);
      }
    });
  }

  /**
   * Loads the tool by its slug.
   */
  private async loadTool(slug: string): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      // First check cached tools
      const cachedTools = this.toolsService.getCachedTools();
      let foundTool = cachedTools.find((t) => t.slug === slug);

      if (!foundTool || !this.toolsService.hasFreshCache()) {
        // Refresh tools if not in cache or cache is stale
        const tools = await this.toolsService.refreshAllTools().toPromise();
        foundTool = tools?.find((t) => t.slug === slug);
      }

      if (!foundTool) {
        this.error.set(`Tool not found: ${slug}`);
        return;
      }

      if (!foundTool.active) {
        this.error.set(`Tool "${foundTool.name}" is currently disabled`);
        return;
      }

      this.tool.set(foundTool);
      this.updateBreadcrumb(foundTool);
    } catch (error) {
      console.error('Failed to load tool:', error);
      this.error.set('Failed to load tool. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Updates the breadcrumb navigation.
   */
  private updateBreadcrumb(tool: Tool): void {
    this.breadcrumbItems.set([
      {
        label: 'Tools',
        routerLink: '/app/tools',
      },
      {
        label: tool.name,
      },
    ]);
  }

  /**
   * Navigates back to the tools list.
   */
  navigateToTools(): void {
    this.router.navigate(['/app/tools']);
  }
}
