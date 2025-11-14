/**
 * Category Badge Component Tests
 *
 * Comprehensive test suite for CategoryBadgeComponent covering:
 * - Component rendering for all category types
 * - Category-specific icons and colors
 * - Size variant support (small, medium, large)
 * - Accessibility compliance (ARIA labels, semantic HTML)
 * - CSS class application
 *
 * Epic 30: Category-Personalized Templates and Analytics
 * Story 30.8: Product, Appointment, and Restaurant Analytics Components (Frontend)
 *
 * @since 2025-01-27
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryBadgeComponent } from './category-badge.component';
import { TemplateCategory } from '@nodeangularfullstack/shared';

describe('CategoryBadgeComponent', () => {
  let component: CategoryBadgeComponent;
  let fixture: ComponentFixture<CategoryBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBadgeComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      fixture.componentRef.setInput('category', 'polls');
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should have category-badge class', () => {
      fixture.componentRef.setInput('category', 'polls');
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge).toBeTruthy();
    });

    it('should have role status', () => {
      fixture.componentRef.setInput('category', 'polls');
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.getAttribute('role')).toBe('status');
    });
  });

  describe('Category Display - Polls', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'polls' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "Poll" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('Poll');
    });

    it('should display chart-bar icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-chart-bar');
      expect(icon).toBeTruthy();
    });

    it('should apply blue color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-blue-700')).toBe(true);
      expect(badge.classList.contains('bg-blue-100')).toBe(true);
    });

    it('should have accessible aria-label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.getAttribute('aria-label')).toBe('Category: Poll');
    });
  });

  describe('Category Display - Quiz', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'quiz' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "Quiz" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('Quiz');
    });

    it('should display question-circle icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-question-circle');
      expect(icon).toBeTruthy();
    });

    it('should apply purple color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-purple-700')).toBe(true);
      expect(badge.classList.contains('bg-purple-100')).toBe(true);
    });
  });

  describe('Category Display - E-Commerce', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'ecommerce' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "E-Commerce" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('E-Commerce');
    });

    it('should display shopping-cart icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-shopping-cart');
      expect(icon).toBeTruthy();
    });

    it('should apply green color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-green-700')).toBe(true);
      expect(badge.classList.contains('bg-green-100')).toBe(true);
    });
  });

  describe('Category Display - Services', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'services' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "Services" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('Services');
    });

    it('should display calendar icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-calendar');
      expect(icon).toBeTruthy();
    });

    it('should apply orange color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-orange-700')).toBe(true);
      expect(badge.classList.contains('bg-orange-100')).toBe(true);
    });
  });

  describe('Category Display - Data Collection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'data_collection' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "Data Collection" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('Data Collection');
    });

    it('should display database icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-database');
      expect(icon).toBeTruthy();
    });

    it('should apply indigo color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-indigo-700')).toBe(true);
      expect(badge.classList.contains('bg-indigo-100')).toBe(true);
    });
  });

  describe('Category Display - Events', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'events' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should display "Events" label', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.textContent).toContain('Events');
    });

    it('should display ticket icon', () => {
      const icon = fixture.nativeElement.querySelector('.pi-ticket');
      expect(icon).toBeTruthy();
    });

    it('should apply pink color classes', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('text-pink-700')).toBe(true);
      expect(badge.classList.contains('bg-pink-100')).toBe(true);
    });
  });

  describe('Size Variants', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'polls' as TemplateCategory);
    });

    it('should default to medium size', () => {
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('badge-medium')).toBe(true);
    });

    it('should apply small size class when specified', () => {
      fixture.componentRef.setInput('size', 'small');
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('badge-small')).toBe(true);
    });

    it('should apply large size class when specified', () => {
      fixture.componentRef.setInput('size', 'large');
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('badge-large')).toBe(true);
    });

    it('should update size class dynamically', () => {
      fixture.componentRef.setInput('size', 'small');
      fixture.detectChanges();
      let badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('badge-small')).toBe(true);

      fixture.componentRef.setInput('size', 'large');
      fixture.detectChanges();
      badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('badge-large')).toBe(true);
      expect(badge.classList.contains('badge-small')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should mark icon as decorative with aria-hidden', () => {
      fixture.componentRef.setInput('category', 'polls');
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('i');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('should provide aria-label for all categories', () => {
      const categories = [
        'polls',
        'quiz',
        'ecommerce',
        'services',
        'data_collection',
        'events',
      ] as const;

      categories.forEach((category) => {
        fixture.componentRef.setInput('category', category);
        fixture.detectChanges();
        const badge = fixture.nativeElement.querySelector('.category-badge');
        const ariaLabel = badge.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('Category:');
      });
    });
  });

  describe('CSS Classes', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('category', 'polls' as TemplateCategory);
      fixture.detectChanges();
    });

    it('should have inline-flex layout', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('inline-flex')).toBe(true);
    });

    it('should have items-center for vertical alignment', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('items-center')).toBe(true);
    });

    it('should have gap spacing between icon and text', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('gap-1.5')).toBe(true);
    });

    it('should have rounded-full border radius', () => {
      const badge = fixture.nativeElement.querySelector('.category-badge');
      expect(badge.classList.contains('rounded-full')).toBe(true);
    });
  });
});
