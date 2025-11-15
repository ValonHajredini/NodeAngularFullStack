import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  FormMetadata,
  FormField,
  FormSchema,
  FormFieldType,
  FormStatus,
  RowLayoutConfig,
  FieldPosition,
  FormStep,
  StepFormConfig,
  FormTheme,
  SubColumnConfig,
  MAX_STEPS,
  FormTemplate,
  QuizConfig,
} from '@nodeangularfullstack/shared';
import { ThemesApiService } from './themes-api.service';
import { ThemePreviewService } from './theme-preview.service';

/**
 * Internal sub-column configuration with row context for efficient state management.
 * Extends SubColumnConfig with rowId for normalized storage and O(1) lookups.
 */
interface SubColumnConfigInternal extends SubColumnConfig {
  /** Row identifier this sub-column configuration belongs to */
  rowId: string;
}

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

  // Row selection state signals (Story 28.2: Multi-Row Selection and Batch Duplication)
  private readonly _selectedRowIds = signal<string[]>([]);

  // Sub-column configuration state signals (Story 27.3)
  private readonly _subColumnConfigs = signal<SubColumnConfigInternal[]>([]);

  // Step form state signals
  private readonly _stepFormEnabled = signal<boolean>(false);
  private readonly _steps = signal<FormStep[]>([]);
  private readonly _activeStepId = signal<string | null>(null);

  // Theme state signals
  private readonly _currentTheme = signal<FormTheme | null>(null);
  private readonly _availableThemes = signal<FormTheme[]>([]);
  private readonly _isThemeLoading = signal<boolean>(false);

  // Template state signals (Story 29.8: Template Application to Form Builder)
  private readonly _selectedTemplate = signal<FormTemplate | null>(null);
  private readonly _templateMetadata = signal<{ id: string; name: string } | null>(null);

  // Quiz configuration state signals (Epic 29, Story 29.13: Quiz Settings in Form Builder)
  private readonly _quizConfig = signal<QuizConfig | null>(null);

  // Property change subjects for real-time preview updates (Story 16.5)
  private readonly propertyChangeSubject = new Subject<{
    fieldId: string;
    updates: Partial<FormField>;
  }>();
  private readonly debouncedPropertyUpdates$ = this.propertyChangeSubject.pipe(debounceTime(300));

  // Public readonly signals
  readonly currentForm = this._currentForm.asReadonly();
  readonly formFields = computed(() => this._formFields().filter((field) => !field.parentGroupId));
  readonly selectedField = this._selectedField.asReadonly();
  readonly isDirty = this._isDirty.asReadonly();

  // Row layout public signals
  readonly rowLayoutEnabled = this._rowLayoutEnabled.asReadonly();
  readonly rowConfigs = this._rowConfigs.asReadonly();

  // Row selection public signals (Story 28.2)
  readonly selectedRowIds = this._selectedRowIds.asReadonly();
  readonly selectedRowCount = computed(() => this._selectedRowIds().length);
  readonly hasSelectedRows = computed(() => this._selectedRowIds().length > 0);

  // Sub-column configuration public signals (Story 27.3)
  readonly subColumnConfigs = this._subColumnConfigs.asReadonly();

  // Step form public signals
  readonly stepFormEnabled = this._stepFormEnabled.asReadonly();
  readonly steps = this._steps.asReadonly();
  readonly activeStepId = this._activeStepId.asReadonly();

  // Theme public signals
  readonly currentTheme = this._currentTheme.asReadonly();
  readonly availableThemes = this._availableThemes.asReadonly();
  readonly isThemeLoading = this._isThemeLoading.asReadonly();

  // Template public signals (Story 29.8)
  readonly selectedTemplate = this._selectedTemplate.asReadonly();
  readonly templateMetadata = this._templateMetadata.asReadonly();
  readonly isTemplateMode = computed(() => this._selectedTemplate() !== null);

  // Quiz configuration public signals (Epic 29, Story 29.13)
  readonly quizConfig = this._quizConfig.asReadonly();
  readonly isQuizForm = computed(() => {
    const template = this._selectedTemplate();
    const quizConfig = this._quizConfig();
    const fields = this._formFields();

    // Check if created from quiz template
    if (template?.category === 'quiz') return true;

    // Check if has quiz config
    if (quizConfig !== null) return true;

    // Check if any field has quiz metadata (correctAnswer configured)
    // This handles legacy quiz forms that don't have businessLogicConfig
    const hasQuizFields = fields.some((field) => {
      const metadata = field.metadata as any;
      return metadata?.correctAnswer !== undefined;
    });

    return hasQuizFields;
  });

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

  // Step form computed signals
  readonly canAddStep = computed(() => this._steps().length < MAX_STEPS);
  readonly canDeleteStep = computed(() => this._steps().length > 1);
  readonly activeStep = computed(() => this._steps().find((s) => s.id === this._activeStepId()));
  readonly activeStepOrder = computed(() => this.activeStep()?.order ?? 0);

  /**
   * Computed signal providing efficient O(1) lookup for sub-column configurations.
   * Key format: `${rowId}-${columnIndex}` for direct row-column access.
   * Recomputes automatically when sub-column configs or row layouts change.
   * Story 27.3: Sub-Column State Management Infrastructure
   */
  readonly subColumnsByRowColumn = computed(() => {
    const map = new Map<string, SubColumnConfigInternal>();
    this._subColumnConfigs().forEach((config) => {
      const key = `${config.rowId}-${config.columnIndex}`;
      map.set(key, config);
    });
    return map;
  });

  private readonly themesApi = inject(ThemesApiService);
  private readonly themePreviewService = inject(ThemePreviewService);

  constructor() {
    // Subscribe to debounced property updates
    this.debouncedPropertyUpdates$.subscribe(({ fieldId, updates }) => {
      this.applyFieldUpdateWithoutMarkingDirty(fieldId, updates);
    });
  }

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
   * Also resets row layout, sub-column configs, step form state, and quiz config to default (disabled).
   */
  resetForm(): void {
    this._currentForm.set(null);
    this._formFields.set([]);
    this._selectedField.set(null);
    this._isDirty.set(false);
    this._rowLayoutEnabled.set(false);
    this._rowConfigs.set([]);
    this._subColumnConfigs.set([]); // Story 27.3
    this._stepFormEnabled.set(false);
    this._steps.set([]);
    this._activeStepId.set(null);
    this._quizConfig.set(null); // Epic 29, Story 29.13
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
      label:
        type === FormFieldType.HEADING
          ? 'Untitled Heading'
          : type === FormFieldType.IMAGE
            ? 'Image'
            : type === FormFieldType.TEXT_BLOCK
              ? 'Text Block'
              : type === FormFieldType.IMAGE_GALLERY
                ? 'Image Gallery'
                : 'Untitled Field',
      fieldName: this.generateUniqueFieldName(type),
      placeholder: '',
      helpText: '',
      required:
        type === FormFieldType.HEADING ||
        type === FormFieldType.IMAGE ||
        type === FormFieldType.TEXT_BLOCK
          ? false
          : false, // Display-only fields are never required
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

    // Add IMAGE-specific metadata
    if (type === FormFieldType.IMAGE) {
      return {
        ...baseField,
        metadata: {
          altText: 'Image',
          alignment: 'center',
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        },
      };
    }

    // Add TEXT_BLOCK-specific metadata
    if (type === FormFieldType.TEXT_BLOCK) {
      return {
        ...baseField,
        metadata: {
          content: '<p>Add your instructions here...</p>',
          alignment: 'left',
          padding: 'medium',
          collapsible: false,
          collapsed: false,
        },
      };
    }

    // Add IMAGE_GALLERY-specific metadata (Story 18.2)
    if (type === FormFieldType.IMAGE_GALLERY) {
      return {
        ...baseField,
        metadata: {
          images: [],
          columns: 4,
          aspectRatio: 'square',
          maxImages: 10,
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
   * Updates field property instantly for real-time canvas preview (Story 16.5).
   * Use for simple properties like label, placeholder, required.
   * Does NOT mark form as dirty (preview-only update).
   * @param fieldId - The ID of the field to update
   * @param updates - Partial field updates
   */
  updateFieldPropertyInstant(fieldId: string, updates: Partial<FormField>): void {
    this.applyFieldUpdateWithoutMarkingDirty(fieldId, updates);
    // Update selected field signal to trigger re-render
    const updatedField = this._formFields().find((f) => f.id === fieldId);
    if (updatedField && this._selectedField()?.id === fieldId) {
      this._selectedField.set(updatedField);
    }
  }

  /**
   * Updates field property with debounce (300ms) for real-time canvas preview (Story 16.5).
   * Use for expensive updates like custom CSS.
   * Does NOT mark form as dirty (preview-only update).
   * @param fieldId - The ID of the field to update
   * @param updates - Partial field updates
   */
  updateFieldPropertyDebounced(fieldId: string, updates: Partial<FormField>): void {
    this.propertyChangeSubject.next({ fieldId, updates });
  }

  /**
   * Applies field updates to form schema signal WITHOUT marking form as dirty.
   * Used for real-time preview updates (Story 16.5).
   * @private
   * @param fieldId - The ID of the field to update
   * @param updates - Partial field updates
   */
  private applyFieldUpdateWithoutMarkingDirty(fieldId: string, updates: Partial<FormField>): void {
    this._formFields.update((fields) => {
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return fields;
      const updated = [...fields];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
    // Update selected field signal to trigger re-render
    const updatedField = this._formFields().find((f) => f.id === fieldId);
    if (updatedField && this._selectedField()?.id === fieldId) {
      this._selectedField.set(updatedField);
    }
  }

  /**
   * Loads a form from metadata and populates all signals.
   * Restores row layout, sub-columns, and step form configuration if present in schema.
   * Marks the form as clean after loading.
   * Story 27.3: Includes sub-column configuration loading
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

      // Load sub-column configurations from rows (Story 27.3)
      const subColumnConfigs: SubColumnConfigInternal[] = [];
      form.schema.settings.rowLayout.rows?.forEach((row) => {
        if (row.subColumns && row.subColumns.length > 0) {
          // Add rowId context to each sub-column config for internal state
          row.subColumns.forEach((subCol) => {
            subColumnConfigs.push({
              ...subCol,
              rowId: row.rowId,
            });
          });
        }
      });
      this._subColumnConfigs.set(subColumnConfigs);
    } else {
      // Reset row layout and sub-column state for forms without row layout
      this._rowLayoutEnabled.set(false);
      this._rowConfigs.set([]);
      this._subColumnConfigs.set([]);
    }

    // Restore step form configuration if present
    if (form.schema?.settings?.stepForm?.enabled) {
      this._stepFormEnabled.set(true);
      this._steps.set(form.schema.settings.stepForm.steps || []);
      // Set active step to first step by default
      if (form.schema.settings.stepForm.steps?.length > 0) {
        this._activeStepId.set(form.schema.settings.stepForm.steps[0].id);
      }
    } else {
      // Reset step form state for forms without step configuration
      this._stepFormEnabled.set(false);
      this._steps.set([]);
      this._activeStepId.set(null);
    }

    // Restore quiz configuration if present (Epic 29, Story 29.13: Quiz Field Configuration)
    if (form.schema?.settings?.businessLogicConfig) {
      this._quizConfig.set(form.schema.settings.businessLogicConfig as any);
    } else {
      // Reset quiz config for non-quiz forms
      this._quizConfig.set(null);
    }

    // Clear selection
    this._selectedField.set(null);

    // Load theme if form has themeId
    if (form.schema?.settings?.themeId) {
      this.loadTheme(form.schema.settings.themeId);
    }

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
   * @param defaultColumns - Number of columns for the initial row (default: 1)
   */
  enableRowLayout(defaultColumns: 1 | 2 | 3 | 4 = 1): void {
    this._rowLayoutEnabled.set(true);
    // Create initial row if none exist
    if (this._rowConfigs().length === 0) {
      this.addRow(defaultColumns);
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
   * Assigns stepId when step mode is enabled.
   * @param columnCount - Number of columns in the row (1-4)
   * @returns Row ID of the created row
   */
  addRow(columnCount: 1 | 2 | 3 | 4 = 2): string {
    const rowId = `row_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const order = this._rowConfigs().length;
    const stepId = this._stepFormEnabled() ? this._activeStepId() || undefined : undefined;

    this._rowConfigs.update((rows) => [...rows, { rowId, columnCount, order, stepId }]);
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
   * Duplicates an existing row with all fields and configuration.
   * Clones row config, fields, sub-columns, and inserts below source row.
   * Story 28.1: Single Row Duplication with Field Preservation
   *
   * @param rowId - ID of the row to duplicate
   * @returns New row ID, or empty string if duplication fails
   *
   * @example
   * // Duplicate a row with 2 columns
   * const newRowId = formBuilderService.duplicateRow('row_123');
   * console.log('Row duplicated successfully. New row ID:', newRowId);
   */
  duplicateRow(rowId: string): string {
    const sourceRow = this._rowConfigs().find((r) => r.rowId === rowId);
    if (!sourceRow) {
      console.error('Source row not found:', rowId);
      return '';
    }

    try {
      // Generate new row ID
      const newRowId = crypto.randomUUID();

      // Clone row configuration with new ID
      const newRow: RowLayoutConfig = {
        rowId: newRowId,
        columnCount: sourceRow.columnCount,
        columnWidths: sourceRow.columnWidths ? [...sourceRow.columnWidths] : undefined,
        subColumns: sourceRow.subColumns
          ? sourceRow.subColumns.map((sc) => ({ ...sc }))
          : undefined,
        order: sourceRow.order + 1,
        stepId: sourceRow.stepId,
      };

      // Insert new row and reorder subsequent rows
      this._rowConfigs.update((rows) => {
        const updated = [...rows];
        const insertIndex = updated.findIndex((r) => r.rowId === rowId) + 1;
        updated.splice(insertIndex, 0, newRow);

        // Reorder all rows to maintain sequential order
        return updated.map((row, index) => ({
          ...row,
          order: index,
        }));
      });

      // Clone fields in source row
      const fieldsToClone = this._formFields().filter((f) => f.position?.rowId === rowId);

      const clonedFields: FormField[] = fieldsToClone.map((field) => {
        const newFieldId = crypto.randomUUID();
        const newFieldName = this.generateUniqueFieldName(field.type);

        return {
          ...field,
          id: newFieldId,
          fieldName: newFieldName,
          position: field.position
            ? {
                ...field.position,
                rowId: newRowId,
              }
            : undefined,
        };
      });

      // Add cloned fields to form
      this._formFields.update((fields) => [...fields, ...clonedFields]);

      // Clone sub-column configs if present
      const sourceSubColumns = this._subColumnConfigs().filter((sc) => sc.rowId === rowId);
      if (sourceSubColumns.length > 0) {
        const clonedSubColumns: SubColumnConfigInternal[] = sourceSubColumns.map((sc) => ({
          ...sc,
          rowId: newRowId,
        }));
        this._subColumnConfigs.update((configs) => [...configs, ...clonedSubColumns]);
      }

      this.markDirty();
      console.log(`Row ${sourceRow.order + 1} duplicated successfully. New row ID: ${newRowId}`);
      return newRowId;
    } catch (error) {
      console.error('Failed to duplicate row:', error);
      return '';
    }
  }

  /**
   * Toggles row selection state (add or remove from selection).
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * @param rowId - ID of the row to select/deselect
   */
  selectRow(rowId: string): void {
    this._selectedRowIds.update((selected) => {
      const index = selected.indexOf(rowId);
      if (index > -1) {
        // Already selected, deselect it
        return selected.filter((id) => id !== rowId);
      } else {
        // Not selected, add it
        return [...selected, rowId];
      }
    });
  }

  /**
   * Removes row from selection.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * @param rowId - ID of the row to deselect
   */
  deselectRow(rowId: string): void {
    this._selectedRowIds.update((selected) => selected.filter((id) => id !== rowId));
  }

  /**
   * Clears all row selections.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   */
  clearSelection(): void {
    this._selectedRowIds.set([]);
  }

  /**
   * Selects a continuous range of rows.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * @param startRowId - Starting row ID
   * @param endRowId - Ending row ID
   */
  selectRowRange(startRowId: string, endRowId: string): void {
    const rows = this._rowConfigs();
    const startIndex = rows.findIndex((r) => r.rowId === startRowId);
    const endIndex = rows.findIndex((r) => r.rowId === endRowId);

    if (startIndex === -1 || endIndex === -1) {
      console.error('Invalid row range:', startRowId, endRowId);
      return;
    }

    const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    const rangeRowIds = rows.slice(min, max + 1).map((r) => r.rowId);

    this._selectedRowIds.update((selected) => {
      const newSelection = new Set([...selected, ...rangeRowIds]);
      return Array.from(newSelection);
    });
  }

  /**
   * Checks if row is selected.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * @param rowId - ID of the row
   * @returns True if row is in selection set
   */
  isRowSelected(rowId: string): boolean {
    return this._selectedRowIds().includes(rowId);
  }

  /**
   * Duplicates multiple rows as a batch.
   * Maintains relative order and inserts below source rows.
   * Story 28.2: Multi-Row Selection and Batch Duplication
   * @param rowIds - Array of row IDs to duplicate
   * @returns Array of new row IDs in same order
   * @example
   * // Duplicate 2 selected rows
   * const newRowIds = formBuilderService.duplicateRows(['row_1', 'row_2']);
   * console.log(`${newRowIds.length} rows duplicated successfully`);
   */
  duplicateRows(rowIds: string[]): string[] {
    // Validate all rowIds exist
    const validRowIds = rowIds.filter((id) => {
      const exists = this._rowConfigs().some((r) => r.rowId === id);
      if (!exists) {
        console.error('Invalid row ID:', id);
      }
      return exists;
    });

    if (validRowIds.length === 0) {
      console.error('No valid row IDs provided');
      return [];
    }

    // Sort rowIds by source row order to maintain relative positions
    const sortedRowIds = validRowIds.sort((a, b) => {
      const orderA = this._rowConfigs().find((r) => r.rowId === a)?.order ?? 0;
      const orderB = this._rowConfigs().find((r) => r.rowId === b)?.order ?? 0;
      return orderA - orderB;
    });

    // Duplicate each row sequentially
    const newRowIds: string[] = [];
    sortedRowIds.forEach((rowId) => {
      const newRowId = this.duplicateRow(rowId);
      if (newRowId) {
        newRowIds.push(newRowId);
      }
    });

    // Clear selection after duplication
    this.clearSelection();

    return newRowIds;
  }

  /**
   * Update column count for a row.
   * Fields that exceed the new column count are moved to the last column.
   * Preserves orderInColumn and subColumnIndex properties when reassigning.
   * @param rowId - ID of the row to update
   * @param columnCount - New column count (0-4)
   */
  updateRowColumns(rowId: string, columnCount: 0 | 1 | 2 | 3 | 4): void {
    this._rowConfigs.update((rows) =>
      rows.map((row) => (row.rowId === rowId ? { ...row, columnCount } : row)),
    );

    // Reassign fields that exceed new column count
    // IMPORTANT: Preserve orderInColumn and subColumnIndex using spread operator
    this._formFields.update((fields) =>
      fields.map((field) => {
        if (field.position?.rowId === rowId && field.position.columnIndex >= columnCount) {
          return {
            ...field,
            position: {
              ...field.position, // Preserve existing properties (orderInColumn, subColumnIndex)
              columnIndex: Math.max(0, columnCount - 1),
            },
          };
        }
        return field;
      }),
    );
    this.markDirty();
  }

  /**
   * Updates column widths for a specific row using fractional units.
   * Enables variable column width configuration (e.g., ["1fr", "3fr"] for 25%-75% split).
   *
   * @param rowId - Row identifier
   * @param widths - Array of fractional unit strings (e.g., ["1fr", "2fr"])
   * @throws Error if row not found or widths array length doesn't match row's columnCount
   *
   * @example
   * // Set 2-column row to 33%-67% width split
   * updateRowColumnWidths('row_123', ['1fr', '2fr']);
   *
   * // Set 3-column row to equal widths
   * updateRowColumnWidths('row_456', ['1fr', '1fr', '1fr']);
   */
  updateRowColumnWidths(rowId: string, widths: string[]): void {
    const row = this._rowConfigs().find((r) => r.rowId === rowId);
    if (!row) {
      throw new Error(`Row ${rowId} not found`);
    }
    if (widths.length !== row.columnCount) {
      throw new Error(`Must provide ${row.columnCount} width values, got ${widths.length}`);
    }

    this._rowConfigs.update((rows) =>
      rows.map((r) => (r.rowId === rowId ? { ...r, columnWidths: widths } : r)),
    );
    this.markDirty();
  }

  /**
   * Adds sub-column configuration to a parent column.
   * Creates nested sub-columns within a column for granular field positioning.
   * Defaults to equal-width sub-columns (subColumnWidths omitted).
   * Story 27.3: Sub-Column State Management Infrastructure
   *
   * @param rowId - Row identifier containing the parent column
   * @param columnIndex - Parent column index to subdivide (0-3)
   * @param subColumnCount - Number of sub-columns to create (1-4)
   * @throws Error if row doesn't exist, column index invalid, or sub-columns already configured
   *
   * @example
   * // Add 2 equal-width sub-columns to column 1 in row
   * addSubColumn('row_123', 1, 2);
   */
  addSubColumn(rowId: string, columnIndex: number, subColumnCount: 1 | 2 | 3 | 4): void {
    // Validate row exists
    const row = this._rowConfigs().find((r) => r.rowId === rowId);
    if (!row) {
      throw new Error(`Row ${rowId} not found`);
    }

    // Validate column index is within row's column count
    if (columnIndex >= row.columnCount) {
      throw new Error(`Column index ${columnIndex} exceeds row column count ${row.columnCount}`);
    }

    // Prevent duplicate sub-column config for same row-column pair
    const existing = this._subColumnConfigs().find(
      (sc) => sc.rowId === rowId && sc.columnIndex === columnIndex,
    );
    if (existing) {
      throw new Error(`Sub-columns already configured for row ${rowId} column ${columnIndex}`);
    }

    // Create new config with equal-width default (subColumnWidths omitted)
    const newConfig: SubColumnConfigInternal = {
      rowId,
      columnIndex,
      subColumnCount,
      // subColumnWidths omitted for equal-width default
    };

    this._subColumnConfigs.update((configs) => [...configs, newConfig]);
    this.markDirty();
  }

  /**
   * Removes sub-column configuration and moves fields to parent column.
   * Clears subColumnIndex from all fields in the sub-columns.
   * Story 27.3: Sub-Column State Management Infrastructure
   *
   * @param rowId - Row identifier containing the sub-columns
   * @param columnIndex - Parent column index with sub-columns
   *
   * @example
   * // Remove sub-columns from column 1 in row
   * removeSubColumn('row_123', 1);
   */
  removeSubColumn(rowId: string, columnIndex: number): void {
    // Remove sub-column config
    this._subColumnConfigs.update((configs) =>
      configs.filter((sc) => !(sc.rowId === rowId && sc.columnIndex === columnIndex)),
    );

    // Move fields from sub-columns to parent column (clear subColumnIndex)
    this._formFields.update((fields) =>
      fields.map((field) => {
        if (
          field.position?.rowId === rowId &&
          field.position.columnIndex === columnIndex &&
          field.position.subColumnIndex !== undefined
        ) {
          return {
            ...field,
            position: {
              ...field.position,
              subColumnIndex: undefined,
            },
          };
        }
        return field;
      }),
    );

    this.markDirty();
  }

  /**
   * Updates sub-column width ratios using fractional units.
   * Enables variable sub-column widths (e.g., ["1fr", "2fr"] for 33%-67% split).
   * Pass empty array to reset to equal-width.
   * Story 27.3: Sub-Column State Management Infrastructure
   *
   * @param rowId - Row identifier containing the sub-columns
   * @param columnIndex - Parent column index with sub-columns
   * @param widths - Fractional unit array (e.g., ["1fr", "2fr"]) or empty array for equal-width
   * @throws Error if sub-columns not configured or widths length doesn't match subColumnCount
   *
   * @example
   * // Set 2 sub-columns to 25%-75% split
   * updateSubColumnWidths('row_123', 1, ['1fr', '3fr']);
   *
   * // Reset to equal-width
   * updateSubColumnWidths('row_123', 1, []);
   */
  updateSubColumnWidths(rowId: string, columnIndex: number, widths: string[]): void {
    const config = this._subColumnConfigs().find(
      (sc) => sc.rowId === rowId && sc.columnIndex === columnIndex,
    );

    if (!config) {
      throw new Error(`No sub-columns configured for row ${rowId} column ${columnIndex}`);
    }

    // Validate widths array length matches subColumnCount (unless empty for equal-width)
    if (widths.length > 0 && widths.length !== config.subColumnCount) {
      throw new Error(`Must provide ${config.subColumnCount} width values, got ${widths.length}`);
    }

    this._subColumnConfigs.update((configs) =>
      configs.map((sc) => {
        if (sc.rowId === rowId && sc.columnIndex === columnIndex) {
          return {
            ...sc,
            subColumnWidths: widths.length > 0 ? widths : undefined,
          };
        }
        return sc;
      }),
    );

    this.markDirty();
  }

  /**
   * Updates sub-column count for an existing sub-column configuration.
   * Preserves fields in valid sub-columns and migrates fields from removed sub-columns.
   * Story 27.8: Field Preservation When Changing Sub-Column Count
   *
   * @param rowId - Row identifier containing the sub-columns
   * @param columnIndex - Parent column index with sub-columns
   * @param newCount - New sub-column count (1-4)
   * @throws Error if row doesn't exist, column invalid, or sub-columns not configured
   *
   * @example
   * // Increase sub-columns from 2 to 3 (fields in sub-columns 0-1 preserved)
   * updateSubColumnCount('row_123', 1, 3);
   *
   * // Decrease sub-columns from 3 to 2 (fields in sub-column 2 moved to sub-column 0)
   * updateSubColumnCount('row_123', 1, 2);
   */
  updateSubColumnCount(rowId: string, columnIndex: number, newCount: 1 | 2 | 3 | 4): void {
    // Validate row exists
    const row = this._rowConfigs().find((r) => r.rowId === rowId);
    if (!row) {
      throw new Error(`Row ${rowId} not found`);
    }

    // Validate column index
    if (columnIndex >= row.columnCount) {
      throw new Error(`Column index ${columnIndex} exceeds row column count ${row.columnCount}`);
    }

    // Validate sub-columns configured
    const config = this._subColumnConfigs().find(
      (sc) => sc.rowId === rowId && sc.columnIndex === columnIndex,
    );
    if (!config) {
      throw new Error(`Sub-columns not configured for row ${rowId} column ${columnIndex}`);
    }

    const oldCount = config.subColumnCount;

    // Update sub-column configuration
    this._subColumnConfigs.update((configs) =>
      configs.map((sc) => {
        if (sc.rowId === rowId && sc.columnIndex === columnIndex) {
          // Reset widths if array length doesn't match new count
          const widthsValid = sc.subColumnWidths && sc.subColumnWidths.length === newCount;
          return {
            ...sc,
            subColumnCount: newCount,
            subColumnWidths: widthsValid ? sc.subColumnWidths : undefined,
          };
        }
        return sc;
      }),
    );

    // If decreasing count, migrate fields from removed sub-columns
    if (newCount < oldCount) {
      this._formFields.update((fields) => {
        // Calculate starting order for migrated fields (append after existing sub-column 0 fields)
        const subColumn0Fields = fields.filter(
          (f) =>
            f.position?.rowId === rowId &&
            f.position.columnIndex === columnIndex &&
            f.position.subColumnIndex === 0,
        );
        let nextOrder =
          Math.max(...subColumn0Fields.map((f) => f.position?.orderInColumn ?? 0), -1) + 1;

        return fields.map((field) => {
          // Check if field is in a removed sub-column
          if (
            field.position?.rowId === rowId &&
            field.position.columnIndex === columnIndex &&
            field.position.subColumnIndex !== undefined &&
            field.position.subColumnIndex >= newCount
          ) {
            // Migrate to sub-column 0 with unique sequential order
            const migratedField = {
              ...field,
              position: {
                ...field.position,
                subColumnIndex: 0,
                orderInColumn: nextOrder,
              },
            };
            nextOrder++; // Increment for next migrated field
            return migratedField;
          }
          return field;
        });
      });
    }

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
   * Story 27.3: Validates subColumnIndex against sub-column configuration
   * @param fieldId - ID of the field to position
   * @param position - Position within row-column layout (including optional subColumnIndex)
   * @throws Error if subColumnIndex is invalid for the target column
   */
  setFieldPosition(fieldId: string, position: FieldPosition): void {
    // Validate subColumnIndex if provided (Story 27.3)
    if (position.subColumnIndex !== undefined) {
      const subColConfig = this._subColumnConfigs().find(
        (sc) => sc.rowId === position.rowId && sc.columnIndex === position.columnIndex,
      );

      if (!subColConfig) {
        throw new Error(
          `No sub-columns configured for row ${position.rowId} column ${position.columnIndex}`,
        );
      }

      if (position.subColumnIndex >= subColConfig.subColumnCount) {
        throw new Error(
          `Sub-column index ${position.subColumnIndex} exceeds sub-column count ${subColConfig.subColumnCount}`,
        );
      }
    }

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
   * Generates quiz scoring rules from field metadata.
   * Extracts quiz configuration (correct answers, points) from field metadata
   * and builds an array of QuizScoringRule objects for auto-scoring.
   * @returns Array of quiz scoring rules, or empty array if no quiz fields configured
   */
  private generateQuizScoringRules(): any[] {
    const fields = this._formFields();
    const quizRules: any[] = [];

    fields.forEach((field) => {
      // Check if field has quiz metadata
      const quizMetadata = field.metadata as any;
      if (quizMetadata?.correctAnswer) {
        quizRules.push({
          fieldId: field.id,
          correctAnswer: quizMetadata.correctAnswer,
          points: quizMetadata.points ?? 1,
        });
      }
    });

    return quizRules;
  }

  /**
   * Exports the current form data for saving.
   * Includes row layout, sub-columns, and step form configuration if enabled.
   * Story 27.3: Includes sub-column configuration serialization
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

    // Build row configs with sub-column configurations (Story 27.3)
    const rows: RowLayoutConfig[] = this._rowConfigs().map((row) => {
      const rowConfig: RowLayoutConfig = {
        rowId: row.rowId,
        columnCount: row.columnCount,
        order: row.order,
        stepId: row.stepId,
      };

      // Include column widths if configured
      if (row.columnWidths) {
        rowConfig.columnWidths = row.columnWidths;
      }

      // Include sub-columns if configured for this row (Story 27.3)
      const subColumnsForRow = this._subColumnConfigs()
        .filter((sc) => sc.rowId === row.rowId)
        .map((sc) => {
          // Strip rowId before serialization (implicit in nested structure)
          const { rowId, ...subColConfig } = sc;
          return subColConfig as SubColumnConfig;
        });

      if (subColumnsForRow.length > 0) {
        rowConfig.subColumns = subColumnsForRow;
      }

      return rowConfig;
    });

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
        // Include row layout configuration with sub-columns if enabled
        rowLayout: this._rowLayoutEnabled()
          ? {
              enabled: true,
              rows,
            }
          : undefined,
        // Include step form configuration if enabled
        stepForm: this._stepFormEnabled()
          ? {
              enabled: true,
              steps: this._steps(),
            }
          : undefined,
        // Include theme ID if a theme is applied (fallback to in-memory selection for unsaved forms)
        themeId: this._currentForm()?.schema?.settings?.themeId ?? this._currentTheme()?.id,
        // Include quiz configuration if present (Epic 29, Story 29.13)
        // Auto-generate scoring rules from field metadata
        businessLogicConfig: this._quizConfig()
          ? {
              ...this._quizConfig()!,
              scoringRules: this.generateQuizScoringRules(),
            }
          : undefined,
        // Include template ID reference if form was created from template
        templateId: this._templateMetadata()?.id ?? undefined,
      },
    };

    return {
      id: currentForm?.id,
      title: formSettings.title,
      description: formSettings.description || undefined,
      schema: schema as FormSchema,
    };
  }

  /**
   * Enable step form mode.
   * Creates a default first step and migrates all existing fields to that step.
   */
  enableStepForm(): void {
    const defaultStep: FormStep = {
      id: crypto.randomUUID(),
      title: 'Step 1',
      description: '',
      order: 0,
    };

    this._steps.set([defaultStep]);
    this._stepFormEnabled.set(true);
    this._activeStepId.set(defaultStep.id);

    // Assign existing rows to the new default step
    this._rowConfigs.update((rows) =>
      rows.map((row) => ({
        ...row,
        stepId: defaultStep.id,
      })),
    );

    // Migrate all existing fields to the first step
    this.migrateFieldsToStep(defaultStep.id);

    this.markDirty();
  }

  /**
   * Disable step form mode.
   * Clears all step assignments from fields and resets step state.
   */
  disableStepForm(): void {
    this._stepFormEnabled.set(false);
    this._steps.set([]);
    this._activeStepId.set(null);

    // Clear step assignments from rows
    this._rowConfigs.update((rows) =>
      rows.map((row) => ({
        ...row,
        stepId: undefined,
      })),
    );

    // Clear step assignments from fields
    this._formFields.update((fields) =>
      fields.map((field) => {
        if (field.position) {
          const { stepId, ...restPosition } = field.position;
          return { ...field, position: restPosition as FieldPosition };
        }
        return field;
      }),
    );

    this.markDirty();
  }

  /**
   * Add a new step to the form.
   * @param step - The step to add
   */
  addStep(step: FormStep): void {
    this._steps.update((steps) => [...steps, step]);
    this._activeStepId.set(step.id);
    this.markDirty();
  }

  /**
   * Remove a step and reassign its fields.
   * Fields in the removed step are moved to the first available step.
   * @param stepId - ID of the step to remove
   */
  removeStep(stepId: string): void {
    // Don't allow removing the last step
    if (this._steps().length <= 1) {
      return;
    }

    const remainingSteps = this._steps().filter((step) => step.id !== stepId);
    if (remainingSteps.length === this._steps().length) {
      return;
    }

    const normalizedSteps = remainingSteps.map((step, index) => ({ ...step, order: index }));
    this._steps.set(normalizedSteps);

    const firstStep = normalizedSteps[0];

    if (firstStep) {
      // Reassign fields from removed step to first step
      this._formFields.update((fields) =>
        fields.map((field) => {
          if (field.position?.stepId === stepId) {
            return {
              ...field,
              position: {
                ...field.position,
                stepId: firstStep.id,
              },
            };
          }
          return field;
        }),
      );

      // Reassign rows from removed step to first step
      this._rowConfigs.update((rows) =>
        rows.map((row) =>
          row.stepId === stepId
            ? {
                ...row,
                stepId: firstStep.id,
              }
            : row,
        ),
      );

      // Update active step if we removed the active one
      if (this._activeStepId() === stepId) {
        this._activeStepId.set(firstStep.id);
      }
    }

    this.markDirty();
  }

  /**
   * Update a step's properties.
   * @param stepId - ID of the step to update
   * @param updates - Partial step object with properties to update
   */
  updateStep(stepId: string, updates: Partial<FormStep>): void {
    this._steps.update((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, ...updates } : step)),
    );
    this.markDirty();
  }

  /**
   * Reorder steps after drag-and-drop.
   * Updates the order property of all steps based on array position.
   * @param newOrder - The new array of steps in desired order
   */
  reorderSteps(newOrder: FormStep[]): void {
    const reordered = newOrder.map((step, index) => ({ ...step, order: index }));
    this._steps.set(reordered);
    this.markDirty();
  }

  /**
   * Get a step by its ID.
   * @param stepId - ID of the step to retrieve
   * @returns The step or undefined if not found
   */
  getStepById(stepId: string): FormStep | undefined {
    return this._steps().find((s) => s.id === stepId);
  }

  /**
   * Set the active step for canvas navigation.
   * Updates the active step signal to trigger canvas updates.
   * @param stepId - ID of the step to activate
   */
  setActiveStep(stepId: string): void {
    const step = this._steps().find((s) => s.id === stepId);
    if (!step) {
      console.error('Invalid step ID:', stepId);
      return;
    }
    this._activeStepId.set(stepId);
  }

  /**
   * Migrate all fields to a specific step.
   * Used when enabling step mode to assign all existing fields to the first step.
   * @private
   * @param stepId - ID of the step to assign fields to
   */
  private migrateFieldsToStep(stepId: string): void {
    this._formFields.update((fields) =>
      fields.map((field) => ({
        ...field,
        position: field.position
          ? { ...field.position, stepId }
          : { rowId: '', columnIndex: 0, stepId },
      })),
    );
  }

  /**
   * Get all rows assigned to a specific step.
   * Returns rows filtered by stepId and sorted by order.
   * @param stepId - ID of the step to get rows for
   * @returns Array of row configurations for the step
   */
  getRowsByStep(stepId: string): RowLayoutConfig[] {
    return this._rowConfigs()
      .filter((row) => row.stepId === stepId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Move a row to a different step.
   * Updates the row's stepId property and marks form as dirty.
   * @param rowId - ID of the row to move
   * @param targetStepId - ID of the target step
   */
  moveRowToStep(rowId: string, targetStepId: string): void {
    // Verify target step exists
    const targetStep = this._steps().find((s) => s.id === targetStepId);
    if (!targetStep) {
      console.error('Target step not found:', targetStepId);
      return;
    }

    // Update row's stepId
    this._rowConfigs.update((rows) =>
      rows.map((row) => (row.rowId === rowId ? { ...row, stepId: targetStepId } : row)),
    );

    // Update all fields in this row to have the new stepId
    this._formFields.update((fields) =>
      fields.map((field) => {
        if (field.position?.rowId === rowId) {
          return {
            ...field,
            position: {
              ...field.position,
              stepId: targetStepId,
            },
          };
        }
        return field;
      }),
    );

    this.markDirty();
  }

  /**
   * Add a new row to a specific step.
   * Creates row with specified column count and assigns it to the step.
   * @param columnCount - Number of columns in the row (1-4)
   * @param stepId - ID of the step to add row to
   * @returns Row ID of the created row
   */
  addRowToStep(columnCount: 1 | 2 | 3 | 4, stepId: string): string {
    // Verify step exists
    const step = this._steps().find((s) => s.id === stepId);
    if (!step) {
      console.error('Step not found:', stepId);
      return '';
    }

    const rowId = `row_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const order = this._rowConfigs().length;

    this._rowConfigs.update((rows) => [...rows, { rowId, columnCount, order, stepId }]);
    this.markDirty();

    return rowId;
  }

  /**
   * Applies a theme to the current form.
   * Updates the form's themeId, applies CSS, and tracks theme application via API.
   * @param theme - The theme to apply (full FormTheme object)
   */
  applyTheme(theme: FormTheme): void {
    if (!theme) {
      console.warn('Cannot apply undefined theme');
      return;
    }

    // Update current form settings
    const currentForm = this._currentForm();
    if (currentForm) {
      if (!currentForm.schema) {
        currentForm.schema = {
          id: '',
          formId: currentForm.id,
          version: 1,
          fields: [],
          settings: {
            layout: { columns: 1, spacing: 'medium' },
            submission: {
              showSuccessMessage: true,
              successMessage: 'Thank you for your submission!',
              allowMultipleSubmissions: false,
            },
          },
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      currentForm.schema.settings.themeId = theme.id;
      this._currentTheme.set(theme);
      // Update the signal with the modified form to ensure themeId is persisted
      this._currentForm.set({ ...currentForm });
      this.markDirty(); // AC: 7
    }

    // Apply theme CSS to preview
    this.themePreviewService.applyThemeCss(theme);

    // Track theme application via API
    this.themesApi.applyTheme(theme.id).subscribe({
      next: (response) => console.log('Theme usage tracked:', response.data?.usageCount),
      error: (err) => console.error('Failed to track theme usage:', err),
    });
  }

  /**
   * Loads a theme when editing an existing form.
   * Fetches all themes (predefined + custom) from API and applies the specified theme.
   * @param themeId - The ID of the theme to load
   */
  loadTheme(themeId: string): void {
    if (!themeId) return;

    this._isThemeLoading.set(true);
    this.themesApi.getAllThemes().subscribe({
      next: (themes) => {
        // Populate available themes for use in applyTheme()
        this._availableThemes.set(themes);

        const theme = themes.find((t) => t.id === themeId);
        if (theme) {
          this._currentTheme.set(theme);
          this.themePreviewService.applyThemeCss(theme);
        }
        this._isThemeLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load theme:', err);
        this._isThemeLoading.set(false);
      },
    });
  }

  /**
   * Clears the current theme and resets theme state.
   * Removes theme CSS variables and clears themeId from form settings.
   */
  clearTheme(): void {
    this._currentTheme.set(null);
    this.themePreviewService.clearThemeCss();

    const currentForm = this._currentForm();
    if (currentForm?.schema?.settings) {
      currentForm.schema.settings.themeId = undefined;
      this.markDirty();
    }
  }

  /**
   * Loads a form schema directly into the form builder.
   * Used when applying templates or loading form data without full form metadata.
   * Deep-clones the schema to prevent mutations to the source data.
   * Story 29.8: Template Application to Form Builder
   * @param schema - The form schema to load
   */
  loadFormSchema(schema: FormSchema): void {
    // Deep clone to avoid mutations to the original schema
    const clonedSchema = structuredClone(schema);

    // Load fields from cloned schema
    if (clonedSchema.fields) {
      this._formFields.set(clonedSchema.fields);
    } else {
      this._formFields.set([]);
    }

    // Restore row layout configuration if present
    if (clonedSchema.settings?.rowLayout?.enabled) {
      this._rowLayoutEnabled.set(true);
      this._rowConfigs.set(clonedSchema.settings.rowLayout.rows || []);

      // Load sub-column configurations from rows (Story 27.3)
      const subColumnConfigs: SubColumnConfigInternal[] = [];
      clonedSchema.settings.rowLayout.rows?.forEach((row) => {
        if (row.subColumns && row.subColumns.length > 0) {
          // Add rowId context to each sub-column config for internal state
          row.subColumns.forEach((subCol) => {
            subColumnConfigs.push({
              ...subCol,
              rowId: row.rowId,
            });
          });
        }
      });
      this._subColumnConfigs.set(subColumnConfigs);
    } else {
      // Reset row layout and sub-column state for schemas without row layout
      this._rowLayoutEnabled.set(false);
      this._rowConfigs.set([]);
      this._subColumnConfigs.set([]);
    }

    // Restore step form configuration if present
    if (clonedSchema.settings?.stepForm?.enabled) {
      this._stepFormEnabled.set(true);
      this._steps.set(clonedSchema.settings.stepForm.steps || []);
      // Set active step to first step by default
      if (clonedSchema.settings.stepForm.steps?.length > 0) {
        this._activeStepId.set(clonedSchema.settings.stepForm.steps[0].id);
      }
    } else {
      // Reset step form state for schemas without step configuration
      this._stepFormEnabled.set(false);
      this._steps.set([]);
      this._activeStepId.set(null);
    }

    // Load theme if schema has themeId
    if (clonedSchema.settings?.themeId) {
      this.loadTheme(clonedSchema.settings.themeId);
    }

    // Load quiz configuration if present (Epic 29, Story 29.13)
    if (clonedSchema.settings?.businessLogicConfig?.type === 'quiz') {
      this._quizConfig.set(clonedSchema.settings.businessLogicConfig);
    } else {
      this._quizConfig.set(null);
    }

    // Load template metadata if present
    if (clonedSchema.settings?.templateId) {
      // Note: We don't have the template name here, just the ID
      // The template name will be populated when form was created from template
    }

    // Clear selection
    this._selectedField.set(null);

    // Mark as dirty since this is a new form created from template
    this.markDirty();
  }

  /**
   * Applies a template to create a new form.
   * Loads the template's schema into the form builder and tracks template metadata.
   * The template is used as a starting point; the resulting form is independent.
   * Story 29.8: Template Application to Form Builder (AC: 3, 5, 7)
   * Story 29.13: Load quiz config from quiz templates
   * @param template - The template to apply (full FormTemplate object)
   */
  applyTemplate(template: FormTemplate): void {
    if (!template) {
      console.warn('Cannot apply undefined template');
      return;
    }

    // Store template metadata for display in UI
    this._selectedTemplate.set(template);
    this._templateMetadata.set({
      id: template.id,
      name: template.name,
    });

    // Load quiz configuration if template has quiz business logic
    if (template.businessLogicConfig?.type === 'quiz') {
      this._quizConfig.set(template.businessLogicConfig);
    }

    // Load the template's schema into the form builder
    // This will handle fields, row layouts, step forms, and theme application
    this.loadFormSchema(template.templateSchema);
  }

  /**
   * Updates the quiz configuration for the current form.
   * Marks the form as dirty to indicate unsaved changes.
   * Epic 29, Story 29.13: Quiz Settings in Form Builder
   * @param config - The updated quiz configuration
   */
  setQuizConfig(config: QuizConfig | null): void {
    this._quizConfig.set(config);
    this.markDirty();
  }
}
