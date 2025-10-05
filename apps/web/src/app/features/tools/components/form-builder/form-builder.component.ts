import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { FormBuilderService } from './form-builder.service';
import { FormsApiService } from './forms-api.service';
import { ComponentWithUnsavedChanges } from '@core/guards/unsaved-changes.guard';
import { FieldPaletteComponent } from './field-palette/field-palette.component';
import { FormCanvasComponent } from './form-canvas/form-canvas.component';
import { FieldPropertiesComponent } from './field-properties/field-properties.component';
import { FormSettingsComponent } from './form-settings/form-settings.component';
import { PublishDialogComponent } from './publish-dialog/publish-dialog.component';

/**
 * Form Builder main component.
 * Provides a three-panel layout for building forms with drag-and-drop functionality.
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonDirective,
    Toast,
    FieldPaletteComponent,
    FormCanvasComponent,
    FieldPropertiesComponent,
    FormSettingsComponent,
    PublishDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="form-builder-container flex flex-col h-full bg-gray-50">
      <!-- Toolbar -->
      <div
        class="toolbar bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-file-edit text-2xl text-blue-600"></i>
          <h2 class="text-xl font-semibold text-gray-900">Form Builder</h2>
        </div>

        <div class="flex items-center gap-2">
          @if (formBuilderService.isPublished()) {
            <span
              class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1"
            >
              <i class="pi pi-check-circle"></i>
              Published
            </span>
          }
          <button
            pButton
            label="Settings"
            icon="pi pi-cog"
            severity="secondary"
            size="small"
            (click)="showSettingsDialog()"
            [disabled]="formBuilderService.isPublished()"
          ></button>
          <button
            pButton
            label="Preview"
            icon="pi pi-eye"
            severity="secondary"
            size="small"
            (click)="onPreview()"
          ></button>
          @if (formBuilderService.isPublished()) {
            <button
              pButton
              label="Unpublish"
              icon="pi pi-times-circle"
              severity="warn"
              size="small"
              (click)="onUnpublish()"
              [disabled]="isPublishing()"
              [loading]="isPublishing()"
            ></button>
          } @else {
            <button
              pButton
              label="Publish"
              icon="pi pi-cloud-upload"
              size="small"
              (click)="onPublishClick()"
              [disabled]="!formBuilderService.currentForm() || formBuilderService.isDirty()"
            ></button>
          }
          <button
            pButton
            label="Save"
            icon="pi pi-save"
            size="small"
            (click)="onSave()"
            [disabled]="
              !formBuilderService.isDirty() || isSaving() || formBuilderService.isPublished()
            "
            [loading]="isSaving()"
          ></button>
          @if (formBuilderService.isDirty()) {
            <span class="text-xs text-orange-600 font-medium">● Unsaved changes</span>
          }
        </div>
      </div>

      <!-- Three-panel layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left sidebar: Field Palette -->
        <div class="w-64 flex-shrink-0">
          <app-field-palette (fieldSelected)="onFieldTypeSelected($event)"></app-field-palette>
        </div>

        <!-- Center: Form Canvas -->
        <div class="flex-1 overflow-auto">
          <app-form-canvas (fieldClicked)="onFieldClicked($event)"></app-form-canvas>
        </div>

        <!-- Right sidebar: Field Properties -->
        <div class="w-80 flex-shrink-0">
          <app-field-properties
            (propertyChanged)="onPropertyChanged($event)"
            (fieldDeleted)="onFieldDeleted()"
          ></app-field-properties>
        </div>
      </div>

      <!-- Form Settings Dialog -->
      <app-form-settings
        [(visible)]="settingsDialogVisible"
        (settingsSaved)="onSettingsSaved($event)"
      ></app-form-settings>

      <!-- Publish Dialog -->
      <app-publish-dialog
        [(visible)]="publishDialogVisible"
        [loading]="isPublishing()"
        [validationErrors]="publishValidationErrors()"
        [renderUrl]="publishedRenderUrl()"
        (publish)="onPublish($event)"
        (copyUrl)="onCopyRenderUrl()"
      ></app-publish-dialog>

      <!-- Toast for notifications -->
      <p-toast position="top-right"></p-toast>
    </div>
  `,
  styles: [
    `
      .form-builder-container {
        height: 100%;
      }

      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
})
export class FormBuilderComponent implements OnInit, OnDestroy, ComponentWithUnsavedChanges {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly formsApiService = inject(FormsApiService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly settingsDialogVisible = signal<boolean>(false);
  readonly publishDialogVisible = signal<boolean>(false);
  readonly formSettings = signal<any>({
    title: 'Untitled Form',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
    successMessage: 'Thank you for your submission!',
    redirectUrl: '',
    allowMultipleSubmissions: true,
  });
  readonly isSaving = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isPublishing = signal<boolean>(false);
  readonly publishValidationErrors = signal<string[]>([]);
  readonly publishedRenderUrl = signal<string | undefined>(undefined);

  private fieldCounter = 0;
  private autoSaveInterval?: number;

  ngOnInit(): void {
    // Check if loading existing form from route param
    const formId = this.route.snapshot.paramMap.get('id');
    if (formId) {
      this.loadExistingForm(formId);
    }

    // Setup auto-save interval (30 seconds)
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  /**
   * Sets up auto-save functionality.
   * Saves draft every 30 seconds if form is dirty.
   */
  private setupAutoSave(): void {
    this.autoSaveInterval = window.setInterval(() => {
      if (this.formBuilderService.isDirty() && !this.isSaving()) {
        this.saveDraft(true); // true = auto-save mode
      }
    }, 30000); // 30 seconds
  }

  /**
   * Loads an existing form from the API.
   */
  private loadExistingForm(formId: string): void {
    this.isLoading.set(true);
    this.formsApiService.getFormById(formId).subscribe({
      next: (form) => {
        this.formBuilderService.loadForm(form);

        // Update form settings from loaded form
        if (form.schema?.settings) {
          this.formSettings.set({
            title: form.title,
            description: form.description || '',
            columnLayout: form.schema.settings.layout.columns,
            fieldSpacing:
              form.schema.settings.layout.spacing === 'small'
                ? 'compact'
                : form.schema.settings.layout.spacing === 'medium'
                  ? 'normal'
                  : 'relaxed',
            successMessage:
              form.schema.settings.submission.successMessage || 'Thank you for your submission!',
            redirectUrl: form.schema.settings.submission.redirectUrl || '',
            allowMultipleSubmissions: form.schema.settings.submission.allowMultipleSubmissions,
          });
        }

        this.isLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Form Loaded',
          detail: `Loaded form: ${form.title}`,
          life: 3000,
        });
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load form',
          life: 3000,
        });
        this.router.navigate(['/tools/form-builder/list']);
      },
    });
  }

  /**
   * Handles field type selection from palette.
   * Creates a new field with default values and adds it to the canvas.
   */
  onFieldTypeSelected(type: FormFieldType): void {
    this.fieldCounter++;
    const fieldName = `field_${type}_${this.fieldCounter}`;
    const fieldId = `field_${Date.now()}_${this.fieldCounter}`;

    const newField: FormField = {
      id: fieldId,
      type,
      fieldName,
      label: this.getDefaultLabel(type),
      placeholder: '',
      helpText: '',
      required: false,
      order: this.formBuilderService.formFields().length,
    };

    this.formBuilderService.addField(newField);
    this.formBuilderService.selectField(newField);

    this.messageService.add({
      severity: 'success',
      summary: 'Field Added',
      detail: `${this.getDefaultLabel(type)} added to form`,
      life: 2000,
    });
  }

  /**
   * Handles field click from canvas.
   */
  onFieldClicked(field: FormField): void {
    // Field selection is already handled in the canvas component
  }

  /**
   * Handles property changes from the properties panel.
   */
  onPropertyChanged(properties: Partial<FormField>): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Properties Updated',
      detail: 'Field properties have been updated',
      life: 2000,
    });
  }

  /**
   * Handles field deletion.
   */
  onFieldDeleted(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Field Deleted',
      detail: 'Field has been removed from the form',
      life: 2000,
    });
  }

  /**
   * Shows the form settings dialog.
   */
  showSettingsDialog(): void {
    this.settingsDialogVisible.set(true);
  }

  /**
   * Handles form settings save.
   */
  onSettingsSaved(settings: any): void {
    this.formSettings.set(settings);
    this.formBuilderService.markDirty();
    this.messageService.add({
      severity: 'success',
      summary: 'Settings Saved',
      detail: 'Form settings have been updated',
      life: 3000,
    });
  }

  /**
   * Handles form preview.
   */
  onPreview(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Preview',
      detail: 'Preview feature coming soon',
      life: 2000,
    });
  }

  /**
   * Handles form save.
   */
  onSave(): void {
    this.saveDraft(false);
  }

  /**
   * Saves the current form as a draft.
   * @param isAutoSave - Whether this is an auto-save operation
   */
  private saveDraft(isAutoSave = false): void {
    if (this.isSaving()) return;

    const currentSettings = this.formSettings();
    const formData = this.formBuilderService.exportFormData(currentSettings);

    this.isSaving.set(true);

    const currentForm = this.formBuilderService.currentForm();
    const saveOperation = currentForm?.id
      ? this.formsApiService.updateForm(currentForm.id, formData)
      : this.formsApiService.createForm(formData);

    saveOperation.subscribe({
      next: (savedForm) => {
        this.formBuilderService.setCurrentForm(savedForm);
        this.formBuilderService.markClean();
        this.isSaving.set(false);

        if (!isAutoSave) {
          this.messageService.add({
            severity: 'success',
            summary: 'Draft Saved',
            detail: 'Your form has been saved successfully',
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: 'info',
            summary: 'Auto-saved',
            detail: 'Draft saved automatically',
            life: 1500,
          });
        }

        // If this was a new form, navigate to the form edit URL
        if (!currentForm?.id && savedForm.id) {
          this.router.navigate(['/tools/form-builder', savedForm.id], { replaceUrl: true });
        }
      },
      error: (error) => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error.error?.message || 'Failed to save form',
          life: 3000,
        });
      },
    });
  }

  /**
   * Determines if the component can be deactivated.
   * Returns false if there are unsaved changes, triggering the guard.
   */
  canDeactivate(): boolean {
    return !this.formBuilderService.isDirty();
  }

  /**
   * Handles publish button click.
   * Validates form schema before showing publish dialog.
   */
  onPublishClick(): void {
    const currentForm = this.formBuilderService.currentForm();

    // Ensure form is saved before publishing
    if (!currentForm?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Save Required',
        detail: 'Please save the form before publishing',
        life: 3000,
      });
      return;
    }

    // Check if form has unsaved changes
    if (this.formBuilderService.isDirty()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Unsaved Changes',
        detail: 'Please save your changes before publishing',
        life: 3000,
      });
      return;
    }

    // Validate form schema
    const validationErrors = this.validateFormSchema();
    if (validationErrors.length > 0) {
      this.publishValidationErrors.set(validationErrors);
      this.publishDialogVisible.set(true);
      return;
    }

    // Clear validation errors and show publish dialog
    this.publishValidationErrors.set([]);
    this.publishedRenderUrl.set(undefined);
    this.publishDialogVisible.set(true);
  }

  /**
   * Handles form publish with expiration date.
   * @param expiresAt - Expiration date for the render token
   */
  onPublish(expiresAt: Date): void {
    const currentForm = this.formBuilderService.currentForm();
    if (!currentForm?.id) return;

    this.isPublishing.set(true);

    this.formsApiService.publishForm(currentForm.id, expiresAt).subscribe({
      next: (result) => {
        // Update current form with published status
        this.formBuilderService.setCurrentForm(result.form);

        // Set the render URL for display
        this.publishedRenderUrl.set(`${window.location.origin}${result.renderUrl}`);

        this.isPublishing.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Form Published',
          detail: 'Your form is now live and ready to receive submissions',
          life: 3000,
        });
      },
      error: (error) => {
        this.isPublishing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Publish Failed',
          detail: error.error?.message || 'Failed to publish form',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles form unpublish.
   */
  onUnpublish(): void {
    const currentForm = this.formBuilderService.currentForm();
    if (!currentForm?.id) return;

    this.isPublishing.set(true);

    this.formsApiService.unpublishForm(currentForm.id).subscribe({
      next: (updatedForm) => {
        this.formBuilderService.setCurrentForm(updatedForm);
        this.isPublishing.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Form Unpublished',
          detail: 'Form is now in draft mode and the render URL is invalidated',
          life: 3000,
        });
      },
      error: (error) => {
        this.isPublishing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Unpublish Failed',
          detail: error.error?.message || 'Failed to unpublish form',
          life: 3000,
        });
      },
    });
  }

  /**
   * Handles render URL copy to clipboard.
   */
  onCopyRenderUrl(): void {
    const renderUrl = this.publishedRenderUrl();
    if (!renderUrl) return;

    // Use Clipboard API with fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(renderUrl).then(
        () => {
          this.messageService.add({
            severity: 'success',
            summary: 'URL Copied',
            detail: 'Render URL copied to clipboard',
            life: 2000,
          });
        },
        (error) => {
          this.fallbackCopyToClipboard(renderUrl);
        },
      );
    } else {
      this.fallbackCopyToClipboard(renderUrl);
    }
  }

  /**
   * Fallback clipboard copy method for older browsers.
   * @param text - Text to copy to clipboard
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.messageService.add({
        severity: 'success',
        summary: 'URL Copied',
        detail: 'Render URL copied to clipboard',
        life: 2000,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy Failed',
        detail: 'Failed to copy URL to clipboard. Please copy manually.',
        life: 3000,
      });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  /**
   * Validates form schema before publishing.
   * @returns Array of validation error messages
   */
  private validateFormSchema(): string[] {
    const errors: string[] = [];
    const fields = this.formBuilderService.formFields();

    // Check if form has fields
    if (fields.length === 0) {
      errors.push('Form must have at least one field');
      return errors;
    }

    // Check for duplicate field names
    const fieldNames = new Set<string>();
    const duplicates = new Set<string>();

    fields.forEach((field) => {
      // Validate required field properties
      if (!field.label || field.label.trim() === '') {
        errors.push(`Field "${field.fieldName}" is missing a label`);
      }

      // Check for duplicates
      if (fieldNames.has(field.fieldName)) {
        duplicates.add(field.fieldName);
      } else {
        fieldNames.add(field.fieldName);
      }

      // Validate regex patterns
      if (field.validation?.pattern) {
        try {
          new RegExp(field.validation.pattern);
        } catch (regexError) {
          errors.push(
            `Field "${field.fieldName}" has invalid regex pattern: ${field.validation.pattern}`,
          );
        }
      }
    });

    // Report duplicate field names
    if (duplicates.size > 0) {
      duplicates.forEach((name) => {
        errors.push(`Duplicate field name found: ${name}`);
      });
    }

    return errors;
  }

  /**
   * Gets a default label for a field type.
   */
  private getDefaultLabel(type: FormFieldType): string {
    const labelMap: Record<FormFieldType, string> = {
      [FormFieldType.TEXT]: 'Text Input',
      [FormFieldType.EMAIL]: 'Email Address',
      [FormFieldType.NUMBER]: 'Number',
      [FormFieldType.SELECT]: 'Select Option',
      [FormFieldType.TEXTAREA]: 'Text Area',
      [FormFieldType.FILE]: 'File Upload',
      [FormFieldType.CHECKBOX]: 'Checkbox',
      [FormFieldType.RADIO]: 'Radio Button',
      [FormFieldType.DATE]: 'Date',
      [FormFieldType.DATETIME]: 'Date & Time',
      [FormFieldType.TOGGLE]: 'Toggle',
      [FormFieldType.DIVIDER]: 'Section Divider',
    };
    return labelMap[type] || 'Field';
  }
}
