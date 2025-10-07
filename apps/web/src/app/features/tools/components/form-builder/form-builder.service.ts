import { Injectable, signal, computed } from '@angular/core';
import {
  FormMetadata,
  FormField,
  FormSchema,
  FormFieldType,
  FormStatus,
} from '@nodeangularfullstack/shared';

/**
 * Form Builder service for managing form state.
 * Provides signal-based reactive state management for the form builder UI.
 */
@Injectable({
  providedIn: 'root',
})
export class FormBuilderService {
  // State signals
  private readonly _currentForm = signal<FormMetadata | null>(null);
  private readonly _formFields = signal<FormField[]>([]);
  private readonly _selectedField = signal<FormField | null>(null);
  private readonly _isDirty = signal<boolean>(false);

  // Public readonly signals
  readonly currentForm = this._currentForm.asReadonly();
  readonly formFields = this._formFields.asReadonly();
  readonly selectedField = this._selectedField.asReadonly();
  readonly isDirty = this._isDirty.asReadonly();

  // Computed signals
  readonly hasFields = computed(() => this._formFields().length > 0);
  readonly selectedFieldIndex = computed(() => {
    const selected = this._selectedField();
    if (!selected) return -1;
    return this._formFields().findIndex((f) => f.id === selected.id);
  });
  readonly isPublished = computed(() => {
    const form = this._currentForm();
    return form?.status === FormStatus.PUBLISHED;
  });
  readonly currentFormId = computed(() => this._currentForm()?.id || null);

  /**
   * Adds a new field to the form canvas.
   * @param field - The field to add
   */
  addField(field: FormField): void {
    this._formFields.update((fields) => [...fields, field]);
    this.markDirty();
  }

  /**
   * Updates an existing field at the specified index.
   * @param index - The index of the field to update
   * @param field - The updated field data
   */
  updateField(index: number, field: FormField): void {
    this._formFields.update((fields) => {
      const updated = [...fields];
      if (index >= 0 && index < updated.length) {
        updated[index] = field;
      }
      return updated;
    });
    this.markDirty();
  }

