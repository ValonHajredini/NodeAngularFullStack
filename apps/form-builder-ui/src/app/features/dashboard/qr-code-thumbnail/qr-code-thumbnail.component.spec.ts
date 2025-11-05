import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { QrCodeThumbnailComponent, QrCodeThumbnailAction } from './qr-code-thumbnail.component';

describe('QrCodeThumbnailComponent', () => {
  let component: QrCodeThumbnailComponent;
  let fixture: ComponentFixture<QrCodeThumbnailComponent>;

  const mockQrCodeUrl = 'https://example.com/qr-code.png';
  const mockFormTitle = 'Test Form';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrCodeThumbnailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrCodeThumbnailComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.imageError()).toBe(false);
    });
  });

  describe('QR Code Display', () => {
    it('should display QR code image when URL is provided', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      expect(img).toBeTruthy();
      expect(img.nativeElement.src).toBe(mockQrCodeUrl);
      expect(img.nativeElement.alt).toBe('QR code for Test Form');
    });

    it('should display placeholder when QR code URL is not provided', () => {
      component.qrCodeUrl = '';
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      const placeholder = fixture.debugElement.query(By.css('.qr-thumbnail i.pi-qrcode'));

      expect(img).toBeFalsy();
      expect(placeholder).toBeTruthy();
    });

    it('should display placeholder when image error occurs', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      component.imageError.set(true);
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      const placeholder = fixture.debugElement.query(By.css('.qr-thumbnail i.pi-qrcode'));

      expect(img).toBeFalsy();
      expect(placeholder).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle image load errors', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      img.nativeElement.dispatchEvent(new Event('error'));

      expect(component.imageError()).toBe(true);
    });

    it('should show placeholder after image error', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      // Trigger image error
      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      img.nativeElement.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      const placeholder = fixture.debugElement.query(By.css('.qr-thumbnail i.pi-qrcode'));
      expect(placeholder).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should emit thumbnailClick event when clicked', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      let emittedAction: QrCodeThumbnailAction | undefined;
      component.thumbnailClick.subscribe((action: QrCodeThumbnailAction) => {
        emittedAction = action;
      });

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      container.nativeElement.click();

      expect(emittedAction).toEqual({
        type: 'view',
        qrCodeUrl: mockQrCodeUrl,
        formTitle: mockFormTitle,
      });
    });

    it('should emit thumbnailClick when called programmatically', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;

      let emittedAction: QrCodeThumbnailAction | undefined;
      component.thumbnailClick.subscribe((action: QrCodeThumbnailAction) => {
        emittedAction = action;
      });

      component.onThumbnailClick();

      expect(emittedAction).toEqual({
        type: 'view',
        qrCodeUrl: mockQrCodeUrl,
        formTitle: mockFormTitle,
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide appropriate alt text for QR code image', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      expect(img.nativeElement.alt).toBe('QR code for Test Form');
      expect(img.nativeElement.getAttribute('aria-hidden')).toBe('true');
    });

    it('should provide appropriate aria-label for container', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      expect(container.nativeElement.getAttribute('aria-label')).toBe(
        'QR code for form: Test Form. Click to view full size.',
      );
    });

    it('should provide unavailable aria-label when QR code is missing', () => {
      component.qrCodeUrl = '';
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      expect(container.nativeElement.getAttribute('aria-label')).toBe(
        'QR code unavailable for form: Test Form',
      );
    });

    it('should have proper ARIA attributes for button role', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      expect(container.nativeElement.getAttribute('role')).toBe('button');
      expect(container.nativeElement.getAttribute('tabindex')).toBe('0');
    });

    it('should have lazy loading attribute', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      expect(img.nativeElement.loading).toBe('lazy');
    });

    it('should handle keyboard navigation (Enter key)', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      let emittedAction: QrCodeThumbnailAction | undefined;
      component.thumbnailClick.subscribe((action: QrCodeThumbnailAction) => {
        emittedAction = action;
      });

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      container.nativeElement.dispatchEvent(enterEvent);

      expect(emittedAction).toEqual({
        type: 'view',
        qrCodeUrl: mockQrCodeUrl,
        formTitle: mockFormTitle,
      });
    });

    it('should handle keyboard navigation (Space key)', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      let emittedAction: QrCodeThumbnailAction | undefined;
      component.thumbnailClick.subscribe((action: QrCodeThumbnailAction) => {
        emittedAction = action;
      });

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      container.nativeElement.dispatchEvent(spaceEvent);

      expect(emittedAction).toEqual({
        type: 'view',
        qrCodeUrl: mockQrCodeUrl,
        formTitle: mockFormTitle,
      });
    });
  });

  describe('Tooltip Text', () => {
    it('should return appropriate tooltip for valid QR code', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      component.imageError.set(false);

      const tooltip = component.getTooltipText();
      expect(tooltip).toBe('Click to view QR code for Test Form');
    });

    it('should return unavailable tooltip for missing QR code', () => {
      component.qrCodeUrl = '';
      component.formTitle = mockFormTitle;

      const tooltip = component.getTooltipText();
      expect(tooltip).toBe('QR code unavailable');
    });

    it('should return unavailable tooltip for image error', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      component.imageError.set(true);

      const tooltip = component.getTooltipText();
      expect(tooltip).toBe('QR code unavailable');
    });
  });

  describe('ARIA Label', () => {
    it('should return appropriate ARIA label for valid QR code', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      component.imageError.set(false);

      const ariaLabel = component.getAriaLabel();
      expect(ariaLabel).toBe('QR code for form: Test Form. Click to view full size.');
    });

    it('should return unavailable ARIA label for missing QR code', () => {
      component.qrCodeUrl = '';
      component.formTitle = mockFormTitle;

      const ariaLabel = component.getAriaLabel();
      expect(ariaLabel).toBe('QR code unavailable for form: Test Form');
    });

    it('should return unavailable ARIA label for image error', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      component.imageError.set(true);

      const ariaLabel = component.getAriaLabel();
      expect(ariaLabel).toBe('QR code unavailable for form: Test Form');
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply correct CSS classes to container', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.css('.qr-thumbnail-container'));
      expect(container.nativeElement.classList).toContain('relative');
      expect(container.nativeElement.classList).toContain('group');
      expect(container.nativeElement.classList).toContain('cursor-pointer');
    });

    it('should apply correct CSS classes to QR code image', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const img = fixture.debugElement.query(By.css('img.qr-thumbnail'));
      expect(img.nativeElement.classList).toContain('w-16');
      expect(img.nativeElement.classList).toContain('h-16');
      expect(img.nativeElement.classList).toContain('border');
      expect(img.nativeElement.classList).toContain('border-gray-200');
      expect(img.nativeElement.classList).toContain('rounded');
      expect(img.nativeElement.classList).toContain('object-contain');
      expect(img.nativeElement.classList).toContain('bg-white');
    });

    it('should apply correct CSS classes to placeholder', () => {
      component.qrCodeUrl = '';
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const placeholder = fixture.debugElement.query(By.css('.qr-thumbnail'));
      expect(placeholder.nativeElement.classList).toContain('w-16');
      expect(placeholder.nativeElement.classList).toContain('h-16');
      expect(placeholder.nativeElement.classList).toContain('border');
      expect(placeholder.nativeElement.classList).toContain('border-gray-200');
      expect(placeholder.nativeElement.classList).toContain('rounded');
      expect(placeholder.nativeElement.classList).toContain('bg-gray-50');
    });

    it('should have hover overlay element', () => {
      component.qrCodeUrl = mockQrCodeUrl;
      component.formTitle = mockFormTitle;
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(By.css('.qr-overlay'));
      expect(overlay).toBeTruthy();
      expect(overlay.nativeElement.classList).toContain('absolute');
      expect(overlay.nativeElement.classList).toContain('inset-0');
      expect(overlay.nativeElement.classList).toContain('opacity-0');
      expect(overlay.nativeElement.classList).toContain('group-hover:opacity-100');
    });
  });
});
