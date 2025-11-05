import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HeadingPropertiesPanelComponent } from './heading-properties-panel.component';
import { FormField, FormFieldType, HeadingMetadata } from '@nodeangularfullstack/shared';

describe('HeadingPropertiesPanelComponent', () => {
  let component: HeadingPropertiesPanelComponent;
  let fixture: ComponentFixture<HeadingPropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeadingPropertiesPanelComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HeadingPropertiesPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when metadata is empty', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Welcome Heading',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value).toEqual({
        headingLevel: 'h2',
        alignment: 'left',
        color: '',
        fontWeight: 'bold',
      });
    });

    it('should load existing metadata values into form', () => {
      // Arrange
      const metadata: HeadingMetadata = {
        headingLevel: 'h3',
        alignment: 'center',
        color: '#FF0000',
        fontWeight: 'normal',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Welcome Heading',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.headingLevel).toBe('h3');
      expect(component['form'].value.alignment).toBe('center');
      expect(component['form'].value.color).toBe('#FF0000');
      expect(component['form'].value.fontWeight).toBe('normal');
    });

    it('should preserve customStyle when initializing form', () => {
      // Arrange
      const metadata: HeadingMetadata = {
        headingLevel: 'h1',
        alignment: 'left',
        fontWeight: 'bold',
        customStyle: 'text-shadow: 2px 2px 4px rgba(0,0,0,0.3);',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Custom Heading',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert - customStyle should be preserved in metadata, not in form
      expect((component.field.metadata as HeadingMetadata).customStyle).toBe(
        'text-shadow: 2px 2px 4px rgba(0,0,0,0.3);',
      );
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should require headingLevel field', () => {
      // Act
      component['form'].get('headingLevel')?.setValue('');

      // Assert
      expect(component['form'].get('headingLevel')?.valid).toBe(false);
    });

    it('should require alignment field', () => {
      // Act
      component['form'].get('alignment')?.setValue('');

      // Assert
      expect(component['form'].get('alignment')?.valid).toBe(false);
    });

    it('should require fontWeight field', () => {
      // Act
      component['form'].get('fontWeight')?.setValue('');

      // Assert
      expect(component['form'].get('fontWeight')?.valid).toBe(false);
    });

    it('should allow empty color field (optional)', () => {
      // Act
      component['form'].get('color')?.setValue('');

      // Assert
      expect(component['form'].get('color')?.valid).toBe(true);
    });
  });

  describe('Field Change Emission', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should emit fieldChange when headingLevel changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as HeadingMetadata).headingLevel).toBe('h4');
        done();
      });

      // Act
      component['form'].patchValue({ headingLevel: 'h4' });
    });

    it('should emit fieldChange when alignment changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as HeadingMetadata).alignment).toBe('right');
        done();
      });

      // Act
      component['form'].patchValue({ alignment: 'right' });
    });

    it('should emit fieldChange when color changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as HeadingMetadata).color).toBe('#0000FF');
        done();
      });

      // Act
      component['form'].patchValue({ color: '#0000FF' });
    });

    it('should emit fieldChange when fontWeight changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as HeadingMetadata).fontWeight).toBe('normal');
        done();
      });

      // Act
      component['form'].patchValue({ fontWeight: 'normal' });
    });
  });

  describe('Metadata Persistence', () => {
    it('should preserve customStyle when emitting field changes', (done) => {
      // Arrange
      const metadata: HeadingMetadata = {
        headingLevel: 'h2',
        alignment: 'left',
        fontWeight: 'bold',
        customStyle: 'letter-spacing: 2px;',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert - customStyle should be preserved
        expect((updatedField.metadata as HeadingMetadata).customStyle).toBe('letter-spacing: 2px;');
        expect((updatedField.metadata as HeadingMetadata).headingLevel).toBe('h5');
        done();
      });

      // Act
      component['form'].patchValue({ headingLevel: 'h5' });
    });

    it('should set color to undefined when empty string', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as HeadingMetadata).color).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ color: '' });
    });

    it('should include all metadata properties in emitted field', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        const metadata = updatedField.metadata as HeadingMetadata;
        expect(metadata.headingLevel).toBe('h1');
        expect(metadata.alignment).toBe('center');
        expect(metadata.color).toBe('#00FF00');
        expect(metadata.fontWeight).toBe('bold');
        expect(updatedField.id).toBe('field-1');
        expect(updatedField.type).toBe(FormFieldType.HEADING);
        done();
      });

      // Act
      component['form'].patchValue({
        headingLevel: 'h1',
        alignment: 'center',
        color: '#00FF00',
        fontWeight: 'bold',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid form changes', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      let emitCount = 0;
      component.fieldChange.subscribe((updatedField) => {
        emitCount++;
        if (emitCount === 3) {
          // Assert - should have final value
          expect((updatedField.metadata as HeadingMetadata).headingLevel).toBe('h6');
          done();
        }
      });

      // Act - rapid changes
      component['form'].patchValue({ headingLevel: 'h4' });
      component['form'].patchValue({ headingLevel: 'h5' });
      component['form'].patchValue({ headingLevel: 'h6' });
    });

    it('should handle field without metadata property', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.HEADING,
        fieldName: 'heading',
        label: 'Heading',
        required: false,
        order: 0,
        // No metadata property
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['form'].value.headingLevel).toBe('h2');
    });
  });

  describe('Heading Level Options', () => {
    it('should have 6 heading level options', () => {
      expect(component['headingLevels'].length).toBe(6);
    });

    it('should include all heading levels h1 through h6', () => {
      const levels = component['headingLevels'].map((h) => h.value);
      expect(levels).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    });
  });

  describe('Alignment Options', () => {
    it('should have 3 alignment options', () => {
      expect(component['alignments'].length).toBe(3);
    });

    it('should include left, center, and right alignments', () => {
      const alignmentValues = component['alignments'].map((a) => a.value);
      expect(alignmentValues).toEqual(['left', 'center', 'right']);
    });
  });

  describe('Font Weight Options', () => {
    it('should have 2 font weight options', () => {
      expect(component['fontWeights'].length).toBe(2);
    });

    it('should include normal and bold font weights', () => {
      const weightValues = component['fontWeights'].map((w) => w.value);
      expect(weightValues).toEqual(['normal', 'bold']);
    });
  });
});
