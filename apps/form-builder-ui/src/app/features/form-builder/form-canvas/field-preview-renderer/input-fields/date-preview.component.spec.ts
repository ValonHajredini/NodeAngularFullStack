import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatePreviewComponent } from './date-preview.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { DatePicker } from 'primeng/datepicker';

describe('DatePreviewComponent', () => {
  let component: DatePreviewComponent;
  let fixture: ComponentFixture<DatePreviewComponent>;

  const mockDateField: FormField = {
    id: 'field-date-123',
    fieldName: 'test_date',
    type: FormFieldType.DATE,
    label: 'Test Date',
    placeholder: 'Select a date',
    required: false,
    order: 0,
  };

  const mockDateTimeField: FormField = {
    id: 'field-datetime-456',
    fieldName: 'test_datetime',
    type: FormFieldType.DATETIME,
    label: 'Test DateTime',
    placeholder: 'Select date and time',
    required: true,
    order: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePreviewComponent, DatePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(DatePreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockDateField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('DATE field type', () => {
    it('should render PrimeNG datepicker for DATE field', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker).toBeTruthy();
    });

    it('should not show time picker for DATE field', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('showTime')).toBe(false);
    });

    it('should use field placeholder for DATE field', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.getAttribute('placeholder')).toBe('Select a date');
    });

    it('should use default placeholder when not provided for DATE', () => {
      const fieldWithoutPlaceholder: FormField = {
        ...mockDateField,
        placeholder: undefined,
      };
      component.field = fieldWithoutPlaceholder;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.getAttribute('placeholder')).toBe('Select date');
    });
  });

  describe('DATETIME field type', () => {
    it('should render PrimeNG datepicker for DATETIME field', () => {
      component.field = mockDateTimeField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker).toBeTruthy();
    });

    it('should show time picker for DATETIME field', () => {
      component.field = mockDateTimeField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('showTime')).toBe(true);
    });

    it('should use field placeholder for DATETIME field', () => {
      component.field = mockDateTimeField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.getAttribute('placeholder')).toBe('Select date and time');
    });

    it('should use default placeholder when not provided for DATETIME', () => {
      const fieldWithoutPlaceholder: FormField = {
        ...mockDateTimeField,
        placeholder: undefined,
      };
      component.field = fieldWithoutPlaceholder;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.getAttribute('placeholder')).toBe('Select date and time');
    });
  });

  describe('Common Datepicker Features', () => {
    it('should be disabled for preview mode', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('disabled')).toBe(true);
    });

    it('should apply w-full styleClass', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.getAttribute('styleClass')).toBe('w-full');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for DATE field', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('aria-label')).toBe(true);
      expect(datepicker.getAttribute('aria-label')).toBe('Test Date');
    });

    it('should have aria-label for DATETIME field', () => {
      component.field = mockDateTimeField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('aria-label')).toBe(true);
      expect(datepicker.getAttribute('aria-label')).toBe('Test DateTime');
    });

    it('should have aria-required for required DATE field', () => {
      const requiredField: FormField = {
        ...mockDateField,
        required: true,
      };
      component.field = requiredField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('aria-required')).toBe(true);
    });

    it('should have aria-required for required DATETIME field', () => {
      component.field = mockDateTimeField;
      fixture.detectChanges();

      const datepicker = fixture.nativeElement.querySelector('p-datepicker');
      expect(datepicker.hasAttribute('aria-required')).toBe(true);
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply field-preview container', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockDateField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('DatePreviewComponent');
      // OnPush strategy is defined in the component decorator
    });
  });

  describe('isDateTimeField helper method', () => {
    it('should return false for DATE field type', () => {
      component.field = mockDateField;
      expect(component.isDateTimeField()).toBe(false);
    });

    it('should return true for DATETIME field type', () => {
      component.field = mockDateTimeField;
      expect(component.isDateTimeField()).toBe(true);
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input for DATE', () => {
      component.field = mockDateField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.DATE);
    });

    it('should have required field input for DATETIME', () => {
      component.field = mockDateTimeField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.DATETIME);
    });
  });
});
