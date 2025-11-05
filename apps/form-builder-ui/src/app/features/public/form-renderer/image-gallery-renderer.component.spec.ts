import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { ImageGalleryRendererComponent } from './image-gallery-renderer.component';
import { FormField, FormFieldType, ImageGalleryMetadata } from '@nodeangularfullstack/shared';
import { By } from '@angular/platform-browser';

describe('ImageGalleryRendererComponent', () => {
  let component: ImageGalleryRendererComponent;
  let fixture: ComponentFixture<ImageGalleryRendererComponent>;
  let control: FormControl;

  /**
   * Helper function to create a test IMAGE_GALLERY field
   */
  function createTestField(required = false, helpText?: string): FormField {
    const metadata: ImageGalleryMetadata = {
      images: [
        { key: 'image-1', url: 'https://example.com/image1.jpg', alt: 'Image 1' },
        { key: 'image-2', url: 'https://example.com/image2.jpg', alt: 'Image 2' },
        { key: 'image-3', url: 'https://example.com/image3.jpg', alt: 'Image 3' },
      ],
      columns: 3,
      aspectRatio: 'square',
      maxImages: 10,
    };

    return {
      id: 'field-1',
      type: FormFieldType.IMAGE_GALLERY,
      label: 'Choose Product Variant',
      fieldName: 'productVariant',
      required,
      placeholder: undefined,
      helpText,
      validation: required ? { errorMessage: 'Please select an image' } : undefined,
      order: 1,
      metadata,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageGalleryRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGalleryRendererComponent);
    component = fixture.componentInstance;
    control = new FormControl(null);
  });

  it('should create', () => {
    component.field = createTestField();
    component.control = control;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Rendering', () => {
    it('should render gallery with field metadata', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('app-image-gallery-selector'));
      expect(gallery).toBeTruthy();
      expect(gallery.componentInstance.images.length).toBe(3);
      expect(gallery.componentInstance.columns).toBe(3);
      expect(gallery.componentInstance.aspectRatio).toBe('square');
    });

    it('should display field label', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('label'));
      expect(label.nativeElement.textContent).toContain('Choose Product Variant');
    });

    it('should show required indicator (*) when field is required', () => {
      component.field = createTestField(true);
      component.control = control;
      fixture.detectChanges();

      const requiredIndicator = fixture.debugElement.query(By.css('.text-red-500'));
      expect(requiredIndicator).toBeTruthy();
      expect(requiredIndicator.nativeElement.textContent).toContain('*');
    });

    it('should not show required indicator when field is optional', () => {
      component.field = createTestField(false);
      component.control = control;
      fixture.detectChanges();

      const requiredIndicator = fixture.debugElement.query(By.css('.text-red-500'));
      expect(requiredIndicator).toBeFalsy();
    });

    it('should display help text when field.helpText exists', () => {
      component.field = createTestField(false, 'Select your preferred product variant');
      component.control = control;
      fixture.detectChanges();

      const helpText = fixture.debugElement.query(By.css('.text-gray-500'));
      expect(helpText).toBeTruthy();
      expect(helpText.nativeElement.textContent).toContain('Select your preferred product variant');
    });

    it('should not display help text when field.helpText is undefined', () => {
      component.field = createTestField(false);
      component.control = control;
      fixture.detectChanges();

      const helpText = fixture.debugElement.query(By.css('.text-gray-500'));
      expect(helpText).toBeFalsy();
    });

    it('should show error state when metadata.images is empty', () => {
      const field = createTestField();
      (field.metadata as ImageGalleryMetadata).images = [];
      component.field = field;
      component.control = control;
      fixture.detectChanges();

      const errorState = fixture.debugElement.query(By.css('.error-state'));
      expect(errorState).toBeTruthy();
      expect(errorState.nativeElement.textContent).toContain('No images available');
    });
  });

  describe('FormControl Integration', () => {
    it('should initialize FormControl value as null', () => {
      component.field = createTestField();
      component.control = new FormControl(undefined);
      component.ngOnInit();

      expect(component.control.value).toBeNull();
    });

    it('should update FormControl value on selection', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      component.onSelectionChange('image-2');

      expect(component.control.value).toBe('image-2');
    });

    it('should mark FormControl as touched on selection', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      expect(component.control.touched).toBe(false);
      component.onSelectionChange('image-1');
      expect(component.control.touched).toBe(true);
    });

    it('should mark FormControl as dirty on selection', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      expect(component.control.dirty).toBe(false);
      component.onSelectionChange('image-1');
      expect(component.control.dirty).toBe(true);
    });

    it('should pass selectedImageKey to gallery component', () => {
      component.field = createTestField();
      component.control = new FormControl('image-2');
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('app-image-gallery-selector'));
      expect(gallery.componentInstance.selectedImageKey).toBe('image-2');
    });
  });

  describe('Validation', () => {
    it('should show validation error when required field has no selection and is touched', () => {
      component.field = createTestField(true);
      component.control = new FormControl(null, Validators.required);
      component.control.markAsTouched();
      fixture.detectChanges();

      const validationError = fixture.debugElement.query(By.css('.validation-error'));
      expect(validationError).toBeTruthy();
      expect(validationError.nativeElement.textContent).toContain('Please select an image');
    });

    it('should not show validation error when field is untouched', () => {
      component.field = createTestField(true);
      component.control = new FormControl(null, Validators.required);
      fixture.detectChanges();

      const validationError = fixture.debugElement.query(By.css('.validation-error'));
      expect(validationError).toBeFalsy();
    });

    it('should clear validation error when user selects image', () => {
      component.field = createTestField(true);
      component.control = new FormControl(null, Validators.required);
      component.control.markAsTouched();
      fixture.detectChanges();

      // Verify error shows initially
      let validationError = fixture.debugElement.query(By.css('.validation-error'));
      expect(validationError).toBeTruthy();

      // Select image
      component.onSelectionChange('image-1');
      fixture.detectChanges();

      // Verify error cleared
      validationError = fixture.debugElement.query(By.css('.validation-error'));
      expect(validationError).toBeFalsy();
      expect(component.control.valid).toBe(true);
    });

    it('should use custom error message when field.validation.errorMessage is defined', () => {
      const field = createTestField(true);
      field.validation = { errorMessage: 'You must pick one variant' };
      component.field = field;
      component.control = new FormControl(null, Validators.required);
      component.control.markAsTouched();
      fixture.detectChanges();

      const validationError = fixture.debugElement.query(By.css('.validation-error'));
      expect(validationError.nativeElement.textContent).toContain('You must pick one variant');
    });

    it('should use default error message when field.validation.errorMessage is undefined', () => {
      component.field = createTestField(true);
      component.control = new FormControl(null, Validators.required);
      component.control.markAsTouched();
      fixture.detectChanges();

      const errorMessage = component.getErrorMessage();
      expect(errorMessage).toBe('Please select an image');
    });
  });

  describe('Metadata Handling', () => {
    it('should provide default metadata when field.metadata is undefined', () => {
      const field = createTestField();
      field.metadata = undefined;
      component.field = field;
      component.control = control;

      const metadata = component.metadata;
      expect(metadata.images).toEqual([]);
      expect(metadata.columns).toBe(4);
      expect(metadata.aspectRatio).toBe('square');
      expect(metadata.maxImages).toBe(10);
    });

    it('should transform metadata.images to GalleryImage format', () => {
      component.field = createTestField();
      component.control = control;

      const galleryImages = component.galleryImages;
      expect(galleryImages.length).toBe(3);
      expect(galleryImages[0]).toEqual({
        key: 'image-1',
        url: 'https://example.com/image1.jpg',
        alt: 'Image 1',
      });
    });

    it('should provide fallback alt text when metadata image has no alt', () => {
      const field = createTestField();
      (field.metadata as ImageGalleryMetadata).images = [
        { key: 'image-1', url: 'https://example.com/image1.jpg', alt: '' },
      ];
      component.field = field;
      component.control = control;

      const galleryImages = component.galleryImages;
      expect(galleryImages[0].alt).toBe('Gallery image');
    });
  });

  describe('Gallery Component Integration', () => {
    it('should emit selectionChange event to onSelectionChange handler', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('app-image-gallery-selector'));
      spyOn(component, 'onSelectionChange');

      gallery.componentInstance.selectionChange.emit('image-3');

      expect(component.onSelectionChange).toHaveBeenCalledWith('image-3');
    });

    it('should pass correct aria-label to gallery component', () => {
      component.field = createTestField();
      component.control = control;
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('app-image-gallery-selector'));
      expect(gallery.componentInstance.ariaLabel).toBe('Choose Product Variant - Select one image');
    });
  });
});
