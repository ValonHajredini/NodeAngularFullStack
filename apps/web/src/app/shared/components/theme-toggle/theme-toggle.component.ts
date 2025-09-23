import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ThemeService, ThemeType } from '../../../core/services/theme.service';

/**
 * Theme Toggle Component
 *
 * Provides a user interface for switching between light, dark, and system themes.
 * Uses PrimeNG Button component with icons and integrates with ThemeService.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="theme-toggle-container">
      <p-button
        [icon]="getThemeIcon()"
        [label]="getThemeLabel()"
        severity="secondary"
        size="small"
        [outlined]="true"
        (onClick)="toggleTheme()"
        [ariaLabel]="'Switch theme. Current: ' + getThemeLabel()"
        class="theme-toggle-button"
        [class.dark-active]="themeService.isDarkMode()"
      />

      <!-- Optional: Extended toggle with all three options -->
      <div class="theme-options" *ngIf="showAllOptions">
        <p-button
          icon="pi pi-sun"
          severity="secondary"
          size="small"
          [outlined]="themeService.currentTheme() !== 'light'"
          (onClick)="setTheme('light')"
          ariaLabel="Switch to light theme"
          [class.active]="themeService.currentTheme() === 'light'"
        />
        <p-button
          icon="pi pi-moon"
          severity="secondary"
          size="small"
          [outlined]="themeService.currentTheme() !== 'dark'"
          (onClick)="setTheme('dark')"
          ariaLabel="Switch to dark theme"
          [class.active]="themeService.currentTheme() === 'dark'"
        />
        <p-button
          icon="pi pi-desktop"
          severity="secondary"
          size="small"
          [outlined]="themeService.currentTheme() !== 'system'"
          (onClick)="setTheme('system')"
          ariaLabel="Use system theme"
          [class.active]="themeService.currentTheme() === 'system'"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .theme-toggle-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
      }

      .theme-toggle-button {
        transition: var(--transition-colors);

        &.dark-active {
          background-color: var(--color-gray-800);
          border-color: var(--color-gray-600);
          color: var(--color-gray-100);

          &:hover {
            background-color: var(--color-gray-700);
          }
        }
      }

      .theme-options {
        display: flex;
        gap: var(--spacing-1);
        padding: var(--spacing-1);
        background-color: var(--color-surface);
        border: var(--border-width-1) solid var(--color-border);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-sm);

        .p-button {
          min-width: auto;
          padding: var(--spacing-1_5);

          &.active {
            background-color: var(--color-primary-100);
            border-color: var(--color-primary-300);
            color: var(--color-primary-700);
          }
        }
      }

      /* Dark theme adjustments */
      [data-theme='dark'] .theme-options {
        background-color: var(--color-gray-800);
        border-color: var(--color-gray-600);

        .p-button.active {
          background-color: var(--color-primary-900);
          border-color: var(--color-primary-700);
          color: var(--color-primary-300);
        }
      }

      @media (prefers-color-scheme: dark) {
        :root:not([data-theme]) .theme-options {
          background-color: var(--color-gray-800);
          border-color: var(--color-gray-600);

          .p-button.active {
            background-color: var(--color-primary-900);
            border-color: var(--color-primary-700);
            color: var(--color-primary-300);
          }
        }
      }
    `,
  ],
})
export class ThemeToggleComponent {
  readonly themeService = inject(ThemeService);

  /**
   * Whether to show all theme options (light, dark, system) or just a simple toggle
   */
  showAllOptions = input(false);

  /**
   * Toggle between themes in sequence: system -> light -> dark -> system
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * Set a specific theme
   */
  setTheme(theme: ThemeType): void {
    this.themeService.setTheme(theme);
  }

  /**
   * Get the appropriate icon for the current theme
   */
  getThemeIcon(): string {
    const theme = this.themeService.currentTheme();
    const isDark = this.themeService.isDarkMode();

    switch (theme) {
      case 'light':
        return 'pi pi-sun';
      case 'dark':
        return 'pi pi-moon';
      case 'system':
        return isDark ? 'pi pi-moon' : 'pi pi-sun';
      default:
        return 'pi pi-desktop';
    }
  }

  /**
   * Get the appropriate label for the current theme
   */
  getThemeLabel(): string {
    const theme = this.themeService.currentTheme();
    const isDark = this.themeService.isDarkMode();

    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return isDark ? 'System (Dark)' : 'System (Light)';
      default:
        return 'Theme';
    }
  }
}
