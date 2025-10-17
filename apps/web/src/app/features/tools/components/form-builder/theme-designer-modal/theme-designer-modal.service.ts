import { Injectable, signal, computed, inject } from '@angular/core';
import { FormsApiService } from '../forms-api.service';
import { FormTheme } from '@nodeangularfullstack/shared';
import { Observable, Subject } from 'rxjs';

/**
 * Service for managing theme designer modal state.
 * Handles wizard step navigation, theme data, and validation.
 */
@Injectable()
export class ThemeDesignerModalService {
  private readonly formsApiService = inject(FormsApiService);

  /** Subject to notify when a theme is successfully saved */
  private readonly themeSavedSubject = new Subject<string>();

  /** Observable for theme save events (theme ID) */
  readonly themeSaved$ = this.themeSavedSubject.asObservable();

  // Wizard state
  private readonly step = signal(0);
  private readonly themeName = signal('');

  // Step 1: Colors
  private readonly primaryColor = signal('#3B82F6');
  private readonly secondaryColor = signal('#10B981');

  // Step 2: Background
  private readonly backgroundType = signal<'solid' | 'linear' | 'radial' | 'image'>('solid');
  private readonly backgroundColor = signal('#FFFFFF');
  private readonly gradientColor1 = signal('#3B82F6');
  private readonly gradientColor2 = signal('#10B981');
  private readonly gradientAngle = signal(45);
  private readonly gradientPosition = signal('center');
  private readonly backgroundImageUrl = signal('');

  // Step 3: Typography
  private readonly headingFont = signal('Roboto');
  private readonly bodyFont = signal('Open Sans');
  private readonly headingFontSize = signal(24);
  private readonly bodyFontSize = signal(16);

  // Step 4: Styling
  private readonly borderRadius = signal(8);
  private readonly fieldPadding = signal(12);
  private readonly fieldSpacing = signal(16);
  private readonly borderWidth = signal(1);
  private readonly labelSpacing = signal(8);
  private readonly focusBorderWidth = signal(2);

  // Additional required fields for API
  private readonly textColorPrimary = signal('#000000');
  private readonly textColorSecondary = signal('#666666');
  private readonly containerBackground = signal('#FFFFFF');
  private readonly containerOpacity = signal(1.0);
  private readonly containerPosition = signal<'center' | 'top' | 'left' | 'full-width'>('center');
  private readonly thumbnailUrl = signal('https://via.placeholder.com/300x200');

  /**
   * Computed theme object containing all current theme values.
   * Updates reactively when any theme property changes.
   * Returns a CreateThemeRequest-compatible structure.
   */
  readonly currentTheme = computed(() => {
    const bgType = this.backgroundType();
    let bgValue = this.backgroundColor();

    // Calculate background CSS based on type
    if (bgType === 'linear') {
      bgValue = `linear-gradient(${this.gradientAngle()}deg, ${this.gradientColor1()}, ${this.gradientColor2()})`;
    } else if (bgType === 'radial') {
      bgValue = `radial-gradient(circle at ${this.gradientPosition()}, ${this.gradientColor1()}, ${this.gradientColor2()})`;
    } else if (bgType === 'image') {
      bgValue = this.backgroundImageUrl();
    }

    return {
      name: this.themeName(),
      thumbnailUrl: this.thumbnailUrl(),
      themeConfig: {
        desktop: {
          primaryColor: this.primaryColor(),
          secondaryColor: this.secondaryColor(),
          backgroundColor: bgValue,
          textColorPrimary: this.textColorPrimary(),
          textColorSecondary: this.textColorSecondary(),
          fontFamilyHeading: this.headingFont(),
          fontFamilyBody: this.bodyFont(),
          fieldBorderRadius: `${this.borderRadius()}px`,
          fieldSpacing: `${this.fieldSpacing()}px`,
          containerBackground: this.containerBackground(),
          containerOpacity: this.containerOpacity(),
          containerPosition: this.containerPosition(),
          backgroundImageUrl: bgType === 'image' ? this.backgroundImageUrl() : undefined,
          backgroundImagePosition: bgType === 'image' ? ('cover' as const) : undefined,
        },
      },
    };
  });

  /**
   * Computed validation for proceeding to next step.
   * Each step has specific validation requirements.
   */
  readonly canProceedToNextStep = computed(() => {
    const currentStep = this.step();

    switch (currentStep) {
      case 0: // Step 1: Colors
        return !!this.primaryColor() && !!this.secondaryColor();
      case 1: // Step 2: Background
        return true; // Background type defaults are valid
      case 2: // Step 3: Typography
        return !!this.headingFont() && !!this.bodyFont();
      case 3: // Step 4: Styling
        return true; // Styling defaults are valid
      case 4: // Step 5: Preview & Save
        return this.themeName().trim().length > 0 && this.themeName().length <= 50;
      default:
        return false;
    }
  });

  /**
   * Computed flag for detecting unsaved changes.
   * Returns true if any field has been modified from default values.
   */
  readonly hasUnsavedChanges = computed(() => {
    return (
      this.themeName() !== '' ||
      this.primaryColor() !== '#3B82F6' ||
      this.secondaryColor() !== '#10B981' ||
      this.backgroundType() !== 'solid' ||
      this.backgroundColor() !== '#FFFFFF' ||
      this.headingFont() !== 'Roboto' ||
      this.bodyFont() !== 'Open Sans'
    );
  });

