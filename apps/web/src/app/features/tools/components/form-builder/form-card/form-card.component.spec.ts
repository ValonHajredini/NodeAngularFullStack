import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormCardComponent } from './form-card.component';
import { FormMetadata, FormStatus } from '@nodeangularfullstack/shared';
import { QrCodeThumbnailAction } from '../qr-code-thumbnail/qr-code-thumbnail.component';

describe('FormCardComponent', () => {
  let component: FormCardComponent;
  let fixture: ComponentFixture<FormCardComponent>;

  const mockForm: FormMetadata = {
    id: 'test-id',
    userId: 'user-id',
    title: 'Test Form',
    description: 'Test Description',
    status: FormStatus.DRAFT,
    createdAt: new Date('2025-10-06'),
    updatedAt: new Date('2025-10-06'),
    schema: {
      id: 'schema-id',
      formId: 'test-id',
      version: 1,
      fields: [],
      settings: {
        layout: {
          columns: 1,
          spacing: 'medium',
        },
        submission: {
          showSuccessMessage: true,
          successMessage: 'Thank you!',
          allowMultipleSubmissions: true,
        },
      },
      isPublished: false,
      createdAt: new Date('2025-10-06'),
      updatedAt: new Date('2025-10-06'),
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCardComponent);
    component = fixture.componentInstance;
    component.form = mockForm;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display form title and description', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Test Form');
    expect(compiled.textContent).toContain('Test Description');
  });

  it('should emit edit action when edit button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onEdit();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'edit', formId: 'test-id' });
  });

  it('should emit analytics action when analytics button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onAnalytics();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'analytics', formId: 'test-id' });
  });

  it('should emit delete action when delete button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onDelete();
    expect(component.action.emit).toHaveBeenCalledWith({ type: 'delete', formId: 'test-id' });
  });

  it('should emit copy-url action when copy button is clicked', () => {
    spyOn(component.action, 'emit');
    component.onCopyUrl('test-token');
    expect(component.action.emit).toHaveBeenCalledWith({
      type: 'copy-url',
      formId: 'test-id',
      renderToken: 'test-token',
    });
  });

  it('should show draft badge for draft forms', () => {
    component.form = { ...mockForm, status: FormStatus.DRAFT };
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Draft');
  });

  it('should show published badge for published forms', () => {
    component.form = { ...mockForm, status: FormStatus.PUBLISHED };
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Published');
  });

  it('should generate correct publish URL', () => {
    const url = component.getPublishUrl('test-token');
    expect(url).toContain('/forms/render/test-token');
  });

  describe('QR Code Functionality', () => {
    it('should not display QR code section for draft forms', () => {
      component.form = { ...mockForm, status: FormStatus.DRAFT };
      fixture.detectChanges();

      const qrThumbnail = fixture.debugElement.query(By.css('app-qr-code-thumbnail'));
      expect(qrThumbnail).toBeFalsy();
    });

    it('should not display QR code section for published forms without QR code URL', () => {
      component.form = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        schema: {
          ...mockForm.schema!,
          renderToken: 'test-token',
        },
      };
      fixture.detectChanges();

      const qrThumbnail = fixture.debugElement.query(By.css('app-qr-code-thumbnail'));
      expect(qrThumbnail).toBeFalsy();
    });

    it('should display QR code thumbnail for published forms with QR code URL', () => {
      component.form = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: 'https://example.com/qr-code.png',
        schema: {
          ...mockForm.schema!,
          renderToken: 'test-token',
        },
      };
      fixture.detectChanges();

      const qrThumbnail = fixture.debugElement.query(By.css('app-qr-code-thumbnail'));
      expect(qrThumbnail).toBeTruthy();
    });

    it('should pass correct props to QR code thumbnail', () => {
      const testQrUrl = 'https://example.com/qr-code.png';
      component.form = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: testQrUrl,
        schema: {
          ...mockForm.schema!,
          renderToken: 'test-token',
        },
      };
      fixture.detectChanges();

      const qrThumbnail = fixture.debugElement.query(By.css('app-qr-code-thumbnail'));
      const qrComponent = qrThumbnail.componentInstance;

      expect(qrComponent.qrCodeUrl).toBe(testQrUrl);
      expect(qrComponent.formTitle).toBe('Test Form');
    });

    it('should emit view-qr action when QR code thumbnail is clicked', () => {
      const testQrUrl = 'https://example.com/qr-code.png';
      const mockAction: QrCodeThumbnailAction = {
        type: 'view',
        qrCodeUrl: testQrUrl,
        formTitle: 'Test Form',
      };

      spyOn(component.action, 'emit');
      component.onQrCodeThumbnailClick(mockAction);

      expect(component.action.emit).toHaveBeenCalledWith({
        type: 'view-qr',
        formId: 'test-id',
        qrCodeUrl: testQrUrl,
        formTitle: 'Test Form',
      });
    });

    it('should layout QR code thumbnail correctly with URL input and copy button', () => {
      component.form = {
        ...mockForm,
        status: FormStatus.PUBLISHED,
        qrCodeUrl: 'https://example.com/qr-code.png',
        schema: {
          ...mockForm.schema!,
          renderToken: 'test-token',
        },
      };
      fixture.detectChanges();

      const urlContainer = fixture.debugElement.query(By.css('.flex.gap-2.items-center'));
      expect(urlContainer).toBeTruthy();

      const urlInput = urlContainer.query(By.css('input[pInputText]'));
      const copyButton = urlContainer.query(By.css('button[icon="pi pi-copy"]'));
      const qrThumbnail = urlContainer.query(By.css('app-qr-code-thumbnail'));

      expect(urlInput).toBeTruthy();
      expect(copyButton).toBeTruthy();
      expect(qrThumbnail).toBeTruthy();

      // Verify flex classes for proper layout
      expect(urlInput.nativeElement.classList).toContain('flex-1');
    });
  });
});
