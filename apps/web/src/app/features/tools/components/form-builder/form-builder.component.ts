import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonDirective } from 'primeng/button';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { FormBuilderService } from './form-builder.service';
import { FieldPaletteComponent } from './field-palette/field-palette.component';
import { FormCanvasComponent } from './form-canvas/form-canvas.component';
import { FieldPropertiesComponent } from './field-properties/field-properties.component';
import { FormSettingsComponent } from './form-settings/form-settings.component';

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
          <button
            pButton
            label="Settings"
            icon="pi pi-cog"
            severity="secondary"
            size="small"
            (click)="showSettingsDialog()"
          ></button>
          <button
            pButton
            label="Preview"
            icon="pi pi-eye"
            severity="secondary"
            size="small"
            (click)="onPreview()"
          ></button>
          <button
            pButton
            label="Save"
            icon="pi pi-save"
            size="small"
            (click)="onSave()"
            [disabled]="!formBuilderService.isDirty()"
          ></button>
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
export class FormBuilderComponent implements OnInit {
  readonly formBuilderService = inject(FormBuilderService);
  private readonly messageService = inject(MessageService);

  readonly settingsDialogVisible = signal<boolean>(false);
  private fieldCounter = 0;

  ngOnInit(): void {
    // Initialize component
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
    this.messageService.add({
      severity: 'success',
      summary: 'Form Saved',
      detail: 'Your form has been saved successfully',
      life: 3000,
    });
    this.formBuilderService.markClean();
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
