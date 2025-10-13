import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FilePropertiesPanelComponent } from './file-properties-panel.component';
import { FormField, FormFieldType, FormFieldValidation } from '@nodeangularfullstack/shared';

describe('FilePropertiesPanelComponent', () => {
  let component: FilePropertiesPanelComponent;
  let fixture: ComponentFixture<FilePropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePropertiesPanelComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePropertiesPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when validation is empty', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'resume',
        label: 'Upload Resume',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value).toEqual({
        acceptedTypes: '',
        maxFileSize: 10,
      });
    });

    it('should load existing validation values into form', () => {
      // Arrange
      const validation: FormFieldValidation = {
        acceptedFileTypes: ['image/*', 'application/pdf', '.docx'],
        maxFileSize: 5 * 1024 * 1024, // 5MB in bytes
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'resume',
        label: 'Upload Resume',
        required: false,
        order: 0,
        validation,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.acceptedTypes).toBe('image/*, application/pdf, .docx');
      expect(component['form'].value.maxFileSize).toBe(5);
    });

    it('should convert bytes to MB correctly', () => {
      // Arrange
      const validation: FormFieldValidation = {
        maxFileSize: 10485760, // 10MB in bytes
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
        validation,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.maxFileSize).toBe(10);
    });
  });

  describe('Field Change Emission', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should emit fieldChange when acceptedTypes changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['image/*', '.pdf']);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: 'image/*, .pdf' });
    });

    it('should emit fieldChange when maxFileSize changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert - should be in bytes
        expect(updatedField.validation?.maxFileSize).toBe(20 * 1024 * 1024);
        done();
      });

      // Act
      component['form'].patchValue({ maxFileSize: 20 });
    });
  });

  describe('File Type Parsing', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should parse comma-separated file types correctly', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toEqual([
          'image/*',
          'application/pdf',
          '.docx',
          '.xlsx',
        ]);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: 'image/*, application/pdf, .docx, .xlsx' });
    });

    it('should trim whitespace from file types', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['.pdf', 'image/*', '.zip']);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '  .pdf  ,  image/*  ,  .zip  ' });
    });

    it('should filter out empty strings from file types', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['.pdf', '.docx']);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '.pdf, , .docx' });
    });

    it('should delete acceptedFileTypes when empty', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '' });
    });
  });

  describe('File Size Handling', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should convert MB to bytes correctly', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert - 1MB = 1048576 bytes
        expect(updatedField.validation?.maxFileSize).toBe(1048576);
        done();
      });

      // Act
      component['form'].patchValue({ maxFileSize: 1 });
    });

    it('should convert large MB values to bytes correctly', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert - 100MB = 104857600 bytes
        expect(updatedField.validation?.maxFileSize).toBe(104857600);
        done();
      });

      // Act
      component['form'].patchValue({ maxFileSize: 100 });
    });

    it('should delete maxFileSize when zero or empty', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.maxFileSize).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ maxFileSize: 0 });
    });

    it('should handle decimal MB values', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert - 2.5MB = 2621440 bytes
        expect(updatedField.validation?.maxFileSize).toBe(2621440);
        done();
      });

      // Act
      component['form'].patchValue({ maxFileSize: 2.5 });
    });
  });

  describe('Validation Object Handling', () => {
    it('should preserve existing validation properties', (done) => {
      // Arrange
      const validation: FormFieldValidation = {
        minLength: 5,
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
        validation,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert - existing validation should be preserved
        expect(updatedField.validation?.minLength).toBe(5);
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['.pdf']);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '.pdf' });
    });

    it('should delete validation object when all properties are undefined', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '', maxFileSize: 0 });
    });

    it('should keep validation object when at least one property exists', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation).toBeDefined();
        expect(updatedField.validation?.maxFileSize).toBe(5242880);
        expect(updatedField.validation?.acceptedFileTypes).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: '', maxFileSize: 5 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle field without validation property', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
        // No validation property
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['form'].value.acceptedTypes).toBe('');
      expect(component['form'].value.maxFileSize).toBe(10);
    });

    it('should handle validation with empty acceptedFileTypes array', () => {
      // Arrange
      const validation: FormFieldValidation = {
        acceptedFileTypes: [],
        maxFileSize: 10485760,
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
        validation,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.acceptedTypes).toBe('');
    });

    it('should handle single file type', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['image/*']);
        done();
      });

      // Act
      component['form'].patchValue({ acceptedTypes: 'image/*' });
    });

    it('should handle rapid form value changes', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      let emitCount = 0;
      component.fieldChange.subscribe(() => {
        emitCount++;
      });

      // Act - rapid changes
      component['form'].patchValue({ maxFileSize: 5 });
      component['form'].patchValue({ maxFileSize: 10 });
      component['form'].patchValue({ maxFileSize: 15 });

      // Assert
      expect(emitCount).toBe(3);
    });
  });

  describe('Field Emission Format', () => {
    it('should emit field with correct structure', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.FILE,
        fieldName: 'fileUpload',
        label: 'Upload File',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect(updatedField.id).toBe('field-1');
        expect(updatedField.type).toBe(FormFieldType.FILE);
        expect(updatedField.label).toBe('Upload File');
        expect(updatedField.validation).toBeDefined();
        expect(updatedField.validation?.acceptedFileTypes).toEqual(['.pdf', '.docx']);
        expect(updatedField.validation?.maxFileSize).toBe(5242880);
        done();
      });

      // Act
      component['form'].patchValue({
        acceptedTypes: '.pdf, .docx',
        maxFileSize: 5,
      });
    });
  });
});
