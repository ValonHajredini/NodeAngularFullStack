// Shared components barrel exports
export {
  ErrorFeedbackComponent,
  type ErrorInfo,
  type ErrorSeverity,
} from './error-feedback.component';
export { ThemeToggleComponent } from './theme-toggle';
export { UserDropdownMenuComponent } from './user-dropdown-menu/user-dropdown-menu.component';
export { NavigationBarComponent } from './navigation-bar/navigation-bar.component';
export {
  ActionCardComponent,
  type ActionCardData,
  type ActionCardColorVariant,
  type ActionCardSize,
} from './action-card';
export {
  StatsCardComponent,
  type StatsCardData,
  type StatsCardColorVariant,
  type StatsCardSize,
} from './stats-card';
export {
  SectionContainerComponent,
  type SectionContainerConfig,
  type SectionContainerVariant,
  type SectionContainerSize,
} from './section-container';
export { ApiTokenGeneratorComponent } from './api-token-generator';
export { SettingsSidebarComponent } from './settings-sidebar';
export {
  AvatarUploadComponent,
  type AvatarUploadState,
} from './avatar-upload/avatar-upload.component';
export { ToolLoadingComponent } from './tool-loading/tool-loading.component';

// Welcome Page Components
export {
  WelcomePageComponent,
  WelcomeHeroComponent,
  WelcomeFeaturesComponent,
  WelcomeApiDocsComponent,
  FeatureShowcaseCardComponent,
  WelcomeCTAButtonComponent,
  type WelcomePageConfig,
  type WelcomePageProps,
  type WelcomeHeroConfig,
  type WelcomeFeaturesConfig,
  type WelcomeApiDocsConfig,
  type WelcomeFeature,
  type WelcomeCTAButton,
  type WelcomeColorVariant,
  type WelcomeButtonSize,
  type WelcomeThemeConfig,
  type WelcomeFooterConfig,
  type WelcomeNavConfig,
} from './welcome-page';
