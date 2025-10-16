import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ColorPickerModule } from 'primeng/colorpicker';
import { Select } from 'primeng/select';
import { SliderModule } from 'primeng/slider';
import { PanelModule } from 'primeng/panel';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FileUploadModule } from 'primeng/fileupload';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { MessageService } from 'primeng/api';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { FormTheme, ResponsiveThemeConfig } from '@nodeangularfullstack/shared';
import { ThemePreviewService } from '../../../tools/components/form-builder/theme-preview.service';
import { ThemeDesignerService } from '../../services/theme-designer.service';
import { ThemePreviewComponent } from '../../components/theme-preview/theme-preview.component';

/**
 * Interface for font options in the designer
 */
interface FontOption {
  label: string;
  value: string;
  family: string;
}

/**
 * Interface for background type options
 */
interface BackgroundType {
  label: string;
  value: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image';
  icon: string;
}

/**
 * Interface for gradient direction options
 */
interface GradientDirection {
  label: string;
  value: string;
  angle: string;
}

/**
 * Theme Designer component providing split-screen interface for creating custom themes.
 * Features real-time preview and comprehensive theme customization options.
 */
@Component({
  selector: 'app-theme-designer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ColorPickerModule,
    Select,
    SliderModule,
    PanelModule,
    CardModule,
    DividerModule,
    ToastModule,
    ProgressSpinnerModule,
    FileUploadModule,
    ToggleButtonModule,
    ThemePreviewComponent,
  ],
  providers: [MessageService],
  templateUrl: './theme-designer.component.html',
  styleUrl: './theme-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeDesignerComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly themePreviewService = inject(ThemePreviewService);
  private readonly themeDesignerService = inject(ThemeDesignerService);
  private readonly destroy$ = new Subject<void>();

  // Form group for theme configuration
  themeForm: FormGroup = this.formBuilder.group({});

  // Preview update subject with debouncing
  private readonly previewUpdate$ = new Subject<FormTheme>();

  // Component state signals
  loading = signal(false);
  saving = signal(false);
  previewMode = signal<'desktop' | 'mobile'>('desktop');
  backgroundType = signal<'solid' | 'linear-gradient' | 'radial-gradient' | 'image'>('solid');

  // Font options for dropdowns
  readonly fontOptions: FontOption[] = [
    {
      label: 'System Default',
      value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      family: 'System',
    },
    { label: 'Arial', value: 'Arial, sans-serif', family: 'Arial' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif', family: 'Helvetica' },
    { label: 'Georgia', value: 'Georgia, serif', family: 'Georgia' },
    { label: 'Times New Roman', value: '"Times New Roman", serif', family: 'Times' },
    { label: 'Courier New', value: '"Courier New", monospace', family: 'Courier' },
    { label: 'Inter (Google)', value: '"Inter", sans-serif', family: 'Inter' },
    { label: 'Roboto (Google)', value: '"Roboto", sans-serif', family: 'Roboto' },
    { label: 'Open Sans (Google)', value: '"Open Sans", sans-serif', family: 'Open Sans' },
    { label: 'Lato (Google)', value: '"Lato", sans-serif', family: 'Lato' },
    { label: 'Montserrat (Google)', value: '"Montserrat", sans-serif', family: 'Montserrat' },
    {
      label: 'Source Sans Pro (Google)',
      value: '"Source Sans Pro", sans-serif',
      family: 'Source Sans Pro',
    },
  ];

  // Background type options
  readonly backgroundTypes: BackgroundType[] = [
    { label: 'Solid Color', value: 'solid', icon: 'pi pi-circle-fill' },
    { label: 'Linear Gradient', value: 'linear-gradient', icon: 'pi pi-chevron-right' },
    { label: 'Radial Gradient', value: 'radial-gradient', icon: 'pi pi-circle' },
    { label: 'Image', value: 'image', icon: 'pi pi-image' },
  ];

  // Gradient direction options
  readonly gradientDirections: GradientDirection[] = [
    { label: 'To Right', value: 'to right', angle: '90deg' },
    { label: 'To Left', value: 'to left', angle: '270deg' },
    { label: 'To Bottom', value: 'to bottom', angle: '180deg' },
    { label: 'To Top', value: 'to top', angle: '0deg' },
    { label: 'To Bottom Right', value: 'to bottom right', angle: '135deg' },
    { label: 'To Bottom Left', value: 'to bottom left', angle: '225deg' },
    { label: 'To Top Right', value: 'to top right', angle: '45deg' },
    { label: 'To Top Left', value: 'to top left', angle: '315deg' },
  ];

  // Container position options
  readonly containerPositions = [
    { label: 'Center', value: 'center', icon: 'pi pi-align-center' },
    { label: 'Top', value: 'top', icon: 'pi pi-align-justify' },
    { label: 'Left', value: 'left', icon: 'pi pi-align-left' },
    { label: 'Full Width', value: 'full-width', icon: 'pi pi-arrows-h' },
  ];

  // Computed current theme for preview
  readonly currentTheme = computed(() => {
    if (!this.themeForm) return null;

    const formValue = this.themeForm.value;
    const themeConfig: ResponsiveThemeConfig = {
      desktop: {
        primaryColor: formValue.primaryColor || '#3B82F6',
        secondaryColor: formValue.secondaryColor || '#6B7280',
        backgroundColor: this.getBackgroundValue(),
        textColorPrimary: formValue.textColorPrimary || '#1F2937',
        textColorSecondary: formValue.textColorSecondary || '#6B7280',
        fontFamilyHeading: formValue.fontFamilyHeading || this.fontOptions[0].value,
        fontFamilyBody: formValue.fontFamilyBody || this.fontOptions[0].value,
        fieldBorderRadius: `${formValue.fieldBorderRadius || 8}px`,
        fieldSpacing: `${formValue.fieldSpacing || 16}px`,
        containerBackground: formValue.containerBackground || '#FFFFFF',
        containerOpacity: formValue.containerOpacity || 1,
        containerPosition: formValue.containerPosition || 'center',
        backgroundImageUrl: formValue.backgroundImageUrl,
        backgroundImagePosition: formValue.backgroundImagePosition || 'cover',
      },
    };

    const theme: FormTheme = {
      id: 'preview',
      name: formValue.name || 'Preview Theme',
      description: formValue.description,
      thumbnailUrl: '',
      themeConfig,
      usageCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isCustom: true,
      creatorId: 'current-user',
    };

    return theme;
  });

  constructor() {
    this.initializeForm();
    this.setupPreviewUpdates();
  }

  ngOnInit(): void {
    this.loadDefaultTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.themePreviewService.clearThemeCss();
  }

  /**
   * Initializes the reactive form with theme configuration controls.
   */
  private initializeForm(): void {
    this.themeForm = this.formBuilder.group({
      // Basic information
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],

      // Colors
      primaryColor: ['#3B82F6', Validators.required],
      secondaryColor: ['#6B7280', Validators.required],
      textColorPrimary: ['#1F2937', Validators.required],
      textColorSecondary: ['#6B7280', Validators.required],

      // Typography
      fontFamilyHeading: [this.fontOptions[0].value, Validators.required],
      fontFamilyBody: [this.fontOptions[0].value, Validators.required],

      // Background
      backgroundSolidColor: ['#F9FAFB', Validators.required],
      gradientColor1: ['#3B82F6', Validators.required],
      gradientColor2: ['#8B5CF6', Validators.required],
      gradientDirection: ['to right', Validators.required],
      backgroundImageUrl: [''],
      backgroundImagePosition: ['cover', Validators.required],

      // Layout
      fieldBorderRadius: [8, [Validators.required, Validators.min(0), Validators.max(50)]],
      fieldSpacing: [16, [Validators.required, Validators.min(4), Validators.max(50)]],
      containerBackground: ['#FFFFFF', Validators.required],
      containerOpacity: [1, [Validators.required, Validators.min(0), Validators.max(1)]],
      containerPosition: ['center', Validators.required],
    });
  }

  /**
   * Sets up debounced preview updates when form values change.
   */
  private setupPreviewUpdates(): void {
    // Create effect to watch form changes
    effect(() => {
      const theme = this.currentTheme();
      if (theme) {
        this.previewUpdate$.next(theme);
      }
    });

    // Debounce preview updates for performance
    this.previewUpdate$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$),
      )
      .subscribe((theme) => {
        this.themePreviewService.applyThemeCss(theme);
      });
  }

  /**
   * Loads default theme values into the form.
   */
  private loadDefaultTheme(): void {
    // Default theme is already set in form initialization
    // Trigger initial preview update
    const theme = this.currentTheme();
    if (theme) {
      this.themePreviewService.applyThemeCss(theme);
    }
  }

  /**
   * Gets the computed background value based on selected type.
   */
  private getBackgroundValue(): string {
    const type = this.backgroundType();
    const formValue = this.themeForm?.value;
    const DEFAULT_BG = '#F9FAFB';
    const DEFAULT_PRIMARY = '#3B82F6';
    const DEFAULT_SECONDARY = '#8B5CF6';
    const DEFAULT_DIRECTION = 'to right';

    if (!formValue) return DEFAULT_BG;

    switch (type) {
      case 'solid':
        return formValue.backgroundSolidColor ?? DEFAULT_BG;
      case 'linear-gradient':
        return `linear-gradient(${formValue.gradientDirection ?? DEFAULT_DIRECTION}, ${formValue.gradientColor1 ?? DEFAULT_PRIMARY}, ${formValue.gradientColor2 ?? DEFAULT_SECONDARY})`;
      case 'radial-gradient':
        return `radial-gradient(circle, ${formValue.gradientColor1 ?? DEFAULT_PRIMARY}, ${formValue.gradientColor2 ?? DEFAULT_SECONDARY})`;
      case 'image':
        return formValue.backgroundImageUrl ? `url(${formValue.backgroundImageUrl})` : DEFAULT_BG;
      default:
        return DEFAULT_BG;
    }
  }

  /**
   * Handles background type selection change.
   */
  onBackgroundTypeChange(type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'): void {
    this.backgroundType.set(type);
  }

  /**
   * Toggles preview mode between desktop and mobile.
   */
  togglePreviewMode(): void {
    const current = this.previewMode();
    this.previewMode.set(current === 'desktop' ? 'mobile' : 'desktop');
  }

  /**
   * Handles file upload for background image.
   */
  onImageUpload(event: any): void {
    const file = event.files[0];
    if (file) {
      // In a real implementation, this would upload to a file service
      // For now, we'll create a blob URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.themeForm.patchValue({ backgroundImageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Resets the theme form to default values.
   */
  resetTheme(): void {
    this.themeForm.reset();
    this.backgroundType.set('solid');
    this.loadDefaultTheme();
    this.messageService.add({
      severity: 'info',
      summary: 'Theme Reset',
      detail: 'Theme has been reset to default values.',
    });
  }

  /**
   * Saves the current theme configuration.
   */
  saveTheme(): void {
    if (this.themeForm.invalid) {
      this.markFormGroupTouched(this.themeForm);
      this.messageService.add({
        severity: 'error',
        summary: 'Form Invalid',
        detail: 'Please fix the validation errors before saving.',
      });
      return;
    }

    const theme = this.currentTheme();
    if (!theme) return;

    this.saving.set(true);

    this.themeDesignerService.createCustomTheme(theme).subscribe({
      next: (savedTheme) => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Theme Saved',
          detail: `Theme "${savedTheme.name}" has been created successfully.`,
        });
        // Navigate back to themes list or wherever appropriate
        this.router.navigate(['/app/admin/themes']);
      },
      error: (error) => {
        this.saving.set(false);
        console.error('Failed to save theme:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error.message || 'Failed to save theme. Please try again.',
        });
      },
    });
  }

  /**
   * Navigates back to the themes list.
   */
  goBack(): void {
    this.router.navigate(['/app/admin/themes']);
  }

  /**
   * Marks all form controls as touched to show validation errors.
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Gets form control error message.
   */
  getFieldError(fieldName: string): string {
    const control = this.themeForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['maxlength']) return `${fieldName} is too long`;
      if (control.errors['min']) return `Value is too small`;
      if (control.errors['max']) return `Value is too large`;
    }
    return '';
  }

  /**
   * Checks if a form field has errors.
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.themeForm.get(fieldName);
    return !!(control?.errors && control.touched);
  }
}
