import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, HeadingMetadata, FormFieldType } from '@nodeangularfullstack/shared';
import { Select } from 'primeng/select';
import { ColorPicker } from 'primeng/colorpicker';
import { SelectButton } from 'primeng/selectbutton';

/**
 * Properties panel for HEADING field type.
 * Allows configuration of heading level, alignment, color, and font weight.
 */
@Component({
  selector: 'app-heading-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Select, ColorPicker, SelectButton],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- Heading Level -->
      <div class="field">
        <label for="headingLevel" class="block text-sm font-medium text-gray-700 mb-1">
          Heading Level
        </label>
        <p-select
          formControlName="headingLevel"
          inputId="headingLevel"
          [options]="headingLevels"
          optionLabel="label"
          optionValue="value"
          placeholder="Select heading level"
          class="w-full"
        />
        <small class="text-gray-500 text-xs">
          H1 is largest, H6 is smallest (H2 recommended for sections)
        </small>
      </div>

      <!-- Alignment -->
      <div class="field">
        <label class="block text-sm font-medium text-gray-700 mb-1"> Text Alignment </label>
        <p-selectbutton
          formControlName="alignment"
          [options]="alignments"
          optionLabel="label"
          optionValue="value"
        />
      </div>

      <!-- Text Color -->
      <div class="field">
        <label for="color" class="block text-sm font-medium text-gray-700 mb-1"> Text Color </label>
        <p-colorpicker formControlName="color" inputId="color" format="hex" />
        <small class="text-gray-500 text-xs"> Leave empty for default color </small>
      </div>

      <!-- Font Weight -->
      <div class="field">
        <label for="fontWeight" class="block text-sm font-medium text-gray-700 mb-1">
          Font Weight
        </label>
        <p-select
          formControlName="fontWeight"
          inputId="fontWeight"
          [options]="fontWeights"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
    </div>
  `,
})
export class HeadingPropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);

  protected form!: FormGroup;

  protected readonly headingLevels = [
    { label: 'H1', value: 'h1' },
    { label: 'H2', value: 'h2' },
    { label: 'H3', value: 'h3' },
    { label: 'H4', value: 'h4' },
    { label: 'H5', value: 'h5' },
    { label: 'H6', value: 'h6' },
  ];

  protected readonly alignments = [
    { label: 'Left', value: 'left', icon: 'pi pi-align-left' },
    { label: 'Center', value: 'center', icon: 'pi pi-align-center' },
    { label: 'Right', value: 'right', icon: 'pi pi-align-right' },
  ];

  protected readonly fontWeights = [
    { label: 'Normal', value: 'normal' },
    { label: 'Bold', value: 'bold' },
  ];

  ngOnInit(): void {
    const metadata = this.field.metadata as HeadingMetadata;

    this.form = this.fb.group({
      headingLevel: [metadata?.headingLevel || 'h2', Validators.required],
      alignment: [metadata?.alignment || 'left', Validators.required],
      color: [metadata?.color || ''],
      fontWeight: [metadata?.fontWeight || 'bold', Validators.required],
    });

    // Emit field changes on form value changes
    this.form.valueChanges.subscribe(() => {
      this.emitFieldChange();
    });
  }

  private emitFieldChange(): void {
    const metadata: HeadingMetadata = {
      headingLevel: this.form.value.headingLevel,
      alignment: this.form.value.alignment,
      color: this.form.value.color || undefined,
      fontWeight: this.form.value.fontWeight,
      customStyle: (this.field.metadata as HeadingMetadata)?.customStyle, // Preserve custom CSS
    };

    this.fieldChange.emit({
      ...this.field,
      metadata,
    });
  }
}
