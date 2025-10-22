import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';

import { IframeEmbedGeneratorComponent } from './iframe-embed-generator.component';

/**
 * Test suite for IframeEmbedGeneratorComponent
 * Story 26.4: Iframe Embed Code Generator - Brownfield Enhancement
 */
describe('IframeEmbedGeneratorComponent', () => {
  let component: IframeEmbedGeneratorComponent;
  let fixture: ComponentFixture<IframeEmbedGeneratorComponent>;

  const mockFormUrl = 'http://localhost:4200/forms/render/test-token';
  const mockFormTitle = 'Test Form';
  const mockShortCode = 'test-abc123';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        IframeEmbedGeneratorComponent,
        ReactiveFormsModule,
        NoopAnimationsModule,
        ButtonModule,
        InputTextModule,
        Select,
        CheckboxModule,
        TooltipModule,
        MessageModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IframeEmbedGeneratorComponent);
    component = fixture.componentInstance;

    // Set required inputs
    component.formUrl = mockFormUrl;
    component.formTitle = mockFormTitle;
    component.shortCode = mockShortCode;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default form values', () => {
      expect(component.embedForm.get('preset')?.value).toBe('medium');
      expect(component.embedForm.get('width')?.value).toBe('600');
      expect(component.embedForm.get('height')?.value).toBe('800');
      expect(component.embedForm.get('responsive')?.value).toBe(false);
      expect(component.embedForm.get('showBorder')?.value).toBe(false);
      expect(component.embedForm.get('allowScrolling')?.value).toBe(true);
      expect(component.embedForm.get('title')?.value).toBe(mockFormTitle);
    });

    it('should have dimension presets available', () => {
      expect(component.dimensionPresets).toEqual([
        { label: 'Small (400x600)', value: 'small', width: '400', height: '600' },
        { label: 'Medium (600x800)', value: 'medium', width: '600', height: '800' },
        { label: 'Large (800x1000)', value: 'large', width: '800', height: '1000' },
        { label: 'Custom', value: 'custom', width: '600', height: '800' },
      ]);
    });
  });

  describe('Form Interactions', () => {
    it('should update width and height when preset changes', () => {
      // Change to small preset
      component.embedForm.patchValue({ preset: 'small' });
      expect(component.embedForm.get('width')?.value).toBe('400');
      expect(component.embedForm.get('height')?.value).toBe('600');

      // Change to large preset
      component.embedForm.patchValue({ preset: 'large' });
      expect(component.embedForm.get('width')?.value).toBe('800');
      expect(component.embedForm.get('height')?.value).toBe('1000');
    });

    it('should not update dimensions when custom preset is selected', () => {
      // Set custom values
      component.embedForm.patchValue({
        preset: 'custom',
        width: '500',
        height: '700',
      });

      // Values should remain unchanged
      expect(component.embedForm.get('width')?.value).toBe('500');
      expect(component.embedForm.get('height')?.value).toBe('700');
    });

    it('should convert to percentage width when responsive is enabled', () => {
      component.embedForm.patchValue({
        width: '600',
        responsive: true,
      });

      expect(component.embedForm.get('width')?.value).toBe('100%');
    });

    it('should convert back to pixel width when responsive is disabled', () => {
      component.embedForm.patchValue({
        width: '100%',
        responsive: false,
      });

      expect(component.embedForm.get('width')?.value).toBe('600');
    });
  });

  describe('Iframe Code Generation', () => {
    it('should generate correct iframe code with default settings', () => {
      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('src="http://localhost:4200/forms/render/test-abc123"');
      expect(embedCode.htmlCode).toContain('width="600px"');
      expect(embedCode.htmlCode).toContain('height="800px"');
      expect(embedCode.htmlCode).toContain('frameborder="0"');
      expect(embedCode.htmlCode).toContain('scrolling="auto"');
      expect(embedCode.htmlCode).toContain('sandbox="allow-forms allow-scripts allow-same-origin"');
      expect(embedCode.htmlCode).toContain('title="Test Form"');
      expect(embedCode.htmlCode).toContain('loading="lazy"');
    });

    it('should generate iframe code with custom dimensions', () => {
      component.embedForm.patchValue({
        preset: 'custom',
        width: '500',
        height: '700',
      });

      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('width="500px"');
      expect(embedCode.htmlCode).toContain('height="700px"');
    });

    it('should generate iframe code with responsive width', () => {
      component.embedForm.patchValue({
        responsive: true,
        width: '100%',
      });

      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('width="100%"');
    });

    it('should generate iframe code with border when enabled', () => {
      component.embedForm.patchValue({ showBorder: true });

      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('frameborder="1"');
    });

    it('should generate iframe code with no scrolling when disabled', () => {
      component.embedForm.patchValue({ allowScrolling: false });

      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('scrolling="no"');
    });

    it('should escape HTML in title attribute', () => {
      const maliciousTitle = 'Test <script>alert("xss")</script> Form';
      component.embedForm.patchValue({ title: maliciousTitle });

      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain(
        'title="Test &lt;script&gt;alert("xss")&lt;/script&gt; Form"',
      );
    });

    it('should include fallback content for non-iframe browsers', () => {
      const embedCode = component.embedCode();

      expect(embedCode.htmlCode).toContain('Your browser does not support iframes');
      expect(embedCode.htmlCode).toContain('Open form in new window');
      expect(embedCode.htmlCode).toContain('target="_blank"');
    });
  });

  describe('Preview Dimensions', () => {
    it('should show correct preview dimensions', () => {
      const previewDimensions = component.previewDimensions();

      expect(previewDimensions.width).toBe('600px');
      expect(previewDimensions.height).toBe('800px');
      expect(previewDimensions.responsive).toBe(false);
    });

    it('should show responsive preview when enabled', () => {
      component.embedForm.patchValue({
        responsive: true,
        width: '100%',
      });

      const previewDimensions = component.previewDimensions();

      expect(previewDimensions.width).toBe('100%');
      expect(previewDimensions.responsive).toBe(true);
    });
  });

  describe('Copy to Clipboard', () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jasmine.createSpy('writeText').and.returnValue(Promise.resolve()),
        },
      });
    });

    it('should copy iframe code to clipboard', async () => {
      await component.onCopyEmbedCode();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(component.copySuccess()).toBe(true);
    });

    it('should show success feedback and then hide it', (done) => {
      component.onCopyEmbedCode().then(() => {
        expect(component.copySuccess()).toBe(true);

        // Should hide success feedback after 2 seconds
        setTimeout(() => {
          expect(component.copySuccess()).toBe(false);
          done();
        }, 2100);
      });
    });

    it('should fallback to execCommand when clipboard API fails', async () => {
      // Mock clipboard API failure
      Object.assign(navigator, {
        clipboard: {
          writeText: jasmine
            .createSpy('writeText')
            .and.returnValue(Promise.reject(new Error('Clipboard API not available'))),
        },
      });

      // Mock document.execCommand
      spyOn(document, 'execCommand').and.returnValue(true);

      await component.onCopyEmbedCode();

      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(component.copySuccess()).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should validate width field format', () => {
      const widthControl = component.embedForm.get('width');

      // Valid values
      widthControl?.setValue('600px');
      expect(widthControl?.valid).toBe(true);

      widthControl?.setValue('100%');
      expect(widthControl?.valid).toBe(true);

      widthControl?.setValue('600');
      expect(widthControl?.valid).toBe(true);

      // Invalid values
      widthControl?.setValue('invalid');
      expect(widthControl?.valid).toBe(false);

      widthControl?.setValue('');
      expect(widthControl?.valid).toBe(false);
    });

    it('should validate height field format', () => {
      const heightControl = component.embedForm.get('height');

      // Valid values
      heightControl?.setValue('800px');
      expect(heightControl?.valid).toBe(true);

      heightControl?.setValue('800');
      expect(heightControl?.valid).toBe(true);

      // Invalid values
      heightControl?.setValue('invalid');
      expect(heightControl?.valid).toBe(false);

      heightControl?.setValue('');
      expect(heightControl?.valid).toBe(false);
    });

    it('should validate title field', () => {
      const titleControl = component.embedForm.get('title');

      // Valid title
      titleControl?.setValue('Test Form');
      expect(titleControl?.valid).toBe(true);

      // Empty title (invalid)
      titleControl?.setValue('');
      expect(titleControl?.valid).toBe(false);

      // Too long title (invalid)
      titleControl?.setValue('A'.repeat(101));
      expect(titleControl?.valid).toBe(false);
    });

    it('should have hasFormErrors property working correctly', () => {
      expect(component.hasFormErrors).toBe(false);

      // Make form invalid and dirty
      component.embedForm.get('width')?.setValue('');
      component.embedForm.get('width')?.markAsDirty();

      expect(component.hasFormErrors).toBe(true);
    });
  });

  describe('Template Rendering', () => {
    it('should show custom dimension inputs when custom preset is selected', () => {
      component.embedForm.patchValue({ preset: 'custom' });
      fixture.detectChanges();

      const customInputs = fixture.debugElement.queryAll(
        By.css('input[formControlName="width"], input[formControlName="height"]'),
      );
      expect(customInputs.length).toBe(2);
    });

    it('should hide custom dimension inputs when preset is not custom', () => {
      component.embedForm.patchValue({ preset: 'medium' });
      fixture.detectChanges();

      const customInputs = fixture.debugElement.queryAll(By.css('.grid-cols-2'));
      expect(customInputs.length).toBe(0);
    });

    it('should display copy button with correct state', () => {
      const copyButton = fixture.debugElement.query(By.css('p-button[icon="pi pi-copy"]'));
      expect(copyButton).toBeTruthy();

      // Check initial state
      expect(copyButton.nativeElement.textContent.trim()).toBe('Copy Code');

      // Set copy success state
      component.copySuccess.set(true);
      fixture.detectChanges();

      expect(copyButton.nativeElement.textContent.trim()).toBe('Copied!');
    });

    it('should display generated embed code in textarea', () => {
      const textarea = fixture.debugElement.query(By.css('textarea'));
      expect(textarea).toBeTruthy();

      const embedCode = component.embedCode();
      expect(textarea.nativeElement.value).toBe(embedCode.htmlCode);
    });

    it('should show validation errors when form is invalid', () => {
      // Make form invalid
      component.embedForm.get('width')?.setValue('');
      component.embedForm.get('width')?.markAsTouched();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('small.text-red-600'));
      expect(errorMessage).toBeTruthy();
    });
  });

  describe('Getter Methods', () => {
    it('should return correct currentPreset', () => {
      expect(component.currentPreset).toBe('medium');

      component.embedForm.patchValue({ preset: 'large' });
      expect(component.currentPreset).toBe('large');
    });

    it('should return correct isCustomPreset', () => {
      expect(component.isCustomPreset).toBe(false);

      component.embedForm.patchValue({ preset: 'custom' });
      expect(component.isCustomPreset).toBe(true);
    });

    it('should return correct isResponsive', () => {
      expect(component.isResponsive).toBe(false);

      component.embedForm.patchValue({ responsive: true });
      expect(component.isResponsive).toBe(true);
    });
  });

  describe('Dimension Formatting', () => {
    it('should format dimensions correctly', () => {
      // Test private method through public interface
      component.embedForm.patchValue({
        width: '600',
        height: '800px',
      });

      const embedCode = component.embedCode();
      expect(embedCode.htmlCode).toContain('width="600px"');
      expect(embedCode.htmlCode).toContain('height="800px"');
    });

    it('should preserve units when provided', () => {
      component.embedForm.patchValue({
        width: '100%',
        height: '50em',
      });

      const embedCode = component.embedCode();
      expect(embedCode.htmlCode).toContain('width="100%"');
      expect(embedCode.htmlCode).toContain('height="50em"');
    });
  });

  describe('Environment Detection', () => {
    it('should use correct base URL for iframe src', () => {
      const embedCode = component.embedCode();

      // In test environment, should use localhost
      expect(embedCode.htmlCode).toContain('src="http://localhost:4200/forms/render/test-abc123"');
      expect(embedCode.previewUrl).toBe('http://localhost:4200/forms/render/test-abc123');
    });
  });
});
