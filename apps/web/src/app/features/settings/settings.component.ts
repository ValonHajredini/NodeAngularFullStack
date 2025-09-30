import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './settings.service';
import { SettingsSidebarComponent } from '@shared/components/settings-sidebar';
import { SettingsSection } from './types/settings.types';
import { ThemeService } from '@core/services/theme.service';

/**
 * Main settings component with sidebar navigation and dynamic content area.
 * Provides a comprehensive settings interface with responsive design.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SettingsSidebarComponent],
  template: `
    <div class="settings-page">
      <div class="settings-container">
        <!-- Desktop Layout -->
        <div class="settings-layout">
          <!-- Sidebar -->
          <aside class="settings-sidebar-wrapper">
            <div class="hidden lg:block h-full">
              <app-settings-sidebar
                [navigationItems]="settingsService.navigationItems()"
                [activeSection]="settingsService.activeSection()"
                [isMobileOpen]="isMobileSidebarOpen()"
                [theme]="currentTheme()"
                (toggleMobile)="onToggleMobileSidebar()"
                (closeMobile)="onCloseMobileSidebar()"
              />
            </div>
          </aside>

          <!-- Main Content -->
          <main class="settings-main">
            <!-- Mobile Header -->
            <div class="lg:hidden mb-6 px-4">
              <div class="settings-mobile-header">
                <div class="flex items-center justify-between">
                  <h1 class="text-xl font-semibold text-gray-900">Settings</h1>
                  <button
                    type="button"
                    (click)="onToggleMobileSidebar()"
                    class="settings-menu-button"
                  >
                    <i class="pi pi-bars mr-2"></i>
                    Menu
                  </button>
                </div>
              </div>
            </div>

            <!-- Dynamic Content Area -->
            <div class="settings-content">
              <router-outlet />
            </div>
          </main>
        </div>

        <!-- Mobile Sidebar Overlay -->
        @if (isMobileSidebarOpen()) {
          <div class="lg:hidden">
            <div class="fixed inset-0 z-50 overflow-hidden">
              <!-- Backdrop -->
              <div
                class="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
                (click)="onCloseMobileSidebar()"
                aria-hidden="true"
              ></div>

              <!-- Sidebar Panel -->
              <div class="settings-mobile-sidebar">
                <app-settings-sidebar
                  [navigationItems]="settingsService.navigationItems()"
                  [activeSection]="settingsService.activeSection()"
                  [isMobileOpen]="isMobileSidebarOpen()"
                  [theme]="currentTheme()"
                  (toggleMobile)="onToggleMobileSidebar()"
                  (closeMobile)="onCloseMobileSidebar()"
                />
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .settings-page {
        @apply min-h-screen;
        background-color: var(--color-background);
        transition: var(--transition-colors);
      }

      .settings-container {
        @apply w-full h-full;
      }

      .settings-layout {
        @apply flex h-full;
      }

      /* Sidebar */
      .settings-sidebar-wrapper {
        @apply hidden lg:block;
        width: 360px;
        min-width: 360px;
        max-width: 360px;
        height: 100vh;
        position: sticky;
        top: 0;
        overflow-y: auto;
      }

      /* Main Content */
      .settings-main {
        @apply flex-1 min-w-0;
        background-color: var(--color-background);
      }

      .settings-content {
        @apply w-full h-full;
      }

      .settings-mobile-header {
        background-color: var(--color-surface);
        box-shadow: var(--shadow-base);
        border-radius: var(--border-radius-lg);
        padding: 1rem;
        border: 1px solid var(--color-border-light);
        transition: var(--transition-colors);
      }

      .settings-menu-button {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-border);
        box-shadow: var(--shadow-sm);
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: var(--border-radius-md);
        color: var(--color-text-secondary);
        background-color: var(--color-surface);
        transition: var(--transition-colors);

        &:hover {
          background-color: var(--color-gray-50);
        }

        &:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--color-focus-ring);
          outline-offset: 2px;
        }
      }

      .settings-mobile-sidebar {
        position: relative;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
        max-width: 20rem;
        width: 100%;
        background-color: var(--color-surface);
        box-shadow: var(--shadow-xl);
        transition: var(--transition-colors);
      }

      /* Mobile sidebar animations */
      @media (max-width: 1023px) {
        .settings-sidebar-wrapper {
          display: none;
        }

        .settings-main {
          width: 100%;
        }
      }

      /* Focus states for accessibility */
      button:focus {
        @apply outline-none ring-2 ring-primary-500 ring-offset-2;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);
  private readonly themeService = inject(ThemeService);

  // Mobile sidebar state
  public readonly isMobileSidebarOpen = signal(false);

  // Computed theme signal for sidebar
  protected readonly currentTheme = computed(() => {
    return this.themeService.isDarkMode() ? 'dark' : 'light';
  });

  /**
   * Toggle mobile sidebar
   */
  public onToggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update((open) => !open);
  }

  /**
   * Close mobile sidebar
   */
  public onCloseMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }
}