  // Public accessors for wizard state
  readonly currentStep = this.step.asReadonly();

  // Color getters/setters
  getPrimaryColor = () => this.primaryColor();
  setPrimaryColor = (value: string) => this.primaryColor.set(value);

  getSecondaryColor = () => this.secondaryColor();
  setSecondaryColor = (value: string) => this.secondaryColor.set(value);

  // Background getters/setters
  getBackgroundType = () => this.backgroundType();
  setBackgroundType = (value: 'solid' | 'linear' | 'radial' | 'image') =>
    this.backgroundType.set(value);

  getBackgroundColor = () => this.backgroundColor();
  setBackgroundColor = (value: string) => this.backgroundColor.set(value);

  getGradientColor1 = () => this.gradientColor1();
  setGradientColor1 = (value: string) => this.gradientColor1.set(value);

  getGradientColor2 = () => this.gradientColor2();
  setGradientColor2 = (value: string) => this.gradientColor2.set(value);

  getGradientAngle = () => this.gradientAngle();
  setGradientAngle = (value: number) => this.gradientAngle.set(value);

  getGradientPosition = () => this.gradientPosition();
  setGradientPosition = (value: string) => this.gradientPosition.set(value);

  getBackgroundImageUrl = () => this.backgroundImageUrl();
  setBackgroundImageUrl = (value: string) => this.backgroundImageUrl.set(value);

  // Typography getters/setters
  getHeadingFont = () => this.headingFont();
  setHeadingFont = (value: string) => this.headingFont.set(value);

  getBodyFont = () => this.bodyFont();
  setBodyFont = (value: string) => this.bodyFont.set(value);

  getHeadingFontSize = () => this.headingFontSize();
  setHeadingFontSize = (value: number) => this.headingFontSize.set(value);

  getBodyFontSize = () => this.bodyFontSize();
  setBodyFontSize = (value: number) => this.bodyFontSize.set(value);

  // Styling getters/setters
  getBorderRadius = () => this.borderRadius();
  setBorderRadius = (value: number) => this.borderRadius.set(value);

  getFieldPadding = () => this.fieldPadding();
  setFieldPadding = (value: number) => this.fieldPadding.set(value);

  getFieldSpacing = () => this.fieldSpacing();
  setFieldSpacing = (value: number) => this.fieldSpacing.set(value);

  getBorderWidth = () => this.borderWidth();
  setBorderWidth = (value: number) => this.borderWidth.set(value);

  getLabelSpacing = () => this.labelSpacing();
  setLabelSpacing = (value: number) => this.labelSpacing.set(value);

  getFocusBorderWidth = () => this.focusBorderWidth();
  setFocusBorderWidth = (value: number) => this.focusBorderWidth.set(value);

  // Theme name getters/setters
  getThemeName = () => this.themeName();
  setThemeName = (value: string) => this.themeName.set(value);

  /**
   * Advances to the next wizard step.
   * Only proceeds if current step validation passes.
   */
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.step.update((s) => Math.min(s + 1, 4));
    }
  }

  /**
   * Returns to the previous wizard step.
   * Prevents going below step 0.
   */
  previousStep(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  /**
   * Saves the current theme via API.
   * @returns Observable of the created theme
   */
  saveTheme(): Observable<FormTheme> {
    const theme = this.currentTheme();
    return this.formsApiService.createTheme(theme);
  }

  /**
   * Notifies subscribers that a theme was successfully saved.
   * Called by PreviewStepComponent after successful save.
   * @param themeId - ID of the saved theme
   */
  notifyThemeSaved(themeId: string): void {
    this.themeSavedSubject.next(themeId);
  }

  /**
   * Resets all wizard state to default values.
   * Called when modal is closed or after successful save.
   */
  reset(): void {
    this.step.set(0);
    this.themeName.set('');
    this.primaryColor.set('#3B82F6');
    this.secondaryColor.set('#10B981');
    this.backgroundType.set('solid');
    this.backgroundColor.set('#FFFFFF');
    this.gradientColor1.set('#3B82F6');
    this.gradientColor2.set('#10B981');
    this.gradientAngle.set(45);
    this.gradientPosition.set('center');
    this.backgroundImageUrl.set('');
    this.headingFont.set('Roboto');
    this.bodyFont.set('Open Sans');
    this.headingFontSize.set(24);
    this.bodyFontSize.set(16);
    this.borderRadius.set(8);
    this.fieldPadding.set(12);
    this.fieldSpacing.set(16);
    this.borderWidth.set(1);
    this.labelSpacing.set(8);
    this.focusBorderWidth.set(2);
    this.textColorPrimary.set('#000000');
    this.textColorSecondary.set('#666666');
    this.containerBackground.set('#FFFFFF');
    this.containerOpacity.set(1.0);
    this.containerPosition.set('center');
    this.thumbnailUrl.set('https://via.placeholder.com/300x200');
  }
}
