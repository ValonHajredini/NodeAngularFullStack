import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { TextInputPreviewComponent } from './text-input-preview.component';
import { SelectPreviewComponent } from './select-preview.component';
import { TextareaPreviewComponent } from './textarea-preview.component';
import { CheckboxPreviewComponent } from './checkbox-preview.component';
import { RadioPreviewComponent } from './radio-preview.component';
import { DatePreviewComponent } from './date-preview.component';
import { FilePreviewComponent } from './file-preview.component';
import { TogglePreviewComponent } from './toggle-preview.component';
import { DividerPreviewComponent } from './divider-preview.component';
import { GroupPreviewComponent } from './group-preview.component';
import { HeadingPreviewComponent } from './heading-preview.component';
import { InlineLabelEditorComponent } from './inline-label-editor.component';
import { InlineOptionManagerComponent } from './inline-option-manager.component';
import { ButtonModule } from 'primeng/button';
import { FormFieldOption } from '@nodeangularfullstack/shared';

/**
 * Field preview renderer wrapper component.
 * Routes to the appropriate preview component based on field type.
 * Provides WYSIWYG rendering for form builder canvas.
 * Includes inline label editing and settings button.
 */
@Component({
  selector: 'app-field-preview-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TextInputPreviewComponent,
    SelectPreviewComponent,
    TextareaPreviewComponent,
    CheckboxPreviewComponent,
    RadioPreviewComponent,
    DatePreviewComponent,
    FilePreviewComponent,
    TogglePreviewComponent,
    DividerPreviewComponent,
    GroupPreviewComponent,
    HeadingPreviewComponent,
    InlineLabelEditorComponent,
    InlineOptionManagerComponent,
    ButtonModule,
  ],
  template: `
    <div class="field-preview-wrapper relative">
      <!-- Inline Label Editor (for non-divider, non-group, and non-heading fields) -->
      @if (
        field.type !== FormFieldType.DIVIDER &&
        field.type !== FormFieldType.GROUP &&
        field.type !== FormFieldType.HEADING
      ) {
        <div
          class="label-section mb-2"
          (click)="$event.stopPropagation()"
          style="pointer-events: auto;"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <app-inline-label-editor
                [label]="field.label"
                [fieldId]="field.id"
                (labelChanged)="onLabelChanged($event)"
              />
            </div>
            @if (field.required) {
              <span class="text-red-500 ml-2">*</span>
            }
          </div>
        </div>
      }

      <!-- Field Preview -->
      <div class="field-control">
        @switch (field.type) {
          @case (FormFieldType.TEXT) {
            <app-text-input-preview [field]="field" />
          }
          @case (FormFieldType.EMAIL) {
            <app-text-input-preview [field]="field" />
          }
          @case (FormFieldType.NUMBER) {
            <app-text-input-preview [field]="field" />
          }
          @case (FormFieldType.SELECT) {
            <app-select-preview [field]="field" />
          }
          @case (FormFieldType.TEXTAREA) {
            <app-textarea-preview [field]="field" />
          }
          @case (FormFieldType.CHECKBOX) {
            <app-checkbox-preview [field]="field" />
          }
          @case (FormFieldType.RADIO) {
            <app-radio-preview [field]="field" />
          }
          @case (FormFieldType.DATE) {
            <app-date-preview [field]="field" />
          }
          @case (FormFieldType.DATETIME) {
            <app-date-preview [field]="field" />
          }
          @case (FormFieldType.FILE) {
            <app-file-preview [field]="field" />
          }
          @case (FormFieldType.TOGGLE) {
            <app-toggle-preview [field]="field" />
          }
          @case (FormFieldType.DIVIDER) {
            <app-divider-preview [field]="field" />
          }
          @case (FormFieldType.GROUP) {
            <app-group-preview [field]="field" />
          }
          @case (FormFieldType.HEADING) {
            <app-heading-preview [field]="field" />
          }
          @default {
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Unknown field type: {{ field.type }}
            </div>
          }
        }
      </div>

      <!-- Help Text -->
      @if (
        field.helpText &&
        field.type !== FormFieldType.DIVIDER &&
        field.type !== FormFieldType.GROUP &&
        field.type !== FormFieldType.HEADING
      ) {
        <small class="block mt-1 text-gray-500">{{ field.helpText }}</small>
      }

      <!-- Inline Option Manager (for select, radio, checkbox fields) -->
      @if (supportsOptions(field.type)) {
        <app-inline-option-manager [field]="field" (optionsChanged)="onOptionsChanged($event)" />
      }

      <!-- Settings Button -->
      <button
        type="button"
        class="settings-button absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        (click)="onSettingsClick($event)"
        style="pointer-events: auto;"
        [attr.aria-label]="'Settings for ' + field.label"
      >
        <i class="pi pi-cog text-gray-400 hover:text-blue-600"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .field-preview-wrapper {
        padding: 0;
      }

      .field-control {
        pointer-events: none;
      }

      .settings-button {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem;
        padding: 0.375rem 0.5rem;
        cursor: pointer;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      }

      .settings-button:hover {
        background: #f9fafb;
        border-color: #3b82f6;
      }
    `,
  ],
})
export class FieldPreviewRendererComponent {
  @Input({ required: true }) field!: FormField;
  @Output() labelChanged = new EventEmitter<string>();
  @Output() settingsClick = new EventEmitter<void>();
  @Output() fieldUpdated = new EventEmitter<Partial<FormField>>();

  // Expose FormFieldType enum to template
  readonly FormFieldType = FormFieldType;

  /**
   * Handles label change from inline editor.
   * @param newLabel - The new label value
   */
  onLabelChanged(newLabel: string): void {
    this.labelChanged.emit(newLabel);
  }

  /**
   * Handles settings button click.
   * Stops event propagation to prevent field selection.
   */
  onSettingsClick(event: Event): void {
    event.stopPropagation();
    this.settingsClick.emit();
  }

  /**
   * Check if field type supports options (select, radio, checkbox)
   */
  supportsOptions(type: FormFieldType): boolean {
    return [FormFieldType.SELECT, FormFieldType.RADIO, FormFieldType.CHECKBOX].includes(type);
  }

  /**
   * Handle options changed event from inline option manager
   */
  onOptionsChanged(newOptions: FormFieldOption[]): void {
    this.fieldUpdated.emit({ options: newOptions });
  }
}
