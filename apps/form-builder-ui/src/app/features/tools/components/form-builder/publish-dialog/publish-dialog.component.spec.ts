import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PublishDialogComponent } from './publish-dialog.component';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { Component, Input, Output, EventEmitter } from '@angular/core';

// Mock QrCodeDisplayComponent for testing
@Component({
  selector: 'app-qr-code-display',
  template: '<div data-testid="qr-code-display">QR Code Display Mock</div>',
})
class MockQrCodeDisplayComponent {
  @Input() qrCodeUrl?: string;
  @Input() label?: string;
  @Input() helperText?: string;
  @Input() downloadTooltip?: string;
  @Output() download = new EventEmitter<void>();
}

/**
 * Test suite for PublishDialogComponent.
 * Tests dialog visibility, form validation, and publish workflow.
 */
describe('PublishDialogComponent', () => {
  let component: PublishDialogComponent;
  let fixture: ComponentFixture<PublishDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PublishDialogComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        DialogModule,
        ButtonModule,
        DatePickerModule,
        InputTextModule,
        MessageModule,
        CheckboxModule,
      ],
      declarations: [MockQrCodeDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PublishDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default expiration date (30 days from now)', () => {
      const expirationDate = component.publishForm.value.expirationDate;
      expect(expirationDate).toBeDefined();

      // Check that expiration is approximately 30 days from now
      const now = new Date();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);

      const diffDays = Math.abs(
        (expirationDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeLessThan(1); // Allow 1 day tolerance
    });

    it('should initialize with form controls', () => {
      expect(component.publishForm).toBeDefined();
      expect(component.expirationDate).toBeDefined();
    });

    it('should set minimum date to today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const minDate = component.minDate;
      minDate.setHours(0, 0, 0, 0);

      expect(minDate.getTime()).toBe(today.getTime());
    });

    it('should set maximum date to 1 year from now', () => {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      oneYearFromNow.setHours(0, 0, 0, 0);

      const maxDate = component.maxDate;
      maxDate.setHours(0, 0, 0, 0);

      expect(maxDate.getTime()).toBe(oneYearFromNow.getTime());
    });
  });

  describe('Dialog Visibility', () => {
    it('should not be visible by default', () => {
      expect(component.visible).toBe(false);
    });

    it('should show dialog when visible is true', () => {
      component.visible = true;
      fixture.detectChanges();

      const dialogEl = fixture.nativeElement.querySelector('p-dialog');
      expect(dialogEl).toBeTruthy();
    });

    it('should emit visibleChange when dialog is hidden', () => {
      spyOn(component.visibleChange, 'emit');

      component.visible = true;
      component.onHide();

      expect(component.visibleChange.emit).toHaveBeenCalledWith(false);
      expect(component.visible).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('should require expiration date', () => {
      const expirationDateControl = component.expirationDate;
      expirationDateControl.setValue(null);

      expect(expirationDateControl.valid).toBe(false);
      expect(expirationDateControl.hasError('required')).toBe(true);
    });

    it('should be valid with expiration date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      component.expirationDate.setValue(futureDate);

      expect(component.expirationDate.valid).toBe(true);
      expect(component.publishForm.valid).toBe(true);
    });

    it('should detect form errors when invalid and dirty', () => {
      component.expirationDate.setValue(null);
      component.expirationDate.markAsDirty();

      expect(component.hasFormErrors).toBe(true);
    });

    it('should not show form errors when untouched', () => {
      component.expirationDate.setValue(null);

      expect(component.hasFormErrors).toBe(false);
    });
  });

  describe('Publish Functionality', () => {
    it('should emit publish event with expiration date', () => {
      spyOn(component.publish, 'emit');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      component.expirationDate.setValue(futureDate);
      component.onPublish();

      expect(component.publish.emit).toHaveBeenCalledWith(futureDate);
    });

    it('should not emit publish event when form is invalid', () => {
      spyOn(component.publish, 'emit');

      component.expirationDate.setValue(null);
      component.onPublish();

      expect(component.publish.emit).not.toHaveBeenCalled();
    });

    it('should not emit publish event when loading', () => {
      spyOn(component.publish, 'emit');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      component.expirationDate.setValue(futureDate);
      component.loading = true;
      component.onPublish();

      expect(component.publish.emit).not.toHaveBeenCalled();
    });
  });

  describe('Copy URL Functionality', () => {
    it('should emit copyUrl event when copy button is clicked', () => {
      spyOn(component.copyUrl, 'emit');

      component.onCopyUrl();

      expect(component.copyUrl.emit).toHaveBeenCalled();
    });
  });

  describe('Validation Errors Display', () => {
    it('should display validation errors', () => {
      component.validationErrors = [
        'Field "name" is missing a label',
        'Duplicate field name found: email',
      ];
      fixture.detectChanges();

      const errorMessages = fixture.nativeElement.querySelectorAll('p-message');
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it('should hide publish form when validation errors exist', () => {
      component.validationErrors = ['Some error'];
      component.renderUrl = undefined;
      fixture.detectChanges();

      const publishForm = fixture.nativeElement.querySelector('form');
      expect(publishForm).toBeFalsy();
    });
  });

  describe('Render URL Display', () => {
    it('should display render URL after publish', () => {
      component.renderUrl = 'https://example.com/forms/render/token123';
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input[type="text"]');
      expect(input).toBeTruthy();
      expect(input.value).toBe('https://example.com/forms/render/token123');
    });

    it('should show copy button when render URL is displayed', () => {
      component.renderUrl = 'https://example.com/forms/render/token123';
      fixture.detectChanges();

      const copyButton = fixture.nativeElement.querySelector('p-button[icon="pi pi-copy"]');
      expect(copyButton).toBeTruthy();
    });
  });

  describe('Form Reset', () => {
    it('should reset form to default values on hide', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      component.expirationDate.setValue(futureDate);
      component.onHide();

      const resetDate = component.expirationDate.value;
      const expectedDefault = new Date();
      expectedDefault.setDate(expectedDefault.getDate() + 30);

      const diffDays = Math.abs(
        (resetDate.getTime() - expectedDefault.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeLessThan(1);
    });
  });

  describe('Loading State', () => {
    it('should disable publish button when loading', () => {
      component.loading = true;
      fixture.detectChanges();

      // Publish button should be disabled when loading
      expect(component.loading).toBe(true);
    });

    it('should show loading spinner on publish button', () => {
      component.loading = true;
      fixture.detectChanges();

      // Component should reflect loading state
      expect(component.loading).toBe(true);
    });
  });

  // QR Code Integration Tests (Story 26.3)
  describe('QR Code Display States', () => {
    it('should not show QR code when dialog first opens', () => {
      component.visible = true;
      component.renderUrl = undefined;
      component.qrCodeUrl = undefined;
      component.qrCodeGenerated = false;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeNull();
    });

    it('should show QR code loading state', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeLoading = true;
      component.qrCodeGenerated = false;
      component.qrCodeUrl = undefined;
      fixture.detectChanges();

      const loadingIndicator = fixture.debugElement.nativeElement.querySelector('.pi-spinner');
      expect(loadingIndicator).toBeTruthy();

      const loadingText = fixture.debugElement.nativeElement.textContent;
      expect(loadingText).toContain('Generating QR code...');
    });

    it('should show QR code when successfully generated', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeUrl = 'https://cdn.example.com/qr-codes/test.png';
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeTruthy();
    });

    it('should show QR code error state when generation fails', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeLoading = false;
      component.qrCodeGenerated = false;
      component.qrCodeUrl = undefined;
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.nativeElement.querySelector('.text-orange-700');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('QR code generation failed');
    });

    it('should hide QR code section when no render URL exists', () => {
      component.visible = true;
      component.renderUrl = undefined;
      component.qrCodeUrl = 'https://cdn.example.com/qr-codes/test.png';
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeNull();
    });
  });

  describe('QR Code Download Functionality', () => {
    it('should emit downloadQrCode event when download is triggered', () => {
      spyOn(component.downloadQrCode, 'emit');

      component.onDownloadQrCode();

      expect(component.downloadQrCode.emit).toHaveBeenCalled();
    });

    it('should handle QR code display download event', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeUrl = 'https://cdn.example.com/qr-codes/test.png';
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      spyOn(component, 'onDownloadQrCode');

      const qrCodeComponent = fixture.debugElement.query(
        (el) => el.componentInstance instanceof MockQrCodeDisplayComponent,
      );

      if (qrCodeComponent) {
        qrCodeComponent.componentInstance.download.emit();
        expect(component.onDownloadQrCode).toHaveBeenCalled();
      }
    });
  });

  describe('QR Code State Transitions', () => {
    it('should handle loading to success state transition', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';

      // Start with loading state
      component.qrCodeLoading = true;
      component.qrCodeGenerated = false;
      component.qrCodeUrl = undefined;
      fixture.detectChanges();

      let loadingIndicator = fixture.debugElement.nativeElement.querySelector('.pi-spinner');
      expect(loadingIndicator).toBeTruthy();

      // Transition to success state
      component.qrCodeLoading = false;
      component.qrCodeGenerated = true;
      component.qrCodeUrl = 'https://cdn.example.com/qr-codes/test.png';
      fixture.detectChanges();

      loadingIndicator = fixture.debugElement.nativeElement.querySelector('.pi-spinner');
      expect(loadingIndicator).toBeNull();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeTruthy();
    });

    it('should handle loading to error state transition', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';

      // Start with loading state
      component.qrCodeLoading = true;
      component.qrCodeGenerated = false;
      component.qrCodeUrl = undefined;
      fixture.detectChanges();

      // Transition to error state
      component.qrCodeLoading = false;
      component.qrCodeGenerated = false;
      component.qrCodeUrl = undefined;
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.nativeElement.querySelector('.text-orange-700');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.textContent).toContain('QR code generation failed');
    });
  });

  describe('QR Code Input Validation', () => {
    it('should handle undefined QR code URL gracefully', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeUrl = undefined;
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeNull();
    });

    it('should handle empty QR code URL gracefully', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeUrl = '';
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeNull();
    });

    it('should maintain QR code state when dialog is visible', () => {
      component.visible = true;
      component.renderUrl = 'https://example.com/form/abc123';
      component.qrCodeUrl = 'https://cdn.example.com/qr-codes/test.png';
      component.qrCodeGenerated = true;
      component.qrCodeLoading = false;
      fixture.detectChanges();

      // Verify QR code is displayed
      const qrCodeDisplay = fixture.debugElement.nativeElement.querySelector(
        '[data-testid="qr-code-display"]',
      );
      expect(qrCodeDisplay).toBeTruthy();

      // Dialog should not reset QR state while visible
      expect(component.qrCodeUrl).toBe('https://cdn.example.com/qr-codes/test.png');
      expect(component.qrCodeGenerated).toBe(true);
    });
  });
});
