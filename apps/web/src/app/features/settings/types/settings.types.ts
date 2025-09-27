/**
 * Settings navigation item configuration
 */
export interface SettingsNavItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  requiresRole?: 'admin' | 'user';
  description?: string;
}

/**
 * Available settings sections
 */
export type SettingsSection =
  | 'general'
  | 'security'
  | 'api-tokens'
  | 'notifications'
  | 'appearance'
  | 'privacy'
  | 'advanced'
  | 'admin'
  | 'admin-tools';

/**
 * General settings configuration
 */
export interface GeneralSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

/**
 * Notification preferences
 */
export interface NotificationSettings {
  email: {
    enabled: boolean;
    newsletter: boolean;
    updates: boolean;
    security: boolean;
  };
  push: {
    enabled: boolean;
    mentions: boolean;
    updates: boolean;
    marketing: boolean;
  };
  inApp: {
    enabled: boolean;
    sounds: boolean;
    desktop: boolean;
  };
}

/**
 * Appearance preferences
 */
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  activityTracking: boolean;
  dataCollection: boolean;
  analytics: boolean;
}

/**
 * Combined user settings
 */
export interface UserSettings {
  general: GeneralSettings;
  notifications: NotificationSettings;
  appearance: AppearanceSettings;
  privacy: PrivacySettings;
  lastUpdated: Date;
}
