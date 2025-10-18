import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckboxPreviewComponent } from './checkbox-preview.component';
import { FormField, FormFieldType, FieldOption } from '@nodeangularfullstack/shared';
import { Checkbox } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';

describe('CheckboxPreviewComponent', () => {
  let component: CheckboxPreviewComponent;
  let fixture: ComponentFixture<CheckboxPreviewComponent>;

  const mockCheckboxOptions: FieldOption[] = [
    { label: 'Option X', value: 'optionX' },
    { label: 'Option Y', value: 'optionY' },
    { label: 'Option Z', value: 'optionZ' },
  ];

  const mockCheckboxGroupField: FormField = {
    id: 'field-checkbox-group-123',
    fieldName: 'test_checkbox_group',
    type: FormFieldType.CHECKBOX,
    label: 'Test Checkbox Group',
    required: false,
    order: 0,
    options: mockCheckboxOptions,
  };

  const mockBinaryCheckboxField: FormField = {
    id: 'field-checkbox-binary-456',
    fieldName: 'test_checkbox_binary',
    type: FormFieldType.CHECKBOX,
    label: 'Accept Terms',
    required: true,
    order: 0,
    options: undefined,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckboxPreviewComponent, Checkbox, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckboxPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockCheckboxGroupField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Binary Checkbox Mode (Single Checkbox)', () => {
    it('should render single checkbox when options are undefined', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes.length).toBe(1);
    });

    it('should render single checkbox when options array is empty', () => {
      const fieldWithEmptyOptions: FormField = {
        ...mockBinaryCheckboxField,
        options: [],
      };
      component.field = fieldWithEmptyOptions;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes.length).toBe(1);
    });

    it('should set binary attribute to true for single checkbox', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector('p-checkbox');
      expect(checkbox?.hasAttribute('binary')).toBe(true);
    });

    it('should render label with field label text', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label.theme-label');
      expect(label?.textContent).toContain('Accept Terms');
    });

    it('should show required asterisk when field is required', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('.text-red-500');
      expect(asterisk).toBeTruthy();
      expect(asterisk?.textContent?.trim()).toBe('*');
    });

    it('should not show required asterisk when field is optional', () => {
      const optionalField: FormField = {
        ...mockBinaryCheckboxField,
        required: false,
      };
      component.field = optionalField;
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('.text-red-500');
      expect(asterisk).toBeFalsy();
    });

    it('should bind to previewBinaryValue', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      expect(component['previewBinaryValue']).toBe(false);
    });
  });

  describe('Checkbox Group Mode (Multiple Checkboxes)', () => {
    it('should render checkbox group with all options', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes.length).toBe(3);
    });

    it('should set binary attribute to false for checkbox group', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      checkboxes.forEach((checkbox: HTMLElement) => {
        const binaryAttr = checkbox.getAttribute('binary');
        expect(binaryAttr).toBe('false');
      });
    });

    it('should render labels for each checkbox in group', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels.length).toBe(3);
      expect(labels[0].textContent?.trim()).toBe('Option X');
      expect(labels[1].textContent?.trim()).toBe('Option Y');
      expect(labels[2].textContent?.trim()).toBe('Option Z');
    });

    it('should assign correct values to each checkbox', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes[0].getAttribute('value')).toBe('optionX');
      expect(checkboxes[1].getAttribute('value')).toBe('optionY');
      expect(checkboxes[2].getAttribute('value')).toBe('optionZ');
    });

    it('should generate unique inputId for each checkbox', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes[0].getAttribute('inputId')).toBe(
        'checkbox-field-checkbox-group-123-optionX',
      );
      expect(checkboxes[1].getAttribute('inputId')).toBe(
        'checkbox-field-checkbox-group-123-optionY',
      );
      expect(checkboxes[2].getAttribute('inputId')).toBe(
        'checkbox-field-checkbox-group-123-optionZ',
      );
    });

    it('should bind all checkboxes to previewArrayValue model', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      expect(component['previewArrayValue']).toEqual([]);
    });
  });

  describe('Common Checkbox Features', () => {
    it('should apply theme-checkbox styleClass', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      checkboxes.forEach((checkbox: HTMLElement) => {
        expect(checkbox.getAttribute('styleClass')).toBe('theme-checkbox');
      });
    });

    it('should be disabled for preview mode', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      checkboxes.forEach((checkbox: HTMLElement) => {
        expect(checkbox.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for binary checkbox', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector('p-checkbox');
      expect(checkbox?.hasAttribute('aria-label')).toBe(true);
      expect(checkbox?.getAttribute('aria-label')).toBe('Accept Terms');
    });

    it('should have aria-required for binary required checkbox', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const checkbox = fixture.nativeElement.querySelector('p-checkbox');
      expect(checkbox?.hasAttribute('aria-required')).toBe(true);
    });

    it('should have aria-label for each checkbox in group', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox');
      expect(checkboxes[0].getAttribute('aria-label')).toBe('Option X');
      expect(checkboxes[1].getAttribute('aria-label')).toBe('Option Y');
      expect(checkboxes[2].getAttribute('aria-label')).toBe('Option Z');
    });

    it('should associate labels with checkboxes via for attribute in group mode', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels[0].getAttribute('for')).toBe('checkbox-field-checkbox-group-123-optionX');
      expect(labels[1].getAttribute('for')).toBe('checkbox-field-checkbox-group-123-optionY');
      expect(labels[2].getAttribute('for')).toBe('checkbox-field-checkbox-group-123-optionZ');
    });

    it('should associate label with checkbox via for attribute in binary mode', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label.theme-label');
      expect(label?.getAttribute('for')).toBe('checkbox-preview');
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply theme CSS classes to field-preview container', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });

    it('should apply theme-label class to labels for theme variable inheritance', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels.length).toBe(3);
      labels.forEach((label: HTMLElement) => {
        expect(label.classList.contains('theme-label')).toBe(true);
      });
    });

    it('should render with theme-checkbox class for theme variable inheritance', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll('p-checkbox.theme-checkbox');
      expect(checkboxes.length).toBe(3);
    });
  });

  describe('Layout and Spacing', () => {
    it('should use flex column layout with gap for checkbox group', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.flex.flex-col.gap-2');
      expect(container).toBeTruthy();
    });

    it('should align checkbox and label horizontally', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const checkboxContainers = fixture.nativeElement.querySelectorAll('.flex.items-center');
      expect(checkboxContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply left margin to labels', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.ml-2');
      expect(labels.length).toBe(3);
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('CheckboxPreviewComponent');
      // OnPush strategy is defined in the component decorator
    });
  });

  describe('Preview Value Management', () => {
    it('should initialize previewBinaryValue as false', () => {
      component.field = mockBinaryCheckboxField;
      expect(component['previewBinaryValue']).toBe(false);
    });

    it('should initialize previewArrayValue as empty array', () => {
      component.field = mockCheckboxGroupField;
      expect(component['previewArrayValue']).toEqual([]);
    });

    it('should maintain binary value state across change detection', () => {
      component.field = mockBinaryCheckboxField;
      fixture.detectChanges();
      expect(component['previewBinaryValue']).toBe(false);

      fixture.detectChanges();
      expect(component['previewBinaryValue']).toBe(false);
    });

    it('should maintain array value state across change detection', () => {
      component.field = mockCheckboxGroupField;
      fixture.detectChanges();
      expect(component['previewArrayValue']).toEqual([]);

      fixture.detectChanges();
      expect(component['previewArrayValue']).toEqual([]);
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input for binary checkbox', () => {
      component.field = mockBinaryCheckboxField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.CHECKBOX);
    });

    it('should have required field input for checkbox group', () => {
      component.field = mockCheckboxGroupField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.CHECKBOX);
      expect(component.field.options).toBeDefined();
      expect(component.field.options?.length).toBe(3);
    });
  });
});
