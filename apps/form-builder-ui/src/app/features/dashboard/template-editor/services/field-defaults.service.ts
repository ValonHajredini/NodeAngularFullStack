import { Injectable } from '@angular/core';
import {
  FormField,
  FormFieldType,
  FormFieldOption,
  FormFieldValidation,
  HeadingMetadata,
  ImageMetadata,
  TextBlockMetadata,
  ImageGalleryMetadata,
  TimeSlotMetadata,
} from '@nodeangularfullstack/shared';

/**
 * Service for generating smart default values for form fields based on field type.
 *
 * This service provides intelligent defaults for all 18 field types including:
 * - Required base properties (id, type, label, fieldName, order, required)
 * - Type-specific validation (email patterns, number ranges)
 * - Default options for select/radio/checkbox fields
 * - Metadata for display elements (heading, image, text block, etc.)
 * - Unique field name generation to prevent conflicts
 *
 * **Usage**:
 * ```typescript
 * const newField = this.fieldDefaultsService.generateFieldDefaults(
 *   FormFieldType.EMAIL,
 *   existingFields
 * );
 * ```
 *
 * @see FormField - Complete field interface definition
 * @see FormFieldType - All available field types
 */
@Injectable({
  providedIn: 'root',
})
export class FieldDefaultsService {
  /**
   * Generate a complete field object with smart defaults based on field type.
   *
   * @param type - The field type to generate defaults for
   * @param existingFields - Array of existing fields (for unique name generation)
   * @returns Complete FormField object with intelligent defaults
   */
  generateFieldDefaults(type: FormFieldType, existingFields: FormField[]): FormField {
    const baseField = this.createBaseField(type, existingFields);

    // Apply type-specific defaults
    switch (type) {
      case FormFieldType.EMAIL:
        return this.applyEmailDefaults(baseField);
      case FormFieldType.NUMBER:
        return this.applyNumberDefaults(baseField);
      case FormFieldType.SELECT:
        return this.applySelectDefaults(baseField);
      case FormFieldType.CHECKBOX:
        return this.applyCheckboxDefaults(baseField);
      case FormFieldType.RADIO:
        return this.applyRadioDefaults(baseField);
      case FormFieldType.FILE:
        return this.applyFileDefaults(baseField);
      case FormFieldType.TEXTAREA:
        return this.applyTextareaDefaults(baseField);
      case FormFieldType.TIME_SLOT:
        return this.applyTimeSlotDefaults(baseField);
      case FormFieldType.HEADING:
        return this.applyHeadingDefaults(baseField);
      case FormFieldType.IMAGE:
        return this.applyImageDefaults(baseField);
      case FormFieldType.TEXT_BLOCK:
        return this.applyTextBlockDefaults(baseField);
      case FormFieldType.IMAGE_GALLERY:
        return this.applyImageGalleryDefaults(baseField);
      case FormFieldType.DIVIDER:
        return this.applyDividerDefaults(baseField);
      case FormFieldType.DATE:
        return this.applyDateDefaults(baseField);
      case FormFieldType.DATETIME:
        return this.applyDateTimeDefaults(baseField);
      case FormFieldType.TOGGLE:
        return this.applyToggleDefaults(baseField);
      case FormFieldType.TEXT:
      default:
        return baseField; // TEXT and GROUP use base defaults
    }
  }

  /**
   * Create base field structure with required properties.
   * Applies to all field types before type-specific customization.
   */
  private createBaseField(type: FormFieldType, existingFields: FormField[]): FormField {
    const fieldName = this.generateUniqueFieldName(type, existingFields);
    const label = this.getDefaultLabel(type);

    return {
      id: crypto.randomUUID(),
      type,
      label,
      fieldName,
      required: false,
      order: existingFields.length, // Append to end
      placeholder: '',
      helpText: '',
    };
  }

  /**
   * Generate a unique field name in kebab-case format.
   * Checks existing fields and appends number if duplicate (e.g., email_1, email_2).
   */
  private generateUniqueFieldName(type: FormFieldType, existingFields: FormField[]): string {
    const baseName = this.getBaseFieldName(type);
    let fieldName = baseName;
    let counter = 1;

    // Check for duplicates and increment counter
    while (existingFields.some((f) => f.fieldName === fieldName)) {
      fieldName = `${baseName}_${counter}`;
      counter++;
    }

    return fieldName;
  }

