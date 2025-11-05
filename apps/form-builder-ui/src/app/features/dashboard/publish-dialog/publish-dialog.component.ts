import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { IframeEmbedGeneratorComponent } from '../iframe-embed-generator/iframe-embed-generator.component';
import { AccordionModule } from 'primeng/accordion';
import {QrCodeDisplayComponent} from '@features/admin/components/qr-code-display.component';

/**
 * Publish dialog component for form publishing workflow.
 * Displays expiration date/time picker and render URL preview.
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

  /** Emits when dialog visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when user clicks publish button with expiration date or null for no expiration */
  @Output() publish = new EventEmitter<Date | null>();

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

  constructor() {
    // Calculate default expiration date (30 days from now)
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30);

    // Calculate maximum expiration date (1 year from now)
    this.maxDate = new Date();
    this.maxDate.setFullYear(this.maxDate.getFullYear() + 1);

    // Initialize form with expiration toggle and date controls
    this.publishForm = new FormGroup({
      useCustomExpiration: new FormControl(false), // Default to no expiration
      expirationDate: new FormControl(defaultExpiration),
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
   * Validates form and emits publish event with expiration date.
   */
  onPublish(): void {
    if (this.publishForm.valid && !this.loading) {
      const useCustomExpiration = this.publishForm.value.useCustomExpiration;
      const expirationDate = useCustomExpiration
        ? (this.publishForm.value.expirationDate as Date)
        : null;
      this.publish.emit(expirationDate);
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
    });
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
}
