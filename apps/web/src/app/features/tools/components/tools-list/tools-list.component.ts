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
 * Tools list component that displays all available tools.
 * Provides navigation to individual tools via their slugs.
 */
@Component({
  selector: 'app-tools-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, ButtonModule, SkeletonModule, MessageModule],
  template: `
    <div class="tools-list-container">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Available Tools</h1>
        <p class="text-gray-600">
          Select a tool below to start using it. All tools are subject to availability.
        </p>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (skeleton of skeletonItems; track skeleton) {
            <p-card>
              <p-skeleton height="2rem" styleClass="mb-2"></p-skeleton>
              <p-skeleton height="4rem" styleClass="mb-4"></p-skeleton>
              <p-skeleton height="2.5rem" width="30%"></p-skeleton>
            </p-card>
          }
        </div>
      } @else if (error()) {
        <p-message
          severity="error"
          text="Failed to load tools. Please try again later."
          [closable]="false"
        ></p-message>
      } @else if (tools().length === 0) {
        <p-message
          severity="info"
          text="No tools are currently available."
          [closable]="false"
        ></p-message>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (tool of tools(); track tool.id) {
            <p-card>
              <ng-template pTemplate="header">
                <div class="p-4 border-b">
                  <h3 class="text-xl font-semibold text-gray-900">{{ tool.name }}</h3>
                </div>
              </ng-template>

              <div class="p-4">
                <p class="text-gray-600 mb-4">{{ tool.description }}</p>

                <div class="flex justify-between items-center">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class]="
                      tool.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    "
                  >
                    {{ tool.active ? 'Available' : 'Unavailable' }}
                  </span>

                  <p-button
                    [routerLink]="['/app/tools', tool.slug]"
                    label="Open Tool"
                    icon="pi pi-external-link"
                    size="small"
                    [disabled]="!tool.active"
                  ></p-button>
                </div>
              </div>
            </p-card>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .tools-list-container {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      :host ::ng-deep .p-card {
        height: 100%;
        transition:
          transform 0.2s ease-in-out,
          box-shadow 0.2s ease-in-out;
      }

      :host ::ng-deep .p-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      :host ::ng-deep .p-card .p-card-body {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      :host ::ng-deep .p-card .p-card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
    `,
  ],
})
export class ToolsListComponent implements OnInit {
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
   * Loads all available tools from the service.
   */
  private async loadTools(): Promise<void> {
    try {
      this.loading.set(true);
      this.error.set(null);

      const tools = await this.toolsService.refreshAllTools().toPromise();

      if (tools) {
        // Filter to only show active tools in the list
        this.tools.set(tools.filter((tool) => tool.active));
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.error.set('Failed to load tools. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }
}
