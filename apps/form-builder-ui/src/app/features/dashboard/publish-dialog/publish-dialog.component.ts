import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { IframeEmbedGeneratorComponent } from '../iframe-embed-generator/iframe-embed-generator.component';
import { AccordionModule } from 'primeng/accordion';
import {QrCodeDisplayComponent} from '../../tools/components/short-link/components/qr-code-display/qr-code-display.component';
import { IframeEmbedOptions } from '@nodeangularfullstack/shared';

/**
 * Data emitted when publishing a form
 */
export interface PublishFormData {
  /** Token expiration date (null for no expiration) */
  expirationDate: Date | null;
  /** Optional iframe embed configuration */
  iframeEmbedOptions?: IframeEmbedOptions;
}

/**
 * Size preset option for iframe embed generator
 */
interface SizePreset {
  label: string;
  value: string;
  width: string;
  height: string;
}

/**
 * Publish dialog component for form publishing workflow.
 * Displays expiration date/time picker, iframe settings, and render URL preview.
 */
@Component({
  selector: 'app-publish-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    CheckboxModule,
    SelectModule,
    QrCodeDisplayComponent,
    IframeEmbedGeneratorComponent,
    AccordionModule,
  ],
  templateUrl: './publish-dialog.component.html',
  styleUrls: ['./publish-dialog.component.scss'],
})
export class PublishDialogComponent {
  /** Whether the publish dialog is visible */
  @Input() visible = false;

  /** Loading state during publish API call */
  @Input() loading = false;

  /** Validation errors from schema validation */
  @Input() validationErrors: string[] = [];

  /** Render URL after successful publish (JWT token URL - kept for backward compatibility) */
  @Input() renderUrl?: string;

  /** Short link URL for easy sharing (preferred for displaying to users) */
  @Input() shortUrl?: string;

  /** QR code storage URL for display (Story 26.3) */
  @Input() qrCodeUrl?: string;

  /** Whether QR code generation was successful (Story 26.3) */
  @Input() qrCodeGenerated = false;

  /** Loading state for QR code generation (Story 26.3) */
  @Input() qrCodeLoading = false;

  /** Form title for iframe embed generator (Story 26.4) */
  @Input() formTitle?: string;

  /** Form short code for iframe embed generator (Story 26.4) */
  @Input() shortCode?: string;

  /** Published iframe embed options (saved when publishing) */
  publishedIframeOptions?: IframeEmbedOptions;

  /** Emits when dialog visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when user clicks publish button with form data (expiration and iframe settings) */
  @Output() publish = new EventEmitter<PublishFormData>();

  /** Emits when user clicks copy URL button */
  @Output() copyUrl = new EventEmitter<void>();

  /** Emits when user downloads QR code (Story 26.3) */
  @Output() downloadQrCode = new EventEmitter<void>();

  /** Reactive form for expiration date/time selection */
  publishForm: FormGroup;

  /** Minimum date for expiration (today) */
  minDate = new Date();

  /** Maximum date for expiration (1 year from now) */
  maxDate: Date;

  /** Size preset options for iframe embed */
  sizePresets: SizePreset[] = [
    { label: 'Small (400×600)', value: 'small', width: '400px', height: '600px' },
    { label: 'Medium (600×800)', value: 'medium', width: '600px', height: '800px' },
    { label: 'Large (800×1000)', value: 'large', width: '800px', height: '1000px' },
    { label: 'Custom', value: 'custom', width: '600px', height: '800px' },
  ];

  constructor() {
    // Calculate default expiration date (30 days from now)
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30);

    // Calculate maximum expiration date (1 year from now)
    this.maxDate = new Date();
    this.maxDate.setFullYear(this.maxDate.getFullYear() + 1);

    // Initialize form with expiration, iframe embed controls
    this.publishForm = new FormGroup({
      useCustomExpiration: new FormControl(false), // Default to no expiration
      expirationDate: new FormControl(defaultExpiration),
      // Iframe embed controls
      useIframeEmbed: new FormControl(true), // Checked by default
      preset: new FormControl('medium'),
      width: new FormControl('600px'),
      height: new FormControl('800px'),
      fullWidth: new FormControl(false), // Full width option
      responsive: new FormControl(true),
      showBorder: new FormControl(false),
      allowScrolling: new FormControl(true),
      title: new FormControl(''),
    });

    // Subscribe to expiration toggle changes to update validation
    this.publishForm.get('useCustomExpiration')?.valueChanges.subscribe((useCustom: boolean) => {
      const expirationControl = this.publishForm.get('expirationDate');
      if (useCustom) {
        expirationControl?.setValidators([Validators.required]);
      } else {
        expirationControl?.clearValidators();
      }
      expirationControl?.updateValueAndValidity();
    });

    // Subscribe to preset changes to auto-fill width/height
    this.publishForm.get('preset')?.valueChanges.subscribe((presetValue: string) => {
      const preset = this.sizePresets.find(p => p.value === presetValue);
      if (preset && preset.value !== 'custom') {
        this.publishForm.patchValue({
          width: preset.width,
          height: preset.height
        }, { emitEvent: false });
      }
    });

