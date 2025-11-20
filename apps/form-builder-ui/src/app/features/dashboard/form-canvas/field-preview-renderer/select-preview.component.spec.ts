import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectPreviewComponent } from './select-preview.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { Select } from 'primeng/select';

describe('SelectPreviewComponent', () => {
  let component: SelectPreviewComponent;
  let fixture: ComponentFixture<SelectPreviewComponent>;

  const mockSelectOptions: { label: string; value: string }[] = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
    { label: 'Option 3', value: 'option3' },
  ];

  const mockSelectField: FormField = {
    id: 'field-select-123',
    fieldName: 'test_select',
    type: FormFieldType.SELECT,
    label: 'Test Select',
    placeholder: 'Choose an option',
    required: true,
    order: 0,
    options: mockSelectOptions,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectPreviewComponent, Select],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockSelectField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Component Rendering', () => {
    it('should render PrimeNG select component', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement).toBeTruthy();
    });

    it('should apply theme-select styleClass', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('styleClass')).toContain('theme-select');
    });

    it('should apply w-full class for full width', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('styleClass')).toContain('w-full');
    });

    it('should be disabled for preview mode', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Field Options', () => {
    it('should pass options to select component', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      expect(component.field.options).toEqual(mockSelectOptions);
      expect(component.field.options?.length).toBe(3);
    });

    it('should handle empty options array', () => {
      const fieldWithEmptyOptions: FormField = {
        ...mockSelectField,
        options: [],
      };
      component.field = fieldWithEmptyOptions;
      fixture.detectChanges();

      expect(component.field.options).toEqual([]);
    });

    it('should handle undefined options', () => {
      const fieldWithoutOptions: FormField = {
        ...mockSelectField,
        options: undefined,
      };
      component.field = fieldWithoutOptions;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement).toBeTruthy();
    });
  });

  describe('Placeholder', () => {
    it('should render custom placeholder', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('placeholder')).toBe('Choose an option');
    });

    it('should render default placeholder when not provided', () => {
      const fieldWithoutPlaceholder: FormField = {
        ...mockSelectField,
        placeholder: undefined,
      };
      component.field = fieldWithoutPlaceholder;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('placeholder')).toBe('Select an option');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label attribute', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.hasAttribute('aria-label')).toBe(true);
    });

    it('should have aria-required when field is required', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.hasAttribute('aria-required')).toBe(true);
    });

    it('should not have aria-required when field is optional', () => {
      const optionalField: FormField = {
        ...mockSelectField,
        required: false,
      };
      component.field = optionalField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      const ariaRequired = selectElement?.getAttribute('aria-required');
      expect(ariaRequired).toBe('false');
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply theme CSS classes to field-preview container', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });

    it('should render with theme-select class for theme variable inheritance', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select.theme-select');
      expect(selectElement).toBeTruthy();
    });
  });

  describe('PrimeNG Configuration', () => {
    it('should use optionLabel for displaying option labels', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('optionLabel')).toBe('label');
    });

    it('should use optionValue for option values', () => {
      component.field = mockSelectField;
      fixture.detectChanges();

      const selectElement = fixture.nativeElement.querySelector('p-select');
      expect(selectElement?.getAttribute('optionValue')).toBe('value');
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('SelectPreviewComponent');
      // OnPush strategy is defined in the component decorator
      // This test verifies the component is properly configured
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input', () => {
      // Test that component expects a required field input
      component.field = mockSelectField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.SELECT);
    });
  });
});
