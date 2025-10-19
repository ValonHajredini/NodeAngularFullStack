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

  // Edit mode state
  private readonly editModeSignal = signal(false);
  private readonly editThemeIdSignal = signal<string | undefined>(undefined);

  // Wizard state
  private readonly step = signal(0);
  private readonly themeName = signal('');

  // Step 1: Colors
  private readonly primaryColor = signal('#3B82F6');
  private readonly secondaryColor = signal('#10B981');
  private readonly labelColor = signal('#374151');
  private readonly inputBackgroundColor = signal('#FFFFFF');
  private readonly inputTextColor = signal('#1F2937');

  // Step 2: Background
  private readonly backgroundType = signal<'solid' | 'linear' | 'radial' | 'image'>('solid');
  private readonly backgroundColor = signal('#FFFFFF');
  private readonly gradientColor1 = signal('#3B82F6');
  private readonly gradientColor2 = signal('#10B981');
  private readonly gradientAngle = signal(45);
  private readonly gradientPosition = signal('center');
  private readonly backgroundImageUrl = signal('');
  private readonly backgroundImageOpacity = signal(1);
  private readonly backgroundImageBlur = signal(0);

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
  private readonly textColorPrimary = signal('#1F2937');
  private readonly textColorSecondary = signal('#6B7280');
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
    const solidBackground = this.backgroundColor();
    let bgValue = solidBackground;
    let backgroundImageUrl: string | undefined;
    let backgroundImagePosition: 'cover' | 'contain' | 'repeat' | undefined;

    // Calculate background CSS based on type
    if (bgType === 'linear') {
      bgValue = `linear-gradient(${this.gradientAngle()}deg, ${this.gradientColor1()}, ${this.gradientColor2()})`;
    } else if (bgType === 'radial') {
      bgValue = `radial-gradient(circle at ${this.gradientPosition()}, ${this.gradientColor1()}, ${this.gradientColor2()})`;
    } else if (bgType === 'image') {
      bgValue = solidBackground || '#FFFFFF';
      backgroundImageUrl = this.backgroundImageUrl();
      backgroundImagePosition = 'cover';
    }

    return {
      name: this.themeName(),
      thumbnailUrl: this.thumbnailUrl(),
      themeConfig: {
        desktop: {
          primaryColor: this.primaryColor(),
          secondaryColor: this.secondaryColor(),
          backgroundColor: bgValue,
          backgroundImageUrl,
          backgroundImagePosition,
          backgroundImageOpacity: this.backgroundImageOpacity(),
          backgroundImageBlur: this.backgroundImageBlur(),
          textColorPrimary: this.textColorPrimary(),
          textColorSecondary: this.textColorSecondary(),
          labelColor: this.labelColor(),
          inputBackgroundColor: this.inputBackgroundColor(),
          inputTextColor: this.inputTextColor(),
          fontFamilyHeading: this.headingFont(),
          fontFamilyBody: this.bodyFont(),
          fieldBorderRadius: `${this.borderRadius()}px`,
          fieldSpacing: `${this.fieldSpacing()}px`,
          containerBackground: this.containerBackground(),
          containerOpacity: this.containerOpacity(),
          containerPosition: this.containerPosition(),
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
      case 4: // Step 5: Visual Preview
        return true; // Visual preview is always valid (no user input required)
      case 5: // Step 6: Preview & Save
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
      this.labelColor() !== '#374151' ||
      this.inputBackgroundColor() !== '#FFFFFF' ||
      this.inputTextColor() !== '#1F2937' ||
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

  getLabelColor = () => this.labelColor();
  setLabelColor = (value: string) => this.labelColor.set(value);

  getInputBackgroundColor = () => this.inputBackgroundColor();
  setInputBackgroundColor = (value: string) => this.inputBackgroundColor.set(value);

  getInputTextColor = () => this.inputTextColor();
  setInputTextColor = (value: string) => {
    this.inputTextColor.set(value);
    this.textColorPrimary.set(value);
  };

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

  getBackgroundImageOpacity = () => this.backgroundImageOpacity();
  setBackgroundImageOpacity = (value: number) => this.backgroundImageOpacity.set(value);

  getBackgroundImageBlur = () => this.backgroundImageBlur();
  setBackgroundImageBlur = (value: number) => this.backgroundImageBlur.set(value);

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

  // Container getters/setters
  getContainerBackground = () => this.containerBackground();
  setContainerBackground = (value: string) => this.containerBackground.set(value);

  getContainerOpacity = () => this.containerOpacity();
  setContainerOpacity = (value: number) => this.containerOpacity.set(value);

  getContainerPosition = () => this.containerPosition();
  setContainerPosition = (value: 'center' | 'top' | 'left' | 'full-width') =>
    this.containerPosition.set(value);

  // Theme name getters/setters
  getThemeName = () => this.themeName();
  setThemeName = (value: string) => this.themeName.set(value);

  // Thumbnail getters/setters
  getThumbnailUrl = () => this.thumbnailUrl();
  setThumbnailUrl = (value: string) => this.thumbnailUrl.set(value);

  /**
   * Advances to the next wizard step.
   * Only proceeds if current step validation passes.
   */
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.step.update((s) => Math.min(s + 1, 5));
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
   * Navigates to a specific step.
   * Used for dot indicator navigation (allows going back to previous steps).
   * @param stepIndex - Target step index (0-5)
   */
  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex <= 5) {
      this.step.set(stepIndex);
    }
  }

  /**
   * Saves the current theme via API.
   * Calls update if in edit mode, otherwise creates new theme.
   * @returns Observable of the created or updated theme
   */
  saveTheme(): Observable<FormTheme> {
    const theme = this.currentTheme();

    if (this.editModeSignal()) {
      const themeId = this.editThemeIdSignal();
      if (!themeId) {
        throw new Error('Edit mode requires a theme ID');
      }
      return this.formsApiService.updateTheme(themeId, theme);
    }

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
   * Loads an existing theme into the wizard for editing.
   * Populates all wizard signals from the theme's configuration.
   * @param theme - The theme to load for editing
   */
  loadTheme(theme: FormTheme): void {
    this.themeName.set(theme.name);

    const desktop = theme.themeConfig.desktop;

    // Step 1: Colors
    this.primaryColor.set(desktop.primaryColor);
    this.secondaryColor.set(desktop.secondaryColor);

    // Step 2: Background
    // Detect background type from backgroundColor value
    const bgColor = desktop.backgroundColor;
    if (bgColor.startsWith('linear-gradient')) {
      this.backgroundType.set('linear');
      // Extract gradient values (simplified - could be improved with regex)
      const angleMatch = bgColor.match(/(\d+)deg/);
      if (angleMatch) {
        this.gradientAngle.set(parseInt(angleMatch[1], 10));
      }
      // Extract colors from gradient (simplified)
      const colorMatch = bgColor.match(/#[0-9A-Fa-f]{6}/g);
      if (colorMatch && colorMatch.length >= 2) {
        this.gradientColor1.set(colorMatch[0]);
        this.gradientColor2.set(colorMatch[1]);
      }
    } else if (bgColor.startsWith('radial-gradient')) {
      this.backgroundType.set('radial');
      // Extract position and colors (simplified)
      const positionMatch = bgColor.match(/circle at (\w+)/);
      if (positionMatch) {
        this.gradientPosition.set(positionMatch[1]);
      }
      const colorMatch = bgColor.match(/#[0-9A-Fa-f]{6}/g);
      if (colorMatch && colorMatch.length >= 2) {
        this.gradientColor1.set(colorMatch[0]);
        this.gradientColor2.set(colorMatch[1]);
      }
    } else if (desktop.backgroundImageUrl) {
      this.backgroundType.set('image');
      this.backgroundImageUrl.set(desktop.backgroundImageUrl);
      this.backgroundImageOpacity.set(desktop.backgroundImageOpacity ?? 1);
      this.backgroundImageBlur.set(desktop.backgroundImageBlur ?? 0);
    } else {
      this.backgroundType.set('solid');
      this.backgroundColor.set(bgColor);
    }

    // Step 3: Typography
    this.headingFont.set(desktop.fontFamilyHeading);
    this.bodyFont.set(desktop.fontFamilyBody);
    // Font sizes are in the config but not currently exposed in the wizard
    // Could be added in future enhancement

    // Step 4: Styling
    const borderRadius = parseInt(desktop.fieldBorderRadius.replace('px', ''), 10);
    const fieldSpacing = parseInt(desktop.fieldSpacing.replace('px', ''), 10);
    this.borderRadius.set(borderRadius);
    this.fieldSpacing.set(fieldSpacing);

    // Additional fields
    const resolvedTextPrimary = desktop.textColorPrimary ?? '#1F2937';
    this.textColorPrimary.set(resolvedTextPrimary);
    this.textColorSecondary.set(desktop.textColorSecondary ?? '#6B7280');
    this.labelColor.set(desktop.labelColor ?? resolvedTextPrimary ?? '#374151');
    this.inputBackgroundColor.set(desktop.inputBackgroundColor ?? '#FFFFFF');
    this.inputTextColor.set(desktop.inputTextColor ?? resolvedTextPrimary ?? '#1F2937');
    this.containerBackground.set(desktop.containerBackground);
    this.containerOpacity.set(desktop.containerOpacity);
    this.containerPosition.set(desktop.containerPosition);
    this.thumbnailUrl.set(theme.thumbnailUrl);
  }

  /**
   * Sets the modal to edit mode for a specific theme.
   * @param themeId - ID of the theme to edit
   */
  setEditMode(themeId: string): void {
    this.editModeSignal.set(true);
    this.editThemeIdSignal.set(themeId);
  }

  /**
   * Returns whether the modal is in edit mode.
   * @returns True if editing an existing theme, false if creating new
   */
  isEditMode(): boolean {
    return this.editModeSignal();
  }

  /**
   * Returns the current edit theme ID (undefined if in create mode).
   * @returns Theme ID being edited, or undefined
   */
  getEditThemeId(): string | undefined {
    return this.editThemeIdSignal();
  }

  /**
   * Resets all wizard state to default values.
   * Called when modal is closed or after successful save.
   */
  reset(): void {
    // Reset edit mode state
    this.editModeSignal.set(false);
    this.editThemeIdSignal.set(undefined);

    // Reset wizard step and values
    this.step.set(0);
    this.themeName.set('');
    this.primaryColor.set('#3B82F6');
    this.secondaryColor.set('#10B981');
    this.labelColor.set('#374151');
    this.inputBackgroundColor.set('#FFFFFF');
    this.inputTextColor.set('#1F2937');
    this.backgroundType.set('solid');
    this.backgroundColor.set('#FFFFFF');
    this.gradientColor1.set('#3B82F6');
    this.gradientColor2.set('#10B981');
    this.gradientAngle.set(45);
    this.gradientPosition.set('center');
    this.backgroundImageUrl.set('');
    this.backgroundImageOpacity.set(1);
    this.backgroundImageBlur.set(0);
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
    this.textColorPrimary.set('#1F2937');
    this.textColorSecondary.set('#6B7280');
    this.containerBackground.set('#FFFFFF');
    this.containerOpacity.set(1.0);
    this.containerPosition.set('center');
    this.thumbnailUrl.set('https://via.placeholder.com/300x200');
  }
}
