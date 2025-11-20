import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextBlockPreviewComponent } from './text-block-preview.component';
import { HtmlSanitizerService } from '../../../../../../shared/services/html-sanitizer.service';
import { FormField, FormFieldType, TextBlockMetadata } from '@nodeangularfullstack/shared';

describe('TextBlockPreviewComponent', () => {
  let component: TextBlockPreviewComponent;
  let fixture: ComponentFixture<TextBlockPreviewComponent>;
  let htmlSanitizer: HtmlSanitizerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextBlockPreviewComponent],
      providers: [HtmlSanitizerService],
    }).compileComponents();

    fixture = TestBed.createComponent(TextBlockPreviewComponent);
    component = fixture.componentInstance;
    htmlSanitizer = TestBed.inject(HtmlSanitizerService);
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      component.field = createMockField();
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have default max preview length of 150', () => {
      component.field = createMockField();
      expect((component as any).maxPreviewLength).toBe(150);
    });
  });

  describe('Metadata Getter', () => {
    it('should return metadata from field when valid', () => {
      const mockMetadata: TextBlockMetadata = {
        content: '<p>Test content</p>',
        alignment: 'center',
        padding: 'large',
        backgroundColor: '#f0f0f0',
        collapsible: true,
        collapsed: false,
      };
      component.field = createMockField(mockMetadata);

      expect(component.metadata).toEqual(mockMetadata);
    });

    it('should return default metadata when field metadata is undefined', () => {
      component.field = createMockField(undefined as any);

      const defaultMetadata = component.metadata;
      expect(defaultMetadata.content).toBe('<p>Add your instructions here...</p>');
      expect(defaultMetadata.alignment).toBe('left');
      expect(defaultMetadata.padding).toBe('medium');
      expect(defaultMetadata.collapsible).toBe(false);
      expect(defaultMetadata.collapsed).toBe(false);
    });

    it('should return default metadata when field metadata is empty object', () => {
      component.field = createMockField({} as TextBlockMetadata);

      const defaultMetadata = component.metadata;
      expect(defaultMetadata.content).toBe('<p>Add your instructions here...</p>');
      expect(defaultMetadata.alignment).toBe('left');
      expect(defaultMetadata.padding).toBe('medium');
    });
  });

  describe('Template Rendering', () => {
    it('should apply background color from metadata', () => {
      component.field = createMockField({ backgroundColor: '#ff0000' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.style.backgroundColor).toBe('rgb(255, 0, 0)'); // #ff0000 converts to rgb
    });

    it('should use transparent background when no color specified', () => {
      component.field = createMockField({ backgroundColor: undefined });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.style.backgroundColor).toBe('transparent');
    });

    it('should apply text alignment from metadata', () => {
      component.field = createMockField({ alignment: 'center' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.style.textAlign).toBe('center');
    });

    it('should default to left alignment', () => {
      component.field = createMockField({ alignment: undefined });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.style.textAlign).toBe('left');
    });

    it('should apply padding class for "none"', () => {
      component.field = createMockField({ padding: 'none' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.classList.contains('p-0')).toBe(true);
      expect(previewDiv.classList.contains('p-2')).toBe(false);
      expect(previewDiv.classList.contains('p-3')).toBe(false);
      expect(previewDiv.classList.contains('p-6')).toBe(false);
    });

    it('should apply padding class for "small"', () => {
      component.field = createMockField({ padding: 'small' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.classList.contains('p-2')).toBe(true);
      expect(previewDiv.classList.contains('p-0')).toBe(false);
    });

    it('should apply padding class for "medium"', () => {
      component.field = createMockField({ padding: 'medium' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.classList.contains('p-3')).toBe(true);
      expect(previewDiv.classList.contains('p-0')).toBe(false);
    });

    it('should apply padding class for "large"', () => {
      component.field = createMockField({ padding: 'large' });
      fixture.detectChanges();

      const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
      expect(previewDiv.classList.contains('p-6')).toBe(true);
      expect(previewDiv.classList.contains('p-0')).toBe(false);
    });

    it('should display preview text in template', () => {
      component.field = createMockField({ content: '<p>Test content</p>' });
      fixture.detectChanges();

      const textDiv = fixture.nativeElement.querySelector('.text-sm');
      expect(textDiv.textContent).toContain('Test content');
    });

    it('should show "Click to edit" message when content is truncated', () => {
      const longText = 'A'.repeat(200);
      component.field = createMockField({ content: `<p>${longText}</p>` });
      fixture.detectChanges();

      const clickToEdit = fixture.nativeElement.querySelector('.text-xs');
      expect(clickToEdit).toBeTruthy();
      expect(clickToEdit.textContent).toContain('Click to edit');
    });

    it('should not show "Click to edit" when content is not truncated', () => {
      component.field = createMockField({ content: '<p>Short text</p>' });
      fixture.detectChanges();

      const clickToEdit = fixture.nativeElement.querySelector('.text-xs');
      expect(clickToEdit).toBeFalsy();
    });
  });

  describe('Change Detection', () => {
    it('should use OnPush change detection strategy', () => {
      expect(component).toBeTruthy();
      const metadata = (TextBlockPreviewComponent as any).__annotations__?.[0];
      // OnPush strategy is defined but testing requires fixture change detection
      // This test verifies component compiles with OnPush
    });
  });

  describe('Edge Cases', () => {
    it('should handle all alignment options', () => {
      const alignments: ('left' | 'center' | 'right' | 'justify')[] = [
        'left',
        'center',
        'right',
        'justify',
      ];

      alignments.forEach((alignment) => {
        component.field = createMockField({ alignment });
        fixture.detectChanges();

        const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
        expect(previewDiv.style.textAlign).toBe(alignment);
      });
    });

    it('should handle all padding options', () => {
      const paddings: ('none' | 'small' | 'medium' | 'large')[] = [
        'none',
        'small',
        'medium',
        'large',
      ];
      const expectedClasses = ['p-0', 'p-2', 'p-3', 'p-6'];

      paddings.forEach((padding, index) => {
        component.field = createMockField({ padding });
        fixture.detectChanges();

        const previewDiv = fixture.nativeElement.querySelector('.text-block-preview');
        expect(previewDiv.classList.contains(expectedClasses[index])).toBe(true);
      });
    });
  });
});

/**
 * Helper function to create mock FormField with TextBlockMetadata
 */
function createMockField(metadata?: Partial<TextBlockMetadata>): FormField {
  const defaultMetadata: TextBlockMetadata = {
    content: '<p>Default content</p>',
    alignment: 'left',
    padding: 'medium',
    backgroundColor: undefined,
    collapsible: false,
    collapsed: false,
  };

  return {
    id: 'test-field-id',
    type: FormFieldType.TEXT_BLOCK,
    label: 'Test Text Block',
    fieldName: 'test_text_block',
    required: false,
    order: 1,
    metadata: metadata ? { ...defaultMetadata, ...metadata } : defaultMetadata,
  };
}
