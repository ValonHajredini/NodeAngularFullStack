import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { InputText } from 'primeng/inputtext';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormField, FormFieldType, FormMetadata } from '@nodeangularfullstack/shared';
import { FormBuilderService } from './form-builder.service';
import { FormsApiService } from './forms-api.service';
import { ComponentWithUnsavedChanges } from '@core/guards/unsaved-changes.guard';
import { FieldPaletteComponent } from './field-palette/field-palette.component';
import { FormCanvasComponent } from './form-canvas/form-canvas.component';
import { UnifiedFieldEditorModalComponent } from './unified-field-editor-modal/unified-field-editor-modal.component';
import { FormSettingsComponent, FormSettings } from './form-settings/form-settings.component';
import { PublishDialogComponent } from './publish-dialog/publish-dialog.component';
import { RowLayoutSidebarComponent } from './row-layout-sidebar/row-layout-sidebar.component';
import { PreviewDialogComponent } from './preview-dialog/preview-dialog.component';
import { Dialog } from 'primeng/dialog';
import { FormSchema } from '@nodeangularfullstack/shared';

/**
 * Form Builder main component.
 * Provides a three-panel layout for building forms with drag-and-drop functionality.
 * Field properties are edited via modal dialog instead of sidebar.
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonDirective,
    Toast,
    InputText,
    DragDropModule,
    FieldPaletteComponent,
    FormCanvasComponent,
    UnifiedFieldEditorModalComponent,
    FormSettingsComponent,
    PublishDialogComponent,
    RowLayoutSidebarComponent,
    PreviewDialogComponent,
    Dialog,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="form-builder-container flex flex-col h-full bg-gray-50">
      <!-- Breadcrumb Navigation -->
      <div class="bg-gray-100 border-b border-gray-200 px-4 py-2">
        <nav class="flex items-center text-sm text-gray-600">
          <a
            [routerLink]="['/app/dashboard']"
            class="hover:text-blue-600 transition-colors flex items-center"
          >
            <i class="pi pi-home mr-1"></i>
            Dashboard
          </a>
          <i class="pi pi-angle-right mx-2 text-gray-400"></i>
          <a [routerLink]="['/app/tools']" class="hover:text-blue-600 transition-colors"> Tools </a>
          <i class="pi pi-angle-right mx-2 text-gray-400"></i>
          <a
            (click)="navigateToFormsList()"
            class="hover:text-blue-600 transition-colors cursor-pointer"
          >
            Form Builder
          </a>
          <i class="pi pi-angle-right mx-2 text-gray-400"></i>
          <span class="text-gray-900 font-medium">{{
            formBuilderService.currentForm()?.title || 'New Form'
          }}</span>
        </nav>
      </div>

      <!-- Toolbar -->
      <div
        class="toolbar bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <button
            pButton
            icon="pi pi-arrow-left"
            severity="secondary"
            size="small"
            [outlined]="true"
            (click)="navigateToFormsList()"
            title="Back to My Forms"
            class="mr-2"
          ></button>
          <i class="pi pi-file-edit text-2xl text-blue-600"></i>
          <h2 class="text-xl font-semibold text-gray-900">Form Builder</h2>
          <button
            pButton
            label="My Forms"
            icon="pi pi-list"
            severity="secondary"
            size="small"
            (click)="openFormsDialog()"
            class="ml-4"
          ></button>
        </div>

        <div class="flex items-center gap-2">
          @if (formBuilderService.isPublished()) {
            <span
              class="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1"
            >
              <i class="pi pi-check-circle"></i>
              Published
            </span>

            <!-- Public URL Display and Copy -->
            <div class="flex items-center gap-2 ml-2 px-3 py-1 bg-blue-50 rounded-md">
              <label class="text-xs font-medium text-blue-700">Public URL:</label>
              <input
                pInputText
                [value]="getPublicFormUrl()"
                readonly
                class="text-xs w-96 bg-white"
                size="small"
              />
              <button
                pButton
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                [outlined]="true"
                (click)="copyPublicUrl()"
                title="Copy public form URL"
              ></button>
            </div>
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
      <div class="flex-1 flex overflow-hidden" cdkDropListGroup>
        <!-- Left sidebar: Field Palette -->
        <div class="w-64 flex-shrink-0">
          <app-field-palette (fieldSelected)="onFieldTypeSelected($event)"></app-field-palette>
        </div>

        <!-- Center: Form Canvas (expanded to fill remaining space) -->
        <div class="flex-1 overflow-auto">
          <app-form-canvas
            [settings]="formSettings()"
            (fieldClicked)="onFieldClicked($event)"
          ></app-form-canvas>
        </div>

        <!-- Right sidebar: Row Layout -->
        <div class="flex-shrink-0">
          <app-row-layout-sidebar></app-row-layout-sidebar>
        </div>
      </div>

      <!-- Unified Field Editor Modal (Story 16.8) -->
      <app-unified-field-editor-modal
        [visible]="fieldPropertiesModalVisible()"
        [field]="selectedFieldForModal()"
        (visibleChange)="onFieldPropertiesModalVisibleChange($event)"
        (save)="onFieldPropertiesSaved($event)"
        (cancelModal)="onFieldPropertiesCancelled()"
        (fieldDeleted)="onFieldDeleted()"
      ></app-unified-field-editor-modal>

      <!-- Form Settings Dialog -->
      <app-form-settings
        [visible]="settingsDialogVisible()"
        (visibleChange)="onSettingsDialogVisibleChange($event)"
        [settings]="formSettings()"
        (settingsSaved)="onSettingsSaved($event)"
      ></app-form-settings>

      <!-- Publish Dialog -->
      <app-publish-dialog
        [visible]="publishDialogVisible()"
        (visibleChange)="publishDialogVisible.set($event)"
        [loading]="isPublishing()"
        [validationErrors]="publishValidationErrors()"
        [renderUrl]="publishedRenderUrl()"
        (publish)="onPublish($event)"
        (copyUrl)="onCopyRenderUrl()"
      ></app-publish-dialog>

      <!-- Preview Dialog (Story 14.3) -->
      <app-preview-dialog
        [visible]="previewDialogVisible()"
        [formSchema]="previewFormSchema()"
        (onClose)="closePreview()"
      ></app-preview-dialog>

      <!-- Toast for notifications -->
      <p-toast position="bottom-right"></p-toast>

      <!-- My Forms Dialog -->
      <p-dialog
        header="My Forms"
        [visible]="formsListDialogVisible()"
        (visibleChange)="onFormsDialogVisibleChange($event)"
        (onHide)="onFormsDialogVisibleChange(false)"
        [modal]="true"
        [closable]="true"
        [dismissableMask]="true"
        [closeOnEscape]="true"
        [draggable]="false"
        [resizable]="false"
        [blockScroll]="true"
        [style]="{ width: '640px', maxHeight: '80vh' }"
      >
        <div class="space-y-4">
          @if (formsListLoading()) {
            <div class="flex items-center justify-center py-10 text-gray-500 text-sm">
              <i class="pi pi-spin pi-spinner mr-2"></i>
              Loading your forms...
            </div>
          } @else if (formsListError()) {
            <div class="p-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
              {{ formsListError() }}
            </div>
          } @else if (!availableForms().length) {
            <div class="p-6 text-center text-sm text-gray-500">
              <i class="pi pi-inbox text-3xl mb-3 text-gray-300"></i>
              <p>No saved forms found yet. Save a form to see it listed here.</p>
            </div>
          } @else {
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
                  <tr>
                    <th class="px-4 py-3">Title</th>
                    <th class="px-4 py-3 w-36">Status</th>
                    <th class="px-4 py-3 w-40">Last Updated</th>
                    <th class="px-4 py-3 w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (form of availableForms(); track form.id) {
                    <tr class="border-t border-gray-100 hover:bg-gray-50">
                      <td class="px-4 py-3">
                        <div class="font-medium text-gray-900">{{ form.title }}</div>
                        @if (form.description) {
                          <div class="text-xs text-gray-500 truncate max-w-xs">
                            {{ form.description }}
                          </div>
                        }
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          [ngClass]="{
                            'bg-green-100 text-green-700': form.status === 'published',
                            'bg-gray-100 text-gray-600': form.status !== 'published',
                          }"
                        >
                          {{ form.status | titlecase }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600">
                        {{ form.updatedAt | date: 'medium' }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center justify-end gap-2">
                          <button
                            pButton
                            label="Load"
                            icon="pi pi-arrow-right"
                            size="small"
                            (click)="onFormSelected(form)"
                            [disabled]="isFormDeleting(form.id)"
                          ></button>
                          <button
                            pButton
                            label="Delete"
                            icon="pi pi-trash"
                            size="small"
                            severity="danger"
                            (click)="onDeleteForm(form)"
                            [loading]="isFormDeleting(form.id)"
                          ></button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </p-dialog>
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
  readonly fieldPropertiesModalVisible = signal<boolean>(false);
  readonly selectedFieldForModal = signal<FormField | null>(null);
  readonly formSettings = signal<FormSettings>({
    title: 'Untitled Form',
    description: '',
    columnLayout: 1,
    fieldSpacing: 'normal',
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
  });
  readonly isSaving = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isPublishing = signal<boolean>(false);
  readonly publishValidationErrors = signal<string[]>([]);
  readonly publishedRenderUrl = signal<string | undefined>(undefined);
  readonly formsListDialogVisible = signal<boolean>(false);
  readonly formsListLoading = signal<boolean>(false);
  readonly availableForms = signal<FormMetadata[]>([]);
  readonly formsListError = signal<string | null>(null);
  readonly formsDeleting = signal<Set<string>>(new Set());

  // Preview state (Story 14.3)
  readonly previewDialogVisible = signal<boolean>(false);
  readonly previewFormSchema = signal<FormSchema | null>(null);

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
  private loadExistingForm(formId: string, options: { updateRoute?: boolean } = {}): void {
    this.isLoading.set(true);
    this.formsApiService.getFormById(formId).subscribe({
      next: (form) => {
        this.formBuilderService.loadForm(form);

        // Update form settings from loaded form
        if (form.schema?.settings) {
          const settings = form.schema.settings as any;
          const background = settings.background || {};

          this.formSettings.set({
            title: form.title,
            description: form.description || '',
            columnLayout: this.normalizeColumnLayout(form.schema.settings.layout.columns),
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
            // Extract background settings from schema.settings.background
            backgroundType: background.type || 'none',
            backgroundImageUrl: background.imageUrl || '',
            backgroundImagePosition: background.imagePosition || 'cover',
            backgroundImageOpacity: background.imageOpacity ?? 100,
            backgroundImageAlignment: background.imageAlignment || 'center',
            backgroundImageBlur: background.imageBlur ?? 0,
            backgroundCustomHtml: background.customHtml || '',
            backgroundCustomCss: background.customCss || '',
          });
        } else {
          // Initialize with default settings if no schema settings exist
          this.formSettings.set({
            title: form.title || 'Untitled Form',
            description: form.description || '',
            columnLayout: 1,
            fieldSpacing: 'normal',
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
          });
        }

        this.isLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Form Loaded',
          detail: `Loaded form: ${form.title}`,
          life: 3000,
        });

        if (options.updateRoute) {
          this.router.navigate(['/app/tools/form-builder', form.id], { replaceUrl: true });
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Load Failed',
          detail: error.error?.message || 'Failed to load form',
          life: 3000,
        });
        this.router.navigate(['/app/tools/form-builder/list']);
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
   * Opens field properties modal with the selected field.
   */
  onFieldClicked(field: FormField): void {
    this.selectedFieldForModal.set(field);
    this.fieldPropertiesModalVisible.set(true);
  }

  /**
   * Handles field properties modal visibility changes.
   */
  onFieldPropertiesModalVisibleChange(visible: boolean): void {
    this.fieldPropertiesModalVisible.set(visible);
    if (!visible) {
      this.selectedFieldForModal.set(null);
    }
  }

  /**
   * Handles field properties save from modal.
   */
  onFieldPropertiesSaved(updatedField: FormField): void {
    const fieldIndex = this.formBuilderService.selectedFieldIndex();
    if (fieldIndex >= 0) {
      this.formBuilderService.updateField(fieldIndex, updatedField);
      this.formBuilderService.selectField(updatedField);
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Properties Updated',
      detail: 'Field properties have been saved',
      life: 2000,
    });

    this.fieldPropertiesModalVisible.set(false);
    this.selectedFieldForModal.set(null);
  }

  /**
   * Handles field properties modal cancel.
   */
  onFieldPropertiesCancelled(): void {
    this.fieldPropertiesModalVisible.set(false);
    this.selectedFieldForModal.set(null);
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
   * Handles form settings dialog visibility changes.
   */
  onSettingsDialogVisibleChange(visible: boolean): void {
    this.settingsDialogVisible.set(visible);
  }

  /**
   * Handles form settings save.
   */
  onSettingsSaved(settings: FormSettings): void {
    const currentFormId = this.formBuilderService.currentFormId();

    // Update local settings
    this.formSettings.set({ ...settings });

    // Sync background settings to fields
    this.syncBackgroundSettingsToFields(settings);

    if (!currentFormId) {
      // If no form is loaded, just mark as dirty
      this.formBuilderService.markDirty();
      this.settingsDialogVisible.set(false);

      this.messageService.add({
        severity: 'success',
        summary: 'Settings Saved',
        detail: 'Form settings have been updated',
        life: 3000,
      });
      return;
    }

    // Get the current form to preserve existing schema and fields
    const currentForm = this.formBuilderService.currentForm();
    const existingFields = this.formBuilderService.formFields();

    // Prepare the schema settings update
    const schemaUpdate = {
      fields: existingFields,
      settings: {
        layout: {
          columns: settings.columnLayout,
          spacing:
            settings.fieldSpacing === 'compact'
              ? 'small'
              : settings.fieldSpacing === 'normal'
                ? 'medium'
                : 'large',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: settings.successMessage,
          redirectUrl: settings.redirectUrl || undefined,
          allowMultipleSubmissions: settings.allowMultipleSubmissions,
        },
        // Include background settings in schema
        background: {
          type: settings.backgroundType || 'none',
          imageUrl: settings.backgroundImageUrl || '',
          imagePosition: settings.backgroundImagePosition || 'cover',
          imageOpacity: settings.backgroundImageOpacity ?? 100,
          imageAlignment: settings.backgroundImageAlignment || 'center',
          imageBlur: settings.backgroundImageBlur ?? 0,
          customHtml: settings.backgroundCustomHtml || '',
          customCss: settings.backgroundCustomCss || '',
        },
        // Include row layout configuration from service
        rowLayout: this.formBuilderService.rowLayoutEnabled()
          ? {
              enabled: true,
              rows: this.formBuilderService.getRowLayout(),
            }
          : undefined,
      },
    };

    // Update the form in the database (backend will handle schema as part of request body)
    this.formsApiService
      .updateForm(currentFormId, {
        title: settings.title,
        description: settings.description,
        schema: schemaUpdate as any, // Type assertion needed due to Partial<FormMetadata> limitation
      } as any)
      .subscribe({
        next: (updatedForm) => {
          // Update the local form settings signal
          this.formSettings.set({ ...settings });

          // Update the form in availableForms if it exists
          const forms = this.availableForms();
          const index = forms.findIndex((f) => f.id === currentFormId);
          if (index !== -1) {
            const updatedForms = [...forms];
            updatedForms[index] = updatedForm;
            this.availableForms.set(updatedForms);
          }

          // Mark the form as pristine since it's saved
          this.formBuilderService.markPristine();

          // Close the settings dialog
          this.settingsDialogVisible.set(false);

          this.messageService.add({
            severity: 'success',
            summary: 'Settings Saved',
            detail: 'Form settings have been updated successfully',
            life: 3000,
          });
        },
        error: (error) => {
          console.error('Error updating form settings:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Save Failed',
            detail: error.error?.message || 'Failed to update form settings',
            life: 5000,
          });
        },
      });
  }

  /**
   * Opens the My Forms dialog and loads available forms.
   */
  openFormsDialog(): void {
    this.formsListDialogVisible.set(true);
    this.fetchAvailableForms();
  }

  /**
   * Handles selecting a form from the dialog.
   */
  onFormSelected(form: FormMetadata): void {
    if (this.formBuilderService.isDirty()) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Loading another form will discard them. Continue?',
      );
      if (!confirmSwitch) {
        return;
      }
    }

    this.formsListDialogVisible.set(false);
    this.loadExistingForm(form.id, { updateRoute: true });
  }

  /**
   * Synchronizes dialog visibility changes with the internal signal.
   */
  onFormsDialogVisibleChange(visible: boolean): void {
    this.formsListDialogVisible.set(visible);
  }

  /**
   * Deletes a form from the list.
   */
  onDeleteForm(form: FormMetadata): void {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${form.title}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    this.setFormDeleting(form.id, true);

    this.formsApiService.deleteForm(form.id).subscribe({
      next: () => {
        this.availableForms.update((forms) => forms.filter((f) => f.id !== form.id));
        this.setFormDeleting(form.id, false);

        if (this.formBuilderService.currentForm()?.id === form.id) {
          this.formBuilderService.resetForm();
          this.formSettings.set({
            title: 'Untitled Form',
            description: '',
            columnLayout: 1,
            fieldSpacing: 'normal',
            successMessage: 'Thank you for your submission!',
            redirectUrl: '',
            allowMultipleSubmissions: true,
          });
          this.router.navigate(['/app/tools/form-builder']);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Form Deleted',
          detail: `${form.title} has been removed`,
          life: 3000,
        });
      },
      error: (error) => {
        this.setFormDeleting(form.id, false);
        this.messageService.add({
          severity: 'error',
          summary: 'Delete Failed',
          detail: error.error?.message || 'Failed to delete form',
          life: 3000,
        });
      },
    });
  }

  /**
   * Fetches the authenticated user's forms for selection.
   */
  private fetchAvailableForms(): void {
    this.formsListLoading.set(true);
    this.formsListError.set(null);

    this.formsApiService.getForms(1, 50).subscribe({
      next: (response) => {
        this.availableForms.set(response.data ?? []);
        this.formsListLoading.set(false);
      },
      error: (error) => {
        this.formsListLoading.set(false);
        this.formsListError.set(error.error?.message || 'Failed to load your forms');
      },
    });
  }

  isFormDeleting(formId: string): boolean {
    return this.formsDeleting().has(formId);
  }

  private setFormDeleting(formId: string, deleting: boolean): void {
    this.formsDeleting.update((current) => {
      const next = new Set(current);
      if (deleting) {
        next.add(formId);
      } else {
        next.delete(formId);
      }
      return next;
    });
  }

  /**
   * Handles form preview (Story 14.3).
   * Opens preview dialog with current form schema (includes unsaved changes).
   */
  onPreview(): void {
    const settings = this.formSettings();
    const backgroundSettings = {
      type: settings.backgroundType || 'none',
      imageUrl: settings.backgroundImageUrl || '',
      imagePosition: settings.backgroundImagePosition || 'cover',
      imageOpacity: settings.backgroundImageOpacity ?? 100,
      imageAlignment: settings.backgroundImageAlignment || 'center',
      imageBlur: settings.backgroundImageBlur ?? 0,
      customHtml: settings.backgroundCustomHtml || '',
      customCss: settings.backgroundCustomCss || '',
    };
    const layoutSpacing =
      settings.fieldSpacing === 'compact'
        ? 'small'
        : settings.fieldSpacing === 'normal'
          ? 'medium'
          : 'large';

    // Export current form data (in-memory, includes unsaved changes)
    // Note: For preview mode, we only need fields and settings, not full FormSchema
    const schema: any = {
      fields: this.formBuilderService.formFields(),
      settings: {
        layout: {
          columns: settings.columnLayout,
          spacing: layoutSpacing,
        },
        submission: {
          showSuccessMessage: true,
          successMessage: settings.successMessage || 'Thank you for your submission!',
          redirectUrl: settings.redirectUrl || undefined,
          allowMultipleSubmissions: settings.allowMultipleSubmissions,
        },
        background: backgroundSettings,
        // Include row layout configuration if enabled
        rowLayout: this.formBuilderService.rowLayoutEnabled()
          ? {
              enabled: true,
              rows: this.formBuilderService.getRowLayout(),
            }
          : undefined,
      },
    };

    // Set preview schema and show dialog
    this.previewFormSchema.set(schema);
    this.previewDialogVisible.set(true);
  }

  /**
   * Closes preview dialog (Story 14.3).
   */
  closePreview(): void {
    this.previewDialogVisible.set(false);
    this.previewFormSchema.set(null);
  }

  /**
   * Navigates to the Forms List view.
   * Checks for unsaved changes and prompts the user before navigating.
   */
  navigateToFormsList(): void {
    // Check if there are unsaved changes
    if (this.formBuilderService.isDirty()) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Do you want to save before leaving?',
      );

      if (confirmLeave) {
        // User wants to save - trigger save and then navigate
        this.saveDraft(false);
        // Wait a bit for save to complete, then navigate
        setTimeout(() => {
          if (!this.formBuilderService.isDirty()) {
            this.router.navigate(['/app/tools/form-builder/list']);
          }
        }, 500);
      } else {
        // User doesn't want to save - ask if they want to discard
        const confirmDiscard = window.confirm('Are you sure you want to discard your changes?');
        if (confirmDiscard) {
          this.router.navigate(['/app/tools/form-builder/list']);
        }
      }
    } else {
      // No unsaved changes, navigate directly
      this.router.navigate(['/app/tools/form-builder/list']);
    }
  }

  /**
   * Navigates back to the Tools List.
   * The unsaved changes guard will automatically prompt the user if there are unsaved changes.
   */
  navigateToToolsList(): void {
    this.router.navigate(['/app/tools']);
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
          this.router.navigate(['/app/tools/form-builder', savedForm.id], { replaceUrl: true });
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
   * Gets the public form URL for the currently loaded published form.
   * @returns The full public URL with render token, or empty string if not published
   */
  getPublicFormUrl(): string {
    const renderToken = this.formBuilderService.currentForm()?.schema?.renderToken;
    if (!renderToken) {
      return '';
    }
    return `${window.location.origin}/forms/render/${renderToken}`;
  }

  /**
   * Copies the public form URL to clipboard.
   * Shows success or error toast notification.
   */
  copyPublicUrl(): void {
    const url = this.getPublicFormUrl();
    if (!url) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No URL Available',
        detail: 'Form is not published or URL is not available',
        life: 3000,
      });
      return;
    }

    navigator.clipboard.writeText(url).then(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'URL Copied',
          detail: 'Public form URL copied to clipboard',
          life: 2000,
        });
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Copy Failed',
          detail: 'Failed to copy URL to clipboard',
          life: 3000,
        });
      },
    );
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
      [FormFieldType.GROUP]: 'Group Container',
      [FormFieldType.HEADING]: 'Untitled Heading',
      [FormFieldType.IMAGE]: 'Image',
      [FormFieldType.TEXT_BLOCK]: 'Text Block',
    };
    return labelMap[type] || 'Field';
  }

  /**
   * Normalizes column layout values coming from stored schemas.
   * Values greater than the supported maximum fall back to 3 columns, otherwise default to 1.
   */
  private normalizeColumnLayout(columns: number | null | undefined): 1 | 2 | 3 {
    if (columns === 2) {
      return 2;
    }

    if (columns === 3 || (columns ?? 1) > 3) {
      return 3;
    }

    return 1;
  }

  /**
   * Extracts background settings from schema settings (not from fields).
   * Background settings are now stored in schema.settings.background, not as fields.
   */
  private extractBackgroundSettings(fields: FormField[]): Partial<FormSettings> {
    // Background settings are now managed in schema.settings.background
    // This method is kept for compatibility but returns default values
    return {
      backgroundType: 'none',
      backgroundImageUrl: '',
      backgroundImagePosition: 'cover',
      backgroundImageOpacity: 100,
      backgroundImageAlignment: 'center',
      backgroundImageBlur: 0,
      backgroundCustomHtml: '',
      backgroundCustomCss: '',
    };
  }

  /**
   * Syncs background settings - NO-OP.
   * Background settings are now stored directly in schema.settings.background
   * and are not represented as fields in the form.
   */
  private syncBackgroundSettingsToFields(settings: FormSettings): void {
    // Background settings are now managed in form-settings.component
    // They are stored in schema.settings.background, not as fields
    // This method is kept for compatibility but does nothing
  }
}
