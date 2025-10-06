import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  FormControl,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of } from 'rxjs';

/**
 * Reusable custom name input component with real-time availability checking.
 */
@Component({
  selector: 'app-custom-name-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomNameInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="field">
      <label [for]="inputId" class="block text-sm font-medium text-gray-700 mb-2">
        {{ label }}
      </label>
      <div class="p-inputgroup">
        <input
          [id]="inputId"
          type="text"
          pInputText
          [formControl]="control"
          [placeholder]="placeholder"
          class="flex-1"
          [class.ng-invalid]="control.invalid && control.touched"
          (blur)="onTouched()"
        />
        @if (checkingAvailability()) {
          <span class="p-inputgroup-addon">
            <i class="pi pi-spin pi-spinner text-gray-500"></i>
          </span>
        } @else if (control.value && customNameAvailable()) {
          <span class="p-inputgroup-addon">
            <i class="pi pi-check text-green-500"></i>
          </span>
        } @else if (control.value && !customNameAvailable() && !control.errors?.['pattern']) {
          <span class="p-inputgroup-addon">
            <i class="pi pi-times text-red-500"></i>
          </span>
        }
      </div>
      <small class="text-gray-500 block mt-1">
        {{ helperText }}
      </small>
      @if (previewUrl()) {
        <small class="text-blue-600 block mt-1"> Preview: {{ previewUrl() }} </small>
      }
      <small class="p-error block mt-1" *ngIf="control.invalid && control.touched">
        @if (control.errors?.['minlength']) {
          Custom name must be at least {{ control.errors?.['minlength'].requiredLength }} characters
        }
        @if (control.errors?.['maxlength']) {
          Custom name must be at most {{ control.errors?.['maxlength'].requiredLength }} characters
        }
        @if (control.errors?.['pattern']) {
          Only letters, numbers, and hyphens (no spaces or special characters)
        }
      </small>
      @if (customNameError()) {
        <small class="p-error block mt-1">{{ customNameError() }}</small>
      }
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
export class CustomNameInputComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() label = 'Custom Link Name (Optional)';
  @Input() placeholder = 'my-custom-link';
  @Input() helperText =
    '3-30 characters, alphanumeric and hyphens only. Leave empty for auto-generated code.';
  @Input() inputId = 'custom-name-input';
  @Input() baseUrl = '';

  @Output() checkAvailability = new EventEmitter<string>();

  control = new FormControl('');
  onChange: any = () => {};
  onTouched: any = () => {};

  private destroy$ = new Subject<void>();

  readonly customNameAvailable = signal<boolean | null>(null);
  readonly customNameError = signal<string | null>(null);
  readonly checkingAvailability = signal<boolean>(false);

  readonly previewUrl = computed(() => {
    const customName = this.control.value;
    if (!customName || customName.trim() === '' || !this.baseUrl) {
      return null;
    }
    return `${this.baseUrl}/${customName.trim().toLowerCase()}`;
  });

  constructor() {
    this.control.valueChanges.subscribe((value) => {
      this.onChange(value);
    });
  }

  ngOnInit(): void {
    // Real-time custom name validation with debounce
    this.control.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((customName) => {
          if (!customName || customName.trim() === '' || this.control.invalid) {
            this.customNameAvailable.set(null);
            this.customNameError.set(null);
            this.checkingAvailability.set(false);
            return of(null);
          }

          this.checkingAvailability.set(true);
          this.checkAvailability.emit(customName.trim());
          return of(null);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets the availability result from parent component.
   */
  setAvailability(available: boolean, error?: string): void {
    this.checkingAvailability.set(false);
    this.customNameAvailable.set(available);
    this.customNameError.set(error || null);
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
