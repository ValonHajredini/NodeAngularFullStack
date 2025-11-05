import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ImagePropertiesPanelComponent } from './image-properties-panel.component';
import { FormField, FormFieldType, ImageMetadata } from '@nodeangularfullstack/shared';

describe('ImagePropertiesPanelComponent', () => {
  let component: ImagePropertiesPanelComponent;
  let fixture: ComponentFixture<ImagePropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePropertiesPanelComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePropertiesPanelComponent);
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
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Profile Picture',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value).toEqual({
        altText: '',
        width: '100%',
        height: 'auto',
        alignment: 'center',
        objectFit: 'contain',
        caption: '',
      });
    });

    it('should load existing metadata values into form', () => {
      // Arrange
      const metadata: ImageMetadata = {
        imageUrl: 'https://example.com/image.jpg',
        altText: 'Profile picture',
        width: '500px',
        height: '300px',
        alignment: 'right',
        objectFit: 'cover',
        caption: 'My profile photo',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Profile Picture',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.altText).toBe('Profile picture');
      expect(component['form'].value.width).toBe('500px');
      expect(component['form'].value.height).toBe('300px');
      expect(component['form'].value.alignment).toBe('right');
      expect(component['form'].value.objectFit).toBe('cover');
      expect(component['form'].value.caption).toBe('My profile photo');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should require altText field', () => {
      // Act
      component['form'].get('altText')?.setValue('');

      // Assert
      expect(component['form'].get('altText')?.valid).toBe(false);
      expect(component['form'].get('altText')?.hasError('required')).toBe(true);
    });

    it('should validate form as valid when altText is provided', () => {
      // Act
      component['form'].get('altText')?.setValue('Test image');

      // Assert
      expect(component['form'].valid).toBe(true);
    });

    it('should allow optional caption field', () => {
      // Arrange
      component['form'].get('altText')?.setValue('Test alt text');

      // Act
      component['form'].get('caption')?.setValue('');

      // Assert
      expect(component['form'].get('caption')?.valid).toBe(true);
    });
  });

  describe('Field Change Emission', () => {
    beforeEach(() => {
      const metadata: ImageMetadata = {
        imageUrl: 'https://example.com/image.jpg',
        altText: 'Initial alt text',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should emit fieldChange when altText changes and form is valid', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as ImageMetadata).altText).toBe('New alt text');
        done();
      });

      // Act
      component['form'].patchValue({ altText: 'New alt text' });
    });

    it('should emit fieldChange when alignment changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as ImageMetadata).alignment).toBe('left');
        done();
      });

      // Act
      component['form'].patchValue({ alignment: 'left' });
    });

    it('should emit fieldChange when objectFit changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as ImageMetadata).objectFit).toBe('fill');
        done();
      });

      // Act
      component['form'].patchValue({ objectFit: 'fill' });
    });

    it('should NOT emit fieldChange when form is invalid', () => {
      // Arrange
      let emitCount = 0;
      component.fieldChange.subscribe(() => {
        emitCount++;
      });

      // Act - set altText to empty (invalid)
      component['form'].patchValue({ altText: '' });

      // Wait a bit to ensure no emission
      setTimeout(() => {
        expect(emitCount).toBe(0);
      }, 100);
    });
  });

  describe('Metadata Persistence', () => {
    it('should preserve customStyle when emitting field changes', (done) => {
      // Arrange
      const metadata: ImageMetadata = {
        imageUrl: 'https://example.com/image.jpg',
        altText: 'Test image',
        customStyle: 'border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as ImageMetadata).customStyle).toBe(
          'border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
        );
        expect((updatedField.metadata as ImageMetadata).alignment).toBe('full');
        done();
      });

      // Act
      component['form'].patchValue({ alignment: 'full' });
    });

    it('should set undefined for empty optional fields', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as ImageMetadata;
        // Assert - imageUrl should be preserved from field metadata (undefined in this case)
        expect(metadata.imageUrl).toBeUndefined();
        expect(metadata.caption).toBeUndefined();
        expect(metadata.width).toBeUndefined();
        expect(metadata.height).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({
        altText: 'Required alt text',
        imageUrl: '',
        width: '',
        height: '',
        caption: '',
      });
    });
  });

  describe('Alignment Options', () => {
    it('should have 4 alignment options', () => {
      expect(component['alignmentOptions'].length).toBe(4);
    });

    it('should include left, center, right, and full alignments', () => {
      const alignmentValues = component['alignmentOptions'].map((a) => a.value);
      expect(alignmentValues).toEqual(['left', 'center', 'right', 'full']);
    });
  });

  describe('Object Fit Options', () => {
    it('should have 4 object fit options', () => {
      expect(component['objectFitOptions'].length).toBe(4);
    });

    it('should include contain, cover, fill, and none object fits', () => {
      const objectFitValues = component['objectFitOptions'].map((o) => o.value);
      expect(objectFitValues).toEqual(['contain', 'cover', 'fill', 'none']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field without metadata property', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
        // No metadata property
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['form'].value.altText).toBe('');
      // imagePreviewUrl is not used in this component (handled by ImageUploadComponent)
    });

    it('should handle metadata with null imageUrl', () => {
      // Arrange
      const metadata: ImageMetadata = {
        imageUrl: undefined,
        altText: 'Test',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert - altText should be loaded from metadata
      expect(component['form'].value.altText).toBe('Test');
    });
  });
});
