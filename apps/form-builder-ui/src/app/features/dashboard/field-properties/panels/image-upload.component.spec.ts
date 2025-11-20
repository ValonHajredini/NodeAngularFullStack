import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImageUploadComponent } from './image-upload.component';
import { environment } from '@env/environment';

describe('ImageUploadComponent', () => {
  let component: ImageUploadComponent;
  let fixture: ComponentFixture<ImageUploadComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageUploadComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('File Upload', () => {
    beforeEach(() => {
      component.formId = 'test-form-id';
      fixture.detectChanges();
    });

    it('should upload file and emit imageUploaded event', () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: 'https://cdn.example.com/uploads/test.jpg',
          fileName: 'test.jpg',
          size: 12345,
          mimeType: 'image/jpeg',
        },
        timestamp: new Date().toISOString(),
      };
      const expectedUrl = `${environment.apiUrl}/forms/${component.formId}/upload-image`;

      let emittedImageUrl = '';
      component.imageUploaded.subscribe((url: string) => {
        emittedImageUrl = url;
      });

      // Act
      component['uploadFile'](mockFile);

      // Assert HTTP request
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBe(true);

      req.flush(mockResponse);

      // Verify event emitted
      expect(emittedImageUrl).toBe('https://cdn.example.com/uploads/test.jpg');
      expect(component.imageUrl()).toBe('https://cdn.example.com/uploads/test.jpg');
    });

    it('should handle upload error and emit uploadErrorEvent', () => {
      // Arrange
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockError = { error: { message: 'File too large' } };
      const expectedUrl = `${environment.apiUrl}/forms/${component.formId}/upload-image`;

      let emittedError = '';
      component.uploadErrorEvent.subscribe((error: string) => {
        emittedError = error;
      });

      // Act
      component['uploadFile'](mockFile);
      const req = httpMock.expectOne(expectedUrl);
      req.flush(mockError, { status: 400, statusText: 'Bad Request' });

      // Assert
      expect(emittedError).toBe('File too large');
      expect(component['uploadError']()).toBe('File too large');
    });
  });

  describe('Drag and Drop', () => {
    beforeEach(() => {
      component.formId = 'test-form-id';
      fixture.detectChanges();
    });

    it('should handle drag over event', () => {
      // Arrange
      const event = new DragEvent('dragover');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      // Act
      component['onDragOver'](event);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['isDragging']()).toBe(true);
    });

    it('should handle drag leave event', () => {
      // Arrange
      component['isDragging'].set(true);
      const event = new DragEvent('dragleave');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      // Act
      component['onDragLeave'](event);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['isDragging']()).toBe(false);
    });

    it('should handle drop event with valid image file', () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);
      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');
      spyOn<any>(component, 'uploadFile');

      // Act
      component['onDrop'](event);

      // Assert
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['isDragging']()).toBe(false);
      expect(component['uploadFile']).toHaveBeenCalledWith(mockFile);
    });

    it('should reject non-image files on drop', () => {
      // Arrange
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);
      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');
      spyOn<any>(component, 'uploadFile');

      // Act
      component['onDrop'](event);

      // Assert
      expect(component['uploadFile']).not.toHaveBeenCalled();
      expect(component['uploadError']()).toBe('Please upload an image file (JPG, PNG, GIF, WebP)');
    });

    it('should reject files larger than 5MB on drop', () => {
      // Arrange
      const mockFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);
      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');
      spyOn<any>(component, 'uploadFile');

      // Act
      component['onDrop'](event);

      // Assert
      expect(component['uploadFile']).not.toHaveBeenCalled();
      expect(component['uploadError']()).toBe('Image size must be less than 5MB');
    });
  });

  describe('Form ID Validation', () => {
    it('should show error when formId is not set and zone is clicked', () => {
      // Arrange
      component.formId = '';
      fixture.detectChanges();

      // Act
      component['onZoneClick']();

      // Assert
      expect(component['uploadError']()).toContain('Please save the form first');
    });

    it('should show error when formId is not set on drop', () => {
      // Arrange
      component.formId = '';
      fixture.detectChanges();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);
      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');

      // Act
      component['onDrop'](event);

      // Assert
      expect(component['uploadError']()).toContain('Please save the form first');
    });
  });

  describe('Loading States', () => {
    it('should set isUploading to true during upload', () => {
      // Arrange
      component.formId = 'test-form-id';
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Act
      component['uploadFile'](mockFile);

      // Assert
      expect(component['isUploading']()).toBe(true);

      // Cleanup
      const req = httpMock.expectOne(
        `${environment.apiUrl}/forms/${component.formId}/upload-image`,
      );
      req.flush({ data: { imageUrl: 'test.jpg' } });
      expect(component['isUploading']()).toBe(false);
    });
  });
});
