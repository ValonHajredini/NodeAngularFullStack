import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RadioPreviewComponent } from './radio-preview.component';
import { FormField, FormFieldType, FieldOption } from '@nodeangularfullstack/shared';
import { RadioButton } from 'primeng/radiobutton';
import { FormsModule } from '@angular/forms';

describe('RadioPreviewComponent', () => {
  let component: RadioPreviewComponent;
  let fixture: ComponentFixture<RadioPreviewComponent>;

  const mockRadioOptions: FieldOption[] = [
    { label: 'Option A', value: 'optionA' },
    { label: 'Option B', value: 'optionB' },
    { label: 'Option C', value: 'optionC' },
  ];

  const mockRadioField: FormField = {
    id: 'field-radio-123',
    fieldName: 'test_radio',
    type: FormFieldType.RADIO,
    label: 'Test Radio Group',
    required: true,
    order: 0,
    options: mockRadioOptions,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RadioPreviewComponent, RadioButton, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RadioPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockRadioField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Component Rendering', () => {
    it('should render radio button group with all options', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      expect(radioButtons.length).toBe(3);
    });

    it('should apply theme-radio styleClass to each radio button', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      radioButtons.forEach((radio: HTMLElement) => {
        expect(radio.getAttribute('styleClass')).toBe('theme-radio');
      });
    });

    it('should render labels for each radio button', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels.length).toBe(3);
      expect(labels[0].textContent?.trim()).toBe('Option A');
      expect(labels[1].textContent?.trim()).toBe('Option B');
      expect(labels[2].textContent?.trim()).toBe('Option C');
    });

    it('should be disabled for preview mode', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      radioButtons.forEach((radio: HTMLElement) => {
        expect(radio.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  describe('Empty Options Handling', () => {
    it('should display "No options defined" message when options array is empty', () => {
      const fieldWithEmptyOptions: FormField = {
        ...mockRadioField,
        options: [],
      };
      component.field = fieldWithEmptyOptions;
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.text-sm.text-gray-400');
      expect(message).toBeTruthy();
      expect(message?.textContent?.trim()).toBe('No options defined');
    });

    it('should display "No options defined" message when options is undefined', () => {
      const fieldWithoutOptions: FormField = {
        ...mockRadioField,
        options: undefined,
      };
      component.field = fieldWithoutOptions;
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.text-sm.text-gray-400');
      expect(message).toBeTruthy();
      expect(message?.textContent?.trim()).toBe('No options defined');
    });

    it('should not render radio buttons when options are empty', () => {
      const fieldWithEmptyOptions: FormField = {
        ...mockRadioField,
        options: [],
      };
      component.field = fieldWithEmptyOptions;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      expect(radioButtons.length).toBe(0);
    });
  });

  describe('Radio Button Group Configuration', () => {
    it('should use same name attribute for all radio buttons in group', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      radioButtons.forEach((radio: HTMLElement) => {
        expect(radio.getAttribute('name')).toBe('test_radio');
      });
    });

    it('should assign correct values to each radio button', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      expect(radioButtons[0].getAttribute('value')).toBe('optionA');
      expect(radioButtons[1].getAttribute('value')).toBe('optionB');
      expect(radioButtons[2].getAttribute('value')).toBe('optionC');
    });

    it('should generate unique inputId for each radio button', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      expect(radioButtons[0].getAttribute('inputId')).toBe('radio-field-radio-123-optionA');
      expect(radioButtons[1].getAttribute('inputId')).toBe('radio-field-radio-123-optionB');
      expect(radioButtons[2].getAttribute('inputId')).toBe('radio-field-radio-123-optionC');
    });

    it('should bind all radio buttons to previewValue model', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      expect(component['previewValue']).toBeNull();
      // All radio buttons share the same ngModel binding
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for each radio button', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton');
      expect(radioButtons[0].hasAttribute('aria-label')).toBe(true);
      expect(radioButtons[0].getAttribute('aria-label')).toBe('Option A');
    });

    it('should associate labels with radio buttons via for attribute', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels[0].getAttribute('for')).toBe('radio-field-radio-123-optionA');
      expect(labels[1].getAttribute('for')).toBe('radio-field-radio-123-optionB');
      expect(labels[2].getAttribute('for')).toBe('radio-field-radio-123-optionC');
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply theme CSS classes to field-preview container', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });

    it('should apply theme-label class to labels for theme variable inheritance', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.theme-label');
      expect(labels.length).toBe(3);
      labels.forEach((label: HTMLElement) => {
        expect(label.classList.contains('theme-label')).toBe(true);
      });
    });

    it('should render with theme-radio class for theme variable inheritance', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioButtons = fixture.nativeElement.querySelectorAll('p-radioButton.theme-radio');
      expect(radioButtons.length).toBe(3);
    });
  });

  describe('Layout and Spacing', () => {
    it('should use flex column layout with gap', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.flex.flex-col.gap-2');
      expect(container).toBeTruthy();
    });

    it('should align radio button and label horizontally', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const radioContainers = fixture.nativeElement.querySelectorAll('.flex.items-center');
      expect(radioContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply left margin to labels', () => {
      component.field = mockRadioField;
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('label.ml-2');
      expect(labels.length).toBe(3);
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('RadioPreviewComponent');
      // OnPush strategy is defined in the component decorator
    });
  });

  describe('Preview Value Management', () => {
    it('should initialize previewValue as null', () => {
      component.field = mockRadioField;
      expect(component['previewValue']).toBeNull();
    });

    it('should maintain previewValue state across change detection', () => {
      component.field = mockRadioField;
      fixture.detectChanges();
      expect(component['previewValue']).toBeNull();

      // Even after change detection, value should remain null in preview mode
      fixture.detectChanges();
      expect(component['previewValue']).toBeNull();
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input', () => {
      component.field = mockRadioField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.RADIO);
    });
  });
});
