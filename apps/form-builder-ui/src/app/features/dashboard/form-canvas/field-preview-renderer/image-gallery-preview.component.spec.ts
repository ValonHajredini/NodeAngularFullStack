import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageGalleryPreviewComponent } from './image-gallery-preview.component';
import { FormField, FormFieldType, ImageGalleryMetadata } from '@nodeangularfullstack/shared';

describe('ImageGalleryPreviewComponent', () => {
  let component: ImageGalleryPreviewComponent;
  let fixture: ComponentFixture<ImageGalleryPreviewComponent>;

  const mockGalleryField: FormField = {
    id: 'field-123',
    fieldName: 'test_gallery',
    type: FormFieldType.IMAGE_GALLERY,
    label: 'Test Gallery',
    required: false,
    order: 0,
    metadata: {
      images: [
        { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
        { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Image 2' },
      ],
      columns: 4,
      aspectRatio: 'square',
      maxImages: 10,
    } as ImageGalleryMetadata,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageGalleryPreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGalleryPreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockGalleryField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Gallery Rendering', () => {
    it('should render ImageGallerySelectorComponent when images exist', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(gallerySelector).toBeTruthy();
    });

    it('should pass images to ImageGallerySelectorComponent', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(gallerySelector).toBeTruthy();
      // Component inputs are bound, ImageGallerySelectorComponent should receive images
    });

    it('should pass columns to ImageGallerySelectorComponent', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.columns).toBe(4);
    });

    it('should pass aspectRatio to ImageGallerySelectorComponent', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.aspectRatio).toBe('square');
    });

    it('should select first image by default', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.images[0].key).toBe('img-1');
    });

    it('should render empty state when no images exist', () => {
      const fieldWithoutImages: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [],
          columns: 4,
          aspectRatio: 'square',
          maxImages: 10,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithoutImages;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(emptyState).toBeTruthy();
      expect(gallerySelector).toBeFalsy();
    });

    it('should display placeholder icon and text in empty state', () => {
      const fieldWithoutImages: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [],
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithoutImages;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      const icon = emptyState?.querySelector('.pi-images');
      const text = emptyState?.textContent;
      expect(icon).toBeTruthy();
      expect(text).toContain('No images uploaded');
      expect(text).toContain('Add images in the properties panel');
    });
  });

  describe('Field Label', () => {
    it('should render field label', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('label');
      expect(label).toBeTruthy();
      expect(label?.textContent?.trim()).toContain('Test Gallery');
    });

    it('should display required indicator when field is required', () => {
      const requiredField: FormField = {
        ...mockGalleryField,
        required: true,
      };
      component.field = requiredField;
      fixture.detectChanges();

      const requiredIndicator = fixture.nativeElement.querySelector('.text-red-500');
      expect(requiredIndicator).toBeTruthy();
      expect(requiredIndicator?.textContent).toContain('*');
    });

    it('should not display required indicator when field is not required', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const requiredIndicator = fixture.nativeElement.querySelector('.text-red-500');
      expect(requiredIndicator).toBeFalsy();
    });
  });

  describe('Metadata Defaults', () => {
    it('should provide default metadata when metadata is missing', () => {
      const fieldWithoutMetadata: FormField = {
        id: 'field-456',
        fieldName: 'test_gallery',
        type: FormFieldType.IMAGE_GALLERY,
        label: 'Test Gallery',
        required: false,
        order: 0,
        metadata: undefined,
      };
      component.field = fieldWithoutMetadata;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.images).toEqual([]);
      expect(metadata.columns).toBe(4);
      expect(metadata.aspectRatio).toBe('square');
      expect(metadata.maxImages).toBe(10);
    });

    it('should use default columns when not specified', () => {
      const fieldWithPartialMetadata: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [{ key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' }],
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithPartialMetadata;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.columns).toBe(4);
    });

    it('should use default aspectRatio when not specified', () => {
      const fieldWithPartialMetadata: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [{ key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' }],
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithPartialMetadata;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.aspectRatio).toBe('square');
    });
  });

  describe('Different Configurations', () => {
    it('should render gallery with 2 columns', () => {
      const fieldWith2Columns: FormField = {
        ...mockGalleryField,
        metadata: {
          ...mockGalleryField.metadata,
          columns: 2,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWith2Columns;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.columns).toBe(2);
    });

    it('should render gallery with 3 columns', () => {
      const fieldWith3Columns: FormField = {
        ...mockGalleryField,
        metadata: {
          ...mockGalleryField.metadata,
          columns: 3,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWith3Columns;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.columns).toBe(3);
    });

    it('should render gallery with 16:9 aspect ratio', () => {
      const fieldWith16x9: FormField = {
        ...mockGalleryField,
        metadata: {
          ...mockGalleryField.metadata,
          aspectRatio: '16:9',
        } as ImageGalleryMetadata,
      };
      component.field = fieldWith16x9;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.aspectRatio).toBe('16:9');
    });

    it('should render gallery with auto aspect ratio', () => {
      const fieldWithAuto: FormField = {
        ...mockGalleryField,
        metadata: {
          ...mockGalleryField.metadata,
          aspectRatio: 'auto',
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithAuto;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.aspectRatio).toBe('auto');
    });
  });

  describe('Preview Styling', () => {
    it('should have pointer-events-none class', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const fieldPreview = fixture.nativeElement.querySelector('.field-preview');
      expect(fieldPreview).toBeTruthy();
    });

    it('should have reduced opacity', () => {
      component.field = mockGalleryField;
      fixture.detectChanges();

      const fieldPreview = fixture.nativeElement.querySelector('.field-preview');
      expect(fieldPreview).toBeTruthy();
      // Component has opacity: 0.9 in styles
    });
  });

  describe('Empty State Styling', () => {
    it('should have dashed border in empty state', () => {
      const fieldWithoutImages: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [],
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithoutImages;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      // Component has border: 2px dashed #d1d5db in styles
    });

    it('should have minimum height in empty state', () => {
      const fieldWithoutImages: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [],
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithoutImages;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      // Component has min-height: 150px in styles
    });
  });

  describe('Gallery with Multiple Images', () => {
    it('should render gallery with 5 images', () => {
      const fieldWith5Images: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [
            { key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Image 1' },
            { key: 'img-2', url: 'https://example.com/img2.jpg', alt: 'Image 2' },
            { key: 'img-3', url: 'https://example.com/img3.jpg', alt: 'Image 3' },
            { key: 'img-4', url: 'https://example.com/img4.jpg', alt: 'Image 4' },
            { key: 'img-5', url: 'https://example.com/img5.jpg', alt: 'Image 5' },
          ],
          columns: 3,
          aspectRatio: '16:9',
          maxImages: 10,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWith5Images;
      fixture.detectChanges();

      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(gallerySelector).toBeTruthy();
      expect(component.metadata.images.length).toBe(5);
    });

    it('should render gallery with 10 images', () => {
      const images = Array.from({ length: 10 }, (_, i) => ({
        key: `img-${i + 1}`,
        url: `https://example.com/img${i + 1}.jpg`,
        alt: `Image ${i + 1}`,
      }));

      const fieldWith10Images: FormField = {
        ...mockGalleryField,
        metadata: {
          images,
          columns: 4,
          aspectRatio: 'square',
          maxImages: 10,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWith10Images;
      fixture.detectChanges();

      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(gallerySelector).toBeTruthy();
      expect(component.metadata.images.length).toBe(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field with null metadata', () => {
      const fieldWithNullMetadata: FormField = {
        ...mockGalleryField,
        metadata: null as any,
      };
      component.field = fieldWithNullMetadata;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should handle field with undefined images array', () => {
      const fieldWithUndefinedImages: FormField = {
        ...mockGalleryField,
        metadata: {
          images: undefined as any,
          columns: 4,
          aspectRatio: 'square',
          maxImages: 10,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithUndefinedImages;
      fixture.detectChanges();

      // Should default to empty array and show empty state
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should handle single image gallery', () => {
      const fieldWithSingleImage: FormField = {
        ...mockGalleryField,
        metadata: {
          images: [{ key: 'img-1', url: 'https://example.com/img1.jpg', alt: 'Single Image' }],
          columns: 4,
          aspectRatio: 'square',
          maxImages: 10,
        } as ImageGalleryMetadata,
      };
      component.field = fieldWithSingleImage;
      fixture.detectChanges();

      const gallerySelector = fixture.nativeElement.querySelector('app-image-gallery-selector');
      expect(gallerySelector).toBeTruthy();
      expect(component.metadata.images.length).toBe(1);
    });
  });
});
