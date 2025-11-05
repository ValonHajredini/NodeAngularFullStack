import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { HttpClient } from '@angular/common/http';
import { ImageGalleryPropertiesPanelComponent } from './image-gallery-properties-panel.component';
import { FormField, FormFieldType, ImageGalleryMetadata } from '@nodeangularfullstack/shared';

describe('ImageGalleryPropertiesPanelComponent', () => {
  let component: ImageGalleryPropertiesPanelComponent;
  let fixture: ComponentFixture<ImageGalleryPropertiesPanelComponent>;
  let httpClientSpy: jasmine.SpyObj<HttpClient>;

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['post']);

    await TestBed.configureTestingModule({
      imports: [ImageGalleryPropertiesPanelComponent],
      providers: [{ provide: HttpClient, useValue: httpClientSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGalleryPropertiesPanelComponent);
    component = fixture.componentInstance;
    component.formId = 'test-form-id';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with empty images array when no metadata exists', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['images']()).toEqual([]);
      expect(component['columns']()).toBe(4);
      expect(component['aspectRatio']()).toBe('square');
      expect(component['maxImages']()).toBe(10);
    });

    it('should load existing metadata from field', () => {
      // Arrange
      const metadata: ImageGalleryMetadata = {
        images: [
          { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
          { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Image 2' },
        ],
        columns: 3,
        aspectRatio: '16:9',
        maxImages: 15,
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['images']()).toEqual(metadata.images);
      expect(component['columns']()).toBe(3);
      expect(component['aspectRatio']()).toBe('16:9');
      expect(component['maxImages']()).toBe(15);
    });

    it('should use default values when metadata properties are undefined', () => {
      // Arrange
      const metadata: ImageGalleryMetadata = {
        images: [],
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['columns']()).toBe(4);
      expect(component['aspectRatio']()).toBe('square');
      expect(component['maxImages']()).toBe(10);
    });
  });

  describe('Image Upload', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: { images: [] },
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should add uploaded image to images array', () => {
      // Arrange
      const uploadedImageUrl = 'https://example.com/uploaded.jpg';

      // Act
      component['onImageUploaded'](uploadedImageUrl);

      // Assert
      expect(component['images']().length).toBe(1);
      expect(component['images']()[0].url).toBe(uploadedImageUrl);
      expect(component['images']()[0].alt).toBe('');
      expect(component['images']()[0].key).toContain('image-gallery-');
    });

    it('should emit metadata change when image uploaded', (done) => {
      // Arrange
      const uploadedImageUrl = 'https://example.com/uploaded.jpg';

      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.images.length).toBe(1);
        expect(metadata.images[0].url).toBe(uploadedImageUrl);
        done();
      });

      // Act
      component['onImageUploaded'](uploadedImageUrl);
    });

    it('should generate unique key for each uploaded image', () => {
      // Act
      component['onImageUploaded']('https://example.com/img1.jpg');
      component['onImageUploaded']('https://example.com/img2.jpg');

      // Assert
      const images = component['images']();
      expect(images.length).toBe(2);
      expect(images[0].key).not.toBe(images[1].key);
      expect(images[0].key).toContain('image-gallery-');
      expect(images[1].key).toContain('image-gallery-');
    });

    it('should handle upload error gracefully', () => {
      // Arrange
      const errorMessage = 'Upload failed';
      spyOn(console, 'error');

      // Act
      component['onUploadError'](errorMessage);

      // Assert
      expect(console.error).toHaveBeenCalledWith('Image upload error:', errorMessage);
      // Verify component state not affected
      expect(component['images']().length).toBe(0);
    });
  });

  describe('Delete Image', () => {
    beforeEach(() => {
      const metadata: ImageGalleryMetadata = {
        images: [
          { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
          { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Image 2' },
          { key: 'img-3', url: 'https://example.com/img3.jpg', alt: 'Image 3' },
        ],
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should remove image at specified index', () => {
      // Arrange
      const initialLength = component['images']().length;

      // Act
      component.onImageDeleted('img-2'); // Remove middle image

      // Assert
      expect(component['images']().length).toBe(initialLength - 1);
      expect(component['images']()).toEqual([
        { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
        { key: 'img-3', url: 'https://example.com/img3.jpg', alt: 'Image 3' },
      ]);
    });

    it('should emit metadata change when deleting image', (done) => {
      // Arrange
      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.images.length).toBe(2);
        expect(metadata.images.find((img) => img.key === 'img-2')).toBeUndefined();
        done();
      });

      // Act
      component.onImageDeleted('img-2');
    });

    it('should delete first image correctly', () => {
      // Act
      component.onImageDeleted('img-1');

      // Assert
      expect(component['images']().length).toBe(2);
      expect(component['images']()[0].key).toBe('img-2');
    });

    it('should delete last image correctly', () => {
      // Act
      component.onImageDeleted('img-3');

      // Assert
      expect(component['images']().length).toBe(2);
      expect(component['images']()[1].key).toBe('img-2');
    });
  });

  describe('Update Alt Text', () => {
    beforeEach(() => {
      const metadata: ImageGalleryMetadata = {
        images: [
          { key: 'img-1', url: 'https://example.com/img1.jpg', alt: '' },
          { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Initial Alt' },
        ],
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should update alt text for specified image', () => {
      // Act
      component.onDescriptionChanged({ key: 'img-1', description: 'New Alt Text' });

      // Assert
      expect(component['images']()[0].alt).toBe('New Alt Text');
      expect(component['images']()[0].url).toBe('https://example.com/img1.jpg');
      expect(component['images']()[0].key).toBe('img-1');
    });

    it('should emit metadata change when updating alt text', (done) => {
      // Arrange
      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.images[1].alt).toBe('Updated Alt');
        done();
      });

      // Act
      component.onDescriptionChanged({ key: 'img-2', description: 'Updated Alt' });
    });

    it('should handle empty alt text', () => {
      // Act
      component.onDescriptionChanged({ key: 'img-1', description: '' });

      // Assert
      expect(component['images']()[0].alt).toBe('');
    });

    it('should preserve other image properties when updating alt text', () => {
      // Act
      component.onDescriptionChanged({ key: 'img-2', description: 'New Alt' });

      // Assert
      const image = component['images']()[1];
      expect(image.key).toBe('img-2');
      expect(image.url).toBe('https://example.com/img2.jpg');
      expect(image.alt).toBe('New Alt');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: { images: [] },
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should update columns configuration', () => {
      // Act
      component['updateColumns'](3);

      // Assert
      expect(component['columns']()).toBe(3);
    });

    it('should emit metadata change when updating columns', (done) => {
      // Arrange
      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.columns).toBe(2);
        done();
      });

      // Act
      component['updateColumns'](2);
    });

    it('should update aspect ratio configuration', () => {
      // Act
      component['updateAspectRatio']('16:9');

      // Assert
      expect(component['aspectRatio']()).toBe('16:9');
    });

    it('should emit metadata change when updating aspect ratio', (done) => {
      // Arrange
      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.aspectRatio).toBe('auto');
        done();
      });

      // Act
      component['updateAspectRatio']('auto');
    });

    it('should update max images configuration', () => {
      // Act
      component['updateMaxImages'](15);

      // Assert
      expect(component['maxImages']()).toBe(15);
    });

    it('should clamp max images to valid range (2-20)', () => {
      // Test lower bound
      component['updateMaxImages'](1);
      expect(component['maxImages']()).toBe(2);

      // Test upper bound
      component['updateMaxImages'](25);
      expect(component['maxImages']()).toBe(20);

      // Test negative value
      component['updateMaxImages'](-5);
      expect(component['maxImages']()).toBe(2);
    });

    it('should emit metadata change when updating max images', (done) => {
      // Arrange
      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.maxImages).toBe(8);
        done();
      });

      // Act
      component['updateMaxImages'](8);
    });
  });

  describe('Validation', () => {
    it('should be invalid when less than 2 images', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: {
          images: [{ key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' }],
        },
      };
      component.field = field;
      component.ngOnInit();

      // Assert
      expect(component['isValid']()).toBe(false);
    });

    it('should be invalid when any image missing alt text', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: {
          images: [
            { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
            { key: 'img-2', url: 'https://example.com/img2.jpg', alt: '' }, // Missing alt
          ],
        },
      };
      component.field = field;
      component.ngOnInit();

      // Assert
      expect(component['isValid']()).toBe(false);
    });

    it('should be valid when 2+ images all have alt text', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: {
          images: [
            { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
            { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Image 2' },
          ],
        },
      };
      component.field = field;
      component.ngOnInit();

      // Assert
      expect(component['isValid']()).toBe(true);
    });

    it('should be invalid when alt text is only whitespace', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: {
          images: [
            { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
            { key: 'img-2', url: 'https://example.com/img2.jpg', alt: '   ' }, // Whitespace only
          ],
        },
      };
      component.field = field;
      component.ngOnInit();

      // Assert
      expect(component['isValid']()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field with no metadata', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        // No metadata property
      };
      component.field = field;

      // Act & Assert
      expect(() => component.ngOnInit()).not.toThrow();
      expect(component['images']()).toEqual([]);
    });

    it('should handle rapid add/delete operations', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: { images: [] },
      };
      component.field = field;
      component.ngOnInit();

      // Act - add 3 images
      component['onImageUploaded']('https://example.com/img1.jpg');
      component['onImageUploaded']('https://example.com/img2.jpg');
      component['onImageUploaded']('https://example.com/img3.jpg');

      // Delete middle image (get key from images array)
      const middleImageKey = component['images']()[1].key;
      component.onImageDeleted(middleImageKey);

      // Assert
      expect(component['images']().length).toBe(2);
      expect(component['images']()[0].url).toContain('img1.jpg');
      expect(component['images']()[1].url).toContain('img3.jpg');
    });

    it('should maintain image immutability when updating alt text', () => {
      // Arrange
      const metadata: ImageGalleryMetadata = {
        images: [{ key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Original' }],
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      const originalImage = component['images']()[0];

      // Act
      component.onDescriptionChanged({ key: 'img-1', description: 'Modified' });

      // Assert - original reference should not be modified
      expect(originalImage.alt).toBe('Original');
      expect(component['images']()[0].alt).toBe('Modified');
    });
  });

  describe('Metadata Emission Format', () => {
    it('should emit complete metadata with all properties', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.IMAGE_GALLERY,
        fieldName: 'gallery',
        label: 'Image Gallery',
        required: false,
        order: 0,
        metadata: { images: [] },
      };
      component.field = field;
      component.ngOnInit();

      component.metadataChange.subscribe((metadata) => {
        // Assert
        expect(metadata.images).toBeInstanceOf(Array);
        expect(metadata.columns).toBeDefined();
        expect(metadata.aspectRatio).toBeDefined();
        expect(metadata.maxImages).toBeDefined();
        done();
      });

      // Act
      component['onImageUploaded']('https://example.com/test.jpg');
    });
  });
});
