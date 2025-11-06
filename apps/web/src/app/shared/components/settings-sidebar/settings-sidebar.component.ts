import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SettingsNavItem, SettingsSection } from '@features/settings/types/settings.types';

/**
 * Settings sidebar navigation component.
 * Provides navigation between different settings sections with responsive design.
 */
@Component({
  selector: 'app-settings-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="settings-sidebar" [attr.data-theme]="theme()">
      <!-- Header -->
      <div class="sidebar-header">
        <h1 class="sidebar-title">Settings & privacy</h1>
        <button
          type="button"
          (click)="onToggleMobileSidebar()"
          class="lg:hidden sidebar-toggle"
          aria-label="Toggle settings menu"
        >
          <i class="pi pi-bars"></i>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="sidebar-search">
        <i class="pi pi-search search-icon"></i>
        <input
          type="text"
          placeholder="Search settings"
          class="search-input"
          aria-label="Search settings"
        />
      </div>

      <!-- Navigation Items -->
      <nav
        class="settings-nav"
        [class.mobile-hidden]="!isMobileOpen()"
        role="navigation"
        aria-label="Settings navigation"
      >
        <div class="nav-items">
          @for (item of navigationItems(); track item.id) {
            <a
              [routerLink]="getRouteForSection(item.id)"
              routerLinkActive="active"
              (click)="onNavigationClick()"
              class="nav-item"
              [attr.aria-label]="item.label"
            >
              <div class="nav-item-icon">
                <i [class]="'pi ' + item.icon" aria-hidden="true"></i>
              </div>
              <div class="nav-item-content">
                <span class="nav-item-label">{{ item.label }}</span>
                @if (item.description) {
                  <span class="nav-item-description">{{ item.description }}</span>
                }
              </div>
              @if (item.requiresRole === 'admin') {
                <div class="nav-item-badge">
                  <i class="pi pi-crown" title="Admin only"></i>
                </div>
              }
            </a>
          }
        </div>
      </nav>

      <!-- Mobile Overlay -->
      @if (isMobileOpen()) {
        <div class="mobile-overlay" (click)="onCloseMobileSidebar()" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [
    `
      /* Theme Variables */
      .settings-sidebar {
        @apply flex flex-col h-full;
        --bg-primary: #ffffff;
        --bg-secondary: #f8f9fa;
        --bg-hover: #f0f2f5;
        --bg-active: #e7f3ff;
        --border-color: #e4e6eb;
        --text-primary: #1c1e21;
        --text-secondary: #65676b;
        --text-tertiary: #8a8d91;
        --icon-bg: #f0f2f5;
        --icon-bg-active: #cfe9ff;
        --accent: #0866ff;
        --accent-text: #0866ff;
        --input-bg: #f0f2f5;
        --input-border: #e4e6eb;
        --scrollbar-thumb: rgba(0, 0, 0, 0.2);
        --scrollbar-thumb-hover: rgba(0, 0, 0, 0.3);
        --overlay-bg: rgba(0, 0, 0, 0.6);
        background: var(--bg-primary);
        border-right: 1px solid var(--border-color);
      }

      /* Dark Theme */
      .settings-sidebar[data-theme='dark'] {
        --bg-primary: #1f2937;
        --bg-secondary: #242526;
        --bg-hover: rgba(255, 255, 255, 0.05);
        --bg-active: rgba(45, 136, 255, 0.15);
        --border-color: rgba(255, 255, 255, 0.1);
        --text-primary: #e4e6eb;
        --text-secondary: #b0b3b8;
        --text-tertiary: #8a8d91;
        --icon-bg: rgba(255, 255, 255, 0.05);
        --icon-bg-active: rgba(45, 136, 255, 0.15);
        --accent: #2d88ff;
        --accent-text: #2d88ff;
        --input-bg: rgba(255, 255, 255, 0.05);
        --input-border: transparent;
        --scrollbar-thumb: rgba(255, 255, 255, 0.1);
        --scrollbar-thumb-hover: rgba(255, 255, 255, 0.15);
        --overlay-bg: rgba(0, 0, 0, 0.7);
      }

      /* Header */
      .sidebar-header {
        @apply flex items-center justify-between px-5 py-4;
        border-bottom: 1px solid var(--border-color);
      }

      .sidebar-title {
        @apply text-xl font-semibold;
        color: var(--text-primary);
        letter-spacing: -0.02em;
      }

      .sidebar-toggle {
        @apply p-2 rounded-lg transition-colors;
        color: var(--text-secondary);
      }

      .sidebar-toggle:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      /* Search Bar */
      .sidebar-search {
        @apply relative px-3 py-3;
      }

      .search-icon {
        @apply absolute left-6 top-1/2 transform -translate-y-1/2 text-sm;
        color: var(--text-secondary);
      }

      .search-input {
        @apply w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-all;
        background: var(--input-bg);
        border: 1px solid var(--input-border);
        color: var(--text-primary);
      }

      .search-input::placeholder {
        color: var(--text-tertiary);
      }

      .search-input:focus {
        @apply outline-none;
        background: var(--bg-hover);
        border-color: var(--accent);
      }

      /* Navigation */
      .settings-nav {
        @apply flex-1 overflow-y-auto;
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb) transparent;
      }

      .settings-nav::-webkit-scrollbar {
        width: 6px;
      }

      .settings-nav::-webkit-scrollbar-track {
        background: transparent;
      }

      .settings-nav::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb);
        border-radius: 3px;
      }

      .settings-nav::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover);
      }

      .nav-items {
        @apply space-y-0.5 px-2 py-2;
      }

      /* Navigation Item */
      .nav-item {
        @apply flex items-center gap-3 px-3 py-3 rounded-lg transition-all cursor-pointer;
        color: var(--text-primary);
        text-decoration: none;
      }

      .nav-item:hover {
        background: var(--bg-hover);
      }

      .nav-item.active {
        background: var(--bg-active);
        color: var(--accent-text);
      }

      .nav-item.active .nav-item-icon {
        color: var(--accent-text);
      }

      /* Icon Container */
      .nav-item-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        flex-shrink: 0;
        background: var(--icon-bg);
        color: var(--text-primary);
        font-size: 18px;
      }

      .nav-item-icon i {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .nav-item.active .nav-item-icon {
        background: var(--icon-bg-active);
      }

      /* Content */
      .nav-item-content {
        @apply flex flex-col flex-1 min-w-0;
      }

      .nav-item-label {
        @apply text-[15px] font-medium truncate;
      }

      .nav-item-description {
        @apply text-xs mt-0.5 truncate;
        color: var(--text-secondary);
      }

      .nav-item.active .nav-item-description {
        color: var(--accent-text);
        opacity: 0.8;
      }

      /* Badge */
      .nav-item-badge {
        @apply flex items-center justify-center w-5 h-5 rounded-full;
        background: rgba(255, 193, 7, 0.15);
        color: #ffc107;
        font-size: 10px;
      }

      /* Mobile Overlay */
      .mobile-overlay {
        @apply lg:hidden fixed inset-0 z-40;
        background: var(--overlay-bg);
      }

      .mobile-hidden {
        @apply lg:block hidden;
      }

      /* Mobile styles */
      @media (max-width: 1023px) {
        .settings-nav {
          @apply fixed top-0 left-0 z-50 w-80 h-full shadow-2xl transform transition-transform duration-300 ease-out;
          background: var(--bg-secondary);
        }

        .settings-nav.mobile-hidden {
          @apply -translate-x-full;
        }

        .settings-nav:not(.mobile-hidden) {
          @apply translate-x-0;
        }
      }

      /* Focus styles */
      .nav-item:focus-visible {
        @apply outline-none ring-2 ring-offset-2;
        ring-color: var(--accent);
        opacity: 0.5;
      }

      .search-input:focus-visible {
        @apply outline-none ring-2;
        ring-color: var(--accent);
        opacity: 0.5;
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
  public readonly theme = input<'light' | 'dark'>('light');

  // Outputs
  public readonly toggleMobile = output<void>();
  public readonly closeMobile = output<void>();

  /**
   * Get the route path for a settings section
   */
  public getRouteForSection(sectionId: string): string {
    const routeMap: Record<string, string> = {
      general: '/app/settings/general',
      security: '/app/settings/security',
      'api-tokens': '/app/settings/api-tokens',
      notifications: '/app/settings/notifications',
      appearance: '/app/settings/appearance',
      privacy: '/app/settings/privacy',
      advanced: '/app/settings/advanced',
      admin: '/app/settings/administration',
    };

    return routeMap[sectionId] || '/app/settings/general';
  }

  /**
   * Handle navigation item click (for mobile sidebar closing)
   */
  public onNavigationClick(): void {
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
