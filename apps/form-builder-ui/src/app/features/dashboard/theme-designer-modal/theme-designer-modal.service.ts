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

  // Step 5: Preview Elements
  private readonly previewTextColor = signal('#1F2937');
  private readonly previewBackgroundColor = signal('#FFFFFF');
  private readonly previewBorderColor = signal('#D1D5DB');
  private readonly previewBorderRadius = signal(8);

  // Epic 25: Container Styling Properties
  // Background Properties
  private readonly containerBackgroundColor = signal('#FFFFFF');
  private readonly containerBackgroundImageUrl = signal('');
  private readonly containerBackgroundSize = signal<'cover' | 'contain' | 'repeat' | 'no-repeat'>(
    'cover',
  );
  private readonly containerBackgroundPositionX = signal(50);
  private readonly containerBackgroundPositionY = signal(50);

  // Border Properties
  private readonly containerBorderEnabled = signal(false);
  private readonly containerBorderWidth = signal(1);
  private readonly containerBorderColor = signal('#D1D5DB');
  private readonly containerBorderRadius = signal(8);
  private readonly containerBorderStyle = signal<
    'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset'
  >('solid');

  // Shadow Properties
  private readonly containerShadowEnabled = signal(false);
  private readonly containerShadowPreset = signal<
    'subtle' | 'medium' | 'strong' | 'custom' | 'none'
  >('medium');
  private readonly containerShadowIntensity = signal(10);
  private readonly containerShadowColor = signal('rgba(0, 0, 0, 0.1)');
  private readonly containerShadowOffsetX = signal(0);
  private readonly containerShadowOffsetY = signal(4);
  private readonly containerShadowBlur = signal(6);
  private readonly containerShadowSpread = signal(0);

  // Layout Properties
  private readonly containerAlignmentHorizontal = signal<'left' | 'center' | 'right' | 'stretch'>(
    'center',
  );
  private readonly containerAlignmentVertical = signal<'top' | 'center' | 'bottom' | 'stretch'>(
    'center',
  );
  private readonly containerMaxWidth = signal(1024);

  // Effects Properties
  private readonly containerOpacityValue = signal(100);
  private readonly containerBackdropBlurEnabled = signal(false);
  private readonly containerBackdropBlurIntensity = signal(0);

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
          containerPosition: this.containerPosition(),
          previewTextColor: this.previewTextColor(),
          previewBackgroundColor: this.previewBackgroundColor(),
          previewBorderColor: this.previewBorderColor(),
          previewBorderRadius: `${this.previewBorderRadius()}px`,

          // Epic 25: Container Styling Properties
          containerBackgroundColor: this.containerBackgroundColor(),
          containerBackgroundImageUrl: this.containerBackgroundImageUrl() || undefined,
          containerBackgroundSize: this.containerBackgroundSize(),
          containerBackgroundPositionX: this.containerBackgroundPositionX(),
          containerBackgroundPositionY: this.containerBackgroundPositionY(),
          containerBorderEnabled: this.containerBorderEnabled(),
          containerBorderWidth: this.containerBorderWidth(),
          containerBorderColor: this.containerBorderColor(),
          containerBorderRadius: this.containerBorderRadius(),
          containerBorderStyle: this.containerBorderStyle(),
          containerShadowEnabled: this.containerShadowEnabled(),
          containerShadowPreset: this.containerShadowPreset(),
          containerShadowIntensity: this.containerShadowIntensity(),
          containerShadowColor: this.containerShadowColor(),
          containerShadowOffsetX: this.containerShadowOffsetX(),
          containerShadowOffsetY: this.containerShadowOffsetY(),
          containerShadowBlur: this.containerShadowBlur(),
          containerShadowSpread: this.containerShadowSpread(),
          containerAlignmentHorizontal: this.containerAlignmentHorizontal(),
          containerAlignmentVertical: this.containerAlignmentVertical(),
          containerMaxWidth: this.containerMaxWidth(),
          containerOpacity: this.containerOpacityValue(),
          containerBackdropBlurEnabled: this.containerBackdropBlurEnabled(),
          containerBackdropBlurIntensity: this.containerBackdropBlurIntensity(),
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
      case 4: // Step 5: Preview Elements
        return true; // Preview elements defaults are valid
      case 5: // Step 6: Visual Preview
        return true; // Visual preview is always valid (no user input required)
      case 6: // Step 7: Preview & Save
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

  // Preview Elements getters/setters
  getPreviewTextColor = () => this.previewTextColor();
  setPreviewTextColor = (value: string) => this.previewTextColor.set(value);

  getPreviewBackgroundColor = () => this.previewBackgroundColor();
  setPreviewBackgroundColor = (value: string) => this.previewBackgroundColor.set(value);

  getPreviewBorderColor = () => this.previewBorderColor();
  setPreviewBorderColor = (value: string) => this.previewBorderColor.set(value);

  getPreviewBorderRadius = () => this.previewBorderRadius();
  setPreviewBorderRadius = (value: number) => this.previewBorderRadius.set(value);

  // Epic 25: Container Styling Getters
  /** Get container background color in hex format. */
  getContainerBackgroundColor = (): string => this.containerBackgroundColor();

  /** Get container background image URL (base64 or external URL). */
  getContainerBackgroundImageUrl = (): string => this.containerBackgroundImageUrl();

  /** Get container background image size/repeat mode. */
  getContainerBackgroundSize = (): 'cover' | 'contain' | 'repeat' | 'no-repeat' =>
    this.containerBackgroundSize();

  /** Get container background image horizontal position as percentage (0-100). */
  getContainerBackgroundPositionX = (): number => this.containerBackgroundPositionX();

  /** Get container background image vertical position as percentage (0-100). */
  getContainerBackgroundPositionY = (): number => this.containerBackgroundPositionY();

  /** Get whether container border is enabled. */
  getContainerBorderEnabled = (): boolean => this.containerBorderEnabled();

  /** Get container border width in pixels (0-10). */
  getContainerBorderWidth = (): number => this.containerBorderWidth();

  /** Get container border color in hex format. */
  getContainerBorderColor = (): string => this.containerBorderColor();

  /** Get container border radius in pixels (0-50). */
  getContainerBorderRadius = (): number => this.containerBorderRadius();

  /** Get container border style. */
  getContainerBorderStyle = ():
    | 'solid'
    | 'dashed'
    | 'dotted'
    | 'double'
    | 'groove'
    | 'ridge'
    | 'inset'
    | 'outset' => this.containerBorderStyle();

  /** Get whether container box shadow is enabled. */
  getContainerShadowEnabled = (): boolean => this.containerShadowEnabled();

  /** Get shadow preset (subtle, medium, strong, custom, none). */
  getContainerShadowPreset = (): 'subtle' | 'medium' | 'strong' | 'custom' | 'none' =>
    this.containerShadowPreset();

  /** Get shadow intensity in pixels (0-30). */
  getContainerShadowIntensity = (): number => this.containerShadowIntensity();

  /** Get shadow color in rgba format. */
  getContainerShadowColor = (): string => this.containerShadowColor();

  /** Get shadow horizontal offset in pixels. */
  getContainerShadowOffsetX = (): number => this.containerShadowOffsetX();

  /** Get shadow vertical offset in pixels. */
  getContainerShadowOffsetY = (): number => this.containerShadowOffsetY();

  /** Get shadow blur radius in pixels. */
  getContainerShadowBlur = (): number => this.containerShadowBlur();

  /** Get shadow spread radius in pixels. */
  getContainerShadowSpread = (): number => this.containerShadowSpread();

  /** Get container horizontal alignment. */
  getContainerAlignmentHorizontal = (): 'left' | 'center' | 'right' | 'stretch' =>
    this.containerAlignmentHorizontal();

  /** Get container vertical alignment. */
  getContainerAlignmentVertical = (): 'top' | 'center' | 'bottom' | 'stretch' =>
    this.containerAlignmentVertical();

  /** Get container maximum width in pixels (300-1200). */
  getContainerMaxWidth = (): number => this.containerMaxWidth();

  /** Get container opacity as percentage (0-100). */
  getContainerOpacityValue = (): number => this.containerOpacityValue();

  /** Get whether backdrop blur effect is enabled. */
  getContainerBackdropBlurEnabled = (): boolean => this.containerBackdropBlurEnabled();

  /** Get backdrop blur intensity in pixels (0-20). */
  getContainerBackdropBlurIntensity = (): number => this.containerBackdropBlurIntensity();

  // Epic 25: Container Styling Setters (with validation)
  /**
   * Set container background color in hex format.
   * @param value - Hex color string (e.g., '#FFFFFF')
   */
  setContainerBackgroundColor = (value: string): void => {
    this.containerBackgroundColor.set(value);
  };

  /**
   * Set container background image URL.
   * @param value - Base64 data URI or external image URL
   */
  setContainerBackgroundImageUrl = (value: string): void => {
    this.containerBackgroundImageUrl.set(value);
  };

  /**
   * Set container background image size/repeat mode.
   * @param value - Background size mode
   */
  setContainerBackgroundSize = (value: 'cover' | 'contain' | 'repeat' | 'no-repeat'): void => {
    this.containerBackgroundSize.set(value);
  };

  /**
   * Set container background image horizontal position.
   * @param value - Horizontal position as percentage (clamped to 0-100)
   */
  setContainerBackgroundPositionX = (value: number): void => {
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped !== value) {
      console.warn(`Container background position X clamped from ${value} to ${clamped}`);
    }
    this.containerBackgroundPositionX.set(clamped);
  };

  /**
   * Set container background image vertical position.
   * @param value - Vertical position as percentage (clamped to 0-100)
   */
  setContainerBackgroundPositionY = (value: number): void => {
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped !== value) {
      console.warn(`Container background position Y clamped from ${value} to ${clamped}`);
    }
    this.containerBackgroundPositionY.set(clamped);
  };

  /**
   * Set whether container border is enabled.
   * @param value - Enable or disable border
   */
  setContainerBorderEnabled = (value: boolean): void => {
    this.containerBorderEnabled.set(value);
  };

  /**
   * Set container border width in pixels.
   * @param value - Width in pixels (clamped to 0-10)
   */
  setContainerBorderWidth = (value: number): void => {
    const clamped = Math.max(0, Math.min(10, value));
    if (clamped !== value) {
      console.warn(`Container border width clamped from ${value} to ${clamped}`);
    }
    this.containerBorderWidth.set(clamped);
  };

  /**
   * Set container border color in hex format.
   * @param value - Hex color string (e.g., '#D1D5DB')
   */
  setContainerBorderColor = (value: string): void => {
    this.containerBorderColor.set(value);
  };

  /**
   * Set container border radius in pixels.
   * @param value - Radius in pixels (clamped to 0-50)
   */
  setContainerBorderRadius = (value: number): void => {
    const clamped = Math.max(0, Math.min(50, value));
    if (clamped !== value) {
      console.warn(`Container border radius clamped from ${value} to ${clamped}`);
    }
    this.containerBorderRadius.set(clamped);
  };

  /**
   * Set container border style.
   * @param value - Border style (solid, dashed, dotted, etc.)
   */
  setContainerBorderStyle = (
    value: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset',
  ): void => {
    this.containerBorderStyle.set(value);
  };

  /**
   * Set whether container box shadow is enabled.
   * @param value - Enable or disable shadow
   */
  setContainerShadowEnabled = (value: boolean): void => {
    this.containerShadowEnabled.set(value);
  };

  /**
   * Set shadow preset.
   * @param value - Preset (subtle, medium, strong, custom, none)
   */
  setContainerShadowPreset = (value: 'subtle' | 'medium' | 'strong' | 'custom' | 'none'): void => {
    this.containerShadowPreset.set(value);
  };

  /**
   * Set shadow intensity in pixels.
   * @param value - Intensity in pixels (clamped to 0-30)
   */
  setContainerShadowIntensity = (value: number): void => {
    const clamped = Math.max(0, Math.min(30, value));
    if (clamped !== value) {
      console.warn(`Container shadow intensity clamped from ${value} to ${clamped}`);
    }
    this.containerShadowIntensity.set(clamped);
  };

  /**
   * Set shadow color in rgba format.
   * @param value - RGBA color string (e.g., 'rgba(0, 0, 0, 0.1)')
   */
  setContainerShadowColor = (value: string): void => {
    this.containerShadowColor.set(value);
  };

  /**
   * Set shadow horizontal offset in pixels.
   * @param value - Horizontal offset in pixels
   */
  setContainerShadowOffsetX = (value: number): void => {
    this.containerShadowOffsetX.set(value);
  };

  /**
   * Set shadow vertical offset in pixels.
   * @param value - Vertical offset in pixels
   */
  setContainerShadowOffsetY = (value: number): void => {
    this.containerShadowOffsetY.set(value);
  };

  /**
   * Set shadow blur radius in pixels.
   * @param value - Blur radius in pixels
   */
  setContainerShadowBlur = (value: number): void => {
    this.containerShadowBlur.set(value);
  };

  /**
   * Set shadow spread radius in pixels.
   * @param value - Spread radius in pixels
   */
  setContainerShadowSpread = (value: number): void => {
    this.containerShadowSpread.set(value);
  };

  /**
   * Set container horizontal alignment.
   * @param value - Horizontal alignment (left, center, right, stretch)
   */
  setContainerAlignmentHorizontal = (value: 'left' | 'center' | 'right' | 'stretch'): void => {
    this.containerAlignmentHorizontal.set(value);
  };

  /**
   * Set container vertical alignment.
   * @param value - Vertical alignment (top, center, bottom, stretch)
   */
  setContainerAlignmentVertical = (value: 'top' | 'center' | 'bottom' | 'stretch'): void => {
    this.containerAlignmentVertical.set(value);
  };

  /**
   * Set container maximum width in pixels.
   * @param value - Maximum width in pixels (clamped to 300-1200)
   */
  setContainerMaxWidth = (value: number): void => {
    const clamped = Math.max(300, Math.min(1200, value));
    if (clamped !== value) {
      console.warn(`Container max width clamped from ${value} to ${clamped}`);
    }
    this.containerMaxWidth.set(clamped);
  };

  /**
   * Set container opacity as percentage.
   * @param value - Opacity percentage (clamped to 0-100)
   */
  setContainerOpacityValue = (value: number): void => {
    const clamped = Math.max(0, Math.min(100, value));
    if (clamped !== value) {
      console.warn(`Container opacity clamped from ${value} to ${clamped}`);
    }
    this.containerOpacityValue.set(clamped);
  };

  /**
   * Set whether backdrop blur effect is enabled.
   * @param value - Enable or disable backdrop blur
   */
  setContainerBackdropBlurEnabled = (value: boolean): void => {
    this.containerBackdropBlurEnabled.set(value);
  };

  /**
   * Set backdrop blur intensity in pixels.
   * @param value - Blur intensity in pixels (clamped to 0-20)
   */
  setContainerBackdropBlurIntensity = (value: number): void => {
    const clamped = Math.max(0, Math.min(20, value));
    if (clamped !== value) {
      console.warn(`Container backdrop blur intensity clamped from ${value} to ${clamped}`);
    }
    this.containerBackdropBlurIntensity.set(clamped);
  };

  /**
   * Advances to the next wizard step.
   * Only proceeds if current step validation passes.
   */
  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.step.update((s) => Math.min(s + 1, 6));
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
   * @param stepIndex - Target step index (0-6)
   */
  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex <= 6) {
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
    this.containerOpacity.set(desktop.containerOpacity ?? 1.0);
    this.containerPosition.set(desktop.containerPosition);
    this.thumbnailUrl.set(theme.thumbnailUrl);

    // Step 5: Preview Elements
    this.previewTextColor.set(desktop.previewTextColor ?? '#1F2937');
    this.previewBackgroundColor.set(desktop.previewBackgroundColor ?? '#FFFFFF');
    this.previewBorderColor.set(desktop.previewBorderColor ?? '#D1D5DB');
    const previewBorderRadius = desktop.previewBorderRadius
      ? parseInt(desktop.previewBorderRadius.replace('px', ''), 10)
      : 8;
    this.previewBorderRadius.set(previewBorderRadius);

    // Epic 25: Container Styling Properties (with backward compatibility)
    this.containerBackgroundColor.set(desktop.containerBackgroundColor ?? '#FFFFFF');
    this.containerBackgroundImageUrl.set(desktop.containerBackgroundImageUrl ?? '');
    this.containerBackgroundSize.set(desktop.containerBackgroundSize ?? 'cover');
    this.containerBackgroundPositionX.set(desktop.containerBackgroundPositionX ?? 50);
    this.containerBackgroundPositionY.set(desktop.containerBackgroundPositionY ?? 50);
    this.containerBorderEnabled.set(desktop.containerBorderEnabled ?? false);
    this.containerBorderWidth.set(desktop.containerBorderWidth ?? 1);
    this.containerBorderColor.set(desktop.containerBorderColor ?? '#D1D5DB');
    this.containerBorderRadius.set(desktop.containerBorderRadius ?? 8);
    this.containerBorderStyle.set(desktop.containerBorderStyle ?? 'solid');
    this.containerShadowEnabled.set(desktop.containerShadowEnabled ?? false);
    this.containerShadowPreset.set(desktop.containerShadowPreset ?? 'medium');
    this.containerShadowIntensity.set(desktop.containerShadowIntensity ?? 10);
    this.containerShadowColor.set(desktop.containerShadowColor ?? 'rgba(0, 0, 0, 0.1)');
    this.containerShadowOffsetX.set(desktop.containerShadowOffsetX ?? 0);
    this.containerShadowOffsetY.set(desktop.containerShadowOffsetY ?? 4);
    this.containerShadowBlur.set(desktop.containerShadowBlur ?? 6);
    this.containerShadowSpread.set(desktop.containerShadowSpread ?? 0);
    this.containerAlignmentHorizontal.set(desktop.containerAlignmentHorizontal ?? 'center');
    this.containerAlignmentVertical.set(desktop.containerAlignmentVertical ?? 'center');
    this.containerMaxWidth.set(desktop.containerMaxWidth ?? 1024);
    this.containerOpacityValue.set(desktop.containerOpacity ?? 100);
    this.containerBackdropBlurEnabled.set(desktop.containerBackdropBlurEnabled ?? false);
    this.containerBackdropBlurIntensity.set(desktop.containerBackdropBlurIntensity ?? 0);
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
    this.previewTextColor.set('#1F2937');
    this.previewBackgroundColor.set('#FFFFFF');
    this.previewBorderColor.set('#D1D5DB');
    this.previewBorderRadius.set(8);

    // Epic 25: Reset container styling properties
    this.containerBackgroundColor.set('#FFFFFF');
    this.containerBackgroundImageUrl.set('');
    this.containerBackgroundSize.set('cover');
    this.containerBackgroundPositionX.set(50);
    this.containerBackgroundPositionY.set(50);
    this.containerBorderEnabled.set(false);
    this.containerBorderWidth.set(1);
    this.containerBorderColor.set('#D1D5DB');
    this.containerBorderRadius.set(8);
    this.containerBorderStyle.set('solid');
    this.containerShadowEnabled.set(false);
    this.containerShadowPreset.set('medium');
    this.containerShadowIntensity.set(10);
    this.containerShadowColor.set('rgba(0, 0, 0, 0.1)');
    this.containerShadowOffsetX.set(0);
    this.containerShadowOffsetY.set(4);
    this.containerShadowBlur.set(6);
    this.containerShadowSpread.set(0);
    this.containerAlignmentHorizontal.set('center');
    this.containerAlignmentVertical.set('center');
    this.containerMaxWidth.set(1024);
    this.containerOpacityValue.set(100);
    this.containerBackdropBlurEnabled.set(false);
    this.containerBackdropBlurIntensity.set(0);
  }

  /**
   * Resets only container styling properties to default values.
   * Used when user wants to clear container styling without affecting other theme properties.
   */
  clearContainerStyling(): void {
    this.containerBackgroundColor.set('#FFFFFF');
    this.containerBackgroundImageUrl.set('');
    this.containerBackgroundSize.set('cover');
    this.containerBackgroundPositionX.set(50);
    this.containerBackgroundPositionY.set(50);
    this.containerBorderEnabled.set(false);
    this.containerBorderWidth.set(1);
    this.containerBorderColor.set('#D1D5DB');
    this.containerBorderRadius.set(8);
    this.containerBorderStyle.set('solid');
    this.containerShadowEnabled.set(false);
    this.containerShadowPreset.set('medium');
    this.containerShadowIntensity.set(10);
    this.containerShadowColor.set('rgba(0, 0, 0, 0.1)');
    this.containerShadowOffsetX.set(0);
    this.containerShadowOffsetY.set(4);
    this.containerShadowBlur.set(6);
    this.containerShadowSpread.set(0);
    this.containerAlignmentHorizontal.set('center');
    this.containerAlignmentVertical.set('center');
    this.containerMaxWidth.set(1024);
    this.containerOpacityValue.set(100);
    this.containerBackdropBlurEnabled.set(false);
    this.containerBackdropBlurIntensity.set(0);
  }
}
