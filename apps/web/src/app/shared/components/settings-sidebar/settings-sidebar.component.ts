import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsNavItem, SettingsSection } from '@features/settings/types/settings.types';

/**
 * Settings sidebar navigation component.
 * Provides navigation between different settings sections with responsive design.
 */
@Component({
  selector: 'app-settings-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-sidebar">
      <!-- Mobile Header -->
      <div class="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Settings</h2>
        <button
          type="button"
          (click)="onToggleMobileSidebar()"
          class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
          aria-label="Toggle settings menu"
        >
          <i class="pi pi-bars text-lg"></i>
        </button>
      </div>

      <!-- Navigation Items -->
      <nav
        class="settings-nav"
        [class.mobile-hidden]="!isMobileOpen()"
        role="navigation"
        aria-label="Settings navigation"
      >
        <div class="space-y-1 p-4">
          @for (item of navigationItems(); track item.id) {
            <button
              type="button"
              (click)="onNavigationClick(item.id)"
              [class.active]="item.id === activeSection()"
              class="nav-item group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out"
              [attr.aria-current]="item.id === activeSection() ? 'page' : null"
              [attr.aria-describedby]="'nav-desc-' + item.id"
            >
              <div class="nav-item-content">
                <div class="flex items-center">
                  <i
                    [class]="'pi ' + item.icon + ' nav-icon'"
                    class="flex-shrink-0 w-5 h-5 mr-3 text-current"
                    aria-hidden="true"
                  ></i>
                  <span class="nav-label">{{ item.label }}</span>
                  @if (item.requiresRole === 'admin') {
                    <span class="ml-auto">
                      <i class="pi pi-crown text-xs text-amber-500" title="Admin only"></i>
                    </span>
                  }
                </div>
                @if (item.description) {
                  <p
                    [id]="'nav-desc-' + item.id"
                    class="nav-description text-xs text-gray-500 mt-1 ml-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {{ item.description }}
                  </p>
                }
              </div>
            </button>
          }
        </div>

        <!-- Footer Info -->
        <div class="border-t border-gray-200 mt-6 pt-6 px-4">
          <div class="text-xs text-gray-500">
            <div class="flex items-center">
              <i class="pi pi-info-circle mr-2"></i>
              <span>Settings are auto-saved</span>
            </div>
          </div>
        </div>
      </nav>

      <!-- Mobile Overlay -->
      @if (isMobileOpen()) {
        <div
          class="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
          (click)="onCloseMobileSidebar()"
          aria-hidden="true"
        ></div>
      }
    </div>
  `,
  styles: [
    `
      .settings-sidebar {
        @apply flex flex-col h-full bg-white border-r border-gray-200;
      }

      .settings-nav {
        @apply flex-1 overflow-y-auto;
      }

      .mobile-hidden {
        @apply lg:block hidden;
      }

      .nav-item {
        @apply text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900 focus:outline-none;
      }

      .nav-item.active {
        @apply bg-primary-50 text-primary-700 border border-primary-200;
      }

      .nav-item.active .nav-icon {
        @apply text-primary-500;
      }

      .nav-item:hover .nav-description,
      .nav-item:focus .nav-description {
        @apply opacity-100;
      }

      .nav-item-content {
        @apply w-full text-left;
      }

      .nav-icon {
        @apply transition-colors duration-200;
      }

      .nav-label {
        @apply truncate;
      }

      /* Mobile styles */
      @media (max-width: 1023px) {
        .settings-nav {
          @apply fixed top-0 left-0 z-50 w-64 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out;
        }

        .settings-nav.mobile-hidden {
          @apply -translate-x-full;
        }

        .nav-description {
          @apply opacity-100 lg:opacity-0;
        }
      }

      /* Animation for mobile sidebar */
      @media (max-width: 1023px) {
        .settings-nav:not(.mobile-hidden) {
          @apply translate-x-0;
        }
      }

      /* Focus styles */
      .nav-item:focus {
        @apply ring-2 ring-primary-500 ring-offset-2;
      }

      /* Active state enhancements */
      .nav-item.active {
        @apply shadow-sm;
      }

      .nav-item.active::before {
        content: '';
        @apply absolute left-0 top-0 bottom-0 w-1 bg-primary-600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSidebarComponent {
  // Inputs
  public readonly navigationItems = input.required<SettingsNavItem[]>();
  public readonly activeSection = input.required<SettingsSection>();
  public readonly isMobileOpen = input(false);

  // Outputs
  public readonly sectionChange = output<SettingsSection>();
  public readonly toggleMobile = output<void>();
  public readonly closeMobile = output<void>();

  /**
   * Handle navigation item click
   */
  public onNavigationClick(sectionId: string): void {
    this.sectionChange.emit(sectionId as SettingsSection);
    // Close mobile sidebar when navigating
    if (this.isMobileOpen()) {
      this.closeMobile.emit();
    }
  }

  /**
   * Handle mobile sidebar toggle
   */
  public onToggleMobileSidebar(): void {
    this.toggleMobile.emit();
  }

  /**
   * Handle mobile sidebar close
   */
  public onCloseMobileSidebar(): void {
    this.closeMobile.emit();
  }
}