  /**
   * Get base field name for each field type (before uniqueness check).
   */
  private getBaseFieldName(type: FormFieldType): string {
    const baseNames: Record<FormFieldType, string> = {
      [FormFieldType.TEXT]: 'text',
      [FormFieldType.EMAIL]: 'email',
      [FormFieldType.NUMBER]: 'number',
      [FormFieldType.SELECT]: 'select',
      [FormFieldType.TEXTAREA]: 'textarea',
      [FormFieldType.FILE]: 'file',
      [FormFieldType.CHECKBOX]: 'checkbox',
      [FormFieldType.RADIO]: 'radio',
      [FormFieldType.DATE]: 'date',
      [FormFieldType.DATETIME]: 'datetime',
      [FormFieldType.TOGGLE]: 'toggle',
      [FormFieldType.IMAGE_GALLERY]: 'image_gallery',
      [FormFieldType.TIME_SLOT]: 'time_slot',
      [FormFieldType.DIVIDER]: 'divider',
      [FormFieldType.HEADING]: 'heading',
      [FormFieldType.IMAGE]: 'image',
      [FormFieldType.TEXT_BLOCK]: 'text_block',
      [FormFieldType.GROUP]: 'group',
    };

    return baseNames[type] || 'field';
  }

  /**
   * Get human-readable label for each field type.
   */
  private getDefaultLabel(type: FormFieldType): string {
    const labels: Record<FormFieldType, string> = {
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
      [FormFieldType.TOGGLE]: 'Toggle Switch',
      [FormFieldType.IMAGE_GALLERY]: 'Image Gallery',
      [FormFieldType.TIME_SLOT]: 'Time Slot Selector',
      [FormFieldType.DIVIDER]: 'Divider',
      [FormFieldType.HEADING]: 'Section Heading',
      [FormFieldType.IMAGE]: 'Image',
      [FormFieldType.TEXT_BLOCK]: 'Text Block',
      [FormFieldType.GROUP]: 'Field Group',
    };

    return labels[type] || 'Untitled Field';
  }

  // ========== Type-Specific Default Appliers ==========

  private applyEmailDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Enter your email',
      validation: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        errorMessage: 'Please enter a valid email address',
      } as FormFieldValidation,
    };
  }

  private applyNumberDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Enter a number',
      validation: {
        min: 0,
        max: 999999,
      } as FormFieldValidation,
    };
  }

  private applySelectDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Choose an option',
      options: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ] as FormFieldOption[],
    };
  }

  private applyCheckboxDefaults(field: FormField): FormField {
    return {
      ...field,
      options: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ] as FormFieldOption[],
    };
  }

  private applyRadioDefaults(field: FormField): FormField {
    return {
      ...field,
      options: [
        { label: 'Option 1', value: 'option_1' },
        { label: 'Option 2', value: 'option_2' },
      ] as FormFieldOption[],
    };
  }

  private applyFileDefaults(field: FormField): FormField {
    return {
      ...field,
      validation: {
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 5242880, // 5MB in bytes
      } as FormFieldValidation,
    };
  }

  private applyTextareaDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Enter your text here...',
      validation: {
        maxLength: 500,
      } as FormFieldValidation,
    };
  }

  private applyTimeSlotDefaults(field: FormField): FormField {
    return {
      ...field,
      metadata: {
        interval: '30min',
        startTime: '09:00',
        endTime: '17:00',
        timeFormat: '12h',
        maxSlots: 20,
        allowMultiple: false,
        useGlobalDefaults: true,
      } as TimeSlotMetadata,
    };
  }

  private applyHeadingDefaults(field: FormField): FormField {
    return {
      ...field,
      label: 'Section Heading',
      metadata: {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
      } as HeadingMetadata,
    };
  }

  private applyImageDefaults(field: FormField): FormField {
    return {
      ...field,
      label: 'Image',
      metadata: {
        altText: 'Image',
        alignment: 'center',
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
      } as ImageMetadata,
    };
  }

  private applyTextBlockDefaults(field: FormField): FormField {
    return {
      ...field,
      label: 'Text Block',
      metadata: {
        content: '<p>Add your instructions or information here...</p>',
        alignment: 'left',
        padding: 'medium',
        collapsible: false,
        collapsed: false,
      } as TextBlockMetadata,
    };
  }

  private applyImageGalleryDefaults(field: FormField): FormField {
    return {
      ...field,
      label: 'Image Gallery',
      metadata: {
        images: [],
        columns: 4,
        aspectRatio: 'square',
        maxImages: 10,
      } as ImageGalleryMetadata,
    };
  }

  private applyDividerDefaults(field: FormField): FormField {
    return {
      ...field,
      label: 'Divider',
      required: false,
    };
  }

  private applyDateDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Select a date',
    };
  }

  private applyDateTimeDefaults(field: FormField): FormField {
    return {
      ...field,
      placeholder: 'Select date and time',
    };
  }

  private applyToggleDefaults(field: FormField): FormField {
    return {
      ...field,
      defaultValue: false,
    };
  }
}
