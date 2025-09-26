import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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
        description: 'System settings and user management',
        requiresRole: 'admin',
      });
    }

    return baseItems;
  });

  constructor() {
    this.loadSettings();
  }

  /**
   * Set the active settings section
   */
  public setActiveSection(section: SettingsSection): void {
    this.activeSection.set(section);
    this.clearMessages();
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
