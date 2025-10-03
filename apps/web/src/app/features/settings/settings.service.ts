import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, of } from 'rxjs';
import { tap, catchError, filter, map } from 'rxjs/operators';
import { AuthService } from '@core/auth/auth.service';
import {
  SettingsSection,
  SettingsNavItem,
  UserSettings,
  GeneralSettings,
  NotificationSettings,
  AppearanceSettings,
  PrivacySettings,
} from './types/settings.types';

/**
 * Settings service for managing user preferences and settings state.
 * Handles settings navigation, data persistence, and reactive state management.
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // State signals
  public readonly activeSection = signal<SettingsSection>('general');
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly successMessage = signal<string | null>(null);

  // Settings data signals
  private readonly settingsData = signal<UserSettings | null>(null);

  // Computed values
  public readonly settings = computed(() => this.settingsData());
  public readonly user = computed(() => this.authService.user());

  // Navigation items configuration
  public readonly navigationItems = computed<SettingsNavItem[]>(() => {
    const user = this.user();
    const baseItems: SettingsNavItem[] = [
      {
        id: 'general',
        label: 'General',
        icon: 'pi-cog',
        description: 'Basic preferences and account information',
      },
      {
        id: 'security',
        label: 'Security',
        icon: 'pi-shield',
        description: 'Password and authentication settings',
      },
      {
        id: 'api-tokens',
        label: 'API Tokens',
        icon: 'pi-key',
        description: 'Manage API access tokens and authentication',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'pi-bell',
        description: 'Email, push, and in-app notification preferences',
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: 'pi-palette',
        description: 'Theme, layout, and display preferences',
      },
      {
        id: 'privacy',
        label: 'Privacy',
        icon: 'pi-eye-slash',
        description: 'Data collection and profile visibility settings',
      },
      {
        id: 'advanced',
        label: 'Advanced',
        icon: 'pi-wrench',
        description: 'Data export, account deletion, and advanced options',
      },
    ];

    // Add admin section if user is admin
    if (user?.role === 'admin') {
      baseItems.push({
        id: 'admin',
        label: 'Administration',
        icon: 'pi-crown',
        description: 'Tools management and system settings',
        requiresRole: 'admin',
      });
    }

    return baseItems;
  });

  constructor() {
    this.loadSettings();
    this.initializeRouteTracking();
  }

  /**
   * Initialize route tracking to sync active section with URL
   */
  private initializeRouteTracking(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => this.extractSectionFromUrl(event.url)),
      )
      .subscribe((section) => {
        if (section) {
          this.activeSection.set(section);
        }
      });

    // Set initial section from current URL
    const currentSection = this.extractSectionFromUrl(this.router.url);
    if (currentSection) {
      this.activeSection.set(currentSection);
    }
  }

  /**
   * Extract settings section from URL path
   */
  private extractSectionFromUrl(url: string): SettingsSection | null {
    const settingsMatch = url.match(/\/app\/settings\/([^\/\?]+)/);
    if (!settingsMatch) return null;

    const segment = settingsMatch[1];

    // Map URL segments to settings sections
    const sectionMap: Record<string, SettingsSection> = {
      general: 'general',
      security: 'security',
      'api-tokens': 'api-tokens',
      notifications: 'notifications',
      appearance: 'appearance',
      privacy: 'privacy',
      advanced: 'advanced',
      administration: 'admin',
    };

    return sectionMap[segment] || null;
  }

  /**
   * Set the active settings section by navigating to the appropriate route
   */
  public setActiveSection(section: SettingsSection): void {
    this.clearMessages();

    // Map settings sections to URL segments
    const sectionRouteMap: Record<SettingsSection, string> = {
      general: 'general',
      security: 'security',
      'api-tokens': 'api-tokens',
      notifications: 'notifications',
      appearance: 'appearance',
      privacy: 'privacy',
      advanced: 'advanced',
      admin: 'administration',
      'admin-tools': 'administration', // Legacy mapping
    };

    const routeSegment = sectionRouteMap[section];
    if (routeSegment) {
      this.router.navigate(['/app/settings', routeSegment]);
    }
  }

  /**
   * Load user settings from API
   */
  public loadSettings(): Observable<UserSettings> {
    this.loading.set(true);
    this.error.set(null);

    // For now, return mock data. In production, this would be an API call
    const mockSettings: UserSettings = {
      general: {
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      },
      notifications: {
        email: {
          enabled: true,
          newsletter: false,
          updates: true,
          security: true,
        },
        push: {
          enabled: true,
          mentions: true,
          updates: false,
          marketing: false,
        },
        inApp: {
          enabled: true,
          sounds: true,
          desktop: false,
        },
      },
      appearance: {
        theme: 'system',
        compactMode: false,
        sidebarCollapsed: false,
        fontSize: 'medium',
      },
      privacy: {
        profileVisibility: 'public',
        activityTracking: true,
        dataCollection: false,
        analytics: true,
      },
      lastUpdated: new Date(),
    };

    return of(mockSettings).pipe(
      tap((settings) => {
        this.settingsData.set(settings);
        this.loading.set(false);
      }),
      catchError((error) => {
        this.handleError('Failed to load settings', error);
        return of(mockSettings);
      }),
    );
  }

  /**
   * Update general settings
   */
  public updateGeneralSettings(settings: GeneralSettings): Observable<GeneralSettings> {
    this.loading.set(true);
    this.error.set(null);

    // Mock API call - in production this would be a real HTTP request
    return of(settings).pipe(
      tap((updatedSettings) => {
        const currentSettings = this.settingsData();
        if (currentSettings) {
          this.settingsData.set({
            ...currentSettings,
            general: updatedSettings,
            lastUpdated: new Date(),
          });
        }
        this.loading.set(false);
        this.showSuccessMessage('General settings updated successfully');
      }),
      catchError((error) => {
        this.handleError('Failed to update general settings', error);
        throw error;
      }),
    );
  }

  /**
   * Update notification settings
   */
  public updateNotificationSettings(
    settings: NotificationSettings,
  ): Observable<NotificationSettings> {
    this.loading.set(true);
    this.error.set(null);

    return of(settings).pipe(
      tap((updatedSettings) => {
        const currentSettings = this.settingsData();
        if (currentSettings) {
          this.settingsData.set({
            ...currentSettings,
            notifications: updatedSettings,
            lastUpdated: new Date(),
          });
        }
        this.loading.set(false);
        this.showSuccessMessage('Notification settings updated successfully');
      }),
      catchError((error) => {
        this.handleError('Failed to update notification settings', error);
        throw error;
      }),
    );
  }

  /**
   * Update appearance settings
   */
  public updateAppearanceSettings(settings: AppearanceSettings): Observable<AppearanceSettings> {
    this.loading.set(true);
    this.error.set(null);

    return of(settings).pipe(
      tap((updatedSettings) => {
        const currentSettings = this.settingsData();
        if (currentSettings) {
          this.settingsData.set({
            ...currentSettings,
            appearance: updatedSettings,
            lastUpdated: new Date(),
          });
        }
        this.loading.set(false);
        this.showSuccessMessage('Appearance settings updated successfully');
      }),
      catchError((error) => {
        this.handleError('Failed to update appearance settings', error);
        throw error;
      }),
    );
  }

  /**
   * Update privacy settings
   */
  public updatePrivacySettings(settings: PrivacySettings): Observable<PrivacySettings> {
    this.loading.set(true);
    this.error.set(null);

    return of(settings).pipe(
      tap((updatedSettings) => {
        const currentSettings = this.settingsData();
        if (currentSettings) {
          this.settingsData.set({
            ...currentSettings,
            privacy: updatedSettings,
            lastUpdated: new Date(),
          });
        }
        this.loading.set(false);
        this.showSuccessMessage('Privacy settings updated successfully');
      }),
      catchError((error) => {
        this.handleError('Failed to update privacy settings', error);
        throw error;
      }),
    );
  }

  /**
   * Clear all messages
   */
  public clearMessages(): void {
    this.error.set(null);
    this.successMessage.set(null);
  }

  /**
   * Clear error message
   */
  public clearError(): void {
    this.error.set(null);
  }

  /**
   * Show success message temporarily
   */
  private showSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => {
      this.successMessage.set(null);
    }, 5000);
  }

  /**
   * Handle errors with user-friendly messages
   */
  private handleError(message: string, error: any): void {
    this.loading.set(false);
    this.error.set(message);
    console.error(`Settings Service Error: ${message}`, error);
  }
}
