import { Injectable, signal, computed } from '@angular/core';
import {
  FormMetadata,
  FormField,
  FormSchema,
  FormFieldType,
  FormStatus,
  RowLayoutConfig,
  FieldPosition,
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

  // Row layout state signals
  private readonly _rowLayoutEnabled = signal<boolean>(false);
  private readonly _rowConfigs = signal<RowLayoutConfig[]>([]);

  // Public readonly signals
  readonly currentForm = this._currentForm.asReadonly();
  readonly formFields = computed(() => this._formFields().filter((field) => !field.parentGroupId));
  readonly selectedField = this._selectedField.asReadonly();
  readonly isDirty = this._isDirty.asReadonly();

  // Row layout public signals
  readonly rowLayoutEnabled = this._rowLayoutEnabled.asReadonly();
  readonly rowConfigs = this._rowConfigs.asReadonly();

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
   * Computed signal that groups fields by row.
   * Returns null if row layout is disabled (use global column layout instead).
   * Returns Map<rowId, FormField[]> when row layout is enabled.
   */
  readonly fieldsByRow = computed(() => {
    if (!this._rowLayoutEnabled()) {
      return null; // Use global column layout
    }

    const fields = this._formFields();
    const rows = this._rowConfigs();

    // Initialize map with all rows
    const groupedFields = new Map<string, FormField[]>();
    rows.forEach((row) => groupedFields.set(row.rowId, []));

    // Group fields by rowId
    fields.forEach((field) => {
      if (field.position?.rowId) {
        const rowFields = groupedFields.get(field.position.rowId) || [];
        rowFields.push(field);
        groupedFields.set(field.position.rowId, rowFields);
      } else {
        // Orphaned field - assign to first row
        if (rows.length > 0) {
          const firstRow = rows[0];
          const rowFields = groupedFields.get(firstRow.rowId) || [];
          rowFields.push(field);
          groupedFields.set(firstRow.rowId, rowFields);
        }
      }
    });

    return groupedFields;
  });

  /**
   * Computed signal: Fields grouped by row-column with sorting by orderInColumn.
   * Returns Map<rowId, Map<columnIndex, FormField[]>>
   * Fields within each column are sorted by orderInColumn (ascending).
   */
  readonly fieldsByRowColumn = computed(() => {
    const fields = this._formFields();
    const grouped = new Map<string, Map<number, FormField[]>>();

    fields.forEach((field) => {
      if (!field.position) return;

      const { rowId, columnIndex, orderInColumn = 0 } = field.position;

      if (!grouped.has(rowId)) {
        grouped.set(rowId, new Map());
      }

      const rowMap = grouped.get(rowId)!;
      if (!rowMap.has(columnIndex)) {
        rowMap.set(columnIndex, []);
      }

      const columnFields = rowMap.get(columnIndex)!;
      columnFields.push(field);
    });

    // Sort fields within each column by orderInColumn
    grouped.forEach((rowMap) => {
      rowMap.forEach((columnFields) => {
        columnFields.sort((a, b) => {
          const orderA = a.position?.orderInColumn ?? 0;
          const orderB = b.position?.orderInColumn ?? 0;
          return orderA - orderB;
        });
      });
    });

    return grouped;
  });

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
   * Clears position metadata when removing.
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
   * Auto-assigns to first available row-column if row layout is enabled.
   * @param type - The field type to add
   * @param atIndex - Optional index to insert the field at (defaults to end)
   */
  addFieldFromType(type: FormFieldType, atIndex?: number): FormField {
    const newField = this.createField(type);

    // Auto-assign position if row layout is enabled
    if (this._rowLayoutEnabled() && this._rowConfigs().length > 0) {
      const firstRow = this._rowConfigs()[0];
      newField.position = { rowId: firstRow.rowId, columnIndex: 0 };
    }

    this._formFields.update((currentFields) => {
      const updated = [...currentFields];
      if (atIndex !== undefined && atIndex >= 0 && atIndex <= updated.length) {
        updated.splice(atIndex, 0, newField);
      } else {
        updated.push(newField);
      }
      return this.recalculateOrder(updated);
    });

    this.markDirty();

    const createdField = this._formFields().find((field) => field.id === newField.id);
    return createdField ?? newField;
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

  private createField(type: FormFieldType): FormField {
    const fields = this._formFields();
    const baseField = {
      id: crypto.randomUUID(),
      type,
      label: type === FormFieldType.HEADING ? 'Untitled Heading' : 'Untitled Field',
      fieldName: this.generateUniqueFieldName(type),
      placeholder: '',
      helpText: '',
      required: type === FormFieldType.HEADING ? false : false, // Headings are never required
      order: fields.length,
      validation: {},
    };

    // Add HEADING-specific metadata
    if (type === FormFieldType.HEADING) {
      return {
        ...baseField,
        metadata: {
          headingLevel: 'h2',
          alignment: 'left',
          fontWeight: 'bold',
        },
      };
    }

    return baseField;
  }

  private recalculateOrder(fields: FormField[]): FormField[] {
    return fields.map((field, index) => ({
      ...field,
      order: index,
    }));
  }

  private calculateInsertIndex(
    fields: FormField[],
    parentGroupId: string | undefined,
    targetIndex?: number,
  ): number {
    if (!parentGroupId) {
      const topLevelFields = fields.filter((field) => !field.parentGroupId);
      if (targetIndex === undefined || targetIndex >= topLevelFields.length) {
        return fields.length;
      }
      const targetField = topLevelFields[targetIndex];
      if (!targetField) {
        return fields.length;
      }
      return fields.findIndex((field) => field.id === targetField.id);
    }

    const parentIndex = fields.findIndex((field) => field.id === parentGroupId);
    if (parentIndex === -1) {
      return fields.length;
    }

    const childFields = fields.filter((field) => field.parentGroupId === parentGroupId);

    if (childFields.length === 0) {
      return parentIndex + 1;
    }

    if (targetIndex === undefined || targetIndex >= childFields.length) {
      const lastChild = childFields[childFields.length - 1];
      const lastChildIndex = fields.findIndex((field) => field.id === lastChild.id);
      return lastChildIndex + 1;
    }

    const targetChild = childFields[targetIndex];
    if (!targetChild) {
      const lastChild = childFields[childFields.length - 1];
      const lastChildIndex = fields.findIndex((field) => field.id === lastChild.id);
      return lastChildIndex + 1;
    }

    return fields.findIndex((field) => field.id === targetChild.id);
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
   * Restores row layout configuration if present in schema.
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

    // Restore row layout configuration if present
    if (form.schema?.settings?.rowLayout?.enabled) {
      this._rowLayoutEnabled.set(true);
      this._rowConfigs.set(form.schema.settings.rowLayout.rows || []);
    } else {
      // Reset row layout state for forms without row layout
      this._rowLayoutEnabled.set(false);
      this._rowConfigs.set([]);
    }

    // Clear selection
    this._selectedField.set(null);

    // Mark as clean since we just loaded
    this._isDirty.set(false);
  }

  /**
   * Assigns a field to a parent group container.
   * Sets the parentGroupId on the field to enable group nesting.
   * @param fieldId - The ID of the field to assign
   * @param parentGroupId - The ID of the parent group (null to remove from group)
   */
  assignFieldToGroup(fieldId: string, parentGroupId: string | null, targetIndex?: number): void {
    this._formFields.update((fields) => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) {
        return fields;
      }

      const updated = [...fields];
      const [removedField] = updated.splice(index, 1);
      const reassigned: FormField = {
        ...removedField,
        parentGroupId: parentGroupId ?? undefined,
      };

      const insertIndex = this.calculateInsertIndex(updated, reassigned.parentGroupId, targetIndex);

      updated.splice(insertIndex, 0, reassigned);
      return this.recalculateOrder(updated);
    });
    this.markDirty();
  }

  /**
   * Gets all child fields that belong to a specific group.
   * Returns only direct children (not nested grandchildren).
   * @param groupId - The ID of the group
   * @returns Array of fields that have this group as their parent
   */
  getChildFields(groupId: string): FormField[] {
    return this._formFields()
      .filter((field) => field.parentGroupId === groupId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * Moves a field between groups or to/from top-level.
   * Updates the field's parentGroupId to the new parent.
   * @param fieldId - The ID of the field to move
   * @param newParentId - The ID of the new parent group (null for top-level)
   */
  moveFieldBetweenGroups(fieldId: string, newParentId: string | null): void {
    this.assignFieldToGroup(fieldId, newParentId);
  }

  /**
   * Gets all fields including nested children (for saving to database).
   * Returns the complete flattened array of all fields.
   * @returns Array of all fields regardless of parent relationships
   */
  getAllFields(): FormField[] {
    return this._formFields();
  }

  /**
   * Enable row-based layout mode.
   * Creates an initial row if none exist.
   */
  enableRowLayout(): void {
    this._rowLayoutEnabled.set(true);
    // Create initial row if none exist
    if (this._rowConfigs().length === 0) {
      this.addRow(2);
    }
    this.markDirty();
  }

  /**
   * Disable row-based layout mode.
   * Clears all row configurations and removes position metadata from fields.
   */
  disableRowLayout(): void {
    this._rowLayoutEnabled.set(false);
    this._rowConfigs.set([]);
    // Clear position metadata from fields
    this._formFields.update((fields) => fields.map((f) => ({ ...f, position: undefined })));
    this.markDirty();
  }

  /**
   * Add new row with specified column count.
   * @param columnCount - Number of columns in the row (1-4)
   * @returns Row ID of the created row
   */
  addRow(columnCount: 1 | 2 | 3 | 4 = 2): string {
    const rowId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order = this._rowConfigs().length;

    this._rowConfigs.update((rows) => [...rows, { rowId, columnCount, order }]);
    this.markDirty();

    return rowId;
  }

  /**
   * Remove row and reassign orphaned fields.
   * Fields in the removed row are moved to the first available row.
   * @param rowId - ID of the row to remove
   */
  removeRow(rowId: string): void {
    this._rowConfigs.update((rows) => rows.filter((r) => r.rowId !== rowId));

    // Reassign orphaned fields to first available row
    const firstRow = this._rowConfigs()[0];
    if (firstRow) {
      this._formFields.update((fields) =>
        fields.map((field) => {
          if (field.position?.rowId === rowId) {
            return { ...field, position: { rowId: firstRow.rowId, columnIndex: 0 } };
          }
          return field;
        }),
      );
    } else {
      // No rows left, clear all positions
      this._formFields.update((fields) => fields.map((f) => ({ ...f, position: undefined })));
    }
    this.markDirty();
  }

  /**
   * Update column count for a row.
   * Fields that exceed the new column count are moved to the last column.
   * @param rowId - ID of the row to update
   * @param columnCount - New column count (0-4)
   */
  updateRowColumns(rowId: string, columnCount: 0 | 1 | 2 | 3 | 4): void {
    this._rowConfigs.update((rows) =>
      rows.map((row) => (row.rowId === rowId ? { ...row, columnCount } : row)),
    );

    // Reassign fields that exceed new column count
    this._formFields.update((fields) =>
      fields.map((field) => {
        if (field.position?.rowId === rowId && field.position.columnIndex >= columnCount) {
          return { ...field, position: { rowId, columnIndex: Math.max(0, columnCount - 1) } };
        }
        return field;
      }),
    );
    this.markDirty();
  }

  /**
   * Get all fields in a specific column, sorted by orderInColumn.
   * @param rowId - Row identifier
   * @param columnIndex - Column index within row (0-3)
   * @returns Array of fields in the column, sorted by orderInColumn
   */
  getFieldsInColumn(rowId: string, columnIndex: number): FormField[] {
    const grouped = this.fieldsByRowColumn();
    const rowMap = grouped.get(rowId);
    if (!rowMap) return [];
    return rowMap.get(columnIndex) || [];
  }

  /**
   * Set field position within row-column layout.
   * If orderInColumn is not provided, defaults to 0 for backward compatibility.
   * When moving field to new column, recalculates orderInColumn for both old and new columns.
   * @param fieldId - ID of the field to position
   * @param position - Position within row-column layout
   */
  setFieldPosition(fieldId: string, position: FieldPosition): void {
    const targetPosition: FieldPosition = {
      ...position,
      orderInColumn: position.orderInColumn ?? 0,
    };

    // Get current field position
    const field = this._formFields().find((f) => f.id === fieldId);
    const oldPosition = field?.position;

    this._formFields.update((fields) =>
      fields.map((f) => {
        if (f.id === fieldId) {
          return { ...f, position: targetPosition };
        }

        // If field moved from one column to another, recalculate orderInColumn in old column
        if (
          oldPosition &&
          f.position?.rowId === oldPosition.rowId &&
          f.position?.columnIndex === oldPosition.columnIndex &&
          f.id !== fieldId
        ) {
          const oldOrder = oldPosition.orderInColumn ?? 0;
          const currentOrder = f.position.orderInColumn ?? 0;

          if (currentOrder > oldOrder) {
            // Shift fields up to fill gap
            return {
              ...f,
              position: {
                ...f.position,
                orderInColumn: currentOrder - 1,
              },
            };
          }
        }

        // Shift fields in target column to make room
        if (
          f.position?.rowId === targetPosition.rowId &&
          f.position?.columnIndex === targetPosition.columnIndex &&
          f.id !== fieldId
        ) {
          const currentOrder = f.position.orderInColumn ?? 0;

          if (currentOrder >= targetPosition.orderInColumn!) {
            // Shift fields down to make room
            return {
              ...f,
              position: {
                ...f.position,
                orderInColumn: currentOrder + 1,
              },
            };
          }
        }

        return f;
      }),
    );

    this.markDirty();
  }

  /**
   * Reorder field within its current column.
   * Updates the field's orderInColumn and shifts other fields to maintain sequential order.
   * @param fieldId - ID of the field to reorder
   * @param newOrderInColumn - New order index within column (0-based)
   */
  reorderFieldInColumn(fieldId: string, newOrderInColumn: number): void {
    const field = this._formFields().find((f) => f.id === fieldId);
    if (!field?.position) return;

    const { rowId, columnIndex } = field.position;
    const columnFields = this.getFieldsInColumn(rowId, columnIndex);
    const oldOrderInColumn = field.position.orderInColumn ?? 0;

    // Update target field's orderInColumn
    this._formFields.update((fields) =>
      fields.map((f) => {
        if (f.id === fieldId) {
          return {
            ...f,
            position: {
              ...f.position!,
              orderInColumn: newOrderInColumn,
            },
          };
        }

        // Shift other fields in same column to maintain sequential order
        if (
          f.position?.rowId === rowId &&
          f.position?.columnIndex === columnIndex &&
          f.id !== fieldId
        ) {
          const currentOrder = f.position.orderInColumn ?? 0;
          let newOrder = currentOrder;

          if (newOrderInColumn < oldOrderInColumn) {
            // Moving field up - shift fields down
            if (currentOrder >= newOrderInColumn && currentOrder < oldOrderInColumn) {
              newOrder = currentOrder + 1;
            }
          } else {
            // Moving field down - shift fields up
            if (currentOrder > oldOrderInColumn && currentOrder <= newOrderInColumn) {
              newOrder = currentOrder - 1;
            }
          }

          return {
            ...f,
            position: {
              ...f.position,
              orderInColumn: newOrder,
            },
          };
        }

        return f;
      }),
    );

    this.markDirty();
  }

  /**
   * Get current row layout configuration.
   * @returns Array of row configurations
   */
  getRowLayout(): RowLayoutConfig[] {
    return this._rowConfigs();
  }

  /**
   * Migrate global column layout to row-based layout.
   * Creates rows based on existing global column setting and distributes fields.
   * @param globalColumns - Number of columns in the global layout (1-3)
   */
  migrateToRowLayout(globalColumns: 1 | 2 | 3): void {
    this.enableRowLayout();

    const fields = this._formFields();
    const rowCount = Math.ceil(fields.length / globalColumns);

    // Create rows
    const rowIds: string[] = [];
    for (let i = 0; i < rowCount; i++) {
      const rowId = this.addRow(globalColumns);
      rowIds.push(rowId);
    }

    // Assign fields to rows
    this._formFields.update((fields) =>
      fields.map((field, index) => {
        const rowIndex = Math.floor(index / globalColumns);
        const columnIndex = index % globalColumns;
        return {
          ...field,
          position: { rowId: rowIds[rowIndex], columnIndex },
        };
      }),
    );
  }

  /**
   * Exports the current form data for saving.
   * Includes row layout configuration if enabled.
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
        // Include row layout configuration if enabled
        rowLayout: this._rowLayoutEnabled()
          ? {
              enabled: true,
              rows: this._rowConfigs(),
            }
          : undefined,
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
