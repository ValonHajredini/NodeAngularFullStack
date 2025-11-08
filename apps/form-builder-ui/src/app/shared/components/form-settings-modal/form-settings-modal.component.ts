import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  HostListener,
  signal,
  model,
  input,
  output,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { AccordionModule } from 'primeng/accordion';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SliderModule } from 'primeng/slider';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { FormsModule } from '@angular/forms';
import {
  sanitizeCustomBackground,
  containsDangerousPatterns,
} from '../../utils/sanitizer';
import { validateCSS, CSSValidationResult } from '../../utils/css-validator';
import { FormsApiService } from '../../../features/dashboard/forms-api.service';

export interface FormSettings {
  title: string;
  description: string;
  columnLayout: 1 | 2 | 3;
  fieldSpacing: 'compact' | 'normal' | 'relaxed';
  submitButtonText?: string;
  successMessage: string;
  redirectUrl: string;
  allowMultipleSubmissions: boolean;
  // Background settings
  backgroundType?: 'none' | 'image' | 'custom';
  backgroundImageUrl?: string;
  backgroundImagePosition?: 'cover' | 'contain' | 'repeat';
  backgroundImageOpacity?: number;
  backgroundImageAlignment?: 'top' | 'center' | 'bottom';
  backgroundImageBlur?: number;
  backgroundCustomHtml?: string;
  backgroundCustomCss?: string;
}

/**
 * Shared form settings modal component for configuring form-level options.
 *
 * Uses Angular signals for reactive state management:
 * - model() for two-way binding of visibility
 * - input() for one-way data flow from parent
 * - output() for emitting events to parent
 * - signal() for internal component state
 *
 * Supports both create and edit modes via the mode input signal.
 */
