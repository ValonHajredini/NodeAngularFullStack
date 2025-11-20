import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  inject,
  OnInit,
  HostListener,
  signal,
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
} from '../../../shared/utils/sanitizer';
import { validateCSS, CSSValidationResult } from '../../../shared/utils/css-validator';
import { FormsApiService } from '../forms-api.service';

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
 * Form settings component for configuring form-level options.
 * Displayed as a dialog for editing form metadata and layout settings.
 */
@Component({
  selector: 'app-form-settings',
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
  template: `
    <p-dialog
      header="Form Settings"
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

        <div class="field">
          <label for="columnLayout" class="block text-sm font-medium text-gray-700 mb-1">
            Column Layout
          </label>
          <p-select
            id="columnLayout"
            formControlName="columnLayout"
            [options]="columnOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select layout"
            styleClass="w-full"
          ></p-select>
          <small class="text-gray-500 text-xs">Number of columns for form fields</small>
        </div>

        <div class="field">
          <label for="fieldSpacing" class="block text-sm font-medium text-gray-700 mb-1">
            Field Spacing
          </label>
          <p-select
            id="fieldSpacing"
            formControlName="fieldSpacing"
            [options]="spacingOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select spacing"
            styleClass="w-full"
          ></p-select>
          <small class="text-gray-500 text-xs">Vertical spacing between form fields</small>
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
            <label for="allowMultipleSubmissions" class="text-sm font-medium text-gray-700">
              Allow Multiple Submissions
            </label>
          </div>
        </div>

        <div class="border-t border-gray-200 my-4 pt-4">
          <h4 class="text-sm font-semibold text-gray-800 mb-3">Background Settings</h4>

          <div class="field">
            <label class="block text-sm font-medium text-gray-700 mb-2">Background Type</label>
            <div class="flex flex-col gap-2">
              <div class="flex items-center">
                <p-radiobutton
                  inputId="bgNone"
                  name="backgroundType"
                  value="none"
                  formControlName="backgroundType"
                ></p-radiobutton>
                <label for="bgNone" class="ml-2 text-sm text-gray-700">None</label>
              </div>
              <div class="flex items-center">
                <p-radiobutton
                  inputId="bgImage"
                  name="backgroundType"
                  value="image"
                  formControlName="backgroundType"
                ></p-radiobutton>
                <label for="bgImage" class="ml-2 text-sm text-gray-700">Image Background</label>
              </div>
              <div class="flex items-center">
                <p-radiobutton
                  inputId="bgCustom"
                  name="backgroundType"
                  value="custom"
                  formControlName="backgroundType"
                ></p-radiobutton>
                <label for="bgCustom" class="ml-2 text-sm text-gray-700">Custom HTML/CSS</label>
              </div>
            </div>
          </div>

          @if (settingsForm.get('backgroundType')?.value === 'image') {
            <p-accordion class="mt-3" value="0">
              <p-accordion-panel value="0">
                <p-accordion-header>Image Background Settings</p-accordion-header>
                <p-accordion-content>
                  <div class="space-y-3">
                    <div class="field">
                      <label for="bgImageUrl" class="block text-sm font-medium text-gray-700 mb-1">
                        Image URL
                      </label>
                      <input
                        pInputText
                        id="bgImageUrl"
                        formControlName="backgroundImageUrl"
                        class="w-full"
                        placeholder="https://example.com/image.jpg"
                      />
                      @if (
                        settingsForm.get('backgroundImageUrl')?.hasError('pattern') &&
                        settingsForm.get('backgroundImageUrl')?.touched
                      ) {
                        <small class="text-red-500"
                          >Please enter a valid URL (http:// or https://) or upload an image</small
                        >
                      }
                    </div>

                    <div class="field">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Or Upload Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        class="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                        (change)="onImageFileSelected($event)"
                        [disabled]="uploadingImage()"
                      />
                      @if (uploadingImage()) {
                        <div class="mt-2">
                          <small class="text-blue-600 flex items-center gap-2">
                            <i class="pi pi-spin pi-spinner"></i>
                            Uploading image to cloud storage...
                          </small>
                        </div>
                      }
                      @if (uploadError()) {
                        <div class="mt-2">
                          <small class="text-red-600 flex items-center gap-2">
                            <i class="pi pi-times-circle"></i>
                            {{ uploadError() }}
                          </small>
                        </div>
                      }
                      <small class="text-gray-500 text-xs"
                        >Upload an image file (jpg, png, gif, webp, svg) - max 5MB</small
                      >
                    </div>

                    <div class="field">
                      <label
                        for="bgImagePosition"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Position
                      </label>
                      <p-select
                        id="bgImagePosition"
                        formControlName="backgroundImagePosition"
                        [options]="imagePositionOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select position"
                        styleClass="w-full"
                      ></p-select>
                    </div>

                    <div class="field">
                      <label
                        for="bgImageAlignment"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Alignment
                      </label>
                      <p-select
                        id="bgImageAlignment"
                        formControlName="backgroundImageAlignment"
                        [options]="imageAlignmentOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select alignment"
                        styleClass="w-full"
                      ></p-select>
                    </div>

                    <div class="field">
                      <label
                        for="bgImageOpacity"
                        class="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Opacity: {{ settingsForm.get('backgroundImageOpacity')?.value }}%
                      </label>
                      <p-slider
                        id="bgImageOpacity"
                        formControlName="backgroundImageOpacity"
                        [min]="0"
                        [max]="100"
                        [step]="5"
                        styleClass="w-full"
                      ></p-slider>
                    </div>

                    <div class="field">
                      <label for="bgImageBlur" class="block text-sm font-medium text-gray-700 mb-1">
                        Blur: {{ settingsForm.get('backgroundImageBlur')?.value }}px
                      </label>
                      <p-slider
                        id="bgImageBlur"
                        formControlName="backgroundImageBlur"
                        [min]="0"
                        [max]="20"
                        [step]="1"
                        styleClass="w-full"
                      ></p-slider>
                    </div>
                  </div>
                </p-accordion-content>
              </p-accordion-panel>
            </p-accordion>
          }

          @if (settingsForm.get('backgroundType')?.value === 'custom') {
            <p-accordion class="mt-3" value="0">
              <p-accordion-panel value="0">
                <p-accordion-header>Custom Background Settings</p-accordion-header>
                <p-accordion-content>
                  <div class="space-y-3">
                    <div class="field">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Custom HTML
                      </label>
                      <div class="border border-gray-300 rounded">
                        <ngx-monaco-editor
                          formControlName="backgroundCustomHtml"
                          [options]="htmlEditorOptions"
                          style="height: 200px;"
                          (ngModelChange)="onCustomHtmlChange($event)"
                        ></ngx-monaco-editor>
                      </div>
                      @if (htmlContainsDangerousPatterns()) {
                        <small class="text-amber-600">
                          <i class="pi pi-exclamation-triangle"></i> Warning: HTML contains
                          potentially dangerous patterns and will be sanitized
                        </small>
                      }
                      <small class="text-gray-500 text-xs">
                        {{ settingsForm.get('backgroundCustomHtml')?.value?.length || 0 }}/10000
                        characters
                      </small>
                    </div>

                    <div class="field">
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Custom CSS
                      </label>
                      <div class="border border-gray-300 rounded">
                        <ngx-monaco-editor
                          formControlName="backgroundCustomCss"
                          [options]="cssEditorOptions"
                          style="height: 200px;"
                          (ngModelChange)="onCustomCssChange($event)"
                        ></ngx-monaco-editor>
                      </div>
                      @if (cssValidationErrors().length > 0) {
                        <div class="mt-1">
                          @for (error of cssValidationErrors(); track error) {
                            <small class="text-red-500 block">
                              <i class="pi pi-times-circle"></i> {{ error }}
                            </small>
                          }
                        </div>
                      }
                      @if (cssValidationWarnings().length > 0) {
                        <div class="mt-1">
                          @for (warning of cssValidationWarnings(); track warning) {
                            <small class="text-amber-600 block">
                              <i class="pi pi-exclamation-triangle"></i> {{ warning }}
                            </small>
                          }
                        </div>
                      }
                      <small class="text-gray-500 text-xs">
                        {{ settingsForm.get('backgroundCustomCss')?.value?.length || 0 }}/5000
                        characters
                      </small>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded p-3">
                      <h5 class="text-sm font-semibold text-blue-900 mb-2">
                        <i class="pi pi-info-circle"></i> Security Information
                      </h5>
                      <ul class="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                        <li>HTML will be sanitized to remove potentially dangerous content</li>
                        <li>Scripts, iframes, and interactive elements will be removed</li>
                        <li>CSS will be validated for security issues</li>
                        <li>Content is rendered in a sandboxed environment</li>
                      </ul>
                    </div>
                  </div>
                </p-accordion-content>
              </p-accordion-panel>
            </p-accordion>
          }
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
            [label]="saveButtonLabel"
            icon="pi pi-check"
            (onClick)="onSave()"
            [disabled]="settingsForm.invalid"
          ></p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class FormSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

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

  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'edit';
  @Input()
  set settings(value: FormSettings | null | undefined) {
    const mergedSettings: FormSettings = {
      ...this.defaultSettings,
      ...(value ?? {}),
    };
    this.lastSettings = { ...mergedSettings };
    // Only reset the form if it exists and we're not currently editing
    if (this.settingsForm && !this.settingsForm.dirty) {
      this.settingsForm.reset(mergedSettings);
    }
  }
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() settingsSaved = new EventEmitter<FormSettings>();

  get saveButtonLabel(): string {
    return this.mode === 'create' ? 'Save & Continue to Builder' : 'Update Form Settings';
  }

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

  readonly cssValidationErrors = signal<string[]>([]);
  readonly cssValidationWarnings = signal<string[]>([]);
  readonly htmlContainsDangerousPatterns = signal<boolean>(false);
  readonly uploadingImage = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  readonly uploadError = signal<string | null>(null);

  private readonly formsApiService = inject(FormsApiService);

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
  }

  ngOnInit(): void {
    // Initialize with default values
  }

  onUpdateSettings(): void {
    console.log('Form Settings Dialog: onUpdateSettings called', {
      valid: this.settingsForm.valid,
      errors: this.settingsForm.errors,
      value: this.settingsForm.value,
    });
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.getRawValue() as FormSettings;
      this.settingsSaved.emit(formValue);
      this.lastSettings = { ...formValue };
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
      this.visible = false;
      this.visibleChange.emit(false);
    } else {
      console.log('Form is invalid, cannot save');
    }
  }

  onSave(): void {
    console.log('Form Settings Dialog: onSave called', {
      valid: this.settingsForm.valid,
      errors: this.settingsForm.errors,
      value: this.settingsForm.value,
    });
    if (this.settingsForm.valid) {
      const formValue = this.settingsForm.getRawValue() as FormSettings;
      this.settingsSaved.emit(formValue);
      this.lastSettings = { ...formValue };
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
      this.visible = false;
      this.visibleChange.emit(false);
    } else {
      console.log('Form is invalid, cannot save');
    }
  }

  onCancel(): void {
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onDialogShow(): void {
    console.log('Form Settings Dialog: onDialogShow called');
    // Ensure form is reset to last known good settings when dialog opens
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
  }

  onDialogHide(): void {
    console.log('Form Settings Dialog: onDialogHide called');
    // Reset form to last saved state when dialog is closed without saving
    this.settingsForm.reset(this.lastSettings);
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.visible = false;
    this.visibleChange.emit(false);
  }

  /**
   * Handles escape key press to close dialog.
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.visible) {
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
