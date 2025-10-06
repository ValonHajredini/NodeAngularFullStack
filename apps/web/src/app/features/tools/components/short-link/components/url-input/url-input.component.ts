import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

/**
 * Reusable URL input component with validation display.
 */
@Component({
  selector: 'app-url-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UrlInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="field">
      <label [for]="inputId" class="block text-sm font-medium text-gray-700 mb-2">
        {{ label }}
        @if (required) {
          <span class="text-red-500">*</span>
        }
      </label>
      <input
        [id]="inputId"
        type="url"
        pInputText
        [formControl]="control"
        [placeholder]="placeholder"
        class="w-full"
        [class.ng-invalid]="control.invalid && control.touched"
        (blur)="onTouched()"
      />
      <small class="p-error block mt-1" *ngIf="control.invalid && control.touched">
        @if (control.errors?.['required']) {
          {{ label }} is required
        }
        @if (control.errors?.['url']) {
          Please enter a valid URL (must start with http:// or https://)
        }
        @if (control.errors?.['maxlength']) {
          URL is too long (maximum {{ control.errors?.['maxlength'].requiredLength }} characters)
        }
      </small>
    </div>
  `,
  styles: [
    `
      .field {
        margin-bottom: 1.5rem;
      }
    `,
  ],
})
export class UrlInputComponent implements ControlValueAccessor {
  @Input() label = 'URL';
  @Input() placeholder = 'https://example.com';
  @Input() required = false;
  @Input() inputId = 'url-input';

  control = new FormControl('');
  onChange: any = () => {};
  onTouched: any = () => {};

  constructor() {
    this.control.valueChanges.subscribe((value) => {
      this.onChange(value);
    });
  }

  writeValue(value: any): void {
    this.control.setValue(value, { emitEvent: false });
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.control.disable();
    } else {
      this.control.enable();
    }
  }
}
