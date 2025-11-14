import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CategorySelectionComponent } from './category-selection.component';
import { TemplateWizardService } from '../services/template-wizard.service';
import { TemplateCategory } from '@nodeangularfullstack/shared';

/**
 * Category Selection Component Tests
 * Epic 30, Story 30.10, Task 6
 */
describe('CategorySelectionComponent', () => {
  let component: CategorySelectionComponent;
  let fixture: ComponentFixture<CategorySelectionComponent>;
  let mockWizardService: jasmine.SpyObj<TemplateWizardService>;

  beforeEach(async () => {
    // Create mock wizard service
    mockWizardService = jasmine.createSpyObj('TemplateWizardService', ['setCategory'], {
      category: signal<TemplateCategory | null>(null),
    });

    await TestBed.configureTestingModule({
      imports: [CategorySelectionComponent],
      providers: [{ provide: TemplateWizardService, useValue: mockWizardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CategorySelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with no category selected', () => {
      expect(component.selectedCategory()).toBeNull();
    });

    it('should load all 6 template categories', () => {
      const categories = component.categories();
      expect(categories.length).toBe(6);
    });

    it('should have metadata for each category', () => {
      const categories = component.categories();
      categories.forEach((cat) => {
        expect(cat.category).toBeDefined();
        expect(cat.label).toBeDefined();
        expect(cat.description).toBeDefined();
        expect(cat.icon).toBeDefined();
        expect(cat.severity).toBeDefined();
      });
    });
  });

  describe('Category Metadata', () => {
    it('should have correct metadata for POLLS category', () => {
      const categories = component.categories();
      const polls = categories.find((c) => c.category === TemplateCategory.POLLS);
      expect(polls).toBeDefined();
      expect(polls!.label).toBe('Polls');
      expect(polls!.icon).toBe('pi pi-chart-bar');
      expect(polls!.severity).toBe('primary');
    });

    it('should have correct metadata for QUIZ category', () => {
      const categories = component.categories();
      const quiz = categories.find((c) => c.category === TemplateCategory.QUIZ);
      expect(quiz).toBeDefined();
      expect(quiz!.label).toBe('Quiz');
      expect(quiz!.icon).toBe('pi pi-question-circle');
      expect(quiz!.severity).toBe('success');
    });

    it('should have correct metadata for ECOMMERCE category', () => {
      const categories = component.categories();
      const ecommerce = categories.find((c) => c.category === TemplateCategory.ECOMMERCE);
      expect(ecommerce).toBeDefined();
      expect(ecommerce!.label).toBe('E-commerce');
      expect(ecommerce!.icon).toBe('pi pi-shopping-cart');
      expect(ecommerce!.severity).toBe('warning');
    });

    it('should have correct metadata for SERVICES category', () => {
      const categories = component.categories();
      const services = categories.find((c) => c.category === TemplateCategory.SERVICES);
      expect(services).toBeDefined();
      expect(services!.label).toBe('Services');
      expect(services!.icon).toBe('pi pi-calendar');
      expect(services!.severity).toBe('info');
    });

    it('should have correct metadata for DATA_COLLECTION category', () => {
      const categories = component.categories();
      const dataCollection = categories.find(
        (c) => c.category === TemplateCategory.DATA_COLLECTION,
      );
      expect(dataCollection).toBeDefined();
      expect(dataCollection!.label).toBe('Data Collection');
      expect(dataCollection!.icon).toBe('pi pi-database');
      expect(dataCollection!.severity).toBe('secondary');
    });

    it('should have correct metadata for EVENTS category', () => {
      const categories = component.categories();
      const events = categories.find((c) => c.category === TemplateCategory.EVENTS);
      expect(events).toBeDefined();
      expect(events!.label).toBe('Events');
      expect(events!.icon).toBe('pi pi-ticket');
      expect(events!.severity).toBe('danger');
    });
  });

  describe('Category Selection', () => {
    it('should select a category and update service', () => {
      component.selectCategory(TemplateCategory.POLLS);
      expect(component.selectedCategory()).toBe(TemplateCategory.POLLS);
      expect(mockWizardService.setCategory).toHaveBeenCalledWith(TemplateCategory.POLLS);
    });

    it('should emit categorySelected event', (done) => {
      component.categorySelected.subscribe((category) => {
        expect(category).toBe(TemplateCategory.QUIZ);
        done();
      });
      component.selectCategory(TemplateCategory.QUIZ);
    });

    it('should allow changing selected category', () => {
      component.selectCategory(TemplateCategory.POLLS);
      expect(component.selectedCategory()).toBe(TemplateCategory.POLLS);

      component.selectCategory(TemplateCategory.QUIZ);
      expect(component.selectedCategory()).toBe(TemplateCategory.QUIZ);
      expect(mockWizardService.setCategory).toHaveBeenCalledTimes(2);
    });

    it('should correctly identify selected category', () => {
      component.selectCategory(TemplateCategory.ECOMMERCE);
      expect(component.isSelected(TemplateCategory.ECOMMERCE)).toBe(true);
      expect(component.isSelected(TemplateCategory.POLLS)).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select category on Enter key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.handleKeyDown(event, TemplateCategory.POLLS);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategory()).toBe(TemplateCategory.POLLS);
    });

    it('should select category on Space key', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');

      component.handleKeyDown(event, TemplateCategory.QUIZ);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategory()).toBe(TemplateCategory.QUIZ);
    });

    it('should not select category on other keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      spyOn(event, 'preventDefault');

      component.handleKeyDown(event, TemplateCategory.POLLS);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.selectedCategory()).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should generate correct ARIA label for unselected category', () => {
      const categories = component.categories();
      const polls = categories.find((c) => c.category === TemplateCategory.POLLS)!;
      const ariaLabel = component.getAriaLabel(polls);

      expect(ariaLabel).toContain('Polls template category');
      expect(ariaLabel).toContain(polls.description);
      expect(ariaLabel).not.toContain('selected');
    });

    it('should generate correct ARIA label for selected category', () => {
      component.selectCategory(TemplateCategory.POLLS);
      const categories = component.categories();
      const polls = categories.find((c) => c.category === TemplateCategory.POLLS)!;
      const ariaLabel = component.getAriaLabel(polls);

      expect(ariaLabel).toContain('Polls template category');
      expect(ariaLabel).toContain('selected');
    });

    it('should have proper role and tabindex for keyboard navigation', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('.category-card');

      cards.forEach((card) => {
        expect(card.getAttribute('role')).toBe('button');
        expect(card.getAttribute('tabindex')).toBe('0');
      });
    });
  });

  describe('Template Rendering', () => {
    it('should render all category cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const cards = compiled.querySelectorAll('.category-card');
      expect(cards.length).toBe(6);
    });

    it('should display category icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icons = compiled.querySelectorAll('.category-icon i');
      expect(icons.length).toBe(6);
    });

    it('should display category labels and descriptions', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.category-label');
      const descriptions = compiled.querySelectorAll('.category-description');

      expect(labels.length).toBe(6);
      expect(descriptions.length).toBe(6);
    });

    it('should show selection indicator for selected category', () => {
      component.selectCategory(TemplateCategory.POLLS);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const indicators = compiled.querySelectorAll('.selection-indicator');
      expect(indicators.length).toBe(1);
    });

    it('should display selection hint message', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const hint = compiled.querySelector('.selection-hint');
      expect(hint).toBeTruthy();
      expect(hint!.textContent).toContain('No category selected');

      component.selectCategory(TemplateCategory.POLLS);
      fixture.detectChanges();
      expect(hint!.textContent).toContain('category selected');
    });
  });
});
