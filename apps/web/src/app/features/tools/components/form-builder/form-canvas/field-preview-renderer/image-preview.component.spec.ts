import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImagePreviewComponent } from './image-preview.component';
import { FormField, FormFieldType, ImageMetadata } from '@nodeangularfullstack/shared';

describe('ImagePreviewComponent', () => {
  let component: ImagePreviewComponent;
  let fixture: ComponentFixture<ImagePreviewComponent>;

  const mockImageField: FormField = {
    id: 'field-123',
    fieldName: 'test_image',
    type: FormFieldType.IMAGE,
    label: 'Test Image',
    required: false,
    order: 0,
    metadata: {
      imageUrl: 'https://example.com/test-image.jpg',
      altText: 'Test alt text',
      alignment: 'center',
      width: '100%',
      height: 'auto',
      objectFit: 'contain',
      caption: 'Test caption',
    } as ImageMetadata,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockImageField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Image Rendering', () => {
    it('should render image when imageUrl is provided', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.src).toBe('https://example.com/test-image.jpg');
    });

    it('should render placeholder when imageUrl is not provided', () => {
      const fieldWithoutImage: FormField = {
        ...mockImageField,
        metadata: {
          altText: 'No image',
        } as ImageMetadata,
      };
      component.field = fieldWithoutImage;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.image-placeholder');
      const img = fixture.nativeElement.querySelector('img');
      expect(placeholder).toBeTruthy();
      expect(img).toBeFalsy();
    });

    it('should display placeholder icon and text when no image', () => {
      const fieldWithoutImage: FormField = {
        ...mockImageField,
        metadata: {
          altText: 'Placeholder alt text',
        } as ImageMetadata,
      };
      component.field = fieldWithoutImage;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.image-placeholder');
      const icon = placeholder?.querySelector('.pi-image');
      const text = placeholder?.textContent;
      expect(icon).toBeTruthy();
      expect(text).toContain('No image uploaded');
      expect(text).toContain('Placeholder alt text');
    });
  });

  describe('Alt Text', () => {
    it('should render alt text from metadata', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.alt).toBe('Test alt text');
    });

    it('should default to "Image" when altText is not provided', () => {
      const fieldWithoutAlt: FormField = {
        ...mockImageField,
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
        } as ImageMetadata,
      };
      component.field = fieldWithoutAlt;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.alt).toBe('Image');
    });
  });

  describe('Alignment', () => {
    it('should apply text-center class for center alignment', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.image-preview');
      expect(wrapper?.classList.contains('text-center')).toBe(true);
    });

    it('should apply text-left class for left alignment', () => {
      const fieldWithLeftAlign: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          alignment: 'left',
        } as ImageMetadata,
      };
      component.field = fieldWithLeftAlign;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.image-preview');
      expect(wrapper?.classList.contains('text-left')).toBe(true);
    });

    it('should apply text-right class for right alignment', () => {
      const fieldWithRightAlign: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          alignment: 'right',
        } as ImageMetadata,
      };
      component.field = fieldWithRightAlign;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.image-preview');
      expect(wrapper?.classList.contains('text-right')).toBe(true);
    });

    it('should apply w-full class for full alignment', () => {
      const fieldWithFullAlign: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          alignment: 'full',
        } as ImageMetadata,
      };
      component.field = fieldWithFullAlign;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.image-preview');
      expect(wrapper?.classList.contains('w-full')).toBe(true);
    });

    it('should default to text-center when alignment is not provided', () => {
      const fieldWithoutAlign: FormField = {
        ...mockImageField,
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          altText: 'Test',
        } as ImageMetadata,
      };
      component.field = fieldWithoutAlign;
      fixture.detectChanges();

      const wrapper = fixture.nativeElement.querySelector('.image-preview');
      expect(wrapper?.classList.contains('text-center')).toBe(true);
    });
  });

  describe('Dimensions', () => {
    it('should render width as percentage', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.width).toBe('100%');
    });

    it('should render width as pixels when number provided', () => {
      const fieldWithPixelWidth: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          width: 300,
        } as ImageMetadata,
      };
      component.field = fieldWithPixelWidth;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.width).toBe('300px');
    });

    it('should render height as auto', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.height).toBe('auto');
    });

    it('should render height as pixels when number provided', () => {
      const fieldWithPixelHeight: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          height: 200,
        } as ImageMetadata,
      };
      component.field = fieldWithPixelHeight;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.height).toBe('200px');
    });

    it('should default width to 100% when undefined', () => {
      const fieldWithoutWidth: FormField = {
        ...mockImageField,
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          altText: 'Test',
        } as ImageMetadata,
      };
      component.field = fieldWithoutWidth;
      fixture.detectChanges();

      expect(component.getWidth()).toBe('100%');
    });

    it('should default height to auto when undefined', () => {
      const fieldWithoutHeight: FormField = {
        ...mockImageField,
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          altText: 'Test',
        } as ImageMetadata,
      };
      component.field = fieldWithoutHeight;
      fixture.detectChanges();

      expect(component.getHeight()).toBe('auto');
    });
  });

  describe('Object Fit', () => {
    it('should render object-fit: contain', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.objectFit).toBe('contain');
    });

    it('should render object-fit: cover', () => {
      const fieldWithCover: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          objectFit: 'cover',
        } as ImageMetadata,
      };
      component.field = fieldWithCover;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.objectFit).toBe('cover');
    });

    it('should render object-fit: fill', () => {
      const fieldWithFill: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          objectFit: 'fill',
        } as ImageMetadata,
      };
      component.field = fieldWithFill;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.objectFit).toBe('fill');
    });

    it('should default to contain when objectFit is not provided', () => {
      const fieldWithoutObjectFit: FormField = {
        ...mockImageField,
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          altText: 'Test',
        } as ImageMetadata,
      };
      component.field = fieldWithoutObjectFit;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.style.objectFit).toBe('contain');
    });
  });

  describe('Caption', () => {
    it('should render caption when provided', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.text-sm.text-gray-600');
      expect(caption).toBeTruthy();
      expect(caption?.textContent?.trim()).toBe('Test caption');
    });

    it('should not render caption when not provided', () => {
      const fieldWithoutCaption: FormField = {
        ...mockImageField,
        metadata: {
          ...mockImageField.metadata,
          caption: undefined,
        } as ImageMetadata,
      };
      component.field = fieldWithoutCaption;
      fixture.detectChanges();

      const caption = fixture.nativeElement.querySelector('.text-sm.text-gray-600');
      expect(caption).toBeFalsy();
    });
  });

  describe('Lazy Loading', () => {
    it('should have loading="lazy" attribute', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.getAttribute('loading')).toBe('lazy');
    });
  });

  describe('Metadata Defaults', () => {
    it('should provide default metadata when metadata is missing', () => {
      const fieldWithoutMetadata: FormField = {
        id: 'field-456',
        fieldName: 'test_image',
        type: FormFieldType.IMAGE,
        label: 'Test Image',
        required: false,
        order: 0,
        metadata: undefined,
      };
      component.field = fieldWithoutMetadata;
      fixture.detectChanges();

      const metadata = component.metadata;
      expect(metadata.altText).toBe('Image');
      expect(metadata.alignment).toBe('center');
      expect(metadata.width).toBe('100%');
      expect(metadata.height).toBe('auto');
      expect(metadata.objectFit).toBe('contain');
    });
  });

  describe('Responsive Behavior', () => {
    it('should apply max-width and max-height classes to image', () => {
      component.field = mockImageField;
      fixture.detectChanges();

      const img = fixture.nativeElement.querySelector('img');
      expect(img?.classList.contains('max-w-full')).toBe(true);
      expect(img?.classList.contains('max-h-[200px]')).toBe(true);
    });

    it('should render placeholder with fixed dimensions', () => {
      const fieldWithoutImage: FormField = {
        ...mockImageField,
        metadata: {
          altText: 'Test',
        } as ImageMetadata,
      };
      component.field = fieldWithoutImage;
      fixture.detectChanges();

      const placeholder = fixture.nativeElement.querySelector('.image-placeholder');
      expect(placeholder?.style.minHeight).toBe('150px');
      expect(placeholder?.style.maxWidth).toBe('300px');
    });
  });

  describe('getWidth method', () => {
    it('should return "100%" for undefined width', () => {
      component.field = { ...mockImageField, metadata: {} as ImageMetadata };
      expect(component.getWidth()).toBe('100%');
    });

    it('should return "100%" for "100%" width', () => {
      component.field = {
        ...mockImageField,
        metadata: { width: '100%' } as ImageMetadata,
      };
      expect(component.getWidth()).toBe('100%');
    });

    it('should return pixels for number width', () => {
      component.field = {
        ...mockImageField,
        metadata: { width: 250 } as ImageMetadata,
      };
      expect(component.getWidth()).toBe('250px');
    });

    it('should return string as-is for custom width', () => {
      component.field = {
        ...mockImageField,
        metadata: { width: '50vw' } as ImageMetadata,
      };
      expect(component.getWidth()).toBe('50vw');
    });
  });

  describe('getHeight method', () => {
    it('should return "auto" for undefined height', () => {
      component.field = { ...mockImageField, metadata: {} as ImageMetadata };
      expect(component.getHeight()).toBe('auto');
    });

    it('should return "auto" for "auto" height', () => {
      component.field = {
        ...mockImageField,
        metadata: { height: 'auto' } as ImageMetadata,
      };
      expect(component.getHeight()).toBe('auto');
    });

    it('should return pixels for number height', () => {
      component.field = {
        ...mockImageField,
        metadata: { height: 180 } as ImageMetadata,
      };
      expect(component.getHeight()).toBe('180px');
    });

    it('should return string as-is for custom height', () => {
      component.field = {
        ...mockImageField,
        metadata: { height: '30vh' } as ImageMetadata,
      };
      expect(component.getHeight()).toBe('30vh');
    });
  });
});
