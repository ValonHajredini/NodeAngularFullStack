import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ButtonDirective } from 'primeng/button';
import { PrimeTemplate } from 'primeng/api';
import { FormFieldType } from '@nodeangularfullstack/shared';

/**
 * Field type metadata for display in the Add Field dialog.
 */
interface FieldTypeCard {
  type: FormFieldType;
  label: string;
  description: string;
  icon: string;
  category: 'input' | 'preview';
}

/**
 * Add Field Dialog Component
 *
 * A modal dialog that displays all available field types in categorized sections
 * (Input Fields vs Preview Elements). Users can search/filter field types and
 * click to quickly add them to the template schema.
 *
 * **Features:**
 * - 18 field types organized into "Input Fields" (13 types) and "Preview Elements" (5 types)
 * - Search/filter functionality for quick field type discovery
 * - Visual distinction between categories (green accent for inputs, purple for previews)
 * - PrimeNG icons for each field type
 * - Responsive grid layout (3 columns on desktop, 1 column on mobile)
 * - Modal stays open until user clicks "Close" button (supports adding multiple fields)
 *
 * **Usage:**
 * ```html
 * <app-add-field-dialog
 *   [(visible)]="showDialog"
 *   (fieldAdded)="handleFieldAdded($event)"
 * />
 * ```
 *
 * @emits fieldAdded - Emitted when user selects a field type to add
 */
@Component({
  selector: 'app-add-field-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, InputText, ButtonDirective, PrimeTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-field-dialog.component.html',
  styleUrls: ['./add-field-dialog.component.scss'],
})
export class AddFieldDialogComponent {
  // Inputs
  readonly visible = input.required<boolean>();

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly fieldsAdded = output<FormFieldType[]>();

  // Internal state
  protected readonly searchQuery = signal('');
  protected readonly selectedFieldTypes = signal<Set<FormFieldType>>(new Set());

  // All field types with metadata
  protected readonly allFieldTypes: FieldTypeCard[] = [
    // ===== INPUT FIELDS (13 types) =====
    {
      type: FormFieldType.TEXT,
      label: 'Text',
      description: 'Single-line text input for short responses',
      icon: 'pi-pencil',
      category: 'input',
    },
    {
      type: FormFieldType.EMAIL,
      label: 'Email',
      description: 'Email address input with validation',
      icon: 'pi-envelope',
      category: 'input',
    },
    {
      type: FormFieldType.NUMBER,
      label: 'Number',
      description: 'Numeric input for numbers only',
      icon: 'pi-hashtag',
      category: 'input',
    },
    {
      type: FormFieldType.SELECT,
      label: 'Select',
      description: 'Dropdown selection from multiple options',
      icon: 'pi-list',
      category: 'input',
    },
    {
      type: FormFieldType.TEXTAREA,
      label: 'Text Area',
      description: 'Multi-line text input for long responses',
      icon: 'pi-align-left',
      category: 'input',
    },
    {
      type: FormFieldType.FILE,
      label: 'File Upload',
      description: 'File upload with type and size validation',
      icon: 'pi-upload',
      category: 'input',
    },
    {
      type: FormFieldType.CHECKBOX,
      label: 'Checkbox',
      description: 'Multiple choice selection (select many)',
      icon: 'pi-check-square',
      category: 'input',
    },
    {
      type: FormFieldType.RADIO,
      label: 'Radio Button',
      description: 'Single choice selection from options',
      icon: 'pi-circle',
      category: 'input',
    },
    {
      type: FormFieldType.DATE,
      label: 'Date',
      description: 'Date picker for selecting dates',
      icon: 'pi-calendar',
      category: 'input',
    },
    {
      type: FormFieldType.DATETIME,
      label: 'Date & Time',
      description: 'Date and time picker combined',
      icon: 'pi-clock',
      category: 'input',
    },
    {
      type: FormFieldType.TOGGLE,
      label: 'Toggle Switch',
      description: 'On/off toggle for boolean values',
      icon: 'pi-toggle-on',
      category: 'input',
    },
    {
      type: FormFieldType.IMAGE_GALLERY,
      label: 'Image Gallery',
      description: 'Image gallery selector for products/variants',
      icon: 'pi-images',
      category: 'input',
    },
    {
      type: FormFieldType.TIME_SLOT,
      label: 'Time Slot',
      description: 'Time slot selector for appointments/bookings',
      icon: 'pi-hourglass',
      category: 'input',
    },

    // ===== PREVIEW ELEMENTS (5 types) =====
    {
      type: FormFieldType.DIVIDER,
      label: 'Divider',
      description: 'Horizontal line to separate form sections',
      icon: 'pi-minus',
      category: 'preview',
    },
    {
      type: FormFieldType.HEADING,
      label: 'Heading',
      description: 'Section heading or title for organization',
      icon: 'pi-align-center',
      category: 'preview',
    },
    {
      type: FormFieldType.IMAGE,
      label: 'Image',
      description: 'Display image for branding or context',
      icon: 'pi-image',
      category: 'preview',
    },
    {
      type: FormFieldType.TEXT_BLOCK,
      label: 'Text Block',
      description: 'Rich text block for instructions/info',
      icon: 'pi-align-justify',
      category: 'preview',
    },
    {
      type: FormFieldType.GROUP,
      label: 'Group',
      description: 'Container for organizing related fields',
      icon: 'pi-box',
      category: 'preview',
    },
  ];

  /**
   * Filtered input fields based on search query.
   */
  protected readonly filteredInputFields = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.allFieldTypes
      .filter((ft) => ft.category === 'input')
      .filter(
        (ft) =>
          ft.label.toLowerCase().includes(query) || ft.description.toLowerCase().includes(query)
      );
  });

  /**
   * Filtered preview elements based on search query.
   */
  protected readonly filteredPreviewElements = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.allFieldTypes
      .filter((ft) => ft.category === 'preview')
      .filter(
        (ft) =>
          ft.label.toLowerCase().includes(query) || ft.description.toLowerCase().includes(query)
      );
  });

  /**
   * Total number of filtered field types (for empty state).
   */
  protected readonly totalFilteredCount = computed(() => {
    return this.filteredInputFields().length + this.filteredPreviewElements().length;
  });

  /**
   * Computed: Total number of selected field types.
   */
  protected readonly selectedCount = computed(() => {
    return this.selectedFieldTypes().size;
  });

  /**
   * Check if a field type is selected.
   */
  protected isSelected(fieldType: FormFieldType): boolean {
    return this.selectedFieldTypes().has(fieldType);
  }

  /**
   * Handle field type card click - toggle selection.
   */
  protected handleFieldTypeClick(fieldType: FormFieldType): void {
    const selected = new Set(this.selectedFieldTypes());
    if (selected.has(fieldType)) {
      selected.delete(fieldType);
    } else {
      selected.add(fieldType);
    }
    this.selectedFieldTypes.set(selected);
  }

  /**
   * Add selected fields, clear selection, and close dialog.
   */
  protected handleAddFields(): void {
    const selectedArray = Array.from(this.selectedFieldTypes());
    if (selectedArray.length > 0) {
      this.fieldsAdded.emit(selectedArray);
      this.selectedFieldTypes.set(new Set()); // Clear selection after adding
      this.searchQuery.set(''); // Reset search query
      this.visibleChange.emit(false); // Close dialog
    }
  }

  /**
   * Close dialog and reset search query and selection.
   */
  protected handleClose(): void {
    this.searchQuery.set('');
    this.selectedFieldTypes.set(new Set());
    this.visibleChange.emit(false);
  }
}
