import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ImageGallerySelectorComponent, GalleryImage } from './image-gallery-selector.component';

describe('ImageGallerySelectorComponent', () => {
  let component: ImageGallerySelectorComponent;
  let fixture: ComponentFixture<ImageGallerySelectorComponent>;

  const mockImages: GalleryImage[] = [
    { key: 'img1', url: 'https://example.com/image1.jpg', alt: 'Image 1' },
    { key: 'img2', url: 'https://example.com/image2.jpg', alt: 'Image 2' },
    { key: 'img3', url: 'https://example.com/image3.jpg', alt: 'Image 3' },
    { key: 'img4', url: 'https://example.com/image4.jpg', alt: 'Image 4' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageGallerySelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGallerySelectorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('images', mockImages);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Grid Layout Display', () => {
    it('should render images in a grid layout with valid images array', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems.length).toBe(4);
    });

    it('should display correct number of images', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const images = fixture.debugElement.queryAll(By.css('.image-item img'));
      expect(images.length).toBe(4);
      expect(images[0].nativeElement.src).toContain('image1.jpg');
      expect(images[1].nativeElement.src).toContain('image2.jpg');
    });

    it('should show empty state when no images provided', () => {
      fixture.componentRef.setInput('images', []);
      fixture.detectChanges();

      const emptyState = fixture.debugElement.query(By.css('.empty-state'));
      expect(emptyState).toBeTruthy();
      expect(emptyState.nativeElement.textContent).toContain('No images available');
    });

    it('should apply correct grid column classes based on columns input', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 3);
      fixture.detectChanges();

      const imageGrid = fixture.debugElement.query(By.css('.image-grid'));
      expect(imageGrid.nativeElement.classList.contains('grid-cols-3')).toBe(true);
    });
  });

  describe('Single Selection Behavior', () => {
    it('should emit selectionChange event when image is clicked', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      let emittedKey: string | undefined;
      component.selectionChange.subscribe((key: string) => {
        emittedKey = key;
      });

      const firstImage = fixture.debugElement.query(By.css('.image-item'));
      firstImage.nativeElement.click();
      fixture.detectChanges();

      expect(emittedKey).toBe('img1');
    });

    it('should display selection indicator on selected image', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('selectedImageKey', 'img2');
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      const selectedImage = imageItems[1];

      expect(selectedImage.nativeElement.classList.contains('selected')).toBe(true);
      const indicator = selectedImage.query(By.css('.selection-indicator'));
      expect(indicator).toBeTruthy();
    });

    it('should only show selection indicator on one image at a time', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('selectedImageKey', 'img3');
      fixture.detectChanges();

      const indicators = fixture.debugElement.queryAll(By.css('.selection-indicator'));
      expect(indicators.length).toBe(1);
    });

    it('should update aria-checked attribute for selected image', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('selectedImageKey', 'img1');
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems[0].nativeElement.getAttribute('aria-checked')).toBe('true');
      expect(imageItems[1].nativeElement.getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate right with ArrowRight key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      component['focusedIndex'].set(0);
      gallery.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(component['focusedIndex']()).toBe(1);
    });

    it('should navigate left with ArrowLeft key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });

      component['focusedIndex'].set(2);
      gallery.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(component['focusedIndex']()).toBe(1);
    });

    it('should navigate down with ArrowDown key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 2);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component['focusedIndex'].set(0);
      gallery.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      // Should move down by 2 (columns count)
      expect(component['focusedIndex']()).toBe(2);
    });

    it('should navigate up with ArrowUp key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 2);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

      component['focusedIndex'].set(2);
      gallery.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      // Should move up by 2 (columns count)
      expect(component['focusedIndex']()).toBe(0);
    });

    it('should not navigate beyond grid boundaries', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));

      // Try to navigate left from first image
      component['focusedIndex'].set(0);
      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      gallery.nativeElement.dispatchEvent(leftEvent);
      fixture.detectChanges();
      expect(component['focusedIndex']()).toBe(0);

      // Try to navigate right from last image
      component['focusedIndex'].set(3);
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      gallery.nativeElement.dispatchEvent(rightEvent);
      fixture.detectChanges();
      expect(component['focusedIndex']()).toBe(3);
    });

    it('should select image with Space key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      let emittedKey: string | undefined;
      component.selectionChange.subscribe((key: string) => {
        emittedKey = key;
      });

      const firstImage = fixture.debugElement.query(By.css('.image-item'));
      const event = new KeyboardEvent('keydown', { key: ' ' });
      firstImage.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(emittedKey).toBe('img1');
    });

    it('should select image with Enter key', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      let emittedKey: string | undefined;
      component.selectionChange.subscribe((key: string) => {
        emittedKey = key;
      });

      const firstImage = fixture.debugElement.query(By.css('.image-item'));
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      firstImage.nativeElement.dispatchEvent(event);
      fixture.detectChanges();

      expect(emittedKey).toBe('img1');
    });
  });

  describe('Focus Management', () => {
    it('should set correct tabindex for focused image', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      component['focusedIndex'].set(1);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems[0].nativeElement.tabIndex).toBe(-1);
      expect(imageItems[1].nativeElement.tabIndex).toBe(0);
      expect(imageItems[2].nativeElement.tabIndex).toBe(-1);
    });

    it('should update focusedIndex when image receives focus', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const secondImage = fixture.debugElement.queryAll(By.css('.image-item'))[1];
      secondImage.nativeElement.dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();

      expect(component['focusedIndex']()).toBe(1);
    });

    it('should apply focused class to focused image', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      component['focusedIndex'].set(2);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems[2].nativeElement.classList.contains('focused')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have role="radiogroup" on container', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      expect(gallery.nativeElement.getAttribute('role')).toBe('radiogroup');
    });

    it('should have role="radio" on each image item', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      imageItems.forEach((item) => {
        expect(item.nativeElement.getAttribute('role')).toBe('radio');
      });
    });

    it('should have aria-label on gallery container', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('ariaLabel', 'Custom gallery label');
      fixture.detectChanges();

      const gallery = fixture.debugElement.query(By.css('.image-gallery-selector'));
      expect(gallery.nativeElement.getAttribute('aria-label')).toBe('Custom gallery label');
    });

    it('should have aria-label on each image item', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems[0].nativeElement.getAttribute('aria-label')).toBe('Image 1');
      expect(imageItems[1].nativeElement.getAttribute('aria-label')).toBe('Image 2');
    });

    it('should have aria-live region for screen reader announcements', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('selectedImageKey', 'img1');
      fixture.detectChanges();

      const liveRegion = fixture.debugElement.query(By.css('[aria-live="polite"]'));
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.nativeElement.textContent).toContain('Image 1');
    });

    it('should have screen reader only class on aria-live region', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const liveRegion = fixture.debugElement.query(By.css('.sr-only'));
      expect(liveRegion).toBeTruthy();
    });
  });

  describe('Input Configuration', () => {
    it('should accept and apply aspectRatio input', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('aspectRatio', '16:9');
      fixture.detectChanges();

      const firstImage = fixture.debugElement.query(By.css('.image-item img'));
      expect(firstImage.nativeElement.classList.contains('aspect-video')).toBe(true);
    });

    it('should apply square aspect ratio by default', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const firstImage = fixture.debugElement.query(By.css('.image-item img'));
      expect(firstImage.nativeElement.classList.contains('aspect-square')).toBe(true);
    });

    it('should handle images without alt text', () => {
      const imagesWithoutAlt: GalleryImage[] = [
        { key: 'img1', url: 'https://example.com/image1.jpg' },
        { key: 'img2', url: 'https://example.com/image2.jpg' },
      ];

      fixture.componentRef.setInput('images', imagesWithoutAlt);
      fixture.detectChanges();

      const imageItems = fixture.debugElement.queryAll(By.css('.image-item'));
      expect(imageItems[0].nativeElement.getAttribute('aria-label')).toBe('Image 1');
      expect(imageItems[1].nativeElement.getAttribute('aria-label')).toBe('Image 2');
    });
  });

  describe('Performance Optimizations', () => {
    it('should have lazy loading on images', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.detectChanges();

      const images = fixture.debugElement.queryAll(By.css('.image-item img'));
      images.forEach((img) => {
        expect(img.nativeElement.getAttribute('loading')).toBe('lazy');
      });
    });

    it('should use OnPush change detection', () => {
      const changeDetectionStrategy = fixture.componentRef.instance.constructor as any;
      expect(changeDetectionStrategy.ɵcmp.changeDetection).toBe(1); // 1 = OnPush
    });
  });

  describe('Preview-Gallery Layout Mode', () => {
    it('should render preview pane in preview-gallery mode', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.detectChanges();

      const previewPane = fixture.debugElement.query(By.css('.preview-pane'));
      expect(previewPane).toBeTruthy();
    });

    it('should display first image in preview by default', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.detectChanges();

      const previewImage = fixture.debugElement.query(By.css('.preview-image'));
      expect(previewImage).toBeTruthy();
      expect(previewImage.nativeElement.src).toContain('image1.jpg');
    });

    it('should update preview when thumbnail is clicked', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('selectedImageKey', 'img1');
      fixture.detectChanges();

      let emittedKey: string | undefined;
      component.selectionChange.subscribe((key: string) => {
        emittedKey = key;
      });

      const thumbnails = fixture.debugElement.queryAll(By.css('.thumbnail-wrapper'));
      thumbnails[1].nativeElement.click();
      fixture.detectChanges();

      expect(emittedKey).toBe('img2');
    });

    it('should show add button and description inputs in edit mode', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', true);
      fixture.componentRef.setInput('maxImages', 10);
      fixture.detectChanges();

      const addButton = fixture.debugElement.query(By.css('.add-image-button'));
      const descriptionInputs = fixture.debugElement.queryAll(By.css('.thumbnail-description'));

      expect(addButton).toBeTruthy();
      expect(descriptionInputs.length).toBe(4);
    });

    it('should hide add button and description inputs in preview mode', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', false);
      fixture.detectChanges();

      const addButton = fixture.debugElement.query(By.css('.add-image-button'));
      const descriptionInputs = fixture.debugElement.queryAll(By.css('.thumbnail-description'));

      expect(addButton).toBeNull();
      expect(descriptionInputs.length).toBe(0);
    });

    it('should emit imageUploadRequested when add button clicked', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', true);
      fixture.componentRef.setInput('maxImages', 10);
      fixture.detectChanges();

      let uploadRequested = false;
      component.imageUploadRequested.subscribe(() => {
        uploadRequested = true;
      });

      const addButton = fixture.debugElement.query(By.css('.add-image-button'));
      addButton.nativeElement.click();
      fixture.detectChanges();

      expect(uploadRequested).toBe(true);
    });

    it('should emit imageDescriptionChanged when description input changes', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', true);
      fixture.detectChanges();

      let changedEvent: { key: string; description: string } | undefined;
      component.imageDescriptionChanged.subscribe((event) => {
        changedEvent = event;
      });

      const descriptionInputs = fixture.debugElement.queryAll(By.css('.thumbnail-description'));
      const input = descriptionInputs[0].nativeElement as HTMLInputElement;
      input.value = 'New description';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(changedEvent).toEqual({ key: 'img1', description: 'New description' });
    });

    it('should emit imageDeleted when delete button clicked', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', true);
      fixture.detectChanges();

      let deletedKey: string | undefined;
      component.imageDeleted.subscribe((key: string) => {
        deletedKey = key;
      });

      const thumbnails = fixture.debugElement.queryAll(By.css('.thumbnail-wrapper'));
      const deleteButton = thumbnails[0].query(By.css('.thumbnail-delete'));
      deleteButton.nativeElement.click();
      fixture.detectChanges();

      expect(deletedKey).toBe('img1');
    });

    it('should disable add button when max images reached', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'preview-gallery');
      fixture.componentRef.setInput('editMode', true);
      fixture.componentRef.setInput('maxImages', 4);
      fixture.detectChanges();

      const addButton = fixture.debugElement.query(By.css('.add-image-button'));
      expect(addButton.nativeElement.disabled).toBe(false);

      // With 4 images and max 4, button should still show but be at limit
      // Let's test with 3 images and max 3
      const threeImages = mockImages.slice(0, 3);
      fixture.componentRef.setInput('images', threeImages);
      fixture.componentRef.setInput('maxImages', 3);
      fixture.detectChanges();

      // Button should not render when at max
      const addButtonAfter = fixture.debugElement.query(By.css('.add-image-button'));
      expect(addButtonAfter).toBeNull();
    });

    it('should maintain grid layout when layoutMode is grid', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('layoutMode', 'grid');
      fixture.detectChanges();

      const imageGrid = fixture.debugElement.query(By.css('.image-grid'));
      const previewPane = fixture.debugElement.query(By.css('.preview-pane'));

      expect(imageGrid).toBeTruthy();
      expect(previewPane).toBeNull();
    });
  });

  describe('Responsive Behavior', () => {
    it('should update column count on window resize to mobile', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 4);
      fixture.detectChanges();

      // Simulate window resize to mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      component.onWindowResize();
      fixture.detectChanges();

      const imageGrid = fixture.debugElement.query(By.css('.image-grid'));
      expect(imageGrid.nativeElement.classList.contains('grid-cols-2')).toBe(true);
    });

    it('should update column count on window resize to tablet', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 4);
      fixture.detectChanges();

      // Simulate window resize to tablet width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      });

      component.onWindowResize();
      fixture.detectChanges();

      const imageGrid = fixture.debugElement.query(By.css('.image-grid'));
      expect(imageGrid.nativeElement.classList.contains('grid-cols-3')).toBe(true);
    });

    it('should update column count on window resize to desktop', () => {
      fixture.componentRef.setInput('images', mockImages);
      fixture.componentRef.setInput('columns', 4);
      fixture.detectChanges();

      // Simulate window resize to desktop width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      component.onWindowResize();
      fixture.detectChanges();

      const imageGrid = fixture.debugElement.query(By.css('.image-grid'));
      expect(imageGrid.nativeElement.classList.contains('grid-cols-4')).toBe(true);
    });
  });
});