@Component({
  selector: 'app-form-settings-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule,
    CheckboxModule,
    AccordionModule,
    RadioButtonModule,
    SliderModule,
    MonacoEditorModule,
  ],
  styles: [`
    ::ng-deep .p-checkbox {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      flex-shrink: 0;
    }

    ::ng-deep .p-checkbox-box {
      width: 18px;
      height: 18px;
      min-width: 18px;
      min-height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      background: #ffffff;
      transition: background-color 0.2s, border-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    ::ng-deep .p-checkbox:not(.p-disabled):hover .p-checkbox-box {
      border-color: #10b981;
    }

    ::ng-deep .p-checkbox.p-highlight .p-checkbox-box {
      background: #10b981;
      border-color: #10b981;
    }

    ::ng-deep .p-checkbox-box .p-checkbox-icon {
      color: #ffffff;
      font-size: 12px;
    }
  `],
  template: `
    <p-dialog
      [header]="dialogHeader()"
      [(visible)]="visible"
      [modal]="true"
      [closable]="true"
      [dismissableMask]="true"
      [closeOnEscape]="true"
      [draggable]="false"
      [resizable]="false"
      [blockScroll]="true"
      appendTo="body"
      [style]="{ width: '600px', maxHeight: '90vh' }"
      [contentStyle]="{ maxHeight: 'calc(90vh - 180px)', overflow: 'auto' }"
      (onHide)="onDialogHide()"
      (onShow)="onDialogShow()"
    >
      <form [formGroup]="settingsForm" class="space-y-4 pt-4">
        <div class="field">
          <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
            Form Title <span class="text-red-500">*</span>
          </label>
          <input
            pInputText
            id="title"
            formControlName="title"
            class="w-full"
            placeholder="Enter form title"
            maxlength="200"
          />
          @if (
            settingsForm.get('title')?.hasError('required') && settingsForm.get('title')?.touched
          ) {
            <small class="text-red-500">Title is required</small>
          }
        </div>

        <div class="field">
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            pTextarea
            id="description"
            formControlName="description"
            class="w-full"
            rows="4"
            placeholder="Enter form description"
            maxlength="2000"
          ></textarea>
          <small class="text-gray-500 text-xs">
            {{ settingsForm.get('description')?.value?.length || 0 }}/2000 characters
          </small>
        </div>

        <div class="border-t border-gray-200 my-4 pt-4">
          <h4 class="text-sm font-semibold text-gray-800 mb-3">Submission Settings</h4>

          <div class="field">
            <label for="submitButtonText" class="block text-sm font-medium text-gray-700 mb-1">
              Submit Button Text
            </label>
            <input
              pInputText
              id="submitButtonText"
              formControlName="submitButtonText"
              class="w-full"
              placeholder="Submit"
              maxlength="50"
            />
            <small class="text-gray-500 text-xs"
              >Text displayed on the submit button (default: "Submit")</small
            >
          </div>

          <div class="field">
            <label for="successMessage" class="block text-sm font-medium text-gray-700 mb-1">
              Success Message
            </label>
            <input
              pInputText
              id="successMessage"
              formControlName="successMessage"
              class="w-full"
              placeholder="Thank you for your submission!"
              maxlength="500"
            />
            <small class="text-gray-500 text-xs">Message shown after successful submission</small>
          </div>

          <div class="field">
            <label for="redirectUrl" class="block text-sm font-medium text-gray-700 mb-1">
              Redirect URL (Optional)
            </label>
            <input
              pInputText
              id="redirectUrl"
              formControlName="redirectUrl"
              class="w-full"
              placeholder="https://example.com/thank-you"
            />
            @if (
              settingsForm.get('redirectUrl')?.hasError('pattern') &&
              settingsForm.get('redirectUrl')?.touched
            ) {
              <small class="text-red-500">Please enter a valid URL (http:// or https://)</small>
            }
            <small class="text-gray-500 text-xs">Redirect user after submission (optional)</small>
          </div>

          <div class="field flex items-center gap-2">
            <p-checkbox
              inputId="allowMultipleSubmissions"
              formControlName="allowMultipleSubmissions"
              [binary]="true"
            ></p-checkbox>
            <label for="allowMultipleSubmissions" class="text-sm font-medium text-gray-700 leading-tight">
              Allow Multiple Submissions
            </label>
          </div>
        </div>

      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="onCancel()"
          ></p-button>
          <p-button
            [label]="saveButtonLabel()"
            icon="pi pi-check"
            (onClick)="onSave()"
            [disabled]="settingsForm.invalid"
          ></p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FormSettingsModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly formsApiService = inject(FormsApiService);

  // Signal-based inputs and outputs
  visible = model<boolean>(false);
  mode = input<'create' | 'edit'>('edit');
  settings = input<FormSettings | null>(null);
  settingsSaved = output<FormSettings>();

  // Computed signal for dialog header
  readonly dialogHeader = computed(() =>
    this.mode() === 'create' ? 'Create New Form' : 'Form Settings'
  );

  // Computed signal for save button label
  readonly saveButtonLabel = computed(() =>
    this.mode() === 'create' ? 'Save & Continue to Builder' : 'Update Form Settings'
  );

  // Internal state signals
  readonly cssValidationErrors = signal<string[]>([]);
  readonly cssValidationWarnings = signal<string[]>([]);
  readonly htmlContainsDangerousPatterns = signal<boolean>(false);
  readonly uploadingImage = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  readonly uploadError = signal<string | null>(null);

  private readonly defaultSettings: FormSettings = {
    title: '',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
    backgroundType: 'none',
    backgroundImageUrl: '',
    backgroundImagePosition: 'cover',
    backgroundImageOpacity: 100,
    backgroundImageAlignment: 'center',
    backgroundImageBlur: 0,
    backgroundCustomHtml: '',
    backgroundCustomCss: '',
  };

  private lastSettings: FormSettings = { ...this.defaultSettings };

  settingsForm: FormGroup;

  readonly columnOptions = [
    { label: '1 Column', value: 1 },
    { label: '2 Columns', value: 2 },
    { label: '3 Columns', value: 3 },
  ];

  readonly spacingOptions = [
    { label: 'Compact', value: 'compact' },
    { label: 'Normal', value: 'normal' },
    { label: 'Relaxed', value: 'relaxed' },
  ];

  readonly imagePositionOptions = [
    { label: 'Cover', value: 'cover' },
    { label: 'Contain', value: 'contain' },
    { label: 'Repeat', value: 'repeat' },
  ];

  readonly imageAlignmentOptions = [
    { label: 'Top', value: 'top' },
    { label: 'Center', value: 'center' },
    { label: 'Bottom', value: 'bottom' },
  ];

  readonly htmlEditorOptions = {
    language: 'html',
    minimap: { enabled: false },
    lineNumbers: 'on',
    theme: 'vs-light',
    automaticLayout: true,
    wordWrap: 'on',
  };

  readonly cssEditorOptions = {
    language: 'css',
    minimap: { enabled: false },
    lineNumbers: 'on',
    theme: 'vs-light',
    automaticLayout: true,
    wordWrap: 'on',
  };

  constructor() {
    this.settingsForm = this.fb.group({
      title: [this.defaultSettings.title, [Validators.required, Validators.maxLength(200)]],
      description: [this.defaultSettings.description, Validators.maxLength(2000)],
      columnLayout: [this.defaultSettings.columnLayout, Validators.required],
      fieldSpacing: [this.defaultSettings.fieldSpacing, Validators.required],
      submitButtonText: [this.defaultSettings.submitButtonText, Validators.maxLength(50)],
      successMessage: [this.defaultSettings.successMessage, Validators.maxLength(500)],
      redirectUrl: [this.defaultSettings.redirectUrl, Validators.pattern(/^(https?:\/\/.+)?$/)],
      allowMultipleSubmissions: [this.defaultSettings.allowMultipleSubmissions],
      backgroundType: [this.defaultSettings.backgroundType],
      backgroundImageUrl: [
        this.defaultSettings.backgroundImageUrl,
        Validators.pattern(/^(https?:\/\/.+|data:image\/.+)?$/),
      ],
      backgroundImagePosition: [this.defaultSettings.backgroundImagePosition],
      backgroundImageOpacity: [this.defaultSettings.backgroundImageOpacity],
      backgroundImageAlignment: [this.defaultSettings.backgroundImageAlignment],
      backgroundImageBlur: [this.defaultSettings.backgroundImageBlur],
      backgroundCustomHtml: [
        this.defaultSettings.backgroundCustomHtml,
        Validators.maxLength(10000),
      ],
      backgroundCustomCss: [this.defaultSettings.backgroundCustomCss, Validators.maxLength(5000)],
    });

    // Effect to react to settings input changes
    effect(() => {
      const incomingSettings = this.settings();
      if (incomingSettings) {
        const mergedSettings: FormSettings = {
          ...this.defaultSettings,
          ...incomingSettings,
        };
        this.lastSettings = { ...mergedSettings };
        // Only reset form if not dirty
        if (!this.settingsForm.dirty) {
          this.settingsForm.reset(mergedSettings);
        }
      }
    });
  }

  ngOnInit(): void {
    // Initial form setup
  }

  onSave(): void {
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.getRawValue() as FormSettings;
      this.settingsSaved.emit(formValue);
      this.lastSettings = { ...formValue };
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
      this.visible.set(false);
    }
  }

  onCancel(): void {
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible.set(false);
  }

  onDialogShow(): void {
    // Reset form to last known good settings when dialog opens
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
  }

  onDialogHide(): void {
    // Reset form to last saved state when dialog closes without saving
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible.set(false);
  }

  /**
   * Handles escape key press to close dialog.
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.visible()) {
      event.preventDefault();
      this.onCancel();
    }
  }

  /**
   * Validates custom HTML for dangerous patterns.
   */
  onCustomHtmlChange(html: string): void {
    this.htmlContainsDangerousPatterns.set(containsDangerousPatterns(html));
  }

  /**
   * Validates custom CSS for security issues.
   */
  onCustomCssChange(css: string): void {
    const validation: CSSValidationResult = validateCSS(css);
    this.cssValidationErrors.set(validation.errors);
    this.cssValidationWarnings.set(validation.warnings);
  }

  /**
   * Handles image file selection and uploads to DigitalOcean Spaces.
   */
  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Please select an image file');
      return;
    }

    // Validate file size (max 5MB to match backend)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.uploadError.set('Image file size must be less than 5MB');
      return;
    }

    // Reset error state
    this.uploadError.set(null);
    this.uploadingImage.set(true);
    this.uploadProgress.set(0);

    // Upload to cloud storage
    this.formsApiService.uploadBackgroundImage(file).subscribe({
      next: (response) => {
        // Update form with cloud URL
        this.settingsForm.patchValue({
          backgroundImageUrl: response.url,
        });
        this.settingsForm.get('backgroundImageUrl')?.markAsTouched();

        this.uploadingImage.set(false);
        this.uploadProgress.set(100);

        // Clear progress after animation
        setTimeout(() => {
          this.uploadProgress.set(0);
        }, 1000);
      },
      error: (error) => {
        console.error('Error uploading background image:', error);
        this.uploadingImage.set(false);
        this.uploadProgress.set(0);

        const errorMessage =
          error?.error?.message || error?.message || 'Failed to upload image. Please try again.';
        this.uploadError.set(errorMessage);

        // Clear input so user can try again
        input.value = '';
      },
    });
  }
}
