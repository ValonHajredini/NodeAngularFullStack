import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DatePicker } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { FormTheme } from '@nodeangularfullstack/shared';
import { ThemePreviewService } from '../../../tools/components/form-builder/theme-preview.service';

// SampleField interface removed as it was unused
// Form fields are defined directly in the component for clarity

/**
 * Theme Preview component that renders a sample form with the selected theme applied.
 * Used within the Theme Designer to show real-time theme changes.
 */
@Component({
  selector: 'app-theme-preview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    Select,
    CheckboxModule,
    RadioButtonModule,
    DatePicker,
    FileUploadModule,
    CardModule,
  ],
  template: `
    <div class="theme-preview-container" [class.mobile-preview]="previewMode === 'mobile'">
      <div class="form-container">
        <div class="form-header">
          <h2>Contact Information Form</h2>
          <p>This is a sample form to demonstrate theme styling</p>
        </div>

        <form [formGroup]="sampleForm" class="sample-form">
          <!-- Text Input Fields -->
          <div class="form-field">
            <label for="firstName">First Name *</label>
            <input
              pInputText
              id="firstName"
              formControlName="firstName"
              placeholder="Enter your first name"
              class="theme-input"
            />
          </div>

          <div class="form-field">
            <label for="lastName">Last Name *</label>
            <input
              pInputText
              id="lastName"
              formControlName="lastName"
              placeholder="Enter your last name"
              class="theme-input"
            />
          </div>

          <div class="form-field">
            <label for="email">Email Address *</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="Enter your email address"
              class="theme-input"
            />
          </div>

          <!-- Dropdown -->
          <div class="form-field">
            <label for="country">Country</label>
            <p-select
              id="country"
              formControlName="country"
              [options]="countryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select your country"
              styleClass="theme-dropdown"
            ></p-select>
          </div>

          <!-- Textarea -->
          <div class="form-field">
            <label for="message">Message</label>
            <textarea
              pInputTextarea
              id="message"
              formControlName="message"
              placeholder="Enter your message here..."
              rows="4"
              class="theme-textarea"
            ></textarea>
          </div>

          <!-- Checkboxes -->
          <div class="form-field">
            <label>Interests</label>
            <div class="checkbox-group">
              <div class="checkbox-item">
                <p-checkbox
                  formControlName="newsletter"
                  [binary]="true"
                  inputId="newsletter"
                  styleClass="theme-checkbox"
                ></p-checkbox>
                <label for="newsletter">Subscribe to newsletter</label>
              </div>
              <div class="checkbox-item">
                <p-checkbox
                  formControlName="updates"
                  [binary]="true"
                  inputId="updates"
                  styleClass="theme-checkbox"
                ></p-checkbox>
                <label for="updates">Receive product updates</label>
              </div>
            </div>
          </div>

          <!-- Radio Buttons -->
          <div class="form-field">
            <label>Preferred Contact Method</label>
            <div class="radio-group">
              <div class="radio-item">
                <p-radioButton
                  formControlName="contactMethod"
                  value="email"
                  inputId="contact-email"
                  styleClass="theme-radio"
                ></p-radioButton>
                <label for="contact-email">Email</label>
              </div>
              <div class="radio-item">
                <p-radioButton
                  formControlName="contactMethod"
                  value="phone"
                  inputId="contact-phone"
                  styleClass="theme-radio"
                ></p-radioButton>
                <label for="contact-phone">Phone</label>
              </div>
              <div class="radio-item">
                <p-radioButton
                  formControlName="contactMethod"
                  value="mail"
                  inputId="contact-mail"
                  styleClass="theme-radio"
                ></p-radioButton>
                <label for="contact-mail">Mail</label>
              </div>
            </div>
          </div>

          <!-- Date Field -->
          <div class="form-field">
            <label for="birthDate">Birth Date</label>
            <p-datepicker
              id="birthDate"
              formControlName="birthDate"
              placeholder="Select your birth date"
              styleClass="theme-calendar"
              [showIcon]="true"
            ></p-datepicker>
          </div>

          <!-- File Upload -->
          <div class="form-field">
            <label>Profile Picture</label>
            <p-fileUpload
              mode="basic"
              accept="image/*"
              [maxFileSize]="1000000"
              chooseLabel="Choose File"
              styleClass="theme-file-upload"
            ></p-fileUpload>
          </div>

          <!-- Submit Button -->
          <div class="form-actions">
            <button
              pButton
              type="button"
              label="Submit Form"
              class="theme-submit-button"
              [disabled]="sampleForm.invalid"
            ></button>
            <button
              pButton
              type="button"
              label="Reset"
              class="p-button-outlined theme-reset-button"
            ></button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./theme-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePreviewComponent implements OnChanges, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly themePreviewService = inject(ThemePreviewService);

  /**
   * Theme configuration to apply to the preview
   */
  @Input() theme: FormTheme | null = null;

  /**
   * Preview mode: desktop or mobile
   */
  @Input() previewMode: 'desktop' | 'mobile' = 'desktop';

  // Component state
  loading = signal(false);

  // Sample form
  sampleForm: FormGroup = this.formBuilder.group({});

  // Dropdown options
  readonly countryOptions = [
    { label: 'United States', value: 'us' },
    { label: 'Canada', value: 'ca' },
    { label: 'United Kingdom', value: 'uk' },
    { label: 'Germany', value: 'de' },
    { label: 'France', value: 'fr' },
    { label: 'Australia', value: 'au' },
    { label: 'Japan', value: 'jp' },
    { label: 'Other', value: 'other' },
  ];

  constructor() {
    this.initializeSampleForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['theme']?.currentValue !== undefined && this.theme) {
      this.applyTheme();
    }
  }

  ngOnDestroy(): void {
    // Theme will be cleared by parent component
    // This method is intentionally minimal as cleanup is handled by parent
  }

  /**
   * Initializes the sample form with all field types.
   */
  private initializeSampleForm(): void {
    const MIN_NAME_LENGTH = 2;
    this.sampleForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(MIN_NAME_LENGTH)]],
      lastName: ['', [Validators.required, Validators.minLength(MIN_NAME_LENGTH)]],
      email: ['', [Validators.required, Validators.email]],
      country: [''],
      message: [''],
      newsletter: [false],
      updates: [false],
      contactMethod: ['email'],
      birthDate: [null],
    });

    // Add some sample data for better preview
    this.sampleForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      country: 'us',
      message: 'This is a sample message to demonstrate the textarea styling.',
      newsletter: true,
      contactMethod: 'email',
    });
  }

  /**
   * Applies the current theme to the preview.
   */
  private applyTheme(): void {
    if (!this.theme) return;

    // The theme is applied by the parent component via ThemePreviewService
    // This component just renders the form with theme-aware CSS classes
  }
}
