import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ToolsService } from './core/services/tools.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class App implements OnInit {
  readonly title = signal('web');
  currentUrl = '';

  private readonly toolsService = inject(ToolsService);
  private readonly router = inject(Router);

  constructor() {
    this.currentUrl = this.router.url;
  }

  ngOnInit(): void {
    // Initialize tools cache on app start for optimal performance
    this.initializeToolsCache();
  }

  /**
   * Preloads tool status data to enable immediate responses from directives and guards.
   * Runs silently in the background to avoid blocking app initialization.
   */
  private initializeToolsCache(): void {
    // Fire and forget - let it load in background
    this.toolsService.refreshAllTools().subscribe({
      next: (tools) => {
        // eslint-disable-next-line no-console
        console.debug(`ToolsService: Preloaded ${tools.length} tools during app initialization`);
      },
      error: (error) => {
        // eslint-disable-next-line no-console
        console.warn('ToolsService: Failed to preload tools during app initialization:', error);
        // Not critical - tools will be fetched on-demand
      },
    });
  }
}