    // Subscribe to fullWidth toggle changes to update width
    this.publishForm.get('fullWidth')?.valueChanges.subscribe((isFullWidth: boolean) => {
      if (isFullWidth) {
        this.publishForm.patchValue({
          width: '100%'
        }, { emitEvent: false });
      } else {
        // Restore width from current preset
        const currentPreset = this.publishForm.get('preset')?.value;
        const preset = this.sizePresets.find(p => p.value === currentPreset);
        if (preset && preset.value !== 'custom') {
          this.publishForm.patchValue({
            width: preset.width
          }, { emitEvent: false });
        }
      }
    });
  }

  /**
   * Handles dialog visibility change.
   * @param visible - New visibility state
   */
  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  /**
   * Handles publish button click.
   * Validates form and emits publish event with expiration date and iframe settings.
   */
  onPublish(): void {
    if (this.publishForm.valid && !this.loading) {
      const useCustomExpiration = this.publishForm.value.useCustomExpiration;
      const expirationDate = useCustomExpiration
        ? (this.publishForm.value.expirationDate as Date)
        : null;

      // Build iframe embed options if enabled
      let iframeEmbedOptions: IframeEmbedOptions | undefined;
      if (this.publishForm.value.useIframeEmbed) {
        iframeEmbedOptions = {
          width: this.publishForm.value.width,
          height: this.publishForm.value.height,
          responsive: this.publishForm.value.responsive,
          showBorder: this.publishForm.value.showBorder,
          allowScrolling: this.publishForm.value.allowScrolling,
          title: this.publishForm.value.title || this.formTitle || 'Form',
        };

        // Save iframe options for later use in embed generator
        this.publishedIframeOptions = iframeEmbedOptions;
      }

      this.publish.emit({
        expirationDate,
        iframeEmbedOptions,
      });
    }
  }

  /**
   * Handles copy URL button click.
   * Emits copyUrl event to parent component.
   */
  onCopyUrl(): void {
    this.copyUrl.emit();
  }

  /**
   * Handles QR code download button click.
   * Story 26.3: Integrated QR Code Generation and Display
   * Emits downloadQrCode event to parent component.
   */
  onDownloadQrCode(): void {
    this.downloadQrCode.emit();
  }

  /**
   * Resets the form to default values.
   */
  private resetForm(): void {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30);
    this.publishForm.reset({
      useCustomExpiration: false,
      expirationDate: defaultExpiration,
      useIframeEmbed: true,
      preset: 'medium',
      width: '600px',
      height: '800px',
      fullWidth: false,
      responsive: true,
      showBorder: false,
      allowScrolling: true,
      title: '',
    });

    // Clear published iframe options
    this.publishedIframeOptions = undefined;
  }

  /**
   * Gets the form control for expiration date.
   * @returns FormControl for expiration date
   */
  get expirationDate(): FormControl {
    return this.publishForm.get('expirationDate') as FormControl;
  }

  /**
   * Gets the form control for custom expiration toggle.
   * @returns FormControl for custom expiration toggle
   */
  get useCustomExpiration(): FormControl {
    return this.publishForm.get('useCustomExpiration') as FormControl;
  }

  /**
   * Checks if custom expiration is enabled.
   * @returns true if custom expiration is enabled
   */
  get isCustomExpirationEnabled(): boolean {
    return this.publishForm.get('useCustomExpiration')?.value ?? false;
  }

  /**
   * Checks if form has validation errors.
   * @returns true if form is invalid
   */
  get hasFormErrors(): boolean {
    return this.publishForm.invalid && this.publishForm.dirty;
  }

  /**
   * Gets the form control for iframe embed toggle.
   * @returns FormControl for iframe embed toggle
   */
  get useIframeEmbed(): FormControl {
    return this.publishForm.get('useIframeEmbed') as FormControl;
  }

  /**
   * Checks if iframe embed is enabled.
   * @returns true if iframe embed is enabled
   */
  get isIframeEmbedEnabled(): boolean {
    return this.publishForm.get('useIframeEmbed')?.value ?? false;
  }

  /**
   * Checks if custom preset is selected.
   * @returns true if custom preset is selected
   */
  get isCustomPreset(): boolean {
    return this.publishForm.get('preset')?.value === 'custom';
  }

  /**
   * Gets the form control for iframe preset.
   * @returns FormControl for iframe preset
   */
  get preset(): FormControl {
    return this.publishForm.get('preset') as FormControl;
  }

  /**
   * Gets the form control for iframe width.
   * @returns FormControl for iframe width
   */
  get width(): FormControl {
    return this.publishForm.get('width') as FormControl;
  }

  /**
   * Gets the form control for iframe height.
   * @returns FormControl for iframe height
   */
  get height(): FormControl {
    return this.publishForm.get('height') as FormControl;
  }

  /**
   * Gets the form control for responsive width.
   * @returns FormControl for responsive width
   */
  get responsive(): FormControl {
    return this.publishForm.get('responsive') as FormControl;
  }

  /**
   * Gets the form control for show border.
   * @returns FormControl for show border
   */
  get showBorder(): FormControl {
    return this.publishForm.get('showBorder') as FormControl;
  }

  /**
   * Gets the form control for allow scrolling.
   * @returns FormControl for allow scrolling
   */
  get allowScrolling(): FormControl {
    return this.publishForm.get('allowScrolling') as FormControl;
  }

  /**
   * Gets the form control for iframe title.
   * @returns FormControl for iframe title
   */
  get iframeTitle(): FormControl {
    return this.publishForm.get('title') as FormControl;
  }
}
