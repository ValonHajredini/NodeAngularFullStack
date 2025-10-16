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
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { FormTheme } from '@nodeangularfullstack/shared';
import { ThemeDesignerService } from '../../services/theme-designer.service';
import { ThemePreviewService } from '../../../tools/components/form-builder/theme-preview.service';

/**
 * Interface for theme with usage statistics
 */
interface ThemeWithUsage extends FormTheme {
  formsCount: number;
  publishedFormsCount: number;
  lastUsed?: Date;
  isCustom: boolean;
}

/**
 * Interface for theme export/import
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
 * Theme Management page component for admin theme management.
 * Provides interface for viewing, exporting, importing, and managing themes.
 */
@Component({
  selector: 'app-theme-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    BadgeModule,
    TagModule,
    ToolbarModule,
    FileUploadModule,
    InputTextModule,
    Select,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './theme-management.component.html',
  styleUrls: ['./theme-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeManagementComponent implements OnInit {
  protected readonly themeDesignerService = inject(ThemeDesignerService);
  protected readonly themePreviewService = inject(ThemePreviewService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  // Loading states
  private readonly loading = signal<boolean>(true);
  private readonly deleting = signal<Set<string>>(new Set());

  // Theme data
  private readonly themesData = signal<ThemeWithUsage[]>([]);

  // Selection state
  readonly selectedThemes = signal<ThemeWithUsage[]>([]);

  // Dialog states
  showExportDialog = signal(false);
  showImportDialog = signal(false);
  showPreviewDialog = signal(false);
  previewTheme = signal<FormTheme | null>(null);

  // Export/Import state
  exportInProgress = signal(false);
  importInProgress = signal(false);
  importFiles = signal<File[]>([]);

  // Filter state
  searchQuery = signal('');
  typeFilter: 'all' | 'predefined' | 'custom' = 'all';

  // Computed properties
  readonly isLoading = this.loading.asReadonly();
  readonly themes = this.themesData.asReadonly();
  readonly selectedThemesList = this.selectedThemes.asReadonly();

  readonly filteredThemes = computed(() => {
    const themes = this.themesData();
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter;

    return themes.filter((theme) => {
      // Type filter
      const typeMatch =
        type === 'all' ||
        (type === 'predefined' && !theme.isCustom) ||
        (type === 'custom' && theme.isCustom);

      // Search filter
      const searchMatch =
        !query ||
        theme.name.toLowerCase().includes(query) ||
        (theme.description && theme.description.toLowerCase().includes(query));

      return typeMatch && searchMatch;
    });
  });

  readonly hasSelectedThemes = computed(() => this.selectedThemes().length > 0);
  readonly selectedCustomThemes = computed(() =>
    this.selectedThemes().filter((theme) => theme.isCustom),
  );
  readonly hasInUseThemes = computed(() =>
    this.selectedThemes().some((theme) => theme.formsCount > 0),
  );

  // Filter options
  typeFilterOptions = [
    { label: 'All Themes', value: 'all' },
    { label: 'Predefined', value: 'predefined' },
    { label: 'Custom', value: 'custom' },
  ];

  ngOnInit(): void {
    this.loadThemes();
  }

  /**
   * Loads themes with usage statistics from the API
   */
  private loadThemes(): void {
    this.loading.set(true);

    this.themeDesignerService.getThemes().subscribe({
      next: (themes) => {
        // Load usage data for each theme
        const usageRequests = themes.map((theme) =>
          this.themeDesignerService.getThemeUsage(theme.id).pipe(
            map((usage) => ({ theme, usage })),
            catchError(() =>
              of({
                theme,
                usage: {
                  formsCount: 0,
                  publishedFormsCount: 0,
                  lastUsed: undefined,
                  formsList: [],
                },
              }),
            ),
          ),
        );

        // Combine theme data with usage statistics
        Promise.all(usageRequests.map((req) => req.toPromise()))
          .then((results) => {
            const themesWithUsage: ThemeWithUsage[] = results
              .map((result) => {
                if (!result) return null;
                return {
                  ...result.theme,
                  formsCount: result.usage.formsCount,
                  publishedFormsCount: result.usage.publishedFormsCount,
                  lastUsed: result.usage.lastUsed,
                  isCustom: !this.isPredefinedTheme(result.theme.name),
                };
              })
              .filter(Boolean) as ThemeWithUsage[];

            this.themesData.set(themesWithUsage);
            this.loading.set(false);
          })
          .catch((error) => {
            console.error('Failed to load theme usage data:', error);
            // Fallback: load themes without usage data
            const themesWithUsage: ThemeWithUsage[] = themes.map((theme) => ({
              ...theme,
              formsCount: 0,
              publishedFormsCount: 0,
              lastUsed: undefined,
              isCustom: !this.isPredefinedTheme(theme.name),
            }));

            this.themesData.set(themesWithUsage);
            this.loading.set(false);
          });
      },
      error: (error) => {
        console.error('Failed to load themes:', error);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load themes. Please try again.',
        });
      },
    });
  }

  /**
   * Determines if a theme is predefined based on name patterns
   */
  private isPredefinedTheme(themeName: string): boolean {
    const predefinedNames = [
      'Default',
      'Corporate Blue',
      'Emerald Green',
      'Sunset Orange',
      'Scarlet Red',
    ];
    return predefinedNames.includes(themeName);
  }

  /**
   * Refreshes the themes list
   */
  refreshThemes(): void {
    this.selectedThemes.set([]);
    this.loadThemes();
  }

  /**
   * Shows theme preview in dialog
   */
  previewTheme_handler(theme: ThemeWithUsage): void {
    this.previewTheme.set(theme);
    this.showPreviewDialog.set(true);

    // Apply theme for preview
    this.themePreviewService.applyThemeCss(theme);
  }

  /**
   * Closes preview dialog and clears theme
   */
  closePreviewDialog(): void {
    this.showPreviewDialog.set(false);
    this.previewTheme.set(null);

    // Clear theme preview
    this.themePreviewService.clearThemeCss();
  }

  /**
   * Navigates to theme editor for custom themes
   */
  editTheme(theme: ThemeWithUsage): void {
    if (!theme.isCustom) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Edit',
        detail: 'Predefined themes cannot be edited. Create a custom theme instead.',
      });
      return;
    }

    this.router.navigate(['/app/admin/themes/designer'], {
      queryParams: { editId: theme.id },
    });
  }

  /**
   * Exports a single theme
   */
  exportTheme(theme: ThemeWithUsage): void {
    const exportData: ThemeExport = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      themes: [
        {
          name: theme.name,
          themeDefinition: theme.themeDefinition,
          metadata: {
            description: theme.description,
            category: theme.isCustom ? 'Custom' : 'Predefined',
          },
        },
      ],
    };

    this.downloadThemeExport(
      exportData,
      `theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`,
    );
  }

  /**
   * Shows export dialog for selected themes
   */
  showExportSelectedDialog(): void {
    if (this.selectedThemes().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Selection',
        detail: 'Please select themes to export.',
      });
      return;
    }

    this.showExportDialog.set(true);
  }

  /**
   * Exports selected themes
   */
  exportSelectedThemes(): void {
    const selected = this.selectedThemes();
    if (selected.length === 0) return;

    this.exportInProgress.set(true);

    const exportData: ThemeExport = {
      exportVersion: '1.0',
      exportDate: new Date().toISOString(),
      themes: selected.map((theme) => ({
        name: theme.name,
        themeDefinition: theme.themeDefinition,
        metadata: {
          description: theme.description,
          category: theme.isCustom ? 'Custom' : 'Predefined',
        },
      })),
    };

    setTimeout(() => {
      this.downloadThemeExport(
        exportData,
        `themes-export-${new Date().toISOString().split('T')[0]}.json`,
      );
      this.exportInProgress.set(false);
      this.showExportDialog.set(false);

      this.messageService.add({
        severity: 'success',
        summary: 'Export Complete',
        detail: `Successfully exported ${selected.length} theme(s).`,
      });
    }, 1000);
  }

  /**
   * Downloads theme export as JSON file
   */
  private downloadThemeExport(exportData: ThemeExport, filename: string): void {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Shows import dialog
   */
  showImportThemesDialog(): void {
    this.importFiles.set([]);
    this.showImportDialog.set(true);
  }

  /**
   * Handles file selection for import
   */
  onImportFilesSelect(event: any): void {
    const files = event.files || event.currentFiles || [];
    this.importFiles.set(Array.from(files));
  }

  /**
   * Validates and imports themes from files
   */
  importThemes(): void {
    const files = this.importFiles();
    if (files.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Files',
        detail: 'Please select theme files to import.',
      });
      return;
    }

    this.importInProgress.set(true);

    // Process each file
    const promises = files.map((file) => this.processImportFile(file));

    Promise.all(promises)
      .then((results) => {
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        this.importInProgress.set(false);
        this.showImportDialog.set(false);
        this.importFiles.set([]);

        if (failed === 0) {
          this.messageService.add({
            severity: 'success',
            summary: 'Import Complete',
            detail: `Successfully imported ${successful} theme(s).`,
          });
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Import Partial',
            detail: `${successful} theme(s) imported, ${failed} failed. Check console for details.`,
          });
        }

        this.loadThemes(); // Refresh themes list
      })
      .catch((error) => {
        console.error('Import failed:', error);
        this.importInProgress.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Import Failed',
          detail: 'Failed to import themes. Please check file format.',
        });
      });
  }

  /**
   * Processes a single import file
   */
  private processImportFile(file: File): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as ThemeExport;

          // Validate export format
          if (!data.exportVersion || !data.themes || !Array.isArray(data.themes)) {
            resolve({ success: false, error: 'Invalid export format' });
            return;
          }

          // Validate each theme
          for (const themeData of data.themes) {
            if (!themeData.name || !themeData.themeDefinition) {
              resolve({ success: false, error: 'Invalid theme data' });
              return;
            }

            // Validate theme definition structure
            const def = themeData.themeDefinition;
            if (!def.primaryColor || !def.secondaryColor) {
              resolve({ success: false, error: 'Incomplete theme definition' });
              return;
            }
          }

          // TODO: Call API to import themes
          // For now, simulate successful import
          resolve({ success: true });
        } catch (error) {
          resolve({ success: false, error: 'Invalid JSON format' });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Confirms deletion of selected themes
   */
  confirmDeleteSelected(): void {
    const customThemes = this.selectedCustomThemes();

    if (customThemes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: 'Only custom themes can be deleted.',
      });
      return;
    }

    if (this.hasInUseThemes()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Delete',
        detail: 'Cannot delete themes that are currently in use by forms.',
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${customThemes.length} selected custom theme(s)? This action cannot be undone.`,
      header: 'Delete Themes',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteSelectedThemes(customThemes);
      },
    });
  }

  /**
   * Deletes selected custom themes
   */
  private deleteSelectedThemes(themes: ThemeWithUsage[]): void {
    const deletingSet = new Set(this.deleting());

    themes.forEach((theme) => {
      deletingSet.add(theme.id);
    });

    this.deleting.set(deletingSet);

    // TODO: Implement actual deletion via API
    // For now, simulate deletion
    setTimeout(() => {
      this.deleting.set(new Set());
      this.selectedThemes.set([]);

      this.messageService.add({
        severity: 'success',
        summary: 'Themes Deleted',
        detail: `Successfully deleted ${themes.length} theme(s).`,
      });

      this.loadThemes();
    }, 1000);
  }

  /**
   * Checks if a theme is currently being deleted
   */
  isDeletingTheme(themeId: string): boolean {
    return this.deleting().has(themeId);
  }

  /**
   * Gets badge severity for theme type
   */
  getThemeTypeSeverity(isCustom: boolean): 'success' | 'info' {
    return isCustom ? 'info' : 'success';
  }

  /**
   * Gets theme preview color for visual identification
   */
  getThemePreviewColor(theme: ThemeWithUsage): string {
    return theme.themeDefinition?.primaryColor || '#1976d2';
  }

  /**
   * Navigates to theme designer to create new theme
   */
  createNewTheme(): void {
    this.router.navigate(['/app/admin/themes/designer']);
  }

  /**
   * Clears all filters
   */
  clearFilters(): void {
    this.searchQuery.set('');
    this.typeFilter = 'all';
  }

  /**
   * Track function for ngFor performance
   */
  trackByTheme(_index: number, theme: ThemeWithUsage): string {
    return theme.id;
  }
}
