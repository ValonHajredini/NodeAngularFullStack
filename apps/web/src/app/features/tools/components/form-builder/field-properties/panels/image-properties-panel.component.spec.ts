import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImagePropertiesPanelComponent } from './image-properties-panel.component';
import { FormField, FormFieldType, ImageMetadata } from '@nodeangularfullstack/shared';

describe('ImagePropertiesPanelComponent', () => {
  let component: ImagePropertiesPanelComponent;
  let fixture: ComponentFixture<ImagePropertiesPanelComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePropertiesPanelComponent, ReactiveFormsModule, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePropertiesPanelComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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
        imageUrl: '',
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
      expect(component['form'].value.imageUrl).toBe('https://example.com/image.jpg');
      expect(component['form'].value.altText).toBe('Profile picture');
      expect(component['form'].value.width).toBe('500px');
      expect(component['form'].value.height).toBe('300px');
      expect(component['form'].value.alignment).toBe('right');
      expect(component['form'].value.objectFit).toBe('cover');
      expect(component['form'].value.caption).toBe('My profile photo');
    });

    it('should set image preview URL when imageUrl exists in metadata', () => {
      // Arrange
      const metadata: ImageMetadata = {
        imageUrl: 'https://example.com/test.jpg',
        altText: 'Test image',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE,
        fieldName: 'imageField',
        label: 'Image Field',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['imagePreviewUrl']()).toBe('https://example.com/test.jpg');
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

    it('should allow empty imageUrl field', () => {
      // Arrange
      component['form'].get('altText')?.setValue('Test alt text');

      // Act
      component['form'].get('imageUrl')?.setValue('');

      // Assert
      expect(component['form'].get('imageUrl')?.valid).toBe(true);
    });
  });

  describe('Image Upload', () => {
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

    it('should upload image and update form with imageUrl', () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { files: [mockFile] };
      const mockResponse = {
        imageUrl: 'https://cdn.example.com/uploads/test.jpg',
        fileName: 'test.jpg',
        fileSize: 12345,
      };

      // Act
      component['onImageSelect'](mockEvent);

      // Assert HTTP request
      const req = httpMock.expectOne('/api/forms/upload');
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush(mockResponse);

      // Verify form updated
      expect(component['form'].value.imageUrl).toBe('https://cdn.example.com/uploads/test.jpg');
      expect(component['imagePreviewUrl']()).toBe('https://cdn.example.com/uploads/test.jpg');
    });

    it('should clear upload error on successful upload', () => {
      // Arrange
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { files: [mockFile] };
      const mockResponse = {
        imageUrl: 'https://cdn.example.com/test.jpg',
        fileName: 'test.jpg',
        fileSize: 100,
      };

      // Set initial error
      component['uploadError'].set('Previous error');

      // Act
      component['onImageSelect'](mockEvent);
      const req = httpMock.expectOne('/api/forms/upload');
      req.flush(mockResponse);

      // Assert
      expect(component['uploadError']()).toBeNull();
    });

    it('should handle upload error and set error message', () => {
      // Arrange
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { files: [mockFile] };
      const mockError = { error: { message: 'File too large' } };

      // Act
      component['onImageSelect'](mockEvent);
      const req = httpMock.expectOne('/api/forms/upload');
      req.flush(mockError, { status: 400, statusText: 'Bad Request' });

      // Assert
      expect(component['uploadError']()).toBe('File too large');
    });

    it('should handle upload error with generic message when no error message provided', () => {
      // Arrange
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockEvent = { files: [mockFile] };

      // Act
      component['onImageSelect'](mockEvent);
      const req = httpMock.expectOne('/api/forms/upload');
      req.flush(null, { status: 500, statusText: 'Server Error' });

      // Assert
      expect(component['uploadError']()).toBe('Image upload failed. Please try again.');
    });

    it('should not upload when no file is selected', () => {
      // Arrange
      const mockEvent = { files: [] };

      // Act
      component['onImageSelect'](mockEvent);

      // Assert - no HTTP request should be made
      httpMock.expectNone('/api/forms/upload');
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
        // Assert
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
      expect(component['imagePreviewUrl']()).toBeNull();
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

      // Assert
      expect(component['imagePreviewUrl']()).toBeNull();
    });
  });
});
