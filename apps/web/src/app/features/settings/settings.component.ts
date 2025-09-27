import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from './settings.service';
import { SettingsSidebarComponent } from '@shared/components/settings-sidebar';
import { GeneralSettingsComponent } from './components/general-settings/general-settings.component';
import { SecuritySettingsComponent } from './components/security-settings/security-settings.component';
import { ApiTokensSettingsComponent } from './components/api-tokens-settings/api-tokens-settings.component';
import { AppearanceSettingsComponent } from './components/appearance-settings/appearance-settings.component';
import { ToolsSettingsPage } from '../admin/pages/tools-settings/tools-settings.page';
import { SettingsSection } from './types/settings.types';

/**
 * Main settings component with sidebar navigation and dynamic content area.
 * Provides a comprehensive settings interface with responsive design.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    SettingsSidebarComponent,
    GeneralSettingsComponent,
    SecuritySettingsComponent,
    ApiTokensSettingsComponent,
    AppearanceSettingsComponent,
    ToolsSettingsPage,
  ],
  template: `
    <div class="settings-page">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Desktop Layout -->
        <div class="lg:grid lg:grid-cols-4 lg:gap-8">
          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <div class="sticky top-8">
              <div class="hidden lg:block">
                <div class="bg-white shadow rounded-lg min-h-[600px]">
                  <app-settings-sidebar
                    [navigationItems]="settingsService.navigationItems()"
                    [activeSection]="settingsService.activeSection()"
                    [isMobileOpen]="isMobileSidebarOpen()"
                    (sectionChange)="onSectionChange($event)"
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
              <div class="bg-white shadow rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <h1 class="text-xl font-semibold text-gray-900">Settings</h1>
                  <button
                    type="button"
                    (click)="onToggleMobileSidebar()"
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <i class="pi pi-bars mr-2"></i>
                    Menu
                  </button>
                </div>
              </div>
            </div>

            <!-- Dynamic Content Area -->
            <div class="settings-content">
              @switch (settingsService.activeSection()) {
                @case ('general') {
                  <app-general-settings />
                }
                @case ('security') {
                  <app-security-settings />
                }
                @case ('api-tokens') {
                  <app-api-tokens-settings />
                }
                @case ('appearance') {
                  <app-appearance-settings />
                }
                @case ('notifications') {
                  <div class="max-w-4xl">
                    <div class="mb-8">
                      <h2 class="text-2xl font-bold text-gray-900">Notifications</h2>
                      <p class="mt-1 text-sm text-gray-600">
                        Manage your email, push, and in-app notification preferences.
                      </p>
                    </div>
                    <div class="bg-white shadow rounded-lg p-8 text-center">
                      <div class="text-gray-400 mb-4">
                        <i class="pi pi-bell text-4xl"></i>
                      </div>
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                      <p class="text-gray-500">
                        Notification preferences will be available in a future update.
                      </p>
                    </div>
                  </div>
                }
                @case ('privacy') {
                  <div class="max-w-4xl">
                    <div class="mb-8">
                      <h2 class="text-2xl font-bold text-gray-900">Privacy Settings</h2>
                      <p class="mt-1 text-sm text-gray-600">
                        Control your privacy and data sharing preferences.
                      </p>
                    </div>
                    <div class="bg-white shadow rounded-lg p-8 text-center">
                      <div class="text-gray-400 mb-4">
                        <i class="pi pi-eye-slash text-4xl"></i>
                      </div>
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                      <p class="text-gray-500">
                        Privacy settings will be available in a future update.
                      </p>
                    </div>
                  </div>
                }
                @case ('advanced') {
                  <div class="max-w-4xl">
                    <div class="mb-8">
                      <h2 class="text-2xl font-bold text-gray-900">Advanced Settings</h2>
                      <p class="mt-1 text-sm text-gray-600">
                        Advanced options, data export, and account management.
                      </p>
                    </div>
                    <div class="bg-white shadow rounded-lg p-8 text-center">
                      <div class="text-gray-400 mb-4">
                        <i class="pi pi-wrench text-4xl"></i>
                      </div>
                      <h3 class="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                      <p class="text-gray-500">
                        Advanced settings will be available in a future update.
                      </p>
                    </div>
                  </div>
                }
                @case ('admin') {
                  <app-tools-settings />
                }
                @default {
                  <app-general-settings />
                }
              }
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
              <div class="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
                <app-settings-sidebar
                  [navigationItems]="settingsService.navigationItems()"
                  [activeSection]="settingsService.activeSection()"
                  [isMobileOpen]="isMobileSidebarOpen()"
                  (sectionChange)="onSectionChange($event)"
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
        @apply min-h-screen bg-gray-50;
      }

      .settings-content {
        @apply space-y-8;
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
   * Handle settings section change
   */
  public onSectionChange(section: SettingsSection): void {
    this.settingsService.setActiveSection(section);
  }

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
