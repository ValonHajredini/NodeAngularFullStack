# Field Properties Modal Component

A reusable modal dialog component for editing field properties in the form builder.

## Features

- **Signal-based API**: Uses Angular signals for reactive state management
- **Tabbed Interface**: Organized properties into Basic, Validation, Behavior, and Conditional Visibility tabs
- **Responsive**: Adapts to mobile and desktop screens
- **Form Validation**: Comprehensive validation with error messages
- **Field Name Auto-generation**: Automatically generates field names from labels
- **Validation Presets**: Pre-configured regex patterns for common validation scenarios
- **Conditional Visibility**: Show/hide fields based on other field values

## Usage

### Import the Component

```typescript
import { FieldPropertiesModalComponent } from '@shared/components';
```

### Template Usage

```html
<app-field-properties-modal
  [(visible)]="showFieldPropertiesModal"
  [field]="selectedField"
  [allFields]="allFormFields"
  (saveChanges)="onFieldSaved($event)"
  (deleteField)="onFieldDeleted()"
  (cancel)="onCancel()"
/>
```

### Component Example

```typescript
import { Component, signal } from '@angular/core';
import { FormField } from '@nodeangularfullstack/shared';
import { FieldPropertiesModalComponent } from '@shared/components';

@Component({
  selector: 'app-my-form-builder',
  standalone: true,
  imports: [FieldPropertiesModalComponent],
  template: `
    <button (click)="openFieldProperties()">Edit Field</button>

    <app-field-properties-modal
      [(visible)]="showModal"
      [field]="selectedField()"
      [allFields]="formFields()"
      (saveChanges)="handleSave($event)"
      (deleteField)="handleDelete()"
      (cancel)="handleCancel()"
    />
  `,
})
export class MyFormBuilderComponent {
  showModal = signal(false);
  selectedField = signal<FormField | null>(null);
  formFields = signal<FormField[]>([]);

  openFieldProperties(): void {
    // Set the field to edit
    const field = this.formFields()[0];
    this.selectedField.set(field);
    this.showModal.set(true);
  }

  handleSave(updatedField: FormField): void {
    console.log('Field saved:', updatedField);
    // Update your form fields array with the updated field
  }

  handleDelete(): void {
    console.log('Field deleted');
    // Remove the field from your form fields array
  }

  handleCancel(): void {
    console.log('Cancelled');
    this.showModal.set(false);
  }
}
```

## API

### Inputs

| Property    | Type                       | Description                                         |
| ----------- | -------------------------- | --------------------------------------------------- |
| `visible`   | `model<boolean>`           | Controls modal visibility (two-way binding)         |
| `field`     | `input<FormField \| null>` | The field to edit                                   |
| `allFields` | `input<FormField[]>`       | All fields in the form (for conditional visibility) |

### Outputs

| Event         | Type                | Description                          |
| ------------- | ------------------- | ------------------------------------ |
| `saveChanges` | `output<FormField>` | Emitted when user saves changes      |
| `deleteField` | `output<void>`      | Emitted when user deletes the field  |
| `cancel`      | `output<void>`      | Emitted when user cancels the dialog |

## Tabs

### Basic Tab

- **Label**: Field label (required)
- **Field Name**: Auto-generated from label, can be customized (required)
- **Placeholder**: Placeholder text for input fields
- **Help Text**: Helper text displayed below the field
- **Required**: Toggle to mark field as required
- **Default Value**: Default value for the field

### Validation Tab (for input fields only)

- **Number Fields**: Min/Max value validation
- **Text Fields**: Min/Max length validation, regex pattern validation
- **Email Fields**: Strict email validation toggle
- **Custom Error Messages**: Customize validation error messages

### Behavior Tab (for input fields only)

- **Disabled**: Mark field as disabled
- **Read-only**: Mark field as read-only
- **Default Value**: Set a default value

### Conditional Visibility Tab (for input fields only)

- **Show If Field**: Select a field to watch
- **Operator**: Equals, Not Equals, Contains
- **Value**: Value to compare against

## Field Name Auto-generation

The field name is automatically generated from the label using slug format (lowercase with underscores). Once manually edited, auto-generation stops.

Example:

- Label: "Email Address" → Field Name: "email_address"
- Label: "First Name" → Field Name: "first_name"

## Validation Presets

The modal includes pre-configured validation patterns:

- Email
- Phone (US)
- URL
- Alphanumeric
- Numbers Only
- Letters Only
- Postal Code (US)
- Custom (enter your own regex)

## Keyboard Shortcuts

- **ESC**: Close the modal
- **Ctrl+S** / **Cmd+S**: Save changes (when form is valid)

## Accessibility

- ARIA labels and descriptions
- Keyboard navigation
- Screen reader friendly
- Focus management

## Notes

- The modal uses PrimeNG Dialog component
- All validation is performed client-side
- Field name uniqueness is validated against all fields in the form
- The modal is appended to `body` to avoid z-index issues
