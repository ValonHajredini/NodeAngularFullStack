import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

/**
 * Test suite for LoadingSpinnerComponent.
 * Tests different sizes, colors, modes, and accessibility features.
 */
describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render inline mode by default', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="dialog"]')).toBeFalsy();
    expect(compiled.querySelector('[role="status"]')).toBeTruthy();
  });

  it('should render overlay mode when overlay is true', () => {
    component.overlay = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="dialog"]')).toBeTruthy();
    expect(compiled.querySelector('[aria-modal="true"]')).toBeTruthy();
  });

  it('should display message when provided', () => {
    component.message = 'Loading data...';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading data...');
  });

  it('should not display message when not provided', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const messageElement = compiled.querySelector('span, p');
    expect(messageElement).toBeFalsy();
  });

  it('should apply correct size classes', () => {
    const sizes: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];
    const expectedClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    };

    sizes.forEach((size) => {
      component.size = size;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[role="status"]');
      expect(spinner.className).toContain(expectedClasses[size]);
    });
  });

  it('should apply correct color classes', () => {
    const colors: ('primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white')[] = [
      'primary',
      'secondary',
      'success',
      'warning',
      'error',
      'white',
    ];

    const expectedClasses = {
      primary: 'border-primary-200 border-t-primary-600',
      secondary: 'border-gray-200 border-t-gray-600',
      success: 'border-green-200 border-t-green-600',
      warning: 'border-yellow-200 border-t-yellow-600',
      error: 'border-red-200 border-t-red-600',
      white: 'border-white/30 border-t-white',
    };

    colors.forEach((color) => {
      component.color = color;
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('[role="status"]');
      const colorClass = expectedClasses[color].split(' ')[0];
      expect(spinner.className).toContain(colorClass);
    });
  });

  it('should have proper accessibility attributes', () => {
    component.ariaLabel = 'Custom loading message';
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('[role="status"]');
    expect(spinner.getAttribute('aria-label')).toBe('Custom loading message');
  });

  it('should center spinner when centered is true', () => {
    component.centered = true;
    fixture.detectChanges();

    expect(component.containerClasses).toContain('justify-center');
  });

  it('should include space between spinner and message', () => {
    component.message = 'Loading...';
    fixture.detectChanges();

    expect(component.containerClasses).toContain('space-x-2');
  });

  it('should have animate-spin class for animation', () => {
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('[role="status"]');
    expect(spinner.className).toContain('animate-spin');
  });

  it('should handle overlay mode with message', () => {
    component.overlay = true;
    component.message = 'Processing request...';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const overlayMessage = compiled.querySelector('p');
    expect(overlayMessage?.textContent).toContain('Processing request...');
  });

  it('should use default aria-label when not provided', () => {
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('[role="status"]');
    expect(spinner.getAttribute('aria-label')).toBe('Loading content, please wait');
  });

  describe('CSS Class Generation', () => {
    it('should generate correct container classes', () => {
      // Test basic container
      expect(component.containerClasses).toContain('flex items-center');

      // Test with message
      component.message = 'Loading...';
      expect(component.containerClasses).toContain('space-x-2');

      // Test with centering
      component.centered = true;
      expect(component.containerClasses).toContain('justify-center');
    });

    it('should generate correct spinner classes', () => {
      const baseClasses = 'animate-spin rounded-full border-2 border-solid';
      expect(component.spinnerClasses).toContain(baseClasses);
    });

    it('should generate correct message classes', () => {
      component.size = 'lg';
      component.color = 'primary';

      const messageClasses = component.messageClasses;
      expect(messageClasses).toContain('font-medium');
      expect(messageClasses).toContain('text-base');
      expect(messageClasses).toContain('text-primary-700');
    });
  });
});
