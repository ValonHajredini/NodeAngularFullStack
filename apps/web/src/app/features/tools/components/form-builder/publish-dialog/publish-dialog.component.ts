import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

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

  /** Render URL after successful publish */
  @Input() renderUrl?: string;

  /** Emits when dialog visibility changes */
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Emits when user clicks publish button with expiration date */
  @Output() publish = new EventEmitter<Date>();

  /** Emits when user clicks copy URL button */
  @Output() copyUrl = new EventEmitter<void>();

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

    // Initialize form with expiration date/time controls
    this.publishForm = new FormGroup({
      expirationDate: new FormControl(defaultExpiration, Validators.required),
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
      const expirationDate = this.publishForm.value.expirationDate as Date;
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
   * Resets the form to default values.
   */
  private resetForm(): void {
    const defaultExpiration = new Date();
    defaultExpiration.setDate(defaultExpiration.getDate() + 30);
    this.publishForm.reset({
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
   * Checks if form has validation errors.
   * @returns true if form is invalid
   */
  get hasFormErrors(): boolean {
    return this.publishForm.invalid && this.publishForm.dirty;
  }
}
