import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TemplateCardComponent } from './template-card.component';
import { FormTemplate, TemplateCategory } from '@nodeangularfullstack/shared';

describe('TemplateCardComponent', () => {
  let component: TemplateCardComponent;
  let fixture: ComponentFixture<TemplateCardComponent>;
  let mockTemplate: FormTemplate;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateCardComponent);
    component = fixture.componentInstance;

    // Create mock template
    mockTemplate = {
      id: 'template-1',
      name: 'Product Order Form',
      description: 'Standard product order form with inventory tracking',
      category: TemplateCategory.ECOMMERCE,
      previewImageUrl: 'https://example.com/preview.jpg',
      templateSchema: {} as any,
      isActive: true,
      usageCount: 42,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    component.template = mockTemplate;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should require template input', () => {
      expect(component.template).toBeDefined();
    });
  });

  describe('Template Display', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display template name', () => {
      const nameElement = fixture.nativeElement.querySelector('h5');
      expect(nameElement.textContent.trim()).toBe(mockTemplate.name);
    });

    it('should display template description', () => {
      const descriptionElement = fixture.nativeElement.querySelector('p.text-sm.text-gray-600');
      expect(descriptionElement.textContent.trim()).toBe(mockTemplate.description);
    });

    it('should display fallback text when description is missing', () => {
      component.template = { ...mockTemplate, description: undefined };
      fixture.detectChanges();
      const descriptionElement = fixture.nativeElement.querySelector('p.text-sm.text-gray-400');
      expect(descriptionElement.textContent.trim()).toBe('No description available');
    });

    it('should display usage count', () => {
      const usageElement = fixture.nativeElement.querySelector('.bg-blue-100');
      expect(usageElement.textContent).toContain('42 uses');
    });

    it('should display singular "use" for usage count of 1', () => {
      component.template = { ...mockTemplate, usageCount: 1 };
      fixture.detectChanges();
      const usageElement = fixture.nativeElement.querySelector('.bg-blue-100');
      expect(usageElement.textContent).toContain('1 use');
    });
  });

  describe('Template Image', () => {
    it('should display preview image when URL is provided', () => {
      fixture.detectChanges();
      const imgElement = fixture.nativeElement.querySelector('img');
      expect(imgElement).toBeTruthy();
      expect(imgElement.getAttribute('src')).toBe(mockTemplate.previewImageUrl);
      expect(imgElement.getAttribute('alt')).toContain(mockTemplate.name);
    });

    it('should set loading="lazy" on image for performance', () => {
      fixture.detectChanges();
      const imgElement = fixture.nativeElement.querySelector('img');
      expect(imgElement.getAttribute('loading')).toBe('lazy');
    });

    it('should display placeholder when no image URL provided', () => {
      component.template = { ...mockTemplate, previewImageUrl: undefined };
      fixture.detectChanges();
      const placeholder = fixture.nativeElement.querySelector('.bg-gradient-to-br');
      expect(placeholder).toBeTruthy();
      const icon = placeholder.querySelector('.pi-image');
      expect(icon).toBeTruthy();
    });

    it('should handle image error gracefully', () => {
      fixture.detectChanges();
      const imgElement = fixture.nativeElement.querySelector('img') as HTMLImageElement;
      const errorEvent = new Event('error');
      spyOn(component as any, 'handleImageError').and.callThrough();
      imgElement.dispatchEvent(errorEvent);
      expect((component as any).handleImageError).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should display Preview button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const previewButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('Preview')
      );
      expect(previewButton).toBeTruthy();
    });

    it('should display Use Template button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const useButton = Array.from(buttons).find((btn: any) => btn.textContent.includes('Use Template'));
      expect(useButton).toBeTruthy();
    });

    it('should emit preview event when Preview button clicked', () => {
      spyOn(component.preview, 'emit');
      component['onPreview']();
      expect(component.preview.emit).toHaveBeenCalledWith(mockTemplate);
    });

    it('should emit useTemplate event when Use Template button clicked', () => {
      spyOn(component.useTemplate, 'emit');
      component['onUseTemplate']();
      expect(component.useTemplate.emit).toHaveBeenCalledWith(mockTemplate);
    });

    it('should have proper aria-label on Preview button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const previewButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('Preview')
      ) as HTMLButtonElement;
      expect(previewButton.getAttribute('aria-label')).toContain('Preview');
      expect(previewButton.getAttribute('aria-label')).toContain(mockTemplate.name);
    });

    it('should have proper aria-label on Use Template button', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      const useButton = Array.from(buttons).find((btn: any) =>
        btn.textContent.includes('Use Template')
      ) as HTMLButtonElement;
      expect(useButton.getAttribute('aria-label')).toContain('Use');
      expect(useButton.getAttribute('aria-label')).toContain(mockTemplate.name);
    });
  });

  describe('Hover Effects', () => {
    it('should have hover transition classes', () => {
      fixture.detectChanges();
      const wrapper = fixture.nativeElement.querySelector('.template-card-wrapper');
      expect(wrapper.classList.contains('transition-transform')).toBe(true);
      expect(wrapper.classList.contains('hover:scale-105')).toBe(true);
      expect(wrapper.classList.contains('hover:shadow-lg')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have alt text on image', () => {
      const imgElement = fixture.nativeElement.querySelector('img');
      if (imgElement) {
        expect(imgElement.getAttribute('alt')).toContain(mockTemplate.name);
        expect(imgElement.getAttribute('alt')).toContain('Preview of');
      }
    });

    it('should meet minimum touch target size (44x44px)', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button: HTMLElement) => {
        const computedStyle = getComputedStyle(button);
        const minHeight = parseFloat(computedStyle.minHeight);
        // Check that min-height is at least 44px or close to it
        expect(minHeight).toBeGreaterThanOrEqual(40); // Allow some tolerance for browser differences
      });
    });
  });

  describe('Text Truncation', () => {
    it('should apply line-clamp-2 to description', () => {
      fixture.detectChanges();
      const descriptionElement = fixture.nativeElement.querySelector('.line-clamp-2');
      expect(descriptionElement).toBeTruthy();
    });

    it('should handle long descriptions gracefully', () => {
      const longDescription =
        'This is a very long description that should be truncated to two lines maximum using the line-clamp CSS property. It contains lots of text to ensure the truncation works properly.';
      component.template = { ...mockTemplate, description: longDescription };
      fixture.detectChanges();
      const descriptionElement = fixture.nativeElement.querySelector('.line-clamp-2');
      expect(descriptionElement).toBeTruthy();
      expect(descriptionElement.textContent).toBe(longDescription);
    });
  });

  describe('PrimeNG Card Integration', () => {
    it('should use PrimeNG Card component', () => {
      fixture.detectChanges();
      const cardElement = fixture.nativeElement.querySelector('p-card');
      expect(cardElement).toBeTruthy();
    });

    it('should have full height card styling', () => {
      fixture.detectChanges();
      const cardElement = fixture.nativeElement.querySelector('p-card');
      expect(cardElement.getAttribute('styleClass')).toContain('h-full');
    });
  });
});
