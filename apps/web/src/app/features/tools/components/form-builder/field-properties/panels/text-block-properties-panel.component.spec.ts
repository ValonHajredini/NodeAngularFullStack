import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TextBlockPropertiesPanelComponent } from './text-block-properties-panel.component';
import { FormField, FormFieldType, TextBlockMetadata } from '@nodeangularfullstack/shared';

describe('TextBlockPropertiesPanelComponent', () => {
  let component: TextBlockPropertiesPanelComponent;
  let fixture: ComponentFixture<TextBlockPropertiesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextBlockPropertiesPanelComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TextBlockPropertiesPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values when metadata is empty', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'instructions',
        label: 'Instructions',
        required: false,
        order: 0,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value).toEqual({
        content: '<p>Add your instructions here...</p>',
        alignment: 'left',
        backgroundColor: '',
        padding: 'medium',
        collapsible: false,
        collapsed: false,
      });
    });

    it('should load existing metadata values into form', () => {
      // Arrange
      const metadata: TextBlockMetadata = {
        content: '<p>Test content with <strong>bold</strong> text</p>',
        alignment: 'center',
        backgroundColor: '#F0F0F0',
        padding: 'large',
        collapsible: true,
        collapsed: true,
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'instructions',
        label: 'Instructions',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.content).toBe(
        '<p>Test content with <strong>bold</strong> text</p>',
      );
      expect(component['form'].value.alignment).toBe('center');
      expect(component['form'].value.backgroundColor).toBe('#F0F0F0');
      expect(component['form'].value.padding).toBe('large');
      expect(component['form'].value.collapsible).toBe(true);
      expect(component['form'].value.collapsed).toBe(true);
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should require content field', () => {
      // Act
      component['form'].get('content')?.setValue('');

      // Assert
      expect(component['form'].get('content')?.valid).toBe(false);
      expect(component['form'].get('content')?.hasError('required')).toBe(true);
    });

    it('should enforce max length of 5000 characters for content', () => {
      // Arrange
      const longContent = 'a'.repeat(5001);

      // Act
      component['form'].get('content')?.setValue(longContent);

      // Assert
      expect(component['form'].get('content')?.hasError('maxlength')).toBe(true);
    });

    it('should accept content with exactly 5000 characters', () => {
      // Arrange
      const maxContent = 'a'.repeat(5000);

      // Act
      component['form'].get('content')?.setValue(maxContent);

      // Assert
      expect(component['form'].get('content')?.valid).toBe(true);
    });

    it('should validate form as valid when content is provided', () => {
      // Act
      component['form'].get('content')?.setValue('<p>Valid content</p>');

      // Assert
      expect(component['form'].valid).toBe(true);
    });
  });

  describe('Field Change Emission', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should emit fieldChange when content changes and form is valid', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).content).toBe('<p>Updated content</p>');
        done();
      });

      // Act
      component['form'].patchValue({ content: '<p>Updated content</p>' });
    });

    it('should emit fieldChange when alignment changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).alignment).toBe('justify');
        done();
      });

      // Act
      component['form'].patchValue({ alignment: 'justify' });
    });

    it('should emit fieldChange when backgroundColor changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).backgroundColor).toBe('#FFFF00');
        done();
      });

      // Act
      component['form'].patchValue({ backgroundColor: '#FFFF00' });
    });

    it('should emit fieldChange when padding changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).padding).toBe('small');
        done();
      });

      // Act
      component['form'].patchValue({ padding: 'small' });
    });

    it('should emit fieldChange when collapsible changes', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).collapsible).toBe(true);
        done();
      });

      // Act
      component['form'].patchValue({ collapsible: true });
    });

    it('should NOT emit fieldChange when form is invalid', () => {
      // Arrange
      let emitCount = 0;
      component.fieldChange.subscribe(() => {
        emitCount++;
      });

      // Act - set content to empty (invalid)
      component['form'].patchValue({ content: '' });

      // Wait a bit to ensure no emission
      setTimeout(() => {
        expect(emitCount).toBe(0);
      }, 100);
    });
  });

  describe('Metadata Persistence', () => {
    it('should preserve customStyle when emitting field changes', (done) => {
      // Arrange
      const metadata: TextBlockMetadata = {
        content: '<p>Test</p>',
        alignment: 'left',
        customStyle: 'border-left: 4px solid #0066cc; padding-left: 12px;',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).customStyle).toBe(
          'border-left: 4px solid #0066cc; padding-left: 12px;',
        );
        expect((updatedField.metadata as TextBlockMetadata).padding).toBe('large');
        done();
      });

      // Act
      component['form'].patchValue({ padding: 'large' });
    });

    it('should set undefined for empty optional fields', (done) => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();

      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as TextBlockMetadata;
        // Assert
        expect(metadata.alignment).toBeUndefined();
        expect(metadata.backgroundColor).toBeUndefined();
        done();
      });

      // Act
      component['form'].patchValue({
        content: '<p>Required content</p>',
        alignment: '',
        backgroundColor: '',
      });
    });
  });

  describe('HTML Content Handling', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should handle simple HTML content', (done) => {
      // Arrange
      const htmlContent = '<p>Simple paragraph</p>';

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).content).toBe(htmlContent);
        done();
      });

      // Act
      component['form'].patchValue({ content: htmlContent });
    });

    it('should handle complex HTML with multiple tags', (done) => {
      // Arrange
      const complexHtml = `
        <h3>Heading</h3>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).content).toBe(complexHtml);
        done();
      });

      // Act
      component['form'].patchValue({ content: complexHtml });
    });

    it('should handle HTML with links', (done) => {
      // Arrange
      const htmlWithLink = '<p>Visit <a href="https://example.com">our website</a></p>';

      component.fieldChange.subscribe((updatedField) => {
        // Assert
        expect((updatedField.metadata as TextBlockMetadata).content).toBe(htmlWithLink);
        done();
      });

      // Act
      component['form'].patchValue({ content: htmlWithLink });
    });
  });

  describe('Collapsible Behavior', () => {
    beforeEach(() => {
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
      };
      component.field = field;
      component.ngOnInit();
    });

    it('should set collapsible to true when enabled', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as TextBlockMetadata;
        // Assert
        expect(metadata.collapsible).toBe(true);
        done();
      });

      // Act
      component['form'].patchValue({ collapsible: true });
    });

    it('should set collapsed to true when enabled', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as TextBlockMetadata;
        // Assert
        expect(metadata.collapsed).toBe(true);
        done();
      });

      // Act
      component['form'].patchValue({ collapsible: true, collapsed: true });
    });

    it('should default collapsible to false in metadata', (done) => {
      // Arrange
      component.fieldChange.subscribe((updatedField) => {
        const metadata = updatedField.metadata as TextBlockMetadata;
        // Assert
        expect(metadata.collapsible).toBe(false);
        done();
      });

      // Act
      component['form'].patchValue({ content: '<p>Test</p>' });
    });
  });

  describe('Alignment Options', () => {
    it('should have 4 alignment options', () => {
      expect(component['alignmentOptions'].length).toBe(4);
    });

    it('should include left, center, right, and justify alignments', () => {
      const alignmentValues = component['alignmentOptions'].map((a) => a.value);
      expect(alignmentValues).toEqual(['left', 'center', 'right', 'justify']);
    });
  });

  describe('Padding Options', () => {
    it('should have 4 padding options', () => {
      expect(component['paddingOptions'].length).toBe(4);
    });

    it('should include none, small, medium, and large padding', () => {
      const paddingValues = component['paddingOptions'].map((p) => p.value);
      expect(paddingValues).toEqual(['none', 'small', 'medium', 'large']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle field without metadata property', () => {
      // Arrange
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
        // No metadata property
      };
      component.field = field;

      // Act
      expect(() => component.ngOnInit()).not.toThrow();

      // Assert
      expect(component['form'].value.content).toBe('<p>Add your instructions here...</p>');
    });

    it('should handle metadata with minimal properties', () => {
      // Arrange
      const metadata: TextBlockMetadata = {
        content: '<p>Minimal content</p>',
      };
      const field: FormField = {
        id: 'field-1',
        type: FormFieldType.TEXT_BLOCK,
        fieldName: 'textBlock',
        label: 'Text Block',
        required: false,
        order: 0,
        metadata,
      };
      component.field = field;

      // Act
      component.ngOnInit();

      // Assert
      expect(component['form'].value.content).toBe('<p>Minimal content</p>');
      expect(component['form'].value.alignment).toBe('left');
      expect(component['form'].value.padding).toBe('medium');
    });
  });

  describe('Monaco Editor Configuration', () => {
    it('should have HTML editor options configured', () => {
      const options = component['htmlEditorOptions'];

      expect(options.language).toBe('html');
      expect(options.minimap.enabled).toBe(false);
      expect(options.lineNumbers).toBe('on');
      expect(options.wordWrap).toBe('on');
    });
  });
});
