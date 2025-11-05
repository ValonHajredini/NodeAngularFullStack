import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
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
import { ImagePreviewComponent } from './image-preview.component';
import { TextBlockPreviewComponent } from './text-block-preview.component';
import { ImageGalleryPreviewComponent } from './image-gallery-preview.component';
import { InlineLabelEditorComponent } from './inline-label-editor.component';
import { InlineOptionManagerComponent } from './inline-option-manager.component';
import { InlineImageGalleryManagerComponent } from './inline-image-gallery-manager.component';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { FormFieldOption, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import { ValidationPresetsService } from '../../field-properties/validation-presets.service';
import { FormBuilderService } from '../../form-builder.service';

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
    ImagePreviewComponent,
    TextBlockPreviewComponent,
    ImageGalleryPreviewComponent,
    InlineLabelEditorComponent,
    InlineOptionManagerComponent,
    InlineImageGalleryManagerComponent,
    ButtonModule,
    BadgeModule,
    TagModule,
  ],
  template: `
    <div class="field-preview-wrapper relative" [ngStyle]="customStyles">
      <!-- Field Type and Required Badges (above label) -->
      @if (shouldShowTypeBadge()) {
        <div class="field-badges flex gap-1">
          <p-tag [value]="getFieldTypeLabel()" severity="info" styleClass="badge-small" />
          @if (field.required) {
            <p-tag value="required" severity="danger" styleClass="badge-small" />
          }
        </div>
      }

      <!-- Inline Label Editor (for non-divider, non-group, non-heading, non-image, and non-text-block fields) -->
      @if (
        field.type !== FormFieldType.DIVIDER &&
        field.type !== FormFieldType.GROUP &&
        field.type !== FormFieldType.HEADING &&
        field.type !== FormFieldType.IMAGE &&
        field.type !== FormFieldType.TEXT_BLOCK
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
            <app-heading-preview
              [field]="field"
              (headingTextChanged)="onHeadingTextChanged($event)"
            />
          }
          @case (FormFieldType.IMAGE) {
            <app-image-preview
              [field]="field"
              [formId]="getFormId()"
              (imageUpdated)="onImageUpdated($event)"
            />
          }
          @case (FormFieldType.TEXT_BLOCK) {
            <app-text-block-preview
              [field]="field"
              (contentChanged)="onTextBlockContentChanged($event)"
            />
          }
          @case (FormFieldType.IMAGE_GALLERY) {
            <app-image-gallery-preview [field]="field" />
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
        field.type !== FormFieldType.HEADING &&
        field.type !== FormFieldType.IMAGE &&
        field.type !== FormFieldType.TEXT_BLOCK
      ) {
        <small class="block mt-1 theme-help-text">{{ field.helpText }}</small>
      }

      <!-- Validation Chips -->
      @if (hasValidationChips()) {
        <div class="validation-chips flex flex-wrap gap-2 mt-2">
          @if (getPatternChipLabel()) {
            <p-tag
              [value]="getPatternChipLabel()!"
              severity="info"
              styleClass="text-xs"
              icon="pi pi-check-circle"
            />
          }
          @if (getLengthChipLabel()) {
            <p-tag
              [value]="getLengthChipLabel()!"
              severity="info"
              styleClass="text-xs"
              icon="pi pi-arrows-h"
            />
          }
          @if (getRangeChipLabel()) {
            <p-tag
              [value]="getRangeChipLabel()!"
              severity="info"
              styleClass="text-xs"
              icon="pi pi-sliders-h"
            />
          }
        </div>
      }

      <!-- Custom CSS Summary Footer (Story 16.5 - AC 7) -->
      @if (hasCustomCSS()) {
        <div class="custom-css-footer mt-2 flex items-center gap-1 text-xs text-gray-600 italic">
          <i class="pi pi-code"></i>
          <span
            >Custom CSS: {{ getCSSRuleCount() }}
            {{ getCSSRuleCount() === 1 ? 'rule' : 'rules' }} applied</span
          >
        </div>
      }

      <!-- Inline Option Manager (for select, radio, checkbox fields) -->
      @if (supportsOptions(field.type)) {
        <app-inline-option-manager [field]="field" (optionsChanged)="onOptionsChanged($event)" />
      }

      <!-- Inline Image Gallery Manager (for IMAGE_GALLERY field) -->
      @if (field.type === FormFieldType.IMAGE_GALLERY) {
        <app-inline-image-gallery-manager
          [field]="field"
          [formId]="getFormId()"
          (metadataChange)="onGalleryMetadataChange($event)"
        />
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

      .field-badges {
        ::ng-deep .badge-small {
          opacity: 0.8;
          font-size: 0.65rem;
          padding: 0.15rem 0.35rem;
          border-radius: 0.375rem;
        }

        ::ng-deep .badge-small .p-tag-value {
          font-size: 0.65rem;
          line-height: 1;
        }
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

  // Inject services
  private readonly validationPresetsService = inject(ValidationPresetsService);
  private readonly formBuilderService = inject(FormBuilderService);

  /**
   * Parse custom CSS string into Angular style object.
   * Converts CSS string (e.g., "color: red; padding: 10px") to object {color: 'red', padding: '10px'}
   * Returns empty object if no custom style is defined.
   *
   * @returns Style object for ngStyle binding
   */
  protected get customStyles(): Record<string, string> {
    const customStyle = (this.field.metadata as any)?.customStyle;
    if (!customStyle || typeof customStyle !== 'string') {
      return {};
    }

    const styles: Record<string, string> = {};

    // Parse CSS string: split by semicolons, then split each rule by colon
    customStyle.split(';').forEach((rule) => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex === -1) return; // Skip malformed rules

      const property = rule.substring(0, colonIndex).trim();
      const value = rule.substring(colonIndex + 1).trim();

      if (property && value) {
        // Convert kebab-case CSS property to camelCase for Angular style binding
        const camelCaseProperty = property.replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase(),
        );
        styles[camelCaseProperty] = value;
      }
    });

    return styles;
  }

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

  /**
   * Check if any validation chips should be displayed.
   * @returns True if field has validation chips to show
   */
  hasValidationChips(): boolean {
    return !!(this.getPatternChipLabel() || this.getLengthChipLabel() || this.getRangeChipLabel());
  }

  /**
   * Get pattern validation chip label.
   * Returns preset name if pattern matches a preset, otherwise returns "Custom Pattern".
   * @returns Pattern chip label or null if no pattern validation
   * @example "Pattern: Email" or "Pattern: Custom"
   */
  getPatternChipLabel(): string | null {
    const pattern = this.field.validation?.pattern;
    if (!pattern) return null;

    // Check if pattern matches a preset
    const presets = this.validationPresetsService.getPresets();
    const matchingPreset = presets.find((p) => p.pattern === pattern);

    if (matchingPreset && matchingPreset.name !== 'custom') {
      return `Pattern: ${matchingPreset.label.replace(' Pattern', '')}`;
    }

    return 'Pattern: Custom';
  }

  /**
   * Get length constraint chip label for text fields.
   * Shows minLength and/or maxLength validation.
   * @returns Length chip label or null if no length constraints
   * @example "Length: 3-50" or "Min Length: 3" or "Max Length: 50"
   */
  getLengthChipLabel(): string | null {
    const validation = this.field.validation;
    if (!validation) return null;

    // Only show for text-based fields
    const textFields = [FormFieldType.TEXT, FormFieldType.EMAIL, FormFieldType.TEXTAREA];
    if (!textFields.includes(this.field.type)) return null;

    const hasMin = validation.minLength !== undefined && validation.minLength !== null;
    const hasMax = validation.maxLength !== undefined && validation.maxLength !== null;

    if (hasMin && hasMax) {
      return `Length: ${validation.minLength}-${validation.maxLength}`;
    } else if (hasMin) {
      return `Min Length: ${validation.minLength}`;
    } else if (hasMax) {
      return `Max Length: ${validation.maxLength}`;
    }

    return null;
  }

  /**
   * Get range constraint chip label for numeric fields.
   * Shows min and/or max value validation.
   * @returns Range chip label or null if no range constraints
   * @example "Range: 0-100" or "Min: 0" or "Max: 100"
   */
  getRangeChipLabel(): string | null {
    const validation = this.field.validation;
    if (!validation) return null;

    // Only show for numeric fields
    if (this.field.type !== FormFieldType.NUMBER) return null;

    const hasMin = validation.min !== undefined && validation.min !== null;
    const hasMax = validation.max !== undefined && validation.max !== null;

    if (hasMin && hasMax) {
      return `Range: ${validation.min}-${validation.max}`;
    } else if (hasMin) {
      return `Min: ${validation.min}`;
    } else if (hasMax) {
      return `Max: ${validation.max}`;
    }

    return null;
  }

  /**
   * Check if field has custom CSS defined (Story 16.5 - AC 7).
   * @returns True if field has non-empty customStyle metadata
   */
  protected hasCustomCSS(): boolean {
    const customStyle = (this.field.metadata as any)?.customStyle;
    return !!(customStyle && typeof customStyle === 'string' && customStyle.trim().length > 0);
  }

  /**
   * Count the number of CSS rules in custom style (Story 16.5 - AC 7).
   * Counts by splitting on semicolons and filtering non-empty rules.
   * @returns Number of CSS rules
   * @example "color: red; padding: 10px; margin: 5px;" => 3 rules
   */
  protected getCSSRuleCount(): number {
    const customStyle = (this.field.metadata as any)?.customStyle || '';
    return customStyle.split(';').filter((rule: string) => rule.trim().length > 0).length;
  }

  /**
   * Handle heading text change from inline editor.
   * Updates the field label with the new heading text.
   */
  onHeadingTextChanged(newText: string): void {
    this.fieldUpdated.emit({ label: newText });
  }

  /**
   * Handle text block content change from inline editor.
   * Updates the metadata.content with the new plain text content.
   */
  onTextBlockContentChanged(newContent: string): void {
    this.fieldUpdated.emit({
      metadata: {
        ...this.field.metadata,
        content: newContent,
      },
    });
  }

  /**
   * Get the current form ID from FormBuilderService or null if not saved yet.
   * Used by InlineImageGalleryManagerComponent for image uploads.
   * @returns Form ID string or null
   */
  getFormId(): string | null {
    return this.formBuilderService.currentFormId();
  }

  /**
   * Handle gallery metadata change from inline image gallery manager.
   * Updates the field metadata with new gallery configuration.
   */
  onGalleryMetadataChange(metadata: ImageGalleryMetadata): void {
    this.fieldUpdated.emit({ metadata });
  }

  /**
   * Handle image upload from image preview component.
   * Updates the field metadata with the new image URL.
   */
  onImageUpdated(imageUrl: string): void {
    const currentMetadata = this.field.metadata || {};
    this.fieldUpdated.emit({
      metadata: {
        ...currentMetadata,
        imageUrl,
      } as typeof this.field.metadata,
    });
  }

  /**
   * Determine if the field type badge should be shown.
   * Shows badge for all field types except GROUP (which is a container).
   * @returns True if field type badge should be displayed
   */
  shouldShowTypeBadge(): boolean {
    // Only exclude GROUP type (it's a container, not a field)
    return this.field.type !== FormFieldType.GROUP;
  }

  /**
   * Get human-readable label for field type badge.
   * Maps FormFieldType enum values to user-friendly labels.
   * @returns Field type label (e.g., "text", "email", "number")
   */
  getFieldTypeLabel(): string {
    const typeLabels: Record<FormFieldType, string> = {
      [FormFieldType.TEXT]: 'text',
      [FormFieldType.EMAIL]: 'email',
      [FormFieldType.NUMBER]: 'number',
      [FormFieldType.SELECT]: 'select',
      [FormFieldType.TEXTAREA]: 'textarea',
      [FormFieldType.CHECKBOX]: 'checkbox',
      [FormFieldType.RADIO]: 'radio',
      [FormFieldType.DATE]: 'date',
      [FormFieldType.DATETIME]: 'datetime',
      [FormFieldType.FILE]: 'file',
      [FormFieldType.TOGGLE]: 'toggle',
      [FormFieldType.DIVIDER]: 'divider',
      [FormFieldType.GROUP]: 'group',
      [FormFieldType.HEADING]: 'heading',
      [FormFieldType.IMAGE]: 'image',
      [FormFieldType.TEXT_BLOCK]: 'text block',
      [FormFieldType.IMAGE_GALLERY]: 'gallery',
    };
    return typeLabels[this.field.type] || this.field.type.toLowerCase();
  }
}