  /**
   * Removes a field by its ID.
   * @param fieldId - The ID of the field to remove
   */
  removeField(fieldId: string): void {
    this._formFields.update((fields) => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return fields;

      // Clear selection if the removed field was selected
      const selected = this._selectedField();
      if (selected?.id === fieldId) {
        this._selectedField.set(null);
      }

      const updated = [...fields];
      updated.splice(index, 1);
      return updated;
    });
    this.markDirty();
  }

  /**
   * Selects a field for editing in the properties panel.
   * @param field - The field to select, or null to deselect
   */
  selectField(field: FormField | null): void {
    this._selectedField.set(field);
  }

  /**
   * Resets the form state to default values.
   */
  resetForm(): void {
    this._currentForm.set(null);
    this._formFields.set([]);
    this._selectedField.set(null);
    this._isDirty.set(false);
  }

  /**
   * Marks the form as having unsaved changes.
   */
  markDirty(): void {
    this._isDirty.set(true);
  }

  /**
   * Marks the form as saved (no unsaved changes).
   */
  markClean(): void {
    this._isDirty.set(false);
  }

  /**
   * Marks the form as pristine (same as markClean).
   * Alias for consistency with Angular forms terminology.
   */
  markPristine(): void {
    this._isDirty.set(false);
  }

  /**
   * Sets the current form metadata.
   * @param form - The form metadata to set
   */
  setCurrentForm(form: FormMetadata | null): void {
    this._currentForm.set(form);
  }

  /**
   * Sets the form fields array.
   * @param fields - The fields array to set
   */
  setFormFields(fields: FormField[]): void {
    this._formFields.set(fields);
  }

  /**
   * Adds a new field from a field type.
   * Creates a FormField with default values and a unique ID.
   * @param type - The field type to add
   * @param atIndex - Optional index to insert the field at (defaults to end)
   */
  addFieldFromType(type: FormFieldType, atIndex?: number): void {
    const fields = this._formFields();
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: 'Untitled Field',
      fieldName: this.generateUniqueFieldName(type),
      placeholder: '',
      helpText: '',
      required: false,
      order: atIndex ?? fields.length,
      validation: {},
    };

    if (atIndex !== undefined && atIndex >= 0 && atIndex < fields.length) {
      // Insert at specific position
      this._formFields.update((currentFields) => {
        const updated = [...currentFields];
        updated.splice(atIndex, 0, newField);
        // Update order property for all fields to match array index
        return updated.map((field, index) => ({
          ...field,
          order: index,
        }));
      });
    } else {
      // Add to end
      this.addField(newField);
    }
    this.markDirty();
  }

  /**
   * Reorders fields in the canvas.
   * @param previousIndex - The previous index of the field
   * @param currentIndex - The new index for the field
   */
  reorderFields(previousIndex: number, currentIndex: number): void {
    this._formFields.update((fields) => {
      const updated = [...fields];
      const [movedField] = updated.splice(previousIndex, 1);
      updated.splice(currentIndex, 0, movedField);

      // Update order property for all fields to match array index
      return updated.map((field, index) => ({
        ...field,
        order: index,
      }));
    });
    this.markDirty();
  }

  /**
   * Generates a unique field name based on field type.
   * @param type - The field type
   * @returns A unique kebab-case field name
   */
  private generateUniqueFieldName(type: FormFieldType): string {
    const baseFieldName = this.convertToKebabCase(type);
    const existingFields = this._formFields();
    let counter = 1;
    let fieldName = baseFieldName;

    while (existingFields.some((f) => f.fieldName === fieldName)) {
      fieldName = `${baseFieldName}-${counter}`;
      counter++;
    }

    return fieldName;
  }

  /**
   * Converts a string to kebab-case.
   * @param str - The string to convert
   * @returns Kebab-case version of the string
   */
  private convertToKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Updates a single property of a field by its ID.
   * @param fieldId - The ID of the field to update
   * @param property - The property name to update
   * @param value - The new value for the property
   */
  updateFieldProperty(fieldId: string, property: keyof FormField, value: any): void {
    this._formFields.update((fields) => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return fields;
      const updated = [...fields];
      updated[index] = { ...updated[index], [property]: value };
      return updated;
    });
    this.markDirty();
  }

  /**
   * Updates multiple properties of a field by its ID.
   * @param fieldId - The ID of the field to update
   * @param updates - Partial field object with properties to update
   */
  updateFieldProperties(fieldId: string, updates: Partial<FormField>): void {
    this._formFields.update((fields) => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return fields;
      const updated = [...fields];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
    this.markDirty();
  }

  /**
   * Loads a form from metadata and populates all signals.
   * Marks the form as clean after loading.
   * @param form - The form metadata to load
   */
  loadForm(form: FormMetadata): void {
    this._currentForm.set(form);

    // Extract fields from schema if available
    if (form.schema?.fields) {
      this._formFields.set(form.schema.fields);
    } else {
      this._formFields.set([]);
    }

    // Clear selection
    this._selectedField.set(null);

    // Mark as clean since we just loaded
    this._isDirty.set(false);
  }

  /**
   * Exports the current form data for saving.
   * @param formSettings - Form settings from the settings dialog
   * @returns Complete form data ready for API submission
   */
  exportFormData(formSettings: {
    title: string;
    description: string;
    columnLayout: 1 | 2 | 3;
    fieldSpacing: 'compact' | 'normal' | 'relaxed';
    successMessage: string;
    redirectUrl: string;
    allowMultipleSubmissions: boolean;
  }): Partial<FormMetadata> {
    const currentForm = this._currentForm();
    const fields = this._formFields();

    const schema: Partial<FormSchema> = {
      fields,
      settings: {
        layout: {
          columns: formSettings.columnLayout,
          spacing:
            formSettings.fieldSpacing === 'compact'
              ? 'small'
              : formSettings.fieldSpacing === 'normal'
                ? 'medium'
                : 'large',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: formSettings.successMessage,
          redirectUrl: formSettings.redirectUrl || undefined,
          allowMultipleSubmissions: formSettings.allowMultipleSubmissions,
        },
      },
    };

    return {
      id: currentForm?.id,
      title: formSettings.title,
      description: formSettings.description || undefined,
      schema: schema as FormSchema,
    };
  }
}
