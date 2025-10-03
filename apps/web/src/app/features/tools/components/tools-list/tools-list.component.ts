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
  templateUrl: './tools-list.component.html',
  styleUrls: ['./tools-list.component.css'],
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
