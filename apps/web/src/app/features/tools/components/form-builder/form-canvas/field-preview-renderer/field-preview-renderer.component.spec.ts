import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FieldPreviewRendererComponent } from './field-preview-renderer.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { ValidationPresetsService } from '../../../field-properties/validation-presets.service';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('FieldPreviewRendererComponent', () => {
  let component: FieldPreviewRendererComponent;
  let fixture: ComponentFixture<FieldPreviewRendererComponent>;
  let validationPresetsService: ValidationPresetsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldPreviewRendererComponent],
      providers: [ValidationPresetsService],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldPreviewRendererComponent);
    component = fixture.componentInstance;
    validationPresetsService = TestBed.inject(ValidationPresetsService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Custom CSS Parsing (Story 16.5 - AC 4)', () => {
    it('should parse simple CSS string to style object', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'color: red; padding: 10px;',
        },
      };
      component.field = field;

      // Act
      const styles = component['customStyles'];

      // Assert
      expect(styles).toEqual({
        color: 'red',
        padding: '10px',
      });
    });

    it('should convert kebab-case CSS properties to camelCase', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'background-color: blue; font-size: 16px; margin-top: 5px;',
        },
      };
      component.field = field;

      // Act
      const styles = component['customStyles'];

      // Assert
      expect(styles).toEqual({
        backgroundColor: 'blue',
        fontSize: '16px',
        marginTop: '5px',
      });
    });

    it('should return empty object when no custom style defined', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      const styles = component['customStyles'];

      // Assert
      expect(styles).toEqual({});
    });

    it('should handle malformed CSS rules gracefully', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'color red; padding: 10px; ; invalid;',
        },
      };
      component.field = field;

      // Act
      const styles = component['customStyles'];

      // Assert - Should only parse valid rule
      expect(styles).toEqual({
        padding: '10px',
      });
    });

    it('should handle empty customStyle string', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: '',
        },
      };
      component.field = field;

      // Act
      const styles = component['customStyles'];

      // Assert
      expect(styles).toEqual({});
    });
  });

  describe('Custom CSS Summary Footer (Story 16.5 - AC 7)', () => {
    it('should detect when field has custom CSS', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'color: red;',
        },
      };
      component.field = field;

      // Act
      const hasCSS = component['hasCustomCSS']();

      // Assert
      expect(hasCSS).toBe(true);
    });

    it('should return false when no custom CSS defined', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      const hasCSS = component['hasCustomCSS']();

      // Assert
      expect(hasCSS).toBe(false);
    });

    it('should count CSS rules correctly', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'color: red; padding: 10px; margin: 5px;',
        },
      };
      component.field = field;

      // Act
      const count = component['getCSSRuleCount']();

      // Assert
      expect(count).toBe(3);
    });

    it('should count single CSS rule', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: 'color: red;',
        },
      };
      component.field = field;

      // Act
      const count = component['getCSSRuleCount']();

      // Assert
      expect(count).toBe(1);
    });

    it('should return 0 for empty custom style', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
        metadata: {
          customStyle: '',
        },
      };
      component.field = field;

      // Act
      const count = component['getCSSRuleCount']();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Validation Chips (Story 16.3 - Canvas Preview)', () => {
    describe('Pattern Validation Chip', () => {
      it('should return null when no pattern validation', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'testField',
          label: 'Test Field',
          required: false,
          order: 0,
        };
        component.field = field;

        // Act
        const label = component.getPatternChipLabel();

        // Assert
        expect(label).toBeNull();
      });

      it('should identify Email pattern preset', () => {
        // Arrange
        const emailPreset = validationPresetsService.getPresets().find((p) => p.name === 'email');
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.EMAIL,
          fieldName: 'email',
          label: 'Email',
          required: false,
          order: 0,
          validation: {
            pattern: emailPreset!.pattern,
          },
        };
        component.field = field;

        // Act
        const label = component.getPatternChipLabel();

        // Assert
        expect(label).toBe('Pattern: Email');
      });

      it('should identify Phone pattern preset', () => {
        // Arrange
        const phonePreset = validationPresetsService.getPresets().find((p) => p.name === 'phone');
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'phone',
          label: 'Phone',
          required: false,
          order: 0,
          validation: {
            pattern: phonePreset!.pattern,
          },
        };
        component.field = field;

        // Act
        const label = component.getPatternChipLabel();

        // Assert
        expect(label).toBe('Pattern: Phone');
      });

      it('should identify URL pattern preset', () => {
        // Arrange
        const urlPreset = validationPresetsService.getPresets().find((p) => p.name === 'url');
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'website',
          label: 'Website',
          required: false,
          order: 0,
          validation: {
            pattern: urlPreset!.pattern,
          },
        };
        component.field = field;

        // Act
        const label = component.getPatternChipLabel();

        // Assert
        expect(label).toBe('Pattern: URL');
      });

      it('should return "Custom" for non-preset patterns', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'custom',
          label: 'Custom Pattern',
          required: false,
          order: 0,
          validation: {
            pattern: '^[A-Z]{3}$',
          },
        };
        component.field = field;

        // Act
        const label = component.getPatternChipLabel();

        // Assert
        expect(label).toBe('Pattern: Custom');
      });
    });

    describe('Length Validation Chip', () => {
      it('should return null for non-text fields', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'age',
          label: 'Age',
          required: false,
          order: 0,
          validation: {
            minLength: 3,
            maxLength: 50,
          },
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBeNull();
      });

      it('should show both min and max length', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'username',
          label: 'Username',
          required: false,
          order: 0,
          validation: {
            minLength: 3,
            maxLength: 20,
          },
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBe('Length: 3-20');
      });

      it('should show only min length', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'comment',
          label: 'Comment',
          required: false,
          order: 0,
          validation: {
            minLength: 10,
          },
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBe('Min Length: 10');
      });

      it('should show only max length', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.EMAIL,
          fieldName: 'email',
          label: 'Email',
          required: false,
          order: 0,
          validation: {
            maxLength: 100,
          },
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBe('Max Length: 100');
      });

      it('should work for TEXTAREA fields', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXTAREA,
          fieldName: 'description',
          label: 'Description',
          required: false,
          order: 0,
          validation: {
            minLength: 20,
            maxLength: 500,
          },
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBe('Length: 20-500');
      });

      it('should return null when no length constraints', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'name',
          label: 'Name',
          required: false,
          order: 0,
        };
        component.field = field;

        // Act
        const label = component.getLengthChipLabel();

        // Assert
        expect(label).toBeNull();
      });
    });

    describe('Range Validation Chip', () => {
      it('should return null for non-number fields', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'name',
          label: 'Name',
          required: false,
          order: 0,
          validation: {
            min: 0,
            max: 100,
          },
        };
        component.field = field;

        // Act
        const label = component.getRangeChipLabel();

        // Assert
        expect(label).toBeNull();
      });

      it('should show both min and max values', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'age',
          label: 'Age',
          required: false,
          order: 0,
          validation: {
            min: 18,
            max: 100,
          },
        };
        component.field = field;

        // Act
        const label = component.getRangeChipLabel();

        // Assert
        expect(label).toBe('Range: 18-100');
      });

      it('should show only min value', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'quantity',
          label: 'Quantity',
          required: false,
          order: 0,
          validation: {
            min: 1,
          },
        };
        component.field = field;

        // Act
        const label = component.getRangeChipLabel();

        // Assert
        expect(label).toBe('Min: 1');
      });

      it('should show only max value', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'discount',
          label: 'Discount',
          required: false,
          order: 0,
          validation: {
            max: 50,
          },
        };
        component.field = field;

        // Act
        const label = component.getRangeChipLabel();

        // Assert
        expect(label).toBe('Max: 50');
      });

      it('should return null when no range constraints', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'amount',
          label: 'Amount',
          required: false,
          order: 0,
        };
        component.field = field;

        // Act
        const label = component.getRangeChipLabel();

        // Assert
        expect(label).toBeNull();
      });
    });

    describe('hasValidationChips()', () => {
      it('should return true when pattern chip exists', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.EMAIL,
          fieldName: 'email',
          label: 'Email',
          required: false,
          order: 0,
          validation: {
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          },
        };
        component.field = field;

        // Act
        const hasChips = component.hasValidationChips();

        // Assert
        expect(hasChips).toBe(true);
      });

      it('should return true when length chip exists', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'username',
          label: 'Username',
          required: false,
          order: 0,
          validation: {
            minLength: 3,
            maxLength: 20,
          },
        };
        component.field = field;

        // Act
        const hasChips = component.hasValidationChips();

        // Assert
        expect(hasChips).toBe(true);
      });

      it('should return true when range chip exists', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.NUMBER,
          fieldName: 'age',
          label: 'Age',
          required: false,
          order: 0,
          validation: {
            min: 18,
            max: 100,
          },
        };
        component.field = field;

        // Act
        const hasChips = component.hasValidationChips();

        // Assert
        expect(hasChips).toBe(true);
      });

      it('should return false when no validation chips', () => {
        // Arrange
        const field: FormField = {
          id: 'field-1',
          type: FormFieldType.TEXT,
          fieldName: 'name',
          label: 'Name',
          required: false,
          order: 0,
        };
        component.field = field;

        // Act
        const hasChips = component.hasValidationChips();

        // Assert
        expect(hasChips).toBe(false);
      });
    });
  });

  describe('Event Emissions', () => {
    it('should emit labelChanged event when label changes', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
      };
      component.field = field;
      const emitSpy = jest.spyOn(component.labelChanged, 'emit');

      // Act
      component.onLabelChanged('New Label');

      // Assert
      expect(emitSpy).toHaveBeenCalledWith('New Label');
    });

    it('should emit settingsClick event and stop propagation', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT,
        fieldName: 'testField',
        label: 'Test Field',
        required: false,
        order: 0,
      };
      component.field = field;
      const emitSpy = jest.spyOn(component.settingsClick, 'emit');
      const mockEvent = {
        stopPropagation: jest.fn(),
      } as unknown as Event;

      // Act
      component.onSettingsClick(mockEvent);

      // Assert
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit fieldUpdated event when options change', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.SELECT,
        fieldName: 'country',
        label: 'Country',
        required: false,
        order: 0,
      };
      component.field = field;
      const emitSpy = jest.spyOn(component.fieldUpdated, 'emit');
      const newOptions = [
        { label: 'USA', value: 'usa' },
        { label: 'Canada', value: 'canada' },
      ];

      // Act
      component.onOptionsChanged(newOptions);

      // Assert
      expect(emitSpy).toHaveBeenCalledWith({ options: newOptions });
    });
  });

  describe('Field Type Support', () => {
    it('should identify SELECT as supporting options', () => {
      expect(component.supportsOptions(FormFieldType.SELECT)).toBe(true);
    });

    it('should identify RADIO as supporting options', () => {
      expect(component.supportsOptions(FormFieldType.RADIO)).toBe(true);
    });

    it('should identify CHECKBOX as supporting options', () => {
      expect(component.supportsOptions(FormFieldType.CHECKBOX)).toBe(true);
    });

    it('should identify TEXT as NOT supporting options', () => {
      expect(component.supportsOptions(FormFieldType.TEXT)).toBe(false);
    });

    it('should identify NUMBER as NOT supporting options', () => {
      expect(component.supportsOptions(FormFieldType.NUMBER)).toBe(false);
    });

    it('should identify HEADING as NOT supporting options', () => {
      expect(component.supportsOptions(FormFieldType.HEADING)).toBe(false);
    });
  });

  describe('Performance (Story 16.5 - OnPush Change Detection)', () => {
    it('should use OnPush change detection strategy', () => {
      // Arrange & Act
      const changeDetection = (component.constructor as any).ɵcmp.changeDetection;

      // Assert - ChangeDetectionStrategy.OnPush = 0
      expect(changeDetection).toBe(0);
    });
  });
});
