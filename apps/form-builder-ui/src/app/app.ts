import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
// REMOVED: ToolsService not needed in form-builder-ui (tools management is in dashboard-api)
// import { ToolsService } from './core/services/tools.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class App {
  readonly title = signal('web');
  currentUrl = '';

  // REMOVED: ToolsService not needed - form-builder-ui only handles forms
  // private readonly toolsService = inject(ToolsService);
  private readonly router = inject(Router);

  constructor() {
    this.currentUrl = this.router.url;
  }

  // REMOVED: Tools cache initialization - not needed in form-builder-ui
  // The form-builder-ui is focused on form building, not tools management
  // Tools API (/api/v1/tools) is served by dashboard-api for the main dashboard app
}
