import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { FormTheme } from '@nodeangularfullstack/shared';

/**
 * Interface for theme export data
 */
interface ThemeExport {
  exportVersion: string;
  exportDate: string;
  themes: Array<{
    name: string;
    themeDefinition: any;
    metadata?: {
      description?: string;
      category?: string;
    };
  }>;
}

/**
 * Theme export dialog component for exporting selected themes as JSON
 */
@Component({
  selector: 'app-theme-export-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  template: `
    <p-dialog
      header="Export Themes"
      [modal]="true"
      [visible]="visible"
      (onHide)="onHide()"
      [style]="{ width: '500px' }"
    >
      <div class="mb-4">
        <p>Export {{ themes.length }} selected theme(s) as JSON file:</p>
        <ul class="list-none p-0 mt-3">
          <li *ngFor="let theme of themes" class="flex align-items-center gap-2 py-1">
            <div
              class="w-1rem h-1rem border-round"
              [style.background]="getThemePreviewColor(theme)"
            ></div>
            {{ theme.name }}
            <p-tag
              [value]="isCustomTheme(theme) ? 'Custom' : 'Predefined'"
              [severity]="isCustomTheme(theme) ? 'info' : 'success'"
              class="ml-auto"
            ></p-tag>
          </li>
        </ul>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancel"
          icon="pi pi-times"
          [outlined]="true"
          (onClick)="onCancel()"
          [disabled]="exporting()"
        ></p-button>
        <p-button
          label="Export"
          icon="pi pi-download"
          (onClick)="onExport()"
          [loading]="exporting()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      .w-1rem {
        width: 1rem;
        height: 1rem;
        border: 1px solid var(--surface-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
    `,
  ],
})
export class ThemeExportDialogComponent {
  @Input() visible = false;
  @Input() themes: FormTheme[] = [];
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() export = new EventEmitter<void>();

  exporting = signal(false);

  /**
   * Gets theme preview color for visual identification
   */
  getThemePreviewColor(theme: FormTheme): string {
    return theme.themeDefinition?.primaryColor || '#1976d2';
  }

  /**
   * Determines if theme is custom (vs predefined)
   */
  isCustomTheme(theme: FormTheme): boolean {
    const predefinedNames = [
      'Default',
      'Corporate Blue',
      'Emerald Green',
      'Sunset Orange',
      'Scarlet Red',
    ];
    return !predefinedNames.includes(theme.name);
  }

  /**
   * Handles dialog hide event
   */
  onHide(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Handles cancel button
   */
  onCancel(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Handles export button
   */
  onExport(): void {
    this.exporting.set(true);

    // Create export data
    const exportData: ThemeExport = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      themes: this.themes.map((theme) => ({
        name: theme.name,
        themeDefinition: theme.themeDefinition,
        metadata: {
          description: theme.description,
          category: this.isCustomTheme(theme) ? 'Custom' : 'Predefined',
        },
      })),
    };

    // Download file
    setTimeout(() => {
      this.downloadThemeExport(exportData);
      this.exporting.set(false);
      this.export.emit();
      this.visibleChange.emit(false);
    }, 1000);
  }

  /**
   * Downloads theme export as JSON file
   */
  private downloadThemeExport(exportData: ThemeExport): void {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `themes-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
