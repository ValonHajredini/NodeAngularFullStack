import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { FormField, TextBlockMetadata } from '@nodeangularfullstack/shared';
import { Select } from 'primeng/select';
import { ColorPicker } from 'primeng/colorpicker';
import { SelectButton } from 'primeng/selectbutton';
import { Checkbox } from 'primeng/checkbox';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

/**
 * Properties panel for TEXT_BLOCK field type.
 * Allows configuration of HTML content, alignment, styling, and collapsible behavior.
 */
@Component({
  selector: 'app-text-block-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Select, ColorPicker, SelectButton, Checkbox, MonacoEditorModule],
  template: `
    <div [formGroup]="form" class="space-y-4">
      <!-- HTML Content Editor -->
      <div class="field">
        <label for="content" class="block text-sm font-medium text-gray-700 mb-1">
          Content <span class="text-red-500">*</span>
        </label>
        <div class="border border-gray-300 rounded">
          <ngx-monaco-editor
            formControlName="content"
            [options]="htmlEditorOptions"
            style="height: 300px"
          ></ngx-monaco-editor>
        </div>
        <small class="text-gray-500 text-xs">
          Write HTML content. Allowed tags: p, h3-h6, strong, em, u, s, ul, ol, li, a, blockquote,
          br
        </small>
        @if (form.get('content')?.invalid && form.get('content')?.touched) {
          <small class="text-red-500 text-xs">Content is required</small>
        }
      </div>

      <!-- Alignment -->
      <div class="field">
        <label class="block text-sm font-medium text-gray-700 mb-1"> Text Alignment </label>
        <p-selectbutton
          formControlName="alignment"
          [options]="alignmentOptions"
          optionLabel="label"
          optionValue="value"
        />
      </div>

      <!-- Background Color (Optional) -->
      <div class="field">
        <label for="backgroundColor" class="block text-sm font-medium text-gray-700 mb-1">
          Background Color (Optional)
        </label>
        <p-colorpicker formControlName="backgroundColor" inputId="backgroundColor" format="hex" />
        <small class="text-gray-500 text-xs"> Leave empty for transparent </small>
      </div>

      <!-- Padding -->
      <div class="field">
        <label for="padding" class="block text-sm font-medium text-gray-700 mb-1"> Padding </label>
        <p-select
          formControlName="padding"
          inputId="padding"
          [options]="paddingOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
        <small class="text-gray-500 text-xs">
          None: 0px, Small: 8px, Medium: 16px, Large: 24px
        </small>
      </div>

      <!-- Collapsible Toggle -->
      <div class="field flex items-center gap-2">
        <p-checkbox formControlName="collapsible" inputId="collapsible" [binary]="true" />
        <label for="collapsible" class="text-sm text-gray-700"> Make content collapsible </label>
      </div>

      <!-- Initially Collapsed (shown only if collapsible) -->
      @if (form.get('collapsible')?.value) {
        <div class="field flex items-center gap-2 ml-6">
          <p-checkbox formControlName="collapsed" inputId="collapsed" [binary]="true" />
          <label for="collapsed" class="text-sm text-gray-700"> Initially collapsed </label>
        </div>
      }
    </div>
  `,
})
export class TextBlockPropertiesPanelComponent implements OnInit {
  @Input() field!: FormField;
  @Output() fieldChange = new EventEmitter<FormField>();

  private readonly fb = inject(FormBuilder);

  protected form!: FormGroup;

  protected readonly alignmentOptions = [
    { label: 'Left', value: 'left', icon: 'pi pi-align-left' },
    { label: 'Center', value: 'center', icon: 'pi pi-align-center' },
    { label: 'Right', value: 'right', icon: 'pi pi-align-right' },
    { label: 'Justify', value: 'justify', icon: 'pi pi-align-justify' },
  ];

  protected readonly paddingOptions = [
    { label: 'None', value: 'none' },
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  protected readonly htmlEditorOptions = {
    language: 'html',
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    theme: 'vs-light',
    automaticLayout: true,
    wordWrap: 'on',
  };

  ngOnInit(): void {
    const metadata = this.field.metadata as TextBlockMetadata;

    this.form = this.fb.group({
      content: [
        metadata?.content || '<p>Add your instructions here...</p>',
        [Validators.required, Validators.maxLength(5000)],
      ],
      alignment: [metadata?.alignment || 'left'],
      backgroundColor: [metadata?.backgroundColor || ''],
      padding: [metadata?.padding || 'medium'],
      collapsible: [metadata?.collapsible || false],
      collapsed: [metadata?.collapsed || false],
    });

    // Emit field changes on form value changes
    this.form.valueChanges.subscribe(() => {
      if (this.form.valid) {
        this.emitFieldChange();
      }
    });
  }

  private emitFieldChange(): void {
    const metadata: TextBlockMetadata = {
      content: this.form.value.content,
      alignment: this.form.value.alignment || undefined,
      backgroundColor: this.form.value.backgroundColor || undefined,
      padding: this.form.value.padding || 'medium',
      collapsible: this.form.value.collapsible || false,
      collapsed: this.form.value.collapsed || false,
      customStyle: (this.field.metadata as TextBlockMetadata)?.customStyle, // Preserve custom CSS
    };

    this.fieldChange.emit({
      ...this.field,
      metadata,
    });
  }
}
