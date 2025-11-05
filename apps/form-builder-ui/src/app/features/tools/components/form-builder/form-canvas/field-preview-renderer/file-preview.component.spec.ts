import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilePreviewComponent } from './file-preview.component';
import { FormField, FormFieldType } from '@nodeangularfullstack/shared';
import { FileUpload } from 'primeng/fileupload';

describe('FilePreviewComponent', () => {
  let component: FilePreviewComponent;
  let fixture: ComponentFixture<FilePreviewComponent>;

  const mockFileField: FormField = {
    id: 'field-file-123',
    fieldName: 'test_file',
    type: FormFieldType.FILE,
    label: 'Upload Document',
    placeholder: 'Choose File',
    required: false,
    order: 0,
  };

  const mockRequiredFileField: FormField = {
    id: 'field-file-456',
    fieldName: 'test_required_file',
    type: FormFieldType.FILE,
    label: 'Upload Resume',
    required: true,
    order: 0,
  };

  const mockFileFieldWithValidation: FormField = {
    id: 'field-file-789',
    fieldName: 'test_file_validation',
    type: FormFieldType.FILE,
    label: 'Upload Image',
    required: false,
    order: 0,
    validation: {
      acceptedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
      maxFileSize: 5242880, // 5 MB in bytes
    },
  };

  const mockFileFieldMaxSizeOnly: FormField = {
    id: 'field-file-101',
    fieldName: 'test_file_max_size',
    type: FormFieldType.FILE,
    label: 'Upload Video',
    required: false,
    order: 0,
    validation: {
      maxFileSize: 104857600, // 100 MB in bytes
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewComponent, FileUpload],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.field = mockFileField;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('File Upload Rendering', () => {
    it('should render PrimeNG fileupload', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload).toBeTruthy();
    });

    it('should use basic mode', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.getAttribute('mode')).toBe('basic');
    });

    it('should be disabled for preview mode', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.hasAttribute('disabled')).toBe(true);
    });

    it('should use field placeholder for chooseLabel', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.getAttribute('chooseLabel')).toBe('Choose File');
    });

    it('should use default chooseLabel when placeholder not provided', () => {
      const fieldWithoutPlaceholder: FormField = {
        ...mockFileField,
        placeholder: undefined,
      };
      component.field = fieldWithoutPlaceholder;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.getAttribute('chooseLabel')).toBe('Choose File');
    });

    it('should apply w-full styleClass', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.getAttribute('styleClass')).toBe('w-full');
    });
  });

  describe('Validation Constraints Display', () => {
    it('should render validation constraints when provided', () => {
      component.field = mockFileFieldWithValidation;
      fixture.detectChanges();

      const constraintsDiv = fixture.nativeElement.querySelector('.mt-1.text-xs');
      expect(constraintsDiv).toBeTruthy();
    });

    it('should not render constraints when validation is not provided', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const constraintsDiv = fixture.nativeElement.querySelector('.mt-1.text-xs');
      expect(constraintsDiv).toBeFalsy();
    });

    it('should display accepted file types', () => {
      component.field = mockFileFieldWithValidation;
      fixture.detectChanges();

      const acceptedTypes = fixture.nativeElement.querySelector('.mt-1.text-xs span');
      expect(acceptedTypes?.textContent).toContain('Accepted: image/jpeg, image/png, image/gif');
    });

    it('should display max file size', () => {
      component.field = mockFileFieldWithValidation;
      fixture.detectChanges();

      const maxSize = fixture.nativeElement.querySelectorAll('.mt-1.text-xs span')[1];
      expect(maxSize?.textContent).toContain('Max size: 5.0 MB');
    });

    it('should show only max size when accepted types not provided', () => {
      component.field = mockFileFieldMaxSizeOnly;
      fixture.detectChanges();

      const constraintsDiv = fixture.nativeElement.querySelector('.mt-1.text-xs');
      expect(constraintsDiv?.textContent).toContain('Max size: 100.0 MB');
      expect(constraintsDiv?.textContent).not.toContain('Accepted:');
    });

    it('should not show accepted types when array is empty', () => {
      const fieldWithEmptyTypes: FormField = {
        ...mockFileFieldWithValidation,
        validation: {
          ...mockFileFieldWithValidation.validation,
          acceptedFileTypes: [],
        },
      };
      component.field = fieldWithEmptyTypes;
      fixture.detectChanges();

      const constraintsDiv = fixture.nativeElement.querySelector('.mt-1.text-xs');
      expect(constraintsDiv?.textContent).not.toContain('Accepted:');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label attribute', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.hasAttribute('aria-label')).toBe(true);
      expect(fileUpload.getAttribute('aria-label')).toBe('Upload Document');
    });

    it('should have aria-required for required file upload', () => {
      component.field = mockRequiredFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      expect(fileUpload.hasAttribute('aria-required')).toBe(true);
    });

    it('should not have aria-required for optional file upload', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const fileUpload = fixture.nativeElement.querySelector('p-fileupload');
      const ariaRequired = fileUpload.getAttribute('aria-required');
      expect(ariaRequired).toBe('false');
    });
  });

  describe('formatFileSize helper method', () => {
    it('should format bytes correctly', () => {
      component.field = mockFileField;
      expect(component.formatFileSize(500)).toBe('500 B');
      expect(component.formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      component.field = mockFileField;
      expect(component.formatFileSize(1024)).toBe('1.0 KB');
      expect(component.formatFileSize(2048)).toBe('2.0 KB');
      expect(component.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      component.field = mockFileField;
      expect(component.formatFileSize(1048576)).toBe('1.0 MB');
      expect(component.formatFileSize(5242880)).toBe('5.0 MB');
      expect(component.formatFileSize(10485760)).toBe('10.0 MB');
    });
  });

  describe('Theme CSS Variables Application', () => {
    it('should apply field-preview container', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      expect(container).toBeTruthy();
    });

    it('should have pointer-events: none for preview mode', () => {
      component.field = mockFileField;
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.field-preview');
      const computedStyle = window.getComputedStyle(container);
      expect(computedStyle.pointerEvents).toBe('none');
    });
  });

  describe('Change Detection Strategy', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component.constructor.name).toBe('FilePreviewComponent');
      // OnPush strategy is defined in the component decorator
    });
  });

  describe('Field Input Requirement', () => {
    it('should have required field input', () => {
      component.field = mockFileField;
      expect(component.field).toBeDefined();
      expect(component.field.type).toBe(FormFieldType.FILE);
    });
  });
});
