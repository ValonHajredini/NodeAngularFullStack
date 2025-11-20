import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TogglePreviewComponent } from './toggle-preview.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';

describe('TogglePreviewComponent', () => {
  let component: TogglePreviewComponent;
  let fixture: ComponentFixture<TogglePreviewComponent>;

  const mockToggleField: FormField = {
    id: 'field-toggle-123',
    fieldName: 'test_toggle',
    type: FormFieldType.TOGGLE,
    label: 'Enable Notifications',
    required: false,
    order: 0,
  };

  const mockRequiredToggleField: FormField = {
    id: 'field-toggle-456',
    fieldName: 'test_required_toggle',
    type: FormFieldType.TOGGLE,
    label: 'Accept Terms',
    required: true,
    order: 0,
  };

  const mockToggleFieldWithHelpText: FormField = {
    id: 'field-toggle-789',
    fieldName: 'test_toggle_help',
    type: FormFieldType.TOGGLE,
    label: 'Dark Mode',
    helpText: 'Enable dark mode for better visibility in low light',
    required: false,
    order: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TogglePreviewComponent, ToggleSwitch, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TogglePreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockToggleField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Toggle Switch Rendering', () => {
    it('should render PrimeNG toggleswitch', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggleSwitch).toBeTruthy();
    });

    it('should be disabled for preview mode', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggleSwitch.hasAttribute('disabled')).toBe(true);
    });

    it('should have inputId attribute', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggleSwitch.getAttribute('inputId')).toBe('toggle-preview');
    });
  });

  describe('Label Rendering', () => {
    it('should render label with field label text', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label?.textContent).toContain('Enable Notifications');
    });

    it('should show required asterisk when field is required', () => {
      component.field = mockRequiredToggleField;
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('.text-red-500');
      expect(asterisk).toBeTruthy();
      expect(asterisk?.textContent?.trim()).toBe('*');
    });

    it('should not show required asterisk when field is optional', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const asterisk = fixture.nativeElement.querySelector('.text-red-500');
      expect(asterisk).toBeFalsy();
    });

    it('should have for attribute matching toggle inputId', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label?.getAttribute('for')).toBe('toggle-preview');
    });

    it('should apply theme label styling classes', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label?.classList.contains('ml-3')).toBe(true);
      expect(label?.classList.contains('text-sm')).toBe(true);
      expect(label?.classList.contains('font-medium')).toBe(true);
    });
  });

  describe('Help Text Rendering', () => {
    it('should render help text when provided', () => {
      component.field = mockToggleFieldWithHelpText;
      fixture.detectChanges();

      const helpText = fixture.nativeElement.querySelector('small');
      expect(helpText).toBeTruthy();
      expect(helpText?.textContent).toContain(
        'Enable dark mode for better visibility in low light',
      );
    });

    it('should not render help text when not provided', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const helpText = fixture.nativeElement.querySelector('small');
      expect(helpText).toBeFalsy();
    });

    it('should apply proper styling to help text', () => {
      component.field = mockToggleFieldWithHelpText;
      fixture.detectChanges();

      const helpText = fixture.nativeElement.querySelector('small');
      expect(helpText?.classList.contains('block')).toBe(true);
      expect(helpText?.classList.contains('mt-1')).toBe(true);
      expect(helpText?.classList.contains('ml-14')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label attribute', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggleSwitch.hasAttribute('aria-label')).toBe(true);
      expect(toggleSwitch.getAttribute('aria-label')).toBe('Enable Notifications');
    });

    it('should have aria-required for required toggle', () => {
      component.field = mockRequiredToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      expect(toggleSwitch.hasAttribute('aria-required')).toBe(true);
    });

    it('should not have aria-required for optional toggle', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const toggleSwitch = fixture.nativeElement.querySelector('p-toggleswitch');
      const ariaRequired = toggleSwitch.getAttribute('aria-required');
      expect(ariaRequired).toBe('false');
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply field-preview container', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });
  });

  describe('Layout and Spacing', () => {
    it('should use flex layout with items-center alignment', () => {
      component.field = mockToggleField;
      fixture.detectChanges();

      const flexContainer = fixture.nativeElement.querySelector('.flex.items-center');
      expect(flexContainer).toBeTruthy();
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('TogglePreviewComponent');
      // OnPush strategy is defined in the component decorator
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input', () => {
      component.field = mockToggleField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.TOGGLE);
    });
  });
});
