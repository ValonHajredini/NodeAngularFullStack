import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './settings.service';
import { SettingsSidebarComponent } from '@shared/components/settings-sidebar';
import { SettingsSection } from './types/settings.types';

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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Desktop Layout -->
        <div class="lg:grid lg:grid-cols-4 lg:gap-8">
          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <div class="sticky top-8">
              <div class="hidden lg:block">
                <div class="settings-sidebar-container">
                  <app-settings-sidebar
                    [navigationItems]="settingsService.navigationItems()"
                    [activeSection]="settingsService.activeSection()"
                    [isMobileOpen]="isMobileSidebarOpen()"
                    (toggleMobile)="onToggleMobileSidebar()"
                    (closeMobile)="onCloseMobileSidebar()"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div class="lg:col-span-3">
            <!-- Mobile Header -->
            <div class="lg:hidden mb-6">
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
          </div>
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
        min-height: 100vh;
        background-color: var(--color-background);
        transition: var(--transition-colors);
      }

      .settings-content {
        @apply space-y-8;
      }

      .settings-sidebar-container {
        background-color: var(--color-surface);
        box-shadow: var(--shadow-base);
        border-radius: var(--border-radius-lg);
        min-height: 600px;
        border: 1px solid var(--color-border-light);
        transition: var(--transition-colors);
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

      /* Ensure sticky positioning works correctly */
      .sticky {
        position: -webkit-sticky;
        position: sticky;
      }

      /* Mobile sidebar animations */
      @media (max-width: 1023px) {
        .settings-sidebar {
          @apply transform transition-transform duration-300 ease-in-out;
        }

        .settings-sidebar.mobile-open {
          @apply translate-x-0;
        }

        .settings-sidebar.mobile-closed {
          @apply -translate-x-full;
        }
      }

      /* Focus states for accessibility */
      button:focus {
        @apply outline-none ring-2 ring-primary-500 ring-offset-2;
      }

      /* Smooth transitions */
      .settings-content > * {
        @apply transition-all duration-200 ease-in-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  protected readonly settingsService = inject(SettingsService);

  // Mobile sidebar state
  public readonly isMobileSidebarOpen = signal(false);

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
