import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormField, GroupMetadata } from '@nodeangularfullstack/shared';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ColorPicker } from 'primeng/colorpicker';
import { Checkbox } from 'primeng/checkbox';

/**
 * Properties panel for GROUP field type.
 * Allows configuration of group title, border, collapsible behavior, and styling.
 */
@Component({
  selector: 'app-group-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select, ColorPicker, Checkbox],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- Group Title -->
      <div class="field">
        <label for="groupTitle" class="block text-sm font-medium text-gray-700 mb-1">
          Group Title (Optional)
        </label>
        <input
          pInputText
          id="groupTitle"
          formControlName="groupTitle"
          class="w-full"
          placeholder="Enter group title/heading"
        />
        <small class="text-gray-500 text-xs">
          Optional heading displayed at the top of the group
        </small>
      </div>

      <!-- Border Style -->
      <div class="field">
        <label for="borderStyle" class="block text-sm font-medium text-gray-700 mb-1">
          Border Style
        </label>
        <p-select
          formControlName="groupBorderStyle"
          inputId="borderStyle"
          [options]="borderStyleOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Collapsible Toggle -->
      <div class="field flex items-center gap-2">
        <p-checkbox formControlName="groupCollapsible" inputId="groupCollapsible" [binary]="true" />
        <label for="groupCollapsible" class="text-sm text-gray-700"> Make group collapsible </label>
      </div>

      <!-- Background Color (Optional) -->
      <div class="field">
        <label for="backgroundColor" class="block text-sm font-medium text-gray-700 mb-1">
          Background Color (Optional)
        </label>
        <p-colorpicker
          formControlName="groupBackgroundColor"
          inputId="backgroundColor"
          format="hex"
        />
        <small class="text-gray-500 text-xs"> Leave empty for transparent </small>
      </div>

      <!-- Preview Info Box -->
      @if (
        form.value.groupTitle ||
        form.value.groupBorderStyle !== 'none' ||
        form.value.groupCollapsible ||
        form.value.groupBackgroundColor
      ) {
        <div class="p-3 bg-gray-50 border border-gray-200 rounded">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Group Preview:</h4>
          <ul class="text-xs text-gray-600 space-y-1">
            @if (form.value.groupTitle) {
              <li><strong>Title:</strong> {{ form.value.groupTitle }}</li>
            }
            <li><strong>Border:</strong> {{ form.value.groupBorderStyle }}</li>
            @if (form.value.groupCollapsible) {
              <li><strong>Collapsible:</strong> Yes</li>
            }
            @if (form.value.groupBackgroundColor) {
              <li>
                <strong>Background:</strong>
                <span
                  class="inline-block w-4 h-4 border border-gray-300 rounded ml-1 align-middle"
                  [style.background-color]="form.value.groupBackgroundColor"
                ></span>
                {{ form.value.groupBackgroundColor }}
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class GroupPropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);

  protected form!: FormGroup;

  protected readonly borderStyleOptions = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'None', value: 'none' },
  ];

  ngOnInit(): void {
    const metadata = this.field.metadata as GroupMetadata;

    this.form = this.fb.group({
      groupTitle: [metadata?.groupTitle || ''],
      groupBorderStyle: [metadata?.groupBorderStyle || 'solid'],
      groupCollapsible: [metadata?.groupCollapsible || false],
      groupBackgroundColor: [metadata?.groupBackgroundColor || ''],
    });

    // Emit field changes on form value changes
    this.form.valueChanges.subscribe(() => {
      this.emitFieldChange();
    });
  }

  private emitFieldChange(): void {
    const metadata: GroupMetadata = {
      groupTitle: this.form.value.groupTitle || undefined,
      groupBorderStyle: this.form.value.groupBorderStyle || 'solid',
      groupCollapsible: this.form.value.groupCollapsible || false,
      groupBackgroundColor: this.form.value.groupBackgroundColor || undefined,
      customStyle: (this.field.metadata as GroupMetadata)?.customStyle, // Preserve custom CSS
    };

    this.fieldChange.emit({
      ...this.field,
      metadata,
    });
  }
}
